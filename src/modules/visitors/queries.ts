import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { branches, visitors } from "@/db/schema";
import { seesAllBranches } from "./permissions";

/**
 * Branch scoping mirrors customers/inventory. `q` searches name/phone/interest.
 * Sort: open leads with a follow-up date first (soonest due first), then
 * everything else by recency — so the follow-up list is just this page,
 * unsorted extra view needed.
 */
export async function listVisitors(opts: {
  role: string;
  ownBranchId: number | null;
  q?: string;
  branchId?: number;
}) {
  const filters: SQL[] = [];

  if (!seesAllBranches(opts.role)) {
    if (!opts.ownBranchId) return [];
    filters.push(eq(visitors.branchId, opts.ownBranchId));
  } else if (opts.branchId) {
    filters.push(eq(visitors.branchId, opts.branchId));
  }

  if (opts.q) {
    const like = `%${opts.q.trim()}%`;
    filters.push(or(ilike(visitors.fullName, like), ilike(visitors.phone, like), ilike(visitors.interest, like))!);
  }

  return db
    .select({
      id: visitors.id,
      fullName: visitors.fullName,
      phone: visitors.phone,
      cnic: visitors.cnic,
      interest: visitors.interest,
      budget: visitors.budget,
      source: visitors.source,
      status: visitors.status,
      notes: visitors.notes,
      followUpDate: visitors.followUpDate,
      branchId: visitors.branchId,
      branchName: branches.name,
      convertedCustomerId: visitors.convertedCustomerId,
      createdAt: visitors.createdAt,
    })
    .from(visitors)
    .innerJoin(branches, eq(visitors.branchId, branches.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(
      sql`case when ${visitors.followUpDate} is null then 1 else 0 end`,
      asc(visitors.followUpDate),
      desc(visitors.createdAt),
    );
}
