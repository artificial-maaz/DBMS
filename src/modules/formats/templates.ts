/**
 * WHATSAPP MESSAGE FORMATS (Sir, 2026-08-15).
 *
 * Every one of these is typed by hand today, several times a day, by people who
 * are also serving customers. They are the highest-frequency, lowest-value
 * keystrokes in the business — and the place a wrong chassis number or a missed
 * colour count enters the record.
 *
 * WhatsApp bold is a single asterisk pair (*like this*), NOT markdown's double.
 * Getting that wrong is the classic mistake and it renders as literal asterisks
 * in the group, so it is centralised here rather than retyped per template.
 *
 * The formats mirror what the branches already send, deliberately. Staff should
 * recognise the output as "our message", not "the software's message" — that is
 * what makes them use it instead of typing.
 */

export const b = (s: string) => `*${s}*`;

export type StockLine = { make: string; model: string; color: string | null; qty: number };

/**
 * Stock Report — grouped by company, one line per model+colour, with totals.
 * Built from live inventory so the count cannot drift from what is on the floor.
 */
export function stockReport(input: {
  branchName: string;
  date: string;
  lines: StockLine[];
  repairLines?: StockLine[];
  todaysSale?: string;
  cashInHand?: string;
}): string {
  // Sir's exact layout (2026-08-16). Model - Colour - Quantity, one company
  // heading per make, bold on the headings and the closing figures only.
  const row = (l: StockLine) =>
    [l.model, l.color, String(l.qty).padStart(2, "0")].filter(Boolean).join(" - ");

  const out: string[] = [];
  out.push(b(`Stock Report - ${input.branchName}`));
  out.push("");
  out.push(b(`Date ${input.date}`));
  out.push("");

  const makes = [...new Set(input.lines.map((l) => l.make))].sort();
  for (const make of makes) {
    out.push(b(make));
    const rows = input.lines
      .filter((l) => l.make === make)
      .sort((x, y) => x.model.localeCompare(y.model) || (x.color ?? "").localeCompare(y.color ?? ""));
    for (const r of rows) out.push(row(r));
    out.push("");
  }

  out.push(`Total bikes: ${input.lines.reduce((a, l) => a + l.qty, 0)}`);
  out.push("");

  const repair = input.repairLines ?? [];
  out.push(b("Repair Bikes"));
  if (repair.length === 0) out.push("Nil");
  else for (const r of repair) out.push(row(r));
  out.push("");
  out.push(`Total Repair Bikes: ${repair.reduce((a, l) => a + l.qty, 0)}`);
  out.push("");
  out.push(b("Today's Sale:") + ` ${input.todaysSale?.trim() || "nil"}`);
  out.push(b("Cash in hand:") + ` ${input.cashInHand?.trim() || "zero"}`);

  return out.join("\n");
}

/** Advance Booking / Token confirmation for the group. */
export function bookingMessage(i: {
  customerName: string;
  bike: string;
  colour: string;
  contactNo: string;
  amountReceived: string;
  dateOfPayment: string;
}): string {
  return [
    `${b("Customer Name:")} ${i.customerName}`,
    `${b("Bike:")} ${i.bike}`,
    `${b("Colour:")} ${i.colour}`,
    `${b("Contact No:")} ${i.contactNo}`,
    `${b("Amount Received:")} ${i.amountReceived}`,
    `${b("Date of Payment:")} ${i.dateOfPayment}`,
  ].join("\n");
}

/** Parts Purchase Demand for the official group. */
export function partsOrderMessage(i: {
  model: string;
  part: string;
  colour: string;
  qty: string;
  tagPerson?: string;
}): string {
  const lines = [
    b("Parts Purchase Demand"),
    "",
    `Model: ${i.model}`,
    `Part: ${i.part}`,
    `color: ${i.colour}`,
    `Qty: ${i.qty}`,
  ];
  if (i.tagPerson?.trim()) {
    lines.push("");
    lines.push(`@${i.tagPerson.trim()}`);
  }
  return lines.join("\n");
}

export type TransferUnit = { model: string; colour: string; qty: number };

/**
 * Bike Transfer announcement. Sir's format puts the count beside the model and
 * then each colour with its own count, e.g. "*T5-L* *2* Blue¹ Grey¹".
 */
export function transferMessage(i: { date: string; units: TransferUnit[]; toBranch: string }): string {
  const out: string[] = [b("Bike Transfer"), "", `${b("Date")} : ${b(i.date)}`, ""];

  const byModel = new Map<string, TransferUnit[]>();
  for (const u of i.units) {
    const list = byModel.get(u.model) ?? [];
    list.push(u);
    byModel.set(u.model, list);
  }

  for (const [model, units] of byModel) {
    const total = units.reduce((a, u) => a + u.qty, 0);
    const colours = units.map((u) => `${u.colour}${superscript(u.qty)}`).join(" ");
    out.push(`${b(model)} ${b(String(total))} ${colours}`);
  }

  out.push("");
  out.push(b(`To ${i.toBranch}`));
  return out.join("\n");
}

/** Sir's transfer format uses superscript digits for per-colour counts. */
function superscript(n: number): string {
  const map: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  };
  return String(n).split("").map((d) => map[d] ?? d).join("");
}
