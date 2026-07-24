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
  fetchDoctorAppointments,
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
  const [notif, unreadMessages, compliance, locale, tourAppointments] = await Promise.all([
    fetchDoctorNotifications(false),
    fetchDoctorUnreadMessageCount(),
    fetchDoctorComplianceStatus(),
    getPageLocale(),
    // Minimal page just to find one appointment id to walk the tour through
    // (steps 9-12 below) — no filters, first page is enough.
    fetchDoctorAppointments({ page: "1", pageSize: "5" }),
  ]);
  const { doctor: d, common } = loadLocaleBundle(locale);
  // The tour prefers an upcoming (not cancelled/completed) appointment so the
  // consultation workspace steps land somewhere still actionable; falls back
  // to any appointment, then to the sample-data demo block if the doctor has
  // none yet.
  const tourAppointmentId = tourAppointments.ok
    ? (tourAppointments.data.items.find((a) => a.status !== "CANCELLED" && a.status !== "COMPLETED") ??
        tourAppointments.data.items[0])?.id
    : undefined;

  // Cross-page workflow walkthrough (PortalTour `route`/`?tab=` support):
  // steps 3-12 hop across availability → calendar → appointments, ending on
  // the consultation workspace (real appointment tabs when one exists,
  // otherwise the sample-data demo block on the appointments page).
  const workspaceSteps = tourAppointmentId
    ? [
        { route: `/doctor/appointments/${tourAppointmentId}`, target: "appointment-tabs", title: d.tour.steps.demoAppointment.title, body: d.tour.steps.demoAppointment.body },
        { route: `/doctor/appointments/${tourAppointmentId}?tab=consultation`, target: "soap-form", title: d.tour.steps.demoSoap.title, body: d.tour.steps.demoSoap.body },
        { route: `/doctor/appointments/${tourAppointmentId}?tab=forms`, target: "appointment-forms", title: d.tour.steps.demoForms.title, body: d.tour.steps.demoForms.body },
        { route: `/doctor/appointments/${tourAppointmentId}?tab=documents`, target: "appointment-documents", title: d.tour.steps.demoDocuments.title, body: d.tour.steps.demoDocuments.body },
      ]
    : [
        { target: "demo-appointment", title: d.tour.steps.demoAppointment.title, body: d.tour.steps.demoAppointment.body },
        { target: "demo-soap", title: d.tour.steps.demoSoap.title, body: d.tour.steps.demoSoap.body },
        { target: "demo-forms", title: d.tour.steps.demoForms.title, body: d.tour.steps.demoForms.body },
        { target: "demo-documents", title: d.tour.steps.demoDocuments.title, body: d.tour.steps.demoDocuments.body },
      ];
  const tourSteps = [
    { title: d.tour.steps.welcome.title, body: d.tour.steps.welcome.body },
    { target: "/doctor", title: d.tour.steps.overview.title, body: d.tour.steps.overview.body },
    { route: "/doctor/availability", target: "availability-form", title: d.tour.steps.availabilityForm.title, body: d.tour.steps.availabilityForm.body },
    { target: "availability-week", title: d.tour.steps.availabilityWeek.title, body: d.tour.steps.availabilityWeek.body },
    { target: "availability-windows", title: d.tour.steps.availabilityWindows.title, body: d.tour.steps.availabilityWindows.body },
    { route: "/doctor/calendar", target: "calendar-add", title: d.tour.steps.calendarAdd.title, body: d.tour.steps.calendarAdd.body },
    { target: "calendar-timeoff", title: d.tour.steps.calendarTimeoff.title, body: d.tour.steps.calendarTimeoff.body },
    { route: "/doctor/appointments", target: "appointments-summary", title: d.tour.steps.appointmentsSummary.title, body: d.tour.steps.appointmentsSummary.body },
    ...workspaceSteps,
    // Route back explicitly — the previous step may have left the tour on
    // the appointment detail page (a route the sidebar link doesn't cover).
    { route: "/doctor/forms", target: "/doctor/forms", title: d.tour.steps.forms.title, body: d.tour.steps.forms.body },
    { target: "/doctor/invoices", title: d.tour.steps.invoices.title, body: d.tour.steps.invoices.body },
    { target: "topbar-notifications", title: d.tour.steps.notifications.title, body: d.tour.steps.notifications.body },
    { target: "/doctor/profile", title: d.tour.steps.profile.title, body: d.tour.steps.profile.body },
  ];
  const NOTIF_TYPE_LABEL: Record<string, string> = {
    APPOINTMENT_ASSIGNED: d.notifications.appointmentAssigned,
    INTERNAL_MESSAGE: d.notifications.internalMessage,
    PATIENT_MESSAGE: d.notifications.patientMessage,
    // Patient replies in the consultation chat arrive as MESSAGE_REPLY —
    // same thing from the doctor's point of view.
    MESSAGE_REPLY: d.notifications.patientMessage,
    CONSULT_SIGNED: d.notifications.consultSigned,
    EXAM_LOGGED: d.notifications.examLogged,
    FORM_SUBMITTED: d.notifications.formSubmitted,
  };
  if (notif.ok) {
    unreadCount = notif.data.unreadCount;
    notifications = notif.data.items.slice(0, 10).map((n) => {
      const appointmentId = n.payload?.appointmentId;
      const who = n.payload?.byUserName?.trim() || null;
      const label = NOTIF_TYPE_LABEL[n.type] ?? humanizeNotificationType(n.type);
      return {
        id: n.id,
        // Name the sender/actor when the payload carries one — a bell entry
        // that can't say who acted is unactionable.
        title: who ? `${label} · ${who}` : label,
        body: n.payload?.snippet ?? null,
        href: doctorNotificationHref(n.type, appointmentId),
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
      tour={{
        steps: tourSteps,
        labels: { ...d.tour.labels },
        storageKey: "gh_tour_done_doctor",
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

/** Where a doctor notification should land. Patient chat opens in place in
 *  the doctor Messages inbox; internal notes and clinical events live on the
 *  appointment workspace, so send those there instead. */
function doctorNotificationHref(type: string, appointmentId?: string): string {
  if (!appointmentId) return "/doctor/notifications";
  switch (type) {
    case "PATIENT_MESSAGE":
    case "MESSAGE_REPLY":
      return `/doctor/messages?open=${appointmentId}`;
    case "INTERNAL_MESSAGE":
      return `/doctor/appointments/${appointmentId}?tab=messages#internal-notes`;
    default:
      return `/doctor/appointments/${appointmentId}`;
  }
}

/** "APPOINTMENT_RESCHEDULED" → "Appointment rescheduled". Fallback for
 *  notification types that have no locale label yet — better than leaking
 *  the raw enum into the bell. */
function humanizeNotificationType(type: string): string {
  const words = type.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
