import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Lock, ShieldCheck, Stethoscope, UserRound, Video } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode, getPublicBookingRequirements } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import {
  getCountryDoctors,
  getCountryServices,
  type CountryDoctorCard,
  type CountryServiceCard,
} from "@/lib/content/get-country-collections";
import { getServiceDoctorAvailability } from "@/lib/content/get-doctor-availability";
import { getGpAvailability } from "@/lib/content/get-gp-availability";
import { getServiceAggregatedAvailability } from "@/lib/content/get-service-availability";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";
import { ServiceTimePicker } from "./_components/service-time-picker";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { buildBookHref } from "@/lib/routing/book-href";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { ConsultationBookingForm } from "../consult/[serviceSlug]/_components/consultation-booking-form";
import { SlotPickerStep } from "../consult/[serviceSlug]/_components/slot-picker-step";
import { LanguageFilteredDoctors } from "./_components/language-filtered-doctors";
import { PortalReturnBand } from "./_components/portal-return-band";
import { BenefitStep } from "./_components/benefit-step";
import { BookingSectionHeader } from "./_components/booking-section-header";
import { getServerBenefitOptions } from "@/lib/api/me-benefit-options-server";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { doctorCardI18n } from "@/components/cards/doctor-card-i18n";

type Params = { country: string; lang: string };
type SearchParams = {
  service?: string | string[];
  serviceId?: string | string[];
  doctor?: string | string[];
  slot?: string | string[];
  /** Same-day GP quick-book entry from the homepage: gp=1 + language + at. */
  gp?: string | string[];
  language?: string | string[];
  at?: string | string[];
  /** Insurance choice made right after the service: a company id, or "none"
   *  for "pay the standard price". Absent = the patient still owes the choice. */
  insurance?: string | string[];
  benefit?: string | string[];
  /** Portal-return chrome (04-001/04-002): set on every "Book consultation"
   *  CTA inside `/account` via `resolveBookConsultationHref`. */
  from?: string | string[];
};

type Notice = { tone: "info" | "warning"; message: string } | null;

type BookT = import("@/lib/i18n/types").CommonLocale["bookPage"];

export async function generateStaticParams(): Promise<Params[]> {
  return countryLangParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? await getPublicCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const { common } = loadLocaleBundle(lang as LocaleCode);
  const title = `${common.bookPage.title} — ${config.name}`;
  const description = common.bookPage.subtitle.replace("{country}", config.name);
  return buildPublicMetadata({
    path: `/${country}/${lang}/book`,
    title,
    description,
    locale: ogLocales(config, lang).locale,
    kind: "service",
    subtitle: config.name,
    imageAlt: `${common.bookPage.title} — ${config.name}`,
    languages: hreflangAlternates(config, "/book"),
  });
}

