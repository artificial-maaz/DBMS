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

## 🔜 Next up (core features, pre-polish — per #8)
1. **Documents checklist (#20):** per-invoice record of documents handed over vs withheld (cash = all originals; installments = withheld list), with release-on-settlement tracking.
2. **Test drives (#17):** log + booking (date/time) at customer creation or standalone; Friday-closed validation for all branches.
3. **Order history depth (#15):** structured PO line items (model × qty × color), ordered-vs-received reconciliation, order pattern history view.
4. **CSV/Excel bulk import (#19):** inventory, customers/visitors, test drives, warranty claims.
5. **Standard labor rates (#26):** predefined service/repair price list module; job cards pick from it.
6. **System Settings & Branding (#29, #3-partial):** creator-only settings page — company name, theme color, logo upload, commission rate default, default excise fee, warranty duration, browser tab title, timezone. Replaces `config.ts` constants with DB-backed settings.
7. **Notifications (#27):** audit-event-driven alerts to Creator (new logins, stock added, deactivations, suspicious actions) via email first (needs provider), WhatsApp later (see #9).

## 📋 Planned (bigger builds)
- **WhatsApp integration (#9):** follow-up messages to visitors/leads via WhatsApp Business API (Meta approval + provider needed) — pairs with visitors module + notifications.
- **Accounting expansion (#22):** the hybrid ledger is double-entry-ready by design. Candidates from ebikeerp review, in adoption order: physical stock audit reconciliation (scan VINs vs system), top-performer branches/salesmen widgets, orders & quotation pipeline (draft → confirmed → billed, finalize-immediately shortcut), balance sheet + trial balance + general journal entries (formal double-entry layer), branch fixed-assets register (furniture, devices).
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
