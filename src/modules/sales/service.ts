import { and, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  branches,
  guarantors,
  installmentSchedules,
  invoiceDocuments,
  invoiceHandovers,
  invoiceItems,
  invoices,
  ledgerEntries,
  partMovements,
  spareParts,
  vehicles,
} from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { canCreateSale, canManageCommission, seesAllBranches } from "./permissions";
import { createSaleSchema } from "./validators";
import { needsWarrantyCard } from "./warranty";

type Actor = { userId: string; role: string; branchId: number | null };

/** The handle inside `db.transaction(async (tx) => ...)`. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const r2 = (n: number) => Math.round(n * 100) / 100;
const s = (n: number) => n.toFixed(2);

/**
 * #15 (Sir, 2026-08-09) — auto-settle, FULLY AUTOMATIC. No "close case" button.
 *
 * A case is finished when BOTH halves are finished: nothing is owed, and no
 * paperwork we are responsible for is still in our hands. A cash sale whose
 * registration file is sitting in the branch drawer is not closed business, and
 * neither is an installment case whose final payment landed while its file is
 * still with us.
 *
 * Which documents block:
 *   provided = true AND custody <> given_to_customer
 * A document the customer never handed over (`provided = false`) was WAIVED at
 * sale time — an accepted exception with compensation on record — so it must not
 * block settlement forever. Only papers we actually took and have not returned do.
 *
 * Deliberately BIDIRECTIONAL: moving a document back to `held_by_dealer` on a
 * settled invoice reopens it. There is no manual override in this design, so a
 * one-way flip would strand an invoice in `settled` with real work outstanding
 * and no way back short of SQL.
 *
 * `cancelled` is never touched — a reversal stays reversed.
 *
 * Callers must already hold the invoice row (FOR UPDATE) where a race matters.
 * Returns the new status if it changed, otherwise null.
 */
async function syncInvoiceSettlement(tx: Tx, invoiceId: number) {
  const [inv] = await tx
    .select({ status: invoices.status, balanceDue: invoices.balanceDue })
    .from(invoices)
    .where(eq(invoices.id, invoiceId));
  if (!inv || inv.status === "cancelled") return null;

  const [held] = await tx
    .select({ n: count() })
    .from(invoiceDocuments)
    .where(
      and(
        eq(invoiceDocuments.invoiceId, invoiceId),
        eq(invoiceDocuments.provided, true),
        ne(invoiceDocuments.custody, "given_to_customer"),
      ),
    );

  const complete = Number(inv.balanceDue) <= 0 && Number(held.n) === 0;
  const next = complete ? ("settled" as const) : ("active" as const);
  if (next === inv.status) return null;

  await tx.update(invoices).set({ status: next }).where(eq(invoices.id, invoiceId));
  return next;
}

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
      // Cross-branch (2026-07-31): any sales-floor staff may collect an installment —
      // the cash-in still posts to the INVOICE's branch ledger, keeping books truthful.

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
        .set({ balanceDue: s(Math.max(newBalance, 0)) })
        .where(eq(invoices.id, inv.id));

      // #15: the status is no longer decided here. Zero balance is only half of
      // "finished" — documents still in our custody keep the case open.
      const settlement = await syncInvoiceSettlement(tx, inv.id);

      return {
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        branchId: inv.branchId,
        installmentNo: sched.installmentNo,
        settlement,
      };
    });

    await writeAudit({
      userId: actor.userId,
      action: "installment.payment",
      entity: "invoice",
      entityId: result.invoiceId,
      branchId: result.branchId,
      details: {
        invoiceNo: result.invoiceNo,
        installmentNo: result.installmentNo,
        amount: s(amount),
        ...(result.settlement ? { caseStatus: result.settlement } : {}),
      },
    });

    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to record payment." };
  }
}

/**
 * Abrar #2 (2026-07-14): documents move after the sale — customer collects
 * papers later, or we take custody for registration services. Managers update
 * custody per document; every change is audit-logged.
 */
