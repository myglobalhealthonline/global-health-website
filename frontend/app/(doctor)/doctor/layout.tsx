import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bell,
  Calendar,
  CalendarClock,
  CalendarRange,
  FileText,
  LayoutDashboard,
  Receipt,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  fetchDoctorMe,
  fetchDoctorNotifications,
  fetchDoctorUnreadMessageCount,
} from "@/lib/api/doctor-api";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";

/**
 * Doctor portal layout. Reuses `PortalShell` so admin / doctor / patient
 * share one chrome (dark sidebar, light header, breadcrumb, user menu).
 *
 * Auth gating: DOCTOR only. Admins land back on /admin (no peeking into
 * a doctor's workspace by URL — they have their own portal). Patients
 * land on /account.
 */
export default async function DoctorLayout({ children }: { children: ReactNode }) {
  const user = await getServerAuthUser();
  if (!user) redirect("/login?next=/doctor");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role !== "DOCTOR") redirect("/account");

  async function logoutAction() {
    "use server";
    const jar = await cookies();
    jar.delete(AUTH_COOKIE_NAME);
    redirect("/login?next=/doctor");
  }

  // Pull the full notification list (not onlyUnread) so the popover
  // can show both new + recently-read items. Doctor-only by this
  // point — earlier guards redirect every other role.
  const NOTIF_TYPE_LABEL: Record<string, string> = {
    APPOINTMENT_ASSIGNED: "Appointment assigned",
    INTERNAL_MESSAGE: "Internal message",
    CONSULT_SIGNED: "Consultation signed",
    EXAM_LOGGED: "Exam result logged",
    FORM_SUBMITTED: "Form submitted",
  };
  let unreadCount = 0;
  let notifications: {
    id: string;
    title: string;
    body: string | null;
    href: string | null;
    createdAt: string;
    readAt: string | null;
  }[] = [];
  const [notif, unreadMessages, me] = await Promise.all([
    fetchDoctorNotifications(false),
    fetchDoctorUnreadMessageCount(),
    fetchDoctorMe(),
  ]);
  if (notif.ok) {
    unreadCount = notif.data.unreadCount;
    notifications = notif.data.items.slice(0, 10).map((n) => {
      const appointmentId = n.payload?.appointmentId;
      return {
        id: n.id,
        title: NOTIF_TYPE_LABEL[n.type] ?? n.type,
        body: n.payload?.snippet ?? null,
        href: appointmentId ? `/doctor/appointments/${appointmentId}` : "/doctor/notifications",
        createdAt: n.createdAt,
        readAt: n.readAt,
      };
    });
  }

  // One "Profile" link, unless the doctor practices in 2+ countries — then
  // give each its own entry ("Profile (Ireland)", "Profile (Portugal)") so
  // they can jump straight to that country's editor.
  const activeMarkets = me.ok ? me.data.doctor.markets.filter((m) => m.active) : [];
  const profileItems: PortalNavItem[] =
    activeMarkets.length >= 2
      ? activeMarkets.map((m) => ({
          href: `/doctor/profile/${m.country.slug}`,
          label: `Profile (${m.country.name})`,
          icon: <UserCog className="size-4" aria-hidden />,
        }))
      : [{ href: "/doctor/profile", label: "Profile", icon: <UserCog className="size-4" aria-hidden /> }];

  const sections: PortalNavItem[] = [
    { href: "/doctor", label: "Overview", icon: <LayoutDashboard className="size-4" aria-hidden /> },
    { href: "/doctor/appointments", label: "Appointments", icon: <Calendar className="size-4" aria-hidden />, badge: unreadMessages },
    { href: "/doctor/calendar", label: "Calendar", icon: <CalendarRange className="size-4" aria-hidden /> },
    { href: "/doctor/availability", label: "Availability", icon: <CalendarClock className="size-4" aria-hidden /> },
    { href: "/doctor/services", label: "My Services", icon: <Stethoscope className="size-4" aria-hidden /> },
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
    ...profileItems,
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
      accountHref="/doctor/profile"
      notifications={notifications}
      notificationsUnreadCount={unreadCount}
      notificationsViewAllHref="/doctor/notifications"
      notificationsEmptyMessage="No notifications yet."
    >
      {children}
    </PortalShell>
  );
}
