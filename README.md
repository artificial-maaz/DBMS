# Dealership ERP

A multi-branch ERP for electric/motor vehicle dealerships in Pakistan — inventory,
sales, accounting, HR, workshop, and reporting. Delivered as an installable PWA.

> Formerly scoped as a ground-up database engine; re-scoped 2026-07-03. See `CLAUDE.md`.

## Stack

Next.js (App Router) + TypeScript · PostgreSQL · PWA delivery · cloud-hosted.

## Status

Stack approved. Next: scaffolding proposal (project structure, ORM/auth choices,
Phase 1 schema draft).

## Module Phases

1. **MVP:** auth + RBAC + branches, serialized vehicle inventory, customers, sales & invoicing (PDF), cash ledger.
2. Dashboards, monthly P&L, spare parts inventory, gate pass (inter-branch transfers).
3. Workshop (repairs, job cards, maintenance coupon