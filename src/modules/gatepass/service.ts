import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { branches, gatePasses, vehicles } from "@/db/schema";
import { writeAudit } from "@/lib/audit";

type Actor = { userId: string; role: string; branchId: number | null };

export const canUseGatePass = (role: string) =>
  ["creator", "owner", "branch_manager", "gate_staff"].includes(role);
export const seesAllBranches = (role: string) => ["creator", "owner"].includes(role);

const issueSchema = z.object({
  vehicleId: z.coerce.number().int().positive("Vehicle is required"),
  destBranchId: z.coerce.number().int().positive("Destination branch is required"),
  driverName: z.string().trim().min(2, "Driver name required").max(120),
  driverPhone: z.string().trim().max(20).optional().or(z.literal("")),
  transportPlate: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function issueGatePass(actor: Actor, raw: unknown) {
  if (!canUseGatePass(actor.role)) return { ok: false as const, error: "Not allowed to issue gate passes." };
  const parsed = issueSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [vehicle] = await tx.select().from(vehicles).where(eq(vehicles.id, input.vehicleId)).for("update");
      if (!vehicle) throw new Error("Vehicle not found.");
      if (vehicle.status !== "in_stock") throw new Error("Only in-stock vehicles can be transferred.");
      if (!seesAllBranches(actor.role) && vehicle.branchId !== actor.branchId) {
        throw new Error("You can only transfer vehicles from your own branch.");
      }
      if (vehicle.branchId === input.destBranchId) throw new Error("Source and destination are the same branch.");

      const year = new Date().getFullYear();
      const [{ n }] = await tx.select({ n: count() }).from(gatePasses);
      const passNo = `GP-${year}-${String(n + 1).padStart(4, "0")}`;

      const [pass] = await tx
        .insert(gatePasses)
        .values({
          passNo,
          vehicleId: vehicle.id,
          sourceBranchId: vehicle.branchId,
          destBranchId: input.destBranchId,
          driverName: input.driverName,
          driverPhone: input.driverPhone || null,
          transportPlate: input.transportPlate || null,
          notes: input.notes || null,
          issuedBy: actor.userId,
        })
        .returning({ id: gatePasses.id });

      await tx.update(vehicles).set({ status: "in_transit", updatedAt: new Date() }).where(eq(vehicles.id, vehicle.id));
      return { passId: pass.id, passNo, sourceBranchId: vehicle.branchId };
    });

    await writeAudit({
      userId: actor.userId,
      action: "gatepass.issue",
      entity: "gate_pass",
      entityId: result.passId,
      branchId: result.sourceBranchId,
      details: { passNo: result.passNo, vehicleId: input.vehicleId, destBranchId: input.destBranchId },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to issue gate pass." };
  }
}

export async function receiveGatePass(actor: Actor, passId: number) {
  if (!canUseGatePass(actor.role)) return { ok: false as const, error: "Not allowed." };
  try {
    const result = await db.transaction(async (tx) => {
      const [pass] = await tx.select().from(gatePasses).where(eq(gatePasses.id, passId)).for("update");
      if (!pass) throw new Error("Gate pass not found.");
      if (pass.status !== "in_transit") throw new Error("This gate pass is not in transit.");
      if (!seesAllBranches(actor.role) && pass.destBranchId !== actor.branchId) {
        throw new Error("Only the destination branch can receive this vehicle.");
      }

      await tx
        .update(vehicles)
        .set({ branchId: pass.destBranchId, status: "in_stock", updatedAt: new Date() })
        .where(eq(vehicles.id, pass.vehicleId));
      await tx
        .update(gatePasses)
        .set({ status: "received", receivedBy: actor.userId, receivedAt: new Date() })
        .where(eq(gatePasses.id, passId));
      return pass;
    });

    await writeAudit({
      userId: actor.userId,
      action: "gatepass.receive",
      entity: "gate_pass",
      entityId: passId,
      branchId: result.destBranchId,
      details: { passNo: result.passNo, vehicleId: result.vehicleId },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to receive." };
  }
}

export async function cancelGatePass(actor: Actor, passId: number) {
  if (!canUseGatePass(actor.role)) return { ok: false as const, error: "Not allowed." };
  try {
    const result = await db.transaction(async (tx) => {
      const [pass] = await tx.select().from(gatePasses).where(eq(gatePasses.id, passId)).for("update");
      if (!pass) throw new Error("Gate pass not found.");
      if (pass.status !== "in_transit") throw new Error("Only in-transit passes can be cancelled.");
      if (!seesAllBranches(actor.role) && pass.sourceBranchId !== actor.branchId) {
        throw new Error("Only the source branch can cancel this pass.");
      }

      await tx
        .update(vehicles)
        .set({ status: "in_stock", updatedAt: new Date() })
        .where(eq(vehicles.id, pass.vehicleId));
      await tx
        .update(gatePasses)
        .set({ status: "cancelled", cancelledBy: actor.userId, cancelledAt: new Date() })
        .where(eq(gatePasses.id, passId));
      return pass;
    });

    await writeAudit({
      userId: actor.userId,
      action: "gatepass.cancel",
      entity: "gate_pass",
      entityId: passId,
      branchId: result.sourceBranchId,
      details: { passNo: result.passNo },
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to cancel." };
  }
}

export async function listGatePasses(opts: { role: string; ownBranchId: number | null }) {
  const src = db
    .select({
      id: gatePasses.id,
      passNo: gatePasses.passNo,
      status: gatePasses.status,
      driverName: gatePasses.driverName,
      transportPlate: gatePasses.transportPlate,
      issuedAt: gatePasses.issuedAt,
      sourceBranchId: gatePasses.sourceBranchId,
      destBranchId: gatePasses.destBranchId,
      vehicleLabel: vehicles.model,
      chassisNo: vehicles.chassisNo,
      sourceName: branches.name,
    })
    .from(gatePasses)
    .innerJoin(vehicles, eq(gatePasses.vehicleId, vehicles.id))
    .innerJoin(branches, eq(gatePasses.sourceBranchId, branches.id))
    .orderBy(desc(gatePasses.issuedAt))
    .limit(100);

  const rows = await src;
  const allBranches = await db.query.branches.findMany();
  const nameOf = (id: number) => allBranches.find((b) => b.id === id)?.name ?? "?";

  const visible = seesAllBranches(opts.role)
    ? rows
    : rows.filter((r) => r.sourceBranchId === opts.ownBranchId || r.destBranchId === opts.ownBranchId);

  return visible.map((r) => ({ ...r, destName: nameOf(r.destBranchId) }));
}
