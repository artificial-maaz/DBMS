"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 print:hidden"
    >
      🖨 Print / Save PDF
    </button>
  );
}
