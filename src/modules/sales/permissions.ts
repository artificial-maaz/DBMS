/** Sales permissions (server-side enforcement only). */
export function canViewSales(role: string) {
  return ["creator", "owner", "silent_partner", "branch_manager", "salesperson"].includes(role);
}

export function canCreateSale(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

/** Only management may set/see commission amounts. */
export function canManageCommission(role: string) {
  return ["creator", "owner", "branch_manager"].includes(role);
}

export function seesAllBranches(role: string) {
  return ["creator", "owner", "silent_partner"].includes(role);
}
