/**
 * Procurement is Creator/Owner only, and always has been.
 *
 * Worth stating plainly because #19 originally assumed staff submissions would
 * route through the maker-checker queue: they cannot, because no staff role can
 * create a supplier or a purchase in the first place. Everyone who can touch
 * this module is already an approver, so there is nothing to review.
 *
 * Extracted from service.ts (2026-08-09) to match the module convention every
 * other domain follows — schema / service / queries / permissions / validators.
 */
export function canProcure(role: string) {
  return ["creator", "owner"].includes(role);
}
