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
