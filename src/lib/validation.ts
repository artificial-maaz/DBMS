import { z } from "zod";

/**
 * Shared input normalizers. Staff type money as "1,50,000", "Rs. 150000",
 * phones as "+92 300-1234567", CNICs without dashes — all must just work.
 */

/**
 * BUG FIX (2026-07-06): a conditionally-rendered <input> (e.g. downpayment only
 * shown for installment plans, purchasePrice only shown to creator/owner,
 * commission only shown to roles that can set it) is simply ABSENT from
 * FormData when its element never mounted — that's `undefined`, not `""`.
 * Treat both the same so "field wasn't shown" behaves like "field left empty."
 */
const cleanMoney = (v: unknown) =>
  v == null ? "" : typeof v === "string" ? v.replace(/rs\.?/i, "").replace(/[,\s]/g, "") : v;

/** Required amount; commas/Rs./spaces tolerated. */
export const moneyRequired = z.preprocess(
  cleanMoney,
  z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (commas are fine)"),
);

/** Optional amount; empty stays "" (callers store null). */
export const moneyOptional = z.preprocess(
  cleanMoney,
  z.string().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter a valid amount (commas are fine)"),
);

/** Optional amount; empty becomes "0". */
export const moneyZero = z.preprocess(
  cleanMoney,
  z
    .string()
    .regex(/^(\d+(\.\d{1,2})?)?$/, "Enter a valid amount (commas are fine)")
    .transform((v) => (v === "" ? "0" : v)),
);

/**
 * Optional numeric id coming from a <select>: an unselected dropdown submits
 * "" (empty string), NOT undefined — and z.coerce.number("") === 0, which then
 * fails .positive() with a confusing "expected number to be >0". Map ""/null
 * to undefined BEFORE coercion. Use this for every optional id field.
 */
export const optionalId = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().int().positive().optional(),
);

/** "+92 300 1234567" / "0092..." / "0300-1234567" → "03001234567" */
export const phoneNumber = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    let s = v.replace(/[\s()./-]/g, "");
    if (s.startsWith("+92")) s = "0" + s.slice(3);
    else if (s.startsWith("0092")) s = "0" + s.slice(4);
    return s;
  },
  z.string().regex(/^0\d{9,10}$/, "Phone like 03001234567"),
);
