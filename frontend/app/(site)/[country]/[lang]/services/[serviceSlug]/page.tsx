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
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqJsonLd } from "@/lib/seo/structured-data";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
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
    alternates: { canonical: url },
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
  const bookHref = `/${country}/${lang}/consult/${serviceSlug}`;
  const heading = detail.heroTitle ?? detail.name;
  const lede = stripHtml(detail.heroDescription) ?? stripHtml(detail.summary);
  const bodyHtml = detail.detailBody ? scopeBlogHtml(detail.detailBody) : null;
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

      {/* Hero — full-viewport 50/50 split: image left, content + booking right */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
        style={{ background: "#0F2E25" }}
      >
        <div className="grid lg:grid-cols-2" style={{ minHeight: "min(100vh, 880px)" }}>

          {/* LEFT — full-bleed service image */}
          <div
            className="relative overflow-hidden"
            style={{ minHeight: "clamp(300px, 50vw, 880px)" }}
          >
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
                  objectPosition: "center",
                }}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, #0d2a1f 0%, #1a3d2b 100%)" }}
              />
            )}
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

          {/* RIGHT — service content + booking panel */}
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
                href={back.href}
                className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-[var(--color-brand-accent)]"
                style={{ color: "rgba(255,255,255,0.40)" }}
              >
                <ArrowLeft className="size-4" aria-hidden />
                {back.label}
              </Link>

              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--color-brand-accent)" }}>
                {detail.specialtyName ?? (detail.kind === "SPECIALIST" ? t.eyebrowSpecialist : t.eyebrowOnline)}
              </p>

              <h1
                className="mt-4 font-extrabold leading-[1.0] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2rem,3.5vw+0.5rem,3.5rem)", color: "rgba(255,255,255,0.95)", maxWidth: "16ch" }}
              >
                {heading}
              </h1>

              {lede ? (
                <p
                  className="mt-4 max-w-[48ch] leading-relaxed"
                  style={{ fontSize: "var(--text-body-lg)", color: "rgba(255,255,255,0.58)" }}
                >
                  {lede}
                </p>
              ) : null}

              <div
                className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-5"
                style={{ borderColor: "rgba(255,255,255,0.10)" }}
              >
                {[
                  { icon: ShieldCheck, label: t.trustRegistered.replace("{country}", config.name) },
                  { icon: Video, label: t.trustVideo },
                  { icon: Lock, label: t.trustConfidential },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 text-[13px] font-medium"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    <Icon className="size-4 shrink-0" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                    {label}
                  </span>
                ))}
              </div>

              {/* Booking card — image omitted, left column is the visual */}
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
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]">
                    {t.bookOnline}
                  </p>

                  <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className="font-extrabold tracking-[-0.03em] [font-variant-numeric:tabular-nums]"
                      style={{ fontSize: "clamp(1.9rem,3vw,2.5rem)", color: "rgba(255,255,255,0.95)" }}
                    >
                      {priceLabel ?? t.priceVaries}
                    </span>
                    {priceLabel ? (
                      <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {t.perConsultation}
                      </span>
                    ) : null}
                  </div>

                  <ul className="mt-5 space-y-3 border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
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
                        <li key={label} className="flex items-center gap-3">
                          <span
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]"
                            style={{ background: "rgba(176,241,34,0.12)" }}
                          >
                            <Icon className="size-4" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.8} aria-hidden />
                          </span>
                          <span className="text-[14px] font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>
                            {label}
                          </span>
                        </li>
                      ))}
                  </ul>

                  <Link href={bookHref} className="gh2-btn-lime mt-6 w-full justify-center">
                    {bookLabel}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>

                  <p
                    className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs"
                    style={{ color: "rgba(255,255,255,0.40)" }}
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
            <div className="gh-article-body mt-8 max-w-[76ch]" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
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

      {/* Closing booking band */}
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
                  {t.readyEyebrow}
                </span>
              </p>
              <h2
                className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2rem,4vw,3.4rem)", color: "rgba(255,255,255,0.95)", maxWidth: "18ch" }}
              >
                {t.bookHeading.replace("{service}", detail.name).replace("{country}", config.name)}
              </h2>
              <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                {priceLabel ? t.fromPricePrefix.replace("{price}", priceLabel) : ""}
                {t.liveAvailability}
              </p>
            </div>
            <div className="flex lg:justify-end">
              <Link href={bookHref} className="gh2-btn-lime">
                {bookLabel}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
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
