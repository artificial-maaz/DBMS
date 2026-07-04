import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { requireStaff } from "@/lib/session";

/** Everything inside this group is behind auth — guard runs on the server. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireStaff();

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name ?? user.email} role={profile.role} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
