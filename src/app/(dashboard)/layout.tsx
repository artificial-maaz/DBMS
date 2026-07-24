import { Shell } from "@/components/shell";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { getSettings } from "@/modules/settings/service";
import { pendingCount } from "@/modules/approvals/service";
import { unreadCount } from "@/modules/notifications/service";
import { requireStaff } from "@/lib/session";

/** Everything inside this group is behind auth — guard runs on the server. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireStaff();
  const [settings, approvals, notifications] = await Promise.all([
    getSettings(), // #29: DB-driven branding
    pendingCount({ userId: user.id, role: profile.role, branchId: profile.branchId }),
    unreadCount({ userId: user.id, role: profile.role }),
  ]);

  return (
    <Shell
      sidebar={
        <Sidebar
          role={profile.role}
          appName={settings.companyName}
          logoDataUrl={settings.logoDataUrl}
          pendingApprovals={approvals}
        />
      }
      topbar={<Topbar name={user.name ?? user.email} role={profile.role} notifications={notifications} />}
    >
      {children}
    </Shell>
  );
}