export async function setDocumentCustody(
  actor: Actor,
  docId: number,
  custody: "given_to_customer" | "held_by_dealer" | "pending",
) {
  if (!canManageCommission(actor.role)) {
    return { ok: false as const, error: "Only managers can update document custody." };
  }
  if (!["given_to_customer", "held_by_dealer", "pending"].includes(custody)) {
    return { ok: false as const, error: "Invalid custody state." };
  }

  const doc = await db.query.invoiceDocuments.findFirst({ where: (d, { eq }) => eq(d.id, docId) });
  if (!doc) return { ok: false as const, error: "Document record not found." };
  const inv = await db.query.invoices.findFirst({ where: (i, { eq }) => eq(i.id, doc.invoiceId) });
  if (!inv) return { ok: false as const, error: "Invoice not found." };
  if (!seesAllBranches(actor.role) && inv.branchId !== actor.branchId) {
    return { ok: false as const, error: "Wrong branch." };
  }

  // #15: custody and case status move together — releasing the last held paper
  // on a fully-paid invoice closes the case in the same breath, and taking a
  // paper back on a settled one reopens it. One transaction so a reader can
  // never see "all documents released" next to "still active".
  const settlement = await db.transaction(async (tx) => {
    await tx.update(invoiceDocuments).set({ custody }).where(eq(invoiceDocuments.id, docId));
    return syncInvoiceSettlement(tx, inv.id);
  });

  await writeAudit({
    userId: actor.userId,
    action: "invoice.document_custody",
    entity: "invoice",
    entityId: inv.id,
    branchId: inv.branchId,
    details: {
      invoiceNo: inv.invoiceNo,
      document: doc.requirementName,
      custody,
      ...(settlement ? { caseStatus: settlement } : {}),
    },
  });
  return { ok: true as const };
}

