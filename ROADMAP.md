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

## 🔜 Next up (core features, pre-polish — per #8)
4. ~~Standard labor rates (#26)~~ ✅ **Done 2026-07-10:** `labor_rates` table + `/labor-rates` page (Service group; Creator/Owner manage — pricing is policy; workshop roles view). Retire-never-delete pattern; completed jobs keep their charged price (snapshotted on the job card). Workshop integration: a "standard service…" dropdown beside the Complete button (queue + job detail) fills the labor charge from the rate card — still editable per job. **Needs migration** (new `labor_rates` table).
   *Deferred by Sir (2026-07-10): WhatsApp integration (#9) moved to the very end — revisit only if needed after everything else.*
5. ~~System Settings & Branding (#29)~~ ✅ **Done 2026-07-11:** singleton `system_settings` table (id=1), Creator-only `/system-settings` page. Company name + logo (≤200KB, stored as inline data URL — no blob storage needed) drive the sidebar; browser tab title via `generateMetadata` (config.ts = first-boot fallback); default excise fee + showroom profit pre-fill New Sale's registration-fee split. Commission rate %, warranty days, timezone stored for upcoming consumers (commission auto-suggest, warranty checks, date rendering). Theme color stored; full UI theming deferred to the polish pass (#31) — applying it properly means replacing hardcoded Tailwind palette classes across every page, a polish-phase job. **Needs migration** (new `system_settings` table).
6. **Notifications (#27):** audit-event-driven alerts to Creator (new logins, stock added, deactivations, suspicious actions) via email first (needs provider), WhatsApp later (see #9).

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
