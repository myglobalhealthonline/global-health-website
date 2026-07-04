import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
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
import { getSiteUrl } from "@/lib/seo/site-url";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  faqJsonLd,
  medicalClinicServiceJsonLd,
  medicalSpecialtyForService,
} from "@/lib/seo/structured-data";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { getCountryDisclaimer } from "@/lib/content/get-country-legal";
import { ServiceLinkedBody } from "@/components/sections/ServiceLinkedBody";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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

  // When an admin SEO title exists it already carries branding, so set it
  // absolute to bypass the layout's "%s · Global Health" template. Otherwise
  // fall back to the bare service name and let the template add the brand.
  const title = detail.seoTitle ?? detail.name;
  const description =
    detail.seoDescription ?? detail.summary ?? `Learn about ${detail.name} and book a consultation.`;
  const url = `${getSiteUrl()}/${country}/${lang}/services/${serviceSlug}`;
  return {
    title: detail.seoTitle ? { absolute: title } : title,
    description,
    ...(detail.seoKeywords.length > 0 ? { keywords: detail.seoKeywords } : {}),
    alternates: {
      canonical: url,
      ...(config ? { languages: hreflangAlternates(config, `/services/${serviceSlug}`) } : {}),
    },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
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

  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const t = c.serviceDetailPage;

  // Country-specific short medical disclaimer (admin-authored, per country);
  // falls back to the generic translated line when not set.
  const { short: shortDisclaimer } = await getCountryDisclaimer(code, lang);
  const disclaimerText = shortDisclaimer ?? t.disclaimer.replace("{country}", config.name);

  // Clinicians assigned to this service — surfaced as a credibility strip
  // ahead of the FAQs (mirrors the doctor-profile "services offered" link).
  const [generals, specialists, allDoctors] = await Promise.all([
    getCountryServices(code, "GENERAL", lang),
    getCountryServices(code, "SPECIALIST", lang),
    getCountryDoctors(code, lang),
  ]);
  const serviceCard =
    generals.find((s) => s.slug === serviceSlug) ??
    specialists.find((s) => s.slug === serviceSlug);
  const assignedIds = new Set(serviceCard?.assignedDoctorIds ?? []);
  const assignedDoctors =
    assignedIds.size > 0 ? allDoctors.filter((d) => assignedIds.has(d.id)).slice(0, 3) : [];

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
          url: `/${country}/${lang}/services/${serviceSlug}`,
          bookingUrl: bookHref,
        })}
      />

      {/* ── Hero — full-viewport 50/50 split: image left, content + booking right ── */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
        style={{ background: "#031F18", height: "calc(100svh - var(--header-height))", minHeight: 620 }}
      >
        <div className="grid h-full lg:grid-cols-2">

          {/* ── LEFT — full-bleed service image ────────────────────────────── */}
          <div className="relative h-full overflow-hidden">
            {detail.imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.imageSrc}
                alt={detail.name}
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
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, #0a2218 0%, #173528 100%)" }}
              />
            )}
            {/* Dark green wash — preserves skin tones, kills harsh hospital blues */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: "rgba(3,31,24,0.22)",
                mixBlendMode: "multiply",
              }}
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

          {/* ── RIGHT — service content + booking panel ─────────────────────── */}
          <div
            className="relative flex h-full flex-col justify-center overflow-y-auto px-8 py-6 md:px-12 lg:px-14 lg:py-8"
            style={{ background: "#031F18" }}
          >
            {/* Atmospheric layers */}
            {/* 1 — gradient depth */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
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
            {/* 5 — faint medical plus symbols */}
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

            {/* Content */}
            <div className="relative z-10" style={{ maxWidth: 680 }}>
              {/* Back link */}
              <Link
                href={back.href}
                className="inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.18em] transition-colors hover:text-[var(--color-brand-accent)]"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                {back.label}
              </Link>

              {/* Eyebrow */}
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: "var(--color-brand-accent)" }}>
                {detail.kind === "SPECIALIST" ? t.eyebrowSpecialist : t.eyebrowOnline}
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
                {heading}
              </h1>

              {/* Lede */}
              {lede ? (
                <p
                  className="mt-3 leading-relaxed"
                  style={{
                    maxWidth: "46ch",
                    fontSize: "clamp(0.9rem, 0.6vw + 0.65rem, 1.05rem)",
                    color: "#B8C9C2",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {lede}
                </p>
              ) : null}

              {/* Trust row */}
              <div
                className="mt-4 flex flex-wrap items-center gap-y-2 border-t pt-4"
                style={{ borderColor: "rgba(255,255,255,0.10)" }}
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

              {/* ── Booking card ─────────────────────────────────────────────── */}
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
                  {/* Card label */}
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: "var(--color-brand-accent)" }}>
                    {t.bookOnline}
                  </p>

                  {/* Price row */}
                  <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className="font-extrabold tracking-[-0.04em] [font-variant-numeric:tabular-nums]"
                      style={{ fontSize: "clamp(1.75rem,2.6vw,2.4rem)", color: "#F5FFF8" }}
                    >
                      {priceLabel ?? t.priceVaries}
                    </span>
                    {priceLabel ? (
                      <span className="text-[14px] font-medium" style={{ color: "rgba(255,255,255,0.42)" }}>
                        {t.perConsultation}
                      </span>
                    ) : null}
                  </div>

                  {/* Feature list */}
                  <ul
                    className="mt-3 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.09)" }}
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
                            {label}
                          </span>
                        </li>
                      ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={bookHref}
                    className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-[12px] font-bold transition-all"
                    style={{
                      height: 52,
                      background: "var(--color-brand-accent)",
                      color: "#0a1f14",
                      fontSize: "clamp(14px,1vw,16px)",
                      boxShadow: "0 4px 12px rgba(176,241,34,0.14)",
                    }}
                  >
                    {bookLabel}
                    <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
                  </Link>

                  {/* Secure checkout note */}
                  <p
                    className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px]"
                    style={{ color: "rgba(255,255,255,0.35)" }}
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
        <section
          style={{
            background: "var(--color-background-soft)",
            padding: "clamp(56px,7vw,104px) 0",
            borderTop: "1px solid rgba(29,75,54,0.10)",
          }}
        >
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--color-brand-primary)" }}>
              {t.aboutService}
            </p>
            <div
              className="gh2-card-ivory mt-8 max-w-prose p-6 md:p-8"
              style={{ borderTop: "2px solid rgba(176,241,34,0.24)" }}
            >
              {resolvedLinks.length > 0 ? (
                <ServiceLinkedBody bodyHtml={bodyHtml} links={resolvedLinks} />
              ) : (
                <div className="gh-article-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Who you'll see — clinicians assigned to this service. */}
      {assignedDoctors.length > 0 ? (
        <section
          style={{
            background: "var(--color-background-soft)",
            padding: "clamp(56px,7vw,104px) 0",
            borderTop: "1px solid rgba(29,75,54,0.10)",
          }}
        >
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <header>
              <h2
                className="max-w-[20ch] font-extrabold leading-[1.05] tracking-[-0.03em]"
                style={{ fontSize: "clamp(1.9rem,3.5vw,2.8rem)", color: "var(--color-text-primary)" }}
              >
                {(detail.kind === "SPECIALIST"
                  ? c.specialistPage.doctorsSectionTitle
                  : c.gpPage.doctorsSectionTitle
                ).replace("{country}", config.name)}
              </h2>
              <p className="mt-3 max-w-[58ch] text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {detail.kind === "SPECIALIST"
                  ? c.specialistPage.doctorsSectionIntro
                  : c.gpPage.doctorsSectionIntro}
              </p>
            </header>
            <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {assignedDoctors.map((d) => (
                <li key={d.id}>
                  <DoctorCard
                    name={d.fullName}
                    title={d.title}
                    imcRegistration={d.imcRegistration}
                    medicalRegistrationUrl={d.medicalRegistrationUrl}
                    languages={d.languages}
                    whatsappNumber={d.whatsappNumber}
                    bio={d.bio ?? ""}
                    imageSrc={d.imageSrc ?? null}
                    country={country}
                    href={`/${country}/${lang}/doctors/${d.slug}`}
                    bookingHref={buildBookHref({
                      country,
                      lang,
                      service: serviceSlug,
                      doctor: d.slug,
                    })}
                    ctaLabel={c.doctors.viewProfile}
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

      {/* Short medical disclaimer — between FAQ and the closing booking CTA */}
      <section
        style={{
          background: "var(--color-background-soft)",
          padding: "clamp(28px,4vw,48px) 0",
        }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <MedicalDisclaimer variant="short" text={disclaimerText} />
        </div>
      </section>

      {/* Closing booking band — visual parity with FinalCTA (§14) */}
      <section
        className="gh2-section-forest relative isolate overflow-hidden gh-medical-pattern gh-medical-pattern-dark"
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
                  {t.readyEyebrow}
                </span>
              </p>
              <h2
                className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2rem,4vw,3.4rem)", color: "rgba(255,255,255,0.95)", maxWidth: "18ch" }}
              >
                {t.bookHeading.replace("{service}", detail.name).replace("{country}", config.name)}
              </h2>
              <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed" style={{ color: "var(--gh2-on-dark-muted)" }}>
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
