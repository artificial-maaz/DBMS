import { redirect } from "next/navigation";
import { canCreateSale, canManageCommission } from "@/modules/sales/permissions";
import { getSaleFormData } from "@/modules/sales/queries";
import { requireStaff } from "@/lib/session";
import { SaleForm } from "./sale-form";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!canCreateSale(profile.role)) redirect("/sales");
  const params = await searchParams;

  const { vehicles, customers, openBookings } = await getSaleFormData({
    role: profile.role,
    ownBranchId: profile.branchId,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New Sale</h1>
      <SaleForm
        vehicles={vehicles}
        customers={customers}
        showCommission={canManageCommission(profile.role)}
        initialCustomerId={params.customerId ?? ""}
        openBookings={openBookings}
      />
    </div>
  );
}
