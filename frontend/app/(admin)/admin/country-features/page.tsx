/**
 * Sidebar visibility controller for the active country.
 *
 * Renders one toggle per country-scoped feature (the items that appear
 * in the sidebar under the country's name in the admin shell). The
 * toggles flip entries in `Country.enabledFeatures`; the admin shell
 * reads that array on the next request and hides items the admin has
 * turned off.
 *
 * Why this lives separately from `/admin/countries/[id]/edit`:
 *   the country edit page is for legal/identity data (code, slug,
 *   currency, locales, domains). Sidebar visibility is per-market
 *   merchandising — markets evolve quickly, country identity does not.
 *
 * Why "Pages" in the sidebar instead of "Features":
 *   the user calls each sidebar entry a "page" (which is what they are
 *   from the public site's POV — they all render a public page or a
 *   collection of them).
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  Calendar,
  FileText,
  Heart,
  PanelBottom,
  PillBottle,
  Stethoscope,
  TestTube,
  type LucideIcon,
} from "lucide-react";
import {
  fetchAdminCountries,
  patchAdminCountry,
  COUNTRY_FEATURE_KEYS,
  type CountryFeatureKey,
} from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { COUNTRY_PREF_COOKIE } from "../_components/country-picker-constants";
import { FlagBadge } from "../_components/flag-badge";
import {
  AdminCard,
  AdminTable,
  PageHeader,
  Td,
  Th,
  Thead,
  Toggle,
  Tr,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

type FeatureMeta = {
  key: CountryFeatureKey;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

// Source of truth for the toggle table. Order = display order; sidebar
// uses its own ORDER table but they should stay roughly aligned.
//
// Three legacy keys (`country-home`, `country-content`, `services`) are
// intentionally not in the table any more — the sidebar entries that
// fed them were removed (Country home/Content were redirects to
// /admin/pages, and Services was a cross-kind listing already covered
// by the kind-specific tabs). The keys can still appear in
// Country.enabledFeatures on legacy rows; the backend doesn't reject
// them and nothing renders for them, so they're inert.
const FEATURE_META: FeatureMeta[] = [
  {
    key: "pages",
    label: "Page content",
    description: "Editorial copy for public country pages (Health tests, Prescriptions, …).",
    icon: FileText,
    href: "/admin/pages",
  },
  {
    key: "footer",
    label: "Footer",
    description: "Per-country tagline, contact, social links, custom columns and copyright.",
    icon: PanelBottom,
    href: "/admin/footer",
  },
  {
    key: "general-consultations",
    label: "General consultations",
    description: "GP-style consultations available in this country.",
    icon: Heart,
    href: "/admin/general-consultations",
  },
  {
    key: "specialist-consultations",
    label: "Specialist consultations",
    description: "Specialist-led consultations per category.",
    icon: Stethoscope,
    href: "/admin/specialist-consultations",
  },
  {
    key: "online-prescriptions",
    label: "Prescriptions",
    description: "Prescription services (typically posted to the patient — set a shipping price on each item).",
    icon: PillBottle,
    href: "/admin/online-prescriptions",
  },
  {
    key: "health-tests",
    label: "Health tests",
    description: "Home-collected lab tests sold in this country.",
    icon: TestTube,
    href: "/admin/health-tests",
  },
  {
    key: "appointments",
    label: "Appointments",
    description: "Booking inbox and per-appointment workflow for this country.",
    icon: Calendar,
    href: "/admin/appointments",
  },
];

type PageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminCountryFeaturesPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const jar = await cookies();
  const activeSlug = jar.get(COUNTRY_PREF_COOKIE)?.value ?? null;

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Country" title="Pages" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const countries = countriesResult.data.countries;
  const activeCountry = activeSlug
    ? countries.find((c) => c.slug === activeSlug) ?? null
    : countries[0] ?? null;

  if (!activeCountry) {
    return (
      <>
        <PageHeader eyebrow="Country" title="Pages" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Pick a country in the topbar to manage its sidebar pages.
          </p>
        </AdminCard>
      </>
    );
  }

  // Legacy rows pre-dating the column read as undefined → treat as "all
  // enabled" so an unmigrated DB doesn't blank the sidebar. Once the
  // admin saves a toggle the country gets a concrete array.
  const enabled = new Set<string>(
    activeCountry.enabledFeatures ?? [...COUNTRY_FEATURE_KEYS],
  );

  async function toggleFeatureAction(formData: FormData) {
    "use server";
    const countryId = String(formData.get("countryId") ?? "").trim();
    const key = String(formData.get("featureKey") ?? "").trim();
    const currentlyOn = formData.get("currentlyOn") === "true";

    if (!countryId || !key) {
      redirect(`/admin/country-features?error=${encodeURIComponent("Missing form data")}`);
    }
    if (!(COUNTRY_FEATURE_KEYS as readonly string[]).includes(key)) {
      redirect(`/admin/country-features?error=${encodeURIComponent("Unknown feature key")}`);
    }

    // Re-fetch so we merge against the latest array, not a stale snapshot.
    const fresh = await fetchAdminCountries();
    if (!fresh.ok) {
      redirect(`/admin/country-features?error=${encodeURIComponent(fresh.message)}`);
    }
    const target = fresh.data.countries.find((c) => c.id === countryId);
    if (!target) {
      redirect(`/admin/country-features?error=${encodeURIComponent("Country not found")}`);
    }

    const current = new Set<string>(
      target.enabledFeatures ?? [...COUNTRY_FEATURE_KEYS],
    );
    if (currentlyOn) current.delete(key);
    else current.add(key);

    const next = [...COUNTRY_FEATURE_KEYS].filter((k) => current.has(k));

    const res = await patchAdminCountry(countryId, { enabledFeatures: next });
    if (!res.ok) {
      redirect(`/admin/country-features?error=${encodeURIComponent(res.message)}`);
    }

    revalidatePath("/admin", "layout");
    // Bust the PUBLIC countries cache too — the site header/footer read
    // `enabledFeatures` from `fetchCountries()` (tag: "countries"). Without
    // this the navbar/footer keep showing a disabled page until the 120s
    // data-cache window expires on its own.
    revalidateTag(SITE_CACHE_TAGS.countries());
    redirect(`/admin/country-features?success=${encodeURIComponent(`${key} updated`)}`);
  }

  const enabledCount = FEATURE_META.filter((f) => enabled.has(f.key)).length;

  return (
    <>
      <PageHeader
        eyebrow="Country"
        title="Pages"
        description={`Toggle which sidebar items appear for ${activeCountry.name}. Disabled pages stay accessible by URL — the admin just won't see them in the nav.`}
      />

      <AdminCard className="mb-4">
        <div className="flex items-center gap-3 px-1 py-1">
          <FlagBadge code={activeCountry.code} size={20} />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[14px] font-bold text-[var(--color-text-primary)]">
              {activeCountry.name}
            </p>
            <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
              {enabledCount} of {FEATURE_META.length} pages enabled
            </p>
          </div>
        </div>
      </AdminCard>

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      <AdminCard padding={0} className="overflow-hidden">
        <div className="overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Page</Th>
              <Th>Description</Th>
              <Th align="center" style={{ width: 100 }}>
                Visible
              </Th>
            </Thead>
            <tbody>
              {FEATURE_META.map((feature) => {
                const isOn = enabled.has(feature.key);
                const Icon = feature.icon;
                return (
                  <Tr key={feature.key}>
                    <Td style={{ minWidth: 220 }}>
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex shrink-0 items-center justify-center"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: "rgba(200,230,160,0.30)",
                            color: "var(--color-brand-primary)",
                          }}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="m-0 whitespace-nowrap text-[14px] font-bold text-[var(--color-text-primary)]">
                            {feature.label}
                          </p>
                          <p className="m-0 whitespace-nowrap font-mono text-[11px] text-[var(--color-text-muted)]">
                            {feature.href}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-[13px] text-[var(--color-text-muted)]">
                        {feature.description}
                      </span>
                    </Td>
                    <Td align="center" style={{ padding: "14px 0" }}>
                      <form action={toggleFeatureAction} className="inline-block">
                        <input type="hidden" name="countryId" value={activeCountry.id} />
                        <input type="hidden" name="featureKey" value={feature.key} />
                        <input
                          type="hidden"
                          name="currentlyOn"
                          value={isOn ? "true" : "false"}
                        />
                        <Toggle
                          on={isOn}
                          ariaLabel={`Toggle ${feature.label} for ${activeCountry.name}`}
                        />
                      </form>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </AdminTable>
        </div>
      </AdminCard>

      <p className="mt-6 text-[12px] text-[var(--color-text-muted)]">
        Hiding a page only removes it from the sidebar — its public URL still
        responds. Visit the country edit page to deactivate the market entirely.
      </p>
    </>
  );
}
