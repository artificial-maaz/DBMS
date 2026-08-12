"use client";

export type PayslipData = {
  payNo: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  basicSalary: string;
  allowances: string;
  commissions: string;
  bonus: string;
  deductions: string;
  netPayout: string;
  createdAt: string | Date;
};

/**
 * Printable payslip (Sir, 2026-08-16).
 *
 * Payroll has always calculated and posted correctly, but an employee received
 * a NUMBER, not a document — nothing showing how basic, allowances, commission
 * and deductions produced it. That is exactly the gap that turns into an
 * argument three months later with nothing on paper to settle it.
 *
 * Rendered into a new window, like the gate pass, rather than through the
 * dashboard's print styles: the HR page prints as a table of many releases, a
 * payslip is one person's document. One stylesheet cannot serve both without
 * becoming a maze.
 *
 * Two copies per sheet — employee and office — because that is how a signed
 * receipt actually works.
 */
export function PrintPayslipButton({
  slip,
  companyName,
  logoDataUrl,
}: {
  slip: PayslipData;
  companyName: string;
  logoDataUrl?: string | null;
}) {
  const print = () => {
    const rs = (v: string) => `Rs. ${Number(v).toLocaleString("en-PK")}`;
    const d = (v: string | Date) => new Date(v).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" });

    // Earnings and deductions are shown as separate columns, so the employee can
    // see what was ADDED and what was TAKEN without doing arithmetic.
    const earnings: [string, string][] = [
      ["Basic salary", slip.basicSalary],
      ["Allowances", slip.allowances],
      ["Commissions", slip.commissions],
      ["Bonus", slip.bonus],
    ];
    const gross =
      Number(slip.basicSalary) + Number(slip.allowances) + Number(slip.commissions) + Number(slip.bonus);

    const copy = (label: string) => `
      <section class="slip">
        <header>
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="" />` : ""}
          <div>
            <h1>${esc(companyName)}</h1>
            <p class="doc">Salary Slip</p>
          </div>
          <div class="right">
            <p class="no">${esc(slip.payNo)}</p>
            <p class="copy">${label}</p>
          </div>
        </header>

        <table class="meta">
          <tr><th>Employee</th><td><b>${esc(slip.employeeName)}</b></td>
              <th>Period</th><td>${d(slip.periodStart)} to ${d(slip.periodEnd)}</td></tr>
          <tr><th>Released</th><td>${d(slip.createdAt)}</td><th></th><td></td></tr>
        </table>

        <div class="cols">
          <div>
            <h2>Earnings</h2>
            ${earnings.map(([k, v]) => `<p><span>${k}</span><span>${rs(v)}</span></p>`).join("")}
            <p class="sub"><span>Gross</span><span>${rs(String(gross))}</span></p>
          </div>
          <div>
            <h2>Deductions</h2>
            <p><span>Deductions</span><span>${rs(slip.deductions)}</span></p>
            <p class="sub"><span>Total</span><span>${rs(slip.deductions)}</span></p>
          </div>
        </div>

        <p class="net"><span>NET PAID</span><span>${rs(slip.netPayout)}</span></p>

        <div class="sigs">
          <div><span></span><p>Received by (employee)</p></div>
          <div><span></span><p>Paid by</p></div>
        </div>
        <p class="note">
          This slip is a record of one salary release. Commission shown is what was earned and approved
          within the period above. Queries go to the branch manager before the next release.
        </p>
      </section>`;

    const html = `<!doctype html>
      <html><head><meta charset="utf-8" /><title>Payslip ${esc(slip.payNo)}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
        .slip { border: 1px solid #cbd2de; border-radius: 8px; padding: 16px 18px; margin-bottom: 9mm; }
        header { display: flex; align-items: flex-start; gap: 12px; border-bottom: 2px solid #0f172a;
                 padding-bottom: 10px; margin-bottom: 12px; }
        header img { width: 46px; height: 46px; object-fit: contain; }
        h1 { font-size: 19px; margin: 0; }
        .doc { margin: 2px 0 0; font-size: 12px; color: #4b5568; }
        .right { margin-left: auto; text-align: right; }
        .no { font-family: ui-monospace, Consolas, monospace; font-weight: 700; margin: 0; }
        .copy { margin: 2px 0 0; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #4b5568; }
        .meta { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }
        .meta th { text-align: left; color: #4b5568; font-weight: 600; padding: 3px 10px 3px 0; width: 90px; }
        .meta td { padding: 3px 18px 3px 0; }
        .cols { display: flex; gap: 24px; }
        .cols > div { flex: 1; }
        h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #4b5568;
             border-bottom: 1px solid #e2e4ea; padding-bottom: 4px; margin: 0 0 6px; }
        .cols p { display: flex; justify-content: space-between; font-size: 13px; margin: 4px 0; }
        .sub { border-top: 1px solid #e2e4ea; padding-top: 4px; font-weight: 600; }
        .net { display: flex; justify-content: space-between; margin-top: 14px; padding: 9px 12px;
               background: #eef1f7; border-radius: 6px; font-size: 15px; font-weight: 700;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sigs { display: flex; gap: 28px; margin-top: 26px; }
        .sigs div { flex: 1; }
        .sigs span { display: block; height: 32px; border-bottom: 1px solid #0f172a; }
        .sigs p { margin: 4px 0 0; font-size: 10px; color: #4b5568; }
        .note { margin-top: 10px; font-size: 10px; color: #4b5568; line-height: 1.5; }
        .cut { border: 0; border-top: 1px dashed #94a3b8; margin: 0 0 9mm; }
      </style></head>
      <body>${copy("Employee copy")}<hr class="cut" />${copy("Office copy")}</body></html>`;

    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) {
      alert("Your browser blocked the print window. Allow pop-ups for this site and try again.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
    };
  };

  return (
    <button
      onClick={print}
      className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:bg-raised active:scale-95"
    >
      Payslip
    </button>
  );
}

/** Built as an HTML string, so every interpolated value must be escaped. */
function esc(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
