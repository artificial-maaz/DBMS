# Go-Live Checklist — Hussain Motors ERP

Written 2026-08-09, when Sir confirmed real staff and real sales were weeks away.

Work top to bottom. Steps 1–3 are the ones that get *harder* the longer they wait, because
they all involve separating real records from the placeholder data already in the database.

---

## 1. Split dev and production databases (do this first)

**The problem today:** `DATABASE_URL` in your local `.env` and the one in Railway point at the
**same Neon database**. Every `npm run dev` on your laptop reads and writes live data. That was
fine while everything was placeholder. Once a branch manager enters a real sale it is not.

Neon calls the fix *branching*. A branch is a copy-on-write clone — it costs nothing extra on the
free plan and takes about a minute.

1. Neon console → your project → **Branches** → **New branch**.
2. Parent: your current branch (the one Railway uses). Name it **`dev`**.
3. Copy the `dev` branch's **pooled** connection string.
4. In your local `.env`, replace `DATABASE_URL` with the `dev` string.
5. Add these two lines to your local `.env` as well:

   ```
   PROD_DB_HOST=<the hostname from your PRODUCTION connection string>
   APP_ENV=development
   ```

   `PROD_DB_HOST` is just the host part — `ep-something-pooler.region.aws.neon.tech`, no
   credentials. It is what lets the seed scripts recognise production and refuse to damage it
   (see step 2).
6. In Railway → Variables, confirm `DATABASE_URL` still points at the production branch, and add
   `APP_ENV=production`.
7. Verify: `npm run db:find-test-data` — the banner names the host and database it reached. It
   should say **development**.

**From then on:** schema changes are developed against `dev` (`npm run db:generate` +
`npm run db:migrate`), and applied to production by pointing `DATABASE_URL` at prod for a single
`npm run db:migrate` — or by letting the deploy do it, if you wire that up later.

To refresh `dev` with current production data, delete the `dev` branch and re-create it from the
parent. Nothing in the app is tied to it.

---

## 2. Know what the seed scripts will do

Every script that writes now prints its target before touching anything, and guards itself:

| Command | Against production |
|---|---|
| `npm run db:seed` | **Prompts** — it resets the Creator password to the `.env` value |
| `npm run db:seed:test` | **Refused outright** — it invents branches, vehicles and sales |
| `npm run db:seed:plans` / `:docs` / `:handover` | Allowed — reference data, idempotent upserts |
| `npm run db:settle` | Allowed — idempotent, and meant to run once on production |
| `npm run db:find-test-data` | Read-only |

If `PROD_DB_HOST` and `APP_ENV` are both unset, the banner says the target is **UNIDENTIFIED**
rather than pretending it is development. Do not ignore that.

---

## 3. Start production clean

Run `npm run db:find-test-data` against production. It reports the seeded branches
(`Test Branch Lahore`, `Test Branch Kasur`), the `TST…` chassis vehicles, and everything attached
to them.

**The recommended route is a fresh production branch in Neon, not deleting rows.** The test sale
went through the real service layer: it posted cash to the ledger, recognised COGS in the P&L,
consumed a vehicle, wrote an installment schedule and left audit entries. Deleting the vehicle
without unwinding all of that leaves the books quietly inconsistent — the kind of thing nobody
notices until a month-end refuses to balance.

Starting clean means:

1. Create a **new empty branch** in Neon (not a copy — a fresh one), or reset the current one.
2. Point Railway's `DATABASE_URL` at it.
3. `npm run db:migrate` against it.
4. `npm run db:seed` — creates your Creator account.
5. `npm run db:seed:plans`, `:docs`, `:handover` — the reference data (rate cards are real and
   should carry over).
6. Enter the real branches, then invite real staff.

---

## 4. Reference data to confirm before staff arrive

- **Installment rate cards** — real as of 2026-06-18, 20 models. Confirm nothing has changed
  since; `/installment-plans`.
- **Document checklist** and **Handover checklist** — both seeded from your lists. Note "Spare
  Key" and "Tool Kit" currently appear on *both*; retire whichever copy you do not want.
- **System Settings** — company name, logo (transparent PNG, ≤200 KB), brand colour, default
  excise fee and showroom profit split, commission rate.
- **Branches** — real names. Remember invoice numbers derive from the first three letters, and
  two branches sharing a prefix is handled, but the codes will look alike on paper.

---

## 5. Still outstanding at go-live

- **Email only reaches you.** `RESEND_ONLY_TO` redirects every send while no domain is verified
  with Resend, so owners are on the notification lists but receive nothing. Verify a domain, then
  delete that variable. Same errand as putting a custom domain on the Railway URL.
- **Password resets are Creator-only**, by design until the above is done: Staff → Reset password
  → hand over a temporary password in person. All of that user's sessions are revoked.
- **Favicon** still shows the placeholder — needs a transparent PNG from Sir at
  `src/app/icon.png` plus a `manifest.ts` update.
- **Backups**: Neon keeps continuous point-in-time restore. Confirm the retention window on your
  plan in the console and know where the restore button is *before* you need it.

---

## 5b. Training the first branch manager

Full agenda in `docs/TRAINING-DAY.md`. The short version:

1. Create his account (Admin → Staff → Onboard, role **Branch Manager**), hand the temporary
   password over **on paper**.
2. Sign him in **on his phone first** and install to the home screen — that is where he will use it.
3. Teach the **counter procedure before the software**: `/delivery-process`, both flows, stopping
   hard at the registration fork. Print it for the counter wall.
4. Run one real cash sale end to end while he drives and you approve it from your own login, so he
   sees the Review Queue work rather than hearing about it.
5. Generate the stock report from `/formats` and send it to the group. This is usually the moment a
   manager decides he likes the system.
6. Do not onboard a second manager until the first can teach it.

## 6. First-week habits

- Watch `/approvals` — every money and stock action from staff waits there.
- Watch `/audit` — every mutation, with who and when.
- The daily report email fires at 21:00 PKT, digests at 13:00 and 22:00. Until the domain is
  verified they all arrive at your address only.
- Branches are closed **Fridays**; test drives enforce it.
