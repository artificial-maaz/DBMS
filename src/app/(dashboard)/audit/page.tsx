import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLog, user } from "@/db/schema";
import { requireStaff } from "@/lib/session";

/** Audit log viewer — Creator/Owner only. The unblinking eye. */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!["creator", "owner"].includes(profile.role)) redirect("/dashboard");
  const { entity } = await searchParams;

  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      details: auditLog.details,
      userName: user.name,
      userEmail: user.email,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .innerJoin(user, eq(auditLog.userId, user.id))
    .where(entity ? eq(auditLog.entity, entity) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  const entities = ["vehicle", "customer", "invoice", "ledger_entry", "branch", "staff_profile"];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Audit Log</h1>

      <form method="get" className="flex gap-3">
        <select name="entity" defaultValue={entity ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          <option value="">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>{e.replace("_", " ")}</option>
          ))}
        </select>
        <button className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-700">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">No audit entries.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                  {new Date(r.createdAt).toLocaleString("en-PK")}
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-medium">{r.userName}</span>
                  <span className="block text-xs text-slate-400">{r.userEmail}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-xs text-indigo-700">{r.action}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {r.entity} <span className="font-mono text-xs">#{r.entityId}</span>
                </td>
                <td className="max-w-xs px-4 py-2.5">
                  <code className="block truncate text-xs text-slate-500">
                    {r.details ? JSON.stringify(r.details) : "—"}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Showing the latest 200 entries. Every mutation in the system lands here automatically.</p>
    </div>
  );
}
