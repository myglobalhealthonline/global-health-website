import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
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
import { FAQSection } from "@/components/sections/FAQSection";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { KitRedemptionCallout } from "@/components/subscription/KitRedemptionCallout";
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

  const { common: c, subscription } = loadLocaleBundle(lang as LocaleCode);
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

      {/* Test product page — e-commerce layout: image left, buy info right */}
      <section style={{ background: "var(--color-background-soft)", borderBottom: "1px solid rgba(29,75,54,0.08)" }}>
        <div
          className="mx-auto max-w-[var(--container-width)] px-5 md:px-10"
          style={{ paddingTop: "clamp(40px,5vw,72px)", paddingBottom: "clamp(48px,6vw,88px)" }}
        >
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-[var(--color-brand-primary)]"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t.backToTests}
          </Link>

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">

            {/* LEFT — product image + gallery */}
            <div>
              <div
                className="overflow-hidden rounded-[var(--radius-card)]"
                style={{
                  background: "#ffffff",
                  boxShadow: "0 2px 32px rgba(29,75,54,0.09)",
                  border: "1px solid rgba(29,75,54,0.07)",
                }}
              >
                {detail.imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.imageSrc}
                    alt={detail.title}
                    style={{
                      width: "100%",
                      aspectRatio: "4 / 3",
                      objectFit: "contain",
                      padding: "clamp(16px,5%,40px)",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{ aspectRatio: "4 / 3", background: "rgba(29,75,54,0.03)" }}
                  >
                    <FlaskConical
                      className="size-24"
                      style={{ color: "var(--color-brand-primary)", opacity: 0.22 }}
                      strokeWidth={1.2}
                      aria-hidden
                    />
                  </div>
                )}
              </div>

              {/* Gallery thumbnails */}
              {detail.gallery.length > 0 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {detail.imageSrc ? (
                    <div
                      className="shrink-0 overflow-hidden rounded-[10px]"
                      style={{
                        width: 72,
                        height: 72,
                        background: "#ffffff",
                        border: "2px solid var(--color-brand-accent)",
                        boxShadow: "0 1px 8px rgba(29,75,54,0.10)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={detail.imageSrc}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
                      />
                    </div>
                  ) : null}
                  {detail.gallery.map((src, i) => (
                    <div
                      key={i}
                      className="shrink-0 overflow-hidden rounded-[10px]"
                      style={{
                        width: 72,
                        height: 72,
                        background: "#ffffff",
                        border: "1px solid rgba(29,75,54,0.12)",
                        boxShadow: "0 1px 8px rgba(29,75,54,0.06)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${detail.title} view ${i + 2}`}
                        style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* RIGHT — product info + buy */}
            <div>
              {/* Badge row */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.10em]"
                  style={{ background: "rgba(176,241,34,0.18)", color: "var(--color-brand-primary)" }}
                >
                  <ShieldCheck className="size-3.5" aria-hidden />
                  {t.doctorReviewed}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.10em]"
                  style={{ background: "rgba(29,75,54,0.07)", color: "var(--color-brand-primary)" }}
                >
                  <FlaskConical className="size-3.5" aria-hidden />
                  {t.eyebrow}
                </span>
              </div>

              <h1
                className="mt-4 font-extrabold leading-[1.05] tracking-[-0.03em]"
                style={{ fontSize: "clamp(1.75rem,3vw,2.6rem)", color: "var(--color-text-primary)" }}
              >
                {detail.title}
              </h1>

              {intro ? (
                <p
                  className="mt-3 max-w-[52ch] leading-relaxed"
                  style={{ fontSize: "var(--text-body-lg)", color: "var(--color-text-muted)" }}
                >
                  {intro}
                </p>
              ) : null}

              {/* Spec chips */}
              <div className="mt-5 flex flex-wrap gap-2">
                {specs.map(({ icon: Icon, value }) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium"
                    style={{ background: "rgba(29,75,54,0.07)", color: "var(--color-brand-primary)" }}
                  >
                    <Icon className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                    {value}
                  </span>
                ))}
              </div>

              {/* What's covered — preview */}
              {detail.whatThisTestCovers.length > 0 ? (
                <ul
                  className="mt-6 space-y-2.5 border-t pt-6"
                  style={{ borderColor: "rgba(29,75,54,0.10)" }}
                >
                  {detail.whatThisTestCovers.slice(0, 5).map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(176,241,34,0.22)" }}
                      >
                        <Check
                          className="size-3"
                          style={{ color: "var(--color-brand-primary)" }}
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      </span>
                      <span className="text-sm leading-snug" style={{ color: "var(--color-text-secondary, var(--color-text-primary))" }}>
                        {item}
                      </span>
                    </li>
                  ))}
                  {detail.whatThisTestCovers.length > 5 ? (
                    <li
                      className="pl-8 text-sm font-medium"
                      style={{ color: "var(--color-brand-primary)", opacity: 0.65 }}
                    >
                      +{detail.whatThisTestCovers.length - 5} more biomarkers below ↓
                    </li>
                  ) : null}
                </ul>
              ) : null}

              {/* Price + CTA */}
              <div
                className="mt-6 border-t pt-6"
                style={{ borderColor: "rgba(29,75,54,0.10)" }}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className="font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]"
                    style={{ fontSize: "clamp(2rem,3vw,2.6rem)", color: "var(--color-text-primary)" }}
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

                <div className="mt-4">
                  {soldOut ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold"
                      style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.35)" }}
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

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {[
                    { icon: Lock, label: t.secureCheckout },
                    { icon: CalendarCheck, label: t.orderConfirmation },
                  ].map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
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

      {detail.faqs.length > 0 ? (
        <FAQSection
          title="Frequently asked questions"
          items={detail.faqs}
        />
      ) : null}

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

      {/* Wellness-credit redemption — renders only for eligible subscribers. */}
      <KitRedemptionCallout
        healthTestId={detail.id}
        copy={subscription.redeem.onTestPage}
      />

      <MedicalDisclaimer
        paragraphs={[t.disclaimer.replace("{country}", config.name)]}
      />
    </>
  );
}
