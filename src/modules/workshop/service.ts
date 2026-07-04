import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { branches, customers, jobCards, ledgerEntries, staffProfiles, user, vehicles } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { moneyZero } from "@/lib/validation";

type Actor = { userId: string; role: string; branchId: number | null };

export const FREE_COUPONS_PER_VEHICLE = 3;

export const canUseWorkshop = (role: string) =>
  ["creator", "owner", "branch_manager", "mechanic"].includes(role);
export const canManageJobs = (role: string) =>
  ["creator", "owner", "branch_manager"].includes(role);
export const seesAllBranches = (role: string) => ["creator", "owner"].includes(role);

const createSchema = z.object({
  customerId: z.coerce.number().int().positive("Customer is required"),
  chassisNo: z.string().trim().min(3, "Chassis / VIN required").max(50),
  odometerKm: z.coerce.number().int().min(0).optional(),
  complaints: z.string().trim().min(5, "Describe the complaint").max(2000),
  mechanicId: z.string().trim().optional().or(z.literal("")),
  warrantyStatus: z.enum(["free_coupon", "in_warranty", "out_of_warranty"]),
  branchId: z.coerce.number().int().positive("Branch is required"),
});

export async function createJobCard(actor: Actor, raw: unknown) {
  if (!canUseWorkshop(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  if (!seesAllBranches(actor.role) && input.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only open job cards in your own branch." };
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Link to our inventory if this chassis was sold by us.
      const vehicle = await tx.query.vehicles.findFirst({
        where: (v, { eq }) => eq(v.chassisNo, input.chassisNo),
      });

      let couponNo: number | null = null;
      if (input.warrantyStatus === "free_coupon") {
        if (!vehicle) throw new Error("Free coupons apply only to vehicles sold by us (chassis not found).");
        const [{ n }] = await tx
          .select({ n: count() })
          .from(jobCards)
          .where(and(eq(jobCards.vehicleId, vehicle.id), eq(jobCards.warrantyStatus, "free_coupon")));
        if (n >= FREE_COUPONS_PER_VEHICLE) {
          throw new Error(`All ${FREE_COUPONS_PER_VEHICLE} free coupons for this vehicle are already availed.`);
        }
        couponNo = n + 1;
      }

      const year = new Date().getFullYear();
      const [{ n: jobCount }] = await tx.select({ n: count() }).from(jobCards);
      const jobNo = `JC-${year}-${String(jobCount + 1).padStart(4, "0")}`;

      const [job] = await tx
        .insert(jobCards)
        .values({
          jobNo,
          branchId: input.branchId,
          customerId: input.customerId,
          vehicleId: vehicle?.id ?? null,
          chassisNo: input.chassisNo,
          odometerKm: input.odometerKm ?? null,
          complaints: input.complaints,
          mechanicId: input.mechanicId || null,
          warrantyStatus: input.warrantyStatus,
          couponNo,
          createdBy: actor.userId,
        })
        .returning({ id: jobCards.id });

      return { jobId: job.id, jobNo, couponNo };
    });

    await writeAudit({
      userId: actor.userId,
      action: "job.create",
      entity: "job_card",
      entityId: result.jobId,
      branchId: input.branchId,
      details: { jobNo: result.jobNo, chassisNo: input.chassisNo, warranty: input.warrantyStatus, couponNo: result.couponNo },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to create job card." };
  }
}

const NEXT: Record<string, string[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["delivered"],
};

/**
 * Advance a job through its lifecycle. Completing sets the labor charge.
 * Delivering collects payment: total = labor + parts; free-coupon jobs get
 * labor waived (parts still charged) — posted to the ledger as 'repair'.
 */
export async function advanceJob(
  actor: Actor,
  raw: { jobId: number; to: string; laborCharge?: string },
) {
  if (!canUseWorkshop(actor.role)) return { ok: false as const, error: "Not allowed." };
  const labor = moneyZero.safeParse(raw.laborCharge ?? "");
  if (!labor.success) return { ok: false as const, error: "Invalid labor charge." };

  try {
    const result = await db.transaction(async (tx) => {
      const [job] = await tx.select().from(jobCards).where(eq(jobCards.id, raw.jobId)).for("update");
      if (!job) throw new Error("Job card not found.");
      if (!seesAllBranches(actor.role) && job.branchId !== actor.branchId) {
        throw new Error("You can only manage jobs in your own branch.");
      }
      if (!NEXT[job.status]?.includes(raw.to)) {
        throw new Error(`Cannot move a ${job.status.replace("_", " ")} job to ${raw.to.replace("_", " ")}.`);
      }
      // Cancelling/delivering is management-only; mechanics move open ↔ progress ↔ completed.
      if ((raw.to === "cancelled" || raw.to === "delivered") && !canManageJobs(actor.role)) {
        throw new Error("Only managers can deliver or cancel jobs.");
      }

      const patch: Partial<typeof jobCards.$inferInsert> = { status: raw.to as never };
      if (raw.to === "completed") {
        patch.completedAt = new Date();
        patch.laborCharge = labor.data;
      }

      let collected = 0;
      if (raw.to === "delivered") {
        patch.deliveredAt = new Date();
        const laborDue = job.warrantyStatus === "free_coupon" ? 0 : Number(job.laborCharge);
        collected = laborDue + Number(job.partsCharge);
        if (collected > 0) {
          await tx.insert(ledgerEntries).values({
            branchId: job.branchId,
            direction: "cash_in",
            category: "repair",
            amount: collected.toFixed(2),
            description: `Workshop job ${job.jobNo}${job.warrantyStatus === "free_coupon" ? " (coupon: labor waived)" : ""}`,
            entryDate: new Date().toISOString().slice(0, 10),
            createdBy: actor.userId,
          });
        }
      }

      await tx.update(jobCards).set(patch).where(eq(jobCards.id, job.id));
      return { jobNo: job.jobNo, branchId: job.branchId, collected };
    });

    await writeAudit({
      userId: actor.userId,
      action: `job.${raw.to}`,
      entity: "job_card",
      entityId: raw.jobId,
      branchId: result.branchId,
      details: { jobNo: result.jobNo, collected: result.collected },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update job." };
  }
}

export async function listJobs(opts: { role: string; ownBranchId: number | null; status?: string }) {
  const filters = [];
  if (!seesAllBranches(opts.role)) filters.push(eq(jobCards.branchId, opts.ownBranchId ?? -1));
  if (opts.status) filters.push(eq(jobCards.status, opts.status as never));

  return db
    .select({
      id: jobCards.id,
      jobNo: jobCards.jobNo,
      chassisNo: jobCards.chassisNo,
      complaints: jobCards.complaints,
      warrantyStatus: jobCards.warrantyStatus,
      couponNo: jobCards.couponNo,
      laborCharge: jobCards.laborCharge,
      partsCharge: jobCards.partsCharge,
      status: jobCards.status,
      createdAt: jobCards.createdAt,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      branchName: branches.name,
      mechanicName: user.name,
    })
    .from(jobCards)
    .innerJoin(customers, eq(jobCards.customerId, customers.id))
    .innerJoin(branches, eq(jobCards.branchId, branches.id))
    .leftJoin(user, eq(jobCards.mechanicId, user.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(jobCards.createdAt))
    .limit(100);
}

/** Mechanics available for assignment (branch-scoped for non-owners). */
export async function listMechanics(opts: { role: string; ownBranchId: number | null }) {
  const rows = await db
    .select({ userId: staffProfiles.userId, name: user.name, branchId: staffProfiles.branchId })
    .from(staffProfiles)
    .innerJoin(user, eq(staffProfiles.userId, user.id))
    .where(and(eq(staffProfiles.role, "mechanic"), eq(staffProfiles.isActive, true)));
  return seesAllBranches(opts.role) ? rows : rows.filter((m) => m.branchId === opts.ownBranchId);
}
