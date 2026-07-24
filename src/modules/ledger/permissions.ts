/**
 * Ledger permissions. Employees below branch manager never see the register —
 * cash visibility is management-only (business rule: no revenue exposure).
 */
export function canViewLedger(role: string) {
  return ["creator", "owner", "silent_partner", "branch_manager"].includes(role);
}

export function canRecordEntry(role: string) {
  return ["creator", "owner", "branch_manager"].includes(role);
}

export function seesAllBranches(role: string) {
  return ["creator", "owner", "silent_partner"].includes(role);
}
