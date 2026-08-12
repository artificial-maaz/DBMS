# Hussain Motors ERP — User Manual

For branch managers and counter staff. Written 2026-08-15 for the first branch going live.

If you read only one section today, read **§2 (Your first day)** and **§4 (Selling a bike)**.

---

## 1. Getting in

**Address:** the link your admin sends you. Sign in with your email and the password you were given.

**Install it like an app.** In Chrome on your phone: menu → *Add to Home screen*. On a laptop: the
install icon in the address bar. It then opens full-screen with its own icon, works like any other
app, and you stop hunting for the tab.

**Forgot your password?** There is no self-service reset yet. Contact the admin — he sets a
temporary one and hands it over in person. Doing so signs you out everywhere, which is deliberate.

**Dark mode:** the moon/sun button, top right. Your choice is remembered.

---

## 2. Your first day — what the screen is telling you

The **left sidebar** is grouped by what you do, not by how the software is built:

| Group | What lives there |
|---|---|
| Overview | Dashboard, Review Queue, Notifications |
| Showroom | Inventory, Stock Audit, Gate Passes, Deliveries |
| Retail | Customers, Test Drives, Bookings, Sales, Installments, **Delivery Process**, **Formats** |
| Service | Workshop, Spare Parts, Labor Rates |
| Finance | Ledger, Monthly P&L, Accounting, Assets |
| Supply Chain | Suppliers, Purchases |
| Admin | Staff, Settings, Audit Log, Import |

You will not see all of it — the sidebar only shows what your role can open.

**Two things to check every morning:**
1. **Review Queue** — anything you submitted that is waiting for owner approval.
2. **Dashboard** — stock count, active invoices, today's cash.

**The search box at the top** finds a customer, an invoice, or a bike by chassis, CNIC, phone or
invoice number. It is usually faster than navigating.

---

## 3. The rule that surprises everyone: approvals

**Money and stock actions do not take effect when you press Save.** They go to the Review Queue and
wait for an owner. That includes sales, installment payments, ledger entries, bookings, vehicle and
part registration, stock adjustments, gate passes and stock audits.

Customers, visitors and test drives save immediately — no approval needed.

This is not distrust; it is how the books stay defensible. When an owner approves, the action runs
*at that moment* with all its checks live. If the bike sold in the meantime, the approval fails
cleanly and tells the reviewer why, rather than double-selling it.

**What this means at the counter:** finish the sale in the system, tell the customer it is done,
and expect the invoice to appear once the owner approves. Do not enter it twice.

---

## 4. Selling a bike

### 4.1 Follow the procedure
Open **Retail → Delivery Process**. Pick *Cash Sale* or *Installment Sale*, answer the registration
question, and work down the list. It contains the whole counter procedure including the things that
must never happen (a sales tax invoice is never handed over). Print it and keep it at the counter.

### 4.2 Enter it in the system
**Retail → Sales → New Sale.**

- **Customer**: type to search by name, phone or CNIC. If they are new, register them right there —
  you do not need to leave the page.
- **Vehicle**: grouped by model with a stock count and the branch that holds it. You may sell
  another branch's bike; the money is recorded against the branch that owns the vehicle.
- **Sale date**: defaults to today. Backdate it for a sale entered late and everything follows —
  invoice number, ledger date, installment due dates, and which month's P&L it lands in.
- **Cash or Installment**: choosing Installment reveals the plan, the guarantor rows (at least one
  is required) and the document checklist.
- **Booking**: if the customer has an open token, pick it. Only the difference is collected — the
  token is already in the ledger and is never counted twice.
- **Handover checklist**: appears on every sale. Untick anything still owed and write why. It does
  not block the sale; it records the promise, and it prints on the invoice.
- **Warranty card**: appears for **Yadea only**. No other make issues one.

### 4.3 Installment plans
Selecting a vehicle matches it to the company rate card and the duration dropdown fills the advance,
months and markup. All of it stays editable — the card is a starting point, not a cage.

### 4.4 After the sale
Open the invoice to print it, collect an installment, or update **document custody** — whether a
paper is with the customer, held by us, or still pending. When nothing is owed and no document is
held by us, the case closes itself and drops out of Active Invoices.

---

## 5. Money

**Finance → Cash Ledger** — every rupee in and out, with a category and a payment method. It is
append-only: mistakes are corrected with a reversing entry, never by editing. That is what makes the
history trustworthy.

**Retail → Installment Cases** — who owes what, worst offenders first, with days late and the
overdue amount. This is the collections screen.

**Finance → Monthly P&L** — stock purchases are treated as an asset and become cost when the bike
sells, so profit is real profit.

---

## 6. Stock

- **Register a bike**: Showroom → Inventory → Add Vehicle. Chassis and engine numbers are unique.
- **A whole consignment**: Showroom → Deliveries → Record Delivery. All units land in one atomic
  action — a duplicate chassis anywhere rolls the whole batch back.
- **Move a bike between branches**: Showroom → Gate Passes. Never edit the branch on the vehicle.
- **Count the floor**: Showroom → Stock Audit. Tick what you physically see; anything unticked is
  flagged Missing.

---

## 7. The daily messages

**Retail → Formats & Messages** builds every message you currently type:

- **Stock Report** — read from live inventory, so it cannot disagree with the system. Add today's
  sale and any repair bikes, press Copy, paste into the group.
- **Advance Booking / Token**
- **Parts Purchase Demand** — payment first, always.
- **Bike Transfer** — the announcement. The physical move still needs a Gate Pass.
- **Inter-Dealership Transfer Request** — a printable letter on the letterhead. Fill it on screen or
  print blanks and write them by hand.

---

## 8. Workshop

Job cards, the repair queue, and parts consumed from branch stock. Every sold vehicle carries
**3 free maintenance coupons**; a coupon job waives labour and still charges parts. Branch managers
and above make workshop changes — mechanics have view access.

---

## 9. Things to remember

- **Branches are closed Fridays.** Test drives will refuse a Friday booking.
- **Every action is logged** with who, what and when. Admin → Audit Log.
- **Nothing is ever deleted.** Items are retired; entries are reversed. History stays intact.
- **Timestamps are Pakistan time** (PKT). "Asia/Karachi" is the standard name for the whole
  country's timezone — it is not a Karachi-only setting.
- **You cannot see what your role does not need.** Purchase prices, salaries and P&L are hidden from
  employee roles by the server, not merely hidden on screen.

---

## 10. When something goes wrong

| Symptom | What to do |
|---|---|
| "Failed to get session" on first load | Refresh. The database sleeps when idle and takes a moment to wake. |
| A sale will not save | Read the message — it is written for you, not for a programmer. Usually the bike is no longer in stock or a guarantor is missing. |
| Approved action failed | The Review Queue shows the reason and keeps the item pending. Fix the cause and it can be approved again. |
| Locked out | Contact the admin for a temporary password. |
| A number looks wrong | Do not edit around it. Tell the admin, and check the Audit Log — it will show what happened and who did it. |