export default async function CountryLangBookPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { country: slug, lang } = await params;
  const sp = (await searchParams) ?? {};
  const code = countryCodeFromSlug(slug);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) notFound();
  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const bf = c.bookingForm;
  const bp = c.bookPage;
  // Started here, awaited where first needed below — lets the (independent)
  // `overlay` fetch on the non-GP path start without waiting on this one.
  const bookingRequirementsPromise = getPublicBookingRequirements(code);

  // Portal-return chrome (04-001/04-002): `?from=portal` is only present on
  // arrival (step 1) — `buildBookHref`, the wizard's own step-link builder,
  // doesn't forward unknown query params, so steps 2-4 rely on client-side
  // sessionStorage (set by `PortalReturnBand` itself) to keep the band up.
  // Public visitors never carry `?from=portal`, so this is always false.
  const fromPortalParam = firstParam(sp.from) === "portal";

  // Same-day GP quick-book entry from the homepage: the patient already chose a
  // language + time; here they only fill details. The GP is auto-assigned at
  // submit (priority window + fair rotation) — no doctor/service picking.
  const gpMode = firstParam(sp.gp) === "1";
  const gpLanguage = firstParam(sp.language);
  const gpAt = firstParam(sp.at);
  if (gpMode && gpLanguage && gpAt) {
    return (
      <GpBookingFlow
        code={code}
        country={slug}
        lang={lang}
        countryName={config.name}
        language={gpLanguage}
        at={gpAt}
        c={c}
        bf={bf}
        bp={bp}
        bookingRequirements={await bookingRequirementsPromise}
      />
    );
  }

  const serviceSlugParam = firstParam(sp.service);
  const serviceIdParam = firstParam(sp.serviceId);
  const doctorSlugParam = firstParam(sp.doctor);
  const slotParam = firstParam(sp.slot);
  // Service-first time→doctor flow: ?at=<startAt> marks that a time was chosen
  // before a clinician. Its presence also distinguishes a service-first journey
  // from a doctor-first one even once ?doctor= has been added.
  const atParam = firstParam(sp.at);

  // Independent of `bookingRequirementsPromise` (both only need `code`) — run
  // concurrently instead of waiting for bookingRequirements to settle first.
  const [overlay, bookingRequirements] = await Promise.all([
    getPublicCountryByCode(code),
    bookingRequirementsPromise,
  ]);
  const generalEnabled = isCountryFeatureEnabled(overlay, "general-consultations");
  const specialistEnabled = isCountryFeatureEnabled(overlay, "specialist-consultations");

  const [generalServicesRaw, specialistServicesRaw, doctors] = await Promise.all([
    generalEnabled ? getCountryServices(code, "GENERAL", lang) : Promise.resolve([]),
    specialistEnabled ? getCountryServices(code, "SPECIALIST", lang) : Promise.resolve([]),
    getCountryDoctors(code, lang),
  ]);

  const services = [...generalServicesRaw, ...specialistServicesRaw];
  const selectedService =
    services.find((s) => s.slug === serviceSlugParam || s.id === serviceIdParam) ?? null;
  const requestedDoctor = doctorSlugParam
    ? doctors.find((doctor) => doctor.slug === doctorSlugParam) ?? null
    : null;
  const requestedDoctorAssigned =
    Boolean(selectedService && requestedDoctor) &&
    selectedService!.assignedDoctorIds.includes(requestedDoctor!.id);
  const servicesForRequestedDoctor = requestedDoctor
    ? services.filter((service) => service.assignedDoctorIds.includes(requestedDoctor.id))
    : services;

  // The booking flow is bidirectional and the two orders differ:
  //   doctor-first : Doctor → Service → Time → Details   (from a doctor card)
  //   service-first: Service → Time → Doctor → Details   (from a service card)
  // `?at=` (a chosen time) only ever appears in the service-first journey, so
  // its presence forces service-first ordering even once a doctor is picked.
  const doctorFirst =
    Boolean(requestedDoctor) && !atParam && (!selectedService || requestedDoctorAssigned);

  const timeValue = atParam
    ? `${formatAppDate(atParam)} · ${formatAppTime(atParam)}`
    : null;

  // ── Benefit step (§11.2) ────────────────────────────────────────────────
  // One step for all four benefit sources, standing where the insurance-only
  // step used to. Chosen BEFORE time/doctor because a member price and an
  // insurance price both change what each slot costs — and because the insurer
  // decides which doctors exist at all: only doctors with a payout set for
  // that insurer take its patients.
  //
  // The legacy `?insurance=` param is still accepted and mapped, so live links
  // and any indexed URLs keep working (§11.2).
  const insuranceOptions = selectedService?.insuranceOptions ?? [];
  const legacyInsuranceParam = firstParam(sp.insurance);
  const benefitParam =
    firstParam(sp.benefit) ??
    (legacyInsuranceParam
      ? legacyInsuranceParam === "none"
        ? "none"
        : `insurance:${legacyInsuranceParam}`
      : null);
  const [benefitSourceParam, benefitRefParam] = benefitParam
    ? [benefitParam.split(":")[0] ?? null, benefitParam.split(":").slice(1).join(":") || null]
    : [null, null];

  // Options are only fetched once a service is picked (there is nothing to
  // price before that) and only for logged-in patients — the endpoint 401s for
  // guests, which is exactly the signal the step needs to show a login prompt.
  const benefitOptions = selectedService
    ? await getServerBenefitOptions({ serviceId: selectedService.id, locale: lang })
    : null;
  const eligibleBenefitCount = benefitOptions?.options.length ?? 0;

  // A guest booking a service with no insurance options sees exactly the flow
  // they see today — no extra click for a step that would be empty.
  const hasBenefitStep =
    Boolean(selectedService) && (insuranceOptions.length > 0 || eligibleBenefitCount > 0);

  const insuranceCompanyId =
    benefitSourceParam === "insurance" && benefitRefParam ? benefitRefParam : null;
  const selectedInsurance = insuranceCompanyId
    ? insuranceOptions.find((o) => o.companyId === insuranceCompanyId) ?? null
    : null;
  // A stale/forged reference (insurer delisted, membership expired) counts as
  // "not chosen" so the patient re-picks, rather than booking on a price the
  // server would reject at checkout.
  const benefitChosen =
    benefitParam === "none" ||
    Boolean(selectedInsurance) ||
    (benefitSourceParam != null &&
      benefitSourceParam !== "insurance" &&
      benefitOptions?.options.some(
        (o) => o.source.toLowerCase() === benefitSourceParam && (!benefitRefParam || o.refId === benefitRefParam),
      ) === true);
  const needsBenefitChoice = hasBenefitStep && !benefitChosen;
  // The param to carry on every downstream link.
  const benefitHrefParam = hasBenefitStep && benefitChosen ? benefitParam : null;
  const chosenBenefitOption = benefitOptions?.options.find(
    (o) => o.source.toLowerCase() === benefitSourceParam && o.refId === benefitRefParam,
  );
  const benefitValue = selectedInsurance
    ? selectedInsurance.name
    : chosenBenefitOption
      ? chosenBenefitOption.label
      : benefitParam === "none"
        ? bp.benefitNone
        : null;

  const stepValues: (string | null)[] = doctorFirst
    ? [
        requestedDoctor?.fullName ?? null,
        selectedService?.name ?? null,
        ...(hasBenefitStep ? [benefitValue] : []),
        timeValue,
        null,
      ]
    : [
        selectedService?.name ?? null,
        ...(hasBenefitStep ? [benefitValue] : []),
        timeValue,
        requestedDoctor?.fullName ?? null,
        null,
      ];
  const stepLabels: string[] = doctorFirst
    ? [
        bp.stepDoctor,
        bp.stepService,
        ...(hasBenefitStep ? [bp.stepBenefit] : []),
        bp.stepTime,
        bp.stepDetails,
      ]
    : [
        bp.stepService,
        ...(hasBenefitStep ? [bp.stepBenefit] : []),
        bp.stepTime,
        bp.stepDoctor,
        bp.stepDetails,
      ];
  // Back-nav hrefs per step — same targets the old per-card "Change
  // service" / "Edit doctor" / "Change time" ghost buttons used, now
  // surfaced as clickable rows in the sidebar instead (only completed
  // steps get one; the current/future steps aren't reachable yet).
  const benefitStepHref = selectedService
    ? buildBookHref({ country: slug, lang, service: selectedService.slug })
    : null;
  const stepHrefs: (string | null)[] = doctorFirst
    ? [
        buildBookHref({ country: slug, lang }),
        requestedDoctor ? buildBookHref({ country: slug, lang, doctor: requestedDoctor.slug }) : null,
        ...(hasBenefitStep
          ? [
              selectedService
                ? buildBookHref({
                    country: slug,
                    lang,
                    doctor: requestedDoctor?.slug,
                    service: selectedService.slug,
                  })
                : null,
            ]
          : []),
        selectedService
          ? buildBookHref({
              country: slug,
              lang,
              doctor: requestedDoctor?.slug,
              service: selectedService.slug,
              benefit: benefitHrefParam,
            })
          : null,
        null,
      ]
    : [
        buildBookHref({ country: slug, lang }),
        ...(hasBenefitStep ? [benefitStepHref] : []),
        selectedService
          ? buildBookHref({
              country: slug,
              lang,
              service: selectedService.slug,
              benefit: benefitHrefParam,
            })
          : null,
        selectedService
          ? buildBookHref({
              country: slug,
              lang,
              service: selectedService.slug,
              benefit: benefitHrefParam,
              at: atParam,
            })
          : null,
        null,
      ];
  // Step numbers shift by one once the benefit step exists.
  const benefitOffset = hasBenefitStep ? 1 : 0;
  let currentStep: number;
  if (doctorFirst) {
    // Doctor(1) → Service(2) → [Insurance] → Time → Details.
    if (!selectedService) currentStep = 2;
    else if (needsBenefitChoice) currentStep = 3;
    else currentStep = (slotParam ? 4 : 3) + benefitOffset;
  } else {
    // Service(1) → [Insurance] → Time → Doctor → Details.
    if (!selectedService) currentStep = 1;
    else if (needsBenefitChoice) currentStep = 2;
    else currentStep = (slotParam ? 4 : atParam ? 3 : 2) + benefitOffset;
  }
  const itemKind =
    selectedService?.kind === "SPECIALIST"
      ? "SPECIALIST_CONSULTATION"
      : "GENERAL_CONSULTATION";

  let notice: Notice = null;
  if ((serviceSlugParam || serviceIdParam) && !selectedService) {
    notice = { tone: "warning", message: bp.serviceUnavailable };
  } else if (doctorSlugParam && !requestedDoctor) {
    notice = { tone: "warning", message: bp.clinicianUnavailable };
  }

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Book", url: `/${slug}/${lang}/book` },
        ])}
      />

      <PortalReturnBand fromPortalParam={fromPortalParam} backLabel={bp.backToAccount} badgeLabel={bp.portalBadge} />

      <GH2FlowHeader
        title={bp.title}
        subtitle={bp.subtitle.replace("{country}", config.name)}
        activeStep={currentStep}
        steps={stepLabels}
      />

      <section
        id="booking"
        className="scroll-mt-24 gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel py-[clamp(48px,6vw,88px)]"
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.8fr)]">
            {/* 04-009: below `lg:` there's no side-by-side space, so document
                order = visual order — step content must render before this
                sidebar (the header's compact step counter already covers
                "where am I" without the full panel above the fold). */}
            <aside className="order-2 lg:order-none lg:sticky lg:top-24 lg:self-start">
              <div className="gh2-glass-forest gh2-dark-content transform-gpu p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]">
                  {bp.bookingSteps}
                </p>
                <StepIndicator current={currentStep} labels={stepLabels} values={stepValues} hrefs={stepHrefs} />
                <p className="mt-5 text-sm leading-relaxed text-white/60">
                  {bp.availabilityNote}
                </p>
                {/* Trust signals — same platform facts as the service pages,
                    icon-tile treatment matches DoctorCard's dark variant. */}
                <ul className="mt-5 grid gap-2.5 border-t border-white/10 pt-5">
                  {[
                    { icon: ShieldCheck, label: c.serviceDetailPage.trustRegistered.replace("{country}", config.name) },
                    { icon: Video, label: c.serviceDetailPage.trustVideo },
                    { icon: Lock, label: c.serviceDetailPage.trustConfidential },
                  ].map(({ icon: Icon, label }) => (
                    <li
                      key={label}
                      className="gh2-trust-tile gh2-trust-tile-dark flex items-center gap-3 text-[13px] font-semibold text-white/85"
                    >
                      <span
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]"
                        style={{
                          background: "rgba(176,241,34,0.10)",
                          border: "1px solid rgba(176,241,34,0.18)",
                        }}
                      >
                        <Icon className="size-4 shrink-0 text-[var(--color-brand-accent)]" aria-hidden />
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="order-1 min-w-0 lg:order-none">
              {notice ? <InlineNotice notice={notice} /> : null}
              {!selectedService ? (
                <ServicePicker
                  country={slug}
                  lang={lang}
                  services={servicesForRequestedDoctor}
                  requestedDoctor={requestedDoctor}
                  allServicesCount={services.length}
                  bp={bp}
                  minSuffix={c.extra.minSuffix}
                />
              ) : needsBenefitChoice ? (
                <BenefitStep
                  country={slug}
                  lang={lang}
                  serviceSlug={selectedService.slug}
                  doctorSlug={doctorFirst ? requestedDoctor?.slug ?? null : null}
                  basePriceCents={selectedService.basePriceCents}
                  currencyCode={selectedService.currencyCode}
                  benefits={benefitOptions}
                  insuranceFallback={insuranceOptions}
                  loginHref={`/login?next=${encodeURIComponent(
                    buildBookHref({ country: slug, lang, service: selectedService.slug }),
                  )}`}
                  bp={bp}
                />
              ) : (
                <SelectedServiceFlow
                  code={code}
                  country={slug}
                  lang={lang}
                  service={selectedService}
                  doctors={doctors}
                  doctorSlug={doctorSlugParam}
                  slotId={slotParam}
                  at={atParam}
                  itemKind={itemKind}
                  bf={bf}
                  bp={bp}
                  bookingRequirements={bookingRequirements}
                  insuranceCompanyId={insuranceCompanyId}
                  selectedInsurance={selectedInsurance}
                  benefitHrefParam={benefitHrefParam}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const GP_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  pt: "Portuguese",
  es: "Spanish",
  cs: "Czech",
  cz: "Czech",
  ro: "Romanian",
  ar: "Arabic",
  fr: "French",
  de: "German",
  it: "Italian",
  pl: "Polish",
  nl: "Dutch",
  ru: "Russian",
};

function gpLanguageLabel(code: string): string {
  return GP_LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

/**
 * Same-day GP details step. The patient arrives from the homepage with a chosen
 * language + time (?gp=1&language=&at=); here they only fill patient details +
 * consent. The concrete GP doctor + slot are resolved at submit by the
 * ConsultationBookingForm's autoAssign mode (POST /api/public/gp-assign).
 */
async function GpBookingFlow({
  code,
  country,
  lang,
  countryName,
  language,
  at,
  c,
  bf,
  bp,
  bookingRequirements,
}: {
  code: string;
  country: string;
  lang: string;
  countryName: string;
  language: string;
  at: string;
  c: import("@/lib/i18n/types").CommonLocale;
  bf: import("@/lib/i18n/types").CommonLocale["bookingForm"];
  bp: BookT;
  bookingRequirements: import("@/lib/content/get-public-countries").PublicBookingRequirements;
}) {
  const { service, clinicTimezone, slots } = await getGpAvailability(code, language, 14);
  const slot = slots.find((s) => s.startAt === at) ?? null;
  const valid = Boolean(service && slot);
  const langName = gpLanguageLabel(language);
  const steps = ["Language", bp.stepTime, bp.stepDetails];
  const homeHref = `/${country}/${lang}#same-day-booking`;

  return (
    <>
      <GH2FlowHeader
        title={bp.title}
        subtitle={bp.subtitle.replace("{country}", countryName)}
        activeStep={valid ? 3 : 1}
        steps={steps}
      />
      <section
        id="booking"
        className="scroll-mt-24 gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel py-[clamp(48px,6vw,88px)]"
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          {!valid || !service || !slot ? (
            <div className="gh2-status-card mx-auto max-w-[640px] text-center">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {bp.slotNoLongerOpen}
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {bp.checkBackClinician.replace("{service}", langName)}
              </p>
              <Link href={homeHref} className="gh2-btn-lime mt-5">
                {bp.pickAnotherClinician}
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.8fr)]">
              {/* 04-009: below `lg:` there's no side-by-side space, so document
                order = visual order — step content must render before this
                sidebar (the header's compact step counter already covers
                "where am I" without the full panel above the fold). */}
            <aside className="order-2 lg:order-none lg:sticky lg:top-24 lg:self-start">
                <div className="gh2-glass-forest gh2-dark-content transform-gpu p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]">
                    {bp.bookingSteps}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/90">
                    {service.name} · {langName}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    We’ll automatically assign an available GP who speaks {langName}.
                  </p>
                  <ul className="mt-5 grid gap-2.5 border-t border-white/10 pt-5">
                    {[
                      { icon: ShieldCheck, label: c.serviceDetailPage.trustRegistered.replace("{country}", countryName) },
                      { icon: Video, label: c.serviceDetailPage.trustVideo },
                      { icon: Lock, label: c.serviceDetailPage.trustConfidential },
                    ].map(({ icon: Icon, label }) => (
                      <li
                        key={label}
                        className="gh2-trust-tile gh2-trust-tile-dark flex items-center gap-3 text-[13px] font-semibold text-white/85"
                      >
                        <span
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]"
                          style={{
                            background: "rgba(176,241,34,0.10)",
                            border: "1px solid rgba(176,241,34,0.18)",
                          }}
                        >
                          <Icon className="size-4 shrink-0 text-[var(--color-brand-accent)]" aria-hidden />
                        </span>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              <div className="order-1 min-w-0 lg:order-none">
                <BookingSectionHeader
                  eyebrow={bp.stepDetails}
                  title={bp.detailsTitle}
                  description={bp.detailsDesc}
                />
                <div className="gh2-glass-forest gh2-dark-content mt-6 p-5 sm:p-6">
                  <ConsultationBookingForm
                    doctorId=""
                    doctorName={`A GP who speaks ${langName}`}
                    serviceId={service.id}
                    kind="GENERAL_CONSULTATION"
                    slots={[
                      {
                        id: at,
                        startAt: slot.startAt,
                        endAt: slot.endAt,
                        priceCents: slot.priceCents,
                        pricingType: slot.pricingType,
                        currencyCode: slot.currencyCode,
                      },
                    ]}
                    clinicTimezone={clinicTimezone}
                    initialSlotId={at}
                    changeTimeHref={homeHref}
                    autoAssign={{ country: code, language }}
                    countryCode={code}
                    i18n={bf}
                    bookingRequirements={bookingRequirements}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

async function SelectedServiceFlow({
  code,
  country,
  lang,
  service,
  doctors,
  doctorSlug,
  slotId,
  at,
  itemKind,
  bf,
  bp,
  bookingRequirements,
  insuranceCompanyId,
  selectedInsurance,
  benefitHrefParam,
}: {
  code: string;
  country: string;
  lang: string;
  service: CountryServiceCard;
  doctors: CountryDoctorCard[];
  doctorSlug: string | null;
  slotId: string | null;
  at: string | null;
  itemKind: "GENERAL_CONSULTATION" | "SPECIALIST_CONSULTATION";
  bf: import("@/lib/i18n/types").CommonLocale["bookingForm"];
  bp: BookT;
  bookingRequirements: import("@/lib/content/get-public-countries").PublicBookingRequirements;
  /** Chosen insurer (null = paying the standard price). */
  insuranceCompanyId: string | null;
  selectedInsurance: import("@/lib/content/get-country-collections").InsuranceOption | null;
  /** The `benefit` value to carry on downstream links (`<source>:<refId>` or "none"). */
  benefitHrefParam: string | null;
}) {
  const assignedDoctorIds = new Set(service.assignedDoctorIds);
  const serviceDoctors =
    assignedDoctorIds.size > 0
      ? doctors.filter((doctor) => assignedDoctorIds.has(doctor.id))
      : [];
  const selectedDoctor = doctorSlug
    ? serviceDoctors.find((doctor) => doctor.slug === doctorSlug) ?? null
    : null;

  // Service-first: no clinician resolved yet → TIME step, then DOCTOR step.
  // (A doctor-first arrival with a valid assigned doctor resolves selectedDoctor
  // above and skips this whole block.)
  if (!selectedDoctor) {
    // Under an insurer, the backend narrows the doctor pool to that insurer's
    // network — so zero slots here means "no doctor takes this insurance for
    // this service", exactly the empty state below.
    const agg = await getServiceAggregatedAvailability(
      code,
      service.slug,
      14,
      insuranceCompanyId,
    );

    // DOCTOR step — a time was chosen (?at=): offer the doctors free then.
    if (at) {
      const refs = agg.doctorsByStart[at] ?? [];
      const slotByDoctorId: Record<string, string> = {};
      for (const ref of refs) slotByDoctorId[ref.doctorId] = ref.slotId;
      const doctorsAtTime = serviceDoctors.filter((doctor) => slotByDoctorId[doctor.id]);

      return (
        <div className="grid gap-6">
          <BookingSectionHeader
            eyebrow={bp.stepDoctor}
            title={bp.chooseClinicianFor.replace("{service}", service.name)}
            description={bp.onlyAssigned}
          />
          {doctorsAtTime.length === 0 ? (
            <div className="gh2-status-card text-center">
              <CalendarDays className="mx-auto size-6 text-[var(--color-text-muted)]" aria-hidden />
              <p className="mt-3 font-semibold text-[var(--color-text-primary)]">{bp.slotNoLongerOpen}</p>
              <Link
                href={buildBookHref({
                  country,
                  lang,
                  service: service.slug,
                  benefit: benefitHrefParam,
                })}
                className="gh2-btn-lime mt-4"
              >
                {bp.pickTime}
              </Link>
            </div>
          ) : (
            <LanguageFilteredDoctors
              country={country}
              lang={lang}
              service={service}
              doctors={doctorsAtTime}
              slotByDoctorId={slotByDoctorId}
              at={at}
              bp={bp}
              cardI18n={doctorCardI18n(loadLocaleBundle(lang as LocaleCode).common.doctors)}
              benefit={benefitHrefParam}
            />
          )}
        </div>
      );
    }

    // TIME step — no time yet: aggregated open times across all assigned doctors.
    return (
      <div className="grid gap-6">
        <BookingSectionHeader eyebrow={bp.stepTime} title={bp.pickTime} description={bp.timesShown} />
        <div className="gh2-glass-forest gh2-dark-content min-w-0 p-5 sm:p-6">
          <header className="border-b border-[var(--color-border)] pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-accent)]">
              {bp.selectedConsultation}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--color-text-primary)]">
              {service.name}
            </h2>
          </header>
          {agg.slots.length === 0 ? (
            <div className="gh2-status-card mt-6 text-center">
              <CalendarDays className="mx-auto size-6 text-[var(--color-text-muted)]" aria-hidden />
              <p className="mt-3 font-semibold text-[var(--color-text-primary)]">{bp.noOpenSlots}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {selectedInsurance
                  ? bp.noInsuranceDoctors.replace("{insurer}", selectedInsurance.name)
                  : bp.checkBackClinician.replace("{service}", service.name)}
              </p>
              {/* Under an insurer with no in-network doctor, the useful escape is
                * back to the insurance step (pay standard instead), not the
                * service list. */}
              <Link
                href={
                  selectedInsurance
                    ? buildBookHref({ country, lang, service: service.slug })
                    : buildBookHref({ country, lang })
                }
                className="gh2-btn-lime mt-5"
              >
                {selectedInsurance ? bp.stepBenefit : bp.changeService}
              </Link>
            </div>
          ) : (
            <div className="mt-6">
              <ServiceTimePicker
                country={country}
                lang={lang}
                serviceSlug={service.slug}
                slots={agg.slots}
                clinicTimezone={agg.clinicTimezone}
                i18n={bf}
                benefit={benefitHrefParam}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Under an insurer the backend 404s a doctor outside that insurer's network,
  // which lands here as zero slots → the "no doctor for this insurer" state.
  const { slots, clinicTimezone } = await getServiceDoctorAvailability(
    code,
    service.slug,
    selectedDoctor.slug,
    14,
    insuranceCompanyId,
  );
  // Slot is confirmed only when ?slot= is set AND still open. Until then the
  // patient is on the TIME step (slot picker); once confirmed, the DETAILS
  // step (the form). A stale ?slot= falls back to the time step with a notice.
  const slotConfirmed = Boolean(slotId) && slots.some((slot) => slot.id === slotId);
  const slotStale = Boolean(slotId) && !slotConfirmed;

  return (
    <div className="grid gap-6">
      <BookingSectionHeader
        eyebrow={slotConfirmed ? bp.stepDetails : bp.stepTime}
        title={slotConfirmed ? bp.detailsTitle : bp.pickTime}
        description={slotConfirmed ? bp.detailsDesc : bp.timesShown}
      />
      <div className="gh2-glass-forest gh2-dark-content min-w-0 p-5 sm:p-6">
        <header className="border-b border-[var(--color-border)] pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-accent)]">
            {bp.selectedConsultation}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--color-text-primary)]">
            {service.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {selectedDoctor.fullName} · {selectedDoctor.title}
          </p>
        </header>

        {slotStale ? (
          <InlineNotice
            notice={{ tone: "warning", message: bp.slotNoLongerOpen }}
          />
        ) : null}

        {slots.length === 0 ? (
          <div className="gh2-status-card mt-6 text-center">
            <CalendarDays className="mx-auto size-6 text-[var(--color-text-muted)]" aria-hidden />
            <p className="mt-3 font-semibold text-[var(--color-text-primary)]">
              {bp.noOpenSlots}
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {selectedInsurance
                ? bp.noInsuranceDoctors.replace("{insurer}", selectedInsurance.name)
                : bp.checkBackClinician.replace("{service}", service.name)}
            </p>
            <Link
              href={
                selectedInsurance
                  ? buildBookHref({ country, lang, service: service.slug })
                  : buildBookHref({ country, lang, service: service.slug })
              }
              className="gh2-btn-lime mt-5"
            >
              {selectedInsurance ? bp.stepBenefit : bp.pickAnotherClinician}
            </Link>
          </div>
        ) : !slotConfirmed ? (
          // Step 3 — TIME only. Picking a time writes ?slot= and advances.
          <div className="mt-6">
            <SlotPickerStep
              country={country}
              lang={lang}
              serviceSlug={service.slug}
              doctorSlug={selectedDoctor.slug}
              slots={slots}
              clinicTimezone={clinicTimezone}
              i18n={bf}
              benefit={benefitHrefParam}
            />
          </div>
        ) : (
          // Step 4 — DETAILS. Slot is fixed (shown as a summary in the form).
          // The insurer was chosen back at the insurance step, so the form only
          // collects the card number for it — no dropdown here.
          <div className="mt-6">
            <ConsultationBookingForm
              doctorId={selectedDoctor.id}
              doctorName={selectedDoctor.fullName}
              serviceId={service.id}
              kind={itemKind}
              slots={slots}
              clinicTimezone={clinicTimezone}
              initialSlotId={slotId}
              changeTimeHref={
                at
                  ? // Service-first: back to the aggregated TIME step (drop doctor).
                    buildBookHref({
                      country,
                      lang,
                      service: service.slug,
                      benefit: benefitHrefParam,
                    })
                  : // Doctor-first: back to this doctor's time picker.
                    buildBookHref({
                      country,
                      lang,
                      service: service.slug,
                      doctor: selectedDoctor.slug,
                      benefit: benefitHrefParam,
                    })
              }
              countryCode={code}
              i18n={bf}
              bookingRequirements={bookingRequirements}
              selectedInsurance={selectedInsurance}
              benefitParam={benefitHrefParam}
            />
          </div>
        )}
      </div>
    </div>
  );
}


function ServicePicker({
  country,
  lang,
  services,
  requestedDoctor,
  allServicesCount,
  bp,
  minSuffix,
}: {
  country: string;
  lang: string;
  services: CountryServiceCard[];
  requestedDoctor: CountryDoctorCard | null;
  allServicesCount: number;
  bp: BookT;
  minSuffix: string;
}) {
  return (
    <div className="grid gap-6">
      <BookingSectionHeader
        eyebrow={requestedDoctor ? bp.step2 : bp.step1}
        title={
          requestedDoctor
            ? bp.chooseServiceWith.replace("{doctor}", requestedDoctor.fullName)
            : bp.chooseWhatYouNeed
        }
        description={bp.servicesEnabledNote}
      />
      {/* Escape hatch back to the homepage's same-day GP quick-book — once a
        * patient lands on the full 4-step wizard there was previously no way
        * back to that faster language+time-only path. */}
      {!requestedDoctor ? (
        <Link
          href={`/${country}/${lang}#same-day-booking`}
          className="gh-link inline-flex w-fit items-center gap-1.5 text-sm font-semibold"
        >
          Need a same-day GP instead?
        </Link>
      ) : null}
      {services.length === 0 ? (
        <div className="gh2-status-card gh2-status-card-dark text-center">
          <p className="font-semibold text-white">
            {allServicesCount === 0
              ? bp.noBookableServices
              : bp.clinicianNoServices}
          </p>
          <p className="mt-2 text-sm text-white/60">
            {bp.browseDirectory}
          </p>
          <Link href={`/${country}/${lang}/doctors`} className="gh2-btn-lime mt-5">
            {bp.browseDoctors}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <ServiceChoiceCard
              key={service.id}
              service={service}
              href={buildBookHref({
                country,
                lang,
                service: service.slug,
                doctor: requestedDoctor?.slug,
              })}
              viewHref={`/${country}/${lang}/services/${service.slug}`}
              bp={bp}
              minSuffix={minSuffix}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceChoiceCard({
  service,
  href,
  viewHref,
  bp,
  minSuffix,
}: {
  service: CountryServiceCard;
  href: string;
  viewHref: string;
  bp: BookT;
  minSuffix: string;
}) {
  return (
    <div className="gh2-glass-forest gh2-dark-content gh2-card-hover grid min-h-[220px] overflow-hidden">
      {service.imageSrc ? (
        <div className="relative min-h-[150px] overflow-hidden">
          <Image
            src={service.imageSrc}
            alt={`${service.name} online consultation`}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            unoptimized={isUnoptimizedImageSrc(service.imageSrc)}
          />
        </div>
      ) : null}
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]">
            {service.kind === "SPECIALIST" ? (
              <UserRound className="size-3.5" aria-hidden />
            ) : (
              <Stethoscope className="size-3.5" aria-hidden />
            )}
            {service.kind === "SPECIALIST" ? bp.tagSpecialist : bp.tagGeneral}
          </span>
          {service.durationMinutes ? (
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              {service.durationMinutes} {minSuffix}
            </span>
          ) : null}
        </div>
        <h3 className="mt-4 text-xl font-extrabold tracking-[-0.02em] text-[var(--color-text-primary)]">
          {service.name}
        </h3>
        {service.summary ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {service.summary}
          </p>
        ) : null}
        <div className="mt-auto flex items-center gap-2.5 pt-5">
          <span className="text-sm font-semibold text-white/70">
            {service.basePriceCents != null
              ? formatPriceRounded(service.basePriceCents, service.currencyCode)
              : bp.priceVaries}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href={viewHref}
              className="gh2-btn-compact gh2-btn-compact-secondary-dark"
            >
              View
            </Link>
            <Link
              href={href}
              className="gh2-btn-compact gh2-btn-compact-primary-dark"
            >
              {bp.continue}
              <ArrowRight className="size-3.5 shrink-0" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  current,
  labels,
  values,
  hrefs,
}: {
  current: number;
  labels: string[];
  values: (string | null)[];
  /** Back-nav target per step. Only rendered as a link when the step is
   *  complete (step.n < current) — current/future steps aren't reachable
   *  yet. Replaces the old per-card "Change service" / "Edit doctor" /
   *  "Change time" ghost buttons: back-navigation lives in one place. */
  hrefs?: (string | null)[];
}) {
  return (
    <ol className="relative mt-5 grid gap-3">
      {/* Vertical rail through the step dots — the single "you are here"
        * signal (replaces the old per-label underline hack). */}
      <span
        aria-hidden
        className="absolute left-4 top-4 bottom-4 w-px bg-white/12"
      />
      {labels.map((_label, i) => {
        // Step count is dynamic: services with a bookable insurer add an
        // Insurance step between Service and Time.
        const step = { n: i + 1 };
        const complete = step.n < current;
        const active = step.n === current;
        const value = values[step.n - 1] ?? null;
        const href = complete ? (hrefs?.[step.n - 1] ?? null) : null;

        const dot = (
          <span
            className={`relative z-10 mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              active
                ? "bg-[var(--color-brand-accent)] text-[#0a1f1a] ring-4 ring-[rgba(176,241,34,0.18)]"
                : complete
                  ? "bg-[rgba(176,241,34,0.14)] text-[var(--color-brand-accent)]"
                  : "bg-white/5 text-white/45"
            }`}
          >
            {complete ? <CheckCircle2 className="size-3.5" aria-hidden /> : step.n}
          </span>
        );

        const label = (
          <span className="flex flex-col">
            <span
              className={
                active
                  ? "text-sm font-bold text-white/92"
                  : complete
                    ? "text-sm font-semibold text-[var(--color-brand-accent)] group-hover:underline"
                    : "text-sm font-semibold text-white/45"
              }
            >
              {labels[step.n - 1]}
              {active ? (
                <span className="sr-only"> — Step {step.n} of {labels.length}</span>
              ) : null}
            </span>
            {value ? (
              <span className="text-xs leading-snug text-white/55">{value}</span>
            ) : null}
          </span>
        );

        return (
          <li
            key={step.n}
            className="relative"
            aria-current={active ? "step" : undefined}
          >
            {href ? (
              <Link href={href} className="group flex items-start gap-3">
                {dot}
                {label}
              </Link>
            ) : (
              <div className="flex items-start gap-3">
                {dot}
                {label}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}


function InlineNotice({ notice }: { notice: NonNullable<Notice> }) {
  const isWarning = notice.tone === "warning";
  return (
    <div
      className={`mb-5 rounded-[var(--radius-card-sm)] px-4 py-3 text-sm border text-[var(--color-text-body)] ${
        isWarning
          ? "bg-[rgba(255,196,0,0.08)] border-[rgba(255,196,0,0.25)]"
          : "bg-[rgba(29,75,54,0.06)] border-[rgba(29,75,54,0.16)]"
      }`}
    >
      {notice.message}
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}
