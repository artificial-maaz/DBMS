import { APP_NAME } from "@/lib/config";

/**
 * The letterhead for every document that leaves the building.
 *
 * Written 2026-08-15 after Sir pointed out the branding stopped at the sale
 * invoice. The P&L and the accounting statements — the documents an owner hands
 * to an accountant — still printed as bare tables with no indication of who
 * produced them. A financial statement with no letterhead is not a document,
 * it is a screenshot.
 *
 * One component so a rebrand reaches every printed page at once, and so the
 * invoice, the P&L and the trial balance cannot end up looking like three
 * different companies.
 *
 * Company name and logo come from System Settings; `APP_NAME` is only the
 * first-boot fallback before anyone has saved settings.
 */
export function PrintHeader({
  companyName,
  logoDataUrl,
  documentTitle,
  subtitle,
  meta,
}: {
  companyName?: string | null;
  logoDataUrl?: string | null;
  /** What this piece of paper IS — "Monthly Profit & Loss", "Trial Balance". */
  documentTitle: string;
  /** Branch, address, phone — whatever identifies the issuing office. */
  subtitle?: string;
  /** Right-hand block: period, document number, date. */
  meta?: React.ReactNode;
}) {
  const name = companyName || APP_NAME;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
      <div className="flex items-start gap-3">
        {logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDataUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" />
        )}
        <div>
          <h1 className="text-2xl font-bold leading-tight">{name}</h1>
          {subtitle && <p className="text-sm font-medium text-ink-soft">{subtitle}</p>}
          <p className="mt-1 text-sm text-ink-faint">{documentTitle}</p>
        </div>
      </div>
      {meta && <div className="text-right text-sm">{meta}</div>}
    </div>
  );
}
