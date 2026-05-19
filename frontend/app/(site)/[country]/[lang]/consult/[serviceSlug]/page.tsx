import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock } from "lucide-react";
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
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={consultRoot}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to consultations
      </Link>

      <header className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
          <CalendarClock className="size-3.5" aria-hidden />
          {selectedDoctorSlug ? "Confirm your booking" : "Pick a doctor"}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          {service.name}
        </h1>
        {service.summary ? (
          <p className="mt-2 text-sm text-slate-600">{service.summary}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
            {service.basePriceCents != null
              ? formatPriceRounded(service.basePriceCents, service.currencyCode)
              : "Price varies"}
          </span>
          {service.durationMinutes != null ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              {service.durationMinutes} min
            </span>
          ) : null}
          <span className="text-slate-500">in {config.name}</span>
        </div>
      </header>

      {selectedDoctorSlug ? (
        // Single-doctor mode — slot picker + patient form.
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
        // Doctor pick mode — list assigned doctors.
        <DoctorListMode
          country={country}
          lang={lang}
          serviceSlug={serviceSlug}
          doctors={doctors}
        />
      )}
    </main>
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
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-900">
          That clinician isn&apos;t offering {service.name} right now.
        </p>
        <p className="mt-2 text-sm text-amber-800">
          <Link
            href={`/${country}/${lang}/consult/${serviceSlug}`}
            className="font-semibold underline"
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
      <article className="mt-6 rounded-2xl border-2 border-emerald-400 bg-white p-6 shadow-md ring-2 ring-emerald-100">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-900">{doctor.fullName}</p>
            <p className="text-sm text-slate-600">{doctor.title}</p>
            {doctor.specialties.length > 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                {doctor.specialties.join(" · ")}
              </p>
            ) : null}
          </div>
          {doctor.languages.length > 0 ? (
            <p className="text-xs text-slate-500">
              {doctor.languages.join(", ")}
            </p>
          ) : null}
        </header>

        {slots.length === 0 ? (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-semibold text-amber-900">
              No open slots in the next 14 days.
            </p>
            <p className="mt-2 text-amber-800">
              Try another clinician —{" "}
              <Link
                href={`/${country}/${lang}/consult/${serviceSlug}`}
                className="font-semibold underline"
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

      <p className="mt-4 text-xs text-slate-500">
        Wrong clinician?{" "}
        <Link
          href={`/${country}/${lang}/consult/${serviceSlug}`}
          className="font-semibold text-emerald-700 underline"
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
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-center">
        <p className="text-sm font-semibold text-amber-900">
          No clinicians assigned to this service yet.
        </p>
        <p className="mt-2 text-sm text-amber-800">
          <Link href={`/${country}/${lang}/doctors`} className="font-semibold underline">
            Browse our doctors
          </Link>{" "}
          and pick someone whose services are open.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4">
      <p className="text-sm text-slate-600">
        Pick a clinician to see their open times and finish booking.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {doctors.map((d) => (
          <Link
            key={d.id}
            href={`/${country}/${lang}/consult/${serviceSlug}?doctor=${encodeURIComponent(d.slug)}`}
            className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
          >
            <p className="text-lg font-bold text-slate-900">{d.fullName}</p>
            <p className="text-sm text-slate-600">{d.title}</p>
            {d.specialties.length > 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                {d.specialties.join(" · ")}
              </p>
            ) : null}
            {d.languages.length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Languages: {d.languages.join(", ")}
              </p>
            ) : null}
            <div className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold text-emerald-700">
              Pick a time
              <ArrowRight
                className="size-4 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
