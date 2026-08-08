"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CarouselNav } from "@/components/ui/CarouselNav";
import { useSwipePage } from "@/hooks/use-swipe-page";
import { DoctorsHero } from "@/components/sections/DoctorsHero";
import { DoctorCard } from "@/components/cards/DoctorCard";
import type { DoctorCardI18n } from "@/components/cards/doctor-card-i18n";
import { SectionSeam } from "@/components/ui/SectionSeam";

const PAGE_SIZE = 6;

type Doctor = {
  name: string;
  title: string;
  imcRegistration?: string;
  registrationDivision?: string;
  registrationVerified?: boolean;
  credentials?: Array<{ label: string; bodyName: string; bodyUrl?: string }>;
  medicalRegistrationUrl?: string;
  verificationUrl?: string;
  country?: string;
  languages?: string[];
  whatsappNumber?: string;
  /** Optional social URLs — surfaced as icon row on each card. Per-doctor
   *  so each clinician opts in independently. Absolute https:// URLs. */
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  linkedinUrl?: string | null;
  bio: string;
  imageSrc?: string | null;
  imageFocalX?: number;
  imageFocalY?: number;
  imageZoom?: number;
  href?: string;
  bookingHref?: string;
  ctaLabel?: string;
  bookLabel?: string;
};

export type DoctorTeamI18n = {
  theTeamBadge: string;
  heroTitleLead: string;
  heroTitleAccent: string;
  heroTitleTrail: string;
  heroLedeTemplate: string;
  heroAvailableSingular: string;
  heroAvailablePlural: string;
  onboardingTitle: string;
  onboardingBodyTemplate: string;
  bottomCtaTitle: string;
  bottomCtaAccent: string;
  viewDoctors?: string;
  trustCard1Title?: string;
  trustCard1Subtitle?: string;
  trustCard2Title?: string;
  trustCard2Subtitle?: string;
  trustCard3Title?: string;
  trustCard3Subtitle?: string;
  floatCard1Title?: string;
  floatCard1Subtitle?: string;
  floatCard2Title?: string;
  floatCard2Subtitle?: string;
  floatCard3Title?: string;
  floatCard3Subtitle?: string;
  /** "{name}" placeholder for each card's whole-card overlay-link aria-label. */
  viewProfileAria?: string;
  /** Card CTA label — was a hardcoded English "View profile" fallback. */
  viewProfile?: string;
  /** Heading above the always-crawlable full-roster link index below the
   *  paginated carousel. "{country}" placeholder. */
  allDoctorsHeading?: string;
};

type DoctorTeamTemplateProps = {
  countryName: string;
  doctors: Doctor[];
  bookingHref: string;
  bookingLabel: string;
  showBottomCta?: boolean;
  filters?: ReactNode;
  spotlight?: ReactNode;
  i18n?: DoctorTeamI18n;
  /** Doctor-card chrome strings, resolved by the (server) caller. */
  cardI18n: DoctorCardI18n;
  /** Total roster size for the hero's "available" count — defaults to
   *  `doctors.length`. Pass this when a featured doctor is rendered
   *  separately via `spotlight` and pulled out of `doctors`, so the count
   *  reflects the full roster instead of undercounting by one. */
  totalDoctorCount?: number;
};

