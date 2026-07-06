"use server";

import { revalidatePath } from "next/cache";
import { importCsv, type ImportType, type RowError } from "@/modules/import/service";
import { requireStaff } from "@/lib/session";

export type ImportState = { ok: boolean; imported?: number; errors?: RowError[] } | null;

export async function importCsvAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { user, profile } = await requireStaff();

  const type = String(formData.get("type")) as ImportType;
  if (!["vehicles", "customers", "visitors"].includes(type)) {
    return { ok: false, errors: [{ row: 0, error: "Unknown import type." }] };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: [{ row: 0, error: "Choose a CSV file first." }] };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, errors: [{ row: 0, error: "File too large (max 2 MB)." }] };
  }

  const text = await file.text();
  const result = await importCsv({ userId: user.id, role: profile.role }, type, text);

  if (result.ok) {
    revalidatePath("/inventory");
    revalidatePath("/customers");
    return { ok: true, imported: result.imported };
  }
  return { ok: false, errors: result.errors };
}
