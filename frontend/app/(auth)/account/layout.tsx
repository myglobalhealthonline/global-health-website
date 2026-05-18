import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  PillBottle,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME?.trim() || "gh_auth";

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

  const sections: PortalNavItem[] = [
    { href: "/account", label: "Overview", icon: LayoutDashboard },
    { href: "/account/bookings", label: "My bookings", icon: CalendarDays },
    { href: "/account/prescriptions", label: "Prescriptions", icon: PillBottle },
    { href: "/account/payments", label: "Payments", icon: CreditCard },
    { href: "/account/profile", label: "Profile", icon: UserRound },
    { href: "/account/security", label: "Security", icon: ShieldCheck },
    { href: "/", label: "Book consultation", icon: Stethoscope },
  ];

  return (
    <PortalShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      sections={sections}
      portalLabel="Patient portal"
      sectionLabel="Account"
      rootHref="/account"
      rootBreadcrumb="Account"
      signOutAction={logoutAction}
    >
      {children}
    </PortalShell>
  );
}
