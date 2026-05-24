import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  getCountryDoctors,
  getCountryServices,
  type CountryServiceCard,
} from "@/lib/content/get-country-collections";
import { getServiceDoctorAvailability } from "@/lib/content/get-doctor-availability";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import { ConsultationBookingForm } from "./_components/consultation-booking-form";

type Params = { country: string; lang: string; serviceSlug: string };
type SearchParams = { doctor?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, serviceSlug } = await params;
  return {
    title: `Book ${serviceSlug} | ${SITE_NAME}`,
    description: `Pick a doctor and time slot to book your consultation in ${country}.`,
  };
}

/**
 * Service booking page (cart-first flow).
 *
 * URL: `/[country]/[lang]/consult/[serviceSlug]?doctor=<slug>`
 *
 * Two modes:
 *   - Without `?doctor`: list doctors assigned to this service; each
 *     card is a Link that re-enters the page with `?doctor=<slug>`.
 *   - With `?doctor`: render selected doctor + service context, slot
 *     picker, and patient form. Submitting the form adds the
 *     consultation to the cart with the patient snapshot, then
 *     navigates to /cart.
 */
export default async function ConsultPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { country, lang, serviceSlug } = await params;
  const sp = (await searchParams) ?? {};
  const selectedDoctorSlug = typeof sp.doctor === "string" ? sp.doctor : null;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) notFound();

  // Resolve the service. It can be either GENERAL or SPECIALIST kind.
  const [generals, specialists] = await Promise.all([
    getCountryServices(code, "GENERAL"),
    getCountryServices(code, "SPECIALIST"),
  ]);
  const service: CountryServiceCard | undefined =
    generals.find((s) => s.slug === serviceSlug) ??
    specialists.find((s) => s.slug === serviceSlug);
  if (!service) notFound();

  // Doctors bookable for this service (admin-assigned via ServiceDoctor).
  const allDoctors = await getCountryDoctors(code);
  const assignedSet = new Set(service.assignedDoctorIds);
  const doctors = assignedSet.size > 0
    ? allDoctors.filter((d) => assignedSet.has(d.id))
    : [];

  const consultRoot = `/${country}/${lang}/${
    service.kind === "SPECIALIST" ? "specialist-consultation" : "general-consultation"
  }`;
  const itemKind =
    service.kind === "SPECIALIST" ? "SPECIALIST_CONSULTATION" : "GENERAL_CONSULTATION";

  return (
    <>
      {/* Dark hero — service context */}
      <section
        className="relative isolate overflow-hidden"
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(56px,7vw,96px) 0 clamp(40px,5vw,64px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 700px 400px at 90% -5%, rgba(176,241,34,0.10), transparent 55%)",
          }}
        />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <Link
            href={consultRoot}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-[0.12em] transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.50)" }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to consultations
          </Link>

          <div className="mt-6 flex items-center gap-2">
            <CalendarClock
              className="size-4"
              style={{ color: "var(--color-brand-accent)" }}
              aria-hidden
            />
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--color-brand-accent)" }}
            >
              {selectedDoctorSlug ? "Confirm your booking" : "Pick a doctor"}
            </p>
          </div>

          <h1
            className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{
              fontSize: "clamp(2rem, 4.5vw + 0.5rem, 4rem)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {service.name}
          </h1>

          {service.summary ? (
            <p
              className="mt-3 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.50)" }}
            >
              {service.summary}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: "rgba(176,241,34,0.12)",
                color: "var(--color-brand-accent)",
              }}
            >
              {service.basePriceCents != null
                ? formatPriceRounded(service.basePriceCents, service.currencyCode)
                : "Price varies"}
            </span>
            {service.durationMinutes != null ? (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.70)",
                }}
              >
                {service.durationMinutes} min
              </span>
            ) : null}
            <span
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              in {config.name}
            </span>
          </div>
        </div>
      </section>

      {/* Light content — doctor pick or booking form */}
      <section
        style={{
          background: "var(--color-background-soft)",
          padding: "clamp(48px,6vw,80px) 0",
        }}
      >
        <div className="mx-auto max-w-5xl px-5 md:px-10">
          {selectedDoctorSlug ? (
            await renderSelectedDoctorMode({
              code,
              service,
              serviceSlug,
              itemKind,
              doctors,
              selectedDoctorSlug,
              country,
              lang,
            })
          ) : (
            <DoctorListMode
              country={country}
              lang={lang}
              serviceSlug={serviceSlug}
              doctors={doctors}
            />
          )}
        </div>
      </section>
    </>
  );
}

