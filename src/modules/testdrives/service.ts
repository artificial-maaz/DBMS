import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { branches, testDrives, user, vehicles } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { phoneNumber } from "@/lib/validation";

type Actor = { userId: string; role: string; branchId: number | null };

export const canUseTestDrives = (role: string) =>
  ["creator", "owner", "branch_manager", "salesperson"].includes(role);
export const seesAllBranches = (role: string) => ["creator", "owner"].includes(role);

/** Fridays are closed across all branches (#17). */
export function isFriday(dateTime: string | Date) {
  return new Date(dateTime).getDay() === 5;
}

const createSchema = z.object({
  personName: z.string().trim().min(2, "Name required").max(120),
  phone: phoneNumber,
  customerId: z.coerce.number().int().positive().optional(),
  visitorId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  vehicleText: z.string().trim().max(120).optional().or(z.literal("")),
  branchId: z.coerce.number().int().positive("Branch is required"),
  scheduledAt: z.string().min(10, "Date & time required"), // datetime-local value
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createTestDrive(actor: Actor, raw: unknown) {
  if (!canUseTestDrives(actor.role)) return { ok: false as const, error: "Not allowed." };
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  const when = new Date(input.scheduledAt);
  if (isNaN(when.getTime())) return { ok: false as const, error: "Invalid date/time." };
  if (isFriday(when)) {
    return { ok: false as const, error: "Branches are closed on Fridays — pick another day." };
  }
  if (!seesAllBranches(actor.role) && input.branchId !== actor.branchId) {
    return { ok: false as const, error: "You can only book test drives at your own branch." };
  }

  try {
    const [row] = await db
      .insert(testDrives)
      .values({
        personName: input.personName,
        phone: input.phone,
        customerId: input.customerId ?? null,
        visitorId: input.visitorId ?? null,
        vehicleId: input.vehicleId ?? null,
        vehicleText: input.vehicleText || null,
        branchId: input.branchId,
        scheduledAt: when,
        notes: input.notes || null,
        createdBy: actor.userId,
      })
      .returning({ id: testDrives.id });

    await writeAudit({
      userId: actor.userId,
      action: "testdrive.create",
      entity: "test_drive",
      entityId: row.id,
      branchId: input.branchId,
      details: { personName: input.personName, scheduledAt: input.scheduledAt },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to book test drive." };
  }
}

const NEXT: Record<string, string[]> = {
  scheduled: ["completed", "no_show", "cancelled"],
};

export async function setTestDriveStatus(actor: Actor, id: number, to: string) {
  if (!canUseTestDrives(actor.role)) return { ok: false as const, error: "Not allowed." };
  try {
    const ride = await db.query.testDrives.findFirst({ where: (t, { eq }) => eq(t.id, id) });
    if (!ride) return { ok: false as const, error: "Test drive not found." };
    if (!seesAllBranches(actor.role) && ride.branchId !== actor.branchId) {
      return { ok: false as const, error: "Wrong branch." };
    }
    if (!NEXT[ride.status]?.includes(to)) {
      return { ok: false as const, error: `A ${ride.status.replace("_", " ")} ride cannot become ${to.replace("_", " ")}.` };
    }

    await db.update(testDrives).set({ status: to as never }).where(eq(testDrives.id, id));
    await writeAudit({
      userId: actor.userId,
      action: `testdrive.${to}`,
      entity: "test_drive",
      entityId: id,
      branchId: ride.branchId,
      details: { personName: ride.personName },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to update." };
  }
}

export async function listTestDrives(opts: { role: string; ownBranchId: number | null; status?: string }) {
  const filters = [];
  if (!seesAllBranches(opts.role)) filters.push(eq(testDrives.branchId, opts.ownBranchId ?? -1));
  if (opts.status) filters.push(eq(testDrives.status, opts.status as never));

  return db
    .select({
      id: testDrives.id,
      personName: testDrives.personName,
      phone: testDrives.phone,
      customerId: testDrives.customerId,
      visitorId: testDrives.visitorId,
      vehicleText: testDrives.vehicleText,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      branchName: branches.name,
      scheduledAt: testDrives.scheduledAt,
      status: testDrives.status,
      notes: testDrives.notes,
      bookedBy: user.name,
    })
    .from(testDrives)
    .leftJoin(vehicles, eq(testDrives.vehicleId, vehicles.id))
    .innerJoin(branches, eq(testDrives.branchId, branches.id))
    .leftJoin(user, eq(testDrives.createdBy, user.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(testDrives.scheduledAt))
    .limit(100);
}
