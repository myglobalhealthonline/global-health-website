import "@/app/portal.css";
import "flag-icons/css/flag-icons.min.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

// A11Y-001 (WCAG 2.4.2): give every admin page a distinguishing title via the
// root template ("Admin · …") so pages without their own metadata aren't all
// the bare site name. Child pages with their own title still override this.
export const metadata: Metadata = { title: "Admin" };
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import {
  fetchAdminCountries,
  fetchAdminNotifications,
  fetchAdminPendingProfileChangeRequests,
  fetchAdminPendingServiceRequests,
  type AdminNotificationDto,
} from "@/lib/admin/admin-api";
import { AdminShell, type NavBadge } from "./_components/admin-shell";
import { PortalDomGuards } from "@/app/_components/RootDocument";
import {
  profileChangeFieldLabel,
  serviceKindLabel,
} from "@/lib/admin/approval-labels";
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

/** Empty slug = "All countries" (global scope) — delete the cookie so every
 *  `getActiveCountry` consumer resolves to null and drops its country filter. */
async function setCountryPreferenceAction(slug: string) {
  "use server";
  const jar = await cookies();
  if (!slug) {
    jar.delete(COUNTRY_PREF_COOKIE);
    return;
  }
  jar.set(COUNTRY_PREF_COOKIE, slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

/** "2 pending approvals — Dr A (service request), Dr B (name change)".
 *  `sources` is capped by the caller's page size, so any remainder is folded
 *  into "+N more" rather than silently dropped. */
function buildBadgeTitle(count: number, sources: string[]): string {
  const head = `${count} pending approval${count === 1 ? "" : "s"}`;
  if (sources.length === 0) return head;
  const shown = sources.slice(0, 3);
  const rest = count - shown.length;
  return `${head} — ${shown.join(", ")}${rest > 0 ? `, +${rest} more` : ""}`;
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
    { href: "/admin/careers", label: "Careers" },
    { href: "/admin/assets", label: "Assets" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/messages", label: "Messages" },
    { href: "/admin/support", label: "Doctor support" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/automation", label: "Automation" },
    { href: "/admin/invoices", label: "Invoices" },
    { href: "/admin/newsletter", label: "Newsletter" },
    { href: "/admin/subscriptions", label: "Subscriptions" },
    { href: "/admin/corporate", label: "Corporate" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/audit-log", label: "Audit log" },
    { href: "/admin/settings/reviews", label: "Reviews" },
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
    { href: "/admin/page-content", label: "Page content" },
    { href: "/admin/footer", label: "Footer" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/general-consultations", label: "General consultations" },
    { href: "/admin/specialist-consultations", label: "Specialist consultations" },
    { href: "/admin/online-prescriptions", label: "Prescriptions" },
    { href: "/admin/health-tests", label: "Health tests" },
    { href: "/admin/plans", label: "Plans" },
    { href: "/admin/memberships", label: "Memberships" },
    { href: "/admin/appointments", label: "Appointments" },
    { href: "/admin/patients", label: "Patients" },
    { href: "/admin/insurance", label: "Insurance" },
    { href: "/admin/test-centers", label: "Test centers" },
    { href: "/admin/lab-requisitions", label: "Lab requisitions" },
    { href: "/admin/integrations/sukl", label: "SÚKL ePoukaz" },
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
      // No cookie (or an unknown slug) = "All countries". Do NOT fall back to
      // the first country: that made the global scope unreachable, and it
      // disagreed with `getActiveCountry`, which every page uses and which
      // already resolves a missing cookie to null.
      activeCountry = countryOptions.find((c) => c.slug === preferred) ?? null;
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
  let navBadges: Record<string, NavBadge> | undefined;

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

  // Both doctor-approval queues badge the same "/admin/doctors" nav entry, so
  // the count is the sum: a doctor waiting on a name change is as much an
  // approval to action as one waiting on a service.
  let doctorApprovalCount = 0;
  // Who raised each pending approval — surfaced as the nav badge's tooltip /
  // screen-reader label so the number names its source instead of being an
  // anonymous alert.
  const doctorApprovalSources: string[] = [];

  try {
    const res = await fetchAdminPendingServiceRequests(
      activeCountry ? { countryCode: activeCountry.code } : undefined,
    );
    if (res.ok) {
      const { count, items } = res.data;
      doctorApprovalCount += count;
      unreadTotal += count;
      for (const r of items.slice(0, 8)) {
        doctorApprovalSources.push(`${r.doctorName} (service request)`);
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

  try {
    const res = await fetchAdminPendingProfileChangeRequests(
      activeCountry ? { countryCode: activeCountry.code } : undefined,
    );
    if (res.ok) {
      const { count, items } = res.data;
      doctorApprovalCount += count;
      unreadTotal += count;
      for (const r of items.slice(0, 8)) {
        doctorApprovalSources.push(
          `${r.doctorName} (${profileChangeFieldLabel(r.field)} change)`,
        );
        feedItems.push({
          id: r.id,
          title: `${r.doctorName} requested a ${profileChangeFieldLabel(r.field)} change`,
          body: `${r.isGlobal ? "All markets" : r.countryName} — awaiting approval`,
          href: `/admin/doctors/${r.doctorId}/profile-requests`,
          createdAt: r.createdAt,
          readAt: null,
        });
      }
    }
  } catch {
    // ignore — bell falls back to whatever notifications loaded
  }

  if (doctorApprovalCount > 0) {
    navBadges = {
      "/admin/doctors": {
        count: doctorApprovalCount,
        title: buildBadgeTitle(doctorApprovalCount, doctorApprovalSources),
      },
    };
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
      <PortalDomGuards />
      {children}
    </AdminShell>
  );
}

/** Where a notification of `type` should land. Chat threads open in place
 *  inside the Messages inbox (patient tab or internal tab); everything else
 *  is a clinical event that belongs on the appointment record. */
function adminNotificationHref(
  type: string,
  appointmentId?: string,
  threadId?: string,
): string {
  // Support messages are doctor-scoped, not per-appointment — they carry a
  // threadId, no appointmentId. Must be handled BEFORE the guard below, or the
  // guard sends them to /admin/appointments.
  if (type === "SUPPORT_MESSAGE") {
    return threadId ? `/admin/support?open=${threadId}` : "/admin/support";
  }
  if (!appointmentId) {
    return type === "PATIENT_MESSAGE" || type === "MESSAGE_REPLY"
      ? "/admin/messages"
      : "/admin/appointments";
  }
  switch (type) {
    case "PATIENT_MESSAGE":
    case "MESSAGE_REPLY":
      return `/admin/messages?open=${appointmentId}`;
    case "INTERNAL_MESSAGE":
      return `/admin/messages?tab=internal&open=${appointmentId}`;
    default:
      return `/admin/appointments/${appointmentId}`;
  }
}

function actorRoleLabel(role?: string): string | null {
  switch (role) {
    case "DOCTOR":
      return "Doctor";
    case "ADMIN":
      return "Admin";
    case "PATIENT":
      return "Patient";
    default:
      return null;
  }
}

/** Map a stored admin Notification row to a bell item. Every item names the
 *  actor when the payload carries one (`byUserName`) — a bell entry that
 *  can't say who acted is unactionable — and deep-links to the surface that
 *  actually renders the event. */
function mapAdminNotification(n: AdminNotificationDto): NotificationPopoverItem {
  const p = n.payload ?? {};
  const href = adminNotificationHref(n.type, p.appointmentId, p.threadId);
  const who = p.byUserName?.trim() || null;
  const role = actorRoleLabel(p.byRole);

  if (n.type === "SUPPORT_MESSAGE") {
    return {
      id: n.id,
      title: who ? `${who} sent a support message` : "New support message",
      body: p.snippet ?? null,
      href,
      createdAt: n.createdAt,
      readAt: n.readAt,
    };
  }

  if (n.type === "PATIENT_MESSAGE" || n.type === "MESSAGE_REPLY") {
    const channel = p.channel === "doctor" ? "doctor chat" : "clinic chat";
    return {
      id: n.id,
      title: who ? `${who} sent a message` : "New patient message",
      body: p.snippet ?? `New message in ${channel}`,
      href,
      createdAt: n.createdAt,
      readAt: n.readAt,
    };
  }

  if (n.type === "INTERNAL_MESSAGE") {
    return {
      id: n.id,
      // "Dr Silva sent an internal note" — role prefix disambiguates the
      // two staff sides of the thread when names alone are ambiguous.
      title: who
        ? `${role ? `${role} ` : ""}${who} sent an internal note`
        : "New internal message",
      body: p.snippet ?? null,
      href,
      createdAt: n.createdAt,
      readAt: n.readAt,
    };
  }

  const base = p.title ?? notificationTypeLabel(n.type);
  return {
    id: n.id,
    title: who ? `${base} · ${who}` : base,
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
    case "APPOINTMENT_RESCHEDULED":
      return "Appointment rescheduled";
    case "APPOINTMENT_FOLLOWUP_BOOKED":
      return "Follow-up booked";
    case "EXAM_REQUESTED":
      return "Exam requested";
    case "EXAM_LOGGED":
      return "Exam result logged";
    case "SUPPORT_MESSAGE":
      return "New support message";
    case "SUPPORT_REPLY":
      return "Support reply";
    default:
      return "New notification";
  }
}

