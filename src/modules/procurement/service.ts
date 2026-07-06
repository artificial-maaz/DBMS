import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { branches, ledgerEntries, purchaseOrderItems, purchaseOrders, suppliers } from "@/db/schema";
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

/** #15: one PO line — dynamic rows arrive as a single JSON field (same pattern as sale guarantors). */
const poItemSchema = z.object({
  model: z.string().trim().min(2, "Model required").max(120),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  qtyOrdered: z.coerce.number().int().min(1, "Qty must be at least 1"),
  unitCost: moneyRequired,
});

const itemsField = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return [];
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}, z.array(poItemSchema).min(1, "Add at least one line item"));

const purchaseSchema = z.object({
  supplierId: z.coerce.number().int().positive("Supplier is required"),
  branchId: z.coerce.number().int().positive("Branch is required"),
  items: itemsField,
  amountPaid: moneyZero,
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date required"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function recordPurchase(actor: Actor, raw: unknown) {
  if (!canProcure(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = purchaseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const i = parsed.data;

  // #15: total is COMPUTED from the lines — no hand-typed total to drift from reality.
  const totalCost = i.items.reduce((acc, it) => acc + it.qtyOrdered * Number(it.unitCost), 0).toFixed(2);
  if (Number(i.amountPaid) > Number(totalCost)) {
    return { ok: false as const, error: `Paid amount cannot exceed the computed total (Rs. ${totalCost}).` };
  }
  const description = i.items
    .map((it) => `${it.qtyOrdered}x ${it.model}${it.color ? ` (${it.color})` : ""}`)
    .join(", ");

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
          description,
          totalCost,
          amountPaid: i.amountPaid,
          purchaseDate: i.purchaseDate,
          notes: i.notes || null,
          createdBy: actor.userId,
        })
        .returning({ id: purchaseOrders.id });

      await tx.insert(purchaseOrderItems).values(
        i.items.map((it) => ({
          poId: po.id,
          model: it.model,
          color: it.color || null,
          qtyOrdered: it.qtyOrdered,
          unitCost: it.unitCost,
        })),
      );

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
      details: { poNo: result.poNo, totalCost, paid: i.amountPaid, lines: i.items.length },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to record purchase." };
  }
}

/** #15: receive stock against one line — accumulates, hard-capped at qtyOrdered. */
export async function receivePurchaseItem(actor: Actor, itemId: number, qty: number) {
  if (!canProcure(actor.role)) return { ok: false as const, error: "Not allowed." };
  if (!qty || qty < 1) return { ok: false as const, error: "Quantity must be at least 1." };

  try {
    const result = await db.transaction(async (tx) => {
      const [item] = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, itemId)).for("update");
      if (!item) throw new Error("Line item not found.");
      const remaining = item.qtyOrdered - item.qtyReceived;
      if (qty > remaining) throw new Error(`Only ${remaining} still expected on this line.`);

      await tx
        .update(purchaseOrderItems)
        .set({ qtyReceived: item.qtyReceived + qty })
        .where(eq(purchaseOrderItems.id, itemId));

      const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, item.poId));
      return { poId: item.poId, poNo: po?.poNo, branchId: po?.branchId ?? null, model: item.model, newReceived: item.qtyReceived + qty };
    });

    await writeAudit({
      userId: actor.userId,
      action: "purchase.receive",
      entity: "purchase_order",
      entityId: result.poId,
      branchId: result.branchId,
      details: { poNo: result.poNo, model: result.model, qty, nowReceived: result.newReceived },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to receive stock." };
  }
}

/** #15: ordering patterns — what you buy, how often, how much of it arrives. */
export async function orderPatterns() {
  return db
    .select({
      model: purchaseOrderItems.model,
      timesOrdered: sql<number>`count(distinct ${purchaseOrderItems.poId})::int`,
      totalOrdered: sql<number>`sum(${purchaseOrderItems.qtyOrdered})::int`,
      totalReceived: sql<number>`sum(${purchaseOrderItems.qtyReceived})::int`,
      totalSpent: sql<string>`sum(${purchaseOrderItems.qtyOrdered} * ${purchaseOrderItems.unitCost})`,
      lastOrdered: sql<string>`max(${purchaseOrders.purchaseDate})`,
    })
    .from(purchaseOrderItems)
    .innerJoin(purchaseOrders, eq(purchaseOrderItems.poId, purchaseOrders.id))
    .groupBy(purchaseOrderItems.model)
    .orderBy(sql`sum(${purchaseOrderItems.qtyOrdered}) desc`);
}

/** All lines for a set of POs (page groups them client-side). */
export async function listPurchaseItems(poIds: number[]) {
  if (poIds.length === 0) return [];
  return db.select().from(purchaseOrderItems).where(inArray(purchaseOrderItems.poId, poIds));
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
