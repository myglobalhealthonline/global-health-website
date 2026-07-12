import "@/app/portal.css";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Briefcase,
  CalendarDays,
  CalendarRange,
  CreditCard,
  FileText,
  Gift,
  History,
  LayoutDashboard,
  MessagesSquare,
  PillBottle,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { PortalShell, type PortalNavGroup } from "@/components/portal-shell";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";
import { resolveBookConsultationHref } from "@/lib/api/last-booking-country";
import { fetchPatientUnreadMessageCount } from "@/lib/api/account-appointments-api";
import { getServerNotifications } from "@/lib/api/me-subscription-server";
import { fetchMeCorporate } from "@/lib/corporate/corporate-api";
import type { NotificationPopoverItem } from "@/components/NotificationPopover";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { supportedLocaleCodes } from "@/lib/i18n/types";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";

/**
 * Patient portal layout. Reuses `PortalShell` so admin / doctor / patient
 * share one chrome (dark sidebar, light header, breadcrumb, user menu).
 *
 * Auth gating: PATIENT only. ADMIN / DOCTOR sessions are redirected to
 * their respective portals so this surface stays scoped to one user.
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getServerAuthUser();
  if (!user) redirect("/login?next=/account");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "DOCTOR") redirect("/doctor");
  if (user.role === "CORPORATE_ADMIN") redirect("/corporate");

  async function logoutAction() {
    "use server";
    const jar = await cookies();
    jar.delete(AUTH_COOKIE_NAME);
    redirect("/login?next=/account");
  }

  // The "Book consultation" link used to drop logged-in patients on
  // `/` (the country picker) every time, forcing them to repick Ireland
  // / Portugal / etc. on every booking. Now we route them straight to
  // the country they last booked in.
  const [bookHref, unreadMessages, locale, notifications, corporateResult] = await Promise.all([
    resolveBookConsultationHref(),
    fetchPatientUnreadMessageCount(),
    getPageLocale(),
    getServerNotifications(),
    fetchMeCorporate(),
  ]);
  const hasCorporateMembership = corporateResult.ok && corporateResult.data !== null;
  const { account: a, common } = loadLocaleBundle(locale);

  // Map in-app notification rows → bell items. Payload carries the already-
  // localized { title, body, href } written by the subscription dispatchers.
  const notificationItems: NotificationPopoverItem[] = (notifications?.items ?? []).map((n) => ({
    id: n.id,
    title: n.payload?.title ?? "Notification",
    body: n.payload?.body ?? null,
    href: n.payload?.href ?? null,
    createdAt: n.createdAt,
    readAt: n.readAt,
  }));

  // Grouped nav — related links clustered under labeled eyebrows.
  const groups: PortalNavGroup[] = [
    {
      label: a.nav.groupOverview,
      items: [
        { href: "/account", label: a.nav.overview, icon: <LayoutDashboard className="size-4" aria-hidden /> },
        { href: bookHref, label: a.nav.bookConsultation, icon: <Stethoscope className="size-4" aria-hidden /> },
      ],
    },
    {
      label: a.nav.groupCare,
      items: [
        { href: "/account/bookings", label: a.nav.myBookings, icon: <CalendarDays className="size-4" aria-hidden /> },
        { href: "/account/messages", label: a.nav.messages, icon: <MessagesSquare className="size-4" aria-hidden />, badge: unreadMessages },
        { href: "/account/calendar", label: a.nav.calendar, icon: <CalendarRange className="size-4" aria-hidden /> },
        { href: "/account/prescriptions", label: a.nav.prescriptions, icon: <PillBottle className="size-4" aria-hidden /> },
        { href: "/account/medical-files", label: a.nav.medicalFiles, icon: <FileText className="size-4" aria-hidden /> },
      ],
    },
    {
      label: a.nav.groupMembership,
      items: [
        { href: "/account/membership", label: a.nav.membership, icon: <BadgeCheck className="size-4" aria-hidden /> },
        ...(hasCorporateMembership
          ? [{ href: "/account/corporate", label: a.nav.corporate, icon: <Briefcase className="size-4" aria-hidden /> }]
          : []),
        { href: "/account/rewards", label: a.nav.rewards, icon: <Gift className="size-4" aria-hidden /> },
      ],
    },
    {
      label: a.nav.groupBilling,
      items: [
        { href: "/account/orders", label: a.nav.myOrders, icon: <ShoppingBag className="size-4" aria-hidden /> },
        { href: "/account/payments", label: a.nav.payments, icon: <CreditCard className="size-4" aria-hidden /> },
      ],
    },
    {
      label: a.nav.groupAccount,
      items: [
        { href: "/account/profile", label: a.nav.profile, icon: <UserRound className="size-4" aria-hidden /> },
        { href: "/account/notifications", label: a.nav.notifications, icon: <Bell className="size-4" aria-hidden />, badge: notifications?.unreadCount ?? 0 },
        { href: "/account/family", label: a.nav.familyMembers, icon: <Users className="size-4" aria-hidden /> },
        { href: "/account/security", label: a.nav.security, icon: <ShieldCheck className="size-4" aria-hidden /> },
        { href: "/account/access-history", label: a.nav.accessHistory, icon: <History className="size-4" aria-hidden /> },
      ],
    },
  ];

  // Country homepage for the sidebar logo link — strip /book from bookHref.
  // Falls back to "/" if bookHref is the generic picker.
  const countryHomeHref = bookHref !== "/" ? bookHref.replace(/\/book$/, "") : "/";

  return (
    <PortalShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      portalKey="patient"
      groups={groups}
      portalLabel={a.portal.label}
      rootHref="/account"
      rootBreadcrumb={a.portal.sectionLabel}
      signOutAction={logoutAction}
      accountHref="/account/profile"
      logoHref={countryHomeHref}
      notifications={notificationItems}
      notificationsUnreadCount={notifications?.unreadCount ?? 0}
      notificationsViewAllHref="/account/notifications"
      locale={locale}
      availableLocales={[...supportedLocaleCodes]}
      chrome={common.portalChrome}
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
