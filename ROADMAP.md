# Hussain Motors ERP — Roadmap

Source: Sir's 31-point review (2026-07-05). Numbers reference that list.
Status legend: ✅ done · 🔜 next up · 📋 planned · 💬 answered/decision

## ✅ Done in the 31-point pass (2026-07-05)
- #1 Duplicate Workshop/Service sidebar group removed.
- #7 Renamed everywhere to **Hussain Motors ERP** via central `src/lib/config.ts` (one-line rename forever).
- #11 Dashboard placeholder baseline removed.
- #12 Dashboard KPI cards now link to their modules.
- #18 Staff management locked to **Creator only** (owners see the directory read-only; only Creator onboards/deactivates staff and owners).
- #24 CNIC field on staff onboarding (normalized like customers).
- #28 Payment method (cash / online / bank transfer / cheque) on ledger entries, shown in register.

## ✅ Done — Edit flows pass (2026-07-06)
- #3 Editable staff name (incl. Creator's own display name), customer records, vehicle specs (locked once "sold"; branch reassignment intentionally excluded — goes through Gate Pass).
- #5 Backdated sale entry: "Sale Date" field on New Sale (defaults today, no future dates). Drives invoice numbering, ledger `entryDate`, installment due dates, and the P&L period — a backdated sale now lands in its correct historical month, not the entry month.
- #6 Branch edit (name/city/address/phone), staff edit (branch/designation/CNIC/salary/allowances/joined date), Branch Manager badge text-wrap fixed (`whitespace-nowrap`).
- **Needs migration:** `saleDate` column added to `invoices` (schema-only so far — run the ritual below).

