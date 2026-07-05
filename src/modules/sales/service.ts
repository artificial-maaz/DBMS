import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  branches,
  installmentSchedules,
  invoiceItems,
  invoices,
  ledgerEntries,
  vehicles,
} from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canCreateSale, canManageCommission, seesAllBranches } from "./permissions";
import { createSaleSchema } from "./validators";

type Actor = { userId: string; role: string; branchId: number | null };

const r2 = (n: number) => Math.round(n * 100) / 100;
const s = (n: number) => n.toFixed(2);

/**
 * Finalize a sale — one atomic transaction:
 *   invoice + lines → vehicle marked sold → ledger entry (cash / downpayment)
 *   → amortization schedule (installment) → audit.
 * If any step fails, everything rolls back — no half-sold vehicles, ever.
 */
/**
 * Record a payment against one installment — atomic:
 *   schedule.paidAmount += amount (paid when covered) → ledger cash_in
 *   → invoice.balanceDue -= amount (settled at zero) → audit.
 */
export async function recordInstallmentPayment(
  actor: Actor,
  raw: { scheduleId: number; amount: string },
) {
  if (!canCreateSale(actor.role)) return { ok: false as const, error: "Not allowed to collect payments." };
  const amount = Number(raw.amount);
  if (!raw.scheduleId || isNaN(amount) || amount <= 0) {
    return { ok: false as const, error: "Enter a valid payment amount." };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [sched] = await tx
        .select()
        .from(installmentSchedules)
        .where(eq(installmentSchedules.id, raw.scheduleId))
        .for("update");
      if (!sched) throw new Error("Installment not found.");
      if (sched.status === "paid") throw new Error("This installment is already paid.");

      const [inv] = await tx.select().from(invoices).where(eq(invoices.id, sched.invoiceId)).for("update");
      if (!inv) throw new Error("Invoice not found.");
      if (!seesAllBranches(actor.role) && inv.branchId !== actor.branchId) {
        throw new Error("You can only collect payments for your own branch.");
      }

      const remaining = r2(Number(sched.totalDue) + Number(sched.lateFee) - Number(sched.paidAmount));
      if (amount > remaining) throw new Error(`Amount exceeds remaining Rs. ${remaining}.`);

      const newPaid = r2(Number(sched.paidAmount) + amount);
      const fullyPaid = newPaid >= r2(Number(sched.totalDue) + Number(sched.lateFee));
      await tx
        .update(installmentSchedules)
        .set({ paidAmount: s(newPaid), status: fullyPaid ? "paid" : sched.status, paidAt: fullyPaid ? new Date() : null })
        .where(eq(installmentSchedules.id, sched.id));

      await tx.insert(ledgerEntries).values({
        branchId: inv.branchId,
        direction: "cash_in",
        category: "installment",
        amount: s(amount),
        description: `Installment #${sched.installmentNo} for ${inv.invoiceNo}`,
        invoiceId: inv.id,
        entryDate: new Date().toISOString().slice(0, 10),
        createdBy: actor.userId,
      });

      const newBalance = r2(Number(inv.balanceDue) - amount);
      await tx
        .update(invoices)
        .set({ balanceDue: s(Math.max(newBalance, 0)), status: newBalance <= 0 ? "settled" : inv.status })
        .where(eq(invoices.id, inv.id));

      return { invoiceId: inv.id, invoiceNo: inv.invoiceNo, branchId: inv.branchId, installmentNo: sched.installmentNo };
    });

    await writeAudit({
      userId: actor.userId,
      action: "installment.payment",
      entity: "invoice",
      entityId: result.invoiceId,
      branchId: result.branchId,
      details: { invoiceNo: result.invoiceNo, installmentNo: result.installmentNo, amount: s(amount) },
    });

    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to record payment." };
  }
}

