"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHero } from "@/components/sections/PageHero";
import { DoctorCard } from "@/components/cards/DoctorCard";

const PAGE_SIZE = 6;

type Doctor = {
  name: string;
  title: string;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  country?: string;
  languages?: string[];
  whatsappNumber?: string;
  bio: string;
  imageSrc?: string | null;
  href?: string;
  bookingHref?: string;
  ctaLabel?: string;
};

type DoctorTeamTemplateProps = {
  countryName: string;
  doctors: Doctor[];
  bookingHref: string;
  bookingLabel: string;
  showBottomCta?: boolean;
};

export function DoctorTeamTemplate({
  countryName,
  doctors,
  bookingHref,
  bookingLabel,
  showBottomCta = false,
}: DoctorTeamTemplateProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(doctors.length / PAGE_SIZE);
  const paged = doctors.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <main className="bg-[var(--color-background-page)]">
      <PageHero
        countryLabel={`${countryName} · The team`}
        titleLead="Doctors who"
        titleAccent="actually"
        titleTrail="pick up."
        lede={
          <>
            Every clinician below is licensed in {countryName}, vetted for
            online care, and reviewed by patients after each consultation.
            <br />
            <span className="text-white/55">
              {doctors.length} licensed{" "}
              {doctors.length === 1 ? "clinician" : "clinicians"} available
            </span>
          </>
        }
        ctaLabel={bookingLabel}
        ctaHref={bookingHref}
      />

      {/* GRID — light soft section, DoctorCard components */}
      <section className="gh-section bg-[var(--color-background-soft)]">
        <div className="gh-container">
          {doctors.length === 0 ? (
            <div className="mx-auto max-w-[480px] text-center">
              <h2
                className="gh-display text-[2rem]"
                style={{ fontWeight: 800 }}
              >
                Onboarding clinicians.
              </h2>
              <p className="mt-4 text-[15px] text-[var(--color-text-muted)]">
                Our {countryName} medical team is being verified. Check back
                soon — or book with our cross-border specialists.
              </p>
              <Link href={bookingHref} className="gh-btn gh-btn-primary mt-8">
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
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    aria-label="Previous page"
                    className="inline-flex size-10 items-center justify-center rounded-full border transition-opacity"
                    style={
                      page === 0
                        ? { opacity: 0.3, borderColor: "currentColor" }
                        : {
                            backgroundColor: "var(--color-brand-accent)",
                            borderColor: "var(--color-brand-accent)",
                            color: "var(--color-brand-primary)",
                          }
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page === totalPages - 1}
                    aria-label="Next page"
                    className="inline-flex size-10 items-center justify-center rounded-full border transition-opacity"
                    style={
                      page === totalPages - 1
                        ? { opacity: 0.3, borderColor: "currentColor" }
                        : {
                            backgroundColor: "var(--color-brand-accent)",
                            borderColor: "var(--color-brand-accent)",
                            color: "var(--color-brand-primary)",
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
                      medicalRegistrationUrl={d.medicalRegistrationUrl}
                      languages={d.languages}
                      whatsappNumber={d.whatsappNumber}
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
        <section className="gh-section bg-[var(--color-background-soft)]">
          <div className="gh-container">
            <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
              <h2
                className="gh-display text-[clamp(2rem,4.5vw,4rem)]"
                style={{ fontWeight: 800 }}
              >
                Pick a clinician. Book{" "}
                <span className="gh-display-em">the same day.</span>
              </h2>
              <Link href={bookingHref} className="gh-btn gh-btn-primary lg:justify-self-end">
                {bookingLabel}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
