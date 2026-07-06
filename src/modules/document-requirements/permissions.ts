/** Checklist is used at the sales floor when finalizing an installment sale. */
export function canViewRequirements(role: string) {
  return ["creator", "owner", "branch_manager", "salesperson"].includes(role);
}

/** Defining what counts as a required document is a management decision, like the rate card. */
export function canManageRequirements(role: string) {
  return ["creator", "owner"].includes(role);
}
