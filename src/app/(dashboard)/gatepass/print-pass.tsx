"use client";

export type PassSlip = {
  passNo: string;
  vehicleLabel: string;
  chassisNo: string;
  sourceName: string;
  destName: string;
  driverName: string;
  transportPlate?: string | null;
  issuedAt: string | Date;
  status: string;
};

/**
 * Printable gate pass (Sir, 2026-08-15).
 *
 * A gate pass is a physical document — it travels with the bike and is handed
 * over at the receiving branch. Until now it existed only as a row in a table,
 * so branches were writing one out by hand while the system held the real one.
 *
 * Printed into a NEW WINDOW rather than through the page's own print styles.
 * The list page prints as a list; a slip needs its own paper, its own layout
 * and none of the surrounding chrome. Fighting one stylesheet to do both is how
 * print CSS turns into a maze — a self-contained document avoids the argument
 * entirely, and cannot be broken by a later change to the dashboard's styles.
 *
 * Two copies per sheet, divided by a cut line: one travels with the vehicle,
 * one stays at the issuing branch. That is how the paper version already works.
 */
export function PrintPassButton({
  pass,
  companyName,
  logoDataUrl,
}: {
  pass: PassSlip;
  companyName: string;
  logoDataUrl?: string | null;
}) {
  const print = () => {
    const issued = new Date(pass.issuedAt).toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const copy = (label: string) => `
      <section class="slip">
        <header>
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="" />` : ""}
          <div>
            <h1>${esc(companyName)}</h1>
            <p class="doc">Gate Pass — Vehicle Transfer</p>
          </div>
          <div class="right">
            <p class="no">${esc(pass.passNo)}</p>
            <p class="copy">${label}</p>
          </div>
        </header>

        <table>
          <tr><th>Vehicle</th><td>${esc(pass.vehicleLabel)}</td></tr>
          <tr><th>Chassis No</th><td class="mono">${esc(pass.chassisNo)}</td></tr>
          <tr><th>From</th><td>${esc(pass.sourceName)}</td></tr>
          <tr><th>To</th><td><b>${esc(pass.destName)}</b></td></tr>
          <tr><th>Driver</th><td>${esc(pass.driverName)}${
            pass.transportPlate ? ` &nbsp;·&nbsp; <span class="mono">${esc(pass.transportPlate)}</span>` : ""
          }</td></tr>
          <tr><th>Issued</th><td>${esc(issued)}</td></tr>
          <tr><th>Status</th><td>${esc(pass.status.replace("_", " "))}</td></tr>
        </table>

        <div class="sigs">
          <div><span></span><p>Issued by (Branch Manager)</p></div>
          <div><span></span><p>Driver signature</p></div>
          <div><span></span><p>Received at destination</p></div>
        </div>
        <p class="note">
          This vehicle is company stock in transit. It is not sold. Present this pass on arrival and have the
          receiving branch mark it received in the system the same day.
        </p>
      </section>`;

    const html = `<!doctype html>
      <html><head><meta charset="utf-8" /><title>Gate Pass ${esc(pass.passNo)}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
        .slip { border: 1px solid #cbd2de; border-radius: 8px; padding: 16px 18px; margin-bottom: 10mm; }
        header { display: flex; align-items: flex-start; gap: 12px; border-bottom: 2px solid #0f172a;
                 padding-bottom: 10px; margin-bottom: 12px; }
        header img { width: 46px; height: 46px; object-fit: contain; }
        h1 { font-size: 19px; margin: 0; }
        .doc { margin: 2px 0 0; font-size: 12px; color: #4b5568; }
        .right { margin-left: auto; text-align: right; }
        .no { font-family: ui-monospace, Consolas, monospace; font-weight: 700; font-size: 15px; margin: 0; }
        .copy { margin: 2px 0 0; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #4b5568; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; width: 120px; padding: 5px 0; color: #4b5568; font-weight: 600; vertical-align: top; }
        td { padding: 5px 0; }
        .mono { font-family: ui-monospace, Consolas, monospace; }
        .sigs { display: flex; gap: 18px; margin-top: 26px; }
        .sigs div { flex: 1; }
        .sigs span { display: block; height: 34px; border-bottom: 1px solid #0f172a; }
        .sigs p { margin: 4px 0 0; font-size: 10px; color: #4b5568; }
        .note { margin-top: 12px; font-size: 10px; color: #4b5568; line-height: 1.5; }
        .cut { border: 0; border-top: 1px dashed #94a3b8; margin: 0 0 10mm; }
      </style></head>
      <body>
        ${copy("Branch copy")}
        <hr class="cut" />
        ${copy("Driver copy")}
      </body></html>`;

    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) {
      alert("Your browser blocked the print window. Allow pop-ups for this site and try again.");
      return;
    }
    w.document.write(html);
    w.document.close();
    // Let the logo load before printing, or it prints as a blank box.
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
      Print
    </button>
  );
}

/** The slip is built as an HTML string, so anything interpolated must be escaped. */
function esc(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
