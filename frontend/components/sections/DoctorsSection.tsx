"use client";

/**
 * Doctors grid — the single canonical paged DoctorCard grid.
 * Themeable (dark|light). `bare` renders just the grid (+ pager) with no
 * section wrapper or header, for embedding inside a page's own section
 * (e.g. the homepage Team block, which owns its heading + featured card).
 */

import { useState } from "react";
import { DoctorCard } from "@/components/cards/DoctorCard";
import type { DoctorCardI18n } from "@/components/cards/doctor-card-i18n";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { CarouselNav } from "@/components/ui/CarouselNav";
import { useSwipePage } from "@/hooks/use-swipe-page";

type DoctorItem = {
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
  /** Force card appearance independently of section theme. */
  cardTheme?: "dark" | "light";
  /** Render just the (optional pager +) grid with no section wrapper or
   *  header — for embedding inside a page's own section. */
  bare?: boolean;
  previousPageLabel?: string;
  nextPageLabel?: string;
  eyebrow?: string;
  /** Doctor-card chrome strings, resolved by the (server) caller. */
  cardI18n: DoctorCardI18n;
};

const PAGE_SIZE = 6;

export function DoctorsSection({
  title,
  intro,
  doctors,
  theme = "dark",
  cardTheme,
  bare = false,
  previousPageLabel = "Previous page",
  nextPageLabel = "Next page",
  eyebrow = "Our Team",
  cardI18n,
}: DoctorsSectionProps) {
  const isLight = theme === "light";
  const isCardDark = cardTheme ? cardTheme === "dark" : !isLight;
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(doctors.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paged = doctors.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const showPager = totalPages > 1;

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));
  const swipe = useSwipePage(goPrev, goNext);

  const pager = showPager ? (
    <CarouselNav
      onPrev={goPrev}
      onNext={goNext}
      canPrev={safePage > 0}
      canNext={safePage < totalPages - 1}
      progress={(safePage + 1) / totalPages}
      dark={!isLight}
      prevLabel={previousPageLabel}
      nextLabel={nextPageLabel}
      page={safePage}
      totalPages={totalPages}
    />
  ) : null;

  // Second pager below the grid — same page/setPage wiring, segmented dots
  // instead of the header's hairline — so paging past row 1 doesn't force
  // a scroll back to the top of the list.
  const bottomPager = showPager ? (
    <div className="mt-10 flex justify-center">
      <CarouselNav
        onPrev={goPrev}
        onNext={goNext}
        canPrev={safePage > 0}
        canNext={safePage < totalPages - 1}
        variant="segments"
        dark={!isLight}
        prevLabel={previousPageLabel}
        nextLabel={nextPageLabel}
        page={safePage}
        totalPages={totalPages}
      />
    </div>
  ) : null;

  const grid = (
    <div
      className="gh-card-grid"
      style={{ columnGap: "2rem", rowGap: "2.5rem" }}
      {...(showPager ? swipe : {})}
    >
      {paged.map((doctor) => (
        <DoctorCard
          key={doctor.href ?? `${doctor.name}-${doctor.title}`}
          {...doctor}
          dark={isCardDark}
          cardI18n={cardI18n}
        />
      ))}
    </div>
  );

  if (bare) {
    return (
      <div>
        {showPager ? <div className="mb-8 flex justify-end">{pager}</div> : null}
        {grid}
        {bottomPager}
      </div>
    );
  }

  return (
    <section
      className={
        isLight
          ? "relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
          : "relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
      }
      style={{
        padding: "clamp(64px,8vw,120px) 0",
      }}
    >
      <SectionSeam theme={isLight ? "light" : "dark"} />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {(title || intro || showPager) && (
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12 lg:mb-14">
            <div>
              <span
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)" }}
              >
                {eyebrow}
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
        {bottomPager}
      </div>
    </section>
  );
}
