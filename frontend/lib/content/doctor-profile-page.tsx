import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { DoctorProfileTemplate } from "@/components/templates/DoctorProfileTemplate";
import { JsonLd } from "@/components/seo/JsonLd";
import { DoctorSharePageLink } from "@/components/sections/DoctorSharePageLink";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { BookCta } from "@/components/booking/BookNowButton";
import { resolveDoctorProfilePageData } from "@/lib/content/doctor-profile-data";
import { getCountryByCode } from "@/data/countries";
import { ogLocales } from "@/lib/seo/hreflang";
import { doctorHreflangCluster } from "@/lib/seo/doctor-hreflang";
import { doctorIndexableCountryNames, withMarketTitle } from "@/lib/seo/doctor-market-title";
import { summarizeLanguagesForMetadata } from "@/lib/seo/doctor-language-summary";
import { buildPublicMetadata, noindexFollow } from "@/lib/seo/page-seo";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  physicianJsonLd,
} from "@/lib/seo/structured-data";

import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { buildBookHref, buildServiceDetailHref } from "@/lib/routing/book-href";
import {
  getCountryDoctors,
  getCountryServices,
  type CountryDoctorCard,
} from "@/lib/content/get-country-collections";
import { getCountryTrust, doctorVerificationUrl } from "@/lib/content/get-country-trust";
import { getCountryDisclaimer } from "@/lib/content/get-country-legal";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { SectionSeam } from "@/components/ui/SectionSeam";
import type { CountryTrust } from "@/lib/content/get-country-trust";
import { formatPriceRounded } from "@/lib/format-currency";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";

type DoctorProfileRouteParams = {
  doctorSlug: string;
  /** Country slug from the route (e.g. "ireland"). Optional so the
   *  legacy metadata builder still works without it; when present we
   *  build URLs in the canonical `/[country]/[lang]/...` shape. */
  countrySlug?: string;
  /** Locale code from the route (e.g. "en"). */
  lang?: string;
};

