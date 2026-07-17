import "@/app/portal.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

// A11Y-001 (WCAG 2.4.2): distinguishing title for doctor-portal pages via the
// root template ("Doctor · …"). Child pages with their own title override.
export const metadata: Metadata = { title: "Doctor" };
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
  MessagesSquare,
  Receipt,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  fetchDoctorComplianceStatus,
  fetchDoctorNotifications,
  fetchDoctorUnreadMessageCount,
} from "@/lib/api/doctor-api";
import { ComplianceBanner } from "./_components/compliance-banner";
import { PortalShell, type PortalNavItem, type PortalNavGroup } from "@/components/portal-shell";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { supportedLocaleCodes } from "@/lib/i18n/types";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";

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
  if (user.role === "CORPORATE_ADMIN") redirect("/corporate");
  if (user.role !== "DOCTOR") redirect("/unauthorized");

  async function logoutAction() {
    "use server";
    const jar = await cookies();
    jar.delete(AUTH_COOKIE_NAME);
    redirect("/login?next=/doctor");
  }

  // Pull the full notification list (not onlyUnread) so the popover
  // can show both new + recently-read items. Doctor-only by this
  // point — earlier guards redirect every other role.
  let unreadCount = 0;
  let notifications: {
    id: string;
    title: string;
    body: string | null;
    href: string | null;
    createdAt: string;
    readAt: string | null;
  }[] = [];
  const [notif, unreadMessages, compliance, locale] = await Promise.all([
    fetchDoctorNotifications(false),
    fetchDoctorUnreadMessageCount(),
    fetchDoctorComplianceStatus(),
    getPageLocale(),
  ]);
  const { doctor: d, common } = loadLocaleBundle(locale);
  const NOTIF_TYPE_LABEL: Record<string, string> = {
    APPOINTMENT_ASSIGNED: d.notifications.appointmentAssigned,
    INTERNAL_MESSAGE: d.notifications.internalMessage,
    PATIENT_MESSAGE: d.notifications.patientMessage,
    CONSULT_SIGNED: d.notifications.consultSigned,
    EXAM_LOGGED: d.notifications.examLogged,
    FORM_SUBMITTED: d.notifications.formSubmitted,
  };
  if (notif.ok) {
    unreadCount = notif.data.unreadCount;
    notifications = notif.data.items.slice(0, 10).map((n) => {
      const appointmentId = n.payload?.appointmentId;
      return {
        id: n.id,
        title: NOTIF_TYPE_LABEL[n.type] ?? n.type,
        body: n.payload?.snippet ?? null,
        href: appointmentId
          ? `/doctor/messages?open=${appointmentId}`
          : "/doctor/notifications",
        createdAt: n.createdAt,
        readAt: n.readAt,
      };
    });
  }

  // Single "Profile" link regardless of market count — the profile editor
  // is one page with a tab per market (?tab=<country-slug>).
  const profileItems: PortalNavItem[] = [
    { href: "/doctor/profile", label: d.nav.profile, icon: <UserCog className="size-4" aria-hidden /> },
  ];

  const groups: PortalNavGroup[] = [
    {
      label: d.nav.groupOverview,
      items: [
        { href: "/doctor", label: d.nav.overview, icon: <LayoutDashboard className="size-4" aria-hidden /> },
      ],
    },
    {
      label: d.nav.groupSchedule,
      items: [
        { href: "/doctor/appointments", label: d.nav.appointments, icon: <Calendar className="size-4" aria-hidden /> },
        { href: "/doctor/messages", label: d.nav.messages, icon: <MessagesSquare className="size-4" aria-hidden />, badge: unreadMessages },
        { href: "/doctor/calendar", label: d.nav.calendar, icon: <CalendarRange className="size-4" aria-hidden /> },
        { href: "/doctor/availability", label: d.nav.availability, icon: <CalendarClock className="size-4" aria-hidden /> },
      ],
    },
    {
      label: d.nav.groupPractice,
      items: [
        { href: "/doctor/patients", label: d.nav.patients, icon: <Users className="size-4" aria-hidden /> },
        { href: "/doctor/services", label: d.nav.myServices, icon: <Stethoscope className="size-4" aria-hidden /> },
        { href: "/doctor/forms", label: d.nav.forms, icon: <FileText className="size-4" aria-hidden /> },
      ],
    },
    {
      label: d.nav.groupFinance,
      items: [
        { href: "/doctor/invoices", label: d.nav.invoices, icon: <Receipt className="size-4" aria-hidden /> },
        { href: "/doctor/reports", label: d.nav.reports, icon: <BarChart3 className="size-4" aria-hidden /> },
      ],
    },
    {
      label: d.nav.groupAccount,
      items: [
        {
          href: "/doctor/notifications",
          label: d.nav.notifications,
          icon: <Bell className="size-4" aria-hidden />,
          badge: unreadCount,
        },
        ...profileItems,
        { href: "/doctor/security", label: d.nav.security, icon: <ShieldCheck className="size-4" aria-hidden /> },
        { href: "/doctor/confidentiality", label: d.nav.confidentiality, icon: <ScrollText className="size-4" aria-hidden /> },
      ],
    },
  ];

  return (
    <PortalShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      portalKey="doctor"
      groups={groups}
      portalLabel={d.portal.label}
      rootHref="/doctor"
      rootBreadcrumb={d.portal.sectionLabel}
      signOutAction={logoutAction}
      accountHref="/doctor/profile"
      notifications={notifications}
      notificationsUnreadCount={unreadCount}
      notificationsViewAllHref="/doctor/notifications"
      notificationsEmptyMessage={d.notifications.emptyMessage}
      locale={locale}
      availableLocales={[...supportedLocaleCodes]}
      chrome={{
        ...common.portalChrome,
        slogan: d.portal.slogan,
        notificationsAriaLabel: d.portal.notificationsAriaLabel,
        notificationsHeading: d.portal.notificationsHeading,
        notificationsUnreadSuffix: d.portal.notificationsUnreadSuffix,
        notificationsUnreadSr: d.portal.notificationsUnreadSr,
        notificationsViewAll: d.portal.notificationsViewAll,
      }}
      banner={
        compliance.ok &&
        (!compliance.data.confidentialityAccepted || !compliance.data.twoFactorEnabled) ? (
          <ComplianceBanner
            confidentialityAccepted={compliance.data.confidentialityAccepted}
            twoFactorEnabled={compliance.data.twoFactorEnabled}
            copy={d.complianceBanner}
          />
        ) : null
      }
    >
      {children}
      <UnsavedChangesGuard
        i18n={{
          title: common.portalChrome.unsavedChangesTitle,
          body: common.portalChrome.unsavedChangesBody,
          keepEditing: common.portalChrome.unsavedChangesKeepEditing,
          discard: common.portalChrome.unsavedChangesDiscard,
        }}
      />
    </PortalShell>
  );
}
