# Hussain Motors ERP

A multi-branch ERP for electric/motor vehicle dealerships in Pakistan — inventory,
sales, accounting, HR, workshop, and reporting. Delivered as an installable PWA.

> Formerly scoped as a ground-up database engine; re-scoped 2026-07-03. See `CLAUDE.md`.

## Stack

Next.js (App Router) + TypeScript · PostgreSQL (Neon) via Drizzle ORM · Better Auth ·
PWA delivery · hosted on Railway (auto-deploys from `main`).

## Status

**In production since 2026-07-05.** All three module phases shipped: auth/RBAC/branches,
serialized inventory, customers, sales with installment plans + commissions + PDF
invoices, hybrid cash ledger, P&L, spare parts, gate passes, workshop job cards,
HR & payroll, procurement, audit log, global search. Polish and review backlog
tracked in `ROADMAP.md`.

## Local Development

```bash
npm install               # once
cp .env.example .env      # fill DATABASE_URL (Neon), BETTER_AUTH_SECRET, BETTER_AUTH_URL
npm run db:migrate        # apply migrations
npm run db:seed           # create/repair the Creator account (also resets its password from .env)
npm run dev               # http://localhost:3000
```

Schema changed? `npm run db:generate && npm run db:migrate`. Architecture notes
live in `docs/ARCHITECTURE.md`; work queue in `ROADMAP.md`.

## Module Phases

1. **MVP:** auth + RBAC + branches, serialized vehicle inventory, customers, sales & invoicing (PDF), cash ledger.
2. Dashboards, monthly P&L, spare parts inventory, gate pass (inter-branch transfers).
3. Workshop (repairs, job cards, maintenance coupons), HR (salaries, bonuses), procurement.
4. Future features as approved.

## Access Model

Creator (full system + sole code/deploy access) → Owners (full features, revocable) →
Employees (branch-scoped operational roles) → Customers (excluded for now).
Server-side RBAC, invite-based onboarding, instant deactivation, audit log from day one.

## Workflow

"Plan Before Code" checkpoints: architect → propose with trade-offs → approval →
execute in reviewable chunks → push checkpoint.
