/** Customer registry permissions (server-side enforcement only). */
export function canViewCustomers(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

export function canCreateCustomer(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

export function seesAllBranches(role: string) {
  return ["creator", "owner"].includes(role);
}
