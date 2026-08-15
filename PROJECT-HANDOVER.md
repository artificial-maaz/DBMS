# Hussain Motors ERP — Project Handover

**Prepared for:** the owners of Hussain Motors
**Prepared by:** Maaz Hussain (Creator, sole developer and system administrator)
**Date:** 15 August 2026
**Status:** live in production, first branch onboarding

---

## 1. What was built

A multi-branch dealership ERP replacing manual registers and WhatsApp-only record keeping across
Hussain Motors' electric and motor vehicle showrooms. It runs in a browser, installs to a phone or
desktop like an app, and is used by role — an owner sees the whole company, a branch manager sees
their branch, a mechanic sees only the workshop.

**Delivered modules**

| Area | What it covers |
|---|---|
| Inventory | Serialised vehicles (chassis/engine), arrival dates, days in stock, batch intake |
| Sales | Invoicing with PDF/print, cash and installment, guarantors, commissions, backdating |
| Installments | Amortisation schedules, collections, receivables control tower, company rate cards |
| Customers | Customer records, walk-in leads (Visitors), Customer 360 history, test drives, bookings |
| Cash & Accounting | Append-only ledger, monthly P&L, general journal, trial balance, balance sheet, fixed assets |
| Stock control | Gate passes between branches, physical stock audit, deliveries/consignments |
| Workshop | Job cards, repair queue, 3 free coupons per sold vehicle, parts consumption, labour rates |
| HR & Payroll | Staff records, salaries and allowances, commission integration, ledger-posted releases |
| Procurement | Suppliers, purchase orders with line items, ordered-vs-received, outstanding payments |
| Governance | Maker-checker approval queue, system-wide audit log, role-based access, notifications |
| Counter tools | Delivery Process runbook, Formats & Messages generator, handover checklist |

---

## 2. How it was built

**Stack:** Next.js 16 (App Router) + TypeScript, Drizzle ORM, PostgreSQL on Neon, Better Auth,
Tailwind v4, PWA. Hosted on Railway, auto-deploying from the `main` branch on GitHub.

**Why this stack:** one language across front and back end, a relational database appropriate to
money and stock, and a hosting cost under $15/month at this scale. A ground-up C++ system was
considered and rejected — six to twelve months slower with no benefit visible to a single user.

**Architecture:** each business domain is a self-contained module (`schema / service / queries /
permissions / validators`) so a new area can be added without touching existing ones. Permissions are
enforced on the server on every request; the sidebar hiding a link is cosmetic only. Money and stock
movements run inside database transactions with row locks, then write an audit entry.

**Effort:** approximately six weeks of concentrated development, 2026-07-03 to 2026-08-15,
delivered in 44 reviewed checkpoints. Roughly 30 domain modules, 70+ screens, and a full test plan
of 35 cases. Every change is in Git history with an explanatory commit.

---

## 3. Principles the system holds to

These explain most of its behaviour, and are worth knowing before asking for changes.

1. **Nothing is deleted.** Records are retired; ledger errors are corrected by reversing entries.
   History cannot be quietly rewritten.
2. **Money follows the thing, not the person.** A sale posts to the branch that owned the vehicle,
   whoever sold it, so each branch's books stay true.
3. **Maker-checker on money and stock.** Staff submit; owners approve. The action executes at
   approval time with all checks live.
4. **The server decides what you can see.** Purchase prices, salaries and profit are never sent to a
   role that should not have them.
5. **Reference data is real.** Rate cards, checklists and document lists came from the business, not
   from placeholder guesses.

---

## 4. Access and who holds what

| Role | Scope |
|---|---|
| **Creator** (Maaz Hussain) | Everything, plus sole access to the code, server and deployment. Only role that can onboard or deactivate staff. |
| **Owner** | Every feature and every branch — dashboards, P&L, approvals. No system access. |
| **Silent Partner** | Read-only across all branches, including purchase prices. No operational role. |
| **Branch Manager** | Full operations for their branch; usually also the branch's salesperson. |
| **Salesperson / Assistant / Mechanic / Gate staff** | Progressively narrower. None see profit, purchase price or salaries. |

Onboarding is by invitation from the Creator. Deactivation is immediate and revokes every active
session; the person's historical actions remain intact.

---

## 5. Live status at handover

- **Production:** deployed on Railway. Releases are a **manual `railway up`** from the Creator's
  machine, roughly three minutes — the service is not wired to GitHub, so a push alone does not ship.
  Connecting the repo for automatic deploys is a ten-minute task worth doing early.
- **Database:** PostgreSQL on Neon with continuous point-in-time restore.
- **Installed:** as a PWA on the Creator's devices; installable by any user from their browser.
- **Data:** placeholder and test records, plus the **real installment rate cards** (20 models across
  United, Yadea, Ramza and Honda, effective 2026-06-18).

---

## 6. Known limitations at handover

Stated plainly so nobody discovers them by surprise.

1. ~~Email reaches only the Creator.~~ **RESOLVED 2026-08-16.** Mail now sends over SMTP from the
   company mailbox (`yadeahussainautos@gmail.com`), which every owner is already signed into. Staff
   invites, password resets, digests and the daily/monthly reports all deliver. A verified domain
   remains the better long-term answer for deliverability at volume, but nothing is blocked on it.
2. **Development and production share one database.** Fine while data is placeholder; it must be
   split before real records accumulate. *Fix: Neon branching, about thirty minutes, no cost.*
3. ~~No self-service password reset.~~ **RESOLVED 2026-08-16.** "Forgot your password?" on the sign-in
   page emails a one-hour link. The Creator-set temporary password remains as the fallback for
   someone who has also lost access to their email.
4. **WhatsApp integration is not built.** Deferred deliberately; it needs Meta Business approval,
   which takes weeks and should be applied for well before the build.
5. **The app icon is a monogram, not the company logo.** Functional and deliberate, but a real logo
   is better. *Fix: drop a transparent PNG at `src/app/icon.png` — no code change needed.*
6. **Delivery Process ticks are not saved.** It is a counter checklist, not a record. What
   physically left with the bike *is* recorded, on the invoice.
7. **Two internal print views remain unbranded** — the gate pass and the workshop job card. Neither
   leaves the building, so they were left until last. The invoice, the P&L and all three accounting
   statements now share one letterhead.

`GOLIVE.md` is the ordered checklist for items 1–2 and the pre-launch data cleanup.

---

## 7. Recommended first month

**Week 1** — one branch, one branch manager, real data entered daily. Watch the Review Queue and the
Audit Log every morning. Expect procedure questions, not software questions.

**Week 2** — split dev and production databases; verify the email domain. Both are prerequisites for
adding more people.

**Week 3** — onboard the second branch manager, with the first one teaching. The best evidence the
system is understood is a user who can explain it.

**Week 4** — enable owner-facing reporting properly (email working), and review whether the approval
queue is helping or slowing the counter. Tune scope, not principle.

---

## 8. Handover contents

| Document | Purpose |
|---|---|
| `USER-MANUAL.md` | For branch managers and counter staff |
| `PROJECT-HANDOVER.md` | This document — for the owners |
| `GOLIVE.md` | Ordered pre-launch checklist |
| `HANDOVER.md` | Technical continuation brief for any future developer |
| `ROADMAP.md` | Complete build history and the remaining backlog |
| `TESTING.md` | 35-case test plan |
| `docs/ARCHITECTURE.md` | System design |

Source code, deployment credentials and database access remain solely with the Creator.
