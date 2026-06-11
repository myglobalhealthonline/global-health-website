"use client";

/**
 * Doctors grid — the single canonical paged DoctorCard grid.
 * Themeable (dark|light). `bare` renders just the grid (+ pager) with no
 * section wrapper or header, for embedding inside a page's own section
 * (e.g. the homepage Team block, which owns its heading + featured card).
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DoctorCard } from "@/components/cards/DoctorCard";

type DoctorItem = {
  name: string;
  title: string;
  imcRegistration?: string;
  medicalRegistrationUrl?: string;
  country?: string;
  languages?: string[];
  whatsappNumber?: string;
  bio: string;
  imageSrc?: string | null;
  /** Initials fallback when imageSrc is missing (DoctorCard derives from
   *  name if omitted). */
  initials?: string;
  href?: string;
  bookingHref?: string;
  ctaLabel?: string;
};

type DoctorsSectionProps = {
  title?: string;
  intro?: string;
  doctors: DoctorItem[];
  theme?: "dark" | "light";
  /** Render just the (optional pager +) grid with no section wrapper or
   *  header — for embedding inside a page's own section. */
  bare?: boolean;
};

const PAGE_SIZE = 6;

export function DoctorsSection({ title, intro, doctors, theme = "dark", bare = false }: DoctorsSectionProps) {
  const isLight = theme === "light";
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(doctors.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paged = doctors.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const showPager = totalPages > 1;

  const activeStyle = {
    background: "var(--color-brand-accent)",
    borderColor: "var(--color-brand-accent)",
    color: "#0a1f14",
  };
  const inactiveStyle = isLight
    ? { background: "transparent", borderColor: "rgba(29,75,54,0.20)", color: "rgba(29,75,54,0.35)" }
    : { background: "transparent", borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.40)" };

  const pager = showPager ? (
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={safePage === 0}
        aria-label="Previous page"
        className="size-10 rounded-full border inline-flex items-center justify-center transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        style={safePage === 0 ? inactiveStyle : activeStyle}
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <span
        className="text-[11px] font-bold tabular-nums"
        style={{ color: isLight ? "var(--color-text-muted)" : "rgba(255,255,255,0.38)" }}
      >
        {safePage + 1} / {totalPages}
      </span>
      <button
        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        disabled={safePage === totalPages - 1}
        aria-label="Next page"
        className="size-10 rounded-full border inline-flex items-center justify-center transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        style={safePage === totalPages - 1 ? inactiveStyle : activeStyle}
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  ) : null;

  const grid = (
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {paged.map((doctor) => (
        <DoctorCard key={doctor.href ?? `${doctor.name}-${doctor.title}`} {...doctor} dark={!isLight} />
      ))}
    </div>
  );

  if (bare) {
    return (
      <div>
        {showPager ? <div className="mb-8 flex justify-end">{pager}</div> : null}
        {grid}
      </div>
    );
  }

  return (
    <section
      className={isLight ? "" : "relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark"}
      style={{
        background: isLight ? "var(--color-background-soft)" : "var(--color-background-dark)",
        padding: "clamp(64px,8vw,120px) 0",
        borderTop: isLight ? "1px solid rgba(29,75,54,0.10)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {(title || intro || showPager) && (
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12 lg:mb-14">
            <div>
              <span
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)" }}
              >
                Our Team
              </span>
              {title && (
                <h2
                  className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
                  style={{
                    fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)",
                    color: isLight ? "var(--color-text-primary)" : "rgba(255,255,255,0.95)",
                  }}
                >
                  {title}
                </h2>
              )}
              {intro ? (
                <p
                  className="mt-4 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed"
                  style={{ color: isLight ? "var(--color-text-muted)" : "rgba(255,255,255,0.55)" }}
                >
                  {intro}
                </p>
              ) : null}
            </div>
            {pager}
          </div>
        )}
        {grid}
      </div>
    </section>
  );
}
