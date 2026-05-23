import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ledgerEntries, purchaseOrderItems, purchaseOrders, suppliers } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { moneyRequired } from "@/lib/validation";
import { canProcure } from "./permissions";
import { purchaseEditSchema, purchaseSchema, supplierSchema } from "./validators";

type Actor = { userId: string; role: string };

/**
 * Write side of procurement. Reads live in queries.ts, the role gate in
 * permissions.ts and the zod schemas in validators.ts (split out 2026-08-09 —
 * this module was the last one still doing all four jobs in one file).
 */

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

/**
 * #19 (Sir, 2026-08-09): contact people change, names get mistyped. Every field
 * on a supplier is editable — none of them is referenced by anything financial,
 * so there is nothing here that can drift out of step with the books.
 */
export async function updateSupplier(actor: Actor, supplierId: number, raw: unknown) {
  if (!canProcure(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const i = parsed.data;

  try {
    await db
      .update(suppliers)
      .set({
        name: i.name,
        contactPerson: i.contactPerson || null,
        phone: i.phone || null,
        email: i.email || null,
        city: i.city || null,
        ntn: i.ntn || null,
        notes: i.notes || null,
      })
      .where(eq(suppliers.id, supplierId));

    await writeAudit({
      userId: actor.userId,
      action: "supplier.update",
      entity: "supplier",
      entityId: supplierId,
      details: { name: i.name },
    });
    return { ok: true as const };
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("duplicate");
    return { ok: false as const, error: dup ? "Another supplier already uses that name." : "Failed to update supplier." };
  }
}

/**
 * #19: retire, never delete — purchase orders reference suppliers forever, so a
 * supplier you have stopped buying from has to stay in the database. Retiring
 * drops it out of the New Purchase dropdown while leaving every historical PO
 * exactly as it was. Same pattern as installment plans and the checklists.
 */
export async function setSupplierActive(actor: Actor, supplierId: number, isActive: boolean) {
  if (!canProcure(actor.role)) return { ok: false as const, error: "Not allowed." };
  await db.update(suppliers).set({ isActive }).where(eq(suppliers.id, supplierId));
  await writeAudit({
    userId: actor.userId,
    action: isActive ? "supplier.activate" : "supplier.deactivate",
    entity: "supplier",
    entityId: supplierId,
  });
  return { ok: true as const };
}

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

/**
 * #19 (Sir, 2026-08-09): correct a mistyped purchase order.
 *
 * What is deliberately NOT editable here, and why:
 *  - **branchId** — the payment already posted a `cash_out` to that branch's
 *    ledger. Moving the PO would leave the cash in one branch's book and the
 *    stock liability in another's. Company totals would still balance; the
 *    per-branch books would quietly stop being true.
 *  - **amountPaid** — the ledger is append-only. Money only ever moves through
 *    `payPurchase`, which writes a real entry. If editing could change what was
 *    paid, the PO and the ledger could disagree with nothing recording why.
 *  - **any line with `qtyReceived > 0`** — its unit cost is already baked into
 *    received inventory, so rewriting it would silently restate stock value.
 *
 * Everything else — supplier, date, notes, and any line nothing has arrived
 * against — is fair game. The total is always RECOMPUTED from the final lines,
 * never taken from the client, and the whole thing runs under row locks so a
 * concurrent receive or payment cannot slip in mid-edit.
 */
export async function updatePurchase(actor: Actor, poId: number, raw: unknown) {
  if (!canProcure(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = purchaseEditSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const i = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).for("update");
      if (!po) throw new Error("Purchase not found.");

      const existing = await tx
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.poId, poId))
        .for("update");
      const existingById = new Map(existing.map((e) => [e.id, e]));
      const submittedIds = new Set(i.items.map((it) => it.id).filter((id): id is number => typeof id === "number"));

      // A line that has taken delivery cannot be dropped.
      for (const e of existing) {
        if (!submittedIds.has(e.id) && e.qtyReceived > 0) {
          throw new Error(`"${e.model}" already has ${e.qtyReceived} unit(s) received and cannot be removed.`);
        }
      }

      // ...nor silently rewritten.
      for (const it of i.items) {
        if (it.id === undefined) continue;
        const e = existingById.get(it.id);
        if (!e) throw new Error("A line on this purchase no longer exists — reload the page and try again.");
        if (e.qtyReceived === 0) continue;
        const changed =
          e.model !== it.model ||
          (e.color ?? "") !== (it.color ?? "") ||
          e.qtyOrdered !== it.qtyOrdered ||
          Number(e.unitCost) !== Number(it.unitCost);
        if (changed) {
          throw new Error(
            `"${e.model}" already has ${e.qtyReceived} unit(s) received — its cost is in inventory, so it can no longer be edited.`,
          );
        }
      }

      const totalCost = i.items.reduce((acc, it) => acc + it.qtyOrdered * Number(it.unitCost), 0).toFixed(2);
      if (Number(totalCost) < Number(po.amountPaid)) {
        throw new Error(
          `The new total (Rs. ${totalCost}) is less than the Rs. ${po.amountPaid} already paid. Refund through the ledger first.`,
        );
      }

      for (const e of existing) {
        if (!submittedIds.has(e.id)) {
          await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, e.id));
        }
      }
      for (const it of i.items) {
        if (it.id === undefined) {
          await tx.insert(purchaseOrderItems).values({
            poId,
            model: it.model,
            color: it.color || null,
            qtyOrdered: it.qtyOrdered,
            unitCost: it.unitCost,
          });
        } else {
          await tx
            .update(purchaseOrderItems)
            .set({
              model: it.model,
              color: it.color || null,
              qtyOrdered: it.qtyOrdered,
              unitCost: it.unitCost,
            })
            .where(eq(purchaseOrderItems.id, it.id));
        }
      }

      const description = i.items
        .map((it) => `${it.qtyOrdered}x ${it.model}${it.color ? ` (${it.color})` : ""}`)
        .join(", ");

      await tx
        .update(purchaseOrders)
        .set({
          supplierId: i.supplierId,
          purchaseDate: i.purchaseDate,
          notes: i.notes || null,
          description,
          totalCost,
        })
        .where(eq(purchaseOrders.id, poId));

      return { poNo: po.poNo, branchId: po.branchId, totalCost, oldTotal: po.totalCost, lines: i.items.length };
    });

    await writeAudit({
      userId: actor.userId,
      action: "purchase.update",
      entity: "purchase_order",
      entityId: poId,
      branchId: result.branchId,
      details: {
        poNo: result.poNo,
        lines: result.lines,
        ...(result.oldTotal !== result.totalCost ? { totalWas: result.oldTotal, totalNow: result.totalCost } : {}),
      },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update purchase." };
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
