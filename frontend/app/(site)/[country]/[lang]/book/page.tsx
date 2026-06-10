import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Stethoscope, UserRound } from "lucide-react";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/sections/PageHero";
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
import { getPublicPage, isSupportedLocale, type PublicLocale } from "@/lib/content/get-public-page";
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

const STEPS = [
  { n: 1, label: "Service" },
  { n: 2, label: "Doctor" },
  { n: 3, label: "Time" },
  { n: 4, label: "Details" },
] as const;

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

  const serviceSlugParam = firstParam(sp.service);
  const serviceIdParam = firstParam(sp.serviceId);
  const doctorSlugParam = firstParam(sp.doctor);
  const slotParam = firstParam(sp.slot);

  const overlay = await getPublicCountryByCode(code);
  const generalEnabled = isCountryFeatureEnabled(overlay, "general-consultations");
  const specialistEnabled = isCountryFeatureEnabled(overlay, "specialist-consultations");

  const [{ record: homePage }, generalServicesRaw, specialistServicesRaw, doctors] =
    await Promise.all([
      getPublicPage(code, "HOME", lang as PublicLocale),
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

  const currentStep = !selectedService ? 1 : requestedDoctorAssigned ? 3 : 2;
  const itemKind =
    selectedService?.kind === "SPECIALIST"
      ? "SPECIALIST_CONSULTATION"
      : "GENERAL_CONSULTATION";

  let notice: Notice = null;
  if ((serviceSlugParam || serviceIdParam) && !selectedService) {
    notice = {
      tone: "warning",
      message:
        "That service is not available for this country right now. Choose another service to continue.",
    };
  } else if (doctorSlugParam && !requestedDoctor) {
    notice = {
      tone: "warning",
      message:
        "That clinician profile is not available in this country right now. Choose a service to continue.",
    };
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

      <PageHero
        countryCode={config.code}
        countryLabel={`${config.name} Medical Clinic · Book online`}
        titleLead="Book your online"
        titleAccent="consultation."
        lede={
          <>
            Medicine Anytime Anywhere. Choose a service, select a time that works
            for you, and speak with a healthcare professional online.
          </>
        }
        ctaLabel="Start booking"
        ctaHref="#booking"
        secondaryLabel="View doctors"
        secondaryHref={`/${slug}/${lang}/doctors`}
        rightSlot={
          <BookingHeroPanel
            countryName={config.name}
            doctorCount={doctors.length}
            serviceCount={services.length}
            imageSrc={homePage?.heroImageSrc ?? "/images/stock/book.jpg"}
          />
        }
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
                  Booking steps
                </p>
                <StepIndicator current={currentStep} />
                <p className="mt-5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  Appointments are subject to clinician availability. You will
                  receive confirmation after completing your booking.
                </p>
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
          eyebrow="Step 2"
          title={`Choose a clinician for ${service.name}`}
          description="Only clinicians assigned to this service are shown here."
        />
        {doctorSlug ? (
          <InlineNotice
            notice={{
              tone: "warning",
              message: requestedDoctorExists
                ? "That clinician is not assigned to this service right now. Choose another clinician to continue."
                : "That clinician is not available in this country right now. Choose another clinician to continue.",
            }}
          />
        ) : null}
        <LanguageFilteredDoctors
          country={country}
          lang={lang}
          service={service}
          doctors={serviceDoctors}
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
        eyebrow="Steps 3 and 4"
        title="Pick a time and add patient details"
        description="Times are shown in the clinic timezone. The appointment is added to your cart before checkout."
      />
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
              Selected consultation
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
            Change service
          </Link>
        </header>

        {!slotIsValid ? (
          <InlineNotice
            notice={{
              tone: "warning",
              message:
                "The slot from your link is no longer open. The next available slot is selected below.",
            }}
          />
        ) : null}

        {slots.length === 0 ? (
          <div className="mt-6 rounded-[var(--radius-card)] border border-[rgba(255,196,0,0.25)] bg-[rgba(255,196,0,0.08)] p-5">
            <p className="font-semibold text-[var(--color-text-primary)]">
              No open slots in the next 14 days.
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Check back soon or choose another clinician for {service.name}.
            </p>
            <Link
              href={buildBookHref({ country, lang, service: service.slug })}
              className="gh-btn gh-btn-primary mt-5"
            >
              Pick another clinician
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
}: {
  country: string;
  lang: string;
  services: CountryServiceCard[];
  requestedDoctor: CountryDoctorCard | null;
  allServicesCount: number;
}) {
  return (
    <div className="grid gap-6">
      <BookingSectionHeader
        eyebrow="Step 1"
        title={
          requestedDoctor
            ? `Choose a service with ${requestedDoctor.fullName}`
            : "Choose what you need"
        }
        description="General and specialist services are shown only when enabled for your country."
      />
      {services.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
          <p className="font-semibold text-[var(--color-text-primary)]">
            {allServicesCount === 0
              ? "No bookable services are available right now."
              : "This clinician has no bookable public services right now."}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Browse the clinician directory or check again soon.
          </p>
          <Link href={`/${country}/${lang}/doctors`} className="gh-btn gh-btn-primary mt-5">
            Browse doctors
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
}: {
  country: string;
  lang: string;
  service: CountryServiceCard;
  doctors: CountryDoctorCard[];
}) {
  if (doctors.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <p className="font-semibold text-[var(--color-text-primary)]">
          No clinicians are assigned to this service yet.
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Browse all doctors or choose another service.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href={`/${country}/${lang}/doctors`} className="gh-btn gh-btn-primary">
            Browse doctors
          </Link>
          <Link
            href={buildBookHref({ country, lang })}
            className="rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-brand-primary)]"
          >
            Change service
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
            ctaLabel="View profile"
          />
        </li>
      ))}
    </ul>
  );
}

function ServiceChoiceCard({
  service,
  href,
}: {
  service: CountryServiceCard;
  href: string;
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
            {service.kind === "SPECIALIST" ? "Specialist" : "General"}
          </span>
          {service.durationMinutes ? (
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              {service.durationMinutes} min
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
              : "Price varies"}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-brand-primary)]">
            Continue
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

function StepIndicator({ current }: { current: number }) {
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
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function BookingHeroPanel({
  countryName,
  doctorCount,
  serviceCount,
  imageSrc,
}: {
  countryName: string;
  doctorCount: number;
  serviceCount: number;
  imageSrc: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-white/12 bg-white/[0.04] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="relative aspect-[4/3]">
        <Image
          src={imageSrc}
          alt={`Patient booking a telemedicine consultation in ${countryName} from home`}
          fill
          sizes="420px"
          className="object-cover"
          priority
          unoptimized={/^https?:\/\//i.test(imageSrc) || imageSrc.startsWith("/api/media/")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,46,37,0.92)] via-[rgba(15,46,37,0.28)] to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]">
            Medicine Anytime Anywhere
          </p>
          <p className="mt-2 text-lg font-extrabold leading-tight text-white">
            {countryName} appointments, guided from service to slot.
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10">
        <div className="p-4">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            Clinicians
          </dt>
          <dd className="mt-1 text-2xl font-extrabold text-white">{doctorCount}</dd>
        </div>
        <div className="p-4">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            Services
          </dt>
          <dd className="mt-1 text-2xl font-extrabold text-white">{serviceCount}</dd>
        </div>
      </dl>
    </div>
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
