/** The handover list is worked through on the sales floor at delivery time. */
export function canViewHandoverItems(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

/** Defining what must go out with a bike is a management decision, like the rate card. */
export function canManageHandoverItems(role: string) {
  return ["creator", "owner"].includes(role);
}
