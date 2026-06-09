"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { Flag } from "@/components/ui/Flag";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

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
  href: string;
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

const PAGE_SIZE = 6;

export function DoctorWall({
  doctors,
  bookHref,
  hideHeader = false,
}: {
  doctors: DoctorWallItem[];
  bookHref?: string;
  hideHeader?: boolean;
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
  const [page, setPage] = useState(0);

  const shown =
    filter === "all" ? doctors : doctors.filter((d) => d.country === filter);

  const totalPages = Math.ceil(shown.length / PAGE_SIZE);
  const paged = shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showPager = totalPages > 1;
  const showFilters = countriesInData.length > 1;

  // Reset to page 0 when filter changes
  function handleFilter(id: string) {
    setFilter(id);
    setPage(0);
  }

  if (doctors.length === 0) return null;

  const inner = (
    <div
      className="relative mx-auto px-5 md:px-10"
      style={{ maxWidth: "var(--container-width)" }}
    >
      {/* Section header */}
      {!hideHeader && (
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
          <h2 className="mt-3 max-w-[22ch] text-[length:var(--text-h1)] font-extrabold tracking-[-0.03em] leading-[1.02] text-[var(--color-text-primary)]">
            Doctors who actually{" "}
            <span className="text-[var(--color-brand-primary)]">pick up.</span>
          </h2>
          <p className="mt-5 max-w-[52ch] text-[length:var(--text-body-lg)] text-[var(--color-text-body)] leading-relaxed">
            Every consultation is with someone licensed where you are. No call
            centres, no rota of strangers — the doctor on screen is the doctor
            on the profile.
          </p>
        </div>
      )}

      {/* Filter chips + pagination controls row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        {showFilters ? (
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((f) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFilter(f.id)}
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
        ) : (
          <div />
        )}

        {/* Page arrows */}
        {showPager && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="inline-flex size-10 items-center justify-center rounded-full border transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: page === 0 ? "transparent" : "var(--color-brand-primary)",
                borderColor: page === 0 ? "var(--color-border-strong)" : "var(--color-brand-primary)",
                color: page === 0 ? "var(--color-text-muted)" : "#fff",
              }}
            >
              <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
            </button>
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: "var(--color-text-muted)" }}
            >
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              aria-label="Next page"
              className="inline-flex size-10 items-center justify-center rounded-full border transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: page === totalPages - 1 ? "transparent" : "var(--color-brand-primary)",
                borderColor: page === totalPages - 1 ? "var(--color-border-strong)" : "var(--color-brand-primary)",
                color: page === totalPages - 1 ? "var(--color-text-muted)" : "#fff",
              }}
            >
              <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* 3-column grid */}
      <RevealOnScroll stagger className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {paged.map((d) => (
          <div key={d.id}>
            <DoctorCard
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
          </div>
        ))}
      </RevealOnScroll>
    </div>
  );

  if (hideHeader) return <>{inner}</>;

  return (
    <section className="relative gh-section bg-[var(--color-background-soft)]">
      {inner}
    </section>
  );
}
