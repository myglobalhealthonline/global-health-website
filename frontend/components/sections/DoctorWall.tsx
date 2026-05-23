"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

/** Cards visible at once per breakpoint.
 *  The scroll container shows exactly VISIBLE cards; arrows step by that amount. */
const VISIBLE = 5;

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
  const shown =
    filter === "all" ? doctors : doctors.filter((d) => d.country === filter);

  // Reset scroll position when filter changes
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // Reset scroll on filter change
    el.scrollLeft = 0;
    updateArrows();
  }, [filter, shown.length, updateArrows]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    // Also update on resize
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  function scrollBy(direction: "prev" | "next") {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by exactly one card width including gap
    const card = el.querySelector<HTMLElement>("[data-doctor-card]");
    if (!card) return;
    const gap = 24; // matches gap-6
    const step = card.offsetWidth + gap;
    el.scrollBy({ left: direction === "next" ? step : -step, behavior: "smooth" });
  }

  if (doctors.length === 0) return null;

  const showFilters = countriesInData.length > 1;
  const showArrows = shown.length > VISIBLE;

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

      {/* Filter chips + arrow controls row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        {showFilters ? (
          <div className="flex flex-wrap gap-2">
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
        ) : (
          /* Spacer so arrows stay right-aligned even without filters */
          <div />
        )}

        {/* Prev / Next arrows — only shown when there are more than 5 cards */}
        {showArrows && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollBy("prev")}
              disabled={!canPrev}
              aria-label="Previous doctors"
              className="
                inline-flex size-10 items-center justify-center
                rounded-full border
                transition-[background-color,border-color,opacity] duration-200
                disabled:opacity-30 disabled:cursor-not-allowed
              "
              style={{
                background: canPrev ? "var(--color-brand-primary)" : "transparent",
                borderColor: canPrev
                  ? "var(--color-brand-primary)"
                  : "var(--color-border-strong)",
                color: canPrev ? "#fff" : "var(--color-text-muted)",
              }}
            >
              <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollBy("next")}
              disabled={!canNext}
              aria-label="Next doctors"
              className="
                inline-flex size-10 items-center justify-center
                rounded-full border
                transition-[background-color,border-color,opacity] duration-200
                disabled:opacity-30 disabled:cursor-not-allowed
              "
              style={{
                background: canNext ? "var(--color-brand-primary)" : "transparent",
                borderColor: canNext
                  ? "var(--color-brand-primary)"
                  : "var(--color-border-strong)",
                color: canNext ? "#fff" : "var(--color-text-muted)",
              }}
            >
              <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* Scroll track — shows VISIBLE cards, scrolls one at a time */}
      <div
        ref={trackRef}
        data-doctor-wall-track
        className="flex gap-6 overflow-x-auto scroll-smooth gh-doctor-wall-track"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollSnapType: "x mandatory",
          paddingBottom: 4,
        }}
      >
        {shown.map((d) => (
          <div
            key={d.id}
            data-doctor-card
            className="shrink-0"
            style={{
              /* 5 cards with gap: (100% - 4×24px) / 5 */
              width: "calc((100% - 4 * 24px) / 5)",
              /* Fallback for fewer cards */
              minWidth: 240,
              maxWidth: 320,
              scrollSnapAlign: "start",
            }}
          >
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
      </div>

      <style>{`
        .gh-doctor-wall-track::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );

  if (hideHeader) return <>{inner}</>;

  return (
    <section className="relative gh-section bg-[var(--color-background-soft)]">
      {inner}
    </section>
  );
}
