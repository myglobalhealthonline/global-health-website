import "@/app/portal.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

// A11Y-001 (WCAG 2.4.2): distinguishing title for corporate-portal pages via
// the root template ("Corporate · …"). Child pages with their own title override.
export const metadata: Metadata = { title: "Corporate" };
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClipboardList, LayoutDashboard, Settings, Users } from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { PortalShell, type PortalNavGroup } from "@/components/portal-shell";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookie";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { supportedLocaleCodes } from "@/lib/i18n/types";

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

  const locale = await getPortalLocale();
  const { corporate: t } = loadLocaleBundle(locale);

  const groups: PortalNavGroup[] = [
    {
      label: t.nav.groupOverview,
      items: [
        { href: "/corporate", label: t.nav.dashboard, icon: <LayoutDashboard className="size-4" aria-hidden /> },
      ],
    },
    {
      label: t.nav.groupPeople,
      items: [
        { href: "/corporate/employees", label: t.nav.employees, icon: <Users className="size-4" aria-hidden /> },
        { href: "/corporate/requests", label: t.nav.requests, icon: <ClipboardList className="size-4" aria-hidden /> },
      ],
    },
    {
      label: t.nav.groupCompany,
      items: [
        { href: "/corporate/settings", label: t.nav.settings, icon: <Settings className="size-4" aria-hidden /> },
      ],
    },
  ];

  return (
    <PortalShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      portalKey="corporate"
      groups={groups}
      portalLabel={t.nav.portalLabel}
      rootHref="/corporate"
      rootBreadcrumb={t.nav.rootBreadcrumb}
      signOutAction={logoutAction}
      accountHref="/corporate/settings"
      notificationsEmptyMessage={t.nav.notificationsEmptyMessage}
      locale={locale}
      availableLocales={[...supportedLocaleCodes]}
    >
      {children}
    </PortalShell>
  );
}
