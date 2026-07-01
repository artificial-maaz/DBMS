# Architecture Overview — Hussain Motors ERP

## The one rule everything follows
A **module is a vertical slice** owning its schema, business logic, queries,
permissions, and validation. Adding a module never touches existing ones.

```
src/modules/<domain>/
  schema.ts        Drizzle tables for this domain
  service.ts       business logic (transactions, audit writes)
  queries.ts       reads (RBAC-scoped)
  permissions.ts   who may do what (server-side truth)
  validators.ts    zod input schemas (shared normalizers from lib/validation)
src/app/(dashboard)/<route>/
  page.tsx         server component (fetch + RBAC gate)
  actions.ts       "use server" wrappers → module service
  *-form.tsx       client components (useActionState)
```

## Load-bearing principles
- **RBAC is server-side only.** Branch scoping via WHERE clauses; restricted
  columns (purchase/cost price, P&L, salaries) are never SELECTed for
  employees. UI role-filtering is cosmetic.
- **Money** = numeric(12–14,2) strings; never floats. Inputs normalized
  (commas, "Rs.", +92 phones, dashless CNICs) in `lib/validation.ts`.
- **Append-only finance.** Ledger entries and part movements are never
  updated/deleted — corrections are reversing entries (`reverses_entry_id`).
- **Transactions + row locks** (`FOR UPDATE`) wherever two staff could race:
  selling a vehicle, applying a booking token, receiving PO stock,
  collecting installments, converting a lead.
- **Audit everything.** Every mutation calls `writeAudit()` — who, what,
  when, where (`/audit`, Creator/Owner).
- **Snapshot, don't reference,** for historical documents: invoice lines,
  document-checklist names, labor charges are copied at transaction time so
  editing master lists never rewrites history.
- **Manageable lists retire, never delete** (installment plans, document
  requirements, labor rates).

## Money flow map
```
Booking token ──┐ (cash_in @ booking)
                ▼
Sale ──────► invoice + items + schedule + guarantors + documents
   │              │ (delta cash_in @ saleDate)
   ▼              ▼
vehicle=sold   ledger ◄── installment payments (cash_in)
                  ▲       purchases/payroll/expenses (cash_out)
                  └── P&L keys off saleDate; purchases are assets → COGS on sale
```

## Stack
Next.js (App Router) + TypeScript · Drizzle ORM · PostgreSQL (Neon) ·
Better Auth (invite-only) · Tailwind v4 · PWA · Railway (auto-deploy on push).
