import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
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
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryPlans } from "@/lib/content/get-country-collections";
import { SITE_NAME } from "@/lib/constants";

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
  const url = `${getSiteUrl()}/${country}/${lang}/plans`;
  return {
    title: `Plans & pricing in ${config.name} · ${SITE_NAME}`,
    description: `Subscription plans + per-visit pricing for online consultations in ${config.name}.`,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/plans") },
    openGraph: { type: "website", siteName: SITE_NAME, url },
  };
}

function formatPrice(cents: number, currency: string) {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "USD" ? "$" : currency;
  return `${symbol}${(cents / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}`;
}

function intervalLabel(interval: string): string {
  switch (interval.toLowerCase()) {
    case "month":
    case "monthly":
      return "/month";
    case "year":
    case "yearly":
    case "annual":
      return "/year";
    case "one-time":
    case "onetime":
      return " one-time";
    default:
      return `/${interval}`;
  }
}

export default async function PlansPage({
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

  const plans = await getCountryPlans(code);
  const bookHref = `/${slug}/${lang}/book-online`;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Plans", url: `/${slug}/${lang}/plans` },
        ])}
      />

      <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center">
        <p className="text-sm uppercase tracking-wide text-emerald-700">
          {config.name} · Plans &amp; pricing
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900 sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Pay per visit, or save with a monthly plan. All prices include doctor
          consultation, prescription, and follow-up.
        </p>
      </section>

      <TrustRibbon />

      {plans.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p, idx) => {
              const description = p.description ?? "";
              const bullets = description
                .split(/\r?\n|·|•/)
                .map((s) => s.trim())
                .filter(Boolean);
              const isFeatured = idx === 1; // middle plan visually highlighted
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl border p-7 shadow-sm transition ${
                    isFeatured
                      ? "border-emerald-600 bg-emerald-700/95 text-white"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  {isFeatured ? (
                    <span className="absolute -top-3 right-7 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-emerald-900">
                      Most popular
                    </span>
                  ) : null}
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {formatPrice(p.priceCents, p.currencyCode)}
                    </span>
                    <span className={`text-sm font-semibold ${isFeatured ? "text-emerald-100" : "text-slate-500"}`}>
                      {intervalLabel(p.interval)}
                    </span>
                  </p>
                  {bullets.length > 0 ? (
                    <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm">
                      {bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <Check
                            aria-hidden
                            className={`mt-0.5 size-4 shrink-0 ${
                              isFeatured ? "text-emerald-200" : "text-emerald-600"
                            }`}
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Link
                    href={bookHref}
                    className={`mt-7 inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold transition ${
                      isFeatured
                        ? "bg-white text-emerald-800 hover:bg-emerald-50"
                        : "bg-emerald-700 text-white hover:bg-emerald-800"
                    }`}
                  >
                    Choose {p.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-600">
          <p>
            Plans for {config.name} are coming soon. In the meantime, book a
            single consultation — no subscription required.
          </p>
        </section>
      )}

      <FinalCTA primaryHref={bookHref} secondaryHref={`/${slug}/${lang}/doctors`} />
    </>
  );
}
