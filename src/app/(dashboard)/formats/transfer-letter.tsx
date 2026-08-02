"use client";

import { useState } from "react";

/**
 * Inter-dealership vehicle transfer request — a printable blank form.
 *
 * Sir's example was handwritten on letterhead every time. This prints the
 * letterhead and the fixed wording so staff only fill the four details that
 * actually change, or print it blank and write those four by hand.
 *
 * Deliberately kept to ONE page with generous space for the stamp and
 * signature block, and the branch manager's NAME is not printed — Sir's
 * instruction, because the same form has to work whoever signs it.
 */
/**
 * Sir (2026-08-15): the letterhead name is fixed, NOT the System Settings
 * company name. This form goes to Yadea Head Office on Yadea dealership
 * letterhead - it has to read the same every time regardless of what the ERP
 * is branded as internally. Changing the app's display name must not silently
 * change what a letter to the manufacturer says.
 */
const LETTERHEAD_NAME = "YADEA HUSSAIN MOTORS";

export function TransferLetter() {
  const [f, setF] = useState({
    date: new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" }),
    fromDealer: "",
    model: "",
    color: "",
    chassisNo: "",
    motorNo: "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  /**
   * Print THIS block only. `window.print()` prints the whole document, so the
   * letter used to come out behind four other tools. Tag the body and this
   * block, print, then clean up — `afterprint` covers the case where the user
   * cancels the dialog, which a plain timeout would not.
   */
  const printLetterOnly = () => {
    const block = document.getElementById("fmt-transfer-letter");
    if (!block) return window.print();

    document.body.classList.add("printing-one");
    block.classList.add("is-printing");

    const cleanup = () => {
      document.body.classList.remove("printing-one");
      block.classList.remove("is-printing");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  return (
    <div id="fmt-transfer-letter" data-print-block className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-lg font-bold">Inter-Dealership Transfer Request</h2>
          <p className="text-sm text-ink-faint">
            Fill what you know and print, or leave blank and print a stack to fill by hand.
          </p>
        </div>
        <button onClick={printLetterOnly} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 active:scale-95">
          Print
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden">
        {(
          [
            ["date", "Date"],
            ["fromDealer", "Transfer FROM (dealership)"],
            ["model", "Model"],
            ["color", "Colour"],
            ["chassisNo", "Chassis No"],
            ["motorNo", "Motor No"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="text-sm">
            <span className="mb-1 block font-medium">{label}</span>
            <input
              value={f[k]}
              onChange={(e) => set(k)(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-500"
            />
          </label>
        ))}
      </div>

      {/* ---- The printable letter itself ---- */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-8 text-ink print:mt-0 print:border-0 print:p-0">
        <div className="border-b-2 border-danger pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-danger">{LETTERHEAD_NAME}</p>
              <p className="text-xs font-semibold text-ink-soft">Globally No.1</p>
              <p className="mt-2 text-xs text-ink-soft">STRN Number: 3277876272668</p>
            </div>
            <div className="text-right text-xs font-semibold text-ink-soft">
              <p>SALES</p>
              <p>SERVICE</p>
              <p>S-PART</p>
            </div>
          </div>
          <div className="mt-2 bg-ink px-3 py-1.5 text-right">
            <p className="text-lg font-bold text-surface">{LETTERHEAD_NAME}</p>
          </div>
          <p className="mt-2 text-center text-sm font-semibold">
            Authorized Dealer: <span className="text-danger">Yadea Motors Pakistan</span>
          </p>
          <p className="mt-1 border-t border-line pt-1 text-center text-xs">
            Plaza # 27, Mini Ext 1, Bahria Town Phase 7, Rawalpindi. Ph: 0310-7208429, 0316-7613547
          </p>
        </div>

        <div className="mt-6 flex items-end justify-between text-sm">
          <p className="italic">Ref.: ______________________</p>
          <p className="italic">Date: {f.date || "________________"}</p>
        </div>

        <div className="mt-6 space-y-3 text-sm leading-relaxed">
          <p>
            <span className="italic">To:</span> Sales &amp; Distribution Management, YADEA Head Office.
          </p>
          <p>
            <span className="italic">Subject:</span>{" "}
            <span className="font-semibold">
              Approval Request for Inter-Dealership Vehicle Transfer{f.model ? ` — ${f.model}` : ""}
            </span>
          </p>
          <p>Dear Management Team,</p>
          <p>
            Please accept this formal request to approve the transfer of the following vehicle from{" "}
            <span className="font-semibold">{f.fromDealer || "________________________"}</span>, to our
            authorized dealership <span className="font-semibold">{LETTERHEAD_NAME}</span>. The specific details
            of the vehicle requested for transfer are as follows:
          </p>

          <div className="ml-4 space-y-1.5">
            <p>Model: <Blank v={f.model} /></p>
            <p>Color: <Blank v={f.color} /></p>
            <p>Chassis No: <Blank v={f.chassisNo} w="18rem" /></p>
            <p>Motor No: <Blank v={f.motorNo} w="18rem" /></p>
          </div>

          <p>
            Kindly grant the necessary approvals so we may coordinate the logistics and delivery
            documentation accordingly.
          </p>
          <p>Thank you for your prompt assistance and cooperation.</p>
          <p>Sincerely,</p>
        </div>

        {/* Signature + stamp space. No name printed - Sir's instruction. */}
        <div className="mt-10 flex items-end justify-between">
          <div>
            <div className="h-16 w-56 border-b border-ink" />
            <p className="mt-1 text-sm font-medium">Branch Manager</p>
            <p className="text-sm">{LETTERHEAD_NAME}</p>
          </div>
          <div className="flex h-28 w-40 items-center justify-center rounded-full border border-dashed border-line">
            <span className="text-xs text-ink-faint">Stamp</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A filled value, or a ruled blank of the right length to write on. */
function Blank({ v, w = "12rem" }: { v: string; w?: string }) {
  if (v.trim()) return <span className="font-semibold">{v}</span>;
  return <span className="inline-block border-b border-ink align-baseline" style={{ width: w }} />;
}
