import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchLandingSlugs } from "@/lib/api/site-content-api";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Clock,
  FileText,
  Lock,
  ShieldCheck,
  Stethoscope,
  Video,
} from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  getCountryDoctors,
  getCountryServiceDetail,
  getCountryServices,
} from "@/lib/content/get-country-collections";
import { buildBookHref } from "@/lib/routing/book-href";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  faqJsonLd,
  medicalClinicServiceJsonLd,
  medicalSpecialtyForService,
  physicianJsonLd,
} from "@/lib/seo/structured-data";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { ClinicalReviewer } from "@/components/sections/ClinicalReviewer";
import { getCountryDisclaimer } from "@/lib/content/get-country-legal";
import { getCountryTrust } from "@/lib/content/get-country-trust";
import { ServiceLinkedBody } from "@/components/sections/ServiceLinkedBody";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { doctorCardI18n } from "@/components/cards/doctor-card-i18n";
import { DoctifyWidgetLazy as DoctifyWidget } from "@/components/sections/DoctifyReviewsLazy";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { isUnoptimizedImageSrc as isUnlistedRemote } from "@/lib/content/asset-media-url";

type Params = { country: string; lang: string; serviceSlug: string };

/** Admin copy may arrive as rich HTML — flatten to plain text for ledes. */
function stripHtml(value: string | null): string | null {
  if (!value) return value;
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

/** Back-link target = the listing this service belongs to, by kind. */
function listingPath(
  kind: string,
  country: string,
  lang: string,
  labels: { specialist: string; prescription: string; general: string },
): { href: string; label: string } {
  if (kind === "SPECIALIST") {
    return { href: `/${country}/${lang}/specialist-consultation`, label: labels.specialist };
  }
  if (kind === "PRESCRIPTION") {
    return { href: `/${country}/${lang}/prescriptions`, label: labels.prescription };
  }
  return { href: `/${country}/${lang}/general-consultation`, label: labels.general };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang, serviceSlug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return { title: SITE_NAME };
  const config = getCountryByCode(code);

  const detail = await getCountryServiceDetail(code, serviceSlug, lang);
  if (!detail) return { title: SITE_NAME };

  // Admin SEO titles here already carry the service AND the country, and the
  // translated locales run 15-35 chars longer than the English they were
  // budgeted against — a prod audit found 747 of 786 service title rows over
  // Google's ~60-char display budget. `brandSuffix: false` drops the layout's
  // " · Global Health" suffix on this route only: 15 chars back with zero
  // keyword loss, instead of truncating the tail (see page-seo.ts SOCIAL_TITLE_LIMIT
  // for why truncation is off the table). Social/OG titles keep their own brand.
  const title = detail.seoTitle ?? detail.name;
  const baseDescription =
    detail.seoDescription ?? detail.summary ?? `Learn about ${detail.name} and book a consultation.`;
  // Append the auto insurance line to the meta description when companies cover
  // this service, capped so the description stays a sensible length for SERPs.
  const description = detail.insuranceSeoLine
    ? `${baseDescription} ${detail.insuranceSeoLine}`.slice(0, 320)
    : baseDescription;
  return buildPublicMetadata({
    path: `/${country}/${lang}/services/${serviceSlug}`,
    title,
    description,
    brandSuffix: false,
    type: "website",
    kind: "service",
    subtitle: config?.name,
    sourceImage: detail.imageSrc ?? undefined,
    imageAlt: `${detail.name} in ${config?.name ?? country}`,
    locale: config ? ogLocales(config, lang).locale : undefined,
    languages: config ? hreflangAlternates(config, `/services/${serviceSlug}`) : undefined,
    keywords: detail.seoKeywords.length > 0 ? detail.seoKeywords : undefined,
  });
}

/**
 * Service landing page. Hero → admin detailBody → assigned doctors → FAQs → CTA.
 */
export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang, serviceSlug } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) notFound();

  const detail = await getCountryServiceDetail(code, serviceSlug, lang);
  if (!detail) notFound();

  const { common: c, home } = loadLocaleBundle(lang as LocaleCode);
  const t = c.serviceDetailPage;

  // Clinical review date chip — same "Last reviewed <date>" label/format the
  // blog byline already uses. Renders nothing when the service has none set.
  const lastReviewedFormatted = detail.lastReviewedAt
    ? new Date(detail.lastReviewedAt).toLocaleDateString(lang, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const reviewedDateLabel = lastReviewedFormatted
    ? `${home.blog.lastReviewed} ${lastReviewedFormatted}`
    : null;

  // Country-specific short medical disclaimer (admin-authored, per country);
  // falls back to the generic translated line when not set. Independent of
  // the doctor/service reads below — started together instead of sequentially.
  const [{ short: shortDisclaimer }, generals, specialists, allDoctors, landingRes] =
    await Promise.all([
      getCountryDisclaimer(code, lang),
      // Clinicians assigned to this service — surfaced as a credibility strip
      // ahead of the FAQs (mirrors the doctor-profile "services offered" link).
      getCountryServices(code, "GENERAL", lang),
      getCountryServices(code, "SPECIALIST", lang),
      getCountryDoctors(code, lang),
      // SEO landing pages that point AT this service. They are kept out of nav
      // and the service hub by design (Rule 6), so this is their only internal
      // inbound link — without it Google left all 90 of them unindexed.
      fetchLandingSlugs(code, lang).catch(() => null),
    ]);
  const disclaimerText = shortDisclaimer ?? t.disclaimer.replace("{country}", config.name);
  const serviceCard =
    generals.find((s) => s.slug === serviceSlug) ??
    specialists.find((s) => s.slug === serviceSlug);
  const assignedIds = new Set(serviceCard?.assignedDoctorIds ?? []);
  const assignedDoctors =
    assignedIds.size > 0 ? allDoctors.filter((d) => assignedIds.has(d.id)).slice(0, 3) : [];

  // Capped at 4 to match the spec's max-boxes rule — a link dump would defeat
  // the point of keeping these pages off the hub in the first place.
  const relatedTopics = (landingRes?.ok ? landingRes.data.landingPages : [])
    .filter((p) => p.title && p.serviceSlugs.includes(serviceSlug))
    .slice(0, 4);

  // Named clinical reviewer for the E-E-A-T byline + schema — the country's
  // admin-flagged "Clinical Director" (CountryDoctorCard.isFeatured, same
  // flag the /doctors spotlight uses), never a fabricated name. Renders
  // nothing when the country has no featured doctor set.
  const reviewer = allDoctors.find((d) => d.isFeatured) ?? null;
  const reviewerTrust = reviewer ? await getCountryTrust(code, lang as LocaleCode) : null;
  const reviewerHref = reviewer ? `/${country}/${lang}/doctors/${reviewer.slug}` : null;
  const reviewerPhysician = reviewer
    ? physicianJsonLd({
        name: reviewer.fullName,
        title: reviewer.title,
        countryName: config.name,
        url: reviewerHref!,
        registrationNumber: reviewer.registrationNumber,
        chamber: reviewer.registrationChamber,
        regulator: reviewerTrust?.regulator?.name
          ? { name: reviewerTrust.regulator.name, url: reviewerTrust.regulator.url }
          : null,
      })
    : null;

  const back = listingPath(detail.kind, country, lang, {
    specialist: t.backSpecialist,
    prescription: t.backPrescription,
    general: t.backGeneral,
  });
  const bookHref = buildBookHref({ country, lang, service: serviceSlug });
  const heading = detail.heroTitle ?? detail.name;
  const lede = stripHtml(detail.heroDescription) ?? stripHtml(detail.summary);
  const bodyHtml = detail.detailBody ? scopeBlogHtml(detail.detailBody) : null;
  // Resolve internal-link callouts to concrete hrefs (same-country service slug
  // → /services/<slug>; else explicit href). Drops any that resolve nowhere.
  const resolvedLinks = detail.links
    .map((l) => ({
      id: l.id,
      type: l.type,
      anchorSlot: l.anchorSlot,
      heading: l.heading,
      body: l.body,
      ctaLabel: l.ctaLabel,
      href: l.targetSlug
        ? `/${country}/${lang}/services/${l.targetSlug}`
        : l.targetHref ?? "",
    }))
    .filter((l) => l.href !== "");
  const priceLabel =
    detail.basePriceCents != null
      ? formatPriceRounded(detail.basePriceCents, detail.currencyCode)
      : null;
  const bookLabel = detail.ctaLabel ?? t.bookLabel;

  return (
    <>
      {detail.faqs.length > 0 ? (
        <JsonLd data={faqJsonLd(detail.faqs.map((f) => ({ question: f.question, answer: f.answer })))} />
      ) : null}
      <JsonLd
        data={medicalClinicServiceJsonLd({
          serviceName: detail.name,
          description:
            stripHtml(detail.heroDescription) ?? stripHtml(detail.summary) ?? detail.name,
          specialty: medicalSpecialtyForService(detail.kind, detail.slug),
          countryName: config.name,
          countrySlug: country,
          url: `/${country}/${lang}/services/${serviceSlug}`,
          bookingUrl: bookHref,
          reviewerPhysician,
          dateModified: detail.lastReviewedAt,
        })}
      />

      {/* ── Hero — 50/50 split: image left, content + booking right ── */}
      <section
        className="gh-inline-split-hero gh-medical-pattern gh-medical-pattern-dark relative isolate !overflow-visible"
      >
        {/* Mobile/tablet only — full-bleed tinted image behind the text,
         *  same treatment as PageHero/DoctorProfileTemplate: text sits in
         *  front of the photo instead of it being a stacked block above. */}
        {detail.imageSrc ? (
          <div aria-hidden className="gh-medical-pattern-layer absolute inset-0 lg:hidden">
            <Image
              src={detail.imageSrc}
              alt=""
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              className="object-cover object-top"
              unoptimized={isUnlistedRemote(detail.imageSrc)}
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

          {/* ── LEFT — full-bleed service image (desktop only) ──────────────── */}
          <div className="relative hidden h-full overflow-hidden lg:block">
            {detail.imageSrc ? (
              <Image
                src={detail.imageSrc}
                alt={detail.name}
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-top"
                unoptimized={isUnlistedRemote(detail.imageSrc)}
              />
            ) : (
              <div
                className="absolute inset-0 bg-[linear-gradient(135deg,#0a2218_0%,#173528_100%)]"
              />
            )}
            {/* Dark green wash — preserves skin tones, kills harsh hospital blues */}
            <div
              aria-hidden
              className="gh-inline-hero-overlay pointer-events-none absolute inset-0"
            />
            {/* Bottom vignette */}
            <div
              aria-hidden
              className="gh-inline-service-vignette pointer-events-none absolute inset-x-0 bottom-0"
            />
            {/* Right-edge bleed → seamless merge into content column */}
            <div
              aria-hidden
              className="gh-inline-service-bleed pointer-events-none absolute inset-y-0 right-0 hidden lg:block"
            />
          </div>

          {/* ── RIGHT — service content + booking panel ─────────────────────── */}
          <div
            className="gh-inline-panel-base relative flex h-auto min-h-0 flex-col justify-center overflow-visible px-8 py-6 md:px-12 lg:px-14 lg:py-8"
          >
            {/* Atmospheric layers */}
            {/* 1 — gradient depth. Desktop only: at mobile the panel
                 background is the real service photo (above), and this
                 opaque gradient would paint over it. */}
            <div
              aria-hidden
              className="gh-inline-panel-depth pointer-events-none absolute inset-0 z-0 hidden lg:block"
            />
            {/* 2 — technical lime grid */}
            <div
              aria-hidden
              className="gh-inline-service-grid pointer-events-none absolute inset-0 z-0"
            />
            {/* 3 — dot texture */}
            <div
              aria-hidden
              className="gh-dot-grid gh-inline-panel-dots pointer-events-none absolute inset-0 z-0"
            />
            {/* 4 — lime ambient glow behind card */}
            <div
              aria-hidden
              className="gh-inline-service-glow pointer-events-none absolute inset-0 z-0"
            />
            {/* 5 — faint medical plus symbols */}
            <span
              aria-hidden
              className="gh-inline-plus-large pointer-events-none absolute z-0 select-none font-bold leading-none"
            >+</span>
            <span
              aria-hidden
              className="gh-inline-plus-small pointer-events-none absolute z-0 select-none font-bold leading-none"
            >+</span>

            {/* Content stays at its natural size; the document owns scrolling. */}
            <div className="gh-inline-content-max relative z-10">
              {/* Back link */}
              <Link
                href={back.href}
                className="inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-white/35 transition-colors hover:text-[var(--color-brand-accent)]"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                {back.label}
              </Link>

              {/* Eyebrow */}
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--color-brand-accent)]">
                {detail.kind === "SPECIALIST" ? t.eyebrowSpecialist : t.eyebrowOnline}
              </p>

              {/* Title */}
              <h1
                className="mt-2.5 max-w-[16ch] text-[clamp(1.9rem,2.2vw+0.9rem,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.038em] text-[#F5FFF8]"
              >
                {heading}
              </h1>

              {/* Lede */}
              {lede ? (
                <p
                  className="mt-3 line-clamp-3 max-w-[46ch] text-[clamp(0.9rem,0.6vw+0.65rem,1.05rem)] leading-relaxed text-[#B8C9C2]"
                >
                  {lede}
                </p>
              ) : null}

              {/* Insurance availability — auto-generated when companies cover
                * this service ("We also have … for this service."). SEO-friendly
                * and updates automatically as coverage changes in admin. */}
              {detail.insuranceSeoLine ? (
                <p className="mt-3 max-w-[46ch] text-[clamp(0.85rem,0.5vw+0.65rem,1rem)] font-semibold leading-relaxed text-[#8FE3B0]">
                  {detail.insuranceSeoLine}
                </p>
              ) : null}

              {/* Trust row */}
              <div
                className="mt-4 flex flex-wrap items-center gap-y-2 border-t border-white/10 pt-4"
              >
                {[
                  { icon: ShieldCheck, label: t.trustRegistered.replace("{country}", config.name) },
                  { icon: Video, label: t.trustVideo },
                  { icon: Lock, label: t.trustConfidential },
                ].map(({ icon: Icon, label }, i) => (
                  <span key={label} className="flex items-center">
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="mx-5 hidden h-4 w-px bg-white/14 sm:block"
                      />
                    ) : null}
                    <span
                      className="inline-flex items-center gap-2 text-[13px] font-medium text-white/68"
                    >
                      <Icon
                        className="size-4 shrink-0 text-[var(--color-brand-accent)]"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      {label}
                    </span>
                  </span>
                ))}
              </div>

              <ClinicalReviewer
                label={t.clinicallyReviewedBy}
                name={reviewer?.fullName}
                href={reviewerHref}
                credential={reviewer?.imcRegistration}
                reviewedDate={reviewedDateLabel}
              />

              {/* ── Booking card ─────────────────────────────────────────────── */}
              <div
                className="gh-inline-forest-glass mt-4 rounded-[22px]"
              >
                <div className="p-5 md:p-6">
                  {/* Card label */}
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--color-brand-accent)]">
                    {t.bookOnline}
                  </p>

                  {/* Price row */}
                  <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className="text-[clamp(1.75rem,2.6vw,2.4rem)] font-extrabold tracking-[-0.04em] text-[#F5FFF8] [font-variant-numeric:tabular-nums]"
                    >
                      {priceLabel ?? t.priceVaries}
                    </span>
                    {priceLabel ? (
                      <span className="text-[14px] font-medium text-white/42">
                        {t.perConsultation}
                      </span>
                    ) : null}
                  </div>

                  {/* Feature list */}
                  <ul
                    className="mt-3 border-t border-white/9"
                  >
                    {[
                      detail.durationMinutes != null
                        ? { icon: Clock, label: t.minuteAppointment.replace("{count}", String(detail.durationMinutes)) }
                        : null,
                      { icon: Stethoscope, label: t.doctorRegistered.replace("{country}", config.name) },
                      { icon: CalendarCheck, label: t.instantConfirmation },
                      { icon: FileText, label: t.summaryIncluded },
                    ]
                      .filter((row): row is { icon: typeof Clock; label: string } => row !== null)
                      .map(({ icon: Icon, label }) => (
                        <li
                          key={label}
                          className="flex items-center gap-3 border-b border-white/7 py-2.5"
                        >
                          <span
                            className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(176,241,34,0.18)] bg-[rgba(176,241,34,0.13)]"
                          >
                            <Icon
                              className="size-3.5 text-[var(--color-brand-accent)]"
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </span>
                          <span className="text-[13.5px] font-medium text-white/82">
                            {label}
                          </span>
                        </li>
                      ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={bookHref}
                    className="mt-4 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[12px] bg-[var(--color-brand-accent)] text-[clamp(14px,1vw,16px)] font-bold text-[#0a1f14] shadow-[0_4px_12px_rgba(176,241,34,0.14)] transition-all"
                  >
                    {bookLabel}
                    <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
                  </Link>

                  {/* Secure checkout note */}
                  <p
                    className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-white/35"
                  >
                    <Lock className="size-3" aria-hidden />
                    {t.secureCheckoutFooter}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Admin-authored rich detail body */}
      {bodyHtml ? (
        <section className="gh-inline-clamp-section gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
          <SectionSeam theme="light" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
              {t.aboutService}
            </p>
            <div
              className="gh2-card-ivory mt-8 border-t-2 border-t-[rgba(176,241,34,0.24)] p-6 md:p-8"
            >
              {resolvedLinks.length > 0 ? (
                <ServiceLinkedBody
                  bodyHtml={bodyHtml}
                  links={resolvedLinks}
                  labels={{ upgrade: t.eyebrowSpecialist, ...c.linkCallout }}
                />
              ) : (
                <div
                  className="gh-article-body"
                  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- bodyHtml = scopeBlogHtml(detail.detailBody), sanitize-html with a controlled allowlist.
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Who you'll see — clinicians assigned to this service. */}
      {assignedDoctors.length > 0 ? (
        <section className="gh-inline-clamp-section gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
          <SectionSeam theme="light" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <header>
              <h2
                className="max-w-[20ch] text-[clamp(1.9rem,3.5vw,2.8rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--color-text-primary)]"
              >
                {(detail.kind === "SPECIALIST"
                  ? c.specialistPage.doctorsSectionTitle
                  : c.gpPage.doctorsSectionTitle
                ).replace("{country}", config.name)}
              </h2>
              <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-text-muted)]">
                {detail.kind === "SPECIALIST"
                  ? c.specialistPage.doctorsSectionIntro
                  : c.gpPage.doctorsSectionIntro}
              </p>
            </header>
            <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {assignedDoctors.map((d) => (
                <li key={d.id}>
                  <DoctorCard
                    cardI18n={doctorCardI18n(c.doctors)}
                    name={d.fullName}
                    title={d.title}
                    imcRegistration={d.imcRegistration}
                    medicalRegistrationUrl={d.medicalRegistrationUrl}
                    languages={d.languages}
                    whatsappNumber={d.whatsappNumber}
                    bio={d.bio ?? ""}
                    imageSrc={d.imageSrc ?? null}
                    imageFocalX={d.imageFocalX}
                    imageFocalY={d.imageFocalY}
                    imageZoom={d.imageZoom}
                    country={country}
                    href={`/${country}/${lang}/doctors/${d.slug}`}
                    bookingHref={buildBookHref({
                      country,
                      lang,
                      service: serviceSlug,
                      doctor: d.slug,
                    })}
                    ctaLabel={c.doctors.viewProfile}
                    dark
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {detail.faqs.length > 0 ? (
        <FAQSection title={t.faqTitle} items={detail.faqs} />
      ) : null}

      {relatedTopics.length > 0 ? (
        <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <h2
              className="font-extrabold tracking-[-0.02em] leading-tight"
              style={{
                fontSize: "clamp(1.25rem, 1.5vw + 0.75rem, 1.75rem)",
                color: "var(--color-text-primary)",
              }}
            >
              {t.relatedTopicsTitle}
            </h2>
            <ul className="mt-4 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
              {relatedTopics.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    href={`/${country}/${lang}/health/${topic.slug}`}
                    className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline decoration-[rgba(29,75,54,0.28)] underline-offset-4 transition-colors hover:text-[var(--color-brand-primary-hover)]"
                  >
                    {topic.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Doctify social proof — compact verified-rating strip */}
      <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <DoctifyWidget variant="horizontal" language={lang} />
        </div>
      </section>

      {/* Short medical disclaimer — between FAQ and the closing booking CTA */}
      <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <MedicalDisclaimer variant="short" text={disclaimerText} />
        </div>
      </section>

      {/* Closing booking band — visual parity with FinalCTA (§14) */}
      <section
        className="gh-inline-clamp-section gh2-section-forest relative isolate overflow-hidden gh-medical-pattern gh-medical-pattern-dark"
      >
        <SectionSeam theme="dark" />
        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                  {t.readyEyebrow}
                </span>
              </p>
              <h2
                className="mt-5 max-w-[18ch] text-[clamp(2rem,4vw,3.4rem)] font-extrabold leading-[1.0] tracking-[-0.035em] text-white/95"
              >
                {t.bookHeading.replace("{service}", detail.name).replace("{country}", config.name)}
              </h2>
              <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-[var(--gh2-on-dark-muted)]">
                {priceLabel ? t.fromPricePrefix.replace("{price}", priceLabel) : ""}
                {t.liveAvailability}
              </p>
            </div>
            <div className="flex lg:justify-end">
              <Link href={bookHref} className="gh2-btn-lime gh-focus-on-dark">
                {bookLabel}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
