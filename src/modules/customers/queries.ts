import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { branches, customers } from "@/db/schema";
import { seesAllBranches } from "./permissions";

/**
 * Branch scoping mirrors inventory: employees only ever query their branch.
 * `q` searches name / phone / CNIC — the global-search building block.
 */
export async function listCustomers(opts: {
  role: string;
  ownBranchId: number | null;
  q?: string;
  branchId?: number;
}) {
  const filters: SQL[] = [];

  if (!seesAllBranches(opts.role)) {
    if (!opts.ownBranchId) return [];
    filters.push(eq(customers.branchId, opts.ownBranchId));
  } else if (opts.branchId) {
    filters.push(eq(customers.branchId, opts.branchId));
  }

  if (opts.q) {
    const like = `%${opts.q.trim()}%`;
    const conds = [ilike(customers.fullName, like), ilike(customers.phone, like), ilike(customers.cnic, like)];
    // Digit-only matching: "3420256087749" finds the dashed CNIC, "+92 300…" finds the phone.
    const qDigits = opts.q.replace(/\D/g, "");
    if (qDigits.length >= 5) {
      const dLike = `%${qDigits}%`;
      conds.push(sql`replace(${customers.cnic}, '-', '') ilike ${dLike}`, ilike(customers.phone, dLike));
    }
    filters.push(or(...conds)!);
  }

  return db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      cnic: customers.cnic,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
      city: customers.city,
      branchId: customers.branchId,
      branchName: branches.name,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .innerJoin(branches, eq(customers.branchId, branches.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(customers.createdAt));
}
