import { redirect } from "next/navigation";
import { canImport, TEMPLATES } from "@/modules/import/service";
import { requireStaff } from "@/lib/session";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const { profile } = await requireStaff();
  if (!canImport(profile.role)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bulk Import</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Import vehicles, customers, or visitors from a CSV file. All-or-nothing: if any row has a
          problem, nothing is saved and you get the full error list — fix and re-upload safely.
        </p>
      </div>
      <ImportForm templates={TEMPLATES} />
    </div>
  );
}
