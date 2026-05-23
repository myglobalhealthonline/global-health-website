"use client";

import { useState } from "react";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { Flag } from "@/components/ui/Flag";

export type DoctorWallItem = {
  id: string;
  initials: string;
  name: string;
  role: string;
  country: string;
  /** Languages list joined with " · ". Single source of truth on the
   *  producer side; DoctorWall splits on the same separator before
   *  passing to DoctorCard. */
  langs: string;
  /** Profile page URL — the whole card routes here. */
  href: string;
  /** Optional booking flow URL. When provided, a "Book Appointment"
   *  CTA is rendered alongside "View profile". */
  bookingHref?: string;
  imageSrc?: string | null;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  whatsappNumber?: string;
};

const FILTER_LABELS: Record<string, string> = {
  ie: "Ireland",
  pt: "Portugal",
  sp: "Spain",
  cz: "Czechia",
  rm: "Romania",
};

export function DoctorWall({
  doctors,
  bookHref,
}: {
  doctors: DoctorWallItem[];
  bookHref?: string;
}) {
  const countriesInData = Array.from(new Set(doctors.map((d) => d.country)));
  const filterOptions: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    ...countriesInData.map((code) => ({
      id: code,
      label: FILTER_LABELS[code] ?? code.toUpperCase(),
    })),
  ];

  const [filter, setFilter] = useState<string>("all");
  const shown =
    filter === "all" ? doctors : doctors.filter((d) => d.country === filter);

  if (doctors.length === 0) return null;

  const showFilters = countriesInData.length > 1;

  return (
    <section className="relative gh-section bg-[var(--color-background-soft)]">
      <div
        className="relative mx-auto px-5 md:px-10"
        style={{ maxWidth: "var(--container-width)" }}
      >
        {/* Section header */}
        <div className="mb-12 md:mb-16">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <span className="gh-eyebrow text-[var(--color-brand-primary)]">
              The team
            </span>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.14em] [font-variant-numeric:tabular-nums]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {shown.length} registered {shown.length === 1 ? "clinician" : "clinicians"}
            </span>
          </div>
          <h2
            className="mt-3 max-w-[22ch] text-[length:var(--text-h1)] font-extrabold tracking-[-0.03em] leading-[1.02] text-[var(--color-text-primary)]"
          >
            Doctors who actually{" "}
            <span className="text-[var(--color-brand-primary)]">pick up.</span>
          </h2>
          <p className="mt-5 max-w-[52ch] text-[length:var(--text-body-lg)] text-[var(--color-text-body)] leading-relaxed">
            Every consultation is with someone licensed where you are. No
            call centres, no rota of strangers — the doctor on screen is
            the doctor on the profile.
          </p>
        </div>

        {/* Filter chips */}
        {showFilters ? (
          <div className="flex flex-wrap gap-2 mb-8">
            {filterOptions.map((f) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`
                    inline-flex items-center gap-2
                    rounded-full px-4 py-2
                    text-[length:var(--text-meta)] font-semibold
                    border
                    transition-[background-color,border-color,color] duration-200
                    motion-reduce:transition-none
                    ${isActive
                      ? "bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white"
                      : "bg-white border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-background-soft)] hover:border-[var(--color-border-strong)]"
                    }
                  `}
                >
                  {f.id !== "all" ? <Flag code={f.id} size="sm" /> : null}
                  {f.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Doctor card grid — matches /doctors page layout */}
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {shown.map((d) => (
            <DoctorCard
              key={d.id}
              name={d.name}
              title={d.role}
              country={d.country}
              imcRegistration={d.imcRegistration}
              medicalRegistrationUrl={d.medicalRegistrationUrl}
              whatsappNumber={d.whatsappNumber}
              languages={d.langs ? d.langs.split(" · ") : []}
              bio=""
              imageSrc={d.imageSrc}
              initials={d.initials}
              href={d.href}
              bookingHref={d.bookingHref ?? bookHref}
              ctaLabel="View profile"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