export async function buildDoctorProfileMetadata(
  params: Promise<DoctorProfileRouteParams>,
): Promise<Metadata> {
  const { doctorSlug, countrySlug: routeCountrySlug, lang } = await params;
  const code = routeCountrySlug ? countryCodeFromSlug(routeCountrySlug) : null;
  const data = await resolveDoctorProfilePageData(doctorSlug, lang, code ?? undefined);
  // `data.indexable` is computed in resolveDoctorProfilePageData from the
  // country-scoped backend record — the SAME value app/sitemap.ts derives, so a
  // page that renders index,follow can never be missing from the sitemap.
  const indexable = data.indexable;
  const countryNameToSlug: Record<string, string> = {
    Ireland: "ireland",
    Portugal: "portugal",
    Spain: "spain",
    Czechia: "czechia",
    Romania: "romania",
    Brazil: "brazil",
  };
  const slug = routeCountrySlug ?? countryNameToSlug[data.profile.country] ?? "ireland";
  const routeLang = lang ?? "en";
  const canonical = `/${slug}/${routeLang}/doctors/${doctorSlug}`;
  const { common: metaCommon } = loadLocaleBundle(routeLang as LocaleCode);
  const metaDp = metaCommon.doctorProfile;
  const resolvedCode = countryCodeFromSlug(slug);
  const config = resolvedCode ? getCountryByCode(resolvedCode) : null;
  // `data.profile.country` is the doctor's PRIMARY country (see
  // get-public-doctors.ts) — on a cross-listed doctor's secondary-market
  // route it still reads e.g. "Ireland" even under /czechia/*. Every piece of
  // metadata below must name the market the page is actually SERVING, so
  // every `{country}` fill and the OG subtitle use the route-resolved name,
  // falling back to the profile country only when the route didn't resolve
  // (placeholder/legacy path). The description/socialDescription FALLBACK
  // templates were the other leak: an admin `seoDescription` is already
  // market-scoped by the backend merge, but the code-side template always
  // substituted the primary country regardless of route.
  const routeCountryName = config?.name ?? data.profile.country;
  const fillProfileTemplate = (template: string) =>
    template
      .replace("{name}", data.profile.name)
      .replace("{title}", data.profile.title)
      .replace("{country}", routeCountryName)
      .replace("{languages}", summarizeLanguagesForMetadata(data.profile.languages));
  const baseTitle =
    data.profile.seoTitle ?? `${data.profile.name} · ${data.profile.title} · ${routeCountryName}`;
  // Cross-listed doctors (same clinician, multiple markets) currently share
  // one admin `seoTitle` across every country page they appear on — a
  // duplicate-title flag in GSC. Differentiate the SERP title by market only
  // when the doctor is genuinely indexable in more than one country; single-
  // market doctors (the vast majority) keep today's title exactly.
  const marketCountries = indexable ? await doctorIndexableCountryNames(doctorSlug) : [];
  const title = withMarketTitle(
    baseTitle,
    routeCountryName,
    marketCountries,
    resolvedCode ? metaCommon.countryNames?.[resolvedCode] : null,
  );
  const description =
    data.profile.seoDescription ??
    fillProfileTemplate(
      metaDp.metaDescriptionTemplate ??
        "Book an online consultation with {name}, {title} in {country}. Languages: {languages}.",
    );
  const metadata = buildPublicMetadata({
    path: canonical,
    title,
    description,
    socialTitle: `${data.profile.name} | ${data.profile.title}`,
    socialDescription: fillProfileTemplate(
      metaDp.metaSocialDescriptionTemplate ??
        "Meet {name}, {title} serving patients in {country}. View credentials, languages and appointment options.",
    ),
    imageTitle: data.profile.name,
    type: "profile",
    kind: "doctor",
    subtitle: `${data.profile.title} · ${routeCountryName}`,
    sourceImage: data.profileImageSrc,
    imageAlt: data.profile.imageAltText ?? `${data.profile.name}, ${data.profile.title}`,
    locale: config ? ogLocales(config, routeLang).locale : undefined,
    // A noindexed profile emits NO alternates: it participates in no cluster,
    // as neither target nor source. `doctorHreflangCluster` returns early on
    // that, so noindex pages also do zero market-roster reads.
    languages: config
      ? await doctorHreflangCluster(config, doctorSlug, routeLang, indexable)
      : undefined,
    keywords: data.profile.seoKeywords,
    noindex: !indexable,
  });
  if (indexable) return metadata;
  // `noindex, FOLLOW` — same rule as the service page: a clinician whose record
  // fails the editorial gate (thin bio, no registration number) is still a real
  // page carrying real internal links (their market's services, the country
  // team page, the booking flow). `buildPublicMetadata`'s shared `noindex` is
  // `noindex, nofollow`, which strands those links.
  return noindexFollow(metadata);
}
export async function renderDoctorProfilePage(params: Promise<DoctorProfileRouteParams>) {
  const { doctorSlug, countrySlug: routeCountrySlug, lang: routeLang } = await params;
  const routeCode = routeCountrySlug ? countryCodeFromSlug(routeCountrySlug) : null;
  const data = await resolveDoctorProfilePageData(doctorSlug, routeLang, routeCode ?? undefined);

  // A slug that only matches de-accented (legacy Wix URLs kept the diacritics)
  // redirects to the live ASCII slug rather than rendering a second URL for
  // the same clinician.
  if (data.canonicalSlug && routeCountrySlug && routeLang) {
    permanentRedirect(`/${routeCountrySlug}/${routeLang}/doctors/${data.canonicalSlug}`);
  }
  // No such clinician, confirmed by the backend (not an outage): 404 rather
  // than render a profile fabricated from the URL slug. Those placeholders
  // were noindexed, but legacy redirects still landed real visitors on a
  // page describing a doctor who does not exist, carrying Physician schema.
  if (data.missingConfirmed) {
    notFound();
  }
  const countryNameToSlug: Record<string, string> = {
    Ireland: "ireland",
    Portugal: "portugal",
    Spain: "spain",
    Czechia: "czechia",
    Romania: "romania",
  };
  // Prefer the route-supplied country/lang so the page builds URLs in the
  // canonical shape `/[country]/[lang]/...`. Falls back to deriving from
  // the doctor's profile country (legacy code path that hits this lib
  // without route context).
  const slug = routeCountrySlug ?? countryNameToSlug[data.profile.country] ?? "ireland";
  const lang = routeLang ?? "en";
  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const dp = c.doctorProfile;
  const teamHref = `/${slug}/${lang}/doctors`;
  const profileHref = `${teamHref}/${doctorSlug}`;
  const fallbackBookHref = buildBookHref({ country: slug, lang, doctor: doctorSlug });
  // When the doctor has assigned services we render them as the main
  // booking surface below and the hero / bottom CTAs scroll to that
  // section instead of dumping the patient into the fallback form.
  // Decided after fetching `assignedServices` (just below).
  // Services this doctor is assigned to in the route country.
  // ServiceDoctor (Phase 1 backend) populates assignedServiceIds on the
  // doctor card; we filter the country's GENERAL + SPECIALIST service
  // pool to that set so the patient sees one card per bookable service.
  const code = countryCodeFromSlug(slug);
  // `data.profile.country` is the doctor's PRIMARY country (see
  // get-public-doctors.ts) — on a cross-listed doctor's secondary-market
  // route it still reads e.g. "Ireland" even under /czechia/*. Everything the
  // patient reads or a crawler indexes on THIS page must name the market the
  // route is actually serving — same fix as buildDoctorProfileMetadata above.
  const routeCountryName = (code ? getCountryByCode(code)?.name : undefined) ?? data.profile.country;
  // Breadcrumb-only localized country label — deliberately NOT used for
  // `routeCountryName` above, which drives visible copy (country pill,
  // "Registered in {country}") that this ticket does not touch.
  const breadcrumbCountryName = (code ? c.countryNames?.[code] : undefined) ?? routeCountryName;
  // Short medical disclaimer (admin-authored, per country). Doctor profiles
  // show the lead line + a link through to the full disclaimer.
  const { short: doctorDisclaimer } = code
    ? await getCountryDisclaimer(code, lang)
    : { short: null };
  const doctorDisclaimerLead = doctorDisclaimer
    ? (doctorDisclaimer.split(/\n\s*\n/)[0] ?? doctorDisclaimer)
    : null;
  const assignedServices: Array<{
    id: string;
    slug: string;
    name: string;
    summary: string;
    kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY";
    durationMinutes: number | null;
    basePriceCents: number | null;
    currencyCode: string | null;
    imageSrc: string | null;
  }> = [];
  let profileDoc: CountryDoctorCard | undefined;
  let countryTrust: CountryTrust | null = null;
  if (code) {
    const [doctors, generals, specialists, trust] = await Promise.all([
      getCountryDoctors(code, lang),
      getCountryServices(code, "GENERAL", lang),
      getCountryServices(code, "SPECIALIST", lang),
      getCountryTrust(code, lang as LocaleCode),
    ]);
    countryTrust = trust;
    const doc = doctors.find((d) => d.slug === doctorSlug);
    profileDoc = doc;
    if (doc) {
      const assigned = new Set(doc.assignedServiceIds);
      for (const s of [...generals, ...specialists]) {
        if (assigned.has(s.id)) assignedServices.push({ ...s, imageSrc: s.imageSrc ?? null });
      }
    }
  }

  // Regulator + verification URL for this market — drives the Physician
  // schema recognizedBy block and the profile's "Verify registration" link.
  const regulator = countryTrust?.regulator?.name
    ? { name: countryTrust.regulator.name, url: countryTrust.regulator.url }
    : null;
  const verifyUrl = doctorVerificationUrl(countryTrust) ?? data.profile.medicalRegistrationUrl ?? undefined;

  const hasServices = assignedServices.length > 0;
  // First-name-only label so the CTA reads as "Pick a time with Anna"
  // not "Pick a time with Dr. Anna Garcia Lopez". Falls back to the
  // generic label when we can't extract a first name.
  const firstName = data.profile.name
    .replace(/^(Dr\.?|Dra\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "")
    .split(" ")[0]
    ?.trim();
  const primaryCtaHref = fallbackBookHref;
  const primaryCtaLabel = hasServices
    ? firstName
      ? dp.pickTimeWith.replace("{name}", firstName)
      : dp.pickTime
    : data.hero.primaryCta.label;

  // E-E-A-T freshness signal — same "Last reviewed <date>" format the
  // service page and blog byline already use. Renders nothing (via
  // DoctorProfileTemplate's conditional trust-badge) when the admin hasn't
  // set lastReviewedAt — never a fabricated fallback.
  const reviewedDateFormatted = data.profile.lastReviewedAt
    ? new Date(data.profile.lastReviewedAt).toLocaleDateString(lang, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : undefined;

  const templateData = {
    ...data,
    profile: {
      ...data.profile,
      // Override the PRIMARY country with the market this page is actually
      // serving — every visible badge/label in DoctorProfileTemplate reads
      // `profile.country` (team link, "Registered in {country}", the country
      // pill), and on a cross-listed doctor's secondary-market route the raw
      // field is wrong (see routeCountryName above).
      country: routeCountryName,
      registrationChamber: profileDoc?.registrationChamber,
      registrationDivision: profileDoc?.registrationDivision,
      registrationVerified: profileDoc?.registrationVerified,
      verificationUrl: verifyUrl,
      credentials: profileDoc?.credentials,
      regulatorName: regulator?.name ?? null,
      reviewedDate: reviewedDateFormatted,
    },
    hero: {
      ...data.hero,
      primaryCta: {
        label: primaryCtaLabel,
        href: primaryCtaHref,
      },
      secondaryCta: {
        label: dp.backToClinicians.replace("{country}", routeCountryName),
        href: teamHref,
      },
    },
    bottomCta: {
      ...data.bottomCta,
      ctaHref: primaryCtaHref,
    },
  };

  return (
    <>
      <JsonLd
        data={[
          physicianJsonLd({
            name: data.profile.name,
            title: data.profile.title,
            countryName: routeCountryName,
            url: profileHref,
            imageSrc: data.profileImageSrc,
            languages: data.profile.languages,
            registrationNumber: profileDoc?.registrationNumber ?? null,
            chamber: profileDoc?.registrationChamber ?? null,
            division: profileDoc?.registrationDivision ?? null,
            regulator,
            credentials: profileDoc?.credentials,
            specialty: data.profile.specialties[0] ?? null,
            imageAltText: data.profile.imageAltText,
            imageCaption: data.profile.imageCaption ?? data.profile.imageDescription,
            bio: data.profile.bio,
            nonPhysician: data.profile.editorialChecklist?.nonPhysician === true,
          }),
          breadcrumbJsonLd([
            { name: c.navigation.home, url: "/" },
            { name: breadcrumbCountryName, url: `/${slug}/${lang}` },
            { name: c.navigation.doctors, url: teamHref },
            { name: data.profile.name, url: profileHref },
          ]),
          // FAQPage schema mirrors the visible FAQ accordion — only emitted
          // when the doctor actually has FAQ content, never speculative.
          ...(data.profile.faqs && data.profile.faqs.length > 0
            ? [faqJsonLd(data.profile.faqs.map((f) => ({ question: f.question, answer: f.answer })))]
            : []),
        ]}
      />
      <DoctorProfileTemplate {...templateData} t={dp} />

      {/* Doctor-first booking: lists the services the admin has assigned
          to this doctor. Each card routes back through the service-first
          consult page with `?doctor=<slug>` so the picker anchors on
          this clinician. When no assignments, render a clear fallback
          instead of silently leaning on the legacy CTA. */}
      {hasServices ? (
        <section
          id="services"
          className="scroll-mt-24 relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          style={{
            padding: "clamp(64px,8vw,120px) 0",
          }}
        >
          <SectionSeam theme="dark" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <div
              className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--color-brand-accent)" }}
            >
              <CalendarClock className="size-4" aria-hidden />
              {dp.bookWithDoctor.replace("{name}", data.profile.name)}
            </div>
            <h2
              className="font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {dp.servicesOffered}
            </h2>
            <p
              className="mt-3 max-w-xl text-[length:var(--text-body-lg)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.42)" }}
            >
              {dp.pickSlotWith.replace("{name}", firstName ?? data.profile.name)}
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {assignedServices.map((service) => {
                const consultHref = buildBookHref({
                  country: slug,
                  lang,
                  service: service.slug,
                  doctor: doctorSlug,
                });
                const startingPrice = service.basePriceCents != null
                  ? formatPriceRounded(service.basePriceCents, service.currencyCode)
                  : undefined;
                return (
                  <ServiceCard
                    key={service.id}
                    // Genuine crawlable link to the service's own landing
                    // page (international-linking batch, 2026-08-09) — doctor
                    // profiles previously sent every assigned service straight
                    // into the booking flow with no server-rendered anchor a
                    // crawler could follow to `/services/{slug}`. Booking stays
                    // the primary CTA; "View service details" is additive.
                    detailHref={buildServiceDetailHref(slug, lang, service.slug)}
                    bookHref={consultHref}
                    title={service.name}
                    description={service.summary ?? ""}
                    duration={
                      service.durationMinutes != null
                        ? `${service.durationMinutes} ${c.extra.minSuffix}`
                        : undefined
                    }
                    startingPrice={startingPrice}
                    ctaLabel={dp.viewServiceDetails}
                    bookLabel={dp.pickSlot}
                    imageSrc={service.imageSrc}
                    dark
                  />
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section
          id="services"
          className="scroll-mt-24 relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          style={{
            padding: "clamp(48px,6vw,80px) 0",
          }}
        >
          <SectionSeam theme="dark" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <div
              className="mx-auto max-w-lg rounded-[var(--radius-card)] p-8 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.88)" }}
              >
                {dp.noServicesAssigned}
              </p>
              <p
                className="mt-2 text-sm"
                style={{ color: "rgba(255,255,255,0.42)" }}
              >
                {dp.notSetupForBookings
                  .replace("{name}", data.profile.name)
                  .replace("{country}", routeCountryName)}
              </p>
              <BookCta
                href={buildBookHref({ country: slug, lang, doctor: doctorSlug })}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold transition-colors duration-200 hover:bg-white"
                style={{
                  background: "var(--color-brand-accent)",
                  color: "#0a1f14",
                }}
              >
                {dp.browseOtherClinicians}
                <ArrowRight className="size-4" aria-hidden />
              </BookCta>
            </div>
          </div>
        </section>
      )}
      <DoctorSharePageLink doctorSlug={doctorSlug} countrySlug={slug} lang={lang} theme="light" />
      {doctorDisclaimerLead ? (
        <section
          className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
          style={{
            padding: "clamp(28px,4vw,48px) 0",
          }}
        >
          <SectionSeam theme="light" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <MedicalDisclaimer
              variant="short"
              text={doctorDisclaimerLead}
              link={{
                href: `/${slug}/${lang}/legal/medical-disclaimer`,
                label: dp.readFullDisclaimer ?? "Read the full medical disclaimer",
              }}
            />
          </div>
        </section>
      ) : null}
      <DoctifyReviewsSection
        theme="forest"
        variant="carousel"
        language={lang}
        headline={c.doctify.patientsSayHeadline ?? "What patients say about"}
        headlineAccent={c.doctify.patientsSayAccent ?? "our doctors"}
      />
      <StickyBookingCTA href={fallbackBookHref} label={dp.bookWithDoctor.replace("{name}", firstName ?? data.profile.name)} />
    </>
  );
}
