"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
  imageFocalX?: number;
  imageFocalY?: number;
  imageZoom?: number;
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
    previousLabel?: string;
    nextLabel?: string;
    noDoctorsFound?: string;
  };
};

/**
 * Doctor slider — CSS scroll-snap track (swipe on touch, smooth arrow
 * paging on desktop) instead of the old hard 3-card page swap. Arrows
 * scroll one viewport at a time; a lime progress bar tracks position.
 */
export function DoctorCarousel({ doctors, i18n }: DoctorCarouselProps) {
  const hasGP = doctors.some((d) => d.kind === "gp");
  const hasSpecialist = doctors.some((d) => d.kind === "specialist");
  const showFilters = hasGP && hasSpecialist;

  const [filter, setFilter] = useState<"all" | "gp" | "specialist">("all");
  const filtered =
    filter === "all" ? doctors : doctors.filter((d) => d.kind === filter);

  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const rafPending = useRef(false);

  const syncScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 0 ? el.scrollLeft / max : 1;
    el.style.setProperty("--scroll-progress", String(progress));
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < max - 8);
  }, []);

  const onScroll = useCallback(() => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      syncScrollState();
    });
  }, [syncScrollState]);

  useEffect(() => {
    syncScrollState();
    window.addEventListener("resize", onScroll);
    return () => window.removeEventListener("resize", onScroll);
  }, [onScroll, syncScrollState, filtered.length]);

  function changeFilter(f: "all" | "gp" | "specialist") {
    setFilter(f);
    trackRef.current?.scrollTo({ left: 0 });
  }

  function scrollByViewport(dir: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

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
  const arrowStyle = (enabled: boolean) =>
    enabled
      ? {
          background: "var(--color-brand-accent)",
          color: "#0a1f14",
          borderColor: "var(--color-brand-accent)",
        }
      : {
          background: "transparent",
          color: "rgba(255,255,255,0.22)",
          borderColor: "rgba(255,255,255,0.12)",
        };

  const showArrows = canPrev || canNext;

  return (
    <div>
      {(showFilters || showArrows) && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          {showFilters ? (
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  ["all", i18n.filterAll],
                  ["gp", i18n.filterGP],
                  ["specialist", i18n.filterSpecialist],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => changeFilter(key)}
                  aria-pressed={filter === key}
                  className="gh-focus-on-dark rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-all duration-150"
                  style={filter === key ? filterActiveStyle : ghostStyle}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}

          {showArrows && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => scrollByViewport(-1)}
                disabled={!canPrev}
                aria-label={i18n.previousLabel ?? "Previous"}
                className="gh-focus-on-dark size-11 rounded-full border inline-flex items-center justify-center transition-all duration-150 disabled:cursor-not-allowed"
                style={arrowStyle(canPrev)}
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              {/* Progress bar — replaces the old "1 / 4" counter */}
              <div
                aria-hidden
                className="h-[3px] w-20 overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,0.14)" }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-200"
                  style={{
                    background: "var(--color-brand-accent)",
                    width:
                      "calc(max(0.12, var(--scroll-progress, 0)) * 100%)",
                  }}
                />
              </div>
              <button
                onClick={() => scrollByViewport(1)}
                disabled={!canNext}
                aria-label={i18n.nextLabel ?? "Next"}
                className="gh-focus-on-dark size-11 rounded-full border inline-flex items-center justify-center transition-all duration-150 disabled:cursor-not-allowed"
                style={arrowStyle(canNext)}
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="gh-scrollbar-none -mx-1 flex snap-x snap-mandatory gap-8 overflow-x-auto scroll-smooth px-1 pb-2"
        style={{ "--scroll-progress": 0 } as CSSProperties}
        role="list"
      >
        {filtered.map((doctor) => (
          <div
            key={doctor.href ?? `${doctor.name}-${doctor.title}`}
            role="listitem"
            className="w-[86%] shrink-0 snap-start sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]"
          >
            <DoctorCard {...doctor} bookLabel={i18n.pickTime} dark />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p
          className="py-12 text-center text-sm"
          style={{ color: "var(--gh2-on-dark-muted)" }}
        >
          {i18n.noDoctorsFound ?? "No doctors found."}
        </p>
      )}
    </div>
  );
}
