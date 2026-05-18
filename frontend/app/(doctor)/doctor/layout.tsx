import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bell,
  Calendar,
  FileText,
  LayoutDashboard,
  Receipt,
  UserCog,
  Users,
} from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { fetchDoctorNotifications } from "@/lib/api/doctor-api";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME?.trim() || "gh_auth";

/**
 * Doctor portal layout. Reuses `PortalShell` so admin / doctor / patient
 * share one chrome (dark sidebar, light header, breadcrumb, user menu).
 *
 * Auth gating is double-layered: this layout re-checks role server-side
 * AND the edge proxy at `frontend/proxy.ts` rejects /doctor/* for
 * non-doctor sessions before SSR runs.
 */
export default async function DoctorLayout({ children }: { children: ReactNode }) {
  const user = await getServerAuthUser();
  if (!user) redirect("/login?next=/doctor");
  // Only DOCTOR + ADMIN sessions may proceed. Patients land on /account.
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
    redirect("/account");
  }

  async function logoutAction() {
    "use server";
    const jar = await cookies();
    jar.delete(AUTH_COOKIE_NAME);
    redirect("/login?next=/doctor");
  }

  // Best-effort unread-count fetch for the bell badge on /notifications.
  let unreadCount = 0;
  if (user.role === "DOCTOR") {
    const notif = await fetchDoctorNotifications(true);
    if (notif.ok) unreadCount = notif.data.unreadCount;
  }

  const sections: PortalNavItem[] = [
    { href: "/doctor", label: "Overview", icon: <LayoutDashboard className="size-4" aria-hidden /> },
    { href: "/doctor/appointments", label: "Appointments", icon: <Calendar className="size-4" aria-hidden /> },
    { href: "/doctor/patients", label: "Patients", icon: <Users className="size-4" aria-hidden /> },
    { href: "/doctor/forms", label: "Forms", icon: <FileText className="size-4" aria-hidden /> },
    { href: "/doctor/invoices", label: "Invoices", icon: <Receipt className="size-4" aria-hidden /> },
    { href: "/doctor/reports", label: "Reports", icon: <BarChart3 className="size-4" aria-hidden /> },
    {
      href: "/doctor/notifications",
      label: "Notifications",
      icon: <Bell className="size-4" aria-hidden />,
      badge: unreadCount,
    },
    { href: "/doctor/profile", label: "Profile", icon: <UserCog className="size-4" aria-hidden /> },
  ];

  return (
    <PortalShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      sections={sections}
      portalLabel="Doctor portal"
      sectionLabel="Global"
      rootHref="/doctor"
      rootBreadcrumb="Doctor"
      signOutAction={logoutAction}
    >
      {children}
    </PortalShell>
  );
}
