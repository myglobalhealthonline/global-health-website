import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { countries, getCountryByCode } from "@/data/countries";
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
import { getCountryServices } from "@/lib/content/get-country-collections";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";

type Params = { country: string; lang: string };

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
  // Admin-editable copy via /admin/pages (PageKey=PRESCRIPTIONS).
  // Falls back to the hardcoded strings if no ContentPage row exists.
  const page = await getPublicPage(code, "PRESCRIPTIONS", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/prescriptions`;
  const title = page?.seoTitle ?? `Online prescriptions in ${config.name} · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Get a prescription online from a licensed doctor in ${config.name}.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/prescriptions") },
    openGraph: { type: "website", siteName: SITE_NAME, url, title, description },
  };
}

function formatPrice(cents: number | null, currency: string | null) {
  if (cents == null) return null;
  return formatPriceRounded(cents, currency);
}

export default async function PrescriptionsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const [items, page] = await Promise.all([
    getCountryServices(code, "PRESCRIPTION"),
    getPublicPage(code, "PRESCRIPTIONS", lang as PublicLocale),
  ]);
  const bookHref = `/${slug}/${lang}/book-online?type=prescription`;
  const heroTitle = page?.heroTitle ?? "Online prescriptions";
  const heroSubtitle =
    page?.heroSubtitle ??
    `Renew or get a new prescription from a licensed doctor in ${config.name}, delivered electronically.`;
  const ctaLabel = page?.ctaLabel ?? "Request a prescription";

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Online prescriptions", url: `/${slug}/${lang}/prescriptions` },
        ])}
      />

      <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center">
        <p className="text-sm uppercase tracking-wide text-emerald-700">
          {config.name} · Online prescriptions
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900 sm:text-5xl">
          {heroTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{heroSubtitle}</p>
        <div className="mt-7">
          <Link
            href={bookHref}
            className="inline-flex items-center rounded-md bg-emerald-700 px-6 py-3 text-white shadow-sm hover:bg-emerald-800"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      {/* Admin-edited rich body from ContentPage (PRESCRIPTIONS). Hidden
          when no row exists. */}
      <RichBodySection html={page?.body} />

      <TrustRibbon />

      {items.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold text-slate-900">
            {items.length} {items.length === 1 ? "prescription service" : "prescription services"} available
          </h2>
          <p className="mt-2 text-slate-600">
            Cards update as the team adds or retires prescription services.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <Link
                key={s.id}
                // Append the service slug so the backend stamps the
                // catalogue price + currency onto the appointment and
                // the Stripe checkout handoff actually fires.
                href={`${bookHref}${bookHref.includes("?") ? "&" : "?"}service=${encodeURIComponent(s.slug)}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700">
                  {s.name}
                </h3>
                {s.summary ? (
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{s.summary}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {s.durationMinutes != null ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {s.durationMinutes} min
                    </span>
                  ) : null}
                  {formatPrice(s.basePriceCents, s.currencyCode) ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                      from {formatPrice(s.basePriceCents, s.currencyCode)}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-600">
          <p>
            Online prescriptions for {config.name} are coming soon. In the meantime,
            book a general consultation and our doctors will issue a prescription
            as part of the visit.
          </p>
        </section>
      )}

      <FinalCTA primaryHref={bookHref} secondaryHref={`/${slug}/${lang}/doctors`} />
    </>
  );
}
