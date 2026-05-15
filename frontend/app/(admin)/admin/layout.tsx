import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { AdminShell } from "./_components/admin-shell";
import { COUNTRY_PREF_COOKIE, type CountryPickerOption } from "./_components/country-picker";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME?.trim() || "gh_auth";

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
  if (user.role !== "ADMIN") {
    redirect("/account");
  }

  // Phase 1 sidebar nav.
  //   Global   — Dashboard, Countries, Doctors, Pages, Assets
  //   Country  — Appointments (booking inbox)
  // Deferred (not in nav): Specialties matrix, General/Specialist Consultations,
  // Online Prescriptions, Health Tests, Pricing. Their routes remain in code
  // dormant for Phase 2.
  const sections = [
    // Global
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/countries", label: "Countries" },
    { href: "/admin/doctors", label: "Doctors" },
    { href: "/admin/pages", label: "Pages" },
    { href: "/admin/assets", label: "Assets" },
    // Country-scoped
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
      }));
      const jar = await cookies();
      const preferred = jar.get(COUNTRY_PREF_COOKIE)?.value;
      activeCountry =
        countryOptions.find((c) => c.slug === preferred) ?? countryOptions[0] ?? null;
    }
  } catch {
    // ignore — shell still renders
  }

  return (
    <AdminShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      countries={countryOptions}
      activeCountry={activeCountry}
      sections={sections}
      signOutAction={logoutAdminAction}
      setCountryPreferenceAction={setCountryPreferenceAction}
    >
      {children}
    </AdminShell>
  );
}
