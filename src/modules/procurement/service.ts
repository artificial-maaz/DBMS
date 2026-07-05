import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { branches, ledgerEntries, purchaseOrders, suppliers } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { moneyRequired, moneyZero } from "@/lib/validation";

type Actor = { userId: string; role: string };

export const canProcure = (role: string) => ["creator", "owner"].includes(role);

const supplierSchema = z.object({
  name: z.string().trim().min(2, "Supplier name required").max(120),
  contactPerson: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(120).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  ntn: z.string().trim().max(30).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createSupplier(actor: Actor, raw: unknown) {
  if (!canProcure(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const i = parsed.data;
  try {
    const [row] = await db
      .insert(suppliers)
      .values({
        name: i.name,
        contactPerson: i.contactPerson || null,
        phone: i.phone || null,
        email: i.email || null,
        city: i.city || null,
        ntn: i.ntn || null,
        notes: i.notes || null,
        createdBy: actor.userId,
      })
      .returning({ id: suppliers.id });
    await writeAudit({ userId: actor.userId, action: "supplier.create", entity: "supplier", entityId: row.id, details: { name: i.name } });
    return { ok: true as const };
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("duplicate");
    return { ok: false as const, error: dup ? "Supplier already exists." : "Failed to save supplier." };
  }
}

const purchaseSchema = z.object({
  supplierId: z.coerce.number().int().positive("Supplier is required"),
  branchId: z.coerce.number().int().positive("Branch is required"),
  description: z.string().trim().min(3, "Describe the purchase").max(1000),
  totalCost: moneyRequired,
  amountPaid: moneyZero,
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date required"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function recordPurchase(actor: Actor, raw: unknown) {
  if (!canProcure(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = purchaseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const i = parsed.data;
  if (Number(i.amountPaid) > Number(i.totalCost)) {
    return { ok: false as const, error: "Paid amount cannot exceed total cost." };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [{ n }] = await tx.select({ n: count() }).from(purchaseOrders);
      const poNo = `PO-${new Date().getFullYear()}-${String(n + 1).padStart(4, "0")}`;
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          poNo,
          supplierId: i.supplierId,
          branchId: i.branchId,
          description: i.description,
          totalCost: i.totalCost,
          amountPaid: i.amountPaid,
          purchaseDate: i.purchaseDate,
          notes: i.notes || null,
          createdBy: actor.userId,
        })
        .returning({ id: purchaseOrders.id });

      if (Number(i.amountPaid) > 0) {
        await tx.insert(ledgerEntries).values({
          branchId: i.branchId,
          direction: "cash_out",
          category: "purchase",
          amount: i.amountPaid,
          description: `Stock purchase ${poNo}`,
          entryDate: i.purchaseDate,
          createdBy: actor.userId,
        });
      }
      return { id: po.id, poNo };
    });

    await writeAudit({
      userId: actor.userId,
      action: "purchase.create",
      entity: "purchase_order",
      entityId: result.id,
      branchId: i.branchId,
      details: { poNo: result.poNo, totalCost: i.totalCost, paid: i.amountPaid },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to record purchase." };
  }
}

/** Pay outstanding balance on a PO — ledger cash_out, atomic. */
export async function payPurchase(actor: Actor, poId: number, amountRaw: string) {
  if (!canProcure(actor.role)) return { ok: false as const, error: "Not allowed." };
  const amount = moneyRequired.safeParse(amountRaw);
  if (!amount.success || Number(amount.data) <= 0) return { ok: false as const, error: "Enter a valid amount." };

  try {
    const result = await db.transaction(async (tx) => {
      const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).for("update");
      if (!po) throw new Error("Purchase not found.");
      const outstanding = Number(po.totalCost) - Number(po.amountPaid);
      if (Number(amount.data) > outstanding) throw new Error(`Outstanding is Rs. ${outstanding}.`);

      await tx
        .update(purchaseOrders)
        .set({ amountPaid: sql`${purchaseOrders.amountPaid} + ${amount.data}` })
        .where(eq(purchaseOrders.id, poId));
      await tx.insert(ledgerEntries).values({
        branchId: po.branchId,
        direction: "cash_out",
        category: "purchase",
        amount: amount.data,
        description: `Payment to supplier for ${po.poNo}`,
        entryDate: new Date().toISOString().slice(0, 10),
        createdBy: actor.userId,
      });
      return { poNo: po.poNo, branchId: po.branchId };
    });

    await writeAudit({
      userId: actor.userId,
      action: "purchase.pay",
      entity: "purchase_order",
      entityId: poId,
      branchId: result.branchId,
      details: { poNo: result.poNo, amount: amount.data },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to record payment." };
  }
}

export const listSuppliers = () =>
  db.select().from(suppliers).orderBy(suppliers.name);

export function listPurchases() {
  return db
    .select({
      id: purchaseOrders.id,
      poNo: purchaseOrders.poNo,
      supplierName: suppliers.name,
      branchName: branches.name,
      description: purchaseOrders.description,
      totalCost: purchaseOrders.totalCost,
      amountPaid: purchaseOrders.amountPaid,
      purchaseDate: purchaseOrders.purchaseDate,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .innerJoin(branches, eq(purchaseOrders.branchId, branches.id))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(100);
}
