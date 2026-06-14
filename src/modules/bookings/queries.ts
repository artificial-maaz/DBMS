import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookings, branches, customers, visitors } from "@/db/schema";
import { seesAllBranches } from "./permissions";

/**
 * Lean list for the New Sale form: open, customer-linked bookings only
 * (visitor-only bookings aren't reconcilable at sale time — a sale always
 * needs a real customerId, so the link has to already be a customer).
 */
export async function listOpenBookingsForSale(opts: { role: string; ownBranchId: number | null }) {
  // Cross-branch ops (Sir 2026-07-31): all open bookings are selectable in New Sale —
  // the service still enforces booking.branchId === vehicle.branchId at commit time.
  const filters: SQL[] = [eq(bookings.status, "open")];

  const rows = await db
    .select({
      id: bookings.id,
      customerId: bookings.customerId,
      modelWanted: bookings.modelWanted,
      tokenAmount: bookings.tokenAmount,
    })
    .from(bookings)
    .where(and(...filters));

  return rows.filter((r): r is typeof r & { customerId: number } => r.customerId != null);
}

export async function listBookings(opts: { role: string; ownBranchId: number | null; branchId?: number }) {
  const filters: SQL[] = [];
  if (!seesAllBranches(opts.role)) {
    if (!opts.ownBranchId) return [];
    filters.push(eq(bookings.branchId, opts.ownBranchId));
  } else if (opts.branchId) {
    filters.push(eq(bookings.branchId, opts.branchId));
  }

  return db
    .select({
      id: bookings.id,
      modelWanted: bookings.modelWanted,
      tokenAmount: bookings.tokenAmount,
      paymentMethod: bookings.paymentMethod,
      status: bookings.status,
      notes: bookings.notes,
      branchId: bookings.branchId,
      branchName: branches.name,
      customerId: bookings.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      visitorId: bookings.visitorId,
      visitorName: visitors.fullName,
      visitorPhone: visitors.phone,
      convertedInvoiceId: bookings.convertedInvoiceId,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(branches, eq(bookings.branchId, branches.id))
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(visitors, eq(bookings.visitorId, visitors.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(bookings.createdAt));
}
