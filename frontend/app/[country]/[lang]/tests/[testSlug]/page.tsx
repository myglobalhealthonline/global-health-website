import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
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
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/structured-data";
import {
  ChecklistSection,
  WhyChooseSection,
  ImportantInfoSection,
} from "@/components/sections/ServiceContentSections";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { FAQSection } from "@/components/sections/FAQSection";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { SectionSeam } from "@/components/ui/SectionSeam";
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
  const config = getCountryByCode(code);

  const detail = await getCountryHealthTestDetail(code, testSlug, lang);
  if (!detail) return { title: SITE_NAME };

  // Admin SEO title is set absolute (already branded); otherwise the bare
  // test title lets the layout template append the brand once.
  const title = detail.seoTitle ?? detail.title;
  const description =
    detail.seoDescription ??
    stripHtml(detail.shortDescription) ??
    `Lab-quality ${detail.title}, reviewed by a doctor.`;
  return buildPublicMetadata({
    path: `/${country}/${lang}/lab-tests/${testSlug}`,
    title,
    description,
    type: "website",
    kind: "service",
    subtitle: config?.name,
    sourceImage: detail.imageSrc ?? undefined,
    imageAlt: `${detail.title} in ${config?.name ?? country}`,
    locale: config ? ogLocales(config, lang).locale : undefined,
    languages: config ? hreflangAlternates(config, `/lab-tests/${testSlug}`) : undefined,
  });
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
  // Canonical public path — `/tests/…` is only the internal rewrite target.
  const backHref = `/${country}/${lang}/lab-tests`;
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
      {/* The FAQs render visually below but emitted no FAQPage schema, unlike
          the /services/ pages that use the same FAQSection — so the answers
          were invisible to rich results. Same guard and shape as the service
          route (see services/[serviceSlug]/page.tsx). */}
      {detail.faqs.length > 0 ? (
        <JsonLd
          data={faqJsonLd(detail.faqs.map((f) => ({ question: f.question, answer: f.answer })))}
        />
      ) : null}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${country}/${lang}` },
          { name: "Lab tests", url: backHref },
          { name: detail.title, url: `/${country}/${lang}/lab-tests/${testSlug}` },
        ])}
      />

      {/* ── Hero — 50/50 split: image left, content + product card right ── */}
      <section
        className="gh-inline-split-hero gh-medical-pattern gh-medical-pattern-dark relative isolate !overflow-visible"
      >
        {/* Mobile/tablet only — full-bleed tinted image behind the text,
         *  same treatment as PageHero/DoctorProfileTemplate: text sits in
         *  front of the photo instead of it being a stacked block above. */}
        {detail.imageSrc ? (
          <div aria-hidden className="gh-medical-pattern-layer absolute inset-0 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.imageSrc}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(3,31,24,0.62) 0%, rgba(3,31,24,0.78) 45%, rgba(3,31,24,0.96) 100%)," +
                  "linear-gradient(90deg, rgba(3,31,24,0.55) 0%, rgba(3,31,24,0.35) 55%, rgba(3,31,24,0.20) 100%)",
              }}
            />
          </div>
        ) : null}

        <div className="grid h-auto lg:grid-cols-2">

          {/* ── LEFT — full-bleed test image (desktop only) ─────────────── */}
          <div className="relative hidden h-full overflow-hidden lg:block">
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
                  objectPosition: "center top",
                }}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0a2218 0%, #173528 100%)" }}
              >
                <FlaskConical
                  className="size-40 opacity-[0.10]"
                  style={{ color: "var(--color-brand-accent)" }}
                  strokeWidth={0.9}
                  aria-hidden
                />
              </div>
            )}
            {/* Dark green wash */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "rgba(3,31,24,0.22)", mixBlendMode: "multiply" }}
            />
            {/* Bottom vignette */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{
                height: "50%",
                background:
                  "linear-gradient(to top, rgba(3,31,24,0.88) 0%, rgba(3,31,24,0.32) 50%, transparent 100%)",
              }}
            />
            {/* Right-edge bleed → seamless merge into content column */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block"
              style={{
                width: "44%",
                background:
                  "linear-gradient(to right, transparent 0%, rgba(3,31,24,0.60) 45%, rgba(3,31,24,0.92) 75%, #031F18 100%)",
              }}
            />
          </div>

          {/* ── RIGHT — content + product card ──────────────────────── */}
          <div
            className="gh-inline-panel-base relative flex h-auto min-h-0 flex-col justify-center overflow-visible px-8 py-6 md:px-12 lg:px-14 lg:py-8"
          >
            {/* 1 — gradient depth. Desktop only: at mobile the panel
                 background is the real test photo (above), and this opaque
                 gradient would paint over it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
              style={{
                background:
                  "radial-gradient(circle at 88% 14%, rgba(22,89,64,0.30), transparent 42%)," +
                  "radial-gradient(circle at 12% 88%, rgba(2,18,13,0.55), transparent 44%)," +
                  "linear-gradient(135deg, #062b21 0%, #031F18 50%, #02140e 100%)",
              }}
            />
            {/* 2 — technical lime grid */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(176,241,34,0.045) 1px, transparent 1px)," +
                  "linear-gradient(90deg, rgba(176,241,34,0.045) 1px, transparent 1px)",
                backgroundSize: "52px 52px",
                maskImage:
                  "radial-gradient(130% 130% at 80% 18%, #000 0%, rgba(0,0,0,0.40) 52%, transparent 88%)",
                WebkitMaskImage:
                  "radial-gradient(130% 130% at 80% 18%, #000 0%, rgba(0,0,0,0.40) 52%, transparent 88%)",
              }}
            />
            {/* 3 — dot texture */}
            <div
              aria-hidden
              className="gh-dot-grid pointer-events-none absolute inset-0 z-0"
              style={{
                opacity: 0.55,
                maskImage:
                  "radial-gradient(700px 540px at 86% 12%, #000 0%, transparent 70%)",
                WebkitMaskImage:
                  "radial-gradient(700px 540px at 86% 12%, #000 0%, transparent 70%)",
              }}
            />
            {/* 4 — lime ambient glow behind card */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(ellipse 560px 480px at 72% 64%, rgba(176,241,34,0.10), transparent 62%)," +
                  "radial-gradient(ellipse 640px 540px at 112% -8%, rgba(176,241,34,0.11), transparent 60%)",
              }}
            />
            {/* 5 — faint plus symbols */}
            <span
              aria-hidden
              className="pointer-events-none absolute z-0 select-none font-bold leading-none"
              style={{ top: "-2%", right: "5%", fontSize: "190px", color: "rgba(176,241,34,0.055)" }}
            >+</span>
            <span
              aria-hidden
              className="pointer-events-none absolute z-0 select-none font-bold leading-none"
              style={{ bottom: "8%", right: "10%", fontSize: "78px", color: "rgba(176,241,34,0.045)" }}
            >+</span>

            {/* Content stays at its natural size; the document owns scrolling. */}
            <div className="relative z-10 max-w-[680px]">
              {/* Back link */}
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.18em] transition-colors hover:text-[var(--color-brand-accent)]"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                {t.backToTests}
              </Link>

              {/* Eyebrow */}
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: "var(--color-brand-accent)" }}>
                {t.eyebrow}
              </p>

              {/* Title */}
              <h1
                className="mt-2.5 font-extrabold leading-[1.02] tracking-[-0.038em]"
                style={{
                  fontSize: "clamp(1.9rem, 2.2vw + 0.9rem, 3.4rem)",
                  color: "#F5FFF8",
                  maxWidth: "16ch",
                }}
              >
                {detail.title}
              </h1>

              {/* Lede */}
              {intro ? (
                <p
                  className="mt-3 leading-relaxed"
                  style={{
                    maxWidth: "46ch",
                    fontSize: "clamp(0.9rem, 0.6vw + 0.65rem, 1.05rem)",
                    color: "#B8C9C2",
                  }}
                >
                  {intro}
                </p>
              ) : null}

              {/* Trust row */}
              <div
                className="mt-4 flex flex-wrap items-center gap-y-2 border-t pt-4"
                style={{ borderColor: "rgba(255,255,255,0.10)" }}
              >
                {[
                  { icon: ShieldCheck, label: t.doctorReviewed },
                  { icon: Stethoscope, label: tp.trustLabQualityLabel },
                  { icon: Package, label: tp.trustHomeLabel },
                ].map(({ icon: Icon, label }, i) => (
                  <span key={label} className="flex items-center">
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="mx-5 hidden h-4 w-px sm:block"
                        style={{ background: "rgba(255,255,255,0.14)" }}
                      />
                    ) : null}
                    <span
                      className="inline-flex items-center gap-2 text-[13px] font-medium"
                      style={{ color: "rgba(255,255,255,0.68)" }}
                    >
                      <Icon
                        className="size-4 shrink-0"
                        style={{ color: "var(--color-brand-accent)" }}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      {label}
                    </span>
                  </span>
                ))}
              </div>

              {/* ── Product card ─────────────────────────────────────── */}
              <div
                className="mt-4 rounded-[22px]"
                style={{
                  background: "rgba(5,34,27,0.78)",
                  border: "1px solid rgba(176,241,34,0.18)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <div className="p-5 md:p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: "var(--color-brand-accent)" }}>
                    {t.eyebrow}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className="font-extrabold tracking-[-0.04em] [font-variant-numeric:tabular-nums]"
                      style={{ fontSize: "clamp(1.75rem,2.6vw,2.4rem)", color: "#F5FFF8" }}
                    >
                      {priceLabel}
                    </span>
                    <span className="text-[14px] font-medium" style={{ color: "rgba(255,255,255,0.42)" }}>
                      {t.inclDoctorReview}
                    </span>
                    {lowStock != null ? (
                      <span className="gh-badge gh-badge-warning">{t.onlyLeft.replace("{count}", String(lowStock))}</span>
                    ) : null}
                    {soldOut ? <span className="gh-badge gh-badge-error">{t.soldOut}</span> : null}
                  </div>

                  <ul className="mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
                    {specs.map(({ icon: Icon, label, value }) => (
                      <li
                        key={value}
                        className="flex items-center gap-3 border-b py-2.5"
                        style={{ borderColor: "rgba(255,255,255,0.07)" }}
                      >
                        <span
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px]"
                          style={{ background: "rgba(176,241,34,0.13)", border: "1px solid rgba(176,241,34,0.18)" }}
                        >
                          <Icon
                            className="size-3.5"
                            style={{ color: "var(--color-brand-accent)" }}
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </span>
                        <span className="text-[13.5px] font-medium" style={{ color: "rgba(255,255,255,0.82)" }}>
                          {label}: {value}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    {soldOut ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-[52px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-[12px] px-6 text-[15px] font-bold"
                        style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.35)" }}
                      >
                        {t.soldOut}
                      </button>
                    ) : (
                      <AddToCartButton
                        kind="HEALTH_TEST"
                        healthTestId={detail.id}
                        label={detail.heroButtonLabel ?? t.addToCart.replace("{price}", priceLabel)}
                        className="gh2-btn-lime h-[52px] w-full justify-center rounded-[12px] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    )}
                  </div>

                  <p
                    className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px]"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    <Lock className="size-3" aria-hidden />
                    {t.secureCheckout}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trust/credibility band — anchored immediately below the hero
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
          title={t.faqTitle}
          items={detail.faqs}
        />
      ) : null}

      {/* No AlsoAvailableIn here by design (owner call, 2026-08-06): the kit
          copy is English-only, so the locale links led to pages showing the
          same English text under a Portuguese/Spanish/Czech heading. The
          hreflang alternates in generateMetadata still cover it for search. */}

      {/* Closing CTA band — mirror of the service detail booking band. */}
      <section
        className="gh2-hero relative isolate overflow-hidden"
        style={{
          padding: "clamp(56px,7vw,96px) 0",
        }}
      >
        <SectionSeam theme="dark" />
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
        title={c.a11y.medicalDisclaimer}
      />
    </>
  );
}
