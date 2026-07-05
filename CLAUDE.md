# DBMS Project — Hussain Motors ERP — Project-Specific Instructions

This file overrides or extends the root `CLAUDE.md` for this project only.

> **Project pivot (2026-07-03):** This project was originally scoped as a ground-up
> database engine. That scope is retired. The real target, clarified and approved by
> Sir, is a multi-branch vehicle dealership ERP (reference model: ebikeerp.com).

---

## Project Goal
A multi-branch ERP for Sir's electric/motor vehicle dealerships across Pakistan:
inventory, sales, accounting, HR, workshop, and reporting — replacing fully manual
operations. Delivered as an installable PWA, hosted in the cloud, accessed by
role-scoped users.

## Approved Tech Stack (2026-07-03)
- **Frontend + Backend:** Next.js (App Router) + TypeScript — single language across the stack.
- **Database:** PostgreSQL (Sir's existing familiarity; correct fit for relational/financial data).
- **Delivery:** PWA — installable from browser on desktop/Android/iOS. No app stores initially; Capacitor wrap later only if store presence is wanted.
- **Hosting:** Cloud (VPS e.g. Hetzner, or Railway) + managed Postgres (Neon/Supabase). Runs 24/7 server-side; user devices are clients only. Target starting cost < $15/month.
- *Why:* fastest path to production for a multi-user web/mobile ERP; pre-solved auth/PDF/dashboard ecosystem; scales from internal tool to multi-tenant SaaS if ever commercialized. C++ was considered and rejected (no user-visible benefit at this scale, 6–12 months slower).
- **ORM:** Drizzle (approved 2026-07-03) — SQL-first, matches Sir's Postgres fluency, best for ERP reporting queries. Prisma considered and declined.
- **Auth:** Better Auth (approved 2026-07-03) — organization plugin gives invites, roles, members, session revocation out of the box; self-hosted in our Postgres. Auth.js is maintenance-mode; Clerk rejected (paid, hosted).

## Access Model (RBAC — enforce server-side on every request)
1. **Creator (Sir):** full access to all data, branches, users, roles, settings. Sole holder of codebase, server, and deploy credentials — no one else, including Owners, can modify the system itself.
2. **Owners (4–5, changes over time):** full feature access (dashboards, P&L, all modules). No code/system access. Addable/removable by Creator.
3. **Employees:** branch-scoped roles (branch sales manager → salesperson → mechanic → gate staff, etc.). Operational features only (customers, invoices, job cards). No access to P&L, total revenue, or salaries.
4. **Customers:** excluded for now; schema should leave the door open.

- Invite-based onboarding (email invite → account → login/logout sessions).
- Instant deactivation when anyone leaves; their historical actions are retained.
- **Audit log from day one:** every action recorded (who, what, when, where).

## Business Rules (approved 2026-07-04, after full review of 112 ebikeerp reference screenshots)
- **Installment sales are Phase 1:** settlement plan (cash | installment), advance downpayment, monthly amortization schedule with markup, receivables/balance-due tracking, late-fee support.
- **Salesperson commissions:** per-sale commission recorded at invoice time; leaderboard now, payroll integration in Phase 3.
- **Accounting = Hybrid:** simple cash in/out ledger UI (staff-friendly), but schema is double-entry-ready (categorized, append-only, reference-linked) so formal journals/trial balance/balance sheet can be added later without rework. Full double-entry considered and deferred.
- **Invoice lines include registration/excise fee** (govt fee + showroom profit split).
- **GUI reference = ebikeerp:** grouped sidebar by domain, global VIN/CNIC/invoice search, KPI-card dashboards, badge statuses, modal create-forms, print/PDF actions. Ours differs: true multi-branch core, hard server-side RBAC (employees never receive purchase price/P&L/salary fields), PWA/mobile-first, system-wide audit log, phased delivery.

## Module Phases
- **Phase 1 (MVP):** auth + RBAC + branch management; serialized vehicle inventory (chassis/engine no., model, color, status); customer database; sales & invoicing (PDF) incl. installment plans + commissions; cash in/out ledger (hybrid model) + receivables.
- **Phase 2:** dashboards & performance summaries; monthly P&L; spare parts inventory; gate pass (inter-branch vehicle transfers with approval trail).
- **Phase 3:** workshop (repair queue, job cards, free-maintenance coupon tracking); HR (staff records, salaries, bonuses, rewards); procurement (vehicle/parts stock ordering).
- **Phase 4+:** future features — architecture must absorb additions without touching existing modules.

## Architecture Checkpoints
Follow the root `execution_workflow` strictly:
1. Explore & Architect before any code.
2. Propose design with pros/cons; wait for Sir's approval at each checkpoint.
3. Execute in logical, reviewable chunks.
4. Flag push checkpoints (status → add → commit → push).

## Code Standards
- Modular by domain (inventory, sales, HR, workshop…) — adding a module must not touch others.
- All modules independently testable; interfaces/abstractions at module boundaries.
- No monolithic files; strict separation of concerns.
- Permissions enforced in the backend, never trusted to the UI.

## Repository
- Local path: `C:\Claude Projects\DBMS` (moved out of OneDrive 2026-07-04 to avoid sync/git conflicts)
- Remote: https://github.com/artificial-maaz/DBMS (private)
- Default branch: `main`
- Commit identity: artificial-maaz / maazhussain.work@gmail.com
- Note: an Obsidian vault (inner `DBMS/`, `.obsidian/`) lives inside this folder; it is gitignored.

## Current Status
- **ALL PHASES COMPLETE (2026-07-05).** Deployed to production on Railway (auto-deploys from main); Neon Postgres; PWA installed on Sir's devices.
- Phase 1: auth/RBAC/branches, inventory, customers, sales w/ installments + commissions + PDF invoices + payment collection, hybrid cash ledger, staff admin w/ session-revoking deactivation, audit log, global search, input normalization.
- Phase 2: monthly P&L (COGS + markup recognition), spare parts (append-only movements), gate passes (issue/receive/cancel).
- Phase 3: workshop (job cards, 3 free coupons per sold vehicle, labor waiver, parts consumption from stock), HR & payroll (salary+allowances on profiles, commission auto-integration, ledger-posted releases, overlap guard), procurement (suppliers, purchase orders w/ outstanding-balance payments).
- Backlog / polish candidates: custom domain, email-delivered invites (needs provider), dev/prod DB split via Neon branching, payslip print view, part sales on invoices.
- **2026-07-05: renamed to Hussain Motors ERP** (centralized in `src/lib/config.ts`). Staff management is Creator-only (#18). Full 31-point review backlog lives in `ROADMAP.md` — treat it as the work queue. Business context: overall manager is Owner Abrar Hussain; silent-investor owners need read-only visibility; branch managers often double as sales managers/mechanics; branches closed Fridays.

---

*Global rules in the root `CLAUDE.md` remain in effect unless explicitly overridden here.*
