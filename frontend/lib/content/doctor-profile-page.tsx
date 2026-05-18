import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { DoctorProfileTemplate } from "@/components/templates/DoctorProfileTemplate";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolveDoctorProfilePageData } from "@/lib/content/doctor-profile-data";
import { validatePublicDoctorRecord } from "@/lib/content/publication-validation";
import { getSiteUrl } from "@/lib/seo/site-url";
import {
  breadcrumbJsonLd,
  physicianJsonLd,
} from "@/lib/seo/structured-data";
import { SITE_NAME } from "@/lib/constants";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import {
  getCountryDoctors,
  getCountryServices,
} from "@/lib/content/get-country-collections";
import { formatPriceRounded } from "@/lib/format-currency";

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
  const { doctorSlug } = await params;
  const data = await resolveDoctorProfilePageData(doctorSlug);
  const validation = validatePublicDoctorRecord({
    fullName: data.profile.name,
    title: data.profile.title,
    bio: data.profile.bio,
    languages: data.profile.languages,
    specialties: data.profile.specialties,
    imcRegistration: data.profile.imcRegistration,
    medicalRegistrationUrl: data.profile.medicalRegistrationUrl,
    qualifications: data.profile.qualifications,
  });
  // Canonical lives at the new `/{country}/team/[doctorSlug]` URL.
  const countryNameToSlug: Record<string, string> = {
    Ireland: "ireland",
    Portugal: "portugal",
    Spain: "spain",
    Czechia: "czechia",
    Romania: "romania",
  };
  const slug = countryNameToSlug[data.profile.country] ?? "ireland";
  const canonical = `/${slug}/team/${doctorSlug}`;
  const url = `${getSiteUrl()}${canonical}`;
  const title =
    data.profile.seoTitle ?? `${data.profile.name} · ${data.profile.title} · ${data.profile.country}`;
  const description =
    data.profile.seoDescription ??
    `Book an online consultation with ${data.profile.name}, ${data.profile.title} in ${data.profile.country}. Languages: ${data.profile.languages.join(", ") || "English"}.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      siteName: SITE_NAME,
      title,
      description,
      url,
    },
    twitter: { card: "summary_large_image", title, description },
    robots:
      validation.shouldNoindex || data.profile.editorialChecklist?.readyToIndex !== true
        ? { index: false, follow: true }
        : undefined,
  };
}

export async function renderDoctorProfilePage(params: Promise<DoctorProfileRouteParams>) {
  const { doctorSlug, countrySlug: routeCountrySlug, lang: routeLang } = await params;
  const data = await resolveDoctorProfilePageData(doctorSlug);
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
  const teamHref = `/${slug}/${lang}/doctors`;
  const profileHref = `${teamHref}/${doctorSlug}`;
  // Booking URL — preserve doctor intent via `?doctor=<slug>` so the
  // form can preselect (when slot booking ships) and the appointment
  // gets linked to this clinician.
  const bookHref = `/${slug}/${lang}/book-online?doctor=${encodeURIComponent(doctorSlug)}`;
  // Override both CTAs so the "Book" + "Back" links use the new URLs
  // instead of the legacy `/book-online` and `/<country>-team` shapes
  // baked into the doctor-profile-data fixture.
  const templateData = {
    ...data,
    hero: {
      ...data.hero,
      primaryCta: {
        label: data.hero.primaryCta.label,
        href: bookHref,
      },
      secondaryCta: {
        label: `Back to ${data.profile.country} clinicians`,
        href: teamHref,
      },
    },
    bottomCta: {
      ...data.bottomCta,
      ctaHref: bookHref,
    },
  };
  // Services this doctor is assigned to in the route country.
  // ServiceDoctor (Phase 1 backend) populates assignedServiceIds on the
  // doctor card; we filter the country's GENERAL + SPECIALIST service
  // pool to that set so the patient sees one card per bookable service.
  const code = countryCodeFromSlug(slug);
  let assignedServices: Array<{
    id: string;
    slug: string;
    name: string;
    summary: string;
    kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY";
    durationMinutes: number | null;
    basePriceCents: number | null;
    currencyCode: string | null;
  }> = [];
  if (code) {
    const [doctors, generals, specialists] = await Promise.all([
      getCountryDoctors(code),
      getCountryServices(code, "GENERAL"),
      getCountryServices(code, "SPECIALIST"),
    ]);
    const doc = doctors.find((d) => d.slug === doctorSlug);
    if (doc) {
      const assigned = new Set(doc.assignedServiceIds);
      for (const s of [...generals, ...specialists]) {
        if (assigned.has(s.id)) assignedServices.push(s);
      }
    }
  }

  return (
    <>
      <JsonLd
        data={[
          physicianJsonLd({
            name: data.profile.name,
            title: data.profile.title,
            countryName: data.profile.country,
            url: profileHref,
            imageSrc: data.profileImageSrc,
            languages: data.profile.languages,
          }),
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: data.profile.country, url: teamHref },
            { name: data.profile.name, url: profileHref },
          ]),
        ]}
      />
      <DoctorProfileTemplate {...templateData} />

      {/* Doctor-first booking: lists the services the admin has assigned
          to this doctor. Each card routes back through the service-first
          consult page where the (now service-scoped) doctor list will
          already be filtered to include this doctor + their open slots.
          Hidden when no assignments — fall back to the legacy Book CTA
          rendered by the template above. */}
      {assignedServices.length > 0 ? (
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-700">
            <CalendarClock className="size-4" aria-hidden />
            Book with {data.profile.name}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Services offered
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Pick a service to see this doctor&apos;s open slots.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {assignedServices.map((service) => {
              const consultHref = `/${slug}/${lang}/consult/${service.slug}`;
              const price = service.basePriceCents != null
                ? formatPriceRounded(service.basePriceCents, service.currencyCode)
                : null;
              return (
                <Link
                  key={service.id}
                  href={consultHref}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    {service.kind === "SPECIALIST" ? "Specialist" : "General"}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {service.name}
                  </h3>
                  {service.summary ? (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                      {service.summary}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                    {price ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                        {price}
                      </span>
                    ) : null}
                    {service.durationMinutes != null ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        {service.durationMinutes} min
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold text-emerald-700">
                    Pick a slot
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
