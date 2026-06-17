import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  PillBottle,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";
import { resolveBookConsultationHref } from "@/lib/api/last-booking-country";
import { fetchPatientUnreadMessageCount } from "@/lib/api/account-appointments-api";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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
  const [bookHref, unreadMessages, locale] = await Promise.all([
    resolveBookConsultationHref(),
    fetchPatientUnreadMessageCount(),
    getPageLocale(),
  ]);
  const { account: a } = loadLocaleBundle(locale);

  const sections: PortalNavItem[] = [
    { href: "/account", label: a.nav.overview, icon: <LayoutDashboard className="size-4" aria-hidden /> },
    { href: "/account/bookings", label: a.nav.myBookings, icon: <CalendarDays className="size-4" aria-hidden />, badge: unreadMessages },
    { href: "/account/calendar", label: "Calendar", icon: <CalendarRange className="size-4" aria-hidden /> },
    { href: "/account/orders", label: a.nav.myOrders, icon: <ShoppingBag className="size-4" aria-hidden /> },
    { href: "/account/prescriptions", label: a.nav.prescriptions, icon: <PillBottle className="size-4" aria-hidden /> },
    { href: "/account/medical-files", label: "Medical files", icon: <FileText className="size-4" aria-hidden /> },
    { href: "/account/access-history", label: "Access history", icon: <History className="size-4" aria-hidden /> },
    { href: "/account/payments", label: a.nav.payments, icon: <CreditCard className="size-4" aria-hidden /> },
    { href: "/account/profile", label: a.nav.profile, icon: <UserRound className="size-4" aria-hidden /> },
    { href: "/account/security", label: a.nav.security, icon: <ShieldCheck className="size-4" aria-hidden /> },
    { href: bookHref, label: a.nav.bookConsultation, icon: <Stethoscope className="size-4" aria-hidden /> },
  ];

  return (
    <PortalShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      sections={sections}
      portalLabel={a.portal.label}
      sectionLabel={a.portal.sectionLabel}
      rootHref="/account"
      rootBreadcrumb={a.portal.sectionLabel}
      signOutAction={logoutAction}
      accountHref="/account/profile"
    >
      {children}
    </PortalShell>
  );
}
