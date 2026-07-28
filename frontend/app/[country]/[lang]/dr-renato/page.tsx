import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, ShieldCheck, Video } from "lucide-react";
import { ServiceHero } from "@/components/sections/ServiceHero";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import {
  ImportantInfoSection,
  ProcessStepsSection,
  ServiceIntro,
} from "@/components/sections/ServiceContentSections";
import { FAQSection } from "@/components/sections/FAQSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { Flag } from "@/components/ui/Flag";
import { fetchCrossBorderRxFees } from "@/lib/api/site-content-api";
import { getCountryDoctors, getCountryServices } from "@/lib/content/get-country-collections";
import { formatPriceRounded } from "@/lib/format-currency";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { buildBookHref } from "@/lib/routing/book-href";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import {
  CROSS_BORDER_COUNTRIES,
  isShareLocale,
  SHARE_COPY,
  SHARE_LOCALES,
  type ShareLocale,
} from "./copy";

/**
 * Dr. Renato's shareable consultation page.
 *
 * Deliberately OUT of the indexed site: `noindex`, absent from the sitemap and
 * from nav. It exists so the doctor can hand one link to a patient (WhatsApp,
 * email) that explains the consultation and the optional cross-border pathway
 * in one read. Its only inbound links are from his profile + the Brazil GP page.
 *
 * Lives under `/brazil/...` so the proxy stamps `x-gh-country=br` and the root
 * layout renders Brazilian header/footer/trust chrome — at `/dr-renato` the
 * country fell back to Ireland and the footer advertised the Irish Medical
 * Council on a Brazilian doctor's page.
 *
 * Everything priced comes from the DB — the consultation price from his
 * assigned GENERAL services, the cross-border fees from the same configs the
 * doctor-facing referral picker uses — so the page can never advertise a price
 * or a market the booking flow would refuse.
 */

const DOCTOR_SLUG = "dr-renato-sarmento";
/** Country codes are lowercase everywhere in the registry + public API. */
const COUNTRY_CODE = "br";
const COUNTRY_SLUG = "brazil";

type Params = Promise<{ country: string; lang: string }>;

const OG_LOCALES: Record<ShareLocale, string> = {
  pt: "pt_BR",
  en: "en_US",
  es: "es_ES",
};

/**
 * The locale lives in the URL, like every other country page — that is what
 * makes the header language switcher work here (it swaps the `[lang]` segment
 * and hard-navigates). An earlier locale-less `/brazil/dr-renato` had to read
 * the `gh_locale` cookie instead, which the switcher's country-page branch
 * never reached.
 */
export function generateStaticParams(): Array<{ country: string; lang: string }> {
  return SHARE_LOCALES.map((lang) => ({ country: COUNTRY_SLUG, lang }));
}

/** This page is Brazil-only; it just happens to live in the shared tree. */
function resolve(country: string, lang: string): ShareLocale | null {
  if (countryCodeFromSlug(country) !== COUNTRY_CODE) return null;
  return isShareLocale(lang) ? lang : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { country, lang } = await params;
  const locale = resolve(country, lang);
  if (!locale) return { title: "Global Health" };
  const t = SHARE_COPY[locale];
  return buildPublicMetadata({
    path: `/${COUNTRY_SLUG}/${locale}/dr-renato`,
    title: t.metaTitle,
    description: t.metaDescription,
    locale: OG_LOCALES[locale],
    kind: "doctor",
    subtitle: "Global Health",
    noindex: true,
  });
}

