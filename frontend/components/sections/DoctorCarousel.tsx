"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DoctorCard } from "@/components/cards/DoctorCard";

export type DoctorCarouselItem = {
  kind?: "gp" | "specialist";
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
  bio: string;
  imageSrc?: string | null;
  imageAltText?: string | null;
  imageTitle?: string | null;
  imageCaption?: string | null;
  imageDescription?: string | null;
  initials?: string;
  href?: string;
  bookingHref?: string;
  ctaLabel?: string;
};

type DoctorCarouselProps = {
  doctors: DoctorCarouselItem[];
  i18n: {
    filterAll: string;
    filterGP: string;
    filterSpecialist: string;
    pickTime: string;
  };
};

const PAGE_SIZE = 3;

export function DoctorCarousel({ doctors, i18n }: DoctorCarouselProps) {
  const hasGP = doctors.some((d) => d.kind === "gp");
  const hasSpecialist = doctors.some((d) => d.kind === "specialist");
  const showFilters = hasGP || hasSpecialist;

  const [filter, setFilter] = useState<"all" | "gp" | "specialist">("all");
  const [page, setPage] = useState(0);

  const filtered =
    filter === "all" ? doctors : doctors.filter((d) => d.kind === filter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const showArrows = filtered.length > PAGE_SIZE;

  function changeFilter(f: "all" | "gp" | "specialist") {
    setFilter(f);
    setPage(0);
  }

  const activeStyle = {
    background: "var(--color-brand-accent)",
    color: "#0a1f14",
    borderColor: "var(--color-brand-accent)",
  };
  // Filter pills use a forest fill + white text when active (lime is reserved
  // for a small accent dot), matching DoctorFilters' active-state dosage.
  const filterActiveStyle = {
    background: "var(--color-brand-primary)",
    color: "#ffffff",
    borderColor: "var(--color-brand-primary)",
  };
  const ghostStyle = {
    background: "transparent",
    color: "var(--gh2-on-dark-muted)",
    borderColor: "rgba(255,255,255,0.20)",
  };
  const disabledStyle = {
    background: "transparent",
    color: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.12)",
  };

  return (
    <div>
      {(showFilters || showArrows) && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          {showFilters ? (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => changeFilter("all")}
                className="gh-focus-on-dark rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all duration-150"
                style={filter === "all" ? filterActiveStyle : ghostStyle}
              >
                {i18n.filterAll}
              </button>
              {hasGP && (
                <button
                  onClick={() => changeFilter("gp")}
                  className="gh-focus-on-dark rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all duration-150"
                  style={filter === "gp" ? filterActiveStyle : ghostStyle}
                >
                  {i18n.filterGP}
                </button>
              )}
              {hasSpecialist && (
                <button
                  onClick={() => changeFilter("specialist")}
                  className="gh-focus-on-dark rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all duration-150"
                  style={filter === "specialist" ? filterActiveStyle : ghostStyle}
                >
                  {i18n.filterSpecialist}
                </button>
              )}
            </div>
          ) : (
            <span />
          )}

          {showArrows && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                aria-label="Previous"
                className="gh-focus-on-dark size-11 rounded-full border inline-flex items-center justify-center transition-all duration-150 disabled:cursor-not-allowed"
                style={safePage === 0 ? disabledStyle : activeStyle}
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <span
                aria-live="polite"
                className="text-[11px] font-bold tabular-nums"
                style={{ color: "var(--gh2-on-dark-muted)" }}
              >
                {safePage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage === totalPages - 1}
                aria-label="Next"
                className="gh-focus-on-dark size-11 rounded-full border inline-flex items-center justify-center transition-all duration-150 disabled:cursor-not-allowed"
                style={safePage === totalPages - 1 ? disabledStyle : activeStyle}
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
            bookLabel={i18n.pickTime}
            dark
          />
        ))}
      </div>

      {paged.length === 0 && filtered.length === 0 && (
        <p
          className="py-12 text-center text-sm"
          style={{ color: "var(--gh2-on-dark-muted)" }}
        >
          No doctors found.
        </p>
      )}
    </div>
  );
}
