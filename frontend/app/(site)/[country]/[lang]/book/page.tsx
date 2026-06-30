import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Lock, ShieldCheck, Stethoscope, UserRound, Video } from "lucide-react";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { countries, getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
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
import { ServiceTimePicker } from "./_components/service-time-picker";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { buildBookHref } from "@/lib/routing/book-href";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { ConsultationBookingForm } from "../consult/[serviceSlug]/_components/consultation-booking-form";
import { SlotPickerStep } from "../consult/[serviceSlug]/_components/slot-picker-step";
import { LanguageFilteredDoctors } from "./_components/language-filtered-doctors";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

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
};

type Notice = { tone: "info" | "warning"; message: string } | null;

const STEPS = [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }] as const;

type BookT = import("@/lib/i18n/types").CommonLocale["bookPage"];

export async function generateStaticParams(): Promise<Params[]> {
  return countries.map((c) => ({
    country: COUNTRY_CODE_TO_SLUG[c.code],
    lang: (c.defaultLocale ?? "en").toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const url = `${getSiteUrl()}/${country}/${lang}/book`;
  const title = `Book your online consultation | ${SITE_NAME}`;
  const description =
    `Medicine Anytime Anywhere. Choose a service, pick a clinician, and book an online consultation in ${config.name}.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/book") },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
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

  const overlay = await getPublicCountryByCode(code);
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
  const stepValues: (string | null)[] = doctorFirst
    ? [requestedDoctor?.fullName ?? null, selectedService?.name ?? null, timeValue, null]
    : [selectedService?.name ?? null, timeValue, requestedDoctor?.fullName ?? null, null];
  const stepLabels: string[] = doctorFirst
    ? [bp.stepDoctor, bp.stepService, bp.stepTime, bp.stepDetails]
    : [bp.stepService, bp.stepTime, bp.stepDoctor, bp.stepDetails];
  let currentStep: number;
  if (doctorFirst) {
    const baseStep = !selectedService ? 2 : 3;
    currentStep = baseStep === 3 && slotParam ? 4 : baseStep;
  } else {
    // Service-first: Service(1) → Time(2) → Doctor(3) → Details(4).
    currentStep = !selectedService ? 1 : slotParam ? 4 : atParam ? 3 : 2;
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

      <GH2FlowHeader
        title={bp.title}
        subtitle={bp.subtitle.replace("{country}", config.name)}
        activeStep={currentStep}
        steps={stepLabels}
      />

      <section
        id="booking"
        className="scroll-mt-24 bg-[var(--color-background-soft)] py-[clamp(48px,6vw,88px)]"
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.8fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                  {bp.bookingSteps}
                </p>
                <StepIndicator current={currentStep} labels={stepLabels} values={stepValues} />
                <p className="mt-5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {bp.availabilityNote}
                </p>
                {/* Trust signals — same platform facts as the service pages. */}
                <ul className="mt-5 grid gap-2.5 border-t border-[var(--color-border)] pt-5">
                  {[
                    { icon: ShieldCheck, label: c.serviceDetailPage.trustRegistered.replace("{country}", config.name) },
                    { icon: Video, label: c.serviceDetailPage.trustVideo },
                    { icon: Lock, label: c.serviceDetailPage.trustConfidential },
                  ].map(({ icon: Icon, label }) => (
                    <li
                      key={label}
                      className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--color-text-body)]"
                    >
                      <Icon className="size-4 shrink-0 text-[var(--color-brand-primary)]" aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="min-w-0">
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
        className="scroll-mt-24 bg-[var(--color-background-soft)] py-[clamp(48px,6vw,88px)]"
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          {!valid || !service || !slot ? (
            <div className="mx-auto max-w-[640px] rounded-[var(--radius-card)] border border-[rgba(255,196,0,0.25)] bg-[rgba(255,196,0,0.08)] p-6 text-center">
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
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                    {bp.bookingSteps}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-body)]">
                    {service.name} · {langName}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    We’ll automatically assign an available GP who speaks {langName}.
                  </p>
                  <ul className="mt-5 grid gap-2.5 border-t border-[var(--color-border)] pt-5">
                    {[
                      { icon: ShieldCheck, label: c.serviceDetailPage.trustRegistered.replace("{country}", countryName) },
                      { icon: Video, label: c.serviceDetailPage.trustVideo },
                      { icon: Lock, label: c.serviceDetailPage.trustConfidential },
                    ].map(({ icon: Icon, label }) => (
                      <li
                        key={label}
                        className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--color-text-body)]"
                      >
                        <Icon className="size-4 shrink-0 text-[var(--color-brand-primary)]" aria-hidden />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              <div className="min-w-0">
                <BookingSectionHeader
                  eyebrow={bp.stepDetails}
                  title={bp.detailsTitle}
                  description={bp.detailsDesc}
                />
                <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
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
                    i18n={bf}
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
    const agg = await getServiceAggregatedAvailability(code, service.slug, 14);

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
            <div className="rounded-[var(--radius-card)] border border-[rgba(255,196,0,0.25)] bg-[rgba(255,196,0,0.08)] p-5">
              <p className="font-semibold text-[var(--color-text-primary)]">{bp.slotNoLongerOpen}</p>
              <Link
                href={buildBookHref({ country, lang, service: service.slug })}
                className="gh2-btn-lime mt-4"
              >
                {bp.pickTime}
              </Link>
            </div>
          ) : (
            <>
              <LanguageFilteredDoctors
                country={country}
                lang={lang}
                service={service}
                doctors={doctorsAtTime}
                slotByDoctorId={slotByDoctorId}
                at={at}
                bp={bp}
              />
              <Link
                href={buildBookHref({ country, lang, service: service.slug })}
                className="justify-self-start rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-soft)]"
              >
                {bp.stepTime}
              </Link>
            </>
          )}
        </div>
      );
    }

    // TIME step — no time yet: aggregated open times across all assigned doctors.
    return (
      <div className="grid gap-6">
        <BookingSectionHeader eyebrow={bp.stepTime} title={bp.pickTime} description={bp.timesShown} />
        <div className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                {bp.selectedConsultation}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--color-text-primary)]">
                {service.name}
              </h2>
            </div>
            <Link
              href={buildBookHref({ country, lang })}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-soft)]"
            >
              {bp.changeService}
            </Link>
          </header>
          {agg.slots.length === 0 ? (
            <div className="mt-6 rounded-[var(--radius-card)] border border-[rgba(255,196,0,0.25)] bg-[rgba(255,196,0,0.08)] p-5">
              <p className="font-semibold text-[var(--color-text-primary)]">{bp.noOpenSlots}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {bp.checkBackClinician.replace("{service}", service.name)}
              </p>
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
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const { slots, clinicTimezone } = await getServiceDoctorAvailability(
    code,
    service.slug,
    selectedDoctor.slug,
    14,
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
      <div className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              {bp.selectedConsultation}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--color-text-primary)]">
              {service.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {selectedDoctor.fullName} · {selectedDoctor.title}
            </p>
          </div>
          <Link
            href={buildBookHref({ country, lang })}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-soft)]"
          >
            {bp.changeService}
          </Link>
        </header>

        {slotStale ? (
          <InlineNotice
            notice={{ tone: "warning", message: bp.slotNoLongerOpen }}
          />
        ) : null}

        {slots.length === 0 ? (
          <div className="mt-6 rounded-[var(--radius-card)] border border-[rgba(255,196,0,0.25)] bg-[rgba(255,196,0,0.08)] p-5">
            <p className="font-semibold text-[var(--color-text-primary)]">
              {bp.noOpenSlots}
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {bp.checkBackClinician.replace("{service}", service.name)}
            </p>
            <Link
              href={buildBookHref({ country, lang, service: service.slug })}
              className="gh2-btn-lime mt-5"
            >
              {bp.pickAnotherClinician}
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
            />
          </div>
        ) : (
          // Step 4 — DETAILS. Slot is fixed (shown as a summary in the form).
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
                    buildBookHref({ country, lang, service: service.slug })
                  : // Doctor-first: back to this doctor's time picker.
                    buildBookHref({ country, lang, service: service.slug, doctor: selectedDoctor.slug })
              }
              i18n={bf}
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
      {services.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
          <p className="font-semibold text-[var(--color-text-primary)]">
            {allServicesCount === 0
              ? bp.noBookableServices
              : bp.clinicianNoServices}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
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

function DoctorPicker({
  country,
  lang,
  service,
  doctors,
  bp,
}: {
  country: string;
  lang: string;
  service: CountryServiceCard;
  doctors: CountryDoctorCard[];
  bp: BookT;
}) {
  if (doctors.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <p className="font-semibold text-[var(--color-text-primary)]">
          {bp.noCliniciansAssigned}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {bp.browseAllOrChoose}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href={`/${country}/${lang}/doctors`} className="gh2-btn-lime">
            {bp.browseDoctors}
          </Link>
          <Link
            href={buildBookHref({ country, lang })}
            className="rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-brand-primary)]"
          >
            {bp.changeService}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      {doctors.map((doctor) => (
        <li key={doctor.id}>
          <DoctorCard
            name={doctor.fullName}
            title={doctor.title}
            imcRegistration={doctor.imcRegistration}
            medicalRegistrationUrl={doctor.medicalRegistrationUrl}
            languages={doctor.languages}
            whatsappNumber={doctor.whatsappNumber}
            bio={doctor.bio ?? ""}
            imageSrc={doctor.imageSrc ?? null}
            imageAltText={doctor.imageAltText}
            imageTitle={doctor.imageTitle}
            imageCaption={doctor.imageCaption}
            imageDescription={doctor.imageDescription}
            href={`/${country}/${lang}/doctors/${doctor.slug}`}
            bookingHref={buildBookHref({
              country,
              lang,
              service: service.slug,
              doctor: doctor.slug,
            })}
            primaryLabel={bp.continue}
            ctaLabel="View"
          />
        </li>
      ))}
    </ul>
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
    <div className="grid min-h-[220px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
      {service.imageSrc ? (
        <div className="relative min-h-[150px] overflow-hidden">
          <Image
            src={service.imageSrc}
            alt={`${service.name} online consultation`}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            unoptimized={/^https?:\/\//i.test(service.imageSrc) || service.imageSrc.startsWith("/api/media/")}
          />
        </div>
      ) : null}
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]">
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
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            {service.basePriceCents != null
              ? formatPriceRounded(service.basePriceCents, service.currencyCode)
              : bp.priceVaries}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href={viewHref}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm font-bold text-[var(--color-brand-primary)] transition-colors hover:border-[var(--color-brand-primary)]/40 hover:bg-[var(--color-background-soft)]"
            >
              View
            </Link>
            <Link
              href={href}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-[var(--color-brand-primary)] px-4 text-sm font-bold text-white transition-[filter] hover:brightness-110"
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
}: {
  current: number;
  labels: string[];
  values: (string | null)[];
}) {
  return (
    <ol className="mt-5 grid gap-3">
      {STEPS.map((step) => {
        const complete = step.n < current;
        const active = step.n === current;
        const value = values[step.n - 1] ?? null;
        return (
          <li key={step.n} className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                complete || active
                  ? "bg-[var(--color-brand-primary)] text-white"
                  : "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]"
              }`}
            >
              {complete ? <CheckCircle2 className="size-4" aria-hidden /> : step.n}
            </span>
            <span className="flex flex-col">
              <span
                className={
                  active
                    ? "text-sm font-bold text-[var(--color-text-primary)]"
                    : "text-sm font-semibold text-[var(--color-text-muted)]"
                }
              >
                {labels[step.n - 1]}
              </span>
              {value ? (
                <span className="text-xs leading-snug text-[var(--color-text-muted)]">{value}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function BookingSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 max-w-[18ch] text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[var(--color-text-primary)]">
        {title}
      </h2>
      <p className="mt-3 max-w-[58ch] text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
    </header>
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
