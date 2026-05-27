import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { JsonLd } from "@/components/seo/JsonLd";
import { countries, getCountryByCode } from "@/data/countries";
import { getCountryDoctors } from "@/lib/content/get-country-collections";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import {
  getPublicPage,
  isSupportedLocale,
  type PublicLocale,
} from "@/lib/content/get-public-page";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { SITE_NAME } from "@/lib/constants";

type Params = { country: string; lang: string };
type SearchParams = { lang?: string | string[] };

/** Normalize a language token to a comparable form. Doctor.languages
 *  rows may be stored as "Portuguese", "pt", "PT", "Português" — we
 *  lowercase + take the first 2 chars when long enough, so "Portuguese"
 *  and "pt" both compare as "po"/"pt". Imperfect but pragmatic. */
function langKey(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s.length <= 3) return s;
  // Map common full names to ISO 639-1 codes so chip toggle + filter
  // line up regardless of which form is stored on Doctor.languages.
  const namedMap: Record<string, string> = {
    english: "en",
    português: "pt",
    portuguese: "pt",
    español: "es",
    spanish: "es",
    deutsch: "de",
    german: "de",
    français: "fr",
    french: "fr",
    italiano: "it",
    italian: "it",
    română: "ro",
    romanian: "ro",
    čeština: "cs",
    czech: "cs",
  };
  return namedMap[s] ?? s.slice(0, 2);
}

export async function generateStaticParams(): Promise<Params[]> {
  return countries.map((c) => ({
    country: COUNTRY_CODE_TO_SLUG[c.code],
    lang: (c.defaultLocale ?? "EN").toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const page = await getPublicPage(code, "DOCTORS_INDEX", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/doctors`;
  const title = page?.seoTitle ?? `${config.name} doctors · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Meet the doctors licensed in ${config.name} and available for online consultations.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/doctors") },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryLangDoctorsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const sp = searchParams ? await searchParams : {};
  // Accept `?lang=es,pt`, `?lang=es&lang=pt`, or single value.
  const langParamRaw = sp?.lang;
  const filterLangs = (
    Array.isArray(langParamRaw)
      ? langParamRaw.flatMap((v) => v.split(","))
      : (langParamRaw ?? "").split(",")
  )
    .map((s) => langKey(s))
    .filter((s) => s.length > 0);

  const [doctors, page] = await Promise.all([
    getCountryDoctors(code),
    getPublicPage(code, "DOCTORS_INDEX", lang as PublicLocale),
  ]);

  // All language tokens advertised by at least one doctor in this country.
  // Drives the chip filter row. Sorted alphabetically for stable order.
  const allLangs = Array.from(
    new Set(doctors.flatMap((d) => (d.languages ?? []).map(langKey))),
  ).sort();

  const filteredDoctors =
    filterLangs.length === 0
      ? doctors
      : doctors.filter((d) =>
          (d.languages ?? []).some((l) => filterLangs.includes(langKey(l))),
        );

  const doctorCards = filteredDoctors.map((d) => ({
    name: d.fullName,
    title: d.title,
    imcRegistration: d.imcRegistration,
    medicalRegistrationUrl: d.medicalRegistrationUrl,
    languages: d.languages,
    whatsappNumber: d.whatsappNumber,
    instagramUrl: d.instagramUrl,
    facebookUrl: d.facebookUrl,
    linkedinUrl: d.linkedinUrl,
    bio: d.bio ?? `Licensed clinician available for online consultations in ${config.name}.`,
    imageSrc: d.imageSrc,
    href: `/${slug}/${lang}/doctors/${d.slug}`,
    ctaLabel: "View profile",
  }));

  function chipHref(code: string, currentlyOn: boolean): string {
    const next = new Set(filterLangs);
    if (currentlyOn) next.delete(code);
    else next.add(code);
    const qs = next.size > 0 ? `?lang=${Array.from(next).join(",")}` : "";
    return `/${slug}/${lang}/doctors${qs}`;
  }

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Doctors", url: `/${slug}/${lang}/doctors` },
        ])}
      />
      {allLangs.length > 1 ? (
        <nav
          aria-label="Filter doctors by spoken language"
          className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center gap-2 px-4 sm:px-6"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Speaks
          </span>
          {allLangs.map((code) => {
            const on = filterLangs.includes(code);
            return (
              <a
                key={code}
                href={chipHref(code, on)}
                aria-pressed={on}
                className={
                  on
                    ? "inline-flex items-center rounded-full bg-[var(--color-brand-primary)] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-white"
                    : "inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-body)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                }
              >
                {code.toUpperCase()}
              </a>
            );
          })}
          {filterLangs.length > 0 ? (
            <a
              href={`/${slug}/${lang}/doctors`}
              className="ml-2 text-[12px] font-semibold text-[var(--color-text-muted)] underline decoration-dotted hover:text-[var(--color-brand-primary)]"
            >
              Clear
            </a>
          ) : null}
        </nav>
      ) : null}
      <DoctorTeamTemplate
        countryName={config.name}
        doctors={doctorCards}
        bookingHref={`/${slug}/${lang}/general-consultation`}
        bookingLabel="Browse consultations"
      />
      <RichBodySection html={page?.body} />
    </>
  );
}
