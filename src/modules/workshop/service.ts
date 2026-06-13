import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  branches,
  customers,
  jobCardParts,
  jobCards,
  ledgerEntries,
  partMovements,
  spareParts,
  staffProfiles,
  user,
} from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { moneyZero } from "@/lib/validation";

type Actor = { userId: string; role: string; branchId: number | null };

export const FREE_COUPONS_PER_VEHICLE = 3;

/** VIEW gate — Sir (2026-07-31): mechanics see the queue, coupons, and job details, read-only. */
export const canUseWorkshop = (role: string) =>
  ["creator", "owner", "branch_manager", "mechanic"].includes(role);
/** WRITE gate — all job creation/edits/status moves are BM-and-above; mechanics never mutate. */
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
  if (!canManageJobs(actor.role)) return { ok: false as const, error: "Not allowed." };
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
  if (!canManageJobs(actor.role)) return { ok: false as const, error: "Not allowed." };
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

/**
 * Consume a spare part on a job: stock deducted (movement: workshop),
 * line added at retail price, job.partsCharge accumulated — all atomic.
 * Only while the job is open/in progress.
 */
export async function addPartToJob(actor: Actor, raw: { jobId: number; partId: number; qty: number }) {
  if (!canManageJobs(actor.role)) return { ok: false as const, error: "Not allowed." };
  if (!raw.qty || raw.qty < 1) return { ok: false as const, error: "Quantity must be at least 1." };

  try {
    const result = await db.transaction(async (tx) => {
      const [job] = await tx.select().from(jobCards).where(eq(jobCards.id, raw.jobId)).for("update");
      if (!job) throw new Error("Job card not found.");
      if (!seesAllBranches(actor.role) && job.branchId !== actor.branchId) {
        throw new Error("You can only manage jobs in your own branch.");
      }
      if (job.status !== "open" && job.status !== "in_progress") {
        throw new Error("Parts can only be added while the job is open or in progress.");
      }

      const [part] = await tx.select().from(spareParts).where(eq(spareParts.id, raw.partId)).for("update");
      if (!part) throw new Error("Part not found.");
      if (part.branchId !== job.branchId) throw new Error("This part belongs to a different branch.");
      if (part.currentQty < raw.qty) throw new Error(`Only ${part.currentQty} in stock.`);
      if (!part.retailPrice) throw new Error("This part has no retail price set — set it in Spare Parts first.");

      const amount = (Number(part.retailPrice) * raw.qty).toFixed(2);

      await tx.insert(jobCardParts).values({
        jobCardId: job.id,
        partId: part.id,
        qty: raw.qty,
        unitPrice: part.retailPrice,
        amount,
      });
      await tx.update(spareParts).set({ currentQty: part.currentQty - raw.qty }).where(eq(spareParts.id, part.id));
      await tx.insert(partMovements).values({
        partId: part.id,
        delta: -raw.qty,
        reason: "workshop",
        note: `Job ${job.jobNo}`,
        createdBy: actor.userId,
      });
      await tx
        .update(jobCards)
        .set({ partsCharge: sql`${jobCards.partsCharge} + ${amount}` })
        .where(eq(jobCards.id, job.id));

      return { jobNo: job.jobNo, branchId: job.branchId, partName: part.name, amount };
    });

    await writeAudit({
      userId: actor.userId,
      action: "job.part_add",
      entity: "job_card",
      entityId: raw.jobId,
      branchId: result.branchId,
      details: { jobNo: result.jobNo, part: result.partName, qty: raw.qty, amount: result.amount },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to add part." };
  }
}

/** Remove a part line (before delivery): stock restored, charge reduced. */
export async function removePartFromJob(actor: Actor, lineId: number) {
  if (!canManageJobs(actor.role)) return { ok: false as const, error: "Not allowed." };
  try {
    const result = await db.transaction(async (tx) => {
      const [line] = await tx.select().from(jobCardParts).where(eq(jobCardParts.id, lineId)).for("update");
      if (!line) throw new Error("Line not found.");
      const [job] = await tx.select().from(jobCards).where(eq(jobCards.id, line.jobCardId)).for("update");
      if (!job) throw new Error("Job not found.");
      if (!seesAllBranches(actor.role) && job.branchId !== actor.branchId) throw new Error("Wrong branch.");
      if (job.status === "delivered" || job.status === "cancelled") {
        throw new Error("Cannot modify a closed job.");
      }

      await tx.delete(jobCardParts).where(eq(jobCardParts.id, lineId));
      await tx
        .update(spareParts)
        .set({ currentQty: sql`${spareParts.currentQty} + ${line.qty}` })
        .where(eq(spareParts.id, line.partId));
      await tx.insert(partMovements).values({
        partId: line.partId,
        delta: line.qty,
        reason: "adjustment",
        note: `Removed from job ${job.jobNo}`,
        createdBy: actor.userId,
      });
      await tx
        .update(jobCards)
        .set({ partsCharge: sql`${jobCards.partsCharge} - ${line.amount}` })
        .where(eq(jobCards.id, job.id));

      return { jobNo: job.jobNo, branchId: job.branchId };
    });

    await writeAudit({
      userId: actor.userId,
      action: "job.part_remove",
      entity: "job_card",
      entityId: lineId,
      branchId: result.branchId,
      details: { jobNo: result.jobNo },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to remove part." };
  }
}

export async function getJobDetail(opts: { id: number; role: string; ownBranchId: number | null }) {
  const job = await db.query.jobCards.findFirst({ where: (j, { eq }) => eq(j.id, opts.id) });
  if (!job) return null;
  if (!seesAllBranches(opts.role) && job.branchId !== opts.ownBranchId) return null;

  const [customer, branch, mechanic, lines] = await Promise.all([
    db.query.customers.findFirst({ where: (c, { eq }) => eq(c.id, job.customerId) }),
    db.query.branches.findFirst({ where: (b, { eq }) => eq(b.id, job.branchId) }),
    job.mechanicId ? db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, job.mechanicId!) }) : null,
    db
      .select({
        id: jobCardParts.id,
        qty: jobCardParts.qty,
        unitPrice: jobCardParts.unitPrice,
        amount: jobCardParts.amount,
        partName: spareParts.name,
      })
      .from(jobCardParts)
      .innerJoin(spareParts, eq(jobCardParts.partId, spareParts.id))
      .where(eq(jobCardParts.jobCardId, job.id)),
  ]);

  return { job, customer, branch, mechanic, lines };
}

/** In-stock parts of the job's branch, for the add-part dropdown. */
export async function listBranchParts(branchId: number) {
  return db
    .select({ id: spareParts.id, name: spareParts.name, currentQty: spareParts.currentQty, retailPrice: spareParts.retailPrice })
    .from(spareParts)
    .where(and(eq(spareParts.branchId, branchId), eq(spareParts.isActive, true)))
    .orderBy(spareParts.name);
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
