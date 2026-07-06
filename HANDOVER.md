# HANDOVER — Continuation Brief for Any Assistant/Model

Read this + `CLAUDE.md` + `ROADMAP.md` before doing anything. Together they are
the complete context of this project. Last updated: 2026-07-05.

## Who you're working with
- Address him as **"Sir"**. Technical peer (CS degree, full-stack + AI/ML) but NEW to
  the web ecosystem (Next.js/ORMs/deployment) — explain new paradigms intuitively,
  never explain basics.
- **Workflow rules (hard-earned, do not violate):**
  1. Execute autonomously in reviewable chunks; do NOT wait for typed approvals.
  2. Brief "what & why" explanations as you build — never dump an unexplained question.
  3. If using multiple-choice question widgets, put full explanations in a VISIBLE
     message first (text written before tool calls may get summarized away — that
     burned us three times).
  4. End every chunk with: what was built, exact test steps, migration commands if
     schema changed, and the git push checkpoint command.
  5. He runs all terminal commands (npm, git) himself — hand him exact commands.

## Project state
- **Hussain Motors ERP** — multi-branch vehicle dealership ERP for Sir's own company.
  ALL 3 phases built, tested by Sir, LIVE in production. See CLAUDE.md for module list.
- Work queue = `ROADMAP.md` (31-point review backlog; "Next up" list is ordered).
  Edit flows (#3/#5/#6), Visitors & Leads (#4), Advance Bookings (#14, incl.
  full auto-reconciliation into New Sale), Installment Plans (#16, seeded
  with Sir's real United/Yadea/Ramza/Honda rate cards + New Sale auto-fill),
  and Guarantor Details (#21, one-to-many `guarantors` table, required on
  installment sales only) done 2026-07-06 — all five need the migration
  ritual below (+ `db:seed:plans` for #16), not yet run as of this writing.
  Next item when resuming: **documents checklist (#20)**.

## Stack & infrastructure facts
- Next.js 16 (App Router) + TypeScript, Drizzle ORM, PostgreSQL on **Neon**,
  Better Auth (invite-only, organization plugin), Tailwind v4, PWA (manifest + SVG icon).
- **Production: Railway** — auto-deploys every push to `main` (~3 min). Pushing = shipping.
- Prod URL: dbms-production-841d.up.railway.app (custom domain = future task).
- Dev and prod currently share the SAME Neon database (split via Neon branching is
  a roadmap item — warn Sir before staff enters real data).
- Secrets live in `.env` (local, gitignored) and Railway Variables (prod has its own
  BETTER_AUTH_SECRET). Never print secrets in chat; Sir once pasted his DB string —
  password reset available in Neon if ever needed.
- `scripts/seed.ts` (npm run db:seed) creates/repairs the Creator account AND resets
  its password to SEED_CREATOR_PASSWORD from .env — it's the recovery tool.

## Conventions (enforced everywhere — keep them)
- Module = vertical slice in `src/modules/<domain>/`: schema.ts, service.ts,
  queries.ts, permissions.ts, validators.ts. UI in `src/app/(dashboard)/<route>/`.
- RBAC is server-side ONLY: branch scoping via WHERE clauses; restricted columns
  (purchase/cost price, P&L, salaries) are never SELECTed for employees. Sidebar
  role-filtering is cosmetic.
- Money: numeric(12-14,2) strings; shared normalizers in `src/lib/validation.ts`
  (comma/Rs./space tolerant money, phone +92→0, CNIC dash normalization).
- Ledger + part movements are APPEND-ONLY (corrections = reversing entries).
- Every mutation: db.transaction with FOR UPDATE row locks where racing matters,
  then `writeAudit()` from `src/lib/audit.ts`.
- Sequential numbers: INV per-branch-year (LHR-2026-0001), GP-/JC-/PAY-/PO- global.
- Free maintenance: 3 coupons per sold vehicle (constant in workshop/service.ts);
  coupon jobs waive labor, charge parts.
- Hybrid accounting: cash ledger UI, double-entry-ready schema. P&L treats stock
  purchases as assets (COGS on sale), commissions as expense.
- App identity centralized in `src/lib/config.ts` (APP_NAME etc.) until the
  Settings module (#29) makes it DB-backed.
- Business rules: branches closed FRIDAYS; staff management is CREATOR-ONLY;
  silent-investor owners = full read access, no management interest.

## Schema-change ritual (Sir runs)
```
npm run db:generate && npm run db:migrate && npm run dev
```
Then test locally, then: git add/commit/push (auto-deploys).

## Known gotchas
- Assistant's shell sandbox mounts `C:\Claude Projects\DBMS` but the mount is
  STALE/UNRELIABLE right after Read/Write/Edit tool writes — confirmed 2026-07-06:
  running `tsc`/`git` via the bash tool against freshly-edited files showed
  truncated file contents and cascading fake syntax errors, while the same
  files read perfectly via the Read tool (host-side, ground truth). DO NOT use
  bash to verify file contents or run builds/typechecks on this repo — always
  verify with Read, and let Sir run `npm run build`/`tsc` locally for real
  verification. A failed bash `git checkout` also left a stale `.git/index.lock`
  that the sandbox couldn't delete (permission denied) — if git refuses to run
  for Sir, check for and delete `.git/index.lock` first.
- **Real bug fixed 2026-07-06:** `cleanMoney` in `lib/validation.ts` only handled
  `typeof v === "string"`, passing `undefined` straight through to `z.string()`,
  which then rejects it as "expected string, received undefined." Any
  conditionally-rendered money `<input>` (downpayment/totalMarkup — installment
  only; commission — role-gated; vehicle purchasePrice — creator/owner only)
  is simply ABSENT from FormData when unmounted, not an empty string — so cash
  sales and non-privileged submits were broken pre-existing. Fixed by having
  `cleanMoney` treat `null`/`undefined` the same as `""`. Watch for the same
  pattern (conditional `<input>` + non-optional zod field) in future modules.
- Occasional "Failed to get session" error (Better Auth's generic wrapper
  message, thrown from `auth.api.getSession` in `lib/session.ts`) on the first
  request after some idle time — confirmed 2026-07-06 to be a transient Neon
  serverless-Postgres cold-start hiccup, not a code bug. Isolated by testing:
  happened on a plain `/sales/new` load (not tied to any specific route or
  recent change), resolved on refresh/retry. If it ever persists across
  retries, get the actual terminal error text (Better Auth logs the real cause
  server-side; the browser overlay only shows the generic message).
- Repo previously lived in OneDrive: caused git index corruption + reverted writes.
  Now safe at `C:\Claude Projects\DBMS`. Inner `DBMS/` folder = gitignored Obsidian leftovers (deletable).
- better-auth: public sign-up disabled; staff created server-side via a local
  betterAuth instance in staff/service.ts; deactivation deletes session rows directly.
- Next.js 16: searchParams/params are Promises (await them); pages must not export
  extra components.
- **ROADMAP.md "Next up" numbering drifts every time an item is moved to Done**:
  when the top item is completed and moved up into a "✅ Done" section, the
  remaining numbered list must be renumbered back to 1..N in the SAME edit —
  caught this out of sequence twice (2026-07-06) because the renumber was
  forgotten/half-done. Always re-read the "Next up" block after editing it and
  confirm it starts at 1 with no gaps before moving on.
