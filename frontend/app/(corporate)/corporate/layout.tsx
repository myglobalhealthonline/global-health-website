import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClipboardList, LayoutDashboard, Settings, Users } from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { PortalShell, type PortalNavGroup } from "@/components/portal-shell";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";

/**
 * Corporate portal layout (role CORPORATE_ADMIN — a company's HR/admin).
 * Reuses `PortalShell` so it shares chrome with the doctor/patient portals.
 *
 * Auth gating: CORPORATE_ADMIN only. Other roles bounce to their own
 * portal so a corporate login can never see clinical surfaces.
 */
export default async function CorporateLayout({ children }: { children: ReactNode }) {
  const user = await getServerAuthUser();
  if (!user) redirect("/login?next=/corporate");
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "LOCAL_ADMIN") {
    redirect("/admin");
  }
  if (user.role === "DOCTOR") redirect("/doctor");
  if (user.role !== "CORPORATE_ADMIN") redirect("/account");

  async function logoutAction() {
    "use server";
    const jar = await cookies();
    jar.delete(AUTH_COOKIE_NAME);
    redirect("/login?next=/corporate");
  }

  const groups: PortalNavGroup[] = [
    {
      label: "Overview",
      items: [
        { href: "/corporate", label: "Dashboard", icon: <LayoutDashboard className="size-4" aria-hidden /> },
      ],
    },
    {
      label: "People",
      items: [
        { href: "/corporate/employees", label: "Employees", icon: <Users className="size-4" aria-hidden /> },
        { href: "/corporate/requests", label: "Requests", icon: <ClipboardList className="size-4" aria-hidden /> },
      ],
    },
    {
      label: "Company",
      items: [
        { href: "/corporate/settings", label: "Settings", icon: <Settings className="size-4" aria-hidden /> },
      ],
    },
  ];

  return (
    <PortalShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      portalKey="corporate"
      groups={groups}
      portalLabel="Corporate portal"
      rootHref="/corporate"
      rootBreadcrumb="Corporate"
      signOutAction={logoutAction}
      accountHref="/corporate/settings"
      notificationsEmptyMessage="No notifications yet."
    >
      {children}
    </PortalShell>
  );
}
