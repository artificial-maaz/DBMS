import { and, count, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { invoices, ledgerEntries, payrollRecords, staffProfiles, user } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { moneyZero } from "@/lib/validation";

type Actor = { userId: string; role: string };

export const canRunPayroll = (role: string) => ["creator", "owner"].includes(role);

const runSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Period start required"),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Period end required"),
  bonus: moneyZero,
  deductions: moneyZero,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

/** Commissions earned in the period from finalized sales. */
export async function commissionsFor(userId: string, from: string, to: string) {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${invoices.commissionAmount}), 0)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.salespersonId, userId),
        ne(invoices.status, "cancelled"),
        gte(invoices.createdAt, new Date(from)),
        lte(invoices.createdAt, new Date(to + "T23:59:59")),
      ),
    );
  return Number(row.total);
}

export async function runPayroll(actor: Actor, raw: unknown) {
  if (!canRunPayroll(actor.role)) return { ok: false as const, error: "Only Creator/Owners run payroll." };
  const parsed = runSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  try {
    const profile = await db.query.staffProfiles.findFirst({
      where: (p, { eq }) => eq(p.userId, input.userId),
    });
    if (!profile || !profile.isActive) return { ok: false as const, error: "Active staff member not found." };

    // Guard: no duplicate payout for an overlapping period.
    const existing = await db.query.payrollRecords.findFirst({
      where: (r, { and, eq, lte, gte }) =>
        and(eq(r.userId, input.userId), lte(r.periodStart, input.periodEnd), gte(r.periodEnd, input.periodStart)),
    });
    if (existing) return { ok: false as const, error: `Already paid for an overlapping period (${existing.payNo}).` };

    const commissions = await commissionsFor(input.userId, input.periodStart, input.periodEnd);
    const basic = Number(profile.basicSalary);
    const allowances = Number(profile.monthlyAllowances);
    const bonus = Number(input.bonus);
    const deductions = Number(input.deductions);
    const net = basic + allowances + commissions + bonus - deductions;
    if (net < 0) return { ok: false as const, error: "Net payout cannot be negative." };

    const result = await db.transaction(async (tx) => {
      const [{ n }] = await tx.select({ n: count() }).from(payrollRecords);
      const payNo = `PAY-${String(n + 1).padStart(4, "0")}`;

      const [rec] = await tx
        .insert(payrollRecords)
        .values({
          payNo,
          userId: input.userId,
          branchId: profile.branchId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          basicSalary: basic.toFixed(2),
          allowances: allowances.toFixed(2),
          commissions: commissions.toFixed(2),
          bonus: bonus.toFixed(2),
          deductions: deductions.toFixed(2),
          netPayout: net.toFixed(2),
          notes: input.notes || null,
          createdBy: actor.userId,
        })
        .returning({ id: payrollRecords.id });

      if (net > 0) {
        await tx.insert(ledgerEntries).values({
          branchId: profile.branchId ?? 1,
          direction: "cash_out",
          category: "salary",
          amount: net.toFixed(2),
          description: `Salary release ${payNo} (${input.periodStart} → ${input.periodEnd})`,
          entryDate: new Date().toISOString().slice(0, 10),
          createdBy: actor.userId,
        });
      }
      return { id: rec.id, payNo, net };
    });

    await writeAudit({
      userId: actor.userId,
      action: "payroll.release",
      entity: "payroll_record",
      entityId: result.id,
      branchId: profile.branchId,
      details: { payNo: result.payNo, employee: input.userId, net: result.net.toFixed(2) },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to release payroll." };
  }
}

export async function listPayroll() {
  return db
    .select({
      id: payrollRecords.id,
      payNo: payrollRecords.payNo,
      employeeName: user.name,
      periodStart: payrollRecords.periodStart,
      periodEnd: payrollRecords.periodEnd,
      basicSalary: payrollRecords.basicSalary,
      allowances: payrollRecords.allowances,
      commissions: payrollRecords.commissions,
      bonus: payrollRecords.bonus,
      deductions: payrollRecords.deductions,
      netPayout: payrollRecords.netPayout,
      createdAt: payrollRecords.createdAt,
    })
    .from(payrollRecords)
    .innerJoin(user, eq(payrollRecords.userId, user.id))
    .orderBy(desc(payrollRecords.createdAt))
    .limit(100);
}

export async function listPayableStaff() {
  return db
    .select({
      userId: staffProfiles.userId,
      name: user.name,
      role: staffProfiles.role,
      basicSalary: staffProfiles.basicSalary,
      monthlyAllowances: staffProfiles.monthlyAllowances,
    })
    .from(staffProfiles)
    .innerJoin(user, eq(staffProfiles.userId, user.id))
    .where(and(eq(staffProfiles.isActive, true), ne(staffProfiles.role, "creator")));
}
