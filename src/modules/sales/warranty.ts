/**
 * #14 (Sir, 2026-08-06): the warranty card is a YADEA requirement, not a
 * company-wide one. It was being demanded on every sale, so a Honda CD-70 sale
 * carried a red "WARRANTY CARD NOT SENT" warning into the Review Queue that no
 * one could ever clear — noise that trains owners to ignore the warning that
 * actually matters.
 *
 * The rule lives here alone so the three surfaces that show it (New Sale,
 * Review Queue, invoice detail) can never drift apart. Adding a second brand
 * later is a one-line change to this list, nothing else.
 *
 * Matching is case- and whitespace-insensitive: makes are free text typed by
 * staff at vehicle registration ("Yadea", "YADEA", "yadea ") and by CSV import.
 */
const WARRANTY_CARD_MAKES = ["yadea"];

export function needsWarrantyCard(make: string | null | undefined): boolean {
  if (!make) return false;
  return WARRANTY_CARD_MAKES.includes(make.trim().toLowerCase());
}
