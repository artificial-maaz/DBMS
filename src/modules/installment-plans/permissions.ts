/** Rate card is quoted to customers at the sales floor — same viewers as sales. */
export function canViewPlans(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

/** Setting the company-approved price list is a management decision, like purchase price. */
export function canManagePlans(role: string) {
  return ["creator", "owner"].includes(role);
}
