"use client";

/**
 * Doctors grid — dark luxury version.
 * Forest-night canvas, lime pager buttons, white/90 text.
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
  href?: string;
  bookingHref?: string;
  ctaLabel?: string;
};

type DoctorsSectionProps = {
  title?: string;
  intro?: string;
  doctors: DoctorItem[];
  theme?: "dark" | "light";
};

const PAGE_SIZE = 6;

export function DoctorsSection({ title, intro, doctors, theme = "dark" }: DoctorsSectionProps) {
  const isLight = theme === "light";
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(doctors.length / PAGE_SIZE);
  const paged = doctors.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showPager = totalPages > 1;

  return (
    <section
      style={{
        background: isLight ? "var(--color-background-soft)" : "var(--color-background-dark)",
        padding: "clamp(64px,8vw,120px) 0",
        borderTop: isLight ? "1px solid rgba(29,75,54,0.10)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {(title || intro) && (
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

            {showPager && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  aria-label="Previous page"
                  className="size-10 rounded-full border inline-flex items-center justify-center transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={
                    page === 0
                      ? (isLight ? { background: "transparent", borderColor: "rgba(29,75,54,0.20)", color: "rgba(29,75,54,0.35)" } : { background: "transparent", borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.40)" })
                      : { background: "var(--color-brand-accent)", borderColor: "var(--color-brand-accent)", color: "#0a1f14" }
                  }
                >
                  <ChevronLeft size={18} aria-hidden />
                </button>
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: isLight ? "var(--color-text-muted)" : "rgba(255,255,255,0.38)" }}
                >
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages - 1}
                  aria-label="Next page"
                  className="size-10 rounded-full border inline-flex items-center justify-center transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={
                    page === totalPages - 1
                      ? (isLight ? { background: "transparent", borderColor: "rgba(29,75,54,0.20)", color: "rgba(29,75,54,0.35)" } : { background: "transparent", borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.40)" })
                      : { background: "var(--color-brand-accent)", borderColor: "var(--color-brand-accent)", color: "#0a1f14" }
                  }
                >
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((doctor) => (
            <DoctorCard
              key={doctor.href ?? `${doctor.name}-${doctor.title}`}
              {...doctor}
              dark={!isLight}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
