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
- A5 Assistant (2026-07-31): sidebar shows only Dashboard/Inventory/Test Drives/Settings; test-drive board is watch-only (no Book button, no row actions); /customers, /parts, /bookings, /sales all bounce to dashboard; global search returns vehicles only.
- A6 Mechanic view-only (2026-07-31): sees Workshop queue, job detail, coupons, Spare Parts, Labor Rates — but no "+ New Job Card", no status buttons, no add/remove parts, no stock adjust; direct form POSTs refused server-side ("Not allowed").

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

## I. Cross-branch, Installments, Deliveries (2026-07-31)
- I1 As a salesperson: New Sale lists another branch's in-stock bike (labelled with its branch) → sell it → queued → approve → invoice, ledger cash-in and P&L all land at the VEHICLE's branch, not yours.
- I2 Register a customer / booking / test drive for another branch → branch dropdown defaults to your own but is changeable; booking token posts to the CHOSEN branch's ledger.
- I3 Booking taken at Branch A cannot be applied to a Branch B vehicle (clear refusal, not a silent mismatch).
- I4 A test drive you booked at another branch still appears on your board and can be marked completed.
- I5 Gate pass: pick a vehicle → Source Branch fills in automatically; that branch is absent from the destination dropdown.
- I6 `/installments`: counts add up (cleared + on-track + overdue = total); an invoice with a past-due unpaid instalment shows red with correct days-late; collecting the last instalment flips it to cleared.
- I7 `/deliveries`: record a 3-unit consignment → all 3 appear in Inventory at that branch; detail page shows arrival dates; sell one → its row shows sale date + invoice link and stops counting days held.
- I8 Delivery with a duplicate chassis (one already in stock) → refused, and NOTHING from that batch is saved.
- I9 As a BM: delivery submits to the approval queue as "Stock Delivery (batch intake)"; approving it registers the units under the BM's name.

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

## J. Counter tools (added 2026-08-15, chunk 45)
- J1 `/delivery-process`: switching flow resets the ticks and the registration answer — a checklist half-finished for the previous customer is worse than none.
- J2 Answer registration YES → only the "registering" step shows (photocopy out, original kept). Answer NO → only the "not registering" step shows. Before answering, BOTH are visible.
- J3 The two hard rules render in the danger tone: "Do NOT give a sales tax invoice", and on the installment flow "KEEP as security until the case is settled".
- J4 Progress counter ignores "only if asked" steps — an authority letter nobody requested must not hold the count at 12/14.
- J5 Print the runbook: sidebar and buttons absent, steps do not split across a page break, readable in black and white.
- J6 `/formats` stock report: matches Inventory for that branch (count a model by hand and compare). Selling a bike and reloading drops it from the report.
- J7 Stock report "Cash in hand" equals today's ledger net for that branch (cash in minus cash out).
- J8 Copy button on every generator actually places text on the clipboard, and shows "Copied ✓".
- J9 Pasted into WhatsApp, the bold renders as bold — NOT as literal asterisks. (Single asterisk pair, not double.)
- J10 Bike transfer message: two colours of one model produce "*T5-L* *2* Blue¹ Grey¹" with superscript counts.
- J11 Transfer letter prints on one page with the letterhead, blanks ruled for handwriting, stamp/signature space present, and NO branch manager name printed.
- J12 As a Branch Manager: `/formats` shows only your own branch in the stock report picker; the transfer destination list still shows all branches.
- J13 Roles without counter access (mechanic, gate staff) are redirected away from both screens.
