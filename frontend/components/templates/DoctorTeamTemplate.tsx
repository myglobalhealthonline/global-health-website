"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHero } from "@/components/sections/PageHero";
import { DoctorCard } from "@/components/cards/DoctorCard";

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
  href?: string;
  bookingHref?: string;
  ctaLabel?: string;
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
}: DoctorTeamTemplateProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(doctors.length / PAGE_SIZE);
  // Clamp so a filter that shrinks the list (URL nav keeps the page
  // state) never slices past the end into an empty grid.
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paged = doctors.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <section style={{ background: "var(--color-background-soft)" }}>
      <PageHero
        watermark="Doctors"
        countryLabel={`${countryName} · ${i18n?.theTeamBadge ?? "The team"}`}
        titleLead={i18n?.heroTitleLead ?? "Doctors who"}
        titleAccent={i18n?.heroTitleAccent ?? "actually"}
        titleTrail={i18n?.heroTitleTrail ?? "pick up."}
        lede={
          <>
            {(i18n?.heroLedeTemplate ?? "Every clinician below is licensed in {country}, vetted for online care, and reviewed by patients after each consultation.").replace("{country}", countryName)}
            <br />
            <span className="text-white/55">
              {doctors.length}{" "}
              {doctors.length === 1
                ? (i18n?.heroAvailableSingular ?? "licensed clinician available")
                : (i18n?.heroAvailablePlural ?? "licensed clinicians available")}
            </span>
          </>
        }
        ctaLabel={bookingLabel}
        ctaHref={bookingHref}
        heroImage={{
          src: "/images/stock/doctors.jpg",
          alt: `Doctors available for online consultations in ${countryName}`,
          priority: true,
        }}
      />

      {/* GRID — light soft section, DoctorCard components */}
      <section className="gh-section" style={{ background: "var(--color-background-soft)", borderTop: "1px solid rgba(29,75,54,0.10)" }}>
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
                <div className="mb-6 flex items-center justify-end gap-2">
                  <span
                    className="text-[11px] font-bold tabular-nums"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {safePage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    aria-label="Previous page"
                    className="inline-flex size-10 items-center justify-center rounded-full border transition-opacity"
                    style={
                      safePage === 0
                        ? { opacity: 0.3, borderColor: "currentColor" }
                        : {
                            backgroundColor: "var(--color-brand-primary)",
                            borderColor: "var(--color-brand-primary)",
                            color: "white",
                          }
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={safePage === totalPages - 1}
                    aria-label="Next page"
                    className="inline-flex size-10 items-center justify-center rounded-full border transition-opacity"
                    style={
                      safePage === totalPages - 1
                        ? { opacity: 0.3, borderColor: "currentColor" }
                        : {
                            backgroundColor: "var(--color-brand-primary)",
                            borderColor: "var(--color-brand-primary)",
                            color: "white",
                          }
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              <ul className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {paged.map((d) => (
                  <li key={(d.href ?? "") + d.name}>
                    <DoctorCard
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
                      href={d.href}
                      bookingHref={d.bookingHref ?? bookingHref}
                      ctaLabel={d.ctaLabel ?? "View profile"}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {showBottomCta ? (
        <section className="gh-section relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark" style={{ background: "var(--color-background-dark)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="gh-container">
            <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
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
