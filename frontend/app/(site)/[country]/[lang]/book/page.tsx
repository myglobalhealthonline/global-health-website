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
import { ConsultationBookingForm } from "../consult/[serviceSlug]/_components/consultation-booking-form";
import { LanguageFilteredDoctors } from "./_components/language-filtered-doctors";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

type Params = { country: string; lang: string };
type SearchParams = {
  service?: string | string[];
  serviceId?: string | string[];
  doctor?: string | string[];
  slot?: string | string[];
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

  const serviceSlugParam = firstParam(sp.service);
  const serviceIdParam = firstParam(sp.serviceId);
  const doctorSlugParam = firstParam(sp.doctor);
  const slotParam = firstParam(sp.slot);

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

  // The booking flow is bidirectional: a patient can arrive doctor-first
  // (from a doctor card → ?doctor=) and then pick service + time, or
  // service-first and then pick doctor + time. Both converge on Time →
  // Details. The stepper reflects whichever order the patient actually took
  // so step 1 always matches the choice they already made.
  const doctorFirst = Boolean(requestedDoctor) && (!selectedService || requestedDoctorAssigned);

  const stepValues: (string | null)[] = doctorFirst
    ? [requestedDoctor?.fullName ?? null, selectedService?.name ?? null, null, null]
    : [selectedService?.name ?? null, requestedDoctor?.fullName ?? null, null, null];
  const stepLabels: string[] = doctorFirst
    ? [bp.stepDoctor, bp.stepService, bp.stepTime, bp.stepDetails]
    : [bp.stepService, bp.stepDoctor, bp.stepTime, bp.stepDetails];
  const currentStep = doctorFirst
    ? !selectedService
      ? 2 // doctor chosen; now choosing the service
      : 3 // doctor + service chosen; now choosing the time
    : !selectedService
      ? 1
      : requestedDoctorAssigned
        ? 3
        : 2;
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

async function SelectedServiceFlow({
  code,
  country,
  lang,
  service,
  doctors,
  doctorSlug,
  slotId,
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

  if (!selectedDoctor) {
    const requestedDoctorExists = doctorSlug
      ? doctors.some((doctor) => doctor.slug === doctorSlug)
      : false;
    return (
      <div className="grid gap-6">
        <BookingSectionHeader
          eyebrow={bp.step2}
          title={bp.chooseClinicianFor.replace("{service}", service.name)}
          description={bp.onlyAssigned}
        />
        {doctorSlug ? (
          <InlineNotice
            notice={{
              tone: "warning",
              message: requestedDoctorExists
                ? bp.clinicianNotAssigned
                : bp.clinicianNotInCountry,
            }}
          />
        ) : null}
        <LanguageFilteredDoctors
          country={country}
          lang={lang}
          service={service}
          doctors={serviceDoctors}
          bp={bp}
        />
      </div>
    );
  }

  const { slots, clinicTimezone } = await getServiceDoctorAvailability(
    code,
    service.slug,
    selectedDoctor.slug,
    14,
  );
  const slotIsValid = slotId ? slots.some((slot) => slot.id === slotId) : true;

  return (
    <div className="grid gap-6">
      <BookingSectionHeader
        eyebrow={bp.steps34}
        title={bp.pickTimeDetails}
        description={bp.timesShown}
      />
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
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

        {!slotIsValid ? (
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
        ) : (
          <ConsultationBookingForm
            doctorId={selectedDoctor.id}
            doctorName={selectedDoctor.fullName}
            serviceId={service.id}
            kind={itemKind}
            slots={slots}
            clinicTimezone={clinicTimezone}
            initialSlotId={slotId}
            i18n={bf}
          />
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
            href={`/${country}/${lang}/doctors/${doctor.slug}`}
            bookingHref={buildBookHref({
              country,
              lang,
              service: service.slug,
              doctor: doctor.slug,
            })}
            ctaLabel={bp.viewProfile}
            bookLabel={bp.pickTime}
          />
        </li>
      ))}
    </ul>
  );
}

function ServiceChoiceCard({
  service,
  href,
  bp,
  minSuffix,
}: {
  service: CountryServiceCard;
  href: string;
  bp: BookT;
  minSuffix: string;
}) {
  return (
    <Link
      href={href}
      className="group grid min-h-[220px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]/25 hover:shadow-[var(--shadow-card-hover)]"
    >
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
        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            {service.basePriceCents != null
              ? formatPriceRounded(service.basePriceCents, service.currencyCode)
              : bp.priceVaries}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-brand-primary)]">
            {bp.continue}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="mt-5 grid gap-3">
      {STEPS.map((step) => {
        const complete = step.n < current;
        const active = step.n === current;
        return (
          <li key={step.n} className="flex items-center gap-3">
            <span
              className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                complete || active
                  ? "bg-[var(--color-brand-primary)] text-white"
                  : "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]"
              }`}
            >
              {complete ? <CheckCircle2 className="size-4" aria-hidden /> : step.n}
            </span>
            <span
              className={
                active
                  ? "text-sm font-bold text-[var(--color-text-primary)]"
                  : "text-sm font-semibold text-[var(--color-text-muted)]"
              }
            >
              {labels[step.n - 1]}
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
