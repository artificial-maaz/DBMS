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

## 🔜 Next up (core features, pre-polish — per #8)
1. **Edit flows (#3, #5, #6):** edit forms for customers, branches, staff profiles (incl. names, joined date), vehicle details; backdated entry support for sales (sale date field) — ledger already supports backdating via its date field.
2. **Visitors & leads module (#4, #9-groundwork):** walk-in/event visitor capture (name, phone, interest, budget, follow-up date), separate from customers; convert-to-customer action; follow-up due list.
3. **Advance bookings (#14):** token money register (amount, model wanted, customer/visitor link) → cash-in ledger post; bookings board feeding stock-order decisions; conversion to sale applies token as part of downpayment.
4. **Installment plans module (#16):** dedicated view of all plans; editable schedules (adjust downpayment/monthly amounts pre-agreement, re-amortize); custom per-bike markup already supported at sale time.
5. **Guarantor details for installments (#21):** guarantor names, CNICs, addresses, contacts on installment sales; required at sale creation.
6. **Documents checklist (#20):** per-invoice record of documents handed over vs withheld (cash = all originals; installments = withheld list), with release-on-settlement tracking.
7. **Test drives (#17):** log + booking (date/time) at customer creation or standalone; Friday-closed validation for all branches.
8. **Order history depth (#15):** structured PO line items (model × qty × color), ordered-vs-received reconciliation, order pattern history view.
9. **CSV/Excel bulk import (#19):** inventory, customers/visitors, test drives, warranty claims.
10. **Standard labor rates (#26):** predefined service/repair price list module; job cards pick from it.
11. **System Settings & Branding (#29, #3-partial):** creator-only settings page — company name, theme color, logo upload, commission rate default, default excise fee, warranty duration, browser tab title, timezone. Replaces `config.ts` constants with DB-backed settings.
12. **Notifications (#27):** audit-event-driven alerts to Creator (new logins, stock added, deactivations, suspicious actions) via email first (needs provider), WhatsApp later (see #9).

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