## ✅ Done — Visitors & Leads (2026-07-06)
- #4 New `visitors` module — deliberately separate table from `customers` (not a flag), so buyer counts/search/dashboards stay clean and #9's WhatsApp follow-ups have a lead-only table to target. Fields: name, phone, CNIC (optional), interest, budget, source (walk-in/event/referral/online), status (new/contacted/follow_up/converted/lost), follow-up date, branch.
- Lives under `/customers/visitors` (tab next to Customers, not its own sidebar item, per Sir's call).
- Convert-to-customer: one action creates the real customer row, freezes the visitor record, and deep-links straight into New Sale with that customer pre-selected — matches the actual field workflow (lead walks in → convert → sell).
- Follow-up list is just this page: sorted soonest-due-first, overdue ones flagged red.
- **Needs migration:** new `visitors` table (schema-only so far).

## ✅ Done — Advance Bookings (2026-07-06)
- #14 New `bookings` module — token registered against either a customer or a visitor, posts straight to the Cash Ledger as cash-in immediately, lives at `/bookings` under Retail. Cancel forfeits the token (dealership keeps it, no reversal); refund posts a proper reversing cash-out entry against the exact original ledger row (`ledgerEntryId` tracks it).
- **Full automatic reconciliation at sale time (Sir's explicit call, not the simpler manual-banner option):** New Sale detects a customer's open bookings, lets staff pick one to apply, and the sale transaction only posts the *delta* to the ledger (downpayment/total minus the token already received) — no double-counting the same cash. Booking flips to `converted` and links to the invoice. If the token exceeds what's actually due today, the sale is rejected with a clear message instead of guessing at an auto-refund.
- **Needs migration:** new `bookings` table (schema-only so far).

## ✅ Done — Installment Plans (2026-07-06)
- #16 New `installment_plans` module — company rate card (company/model/cash price/advance + monthly & total for 3/6/9/12 months), Creator/Owner-managed at `/installment-plans`, seeded with Sir's real current rates: **United** (US 70, Classy Pro, Smart Pro, Sharp Pro), **Yadea** (M3, Ruibin S, M3H, T5L, EPOCH, VELAX, KEINESS), **Ramza** (Kuling, Linbo, Yaari Plus, Liberty, Liberty Ultra Lithium, S-75 Lithium), **Honda** (CD-70, Pridor 100, CG-125) — w.e.f. 2026-06-18, 20 models total.
- Page groups by company, laid out exactly like the source rate cards (Model/Cash Price/Advance spanning Monthly + Total Price rows per duration). Retire/reactivate instead of delete — historical sales keep referring to the right numbers.
- **New Sale auto-fill:** selecting a vehicle matches it to its rate card by make+model; a "Plan Duration" dropdown (3/6/9/12) then fills advance downpayment, months, and total markup straight from the card — still fully editable per sale (matches Sir's real-world practice of custom markups per negotiation).
- **Needs migration:** new `installment_plans` table + `npm run db:seed:plans` (schema/seed-only so far).

## ✅ Done — Guarantor Details (2026-07-06)
- #21 New `guarantors` table (one-to-many off `invoices` — Sir's call: some high-value bikes need two guarantors, not just one). Required at sale creation for installment plans (at least one; blocked both client- and server-side), never required/collected for cash sales. Fields: full name, CNIC (normalized, same regex as customers/staff), phone, address. Not editable after creation — a guarantor change is a new agreement, not a typo fix.
- New Sale: dynamic add/remove guarantor rows shown only under Installment; sent as one JSON field (dynamic rows don't map to plain FormData). Invoice detail/print view lists guarantor(s) under the schedule.
- **Needs migration:** new `guarantors` table (schema-only so far).

## ✅ Done — Document Checklist (2026-07-06)
- #20 Reframed per Sir's direction: not "withheld until settlement" but a manageable list of installment-sale prerequisites (CNIC copy, utility bill, sale letter/agreement, form/token registration papers, spare key, tool kit, warranty card — seeded from Sir's confirmed list). New `document_requirements` master list, Creator/Owner-managed (add/rename/retire) at `/document-requirements`.
- **Not a hard gate (Sir's explicit call):** New Sale shows the checklist only under Installment, defaulted all-checked; unchecking an item reveals an optional compensation amount + note instead of blocking the sale — a missing document can be waived with compensation on record rather than refusing the deal. Compensation is a tracked note only, doesn't touch the invoice total/ledger.
- Per-invoice `invoice_documents` snapshot (requirement name captured at sale time, so renaming/retiring a requirement later never rewrites history). Invoice detail/print view lists each requirement's provided/waived status + compensation.
- **Needs migration + seed:** new `document_requirements` + `invoice_documents` tables, `npm run db:seed:docs`.

## ✅ Done — Test Drives (2026-07-06)
- #17 New `test_drives` module at `/test-drives` (Retail). Rider = linked customer, lead, or pure walk-in (name/phone always snapshotted). Optional link to an in-stock vehicle OR free-text model of interest. Status lifecycle: scheduled → completed / no_show / cancelled; past-due scheduled rides flagged red ("mark outcome").
- **Friday-closed rule enforced** server-side (rejects any Friday booking) and mirrored client-side (date field turns red + submit disabled).
- Note: "book test drive while adding a customer" happens via the same page (link existing customer in the booking form) — a combined create-customer+ride form was skipped to keep the customer form lean; revisit only if staff friction shows.
- **Needs migration:** new `test_drives` table (schema-only so far).

## ✅ Done — Code review of 2026-07-06 session (Fable, 2026-07-06)
Four fixes to the Sonnet-session modules after a full audit (sale transaction, bookings, visitors, validators):
1. **Concurrency bug (real):** `setBookingStatus` checked booking status OUTSIDE its transaction with no row lock — a refund racing a concurrent sale-conversion could double-credit a token (refunded AND applied). Now locks `FOR UPDATE` and re-checks inside the tx, mirroring `createSale`'s lock; specific error messages surfaced instead of a generic catch.
2. **Money integrity:** applying a booking to a sale now requires the booking's branch to equal the vehicle's branch — otherwise the token's cash-in sits in branch A's ledger while the sale's delta posts in branch B, silently skewing per-branch cash books (company total looked fine, per-branch didn't). Cross-branch case → transfer the vehicle via Gate Pass or refund the booking first.
3. **Data hygiene:** guarantor + document rows are now hard-stripped server-side for CASH sales (validators only ignored them; a crafted request could write orphan agreement data onto a cash invoice).
4. **Convert race:** `convertVisitorToCustomer` now locks the visitor row inside its transaction — double-clicking Convert can no longer create two customer rows for one lead (idempotent return preserved).
No migration needed — logic-only changes.

## ✅ Done — PO line items & order history (2026-07-06)
- #15 New `purchase_order_items` table: model × color × qty × unit cost per line. Record Purchase now uses dynamic line rows (JSON-field pattern); the PO **total is computed from the lines** (no hand-typed total to drift); description auto-generated. Legacy free-text POs still render their description.
- **Ordered-vs-received:** per-line "Receive" action accumulates qtyReceived (hard-capped at ordered, row-locked); PO header badge shows pending / partial x/y / received; "Units Awaiting Delivery" KPI card.
- **Ordering Patterns** table: per model — times ordered, units ordered vs received (short-delivery flagged amber), total spent, last ordered. The order-planning view from Sir's owner loop (#23).
- **Needs migration:** new `purchase_order_items` table.

## ✅ Done — CSV bulk import (2026-07-06)
- #19 New `/import` page (Admin, Creator/Owner). CSV format (Excel → Save As CSV; no xlsx library needed). Dependency-free parser in `lib/csv.ts` handles quotes/commas/CRLF/BOM.
- Supports **vehicles, customers, visitors** — each reuses that module's existing zod create-schema (all normalizers apply: commas in money, +92 phones, dashless CNICs). Branch column takes the branch NAME (case-insensitive). Downloadable per-type templates with an example row.
- **All-or-nothing:** every row validated first; any error → nothing saved + full per-row error list (incl. in-file and against-DB duplicate chassis/engine pre-checks) → fixing and re-uploading the same file is always safe. Max 2000 rows / 2 MB. Audit-logged as `import.<type>` with row count.
- Test drives / warranty-claims import deferred: rides come one at a time in reality; warranty claims has no module yet.
- No migration needed (no new tables).

## ✅ Done — Abrar sahb's review (2026-07-14)
- **Stock audit reworked to MANUAL (Sir's call):** no scanning/typing — the page lists the system's in-stock vehicles for a branch as a tick-list; staff walk the floor and tick what they see; unticked = Missing (red, investigate). Server recomputes from DB, never trusts the submitted list; outcome audit-logged.
- **Abrar 1 — Light/Dark mode:** toggle in topbar (🌙/☀️), choice in a cookie so the server renders the right theme with no flash. Interim implementation: global `.dark` overrides in globals.css remapping the neutral palette + badges + inputs; proper per-component `dark:` variants land in the polish pass (#31).
- **Abrar 2 — Customer 360:** `/customers/[id]` (names in the Customers table are links): profile header with totals (purchases, total business, outstanding), every purchase (vehicle, plan, total, balance, status → links to full invoice), bookings, test drives, workshop visits with coupon usage. Invoice page already carried guarantors/schedule/documents — now upgraded with **document custody**: new enum `given_to_customer | held_by_dealer | pending` on `invoice_documents` (covers the registration-service case where the dealer holds papers, and the not-yet-received case), set automatically at sale, editable post-sale by managers via a dropdown on the invoice (each change audit-logged). **Needs migration.**
- **Abrar 3 — Mobile usability:** new responsive Shell — on phones the sidebar becomes a slide-in drawer behind a ☰ button (closes on navigation, overlay tap dismisses); desktop unchanged. Content padding tightened on small screens. Combined with PWA install, staff phones are first-class. Further staff-simplicity ideas (bigger touch targets, simplified role-home) noted for the polish pass. **NO Urdu integration — Sir's explicit call (2026-07-14), English only for now.**

## ✅ Done — Maker-checker approval workflow (2026-07-14, Abrar + Sir)
- **Scope decisions (Sir):** money + stock actions require owner approval (sales, installment payments, ledger entries, bookings + cancel/refund, vehicle & part registrations, stock adjustments, gate passes, stock audits). Customers/visitors/test-drives save instantly. **Branch managers wait too** — reviewers are Owners + Creator only.
- **Design:** `pending_actions` queue stores the full action payload + submitter identity snapshot. Approve → the ORIGINAL module service executes at that moment (all locks/validations live) under the submitter's identity; failure (e.g. bike sold meanwhile) keeps the item pending with the error shown to the reviewer. Reject → note recorded, nothing executes. Both decisions audit-logged with maker + checker. Submitter deactivated → approval blocked, reject advised.
- **UI:** `/approvals` Review Queue — owners see all pending with human summaries + approve/reject + note; staff see their own submissions read-only. Sidebar "⏳ Review Queue" link with live count badge for all roles. Sale form shows an amber "sent for owner approval" screen for queued staff sales.
- **Warranty card tracking (Sir, mid-build):** `invoices.warranty_card_sent` — checkbox on New Sale ("photo sent to company"); Review Queue shows a loud red "⚠ WARRANTY CARD NOT SENT" pill on sale reviews; invoice page shows the status with a managers-only "Mark sent now" (audit-logged). BMs can't forget silently anymore.
- **Needs migration** (`pending_actions` + `warranty_card_sent`).
- Follow-up noted: workshop "Deliver & Collect" (posts cash) not yet gated — add to queue scope next pass.

## 🔜 Next up (core features, pre-polish — per #8)
4. ~~Standard labor rates (#26)~~ ✅ **Done 2026-07-10:** `labor_rates` table + `/labor-rates` page (Service group; Creator/Owner manage — pricing is policy; workshop roles view). Retire-never-delete pattern; completed jobs keep their charged price (snapshotted on the job card). Workshop integration: a "standard service…" dropdown beside the Complete button (queue + job detail) fills the labor charge from the rate card — still editable per job. **Needs migration** (new `labor_rates` table).
   *Deferred by Sir (2026-07-10): WhatsApp integration (#9) moved to the very end — revisit only if needed after everything else.*
5. ~~System Settings & Branding (#29)~~ ✅ **Done 2026-07-11:** singleton `system_settings` table (id=1), Creator-only `/system-settings` page. Company name + logo (≤200KB, stored as inline data URL — no blob storage needed) drive the sidebar; browser tab title via `generateMetadata` (config.ts = first-boot fallback); default excise fee + showroom profit pre-fill New Sale's registration-fee split. Commission rate %, warranty days, timezone stored for upcoming consumers (commission auto-suggest, warranty checks, date rendering). Theme color stored; full UI theming deferred to the polish pass (#31) — applying it properly means replacing hardcoded Tailwind palette classes across every page, a polish-phase job. **Needs migration** (new `system_settings` table).
6. ~~Notifications (#27)~~ ✅ **Done 2026-07-14 (in-app):** 🔔 bell in the topbar (Creator only) with unread badge; `/notifications` feed DERIVED from the audit log (no second event pipeline) filtered to ~25 important actions (approvals, sales, payments, ledger, stock, staff changes, payroll, settings, imports, warranty-card marks). Per-user `notification_state` watermark — visiting the page marks all seen; your own actions never notify you. Workshop "Deliver & Collect" also gated through the approval queue this pass (was the noted gap). *Email/WhatsApp delivery of the same IMPORTANT_ACTIONS list = future, needs a provider.* **Needs migration** (`notification_state`).

## 🎨 IN PROGRESS — GUI phase (2026-08-01, chunk 36)
Sir's direction: **A3** (five brand presets + custom hex behind Advanced) and **B2**
(warmer, softer, roomier) plus animation throughout.

**Foundation — done:**
- **Semantic design tokens** (`globals.css`): `surface / raised / line / ink / ink-soft /
  ink-faint / brand-50..900`. Colours now say what they MEAN, so each resolves per mode.
  This fixes the two root problems at once — the theme colour never applied, and dark mode
  was faked by intercepting light-mode classes.
- **Brand scale from one hex** via `color-mix()`; the server injects `--brand` onto `<html>`
  from System Settings, so there is no flash of the wrong colour. Dark mode uses a separate
  derivation so brand shades stay legible on deep navy.
- **B2 warmth:** base font 15px, `--radius-card: 1rem`, two-layer soft shadows, roomier padding.
- **Motion:** `rise / fade / slide-left / pop` keyframes, `.stagger` for cascading children,
  `.skeleton` shimmer, global colour transitions, page-transition on route change, and a
  `prefers-reduced-motion` guard that disables all of it for anyone who needs that.
- **Brand picker:** five presets (Indigo, Emerald, Royal Blue, Crimson, Graphite) that
  **repaint the app live** as you click, with a custom hex under Advanced.
- **UI kit** (`components/ui.tsx`): PageHeader, Card, StatCard (gradient + hover-lift),
  Badge, EmptyState, TableCard, Th — so screens stop hand-rolling markup.
- **Shell/sidebar/topbar:** token-driven, 44px thumb targets, sticky blurred topbar,
  drawer with backdrop blur, animated notification badge.
- **Dashboard:** gradient KPI tiles with staggered entrance, time-aware greeting,
  leaderboards with real empty states.
- A **legacy bridge** in `globals.css` keeps unmigrated screens correct in dark mode and
  brand-ifies old `indigo-*` accents. It shrinks as screens migrate; delete it when empty.

**Charts + motion pass (2026-08-04) — done:**
- **Root cause of the "black boxes":** the stored `themeColor` was still `#0f172a` (the pre-GUI
  default, near-black), so brand-toned cards rendered black-on-black. `#0f172a` is now treated as
  "never chosen" and falls back to indigo; the stored default changed too.
- **Softer surfaces (Sir's feedback):** borders reduced to near-invisible hairlines in both modes —
  depth now comes from layered shadows, not drawn outlines. Dark borders lift rather than stroke.
- **Charts, dependency-free** (`components/charts.tsx`): `AreaTrend` (Catmull-Rom smoothed area with
  gradient fill and a self-drawing line), `Donut` (sweeping slices), `BarList` (growing bars).
  Deliberately NOT Recharts/Chart.js — ~150KB on staff phones, and neither can read our CSS tokens,
  so they'd ignore the brand colour and dark mode. These render server-side with zero client JS.
- **BikeHero:** pure-SVG motorbike that rides in, bobs, spins its wheels over a streaming road —
  brand-coloured, no image assets.
- **Dashboard rebuilt:** hero + KPI tiles + 6-month revenue/sales trend + stock-by-branch donut +
  stock-by-make bars + leaderboards, all with staggered entrances and real empty states.

**Layout fixes (2026-08-04, Sir):**
- **Independent scrolling.** The shell used to be one page-level scroll container, so dragging the
  content dragged the nav out of view. Now `h-screen + overflow-hidden` on the shell and each column
  owns its own scrollbar. The subtle part is `min-h-0` on the flex children — without it a flex item
  refuses to shrink below its content height and the inner overflow never engages.
- **Collapsible sidebar.** « / » button in the topbar hides the nav entirely for wide tables;
  the choice is stored in a `sidebar` cookie and read server-side, so it never flashes open on load
  (same pattern as the theme).

**Full rollout (2026-08-04): all 70 dashboard screens migrated.** Every page and form now uses
the semantic tokens (`surface / raised / line / ink / ink-soft / ink-faint`) and the brand palette
(`brand-50..900`) instead of hardcoded `slate-*` and `indigo-*`. Zero `indigo-` classes remain under
`app/(dashboard)`. Consequences worth knowing:
- Changing the brand colour in Settings now genuinely repaints **every** screen, not just the chrome.
- Dark mode is real everywhere; the legacy bridge in `globals.css` is now largely redundant and can
  be deleted once the login screen and print views are migrated too.
- Primary buttons are `bg-brand-600`, table rows use `.row-hover` (a soft brand wash instead of grey),
  and cards use the shared `.card` primitive so radius/shadow change in one place.

**Still to do:** empty states on the remaining list screens, login + invoice branding pass,
simplified role-home for phones, delete the legacy bridge.

## ✅ Done — Email batching for the free tier (2026-08-01, chunk 35)
Resend's free plan is **3,000 emails/month capped at 100/day**. Instant-per-action emails would
have broken that within a week of go-live: 4 branches x ~10 approvals x 4 recipients ~= 160/day.
- **Instant emails cut to the rare-and-urgent four:** `staff.create`, `staff.deactivate`,
  `settings.update`, `booking.refund`.
- **New batched digest** (`modules/notifications/digest.ts` + `/api/cron/digest`): collects
  `approval.submit`, `sale.create`, `delivery.create`, `installment.payment`, `booking.create`,
  `gatepass.issue`, `inventory.stock_audit` since the last run and sends ONE grouped email with a
  "N items waiting in your Review Queue" banner. Derived from the audit log like the in-app bell —
  no second event pipeline. Watermark reuses `notification_state` under a reserved key, so
  **no migration is needed**. Sends nothing when there's nothing new; only advances the watermark on
  a successful send, so a failed run retries instead of losing a batch.
- **Schedule (Sir, 2026-08-01):** digest at **13:00 and 22:00 PKT**; daily report 21:00; monthly on the 1st.
- **Projected volume:** ~2 digests + 1 daily report per day, plus a handful of instants ≈ **100/month**
  against a 3,000 allowance. Free indefinitely.
- **`RESEND_ONLY_TO`** redirects all mail to one verified address while no domain is verified
  (Resend rejects the whole send if any recipient isn't the account owner) — the email carries a
  banner naming the intended recipients. Delete the variable once a domain is verified.

## ✅ Done — Production build repair + arrival tracking (2026-08-01, chunk 34)
**The production build had been failing since early July** — Railway kept serving a 26-day-old
image because every newer build died at the type check. `npm run dev` never type-checks the whole
project, which is exactly why localhost looked healthy the whole time. Root causes, all fixed:
- **Three `useTransition` misuses** (`toggle-branch`, `toggle-plan`, `toggle-requirement`): the
  callback returned a server action's `Promise<{ok,error}>`, but React demands a void return.
  Fixed by awaiting inside an async callback.
- **Two "column typed to one table" bugs**: `balanceSheet`'s `br()` helper was typed
  `typeof ledgerEntries.branchId` yet called with `vehicles`/`spareParts`/`invoices`/`purchaseOrders`
  columns; `search`'s `branchScope` had the same fault. Both now take `AnyPgColumn`.
- **Lesson recorded:** run `npm run build` (not just `npm run dev`) before every push — dev mode
  will not catch these.

Also shipped alongside:
- **Inventory arrival column:** every vehicle row now shows its arrival date, **days in stock**
  (live counter while unsold) and a link to the delivery batch it came in — this is what makes
  Sir #4's "which vehicle came when" visible from the main inventory screen, not just the batch page.
- **Consignment notifications:** `delivery.create` joined the high-priority email set, so owners
  hear about arriving stock immediately rather than at month end.
- **Test seeder extended:** seeds a real 2-unit consignment and a deliberately **overdue**
  installment case (sold 5 months ago, nothing collected) so `/deliveries` and `/installments`
  have meaningful data for test cases I6 and I7.

## ✅ Done — Cross-branch ops, Installment Cases, Deliveries (2026-07-31, chunk 33)
Sir's post-test-pass feedback (6 points).
- **#1 Cross-branch operations.** BM *and* salesperson may now act for any branch: branch is a
  free dropdown defaulting to their own on Customers, Visitors, Bookings, Test Drives, Vehicle
  registration and Deliveries; New Sale lists every branch's in-stock vehicles (other branches'
  units labelled with the branch name). Own-branch service guards removed on those create paths.
  **Invariants deliberately kept:** money always lands where the *thing* lives — invoice/ledger/P&L
  post to the VEHICLE's branch, installment collections to the INVOICE's branch, booking tokens to
  the CHOSEN branch (and a token must still be redeemed at its own branch). Lists stay branch-scoped
  for focus; test drives additionally show rides the user personally booked elsewhere so they can be
  closed out. Maker-checker + audit log unchanged, so every cross-branch act is reviewed and attributed.
- **#2 Gate pass source branch.** The issue form now shows a read-only Source Branch the moment a
  vehicle is picked, and filters that branch out of the destination list (the table already had From → To).
- **#3 Installment Cases module** (`/installments`). Receivables control tower: KPI cards
  (total/cleared/on-track/overdue), outstanding receivable + past-due totals, and one table per case —
  progress (paid/total instalments), collected, balance, next due date or days-late + overdue amount,
  status badge, filters by status and branch, worst-offenders first. Pure projection over
  invoices + schedules: **no schema change**. Creator/Owner/Silent Partner all-branch; BM own branch.
- **#4 Stock Deliveries module** (`/deliveries`). New `stock_deliveries` table + `vehicles.delivery_id`
  and `vehicles.arrived_on`. Recording a consignment (supplier or free-text company, challan no., batch
  ref, date, driver/transport) registers all its units into inventory in ONE atomic transaction —
  duplicate chassis anywhere in the batch rolls the whole thing back. Detail page shows each unit's
  full lifecycle: arrived date → sale date + invoice link → days held ("and counting" while unsold).
  Unit cost is management-only. BM+ may record at any branch; staff submissions route through the
  approval queue as `delivery.create`.
- **#5 Document compensation** — no code change; behaviour confirmed and documented: installment sales
  only, unticking a required document reveals an optional compensation amount + note, recorded on the
  invoice as a waiver record, deliberately NOT added to the invoice total or ledger.
- **#6 Email/API keys** — no code change; step-by-step Resend + cron-job.org setup written for Sir.

## ✅ Done — Role hierarchy refinement (2026-07-31): Assistant role + view-only Mechanic
Final hierarchy (Sir, 2026-07-31): **Creator** (god-level, sole code/system access) → **Owner**
(everything except system changes) → *Silent Partner* (read-only investor, outside the op chain)
→ **Branch Manager** (full branch ops; BM is usually also the branch's salesperson) → **Salesperson**
(kept for the future: create bookings/test drives/sales/customers; NO ledger/P&L/accounting) →
**Assistant** (BM's helper: VIEW-ONLY inventory + test-drive board, zero edit access) → **Mechanic**
(VIEW-ONLY spare parts, workshop queue, job details, coupons — all workshop additions/edits are BM+)
→ Gate Staff (gate passes only).
- New `assistant` enum value (migration), Creator-grantable, branch-scoped, teal badge.
- Mechanic demoted to read-only: all 4 workshop mutations (create job, advance status, add/remove parts) now BM+; mutation UI hidden from mechanics; labor rates were already view-only.
- Tightened gates: `/customers` and `/parts` got missing server-side view gates; sidebar Retail/Parts links role-scoped (cosmetic; server enforces).
- Global search fixes: Silent Partner was getting ZERO results (branch scope bug); mechanic/assistant/gate staff could surface customer+invoice hits through search despite no module access — both fixed.
- Staff-edit bug: editing a Silent Partner demanded a branch (create path exempted them, edit path forgot) — fixed.
- Booking form: branch field now says "Locked to your branch" — Sir flagged it as a suspected bug; it is the intended branch lock, now labelled.

## ✅ Done — ENDGAME chunk (2026-07-15): everything except GUI + WhatsApp
- **Deep accounting (#22):** `/accounting` — General Journal (each ledger entry projected to a balanced DR/CR pair; reversals flagged), Trial Balance with integrity banner, Balance Sheet (cash + vehicle inventory at cost + parts stock + receivables + fixed assets vs supplier payables; equity as residual; equation footer). No new bookkeeping burden — all projected from the append-only ledger. Creator/Owner/Silent Partner.
- **Fixed assets (#22):** `branch_assets` register at `/assets` (furniture/device/appliance/crockery), retire-not-delete, total feeds the Balance Sheet.
- **Silent Partner role (Sir #3):** new enum value; read-only investor — sees dashboards, P&L, Accounting, Sales, Inventory, Ledger, Assets across ALL branches incl. purchase prices; excluded from every create/edit/approve permission and from reviewing. Creator-grantable, branchless like Owner. Monthly email = limited summary only.
- **Email (#27 delivery):** Resend REST client (no SDK); silent no-op without RESEND_API_KEY. HIGH-priority events (approval.submit, staff.create/deactivate, settings.update, booking.refund) auto-email Creator+Owners via a fire-and-forget hook inside writeAudit. **Daily report** (per-branch sales/revenue/cash/stock in ONE email, Sir #2) + **Monthly report** (adds P&L) to Creator+Owners; Silent Partners get the limited monthly summary. Cron endpoints `/api/cron/daily|monthly?secret=CRON_SECRET` for cron-job.org; test-send buttons in System Settings. NOTE: until a domain is verified on Resend, mail only delivers to Sir's own address — owners join automatically once verified.
- **Sir #1 (history of entries with names):** verified already covered — the audit log records every create/edit/deactivate/retire with actor name (shown in `/audit`), and hard deletes don't exist by design.
- **Test kit:** `npm run db:seed:test` seeds realistic raw data THROUGH the real services (2 branches, 5 vehicles, 3 customers, visitor, booking, part, rate, expense, asset, cash + installment sale w/ guarantor); `TESTING.md` = 35-case test plan; `hussain-motors-test-cases.xlsx` = the same as a tick-off workbook.
- **Needs migration** (silent_partner enum value, branch_assets, prior pending tables).

## 📋 Planned (bigger builds)
- **WhatsApp integration (#9):** follow-up messages to visitors/leads via WhatsApp Business API (Meta approval + provider needed) — pairs with visitors module + notifications.
- **Accounting expansion (#22):** ✅ *Part 1 done 2026-07-11:* physical stock audit reconciliation (`/inventory/audit`, Creator/Owner/BM, branch-scoped — paste/scan VINs → Perfect Matches / Missing (investigate!) / Scanned-but-Unregistered; read-only, outcome audit-logged) + dashboard **Top Salespeople / Top Branches** monthly leaderboards (financial roles, server-rendered, keyed off saleDate). *Remaining:* orders & quotation pipeline (draft → confirmed → billed, finalize-immediately shortcut), balance sheet + trial balance + general journal entries (formal double-entry layer), branch fixed-assets register (furniture, devices).
- **Empty-state illustrations (#25)** and **GUI liveliness pass (#31):** part of the frontend polish phase after core completeness (#8, #13).

## 💬 Answered (no build needed)
- #2 Parts on job cards exists: open the job (click job #) → Parts Used → pick from branch stock.
- #10 Backups: Neon keeps continuous point-in-time restore; scheduled SQL exports can be added.
- #30 Live amortization preview exists in New Sale (right panel).

## Business context (#23)
- Overall manager: Owner **Abrar Hussain**. One owner manages WhatsApp AI-chatbot customer dealings. Branch managers run showrooms (often doubling as sales managers; assistants in some branches; some branches have dedicated mechanics, elsewhere manager doubles as technician).
- Customer loop: (maybe pre-recorded as visitor/interested) → buys vehicle → assigned branch → free coupons → workshop loop.
- Owner loop: plan demand (bookings + market) → arrange funds → order from supplier (PO) → receive stock → inventory update → gate-pass transfers → branch sales.
- Silent-investor owners: read-only interest — money movement, P&L, sales, inventory across branches (full feature access, no management).
