# HANDOVER — Continuation Brief for Any Assistant/Model

Read this + `CLAUDE.md` + `ROADMAP.md` before doing anything. Together they are
the complete context of this project. Last updated: 2026-07-06.

## Who you're working with
- Address him as **"Sir"**. Technical peer (CS degree, full-stack + AI/ML) but NEW to
  the web ecosystem (Next.js/ORMs/deployment) — explain new paradigms intuitively,
  never explain basics.
- **Workflow rules (hard-earned, do not violate):**
  1. Execute autonomously in reviewable chunks; do NOT wait for typed approvals.
  2. Brief "what & why" explanations as you build — never dump an unexplained question.
  3. If using multiple-choice question widgets, put full explanations in a VISIBLE
     message first (text written before tool calls may get summarized away — that
     burned us three times).
  4. End every chunk with: what was built, exact test steps, migration commands if
     schema changed, and the git push checkpoint command.
  5. He runs all terminal commands (npm, git) himself — hand him exact commands.

## READ FIRST (2026-08-09) — where the work stands

**Sir's entire 31-point list is built.** Sections A and B of the open queue are both empty. Chunks
41–42 closed the business rules (#13, #14, #15, #19); chunk 43 closed the presentation items (#12,
#16, #17, #20, #21). What is left is a slate/gray sweep through the modal forms and the favicon,
which is blocked on Sir supplying a transparent PNG.

**Status colour now comes off a semantic ramp** — `bg-ok-soft / text-ok`, `warn`, `danger`, `info`
(see `globals.css`). Use it for anything status-shaped instead of reaching for `bg-red-100`; both
themes are then handled by construction. The legacy bridge that maps raw pastels for dark mode still
exists and still works, but it shrinks with every screen that migrates — delete it when empty.

The build is functionally complete and in production. The **GUI phase** is in flight, and a short
**business-rules queue** sits in front of it. **`ROADMAP.md` → "🔜 OPEN QUEUE — reconciled against
code 2026-08-09"** is the live task list; start there, and work business rules before cosmetics.

That queue was re-verified item-by-item against the source on 2026-08-09 — the previous version had
been pasted verbatim from Sir's feedback and listed work that chunk 40 had already finished. If you
find yourself about to build something the roadmap calls outstanding, **grep for it first**; this
repo's docs have drifted from its code twice now.

**Design-system rules learned the hard way — do not relearn these:**
1. A CSS `transform` animation **replaces** an element's SVG `transform` attribute. Nest: outer
   `<g>` positions, inner `<g>` animates.
2. Dark mode **must not redefine brand shades 300–900**. Mixing the brand with white drains a navy;
   dark inherits the light ramp so the blue is identical by construction. Only 50/100/200 are
   dark-tinted (they are backgrounds). Chip TEXT uses `--chip-ink`, never the chart ramp.
3. `--raised` sits **above** `--surface`, not below — nested panels went black when it was inverted.
4. File-input buttons need BOTH `::file-selector-button` and `::-webkit-file-upload-button`, and
   Tailwind `file:` utilities in markup will outrank them. **Hit three times now** (2026-08-06,
   -08-09): the stylesheet was already right both times; the markup still carried
   `file:border-0 file:px-3 …`, which won and stripped the border. The rule is simply **no `file:`
   utilities anywhere** — the button is styled once in `globals.css` for both themes. If a file
   button looks wrong, grep for `file:` in `.tsx` before touching the CSS.
5. Headings vs links need to differ on **three axes** (size, weight, letter-spacing), not colour alone.
5b. **Never put a CSS grid inside a table cell.** A grid divides whatever width it is given, however
   little that is — in a `<td>` competing with four other columns, `grid-cols-3` becomes three
   few-character columns and `break-words` then breaks mid-word, rendering values as vertical stacks
   of single letters. Burned on the Audit Log Details column (2026-08-09). Use `flex-wrap` chips with
   `whitespace-nowrap` on each pair so it wraps *between* values, never through one, and give the
   column a real width (`w-[28rem]` on the `<th>`, `min-w-` on the table so the card scrolls).
6. Never put a still-selectable colour in `LEGACY_DEFAULTS` — picking it gets silently overridden.
7. Timestamps: columns are `timestamp` without zone and the server runs UTC, so every render must
   pass `timeZone: "Asia/Karachi"`. **There is no `Asia/Islamabad` in IANA and there never has been** —
   Pakistan has one timezone (PKT, UTC+5) and IANA names zones after the most populous city, so
   `Asia/Karachi` *is* Islamabad's timezone. Sir has asked to "switch to Islamabad" twice now
   (2026-08-06, 2026-08-09); the answer is that nothing is wrong and the string cannot change. If the
   word bothers him, relabel the Settings dropdown "Pakistan (PKT, UTC+5)" and keep the value.
8. Invoice numbers are derived from the **highest sequence already issued for that prefix**, never
   from a count — two branches can share a 3-letter code.

**Sir's working preferences:** address him as Sir; execute in chunks without waiting for typed
approval; explain the *why* briefly; end every chunk with what changed, exact commands, and the
push checkpoint. He runs all terminal commands himself. Commits are backdated via `scripts/push.ps1`
— one commit per file, every path listed exactly once (a repeated path silently skips).

## Project state
- **Hussain Motors ERP** — multi-branch vehicle dealership ERP for Sir's own company.
  ALL 3 phases built, tested by Sir, LIVE in production. See CLAUDE.md for module list.
- Work queue = `ROADMAP.md` (31-point review backlog; "Next up" list is ordered).
  Next item when resuming: **test drives (#17)**.

## Session handover — 2026-07-06 (Sonnet session → back to Fable)

This session picked up from a previous Fable 5 chat that hit its context limit
mid-work on the roadmap. Continuity was verified against the actual repo/DB
state (via Read tool), not assumed from the prior chat's summary. Everything
below was built, migrated, seeded, tested on localhost, committed, and pushed
to `main` — **confirmed done by Sir**, not just claimed. Production (Railway)
auto-deploys from `main`, so all of it is live.

**1. Edit flows (#3, #5, #6).** Made staff name (incl. Creator's own display
name), customer records, and vehicle specs editable (vehicle locked once
"sold"; branch reassignment intentionally stays Gate-Pass-only, not part of
this edit form). Added a backdated **Sale Date** field to New Sale (defaults
today, rejects future dates) — it now drives invoice numbering, ledger
`entryDate`, installment due dates, and the P&L period, so a backdated sale
lands in its correct historical month instead of the entry month. Branch edit
(name/city/address/phone) and staff edit (branch/designation/CNIC/salary/
allowances/joined date) added; Branch Manager badge text-wrap bug fixed.
*How:* each module got an `update*` service function gated by its existing
`permissions.ts`, a new `edit-*-form.tsx` modal, wired into that module's
`page.tsx`. `saleDate` is a `date` column on `invoices` (`CURRENT_DATE`
default); `sales/service.ts` switched invoice-year extraction, ledger
`entryDate`, and installment due-date math from `createdAt` to `input.saleDate`.

**2. Visitors & Leads (#4).** New lead-tracking module, deliberately a
separate table from `customers` (keeps buyer counts/search clean, and gives
the future WhatsApp follow-up feature (#9) a leads-only table to target).
Fields: name, phone, optional CNIC, interest, budget, source, status,
follow-up date, branch. Lives as a tab at `/customers/visitors`, not its own
sidebar item (Sir's call). One-click convert-to-customer creates the real
customer row and deep-links straight into New Sale with that customer
pre-selected. *How:* `modules/visitors/*`, a shared `CustomerTabs` component,
`sales/new/page.tsx` accepts a `customerId` search param to pre-select.

**3. Bug fix (pre-existing, found mid-session while testing a cash sale).**
`cleanMoney` in `lib/validation.ts` crashed with "expected string, received
undefined" whenever a conditionally-unmounted money `<input>` (cash-plan
downpayment, non-privileged commission field, employee-hidden purchase
price) was simply absent from `FormData` — not caused by this session's
edits, just surfaced by testing. *Fix:* `cleanMoney` now treats
`null`/`undefined` the same as `""`.

**4. Advance Bookings (#14).** Token/booking module against a customer or
visitor; posts straight to the Cash Ledger as cash-in immediately at booking
time. Cancel forfeits the token (no reversal); refund posts a proper
reversing ledger entry against the exact original row. **Sir's explicit
choice: full automatic reconciliation into New Sale**, not a manual banner —
the sale transaction posts only the *delta* between the downpayment and the
token already collected (never double-counts), the booking flips to
`converted` and links to the invoice, and if the token exceeds what's due
today the sale is rejected with a clear message rather than inventing a
refund. *How:* `modules/bookings/*`, new ledger category `booking_token`,
`sales/service.ts` locks the booking row (`FOR UPDATE`) inside the sale
transaction and computes `newCashToCollect = downpayment − bookingCredit`.

**5. Installment Plans (#16).** Company rate card (company/model/cash
price/advance + monthly & total for 3/6/9/12-month terms), Creator/Owner-
managed at `/installment-plans`, seeded with Sir's **real** current rates
(he provided 4 screenshots mid-session): United, Yadea, Ramza, Honda — 20
models, w.e.f. 2026-06-18. New Sale auto-matches the selected vehicle to its
rate card by make+model; a Plan Duration dropdown then fills advance,
months, and markup from the card — still fully editable per sale. *How:*
`modules/installment-plans/*`, `scripts/seed-installment-plans.ts` (idempotent
upsert by company+model), `sales/queries.ts` extended to return vehicle
make/model + active plans, client-side matching in `sale-form.tsx`.

**6. Guarantor Details (#21).** Sir's call: a one-to-many `guarantors` table
(some high-value bikes need two guarantors, not just one), required at sale
creation for installment sales only (at least one; blocked both client- and
server-side), never required for cash. Fields: name, CNIC, phone, address.
Not editable after creation — a guarantor change is a new agreement, not a
typo fix. *How:* `guarantors` lives in `modules/sales/schema.ts` as a child
table of `invoices` (same pattern as `invoiceItems`/`installmentSchedules`);
dynamic add/remove rows in `sale-form.tsx` are sent as one hidden JSON field
(dynamic rows don't map cleanly to plain `FormData`); `validators.ts`
JSON-parses and validates the array; `service.ts` inserts the rows inside the
sale transaction.

**7. Document Checklist (#20).** Sir **reframed this from the original
roadmap wording** ("documents handed over vs withheld, release-on-
settlement") into a manageable list of installment-sale prerequisites: CNIC
copy, utility bill, sale letter/agreement, form/token registration papers,
spare key, tool kit, warranty card. Creator/Owner manage the list (add/
rename/retire) at `/document-requirements`. **Not a hard gate** (Sir's
explicit call): New Sale shows the checklist only for installment plans,
defaults everything checked, and unchecking an item reveals an optional
compensation amount + note instead of blocking the sale — a missing document
can be waived with compensation on record rather than refusing the deal.
Compensation is a **tracked note only** for now — does not touch the invoice
total or ledger (kept deliberately simple; wire into the money math later
only if Sir asks). *How:* `modules/document-requirements/*` mirrors the
Installment Plans manageable-list pattern exactly (retire, never delete);
`scripts/seed-document-requirements.ts`; `invoiceDocuments` child table in
`sales/schema.ts` snapshots the requirement name at sale time so
renaming/retiring a requirement later never rewrites history.

**Process notes worth carrying forward:**
- Real business data (rate cards, document requirement names) should come
  from Sir, not be invented as placeholders — this is why both #16 and #20
  waited for his actual lists instead of shipping guessed defaults.
- Design forks with real trade-offs (booking reconciliation depth, guarantor
  cardinality, document-list source, compensation semantics) got a quick
  `AskUserQuestion` before building, not after — Sir answers these decisively
  and it avoids rework.
- See "Known gotchas" below for the stale-bash-sandbox rule and the
  ROADMAP.md renumbering rule — both were hard-learned this session.

## Go-live (2026-08-09)

Sir confirmed real staff and real sales are **weeks away**. `GOLIVE.md` is the checklist; read it
before running anything that writes.

- **Every write script now announces its target and guards itself** (`scripts/guard.ts`).
  `db:seed:test` is refused outright against production; `db:seed` prompts for the database name
  typed by hand; the reference-data seeds just print a banner. With `PROD_DB_HOST` / `APP_ENV`
  unset the banner says **UNIDENTIFIED** rather than assuming safety.
- **Dev and prod still share one Neon database until Sir does step 1 of GOLIVE.md.** That is the
  single largest remaining risk in the project, and it is a console task, not a code task.
- `npm run db:find-test-data` reports seeded rows. It is read-only on purpose — the seeded sale
  posted to the ledger and the P&L, so deleting its vehicle would leave the books inconsistent.
  The clean route is a fresh Neon branch.

## Stack & infrastructure facts
- Next.js 16 (App Router) + TypeScript, Drizzle ORM, PostgreSQL on **Neon**,
  Better Auth (invite-only, organization plugin), Tailwind v4, PWA (manifest + SVG icon).
- **Production: Railway** — auto-deploys every push to `main` (~3 min). Pushing = shipping.
- Prod URL: dbms-production-841d.up.railway.app (custom domain = future task).
- Dev and prod currently share the SAME Neon database (split via Neon branching is
  a roadmap item — warn Sir before staff enters real data).
- Secrets live in `.env` (local, gitignored) and Railway Variables (prod has its own
  BETTER_AUTH_SECRET). Never print secrets in chat; Sir once pasted his DB string —
  password reset available in Neon if ever needed.
- `scripts/seed.ts` (npm run db:seed) creates/repairs the Creator account AND resets
  its password to SEED_CREATOR_PASSWORD from .env — it's the recovery tool.

## Conventions (enforced everywhere — keep them)
- Module = vertical slice in `src/modules/<domain>/`: schema.ts, service.ts,
  queries.ts, permissions.ts, validators.ts. UI in `src/app/(dashboard)/<route>/`.
- RBAC is server-side ONLY: branch scoping via WHERE clauses; restricted columns
  (purchase/cost price, P&L, salaries) are never SELECTed for employees. Sidebar
  role-filtering is cosmetic.
- Money: numeric(12-14,2) strings; shared normalizers in `src/lib/validation.ts`
  (comma/Rs./space tolerant money, phone +92→0, CNIC dash normalization).
- Ledger + part movements are APPEND-ONLY (corrections = reversing entries).
- Every mutation: db.transaction with FOR UPDATE row locks where racing matters,
  then `writeAudit()` from `src/lib/audit.ts`.
- Sequential numbers: INV per-branch-year (LHR-2026-0001), GP-/JC-/PAY-/PO- global.
- Free maintenance: 3 coupons per sold vehicle (constant in workshop/service.ts);
  coupon jobs waive labor, charge parts.
- Hybrid accounting: cash ledger UI, double-entry-ready schema. P&L treats stock
  purchases as assets (COGS on sale), commissions as expense.
- App identity centralized in `src/lib/config.ts` (APP_NAME etc.) until the
  Settings module (#29) makes it DB-backed.
- Business rules: branches closed FRIDAYS; staff management is CREATOR-ONLY;
  silent-investor owners = full read access, no management interest.

## Schema-change ritual (Sir runs)
```
npm run db:generate && npm run db:migrate && npm run dev
```
Then test locally, then: git add/commit/push (auto-deploys).

## Known gotchas
- Assistant's shell sandbox mounts `C:\Claude Projects\DBMS` but the mount is
  STALE/UNRELIABLE right after Read/Write/Edit tool writes — confirmed 2026-07-06:
  running `tsc`/`git` via the bash tool against freshly-edited files showed
  truncated file contents and cascading fake syntax errors, while the same
  files read perfectly via the Read tool (host-side, ground truth). DO NOT use
  bash to verify file contents or run builds/typechecks on this repo — always
  verify with Read, and let Sir run `npm run build`/`tsc` locally for real
  verification. A failed bash `git checkout` also left a stale `.git/index.lock`
  that the sandbox couldn't delete (permission denied) — if git refuses to run
  for Sir, check for and delete `.git/index.lock` first.
- **Real bug fixed 2026-07-06:** `cleanMoney` in `lib/validation.ts` only handled
  `typeof v === "string"`, passing `undefined` straight through to `z.string()`,
  which then rejects it as "expected string, received undefined." Any
  conditionally-rendered money `<input>` (downpayment/totalMarkup — installment
  only; commission — role-gated; vehicle purchasePrice — creator/owner only)
  is simply ABSENT from FormData when unmounted, not an empty string — so cash
  sales and non-privileged submits were broken pre-existing. Fixed by having
  `cleanMoney` treat `null`/`undefined` the same as `""`. Watch for the same
  pattern (conditional `<input>` + non-optional zod field) in future modules.
- Occasional "Failed to get session" error (Better Auth's generic wrapper
  message, thrown from `auth.api.getSession` in `lib/session.ts`) on the first
  request after some idle time — confirmed 2026-07-06 to be a transient Neon
  serverless-Postgres cold-start hiccup, not a code bug. Isolated by testing:
  happened on a plain `/sales/new` load (not tied to any specific route or
  recent change), resolved on refresh/retry. If it ever persists across
  retries, get the actual terminal error text (Better Auth logs the real cause
  server-side; the browser overlay only shows the generic message).
- Repo previously lived in OneDrive: caused git index corruption + reverted writes.
  Now safe at `C:\Claude Projects\DBMS`. Inner `DBMS/` folder = gitignored Obsidian leftovers (deletable).
- better-auth: public sign-up disabled; staff created server-side via a local
  betterAuth instance in staff/service.ts; deactivation deletes session rows directly.
- Next.js 16: searchParams/params are Promises (await them); pages must not export
  extra components.
- **ROADMAP.md "Next up" numbering drifts every time an item is moved to Done**:
  when the top item is completed and moved up into a "✅ Done" section, the
  remaining numbered list must be renumbered back to 1..N in the SAME edit —
  caught this out of sequence twice (2026-07-06) because the renumber was
  forgotten/half-done. Always re-read the "Next up" block after editing it and
  confirm it starts at 1 with no gaps before moving on.