export default async function DrRenatoSharePage({ params }: { params: Params }) {
  const { country, lang } = await params;
  const locale = resolve(country, lang);
  if (!locale) notFound();
  const t = SHARE_COPY[locale];

  const [doctors, generalServices, feesRes] = await Promise.all([
    getCountryDoctors(COUNTRY_CODE, locale),
    getCountryServices(COUNTRY_CODE, "GENERAL", locale),
    fetchCrossBorderRxFees(),
  ]);

  const doctor = doctors.find((d) => d.slug === DOCTOR_SLUG);
  if (!doctor) notFound();

  // His bookable catalogue, rendered with the same cards the rest of the site
  // uses — one Offer per assigned service, priced from the DB.
  const assigned = new Set(doctor.assignedServiceIds);
  const bookable = generalServices.filter((s) => assigned.has(s.id));
  // The hero CTA books the headline consultation, which is the FIRST service in
  // the admin's sort order (BR: "Consulta Clínica Online"), not the cheapest —
  // by price the winner was "Renovação de Receita" at R$199, so the main
  // "Agendar consulta" button was starting a prescription refill.
  const primary = bookable.find((s) => s.basePriceCents != null) ?? null;

  const bookHref = buildBookHref({
    country: COUNTRY_SLUG,
    lang: locale,
    doctor: DOCTOR_SLUG,
    service: primary?.slug ?? null,
  });
  const profileHref = `/${COUNTRY_SLUG}/${locale}/doctors/${DOCTOR_SLUG}`;

  // Chrome strings (grid pagination labels, closer CTA) come from the shipped
  // locale bundles so this page speaks the same language as the rest of pt-BR.
  const bundle = loadLocaleBundle(locale as LocaleCode);
  const serviceItems = bookable.map((s) => ({
    title: s.name,
    description: s.summary,
    detailHref: `/${COUNTRY_SLUG}/${locale}/services/${s.slug}`,
    bookHref: buildBookHref({
      country: COUNTRY_SLUG,
      lang: locale,
      service: s.slug,
      doctor: DOCTOR_SLUG,
    }),
    bookLabel: bundle.common.doctors.bookAppointment,
    serviceType: "general" as const,
    duration: s.durationMinutes != null ? `${s.durationMinutes} min` : undefined,
    startingPrice:
      s.basePriceCents != null ? formatPriceRounded(s.basePriceCents, s.currencyCode) : undefined,
    imageSrc: s.imageSrc ?? null,
  }));

  const feeByCountry = new Map(
    (feesRes.ok ? feesRes.data.fees : []).map((f) => [f.countryCode.toUpperCase(), f] as const),
  );

  const registration = doctor.imcRegistration ?? doctor.registrationNumber ?? null;

  return (
    <>
      <ServiceHero
        countryCode={COUNTRY_CODE}
        countryLabel={t.eyebrow}
        titleLead={t.heroLead}
        titleAccent={t.heroAccent}
        titleTrail={t.heroTrail}
        lede={t.lede}
        primaryCta={{ label: t.bookCta, href: bookHref }}
        secondaryCta={{ label: t.profileCta, href: profileHref }}
        heroImage={{
          src: doctor.imageSrc ?? "/images/stock/gp.jpg",
          alt: doctor.imageAltText ?? `${doctor.fullName} — ${doctor.title}`,
          priority: true,
        }}
        badge={{
          icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
          title: doctor.fullName,
          subtitle: registration ? `${doctor.title} · ${registration}` : doctor.title,
        }}
        featureCards={[
          {
            icon: <Video className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.feature1.title,
            subtitle: t.feature1.subtitle,
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.feature2.title,
            subtitle: t.feature2.subtitle,
          },
          {
            icon: <Clock className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.feature3.title,
            subtitle: t.feature3.subtitle,
          },
        ]}
      />

      {/* Who he is, first person. */}
      <ImportantInfoSection
        eyebrow={t.aboutEyebrow}
        title={t.aboutTitle}
        paragraphs={t.aboutParagraphs}
        theme="light"
      />

      {/* The bookable catalogue — same dark card grid as every service page. */}
      {serviceItems.length > 0 ? (
        <div id="services" className="scroll-mt-24">
          <ServicesGrid
            eyebrow={t.offerEyebrow}
            title={t.offerTitle}
            intro={t.offerBody}
            items={serviceItems}
            variant="dark"
            previousPageLabel={bundle.common.a11y.previousPage}
            nextPageLabel={bundle.common.a11y.nextPage}
            learnMoreLabel={bundle.services.catalog.learnMore}
            // One page, no pager: this is a link handed out on WhatsApp, read
            // on a phone, and its whole job is showing what he can be booked
            // for. Five cards then a pager buried the other thirteen.
            pageSize={serviceItems.length}
          />
        </div>
      ) : null}

      <ProcessStepsSection
        eyebrow={t.howEyebrow}
        title={t.howTitle}
        steps={t.howSteps}
        theme="soft"
      />

      {/* Cross-border pathway — editorial fee rows, hairlines not a boxed
          table, per §2.3/§2.4 of the gh2 spec. Prices come from the referral
          configs; a market with no configured prescriber reads "coming soon". */}
      <section
        className="relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
        style={{ padding: "clamp(56px,7vw,104px) 0" }}
      >
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                {t.crossBorderEyebrow}
              </p>
              <h2
                className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.04]"
                style={{
                  fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)",
                  color: "rgba(255,255,255,0.95)",
                  maxWidth: "18ch",
                }}
              >
                {t.crossBorderTitle}
              </h2>
              <p
                className="mt-6 text-[length:var(--text-body-lg)] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.58)" }}
              >
                {t.crossBorderIntro}
              </p>
              <p className="mt-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                {t.crossBorderBody}
              </p>
            </div>

            <div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.58)" }}
              >
                {t.crossBorderFeeLead}
              </p>
              <dl className="mt-8">
                {CROSS_BORDER_COUNTRIES.map((code, i) => {
                  const fee = feeByCountry.get(code);
                  return (
                    <div
                      key={code}
                      className="flex items-baseline justify-between gap-6 py-4"
                      style={{
                        borderTop:
                          i === 0 ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(255,255,255,0.10)",
                        borderBottom:
                          i === CROSS_BORDER_COUNTRIES.length - 1
                            ? "1px solid rgba(255,255,255,0.10)"
                            : undefined,
                      }}
                    >
                      <dt
                        className="flex items-center gap-3 text-base font-semibold"
                        style={{ color: "rgba(255,255,255,0.92)" }}
                      >
                        {/* SVG flags, not emoji — Windows has no flag glyphs
                            and renders the regional-indicator pair as "IE". */}
                        <Flag code={code.toLowerCase()} size="lg" />
                        {t.countryNames[code]}
                      </dt>
                      <dd
                        className="font-extrabold tabular-nums tracking-[-0.02em]"
                        style={{
                          fontSize: fee ? "clamp(1.25rem,2vw,1.6rem)" : "0.875rem",
                          color: fee ? "var(--color-brand-accent)" : "rgba(255,255,255,0.40)",
                        }}
                      >
                        {fee
                          ? formatPriceRounded(fee.priceCents, fee.currencyCode)
                          : t.crossBorderComingSoon}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p
                className="mt-6 text-[13px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.40)" }}
              >
                {t.crossBorderFootnote}
              </p>
            </div>
          </div>
        </div>
      </section>

      <ServiceIntro eyebrow={t.aboutGhEyebrow} body={t.aboutGhBody} theme="light" />

      <FAQSection title={t.faqTitle} items={t.faq} theme="dark" eyebrow={t.faqEyebrow} />

      <FinalCTA primaryHref={bookHref} secondaryHref={profileHref} i18n={bundle.home.finalCta} />

      <MedicalDisclaimer paragraphs={t.noticeParagraphs} title={t.noticeTitle} theme="light" />

      <StickyBookingCTA href={bookHref} label={t.bookCta} />


    </>
  );
}
