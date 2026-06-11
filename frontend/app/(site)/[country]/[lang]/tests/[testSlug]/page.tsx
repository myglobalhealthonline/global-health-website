import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryHealthTestDetail } from "@/lib/content/get-country-collections";
import { getSiteUrl } from "@/lib/seo/site-url";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import {
  ChecklistSection,
  WhyChooseSection,
  ImportantInfoSection,
} from "@/components/sections/ServiceContentSections";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

type Params = { country: string; lang: string; testSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang, testSlug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const detail = await getCountryHealthTestDetail(code, testSlug, lang);
  if (!detail) return { title: SITE_NAME };

  // Admin SEO title is set absolute (already branded); otherwise the bare
  // test title lets the layout template append the brand once.
  const title = detail.seoTitle ?? detail.title;
  const description =
    detail.seoDescription ?? detail.shortDescription ?? `Lab-quality ${detail.title}, reviewed by a doctor.`;
  const url = `${getSiteUrl()}/${country}/${lang}/tests/${testSlug}`;
  return {
    title: detail.seoTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Read-only health-test detail page (admin CMS content). "Learn more" on a
 * lab-test card lands here; surfaces the admin-authored intro, "what this
 * test covers", "why get tested", extra sections and gallery, with an
 * Add-to-cart CTA (cart-first — no doctor pick for tests).
 */
export default async function HealthTestDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang, testSlug } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) notFound();

  // Honor the per-country `health-tests` toggle (parity with the listing).
  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "health-tests")) notFound();

  const detail = await getCountryHealthTestDetail(code, testSlug, lang);
  if (!detail) notFound();

  const soldOut = detail.stock !== null && detail.stock <= 0;
  const priceLabel = formatPriceRounded(detail.priceCents, detail.currencyCode);
  const backHref = `/${country}/${lang}/tests`;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${country}/${lang}` },
          { name: "Lab tests", url: backHref },
          { name: detail.title, url: `/${country}/${lang}/tests/${testSlug}` },
        ])}
      />

      {/* Dark hero — test context + image */}
      <section
        className="relative isolate overflow-hidden"
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(56px,7vw,96px) 0 clamp(40px,5vw,64px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-[0.12em] transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.50)" }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            All lab tests
          </Link>

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: "var(--color-brand-accent)" }}
                >
                  Reviewed by our doctors
                </p>
              </div>

              <h1
                className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
                style={{ fontSize: "clamp(2rem, 4.5vw + 0.5rem, 4rem)", color: "rgba(255,255,255,0.95)" }}
              >
                {detail.title}
              </h1>

              {detail.detailIntro ?? detail.shortDescription ? (
                <p
                  className="mt-3 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.50)" }}
                >
                  {detail.detailIntro ?? detail.shortDescription}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: "rgba(176,241,34,0.12)", color: "var(--color-brand-accent)" }}
                >
                  {priceLabel}
                </span>
                {detail.sampleType ? (
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.70)" }}
                  >
                    Sample: {detail.sampleType}
                  </span>
                ) : null}
                {detail.resultsTimeline ? (
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.70)" }}
                  >
                    Results: {detail.resultsTimeline}
                  </span>
                ) : null}
              </div>

              <div className="mt-8 max-w-xs">
                {soldOut ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold cursor-not-allowed"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}
                  >
                    Sold out
                  </button>
                ) : (
                  <AddToCartButton
                    kind="HEALTH_TEST"
                    healthTestId={detail.id}
                    label={detail.heroButtonLabel ?? `Add to cart · ${priceLabel}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-[background-color,color] duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "var(--color-brand-accent)", color: "#0a1f14" }}
                  />
                )}
              </div>
            </div>

            {detail.imageSrc ? (
              <div
                className="overflow-hidden rounded-[var(--radius-card)]"
                style={{ aspectRatio: "4 / 3", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.imageSrc}
                  alt={detail.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {detail.whatThisTestCovers.length > 0 ? (
        <ChecklistSection
          eyebrow="What this test covers"
          title={`Inside the ${detail.title}`}
          items={detail.whatThisTestCovers}
          theme="soft"
        />
      ) : null}

      {detail.whyGetTested.length > 0 ? (
        <WhyChooseSection
          eyebrow="Why get tested"
          title="Reasons to take this test"
          items={detail.whyGetTested}
          theme="light"
        />
      ) : null}

      {detail.extraSections.map((sec, i) =>
        sec.body.trim() ? (
          <ImportantInfoSection
            key={`${sec.title}-${i}`}
            title={sec.title || "Good to know"}
            paragraphs={sec.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)}
            theme={i % 2 === 0 ? "soft" : "light"}
          />
        ) : null,
      )}

      {/* Gallery */}
      {detail.gallery.length > 0 ? (
        <section style={{ background: "var(--color-background-soft)", padding: "clamp(40px,5vw,72px) 0" }}>
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detail.gallery.map((src, i) => (
                <div
                  key={src}
                  className="overflow-hidden rounded-[var(--radius-card)]"
                  style={{ aspectRatio: "4 / 3", background: "var(--color-background-page)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${detail.title} — image ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <MedicalDisclaimer
        paragraphs={[
          `Test results are reviewed by a doctor registered to practise in ${config.name}. This page is general information and is not a substitute for professional medical advice, diagnosis or treatment.`,
        ]}
      />
    </>
  );
}
