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
  Edit flows (#3/#5/#6) done 2026-07-06 (needs migration — see below). Next item
  when resuming: **visitors & leads module** (#4).

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
- Repo previously lived in OneDrive: caused git index corruption + reverted writes.
  Now safe at `C:\Claude Projects\DBMS`. Inner `DBMS/` folder = gitignored Obsidian leftovers (deletable).
- better-auth: public sign-up disabled; staff created server-side via a local
  betterAuth instance in staff/service.ts; deactivation deletes session rows directly.
- Next.js 16: searchParams/params are Promises (await them); pages must not export
  extra components.
