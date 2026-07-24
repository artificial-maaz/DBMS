import { and, count, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { branches, invoices, ledgerEntries, vehicles } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { emailsByRoles } from "@/modules/notifications/email";
import { getMonthlyPnl } from "./queries";

const rs = (n: number) => `Rs. ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

async function perBranchDay(date: string) {
  const list = await db.query.branches.findMany({ where: (b, { eq }) => eq(b.isActive, true) });
  const out = [];
  for (const b of list) {
    const [sales] = await db
      .select({ n: count(), rev: sql<string>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.branchId, b.id), eq(invoices.saleDate, date), ne(invoices.status, "cancelled")));
    const [cash] = await db
      .select({
        cin: sql<string>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'cash_in'), 0)`,
        cout: sql<string>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'cash_out'), 0)`,
      })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.branchId, b.id), eq(ledgerEntries.entryDate, date)));
    const [stock] = await db
      .select({ n: count() })
      .from(vehicles)
      .where(and(eq(vehicles.branchId, b.id), eq(vehicles.status, "in_stock")));
    out.push({ name: b.name, sales: sales.n, revenue: Number(sales.rev), cashIn: Number(cash.cin), cashOut: Number(cash.cout), stock: stock.n });
  }
  return out;
}

function branchTable(rows: { name: string; sales: number; revenue: number; cashIn: number; cashOut: number; stock: number }[]) {
  const tr = rows
    .map(
      (r) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0"><b>${r.name}</b></td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${r.sales}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${rs(r.revenue)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#059669">${rs(r.cashIn)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#dc2626">${rs(r.cashOut)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${r.stock}</td>
      </tr>`,
    )
    .join("");
  const t = rows.reduce(
    (a, r) => ({ sales: a.sales + r.sales, revenue: a.revenue + r.revenue, cashIn: a.cashIn + r.cashIn, cashOut: a.cashOut + r.cashOut, stock: a.stock + r.stock }),
    { sales: 0, revenue: 0, cashIn: 0, cashOut: 0, stock: 0 },
  );
  return `<table style="border-collapse:collapse;font-size:13px;width:100%">
    <tr style="background:#0f172a;color:#fff"><th style="padding:6px 10px;text-align:left">Branch</th><th style="padding:6px 10px">Sales</th><th style="padding:6px 10px">Revenue</th><th style="padding:6px 10px">Cash In</th><th style="padding:6px 10px">Cash Out</th><th style="padding:6px 10px">In Stock</th></tr>
    ${tr}
    <tr style="background:#f1f5f9;font-weight:bold"><td style="padding:6px 10px">TOTAL</td><td style="padding:6px 10px;text-align:right">${t.sales}</td><td style="padding:6px 10px;text-align:right">${rs(t.revenue)}</td><td style="padding:6px 10px;text-align:right">${rs(t.cashIn)}</td><td style="padding:6px 10px;text-align:right">${rs(t.cashOut)}</td><td style="padding:6px 10px;text-align:right">${t.stock}</td></tr>
  </table>`;
}

/** Daily report — one email, every branch separated inside it (Sir #2). */
export async function sendDailyReport(date = new Date().toISOString().slice(0, 10)) {
  const rows = await perBranchDay(date);
  const to = await emailsByRoles(["creator", "owner"]);
  return sendEmail({
    to,
    subject: `[Hussain Motors] Daily Report — ${date}`,
    html: `<div style="font-family:Arial,sans-serif"><h2>Daily Sales & Stock Report — ${date}</h2>${branchTable(rows)}
      <p style="color:#64748b;font-size:12px;margin-top:12px">Generated automatically by Hussain Motors ERP.</p></div>`,
  });
}

/** Monthly report: full version to Creator+Owners; limited summary to Silent Partners. */
export async function sendMonthlyReport(year?: number, month?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const label = `${y}-${String(m).padStart(2, "0")}`;
  const start = `${label}-01`;
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

  const list = await db.query.branches.findMany({ where: (b, { eq }) => eq(b.isActive, true) });
  const rows = [];
  for (const b of list) {
    const [sales] = await db
      .select({ n: count(), rev: sql<string>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.branchId, b.id), gte(invoices.saleDate, start), lte(invoices.saleDate, end), ne(invoices.status, "cancelled")));
    const [cash] = await db
      .select({
        cin: sql<string>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'cash_in'), 0)`,
        cout: sql<string>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.direction} = 'cash_out'), 0)`,
      })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.branchId, b.id), gte(ledgerEntries.entryDate, start), lte(ledgerEntries.entryDate, end)));
    const [stock] = await db
      .select({ n: count() })
      .from(vehicles)
      .where(and(eq(vehicles.branchId, b.id), eq(vehicles.status, "in_stock")));
    rows.push({ name: b.name, sales: sales.n, revenue: Number(sales.rev), cashIn: Number(cash.cin), cashOut: Number(cash.cout), stock: stock.n });
  }

  const pnl = await getMonthlyPnl({ year: y, month: m });
  const pnlBlock = `<h3 style="margin-top:20px">Profit & Loss — ${label}</h3>
    <table style="border-collapse:collapse;font-size:13px">
      <tr><td style="padding:4px 10px">Total Revenue</td><td style="padding:4px 10px;text-align:right">${rs(pnl.revenue)}</td></tr>
      <tr><td style="padding:4px 10px">COGS</td><td style="padding:4px 10px;text-align:right">${rs(pnl.cogs)}</td></tr>
      <tr><td style="padding:4px 10px"><b>Gross Profit</b></td><td style="padding:4px 10px;text-align:right"><b>${rs(pnl.grossProfit)}</b></td></tr>
      <tr><td style="padding:4px 10px">Expenses + Commissions</td><td style="padding:4px 10px;text-align:right">${rs(pnl.totalExpenses + pnl.commissions)}</td></tr>
      <tr style="background:${pnl.netProfit >= 0 ? "#ecfdf5" : "#fef2f2"}"><td style="padding:4px 10px"><b>NET ${pnl.netProfit >= 0 ? "PROFIT" : "LOSS"}</b></td><td style="padding:4px 10px;text-align:right"><b>${rs(pnl.netProfit)}</b></td></tr>
    </table>`;

  const full = await sendEmail({
    to: await emailsByRoles(["creator", "owner"]),
    subject: `[Hussain Motors] Monthly Report — ${label}`,
    html: `<div style="font-family:Arial,sans-serif"><h2>Monthly Report — ${label}</h2>${branchTable(rows)}${pnlBlock}
      <p style="color:#64748b;font-size:12px;margin-top:12px">Generated automatically by Hussain Motors ERP.</p></div>`,
  });

  // Silent Partners: limited summary only (Sir #3) — headline numbers, no per-branch cash detail.
  const partnerTo = await emailsByRoles(["silent_partner"]);
  if (partnerTo.length > 0) {
    await sendEmail({
      to: partnerTo,
      subject: `[Hussain Motors] Monthly Summary — ${label}`,
      html: `<div style="font-family:Arial,sans-serif"><h2>Monthly Summary — ${label}</h2>
        <p>Total sales: <b>${rows.reduce((a, r) => a + r.sales, 0)}</b> · Revenue: <b>${rs(pnl.revenue)}</b> · Net ${pnl.netProfit >= 0 ? "profit" : "loss"}: <b>${rs(pnl.netProfit)}</b></p>
        <p style="color:#64748b;font-size:12px">Full details are available in the ERP dashboard.</p></div>`,
    });
  }
  return full;
}
