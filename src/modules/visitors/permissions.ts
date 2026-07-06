/** Visitors & leads permissions — mirrors customers (server-side enforcement only). */
export function canViewVisitors(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

export function canCreateVisitor(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

export function canEditVisitor(role: string) {
  return canCreateVisitor(role);
}

/** Converting a lead into a real customer record — same gate as registering a customer directly. */
export function canConvertVisitor(role: string) {
  return canCreateVisitor(role);
}

export function seesAllBranches(role: string) {
  return ["creator", "owner"].includes(role);
}
