# Hussain Motors ERP — System Test Plan

Prep: `npm run db:seed:test` (creates 2 test branches, 5 vehicles, 3 customers,
1 visitor, 1 booking, 1 part, 1 labor rate, 1 expense, 1 asset, 1 cash sale,
1 installment sale). The Excel version of this checklist (with a Status column)
is `hussain-motors-test-cases.xlsx`.

Accounts needed: you (Creator) + one test Owner + one test Salesperson +
one test Silent Partner (onboard via Staff; log in via incognito windows).

## A. RBAC & Access
- A1 Salesperson sees no purchase prices, no Ledger/P&L/Accounting/Staff, only own branch.
- A2 Owner sees everything, but no Staff management buttons (view-only) and no System Settings.
- A3 Silent Partner: sees Dashboard (financial cards), Sales, Inventory, Ledger, P&L, Accounting, Assets — but NO create/edit/approve buttons anywhere; Review Queue shows nothing actionable.
- A4 Deactivate the salesperson mid-session → their next click bounces to login.

## B. Maker-checker (approval queue)
- B1 Salesperson makes a cash sale → amber "sent for approval"; nothing in Sales/Inventory/Ledger yet.
- B2 Creator's Review Queue badge +1; open → payload summary correct; warranty pill red if unticked.
- B3 Approve → invoice exists, vehicle sold, ledger posted; Audit Log shows maker=salesperson, checker=you.
- B4 Reject with note → nothing created; staff sees rejection + note in their queue view.
- B5 Race: submit a sale for a vehicle, then sell that same vehicle yourself, then approve the pending one → approval fails cleanly with "not in stock", item stays pending with the error shown.
- B6 BM stock audit → queues for owner verification; approving logs the verified audit.
- B7 Workshop Deliver & Collect by staff → queues; approve → cash posts.

## C. Money integrity
- C1 Installment sale: schedule sums exactly to principal+markup (check last row absorbs rounding).
- C2 Collect a partial installment → row stays pending with paid amount; overpay attempt refused.
- C3 Booking token → applied at sale → ledger shows only the delta; booking converted; no double cash.
- C4 Booking refund → reversing cash_out linked to the original entry; refunding twice refused.
- C5 Ledger has no edit/delete anywhere; corrections only by reversing entries.
- C6 Money inputs accept "1,50,000" and "Rs. 5000" everywhere.

## D. Accounting layer
- D1 Trial Balance shows "integrity verified" (DR = CR) after seeding.
- D2 Balance Sheet: equation footer balanced; Fixed Assets line = Assets page total; Receivables = sum of active balances.
- D3 Journal: every ledger entry appears as a DR/CR pair; reversals flagged amber.
- D4 P&L for this month: revenue includes seed sales; rent expense appears; commissions listed.

## E. Documents & warranty
- E1 Installment invoice shows guarantor + document custody dropdowns; change one to "Held at dealership" → audit-logged.
- E2 Sale without warranty tick → red pill in Review Queue and on the invoice; "Mark sent now" flips it (audit-logged).

## F. Notifications & email
- F1 Staff action → Creator 🔔 badge increments; feed row marked "new"; badge clears after visiting.
- F2 With RESEND_API_KEY set: staff submission (approval.submit) → email arrives at your inbox.
- F3 System Settings → "Send test daily report" → per-branch table email received.
- F4 "Send test monthly report" → full report to you; if a silent partner exists, they get the limited summary (only after domain verification on Resend).

## G. Edge cases
- G1 Duplicate chassis on Add Vehicle and on CSV import → clear per-row errors, nothing half-saved.
- G2 Friday test-drive booking → refused server-side even if the date field is manipulated.
- G3 Gate pass: cross-branch booking-token sale refused; receive at wrong branch refused.
- G4 Empty optional dropdowns everywhere → no "expected number > 0" errors.
- G5 Dark mode: toggle → refresh → theme persists, no white flash; tables/forms legible.
- G6 Mobile (narrow window): ☰ drawer opens/closes, navigation closes it, all pages usable.

## H. History & identity (Sir #1 — already built, verify)
- H1 Audit Log shows every entry above with the acting person's NAME, action, entity, timestamp.
- H2 Edits (branch/customer/vehicle/staff) each produce an audit row; deactivations/retirements too.
