import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { PageHero } from "@/components/sections/PageHero";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { countries, getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
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
import { AddToCartButton } from "@/components/cart/AddToCartButton";

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

  // Honor the per-country `online-prescriptions` toggle from /admin/country-features.
  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "online-prescriptions")) notFound();

  const [items, page] = await Promise.all([
    getCountryServices(code, "PRESCRIPTION"),
    getPublicPage(code, "PRESCRIPTIONS", lang as PublicLocale),
  ]);
  // Cart-first booking: hero CTA jumps to the prescription cards
  // below; final CTA falls back to the doctors index for visitors who
  // want a consultation instead.
  const bookHref = "#prescriptions";
  const fallbackHref = `/${slug}/${lang}/doctors`;
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

      <PageHero
        countryCode={config.code}
        countryLabel={`${config.name} · Online prescriptions`}
        titleLead="Repeat scripts"
        titleAccent="without"
        titleTrail="the waiting room."
        lede={heroSubtitle}
        ctaLabel={ctaLabel}
        ctaHref={bookHref}
        secondaryLabel="Browse all services"
        secondaryHref={`/${slug}/${lang}`}
      />

      {/* Admin-edited rich body from ContentPage (PRESCRIPTIONS). Hidden
          when no row exists. */}
      <RichBodySection html={page?.body} />

      <TrustRibbon />

      {items.length > 0 ? (
        <section
          id="prescriptions"
          className="scroll-mt-24"
          style={{
            background: "var(--color-background-dark)",
            padding: "clamp(64px,8vw,120px) 0",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--color-brand-accent)" }}
            >
              What you can book
            </p>
            <h2
              className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              Prescription services available
            </h2>
            <p
              className="mt-3 max-w-2xl text-[length:var(--text-body-lg)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.70)" }}
            >
              {items.length}{" "}
              {items.length === 1 ? "prescription service" : "prescription services"} in{" "}
              {config.name}. Cards update as the team adds or retires services.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => {
                const priceLabel = formatPrice(s.basePriceCents, s.currencyCode);
                return (
                  <article
                    key={s.id}
                    className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    {s.imageSrc ? (
                      <div className="w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.imageSrc}
                          alt={s.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="flex h-full flex-col p-6 sm:p-7">
                      <h3
                        className="text-lg font-bold tracking-[-0.01em]"
                        style={{ color: "rgba(255,255,255,0.88)" }}
                      >
                        {s.name}
                      </h3>
                      {s.summary ? (
                        <p
                          className="mt-2 flex-1 line-clamp-3 text-sm leading-relaxed"
                          style={{ color: "rgba(255,255,255,0.70)" }}
                        >
                          {s.summary}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {s.durationMinutes != null ? (
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              color: "rgba(255,255,255,0.70)",
                            }}
                          >
                            {s.durationMinutes} min
                          </span>
                        ) : null}
                        {priceLabel ? (
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                            style={{
                              background: "rgba(176,241,34,0.12)",
                              color: "var(--color-brand-accent)",
                            }}
                          >
                            {priceLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-auto pt-5">
                        {s.basePriceCents != null ? (
                          <AddToCartButton
                            kind="PRESCRIPTION_SERVICE"
                            serviceId={s.id}
                            label={priceLabel ? `Add to cart · ${priceLabel}` : "Add to cart"}
                          />
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section
          style={{
            background: "var(--color-background-dark)",
            padding: "clamp(48px,6vw,80px) 0",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="mx-auto max-w-3xl px-5 md:px-10 text-center">
            <p style={{ color: "rgba(255,255,255,0.55)" }}>
              Online prescriptions for {config.name} are coming soon. In the meantime,
              book a general consultation and our doctors will issue a prescription
              as part of the visit.
            </p>
          </div>
        </section>
      )}

      <FinalCTA primaryHref={bookHref} secondaryHref={fallbackHref} />
    </>
  );
}
