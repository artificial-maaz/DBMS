import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageJobs, canUseWorkshop, getJobDetail, listBranchParts } from "@/modules/workshop/service";
import { listRates } from "@/modules/labor-rates/service";
import { requireStaff } from "@/lib/session";
import { redirect } from "next/navigation";
import { JobActions } from "../workshop-forms";
import { AddJobPart, RemoveJobPart } from "./job-parts";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireStaff();
  if (!canUseWorkshop(profile.role)) redirect("/dashboard");
  const { id } = await params;

  const data = await getJobDetail({ id: Number(id), role: profile.role, ownBranchId: profile.branchId });
  if (!data) notFound();
  const { job, customer, branch, mechanic, lines } = data;

  const parts = await listBranchParts(job.branchId);
  const rateOpts = (await listRates(true)).map((r) => ({ serviceName: r.serviceName, price: r.price }));
  const fmt = (v: string | number) => `Rs. ${Number(v).toLocaleString("en-PK")}`;
  const laborDue = job.warrantyStatus === "free_coupon" ? 0 : Number(job.laborCharge);
  const total = laborDue + Number(job.partsCharge);
  const editable = job.status === "open" || job.status === "in_progress";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/workshop" className="text-sm text-slate-500 hover:text-slate-800">← Back to Workshop</Link>
        <JobActions
          jobId={job.id}
          status={job.status}
          isManager={canManageJobs(profile.role)}
          rates={rateOpts}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="font-mono text-lg font-semibold text-indigo-700">{job.jobNo}</h1>
            <p className="text-sm text-slate-500">{branch?.name} · {new Date(job.createdAt).toLocaleString("en-PK")}</p>
          </div>
          <div className="text-right text-sm">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize">
              {job.status.replace("_", " ")}
            </span>
            {job.warrantyStatus === "free_coupon" && (
              <p className="mt-1 text-xs font-medium text-amber-600">Free coupon #{job.couponNo} — labor waived</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Customer</p>
            <p className="font-medium">{customer?.fullName}</p>
            <p className="text-slate-500">{customer?.phone}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Bike / Mechanic</p>
            <p className="font-mono text-xs">{job.chassisNo}</p>
            <p className="text-slate-500">
              {job.odometerKm ? `${job.odometerKm} km · ` : ""}
              {mechanic?.name ?? "Unassigned"}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <span className="text-xs font-semibold uppercase text-slate-400">Complaints: </span>
          {job.complaints}
        </div>

        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Parts Used</h2>
          {lines.length === 0 && <p className="mb-3 text-sm text-slate-400">No parts consumed yet.</p>}
          {lines.length > 0 && (
            <table className="mb-3 w-full text-sm">
              <thead className="border-y border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Part</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit</th>
                  <th className="py-2 text-right">Amount</th>
                  {editable && <th className="py-2 text-right">—</th>}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-2">{l.partName}</td>
                    <td className="py-2 text-right">{l.qty}</td>
                    <td className="py-2 text-right">{fmt(l.unitPrice)}</td>
                    <td className="py-2 text-right">{fmt(l.amount)}</td>
                    {editable && (
                      <td className="py-2 text-right">
                        <RemoveJobPart lineId={l.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {editable && <AddJobPart jobId={job.id} parts={parts} />}
        </div>

        <div className="ml-auto mt-6 w-64 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
          <Row k="Labor" v={job.warrantyStatus === "free_coupon" ? `${fmt(job.laborCharge)} → waived` : fmt(job.laborCharge)} />
          <Row k="Parts" v={fmt(job.partsCharge)} />
          <div className="border-t border-slate-200 pt-1.5">
            <Row k="Total Due" v={fmt(total)} bold />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : "text-slate-600"}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
