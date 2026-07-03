# DBMS Project — Dealership ERP — Project-Specific Instructions

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
1. **Creator (Sir):** full access to all data, branches, users, roles, settings. Sole holder of codebase, server, and deploy credentials — no one else, including O