export function DoctorTeamTemplate({
  countryName,
  doctors,
  bookingHref,
  bookingLabel,
  showBottomCta = false,
  filters,
  spotlight,
  i18n,
  cardI18n,
  totalDoctorCount,
}: DoctorTeamTemplateProps) {
  const [page, setPage] = useState(0);
  const availableCount = totalDoctorCount ?? doctors.length;
  const totalPages = Math.ceil(doctors.length / PAGE_SIZE);
  // Clamp so a filter that shrinks the list (URL nav keeps the page
  // state) never slices past the end into an empty grid.
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paged = doctors.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));
  const swipe = useSwipePage(goPrev, goNext);

  return (
    <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
      <DoctorsHero
        countryName={countryName}
        eyebrow={`${countryName} · ${i18n?.theTeamBadge ?? "The team"}`}
        titleLead={i18n?.heroTitleLead ?? "Doctors who"}
        titleAccent={i18n?.heroTitleAccent ?? "actually"}
        titleTrail={i18n?.heroTitleTrail ?? "pick up."}
        lede={(i18n?.heroLedeTemplate ?? "Every clinician below is licensed in {country}, vetted for online care, and reviewed by patients after each consultation.").replace("{country}", countryName)}
        availableCount={availableCount}
        availableLabel={
          availableCount === 1
            ? (i18n?.heroAvailableSingular ?? "licensed clinician available")
            : (i18n?.heroAvailablePlural ?? "licensed clinicians available")
        }
        primaryCta={{ label: bookingLabel, href: bookingHref }}
        secondaryCta={{ label: i18n?.viewDoctors ?? "View Doctors", href: "#doctor-grid" }}
        trustCard1Title={i18n?.trustCard1Title}
        trustCard1Subtitle={i18n?.trustCard1Subtitle}
        trustCard2Title={i18n?.trustCard2Title}
        trustCard2Subtitle={i18n?.trustCard2Subtitle}
        trustCard3Title={i18n?.trustCard3Title}
        trustCard3Subtitle={i18n?.trustCard3Subtitle}
        floatCard1Title={i18n?.floatCard1Title}
        floatCard1Subtitle={i18n?.floatCard1Subtitle}
        floatCard2Title={i18n?.floatCard2Title}
        floatCard2Subtitle={i18n?.floatCard2Subtitle}
        floatCard3Title={i18n?.floatCard3Title}
        floatCard3Subtitle={i18n?.floatCard3Subtitle}
        heroImage={{
          src: "/images/stock/doctors.jpg",
          alt: `Doctors available for online consultations in ${countryName}`,
          priority: true,
        }}
      />

      {/* GRID — light ivory band; dark liquid-glass DoctorCards float on it. */}
      <section id="doctor-grid" className="gh-section relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel" style={{ scrollMarginTop: "96px" }}>
        <SectionSeam theme="light" />
        <div className="gh-container">
          {/* Featured-doctor spotlight (admin-chosen) above the filters. */}
          {spotlight}
          {/* Filter bar (language + specialty) — rendered above the grid
              so it reads as part of the directory, not a stray strip
              above the hero. Stays visible on empty results so the user
              can clear an over-narrow filter. */}
          {filters}
          {doctors.length === 0 ? (
            <div className="mx-auto max-w-[480px] text-center">
              <h2
                className="gh-display text-[2rem]"
                style={{ fontWeight: 800, color: "var(--color-text-primary)" }}
              >
                {i18n?.onboardingTitle ?? "Onboarding clinicians."}
              </h2>
              <p className="mt-4 text-[15px]" style={{ color: "var(--color-text-muted)" }}>
                {(i18n?.onboardingBodyTemplate ?? "Our {country} medical team is being verified. Check back soon — or book with our cross-border specialists.").replace("{country}", countryName)}
              </p>
              <Link
                href={bookingHref}
                className="gh-btn mt-8"
                style={{ background: "var(--color-brand-accent)", color: "#0a1f14", borderRadius: 999 }}
              >
                {bookingLabel}
              </Link>
            </div>
          ) : (
            <>
              {totalPages > 1 && (
                <div className="mb-6 flex justify-end">
                  <CarouselNav
                    onPrev={goPrev}
                    onNext={goNext}
                    canPrev={safePage > 0}
                    canNext={safePage < totalPages - 1}
                    progress={(safePage + 1) / totalPages}
                    dark={false}
                    prevLabel="Previous page"
                    nextLabel="Next page"
                    page={safePage}
                    totalPages={totalPages}
                  />
                </div>
              )}
              <ul
                className="gh-card-grid"
                style={{ columnGap: "2rem", rowGap: "2rem" }}
                {...(totalPages > 1 ? swipe : {})}
              >
                {paged.map((d) => (
                  <li key={(d.href ?? "") + d.name}>
                    <DoctorCard
                      titleAs="h2"
                      name={d.name}
                      title={d.title}
                      imcRegistration={d.imcRegistration}
                      registrationDivision={d.registrationDivision}
                      registrationVerified={d.registrationVerified}
                      credentials={d.credentials}
                      medicalRegistrationUrl={d.medicalRegistrationUrl}
                      verificationUrl={d.verificationUrl}
                      languages={d.languages}
                      whatsappNumber={d.whatsappNumber}
                      instagramUrl={d.instagramUrl}
                      facebookUrl={d.facebookUrl}
                      linkedinUrl={d.linkedinUrl}
                      bio={d.bio}
                      imageSrc={d.imageSrc}
                      imageFocalX={d.imageFocalX}
                      imageFocalY={d.imageFocalY}
                      imageZoom={d.imageZoom}
                      href={d.href}
                      bookingHref={d.bookingHref ?? bookingHref}
                      ctaLabel={d.ctaLabel ?? i18n?.viewProfile ?? ""}
                      cardI18n={cardI18n}
                      bookLabel={d.bookLabel}
                      dark
                      viewProfileAriaLabel={i18n?.viewProfileAria?.replace("{name}", d.name)}
                    />
                  </li>
                ))}
              </ul>

              {/* Bottom pager — mirrors the header one so paging past row 1
                  doesn't force a scroll back to the top of the list. */}
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <CarouselNav
                    onPrev={goPrev}
                    onNext={goNext}
                    canPrev={safePage > 0}
                    canNext={safePage < totalPages - 1}
                    variant="segments"
                    dark={false}
                    prevLabel="Previous page"
                    nextLabel="Next page"
                    page={safePage}
                    totalPages={totalPages}
                  />
                </div>
              )}

              {/* The carousel above is a client-side `useState` pager — only
                  the current page's cards ever mount, so a crawler landing
                  cold on this route (no JS execution) could only ever reach
                  the first PAGE_SIZE doctors. This index is plain, always-
                  rendered content covering the full roster: a real inlink for
                  every doctor beyond page one, independent of carousel state.
                  Kept visually modest on purpose — it is a discovery path,
                  not a second marketing surface. */}
              {totalPages > 1 ? (
                <nav
                  aria-label={i18n?.allDoctorsHeading?.replace("{country}", countryName) ?? countryName}
                  className="mt-10 border-t border-[rgba(255,255,255,0.12)] pt-8"
                >
                  <p className="mb-4 text-xs font-bold tracking-[0.14em] text-white/50 uppercase">
                    {(i18n?.allDoctorsHeading ?? "All doctors in {country}").replace(
                      "{country}",
                      countryName,
                    )}
                  </p>
                  <ul className="flex flex-wrap gap-x-5 gap-y-2">
                    {doctors
                      .filter((d) => d.href)
                      .map((d) => (
                        <li key={d.href}>
                          <Link
                            href={d.href!}
                            className="text-sm text-white/70 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white/50"
                          >
                            {d.name}
                            {d.title ? ` — ${d.title}` : ""}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </section>

      {showBottomCta ? (
        <section className="gh-section relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest">
          <SectionSeam theme="dark" />
          <div className="gh-container">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <h2
                className="gh-display text-[clamp(2rem,4.5vw,4rem)]"
                style={{ fontWeight: 800, color: "rgba(255,255,255,0.92)" }}
              >
                {i18n?.bottomCtaTitle ?? "Pick a clinician. Book"}{" "}
                <em style={{ fontStyle: "italic", color: "var(--color-brand-accent)" }}>{i18n?.bottomCtaAccent ?? "the same day."}</em>
              </h2>
              <Link
                href={bookingHref}
                className="gh-btn lg:justify-self-end"
                style={{ background: "var(--color-brand-accent)", color: "#0a1f14", borderRadius: 999 }}
              >
                {bookingLabel}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
