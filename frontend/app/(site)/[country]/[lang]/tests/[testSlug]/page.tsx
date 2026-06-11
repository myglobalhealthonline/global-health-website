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
  ProcessStepsSection,
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

/**
 * Health-test product page (admin CMS content). "Learn more" on a lab-test
 * card lands here. Product-style layout: image panel + buy box with specs
 * and add-to-cart, then "what's covered", "why get tested", how-it-works,
 * admin extra sections. Cart-first — no doctor pick for tests.
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

  const sampleSuffix = detail.sampleType ? ` (${detail.sampleType.toLowerCase()})` : "";
  const timelineSuffix = detail.resultsTimeline
    ? t.step3Timeline.replace("{timeline}", detail.resultsTimeline.toLowerCase())
    : "";
  const steps = [
    {
      title: t.step1Title,
      body: t.step1Body,
    },
    {
      title: t.step2Title,
      body: t.step2Body.replace("{sample}", sampleSuffix),
    },
    {
      title: t.step3Title,
      body: t.step3Body.replace("{country}", config.name).replace("{timeline}", timelineSuffix),
    },
  ];

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

      {/* Product hero — light, image panel + buy box */}
      <section
        style={{
          background: "var(--color-background-soft)",
          padding: "clamp(40px,5vw,64px) 0 clamp(48px,6vw,80px)",
          borderBottom: "1px solid rgba(29,75,54,0.10)",
        }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-[var(--color-brand-primary)]"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t.backToTests}
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(380px,1fr)_1.15fr] lg:gap-14">
            {/* Left — product image panel */}
            <div>
              <div
                className="relative overflow-hidden rounded-[var(--radius-card)] bg-white"
                style={{
                  aspectRatio: "4 / 3",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {detail.imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.imageSrc}
                    alt={detail.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span
                      className="inline-flex size-20 items-center justify-center rounded-full"
                      style={{ background: "var(--color-brand-mint-dim)" }}
                    >
                      <FlaskConical className="size-9" style={{ color: "var(--color-brand-primary)" }} strokeWidth={1.5} aria-hidden />
                    </span>
                  </div>
                )}
                <span
                  className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{ background: "var(--color-brand-primary)", color: "#ffffff", boxShadow: "0 2px 8px rgba(29,75,54,0.30)" }}
                >
                  <ShieldCheck className="size-3.5" aria-hidden />
                  {t.doctorReviewed}
                </span>
              </div>

              {detail.gallery.length > 0 ? (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {detail.gallery.slice(0, 3).map((src, i) => (
                    <div
                      key={src}
                      className="overflow-hidden rounded-[var(--radius-card-sm)] bg-white"
                      style={{ aspectRatio: "4 / 3", border: "1px solid var(--color-border)" }}
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
              ) : null}
            </div>

            {/* Right — buy box */}
            <div>
              <p className="flex items-center gap-3">
                <span aria-hidden className="gh2-index" style={{ color: "rgba(29,75,54,0.40)" }}>
                  01
                </span>
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: "var(--color-brand-primary)" }}
                >
                  {t.eyebrow}
                </span>
              </p>

              <h1
                className="mt-4 font-extrabold leading-[1.02] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2rem,4vw,3.4rem)", color: "var(--color-text-primary)", maxWidth: "18ch" }}
              >
                {detail.title}
              </h1>

              {intro ? (
                <p
                  className="mt-4 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {intro}
                </p>
              ) : null}

              {/* Price */}
              <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className="font-extrabold tracking-[-0.03em] [font-variant-numeric:tabular-nums]"
                  style={{ fontSize: "clamp(2rem,3.5vw,2.75rem)", color: "var(--color-text-primary)" }}
                >
                  {priceLabel}
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {t.inclDoctorReview}
                </span>
                {lowStock != null ? (
                  <span className="gh-badge gh-badge-warning">{t.onlyLeft.replace("{count}", String(lowStock))}</span>
                ) : null}
                {soldOut ? <span className="gh-badge gh-badge-error">{t.soldOut}</span> : null}
              </div>

              {/* Spec rows */}
              <dl
                className="mt-6 grid gap-px overflow-hidden rounded-[var(--radius-card)] sm:grid-cols-2"
                style={{ background: "var(--color-border)", border: "1px solid var(--color-border)" }}
              >
                {specs.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 bg-white p-4">
                    <span
                      className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: "var(--color-brand-mint-dim)" }}
                    >
                      <Icon className="size-4" style={{ color: "var(--color-brand-primary)" }} strokeWidth={1.8} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <dt
                        className="text-[10.5px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {label}
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>

              {/* Add to cart */}
              <div className="mt-7 max-w-md">
                {soldOut ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold"
                    style={{ background: "var(--color-background-panel)", color: "var(--color-text-placeholder)" }}
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

                <div
                  className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {[
                    { icon: Lock, label: t.secureCheckout },
                    { icon: CalendarCheck, label: t.orderConfirmation },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <Icon className="size-3.5" style={{ color: "var(--color-brand-primary)" }} aria-hidden />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      <ProcessStepsSection
        eyebrow={t.howEyebrow}
        title={t.howTitle}
        steps={steps}
        theme="light"
      />

      {/* Trust/credibility band — same signals as the tests listing. */}
      <TrustRibbon
        items={[
          { v: tp.trustLabQualityValue, l: tp.trustLabQualityLabel, icon: "sparkles" },
          { v: tp.trustDoctorValue, l: tp.trustDoctorLabel, icon: "doctor" },
          { v: tp.trustHomeValue, l: tp.trustHomeLabel, icon: "shield" },
          { v: tp.trustGdprValue, l: tp.trustGdprLabel, icon: "lock" },
        ]}
      />

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
                <span aria-hidden className="gh2-index" style={{ color: "rgba(176,241,34,0.50)" }}>
                  02
                </span>
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
