import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { AdminShell } from "./_components/admin-shell";
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
  if (user.role !== "ADMIN") {
    redirect("/account");
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
    { href: "/admin/specialties", label: "Categories" },
    { href: "/admin/doctors", label: "Doctors" },
    { href: "/admin/blog", label: "Blog" },
    { href: "/admin/assets", label: "Assets" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/patients", label: "Patients" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/automation", label: "Automation" },
    { href: "/admin/invoices", label: "Invoices" },
    { href: "/admin/newsletter", label: "Newsletter" },
    { href: "/admin/audit-log", label: "Audit log" },
    { href: "/admin/settings", label: "Settings" },
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
    { href: "/admin/partners", label: "Partners" },
    { href: "/admin/general-consultations", label: "General consultations" },
    { href: "/admin/specialist-consultations", label: "Specialist consultations" },
    { href: "/admin/online-prescriptions", label: "Prescriptions" },
    { href: "/admin/health-tests", label: "Health tests" },
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
