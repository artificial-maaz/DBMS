/**
 * Inventory permissions — consumed by queries/service/actions (server only).
 * The sidebar/UI may mirror these, but is never the enforcement point.
 */
export function canViewInventory(role: string) {
  return ["creator", "owner", "silent_partner", "branch_manager", "salesperson", "assistant", "mechanic", "gate_staff"].includes(role);
}

export function canCreateVehicle(role: string) {
  return ["creator", "owner", "branch_manager"].includes(role);
}

/** #3 (2026-07-06): same roles that can register may edit specs — blocked once sold (service.ts). */
export function canEditVehicle(role: string) {
  return canCreateVehicle(role);
}

/** Purchase price / margins: Creator + Owners ONLY. */
export function canSeePurchasePrice(role: string) {
  return ["creator", "owner", "silent_partner"].includes(role);
}

/** Creator/Owners see all branches; everyone else is locked to their own. */
export function seesAllBranches(role: string) {
  return ["creator", "owner", "silent_partner"].includes(role);
}