export async function createSale(actor: Actor, raw: unknown) {
  if (!canCreateSale(actor.role)) return { ok: false as const, error: "Not allowed to create sales." };

  const parsed = createSaleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  // Salespeople cannot set their own commission.
  const commission = canManageCommission(actor.role) ? Number(input.commissionAmount) : 0;

  const subtotal = Number(input.salePrice);
  const discount = Number(input.discount);
  const regGovt = Number(input.registrationFeeGovt);
  const regProfit = Number(input.registrationFeeProfit);
  const total = r2(subtotal - discount + regGovt + regProfit);
  const downpayment = input.settlementPlan === "installment" ? Number(input.downpayment) : total;
  const totalMarkup = input.settlementPlan === "installment" ? Number(input.totalMarkup) : 0;
  const principal = r2(total - downpayment);
  const balanceDue = input.settlementPlan === "installment" ? r2(principal + totalMarkup) : 0;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Vehicle must exist, be in stock, and be in the actor's reach.
      const [vehicle] = await tx
        .select({
          id: vehicles.id,
          status: vehicles.status,
          branchId: vehicles.branchId,
          make: vehicles.make,
          model: vehicles.model,
          chassisNo: vehicles.chassisNo,
          branchName: branches.name,
        })
        .from(vehicles)
        .innerJoin(branches, eq(vehicles.branchId, branches.id))
        .where(eq(vehicles.id, input.vehicleId))
        .for("update"); // lock the row — two salespeople cannot sell the same bike

      if (!vehicle) throw new Error("Vehicle not found.");
      if (vehicle.status !== "in_stock") throw new Error("This vehicle is not in stock.");
      if (!seesAllBranches(actor.role) && vehicle.branchId !== actor.branchId) {
        throw new Error("You can only sell vehicles from your own branch.");
      }

      // 2. Per-branch invoice number: <BRANCHCODE>-<YEAR>-<SEQ>
      // Keyed off saleDate (not createdAt) so a backdated sale lands in its own year's sequence.
      const year = new Date(input.saleDate).getFullYear();
      const [{ n }] = await tx
        .select({ n: count() })
        .from(invoices)
        .where(and(eq(invoices.branchId, vehicle.branchId), sql`extract(year from ${invoices.saleDate}) = ${year}`));
      const code = vehicle.branchName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "BRN";
      const invoiceNo = `${code}-${year}-${String(n + 1).padStart(4, "0")}`;

      // 3. Invoice
      const [inv] = await tx
        .insert(invoices)
        .values({
          invoiceNo,
          branchId: vehicle.branchId,
          customerId: input.customerId,
          salespersonId: actor.userId,
          settlementPlan: input.settlementPlan,
          subtotal: s(subtotal),
          discount: s(discount),
          registrationFeeGovt: s(regGovt),
          registrationFeeProfit: s(regProfit),
          total: s(total),
          downpayment: s(downpayment),
          balanceDue: s(balanceDue),
          commissionAmount: s(commission),
          notes: input.notes || null,
          createdBy: actor.userId,
          saleDate: input.saleDate,
        })
        .returning({ id: invoices.id });

      // 4. Lines
      await tx.insert(invoiceItems).values({
        invoiceId: inv.id,
        vehicleId: vehicle.id,
        description: `${vehicle.make} ${vehicle.model} — ${vehicle.chassisNo}`,
        amount: s(subtotal),
      });
      if (regGovt + regProfit > 0) {
        await tx.insert(invoiceItems).values({
          invoiceId: inv.id,
          description: "Registration / excise fee",
          amount: s(regGovt + regProfit),
        });
      }

      // 5. Vehicle sold
      await tx.update(vehicles).set({ status: "sold", updatedAt: new Date() }).where(eq(vehicles.id, vehicle.id));

      // 6. Cash received now → ledger (append-only)
      if (downpayment > 0) {
        await tx.insert(ledgerEntries).values({
          branchId: vehicle.branchId,
          direction: "cash_in",
          category: "sale",
          amount: s(downpayment),
          description:
            input.settlementPlan === "cash"
              ? `Cash sale ${invoiceNo}`
              : `Downpayment for installment sale ${invoiceNo}`,
          invoiceId: inv.id,
          entryDate: input.saleDate,
          createdBy: actor.userId,
        });
      }

      // 7. Amortization schedule — monthly rows; last row absorbs rounding.
      // Due dates count forward from saleDate, not "today" — a backdated sale
      // gets a backdated (and likely already-due) first installment, correctly.
      if (input.settlementPlan === "installment" && input.months) {
        const m = input.months;
        const monthlyPrincipal = r2(principal / m);
        const monthlyMarkup = r2(totalMarkup / m);
        const rows = [];
        let accP = 0;
        let accM = 0;
        for (let i = 1; i <= m; i++) {
          const due = new Date(`${input.saleDate}T00:00:00`);
          due.setMonth(due.getMonth() + i);
          const p = i === m ? r2(principal - accP) : monthlyPrincipal;
          const mk = i === m ? r2(totalMarkup - accM) : monthlyMarkup;
          accP = r2(accP + p);
          accM = r2(accM + mk);
          rows.push({
            invoiceId: inv.id,
            installmentNo: i,
            dueDate: due.toISOString().slice(0, 10),
            principal: s(p),
            markup: s(mk),
            totalDue: s(r2(p + mk)),
          });
        }
        await tx.insert(installmentSchedules).values(rows);
      }

      return { invoiceId: inv.id, invoiceNo, branchId: vehicle.branchId };
    });

    await writeAudit({
      userId: actor.userId,
      action: "sale.create",
      entity: "invoice",
      entityId: result.invoiceId,
      branchId: result.branchId,
      details: { invoiceNo: result.invoiceNo, plan: input.settlementPlan, total: s(total), saleDate: input.saleDate },
    });

    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to create sale." };
  }
}
