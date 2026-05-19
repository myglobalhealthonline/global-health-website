import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
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
import { ConsultationSlotPicker } from "./_components/consultation-slot-picker";

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
 * Consultation slot picker page.
 *
 * URL: /[country]/[lang]/consult/[serviceSlug]
 *
 * Patient lands here from a service card on the general / specialist
 * consultation pages. We render every doctor in the country with their
 * open slots for the next 14 days; click a slot to add to cart.
 */
export default async function ConsultSlotPickerPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { country, lang, serviceSlug } = await params;
  const sp = (await searchParams) ?? {};
  const preselectedDoctorSlug = typeof sp.doctor === "string" ? sp.doctor : null;
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

  // Doctors bookable for the chosen service. The service record carries
  // its `assignedDoctorIds` from `ServiceDoctor`; we intersect with the
  // country roster so a stale assignment (e.g. doctor since deactivated)
  // doesn't surface a ghost card.
  const allDoctors = await getCountryDoctors(code);
  const assignedSet = new Set(service.assignedDoctorIds);
  const doctors = assignedSet.size > 0
    ? allDoctors.filter((d) => assignedSet.has(d.id))
    : [];

  // Fetch availability per assigned doctor in parallel. Uses the new
  // service-scoped endpoint so slot duration tracks the chosen
  // service (Phase 3) and mixed-duration assignments don't collide.
  const doctorsWithSlots = await Promise.all(
    doctors.map(async (d) => ({
      ...d,
      slots: await getServiceDoctorAvailability(code, service.slug, d.slug, 14),
    })),
  );
  const availableDoctors = doctorsWithSlots.filter((d) => d.slots.length > 0);
  // Preselect: when a doctor slug arrives in the query (e.g. from the
  // doctor profile page), float that clinician to the top and tag them
  // so the slot picker renders an anchor + emerald outline. Visitor
  // can still pick any other doctor; we just nudge the default.
  if (preselectedDoctorSlug) {
    const idx = availableDoctors.findIndex((d) => d.slug === preselectedDoctorSlug);
    if (idx > 0) {
      const [picked] = availableDoctors.splice(idx, 1);
      availableDoctors.unshift(picked);
    }
  }

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
          Pick a doctor & time
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

      {availableDoctors.length === 0 ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-center">
          <p className="text-sm font-semibold text-amber-900">
            No open slots in the next 14 days.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            Our doctors are fully booked. Try again tomorrow, or{" "}
            <Link href="/contact" className="font-semibold underline">
              contact us
            </Link>{" "}
            to be added to a waiting list.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {availableDoctors.map((d) => {
            const isPreselected = preselectedDoctorSlug === d.slug;
            return (
            <article
              key={d.id}
              id={isPreselected ? `doctor-${d.slug}` : undefined}
              className={
                isPreselected
                  ? "scroll-mt-24 rounded-2xl border-2 border-emerald-400 bg-white p-6 shadow-md ring-2 ring-emerald-100"
                  : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              }
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{d.fullName}</p>
                  <p className="text-sm text-slate-600">{d.title}</p>
                  {d.specialties.length > 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {d.specialties.join(" · ")}
                    </p>
                  ) : null}
                </div>
                {d.languages.length > 0 ? (
                  <p className="text-xs text-slate-500">
                    {d.languages.join(", ")}
                  </p>
                ) : null}
              </header>

              <ConsultationSlotPicker
                doctorId={d.id}
                doctorName={d.fullName}
                serviceId={service.id}
                kind={itemKind}
                slots={d.slots}
              />
            </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
