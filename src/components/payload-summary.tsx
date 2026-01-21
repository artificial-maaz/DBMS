/**
 * Human-readable renderer for a stored payload blob.
 *
 * Built for the Review Queue (Sir, 2026-08-06) and extracted here (#21,
 * 2026-08-09) because the Audit Log had exactly the same problem and was still
 * dumping raw JSON at Sir. One renderer, so the two screens cannot drift into
 * two different ideas of "readable".
 *
 * Two shapes are handled deliberately differently:
 *  - **scalars** go in a compact key/value grid, values wrapping rather than
 *    escaping their cell;
 *  - **arrays** (a delivery's vehicle list, a sale's guarantors) get a numbered
 *    block, because a wall of braces is not something a manager should have to
 *    parse to approve a purchase.
 *
 * Payloads arrive from FormData, so nested arrays are still JSON *strings* —
 * hence `looksLikeJsonArray` / `parseRows` rather than a plain typeof check.
 */

/** Noisy or already-displayed keys, hidden from the summary. */
const DEFAULT_HIDDEN = new Set(["guarantors", "documents", "handovers", "items", "notes"]);

export function PayloadSummary({
  payload,
  hiddenKeys = DEFAULT_HIDDEN,
  /** Audit rows are denser than review cards — allows a tighter grid. */
  compact = false,
}: {
  payload: unknown;
  hiddenKeys?: Set<string>;
  compact?: boolean;
}) {
  if (!payload || typeof payload !== "object") return null;
  const all = Object.entries(payload as Record<string, unknown>).filter(
    ([k, v]) => !hiddenKeys.has(k) && v !== "" && v !== null && v !== undefined,
  );

  const scalars = all.filter(([, v]) => typeof v !== "object" && !looksLikeJsonArray(v));
  const lists = all.filter(([, v]) => typeof v === "object" || looksLikeJsonArray(v));

  if (scalars.length === 0 && lists.length === 0) return null;

  return (
    <div className={compact ? "space-y-2" : "mt-3 space-y-3"}>
      {scalars.length > 0 && (
        <dl
          className={
            compact
              ? "grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3"
              : "grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-4"
          }
        >
          {scalars.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-ink-faint">{prettyKey(k)}</dt>
              <dd className="break-words font-medium text-ink">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {lists.map(([k, v]) => {
        const rows = parseRows(v);
        if (rows.length === 0) return null;
        return (
          <div key={k} className="rounded-lg border border-line bg-raised p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {prettyKey(k)} <span className="font-normal">({rows.length})</span>
            </p>
            <ul className="space-y-1 text-xs">
              {rows.slice(0, 12).map((row, i) => (
                <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="font-medium text-ink">{i + 1}.</span>
                  {Object.entries(row)
                    .filter(([, val]) => val !== "" && val !== null && val !== undefined)
                    .map(([rk, val]) => (
                      <span key={rk} className="text-ink-soft">
                        <span className="text-ink-faint">{prettyKey(rk)}:</span>{" "}
                        <span className="font-medium text-ink">{String(val)}</span>
                      </span>
                    ))}
                </li>
              ))}
              {rows.length > 12 && <li className="text-ink-faint">…and {rows.length - 12} more</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const prettyKey = (k: string) => k.replace(/([A-Z])/g, " $1").toLowerCase();

const looksLikeJsonArray = (v: unknown) => typeof v === "string" && v.trim().startsWith("[");

function parseRows(v: unknown): Record<string, unknown>[] {
  try {
    const parsed = typeof v === "string" ? JSON.parse(v) : v;
    if (Array.isArray(parsed)) return parsed.filter((r) => r && typeof r === "object");
    if (parsed && typeof parsed === "object") return [parsed as Record<string, unknown>];
  } catch {
    /* not JSON — fall through */
  }
  return [];
}
