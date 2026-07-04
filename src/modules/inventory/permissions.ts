/**
 * Inventory permissions — consumed by queries/service/actions (server only).
 * The sidebar/UI may mirror these, but is never the enforcement point.
 */
export function canViewInventory(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson", "mechanic", "gate_staff"].includes(role);
}

export function canCreateVehicle(role: string) {
  return ["creator", "owner", "branch_manager"].includes(role);
}

/** Purchase price / margins: Creator + Owners ONLY. */
export function canSeePurchasePrice(role: string) {
  return ["creator", "owner"].includes(role);
}

/** Creator/Owners see all branches; everyone else is locked to their own. */
export function seesAllBranches(role: string) {
  return ["creator", "owner"].includes(role);
}
