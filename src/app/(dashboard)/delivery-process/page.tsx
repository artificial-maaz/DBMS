import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { Runbook } from "./runbook";

/**
 * Delivery Process (Sir, 2026-08-15) — the counter SOP for a branch manager.
 *
 * Visible to everyone who serves a customer. Deliberately NOT restricted to
 * managers: an assistant covering the counter for ten minutes needs the same
 * procedure, and there is nothing confidential in it.
 */
export default async function DeliveryProcessPage() {
  const { profile } = await requireStaff();
  const allowed = ["creator", "owner", "branch_manager", "salesperson", "assistant"];
  if (!allowed.includes(profile.role)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold">Delivery Process</h1>
        <p className="text-sm text-ink-faint">
          The counter procedure, start to finish. Pick the case, answer the registration question, and work
          down. Print it and keep a copy at the counter until it is second nature.
        </p>
      </div>

      <Runbook />
    </div>
  );
}
