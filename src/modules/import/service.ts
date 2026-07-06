import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { customers, vehicles, visitors } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { csvToObjects } from "@/lib/csv";
import { createVehicleSchema } from "@/modules/inventory/validators";
import { createCustomerSchema } from "@/modules/customers/validators";
import { createVisitorSchema } from "@/modules/visitors/validators";

type Actor = { userId: string; role: string };
export type ImportType = "vehicles" | "customers" | "visitors";
export type RowError = { row: number; error: string };

export const canImport = (role: string) => ["creator", "owner"].includes(role);

const MAX_ROWS = 2000;

export const TEMPLATES: Record<ImportType, { headers: string; example: string }> = {
  vehicles: {
    headers: "make,model,variant,color,chassis_no,engine_no,purchase_price,sale_price,branch,notes",
    example: "Yadea,G5 Pro,72V 38Ah,Black,LR4F9MDC5S6935922,10ZW6050312YEB,161000,174000,Head Office,",
  },
  customers: {
    headers: "full_name,phone,cnic,email,city,address,branch",
    example: "Muhammad Ahmad,03001234567,42201-1234567-1,,Lahore,House 12 DHA,Head Office",
  },
  visitors: {
    headers: "full_name,phone,cnic,interest,budget,source,follow_up_date,notes,branch",
    example: "Ali Raza,03007654321,,Yadea T5L black,250000,walk_in,2026-07-15,,Head Office",
  },
};

/**
 * ALL-OR-NOTHING import (#19): every row is validated first; if even one row
 * fails, NOTHING is inserted and the full error list comes back. This makes
 * "fix the file and re-upload" always safe — no half-imported batches, no
 * duplicate rows from retries.
 */
export async function importCsv(actor: Actor, type: ImportType, csvText: string) {
  if (!canImport(actor.role)) return { ok: false as const, errors: [{ row: 0, error: "Not allowed." }] };

  const { rows } = csvToObjects(csvText);
  if (rows.length === 0) return { ok: false as const, errors: [{ row: 0, error: "No data rows found in the file." }] };
  if (rows.length > MAX_ROWS) {
    return { ok: false as const, errors: [{ row: 0, error: `Too many rows (max ${MAX_ROWS} per file).` }] };
  }

  // Branch NAME → id (case-insensitive) — humans write "Head Office", not "1".
  const branchList = await db.query.branches.findMany();
  const branchByName = new Map(branchList.map((b) => [b.name.trim().toLowerCase(), b.id]));

  // CSV headers are snake_case (human-friendly); zod schemas expect camelCase.
  const KEYMAP: Record<string, string> = {
    full_name: "fullName",
    chassis_no: "chassisNo",
    engine_no: "engineNo",
    purchase_price: "purchasePrice",
    sale_price: "salePrice",
    follow_up_date: "followUpDate",
  };

  const errors: RowError[] = [];
  const resolved: Record<string, unknown>[] = [];

  rows.forEach((raw, idx) => {
    const rowNo = idx + 2; // +1 header, +1 human 1-based
    const branchId = branchByName.get((raw.branch ?? "").toLowerCase());
    if (!branchId) {
      errors.push({ row: rowNo, error: `Unknown branch "${raw.branch}" — must exactly match a branch name.` });
      return;
    }

    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) mapped[KEYMAP[k] ?? k] = v;
    if (type === "visitors" && !mapped.source) mapped.source = "walk_in";

    const schema =
      type === "vehicles" ? createVehicleSchema : type === "customers" ? createCustomerSchema : createVisitorSchema;
    const parsed = schema.safeParse({ ...mapped, branchId });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      errors.push({ row: rowNo, error: `${first?.path.join(".") || "row"}: ${first?.message ?? "invalid"}` });
      return;
    }
    resolved.push({ ...(parsed.data as Record<string, unknown>), branchId });
  });

  // Vehicles: chassis/engine must be unique — catch duplicates BEFORE inserting
  // (within the file and against the database) so errors carry row numbers
  // instead of one opaque constraint failure.
  if (type === "vehicles" && resolved.length > 0) {
    const seen = new Map<string, number>();
    resolved.forEach((r, i) => {
      for (const key of [`c:${r.chassisNo}`, `e:${r.engineNo}`]) {
        const firstRow = seen.get(key);
        if (firstRow !== undefined) {
          errors.push({ row: i + 2, error: `Duplicate ${key.startsWith("c") ? "chassis" : "engine"} no. within the file (also on row ${firstRow}).` });
        } else {
          seen.set(key, i + 2);
        }
      }
    });
    const chassisList = resolved.map((r) => String(r.chassisNo));
    const existing = await db
      .select({ chassisNo: vehicles.chassisNo })
      .from(vehicles)
      .where(inArray(vehicles.chassisNo, chassisList));
    for (const e of existing) {
      const i = resolved.findIndex((r) => r.chassisNo === e.chassisNo);
      errors.push({ row: i + 2, error: `Chassis ${e.chassisNo} already exists in inventory.` });
    }
  }

  if (errors.length > 0) {
    return { ok: false as const, errors: errors.sort((a, b) => a.row - b.row) };
  }

  try {
    await db.transaction(async (tx) => {
      if (type === "vehicles") {
        await tx.insert(vehicles).values(
          resolved.map((r) => ({
            make: String(r.make),
            model: String(r.model),
            variant: (r.variant as string) || null,
            color: (r.color as string) || null,
            chassisNo: String(r.chassisNo),
            engineNo: String(r.engineNo),
            purchasePrice: (r.purchasePrice as string) || null,
            salePrice: (r.salePrice as string) || null,
            branchId: r.branchId as number,
            notes: (r.notes as string) || null,
            createdBy: actor.userId,
          })),
        );
      } else if (type === "customers") {
        await tx.insert(customers).values(
          resolved.map((r) => ({
            fullName: String(r.fullName),
            phone: String(r.phone),
            cnic: (r.cnic as string) || null,
            email: (r.email as string) || null,
            city: (r.city as string) || null,
            address: (r.address as string) || null,
            branchId: r.branchId as number,
            createdBy: actor.userId,
          })),
        );
      } else {
        await tx.insert(visitors).values(
          resolved.map((r) => ({
            fullName: String(r.fullName),
            phone: String(r.phone),
            cnic: (r.cnic as string) || null,
            interest: (r.interest as string) || null,
            budget: (r.budget as string) || null,
            source: (r.source ?? "walk_in") as never,
            notes: (r.notes as string) || null,
            followUpDate: (r.followUpDate as string) || null,
            branchId: r.branchId as number,
            createdBy: actor.userId,
          })),
        );
      }
    });

    await writeAudit({
      userId: actor.userId,
      action: `import.${type}`,
      entity: type,
      entityId: "bulk",
      details: { rows: resolved.length },
    });

    return { ok: true as const, imported: resolved.length };
  } catch (e) {
    return {
      ok: false as const,
      errors: [{ row: 0, error: e instanceof Error ? e.message : "Import failed — nothing was saved." }],
    };
  }
}