/** Sir 2026-07-14: mark the warranty card photo as sent after the fact (BMs forget at sale time). */
export async function setWarrantyCardSent(actor: Actor, invoiceId: number) {
  if (!canManageCommission(actor.role)) return { ok: false as const, error: "Only managers can update this." };
  const inv = await db.query.invoices.findFirst({ where: (i, { eq }) => eq(i.id, invoiceId) });
  if (!inv) return { ok: false as const, error: "Invoice not found." };
  if (!seesAllBranches(actor.role) && inv.branchId !== actor.branchId) {
    return { ok: false as const, error: "Wrong branch." };
  }

  // #14: only Yadea issues a warranty card. The button is hidden for other
  // makes, so this guard exists for the crafted-request case — and to keep the
  // rule enforced in the service layer where it belongs, not only in the view.
  const [line] = await db
    .select({ vehicleId: invoiceItems.vehicleId })
    .from(invoiceItems)
    .where(and(eq(invoiceItems.invoiceId, invoiceId), sql`${invoiceItems.vehicleId} is not null`));
  const soldVehicle = line?.vehicleId
    ? await db.query.vehicles.findFirst({ where: (v, { eq }) => eq(v.id, line.vehicleId!) })
    : null;
  if (!needsWarrantyCard(soldVehicle?.make)) {
    return { ok: false as const, error: "Warranty cards apply to Yadea sales only." };
  }

  await db.update(invoices).set({ warrantyCardSent: true }).where(eq(invoices.id, invoiceId));
  await writeAudit({
    userId: actor.userId,
    action: "invoice.warranty_card_sent",
    entity: "invoice",
    entityId: invoiceId,
    branchId: inv.branchId,
    details: { invoiceNo: inv.invoiceNo },
  });
  return { ok: true as const };
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
  // Vehicle side only. Parts are priced inside the transaction (they need row
  // locks), so the final total is derived there - see `partsTotal` below.
  const baseTotal = r2(subtotal - discount + regGovt + regProfit);
  const totalMarkup = input.settlementPlan === "installment" ? Number(input.totalMarkup) : 0;

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
      // Cross-branch ops (Sir 2026-07-31): staff may sell ANY branch's stock — the
      // invoice, ledger cash-in, and P&L all land at the VEHICLE's branch, so each
      // branch's books stay truthful regardless of who made the sale.

      /**
       * 1c. Parts sold with the bike (2026-08-16).
       *
       * Priced from the DATABASE, never from the request — otherwise a crafted
       * form could sell a battery for one rupee. Rows are locked FOR UPDATE so
       * two counters cannot sell the last helmet simultaneously, and stock is
       * checked here, before anything is written.
       *
       * Parts must belong to the VEHICLE's branch. That is the same rule the
       * booking token follows and for the same reason: stock and the money it
       * earns have to leave the same branch, or the per-branch books drift.
       */
      const partLines: { partId: number; name: string; qty: number; lineTotal: number }[] = [];
      for (const p of input.parts) {
        const [row] = await tx.select().from(spareParts).where(eq(spareParts.id, p.partId)).for("update");
        if (!row) throw new Error("A selected part no longer exists — refresh and try again.");
        if (!row.isActive) throw new Error(`"${row.name}" has been retired and cannot be sold.`);
        if (row.branchId !== vehicle.branchId) {
          throw new Error(`"${row.name}" is stocked at another branch — transfer it first or remove it from this sale.`);
        }
        if (row.currentQty < p.qty) {
          throw new Error(`Only ${row.currentQty} of "${row.name}" in stock at this branch.`);
        }
        const unit = Number(row.retailPrice ?? 0);
        if (unit <= 0) throw new Error(`"${row.name}" has no retail price set — set one in Spare Parts first.`);
        partLines.push({ partId: row.id, name: row.name, qty: p.qty, lineTotal: r2(unit * p.qty) });
      }
      const partsTotal = r2(partLines.reduce((a, l) => a + l.lineTotal, 0));

      /**
       * Parts ADD to the invoice, so every downstream figure has to be derived
       * here rather than from the pre-transaction estimate. A cash sale's
       * downpayment IS the whole invoice; an installment sale's advance is what
       * the customer typed, so parts land in the financed balance.
       */
      const total = r2(baseTotal + partsTotal);
      const downpayment = input.settlementPlan === "installment" ? Number(input.downpayment) : total;
      const principal = r2(total - downpayment);
      const balanceDue = input.settlementPlan === "installment" ? r2(principal + totalMarkup) : 0;

      // 1b. Booking token reconciliation (#14): lock it, verify it's really
      // this customer's open booking, and cap the credit at the downpayment
      // being applied — a token bigger than what's due today is a "fix the
      // numbers first" situation, not something to silently invent a refund for.
      let bookingCredit = 0;
      let lockedBookingId: number | null = null;
      if (input.bookingId) {
        const [booking] = await tx.select().from(bookings).where(eq(bookings.id, input.bookingId)).for("update");
        if (!booking) throw new Error("Booking not found.");
        if (booking.status !== "open") throw new Error("This booking is no longer open.");
        if (booking.customerId !== input.customerId) throw new Error("This booking belongs to a different customer.");
        // Cross-branch (2026-07-31): who applies the booking no longer matters —
        // only WHERE it was taken does (checked right below against the vehicle).
        // Per-branch cash books must stay truthful: the token's cash-in sits in
        // the booking branch's ledger, so the sale must happen at that branch
        // (transfer the vehicle via Gate Pass first if it lives elsewhere).
        if (booking.branchId !== vehicle.branchId) {
          throw new Error("This booking was taken at a different branch than the vehicle — transfer the vehicle or refund the booking first.");
        }
        bookingCredit = Number(booking.tokenAmount);
        lockedBookingId = booking.id;

        if (bookingCredit > downpayment) {
          throw new Error(
            `Booking token (Rs. ${bookingCredit}) exceeds the downpayment being applied (Rs. ${downpayment}) — increase the downpayment or refund part of the booking first.`,
          );
        }
      }

      // Cash already sitting in the ledger from the booking — only the difference is new money today.
      const newCashToCollect = r2(downpayment - bookingCredit);

      // 2. Invoice number: <BRANCHCODE>-<YEAR>-<SEQ>
      // Keyed off saleDate (not createdAt) so a backdated sale lands in its own year's sequence.
      //
      // BUG FIX (Sir, 2026-08-06): this used to COUNT invoices for the branch,
      // which produced duplicates whenever two branches share a 3-letter code —
      // "Test Branch Lahore" and "Test Branch Kasur" both yield "TES", so each
      // branch counted itself to 0 and both tried to insert TES-2026-0001,
      // violating the unique index. Real branch names collide the same way
      // ("Lahore Main" / "Lahore Road" -> "LAH").
      //
      // Now the sequence is derived from the highest number ALREADY ISSUED under
      // that exact prefix, so it is unique by construction and immune to gaps
      // left by deleted or cancelled rows.
      const year = new Date(input.saleDate).getFullYear();
      const code = vehicle.branchName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "BRN";
      const prefix = `${code}-${year}-`;
      const [{ maxSeq }] = await tx
        .select({
          maxSeq: sql<number>`coalesce(max(cast(split_part(${invoices.invoiceNo}, '-', 3) as integer)), 0)`,
        })
        .from(invoices)
        .where(sql`${invoices.invoiceNo} like ${prefix + "%"}`);
      const invoiceNo = `${prefix}${String(Number(maxSeq) + 1).padStart(4, "0")}`;

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
          // #14: Yadea-only. Hard-stripped server-side for every other make, the
          // same way guarantor/document rows are stripped for cash sales — the
          // field is hidden in the UI, so a `true` here could only be crafted.
          warrantyCardSent: needsWarrantyCard(vehicle.make) && input.warrantyCardSent,
        })
        .returning({ id: invoices.id });

      // 4. Lines
      await tx.insert(invoiceItems).values({
        invoiceId: inv.id,
        vehicleId: vehicle.id,
        description: `${vehicle.make} ${vehicle.model} — ${vehicle.chassisNo}`,
        amount: s(subtotal),
      });

      // 4b. Spare parts / accessories on the same invoice (2026-08-16).
      // Rows were locked and priced BEFORE the invoice was written (see above),
      // so by here the stock is reserved and the money is already in `total`.
      for (const line of partLines) {
        await tx.insert(invoiceItems).values({
          invoiceId: inv.id,
          partId: line.partId,
          qty: line.qty,
          description: `${line.name} × ${line.qty}`,
          amount: s(line.lineTotal),
        });
        await tx
          .update(spareParts)
          .set({ currentQty: sql`${spareParts.currentQty} - ${line.qty}` })
          .where(eq(spareParts.id, line.partId));
        // Append-only movement, exactly like the workshop path — the quantity on
        // the part row must always be reconstructible from these.
        await tx.insert(partMovements).values({
          partId: line.partId,
          delta: -line.qty,
          reason: "sale",
          invoiceId: inv.id,
          note: `Sold on ${invoiceNo}`,
          createdBy: actor.userId,
        });
      }
      if (regGovt + regProfit > 0) {
        await tx.insert(invoiceItems).values({
          invoiceId: inv.id,
          description: "Registration / excise fee",
          amount: s(regGovt + regProfit),
        });
      }

      // 5. Vehicle sold
      await tx.update(vehicles).set({ status: "sold", updatedAt: new Date() }).where(eq(vehicles.id, vehicle.id));

      // 6. Cash received TODAY → ledger (append-only). If a booking token
      // already covered part (or all) of this, only the delta posts here —
      // the token's cash-in entry was already recorded at booking time.
      if (newCashToCollect > 0) {
        const creditNote = bookingCredit > 0 ? ` (Rs. ${bookingCredit} booking token already applied)` : "";
        await tx.insert(ledgerEntries).values({
          branchId: vehicle.branchId,
          direction: "cash_in",
          category: "sale",
          amount: s(newCashToCollect),
          description:
            (input.settlementPlan === "cash"
              ? `Cash sale ${invoiceNo}`
              : `Downpayment for installment sale ${invoiceNo}`) + creditNote,
          invoiceId: inv.id,
          entryDate: input.saleDate,
          createdBy: actor.userId,
        });
      }

      // 6b. Booking fulfilled — freeze it and point it at this invoice.
      if (lockedBookingId) {
        await tx
          .update(bookings)
          .set({ status: "converted", convertedInvoiceId: inv.id })
          .where(eq(bookings.id, lockedBookingId));
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

      // 8. Guarantor(s) — required for installment (enforced in validators).
      // Hard-stripped for cash sales: a crafted cash request with guarantor/
      // document rows attached must not write orphan agreement data.
      const saleGuarantors = input.settlementPlan === "installment" ? input.guarantors : [];
      const saleDocuments = input.settlementPlan === "installment" ? input.documents : [];
      if (saleGuarantors.length > 0) {
        await tx.insert(guarantors).values(
          saleGuarantors.map((g) => ({
            invoiceId: inv.id,
            fullName: g.fullName,
            cnic: g.cnic,
            phone: g.phone,
            address: g.address || null,
          })),
        );
      }

      // 9. Document checklist (#20) — informational only, installment sales;
      // `provided=false` rows are exceptions (may carry a compensation note).
      if (saleDocuments.length > 0) {
        await tx.insert(invoiceDocuments).values(
          saleDocuments.map((d) => ({
            invoiceId: inv.id,
            requirementId: d.requirementId,
            requirementName: d.requirementName,
            provided: d.provided,
            // Abrar #2: initial custody — provided at sale = handed to customer; else pending.
            custody: (d.provided ? "given_to_customer" : "pending") as "given_to_customer" | "pending",
            compensationAmount: d.provided ? null : d.compensationAmount ? s(Number(d.compensationAmount)) : null,
            compensationNote: d.provided ? null : d.compensationNote || null,
          })),
        );
      }

      // 10. Handover checklist (#13) — EVERY sale, cash included. Mirrors and a
      // charger are owed to a cash buyer exactly as much as to an installment
      // buyer, which is why this is not stripped the way documents are.
      if (input.handovers.length > 0) {
        await tx.insert(invoiceHandovers).values(
          input.handovers.map((h) => ({
            invoiceId: inv.id,
            requirementId: h.requirementId,
            requirementName: h.requirementName,
            handedOver: h.handedOver,
            note: h.handedOver ? null : h.note || null,
          })),
        );
      }

      // 11. #15: a cash sale with nothing owed and no paper held by us is
      // finished the moment it is written — it should never have sat in
      // "Active Invoices" waiting for a status nobody was ever going to set.
      // Installment sales fail this test on balance and stay active, as they should.
      const settlement = await syncInvoiceSettlement(tx, inv.id);

      return {
        invoiceId: inv.id,
        invoiceNo,
        branchId: vehicle.branchId,
        bookingId: lockedBookingId,
        bookingCredit,
        guarantorCount: saleGuarantors.length,
        missingDocuments: saleDocuments.filter((d) => !d.provided).length,
        pendingHandovers: input.handovers.filter((h) => !h.handedOver).length,
        settlement,
        total,
        partsTotal,
        partCount: partLines.length,
      };
    });

    await writeAudit({
      userId: actor.userId,
      action: "sale.create",
      entity: "invoice",
      entityId: result.invoiceId,
      branchId: result.branchId,
      details: {
        invoiceNo: result.invoiceNo,
        plan: input.settlementPlan,
        total: s(result.total),
        saleDate: input.saleDate,
        ...(result.bookingId ? { bookingId: result.bookingId, bookingCredit: s(result.bookingCredit) } : {}),
        ...(result.guarantorCount > 0 ? { guarantorCount: result.guarantorCount } : {}),
        ...(result.missingDocuments > 0 ? { missingDocuments: result.missingDocuments } : {}),
        ...(result.pendingHandovers > 0 ? { itemsNotHandedOver: result.pendingHandovers } : {}),
        ...(result.partCount > 0 ? { parts: result.partCount, partsTotal: s(result.partsTotal) } : {}),
        ...(result.settlement ? { caseStatus: result.settlement } : {}),
      },
    });

    return { ok: true as const, ...result };
  } catch (e) {
    // Raw driver text ("Failed query: insert into invoices...") is meaningless
    // to a salesperson. Translate the ones we can, keep the rest short.
    const raw = e instanceof Error ? e.message : "";
    if (raw.includes("duplicate key") && raw.includes("invoice_no")) {
      return { ok: false as const, error: "Two sales were finalised at the same moment. Try again — a fresh invoice number will be issued." };
    }
    if (raw.includes("duplicate key")) {
      return { ok: false as const, error: "That record already exists. Refresh the page and check before retrying." };
    }
    // Business-rule errors thrown inside the transaction are already friendly.
    const friendly = raw && !raw.startsWith("Failed query") ? raw : "Could not complete the sale. Nothing was saved — please try again.";
    return { ok: false as const, error: friendly };
  }
}
