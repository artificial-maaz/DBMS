/** Customer registry permissions (server-side enforcement only). */
export function canViewCustomers(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

export function canCreateCustomer(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

/** #3 (2026-07-06): same roles that can create may edit — branch scoping enforced in service. */
export function canEditCustomer(role: string) {
  return canCreateCustomer(role);
}

export function seesAllBranches(role: string) {
  return ["creator", "owner"].includes(role);
}
