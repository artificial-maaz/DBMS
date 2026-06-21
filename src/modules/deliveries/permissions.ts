/**
 * Stock Deliveries permissions (Sir #4, 2026-07-31) — server-side only.
 *
 * Approved 2026-07-31: BM and above may record deliveries at ANY branch,
 * because collecting another branch's consignment is normal practice here.
 * Staff submissions still route through the maker-checker queue.
 */
export function canRecordDelivery(role: string) {
  return ["creator", "owner", "branch_manager"].includes(role);
}

export function canViewDeliveries(role: string) {
  return ["creator", "owner", "silent_partner", "branch_manager"].includes(role);
}

export function seesAllBranches(role: string) {
  return ["creator", "owner", "silent_partner"].includes(role);
}

/** Unit cost is purchase-price-class data: management only. */
export function canSeeUnitCost(role: string) {
  return ["creator", "owner", "silent_partner"].includes(role);
}
