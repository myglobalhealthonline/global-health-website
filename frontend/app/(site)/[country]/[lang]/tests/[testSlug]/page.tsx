import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  Droplets,
  FlaskConical,
  Lock,
  Package,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
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
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

type Params = { country: string; lang: string; testSlug: string };

/** Admin detailIntro may arrive as rich HTML — flatten to plain text for
 *  the lede paragraph (and meta description). */
function stripHtml(value: string | null): string | null {
  if (!value) return value;
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

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
    detail.seoDescription ??
    stripHtml(detail.shortDescription) ??
    `Lab-quality ${detail.title}, reviewed by a doctor.`;
  const url = `${getSiteUrl()}/${country}/${lang}/tests/${testSlug}`;
  return {
    title: detail.seoTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Health-test product page. Dark editorial hero → CMS content sections → CTA. Cart-first — no doctor pick. */
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
  const lowStock = !soldOut && detail.stock !== null && detail.stock <= 5 ? detail.stock : null;
  const priceLabel = formatPriceRounded(detail.priceCents, detail.currencyCode);
  const backHref = `/${country}/${lang}/tests`;
  const intro = stripHtml(detail.detailIntro) ?? stripHtml(detail.shortDescription);

  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const t = c.testDetailPage;
  const tp = c.testsPage;
  const sd = c.serviceDetailPage;

  // Product spec rows — only render rows with real data.
  const specs = [
    detail.sampleType ? { icon: Droplets, label: t.specSampleType, value: detail.sampleType } : null,
    detail.resultsTimeline ? { icon: Clock, label: t.specResultsIn, value: detail.resultsTimeline } : null,
    { icon: Stethoscope, label: t.specReviewedBy, value: t.specReviewedByValue.replace("{country}", config.name) },
    { icon: Package, label: t.specDelivery, value: t.specDeliveryValue },
  ].filter(Boolean) as Array<{ icon: typeof Clock; label: string; value: string }>;

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

      {/* Test hero — full-viewport 50/50: image left, buy panel right */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
        style={{ background: "#0F2E25" }}
      >
        <div className="grid lg:grid-cols-2" style={{ minHeight: "min(100vh, 880px)" }}>

          {/* LEFT — full-bleed test image */}
          <div
            className="relative overflow-hidden"
            style={{ minHeight: "clamp(300px, 50vw, 880px)" }}
          >
            {detail.imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.imageSrc}
                alt={detail.title}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0d2a1f 0%, #1a3d2b 100%)" }}
              >
                <FlaskConical
                  className="size-20"
                  style={{ color: "rgba(176,241,34,0.30)" }}
                  strokeWidth={1.2}
                  aria-hidden
                />
              </div>
            )}
            {/* Doctor Reviewed badge — overlaid on the image */}
            <span
              className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em]"
              style={{ background: "var(--color-brand-primary)", color: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.30)" }}
            >
              <ShieldCheck className="size-3.5" aria-hidden />
              {t.doctorReviewed}
            </span>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{
                height: "55%",
                background:
                  "linear-gradient(to top, rgba(6,26,18,0.90) 0%, rgba(6,26,18,0.40) 45%, transparent 100%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block"
              style={{
                width: "38%",
                background:
                  "linear-gradient(to right, rgba(15,46,37,0) 0%, rgba(15,46,37,0.75) 70%, #0F2E25 100%)",
              }}
            />
          </div>

          {/* RIGHT — test info + buy panel */}
          <div
            className="relative flex flex-col justify-start overflow-y-auto px-8 py-10 md:px-12 lg:px-14 lg:py-14"
            style={{ background: "#0F2E25" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 600px 500px at 110% -10%, rgba(176,241,34,0.11), transparent 60%)",
              }}
            />

            <div className="relative">
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-[var(--color-brand-accent)]"
                style={{ color: "rgba(255,255,255,0.40)" }}
              >
                <ArrowLeft className="size-4" aria-hidden />
                {t.backToTests}
              </Link>

              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--color-brand-accent)" }}>
                {t.eyebrow}
              </p>

              <h1
                className="mt-4 font-extrabold leading-[1.0] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2rem,3.5vw+0.5rem,3.5rem)", color: "rgba(255,255,255,0.95)", maxWidth: "20ch" }}
              >
                {detail.title}
              </h1>

              {intro ? (
                <p
                  className="mt-4 max-w-[48ch] leading-relaxed"
                  style={{ fontSize: "var(--text-body-lg)", color: "rgba(255,255,255,0.58)" }}
                >
                  {intro}
                </p>
              ) : null}

              {/* Compact spec chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {specs.map(({ icon: Icon, label, value }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.80)",
                    }}
                  >
                    <Icon className="size-3.5 shrink-0" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.8} aria-hidden />
                    {value}
                  </span>
                ))}
              </div>

              {/* Buy panel */}
              <div
                className="mt-6 overflow-hidden rounded-[20px]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(18px)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
                }}
              >
                <div className="p-6">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                      className="font-extrabold tracking-[-0.03em] [font-variant-numeric:tabular-nums]"
                      style={{ fontSize: "clamp(1.9rem,3vw,2.5rem)", color: "rgba(255,255,255,0.95)" }}
                    >
                      {priceLabel}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {t.inclDoctorReview}
                    </span>
                    {lowStock != null ? (
                      <span className="gh-badge gh-badge-warning">{t.onlyLeft.replace("{count}", String(lowStock))}</span>
                    ) : null}
                    {soldOut ? <span className="gh-badge gh-badge-error">{t.soldOut}</span> : null}
                  </div>

                  <div className="mt-5">
                    {soldOut ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold"
                        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
                      >
                        {t.soldOut}
                      </button>
                    ) : (
                      <AddToCartButton
                        kind="HEALTH_TEST"
                        healthTestId={detail.id}
                        label={detail.heroButtonLabel ?? t.addToCart.replace("{price}", priceLabel)}
                        className="gh2-btn-lime w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    )}
                  </div>

                  <div
                    className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {[
                      { icon: Lock, label: t.secureCheckout },
                      { icon: CalendarCheck, label: t.orderConfirmation },
                    ].map(({ icon: Icon, label }) => (
                      <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <Icon className="size-3.5" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trust/credibility band — anchored immediately below the buy box
          so credentials appear before users scroll into content. */}
      <TrustRibbon
        items={[
          { v: tp.trustLabQualityValue, l: tp.trustLabQualityLabel, icon: "sparkles" },
          { v: tp.trustDoctorValue, l: tp.trustDoctorLabel, icon: "doctor" },
          { v: tp.trustHomeValue, l: tp.trustHomeLabel, icon: "shield" },
          { v: tp.trustGdprValue, l: tp.trustGdprLabel, icon: "lock" },
        ]}
      />

      {detail.whatThisTestCovers.length > 0 ? (
        <ChecklistSection
          eyebrow={t.whatCoversEyebrow}
          title={t.insideTitle.replace("{title}", detail.title)}
          items={detail.whatThisTestCovers}
          theme="light"
        />
      ) : null}

      {detail.whyGetTested.length > 0 ? (
        <WhyChooseSection
          eyebrow={t.whyEyebrow}
          title={t.whyTitle}
          items={detail.whyGetTested}
          theme="soft"
        />
      ) : null}

      {detail.extraSections.map((sec, i) =>
        sec.body.trim() ? (
          <ImportantInfoSection
            key={`${sec.title}-${i}`}
            title={sec.title || t.goodToKnow}
            paragraphs={sec.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)}
            theme={i % 2 === 0 ? "soft" : "light"}
          />
        ) : null,
      )}

      {/* Closing CTA band — mirror of the service detail booking band. */}
      <section
        className="gh2-hero relative isolate overflow-hidden"
        style={{
          padding: "clamp(56px,7vw,96px) 0",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                  {sd.readyEyebrow}
                </span>
              </p>
              <h2
                className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2rem,4vw,3.4rem)", color: "rgba(255,255,255,0.95)", maxWidth: "20ch" }}
              >
                {t.ctaHeading.replace("{title}", detail.title)}
              </h2>
              <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                {sd.fromPricePrefix.replace("{price}", priceLabel)}
                {t.inclDoctorReview}
              </p>
            </div>
            <div className="flex lg:justify-end">
              {soldOut ? (
                <Link href={backHref} className="gh2-btn-ghost">
                  {t.backToTests}
                </Link>
              ) : (
                <AddToCartButton
                  kind="HEALTH_TEST"
                  healthTestId={detail.id}
                  label={t.addToCart.replace("{price}", priceLabel)}
                  className="gh2-btn-lime"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <MedicalDisclaimer
        paragraphs={[t.disclaimer.replace("{country}", config.name)]}
      />
    </>
  );
}
