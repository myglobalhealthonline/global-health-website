import "@/app/portal.css";
import "flag-icons/css/flag-icons.min.css";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  fetchAdminCountries,
  fetchAdminNotifications,
  fetchAdminPendingServiceRequests,
  type AdminNotificationDto,
} from "@/lib/admin/admin-api";
import { AdminShell } from "./_components/admin-shell";
import type { NotificationPopoverItem } from "@/components/NotificationPopover";
import {
  COUNTRY_PREF_COOKIE,
  type CountryPickerOption,
} from "./_components/country-picker-constants";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";

async function logoutAdminAction() {
  "use server";
  const jar = await cookies();
  jar.delete(AUTH_COOKIE_NAME);
  redirect("/login?next=/admin");
}

async function setCountryPreferenceAction(slug: string) {
  "use server";
  const jar = await cookies();
  jar.set(COUNTRY_PREF_COOKIE, slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerAuthUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (user.role === "CORPORATE_ADMIN") redirect("/corporate");
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  // Sidebar nav.
  //   Global  — cross-country admin ops (Dashboard, Countries, Categories,
  //             Doctors, Assets, Newsletter, Settings).
  //   Country — content + bookings scoped to the active country (Country
  //             home, Country content, Pages, Services, Appointments).
  //             Items dim when no country is selected in the topbar picker.
  // "Pages" (country-features) is always visible when a country is
  // scoped — it's the controller for which other items appear. All other
  // country-scoped items are filtered by `activeCountry.enabledFeatures`
  // inside AdminShell.
  const sections = [
    // Global
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/calendar", label: "Calendar" },
    { href: "/admin/countries", label: "Countries" },
    { href: "/admin/doctors", label: "Doctors" },
    { href: "/admin/blog", label: "Blog" },
    { href: "/admin/assets", label: "Assets" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/patients", label: "Patients" },
    { href: "/admin/messages", label: "Messages" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/automation", label: "Automation" },
    { href: "/admin/invoices", label: "Invoices" },
    { href: "/admin/newsletter", label: "Newsletter" },
    { href: "/admin/subscriptions", label: "Subscriptions" },
    { href: "/admin/corporate", label: "Corporate" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/audit-log", label: "Audit log" },
    // Country-scoped — "Pages" first as the visibility controller.
    // Three sidebar entries were removed as redundant:
    //   - /admin/services was a cross-kind catalogue listing; General
    //     / Specialist / Online prescriptions / Health tests cover the
    //     same rows filtered by kind.
    //   - /admin/country-home and /admin/country-content were thin
    //     redirects to /admin/pages with a filter pre-applied. The
    //     active-tab highlight ended up on "Page content" after the
    //     redirect, so clicking them looked broken. Page content +
    //     URL-level filters are sufficient.
    { href: "/admin/country-features", label: "Pages" },
    { href: "/admin/pages", label: "Page content" },
    { href: "/admin/footer", label: "Footer" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/general-consultations", label: "General consultations" },
    { href: "/admin/specialist-consultations", label: "Specialist consultations" },
    { href: "/admin/online-prescriptions", label: "Prescriptions" },
    { href: "/admin/health-tests", label: "Health tests" },
    { href: "/admin/plans", label: "Plans" },
    { href: "/admin/appointments", label: "Appointments" },
  ];

  // Country options for the topbar picker. Pulled best-effort; if backend is
  // unreachable, render the shell without a picker.
  let countryOptions: CountryPickerOption[] = [];
  let activeCountry: CountryPickerOption | null = null;
  try {
    const result = await fetchAdminCountries();
    if (result.ok) {
      countryOptions = result.data.countries.map((c) => ({
        id: c.id,
        slug: c.slug,
        code: c.code,
        name: c.name,
        enabledFeatures: c.enabledFeatures,
      }));
      const jar = await cookies();
      const preferred = jar.get(COUNTRY_PREF_COOKIE)?.value;
      activeCountry =
        countryOptions.find((c) => c.slug === preferred) ?? countryOptions[0] ?? null;
    }
  } catch {
    // ignore — shell still renders
  }

  // Pending approval requests → topbar bell feed + sidebar count badge.
  // Scoped to the active country (matches the rest of the portal); global
  // when no country is selected. Best-effort: a failure leaves the shell
  // with an empty caught-up state.
  // The admin bell merges two feeds:
  //   1. Real Notification rows (patient chat messages, internal messages,
  //      clinical events) from /api/admin/notifications.
  //   2. Pending doctor service-approval requests (derived, not stored as
  //      Notification rows) — kept so the existing approval flow stays
  //      visible and the Doctors nav badge still works.
  let notifications:
    | { items: NotificationPopoverItem[]; unreadCount: number }
    | undefined;
  let navBadges: Record<string, number> | undefined;

  const feedItems: NotificationPopoverItem[] = [];
  let unreadTotal = 0;

  try {
    const notifRes = await fetchAdminNotifications();
    if (notifRes.ok) {
      unreadTotal += notifRes.data.unreadCount;
      for (const n of notifRes.data.items.slice(0, 12)) {
        feedItems.push(mapAdminNotification(n));
      }
    }
  } catch {
    // ignore — bell still shows service requests / empty state
  }

  try {
    const res = await fetchAdminPendingServiceRequests(
      activeCountry ? { countryCode: activeCountry.code } : undefined,
    );
    if (res.ok) {
      const { count, items } = res.data;
      navBadges = { "/admin/doctors": count };
      unreadTotal += count;
      for (const r of items.slice(0, 8)) {
        feedItems.push({
          id: r.id,
          title: `${r.doctorName} requested ${r.serviceName}`,
          body: `${serviceKindLabel(r.serviceKind)} · ${r.countryName} — awaiting approval`,
          href: `/admin/doctors/${r.doctorId}/services`,
          createdAt: r.createdAt,
          readAt: null,
        });
      }
    }
  } catch {
    // ignore — bell falls back to whatever notifications loaded
  }

  if (feedItems.length > 0 || unreadTotal > 0) {
    feedItems.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    notifications = { items: feedItems, unreadCount: unreadTotal };
  }

  return (
    <AdminShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      countries={countryOptions}
      activeCountry={activeCountry}
      sections={sections}
      signOutAction={logoutAdminAction}
      setCountryPreferenceAction={setCountryPreferenceAction}
      notifications={notifications}
      navBadges={navBadges}
    >
      {children}
    </AdminShell>
  );
}

/** Map a stored admin Notification row to a bell item. Patient chat messages
 *  deep-link to the appointment (where the admin chat lives); other events
 *  link to the appointment too when a payload id is present. */
function mapAdminNotification(n: AdminNotificationDto): NotificationPopoverItem {
  const p = n.payload ?? {};
  // Open the conversation in place inside the Messages inbox.
  const href = p.appointmentId
    ? `/admin/messages?open=${p.appointmentId}`
    : "/admin/messages";

  if (n.type === "PATIENT_MESSAGE") {
    const who = p.byUserName ?? "A patient";
    const channel = p.channel === "doctor" ? "doctor chat" : "clinic chat";
    return {
      id: n.id,
      title: `${who} sent a message`,
      body: p.snippet ?? `New message in ${channel}`,
      href,
      createdAt: n.createdAt,
      readAt: n.readAt,
    };
  }

  return {
    id: n.id,
    title: p.title ?? notificationTypeLabel(n.type),
    body: p.body ?? p.snippet ?? null,
    href,
    createdAt: n.createdAt,
    readAt: n.readAt,
  };
}

function notificationTypeLabel(type: string): string {
  switch (type) {
    case "INTERNAL_MESSAGE":
      return "New internal message";
    case "APPOINTMENT_ASSIGNED":
      return "Appointment assigned";
    case "APPOINTMENT_STATUS_CHANGED":
      return "Appointment status changed";
    case "CONSULT_SIGNED":
      return "Consultation signed";
    case "DOCUMENT_UPLOADED":
      return "Document uploaded";
    case "FORM_SUBMITTED":
      return "Form submitted";
    default:
      return "New notification";
  }
}

function serviceKindLabel(kind: string): string {
  switch (kind) {
    case "GENERAL":
      return "GP consultation";
    case "SPECIALIST":
      return "Specialist consultation";
    case "PRESCRIPTION":
      return "Prescription";
    default:
      return "Service";
  }
}
