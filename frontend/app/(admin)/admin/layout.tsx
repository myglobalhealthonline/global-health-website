import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/server-session";
import { listScopeCountries, resolveScopeCountry } from "@/lib/admin/country-scope";
import { AdminShell } from "./_components/admin-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getAdminUser();
  if (!user) {
    redirect("/admin/login?next=/admin");
  }

  const [countries, activeCountry] = await Promise.all([
    listScopeCountries(),
    resolveScopeCountry(null),
  ]);

  const sections = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/appointments", label: "Appointments" },
    { href: "/admin/countries", label: "Countries" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/doctors", label: "Doctors" },
    { href: "/admin/services", label: "Services" },
    ...(user.role === "SUPER_ADMIN"
      ? [
          { href: "/admin/users", label: "Admin users" },
          { href: "/admin/audit", label: "Audit log" },
        ]
      : []),
  ];

  const countrySections = activeCountry
    ? [
        { href: `/admin/${activeCountry.slug}/doctors`, label: "Doctors" },
        { href: `/admin/${activeCountry.slug}/services`, label: "Services" },
        { href: `/admin/${activeCountry.slug}/appointments`, label: "Appointments" },
      ]
    : [];

  return (
    <AdminShell
      user={user}
      countries={countries}
      activeCountry={activeCountry}
      sections={sections}
      countrySections={countrySections}
    >
      {children}
    </AdminShell>
  );
}
