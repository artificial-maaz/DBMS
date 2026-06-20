/**
 * Installment Cases permissions (Sir #3, 2026-07-31) — server-side only.
 *
 * Receivables are management-level information: a branch manager chases their
 * own branch's cases, Creator/Owner/Silent Partner see every branch.
 * Salespersons, assistants and mechanics have no access at all.
 */
export function canViewInstallmentCases(role: string) {
  return ["creator", "owner", "silent_partner", "branch_manager"].includes(role);
}

export function seesAllBranches(role: string) {
  return ["creator", "owner", "silent_partner"].includes(role);
}
