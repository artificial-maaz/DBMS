import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { branches, session, staffProfiles, user } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { moneyZero } from "@/lib/validation";

type Actor = { userId: string; role: string };

/** #18 (2026-07-05): staff management is CREATOR-ONLY. Owners view, never modify. */
export function canManageStaff(role: string) {
  return role === "creator";
}
export function canViewStaff(role: string) {
  return ["creator", "owner"].includes(role);
}

const GRANTABLE: Record<string, string[]> = {
  creator: ["owner", "branch_manager", "salesperson", "mechanic", "gate_staff"],
};

const staffSchema = z.object({
  name: z.string().trim().min(2, "Name required").max(120),
  email: z.string().trim().email("Valid email required"),
  password: z.string().min(8, "Temp password must be 8+ characters"),
  role: z.enum(["owner", "branch_manager", "salesperson", "mechanic", "gate_staff"]),
  branchId: z.coerce.number().int().optional(),
  designation: z.string().trim().max(120).optional().or(z.literal("")),
  cnic: z
    .preprocess(
      (v) => (typeof v === "string" ? v.replace(/\s/g, "") : v),
      z
        .string()
        .regex(/^(\d{5}-\d{7}-\d|\d{13})?$/, "CNIC must be 13 digits")
        .transform((v) => (v && !v.includes("-") ? `${v.slice(0, 5)}-${v.slice(5, 12)}-${v.slice(12)}` : v)),
    )
    .optional(),
  basicSalary: moneyZero,
  monthlyAllowances: moneyZero,
});

export async function listStaff() {
  return db
    .select({
      id: staffProfiles.id,
      userId: staffProfiles.userId,
      name: user.name,
      email: user.email,
      role: staffProfiles.role,
      branchName: branches.name,
      designation: staffProfiles.designation,
      isActive: staffProfiles.isActive,
      joinedAt: staffProfiles.joinedAt,
    })
    .from(staffProfiles)
    .innerJoin(user, eq(staffProfiles.userId, user.id))
    .leftJoin(branches, eq(staffProfiles.branchId, branches.id))
    .orderBy(desc(staffProfiles.joinedAt));
}

/**
 * Onboard staff: auth account + staff profile. Credentials are handed to the
 * employee, who changes the password after first login (Settings).
 * Email-delivered invites can be added once an email provider is configured.
 */
export async function createStaff(actor: Actor, raw: unknown) {
  if (!canManageStaff(actor.role)) return { ok: false as const, error: "Not allowed to onboard staff." };

  const parsed = staffSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data;

  if (!GRANTABLE[actor.role]?.includes(input.role)) {
    return { ok: false as const, error: `Your role cannot grant the '${input.role}' role.` };
  }
  const needsBranch = input.role !== "owner";
  if (needsBranch && !input.branchId) {
    return { ok: false as const, error: "Employees must be assigned to a branch." };
  }

  const authInstance = betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true }, // sign-up allowed only in this server-side path
    plugins: [organization()],
  });

  try {
    const res = await authInstance.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name },
    });

    await db.insert(staffProfiles).values({
      userId: res.user.id,
      role: input.role,
      branchId: needsBranch ? input.branchId : null,
      designation: input.designation || null,
      cnic: input.cnic || null,
      basicSalary: input.basicSalary,
      monthlyAllowances: input.monthlyAllowances,
    });

    await writeAudit({
      userId: actor.userId,
      action: "staff.create",
      entity: "staff_profile",
      entityId: res.user.id,
      branchId: needsBranch ? input.branchId : null,
      details: { email: input.email, role: input.role },
    });

    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error && /exist/i.test(e.message)
      ? "An account with this email already exists."
      : "Failed to onboard staff member.";
    return { ok: false as const, error: msg };
  }
}

/** Deactivate: profile flag + delete ALL their sessions → instant lockout. */
export async function setStaffActive(actor: Actor, profileId: number, isActive: boolean) {
  if (!canManageStaff(actor.role)) return { ok: false as const, error: "Not allowed." };

  const target = await db.query.staffProfiles.findFirst({ where: (p, { eq }) => eq(p.id, profileId) });
  if (!target) return { ok: false as const, error: "Staff member not found." };
  if (target.userId === actor.userId) return { ok: false as const, error: "You cannot deactivate yourself." };
  if (target.role === "creator") return { ok: false as const, error: "The Creator cannot be deactivated." };
  if (target.role === "owner" && actor.role !== "creator") {
    return { ok: false as const, error: "Only the Creator can deactivate an Owner." };
  }

  await db.update(staffProfiles).set({ isActive }).where(eq(staffProfiles.id, profileId));
  if (!isActive) {
    await db.delete(session).where(eq(session.userId, target.userId)); // revoke everything, instantly
  }

  await writeAudit({
    userId: actor.userId,
    action: isActive ? "staff.reactivate" : "staff.deactivate",
    entity: "staff_profile",
    entityId: profileId,
    branchId: target.branchId,
  });

  return { ok: true as const };
}