async function renderSelectedDoctorMode({
  code,
  service,
  serviceSlug,
  itemKind,
  doctors,
  selectedDoctorSlug,
  country,
  lang,
}: {
  code: string;
  service: CountryServiceCard;
  serviceSlug: string;
  itemKind: "GENERAL_CONSULTATION" | "SPECIALIST_CONSULTATION";
  doctors: Awaited<ReturnType<typeof getCountryDoctors>>;
  selectedDoctorSlug: string;
  country: string;
  lang: string;
}) {
  const doctor = doctors.find((d) => d.slug === selectedDoctorSlug);
  if (!doctor) {
    return (
      <div
        className="rounded-[var(--radius-card)] p-6"
        style={{
          background: "rgba(255,196,0,0.08)",
          border: "1px solid rgba(255,196,0,0.25)",
        }}
      >
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          That clinician isn&apos;t offering {service.name} right now.
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          <Link
            href={`/${country}/${lang}/consult/${serviceSlug}`}
            className="font-semibold text-[var(--color-brand-primary)] underline"
          >
            See other clinicians who do
          </Link>
          .
        </p>
      </div>
    );
  }

  const slots = await getServiceDoctorAvailability(
    code,
    service.slug,
    doctor.slug,
    14,
  );

  return (
    <>
      <article
        className="rounded-[var(--radius-card)] p-6 sm:p-8"
        style={{
          background: "var(--color-background-page)",
          border: "2px solid var(--color-brand-primary)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-5">
          <div>
            <p className="text-lg font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {doctor.fullName}
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{doctor.title}</p>
            {doctor.specialties.length > 0 ? (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {doctor.specialties.join(" · ")}
              </p>
            ) : null}
          </div>
          {doctor.languages.length > 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              {doctor.languages.join(", ")}
            </p>
          ) : null}
        </header>

        {slots.length === 0 ? (
          <div
            className="mt-6 rounded-[var(--radius-card)] p-4 text-sm"
            style={{
              background: "rgba(255,196,0,0.08)",
              border: "1px solid rgba(255,196,0,0.25)",
            }}
          >
            <p className="font-semibold text-[var(--color-text-primary)]">
              No open slots in the next 14 days.
            </p>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Try another clinician —{" "}
              <Link
                href={`/${country}/${lang}/consult/${serviceSlug}`}
                className="font-semibold text-[var(--color-brand-primary)] underline"
              >
                see who else offers {service.name}
              </Link>
              .
            </p>
          </div>
        ) : (
          <ConsultationBookingForm
            doctorId={doctor.id}
            doctorName={doctor.fullName}
            serviceId={service.id}
            kind={itemKind}
            slots={slots}
          />
        )}
      </article>

      <p className="mt-4 text-xs text-[var(--color-text-muted)]">
        Wrong clinician?{" "}
        <Link
          href={`/${country}/${lang}/consult/${serviceSlug}`}
          className="font-semibold text-[var(--color-brand-primary)] underline"
        >
          Pick a different doctor
        </Link>
        .
      </p>
    </>
  );
}

function DoctorListMode({
  country,
  lang,
  serviceSlug,
  doctors,
}: {
  country: string;
  lang: string;
  serviceSlug: string;
  doctors: Awaited<ReturnType<typeof getCountryDoctors>>;
}) {
  if (doctors.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-card)] p-6 text-center"
        style={{
          background: "rgba(255,196,0,0.08)",
          border: "1px solid rgba(255,196,0,0.25)",
        }}
      >
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          No clinicians assigned to this service yet.
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          <Link
            href={`/${country}/${lang}/doctors`}
            className="font-semibold text-[var(--color-brand-primary)] underline"
          >
            Browse our doctors
          </Link>{" "}
          and pick someone whose services are open.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        Pick a clinician to see their open times and finish booking.
      </p>
      <ul className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d) => (
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
              bookingHref={`/${country}/${lang}/consult/${serviceSlug}?doctor=${encodeURIComponent(d.slug)}`}
              ctaLabel="Pick a time"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
