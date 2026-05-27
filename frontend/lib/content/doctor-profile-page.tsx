import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { ServiceCard } from "@/components/cards/ServiceCard";
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
  // Fallback booking URL — used when the doctor has no assigned
  // services. Carries `?doctor=<slug>` so the legacy form preselects.
  const fallbackBookHref = `/${slug}/${lang}/book-online?doctor=${encodeURIComponent(doctorSlug)}`;
  // When the doctor has assigned services we render them as the main
  // booking surface below and the hero / bottom CTAs scroll to that
  // section instead of dumping the patient into the fallback form.
  // Decided after fetching `assignedServices` (just below).
  // Services this doctor is assigned to in the route country.
  // ServiceDoctor (Phase 1 backend) populates assignedServiceIds on the
  // doctor card; we filter the country's GENERAL + SPECIALIST service
  // pool to that set so the patient sees one card per bookable service.
  const code = countryCodeFromSlug(slug);
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
        if (assigned.has(s.id)) assignedServices.push({ ...s, imageSrc: s.imageSrc ?? null });
      }
    }
  }

  const hasServices = assignedServices.length > 0;
  // Anchor lives on the "Services offered" section below. When the
  // doctor has assignments we point both hero / bottom CTAs at that
  // anchor so the visitor scrolls to the cart-first picker instead of
  // landing in the legacy book-online form.
  const servicesAnchor = "#services";
  // First-name-only label so the CTA reads as "Pick a time with Anna"
  // not "Pick a time with Dr. Anna Garcia Lopez". Falls back to the
  // generic label when we can't extract a first name.
  const firstName = data.profile.name
    .replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "")
    .split(" ")[0]
    ?.trim();
  const primaryCtaHref = hasServices ? servicesAnchor : fallbackBookHref;
  const primaryCtaLabel = hasServices
    ? firstName
      ? `Pick a time with ${firstName}`
      : "Pick a time"
    : data.hero.primaryCta.label;

  const templateData = {
    ...data,
    hero: {
      ...data.hero,
      primaryCta: {
        label: primaryCtaLabel,
        href: primaryCtaHref,
      },
      secondaryCta: {
        label: `Back to ${data.profile.country} clinicians`,
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
          consult page with `?doctor=<slug>` so the picker anchors on
          this clinician. When no assignments, render a clear fallback
          instead of silently leaning on the legacy CTA. */}
      {hasServices ? (
        <section
          id="services"
          className="scroll-mt-24"
          style={{
            background: "var(--color-background-dark)",
            padding: "clamp(64px,8vw,120px) 0",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <div
              className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--color-brand-accent)" }}
            >
              <CalendarClock className="size-4" aria-hidden />
              Book with {data.profile.name}
            </div>
            <h2
              className="font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              Services offered
            </h2>
            <p
              className="mt-3 max-w-xl text-[length:var(--text-body-lg)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.42)" }}
            >
              Pick a service to see open slots with {firstName ?? data.profile.name}.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {assignedServices.map((service) => {
                const consultHref = `/${slug}/${lang}/consult/${service.slug}?doctor=${encodeURIComponent(doctorSlug)}#doctor-${encodeURIComponent(doctorSlug)}`;
                const startingPrice = service.basePriceCents != null
                  ? formatPriceRounded(service.basePriceCents, service.currencyCode)
                  : undefined;
                return (
                  <ServiceCard
                    key={service.id}
                    href={consultHref}
                    title={service.name}
                    description={service.summary ?? ""}
                    duration={service.durationMinutes != null ? `${service.durationMinutes} min` : undefined}
                    startingPrice={startingPrice}
                    ctaLabel="Pick a slot"
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
          className="scroll-mt-24"
          style={{
            background: "var(--color-background-dark)",
            padding: "clamp(48px,6vw,80px) 0",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <div
              className="mx-auto max-w-lg rounded-[var(--radius-card)] p-8 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.88)" }}
              >
                No bookable services assigned yet.
              </p>
              <p
                className="mt-2 text-sm"
                style={{ color: "rgba(255,255,255,0.42)" }}
              >
                {data.profile.name} isn&apos;t currently set up for online bookings in{" "}
                {data.profile.country}.
              </p>
              <Link
                href={`/${slug}/${lang}/gp-appointment`}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold transition-colors duration-200 hover:bg-white"
                style={{
                  background: "var(--color-brand-accent)",
                  color: "#0a1f14",
                }}
              >
                Browse other clinicians
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
