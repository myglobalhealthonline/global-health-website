"use client";

import { useState } from "react";
import { CarouselNav } from "@/components/ui/CarouselNav";
import { SwipePageTrack } from "@/components/ui/SwipePageTrack";
import { ServiceCard } from "@/components/cards/ServiceCard";
import {
  SERVICE_CATALOG_DEFAULT_I18N,
  ServiceTile,
  type ServiceCatalogItem,
} from "@/components/sections/ServiceCatalog";
import { Container } from "@/components/layout/Container";
import { SectionSeam } from "@/components/ui/SectionSeam";

type Item = {
  title: string;
  description: string;
  /** Single-CTA mode (legacy). Prefer detailHref + bookHref for two buttons. */
  href?: string;
  /** Two-CTA mode: "Learn more" → detailHref, "Book" → bookHref. */
  detailHref?: string;
  bookHref?: string;
  bookLabel?: string;
  serviceType?: "general" | "specialist";
  audience?: string;
  duration?: string;
  startingPrice?: string;
  imageSrc?: string | null;
};

type ServicesGridProps = {
  title?: string;
  intro?: string;
  eyebrow?: string;
  items: Item[];
  featureFirst?: boolean;
  /** "dark" renders forest-night glass cards; "light" (default) renders white cards. */
  variant?: "light" | "dark";
  previousPageLabel?: string;
  nextPageLabel?: string;
  /** "Learn more" CTA label (single-CTA cards / two-CTA detail button).
   *  Callers should pass the locale's `services.catalog.learnMore`. */
  learnMoreLabel?: string;
};

const PAGE_SIZE_FEATURED = 5;
const PAGE_SIZE_REGULAR = 6;

/** Adapt a ServicesGrid item to the home-page catalog tile shape. */
function toCatalogItem(item: Item): ServiceCatalogItem {
  return {
    type: item.serviceType ?? "general",
    title: item.title,
    tag: item.audience ?? (item.serviceType === "specialist" ? "Specialist" : "General"),
    price: null,
    priceLabel: item.startingPrice,
    dur: item.duration ?? "",
    description: item.description,
    href: item.detailHref ?? item.href ?? "#",
    imageSrc: item.imageSrc,
    detailHref: item.detailHref,
    bookHref: item.bookHref,
  };
}

export function ServicesGrid({
  title,
  intro,
  eyebrow,
  items,
  featureFirst = true,
  variant = "light",
  previousPageLabel = "Previous page",
  nextPageLabel = "Next page",
  learnMoreLabel = "Learn more",
}: ServicesGridProps) {
  const [page, setPage] = useState(0);
  const isDark = variant === "dark";

  // Page 0 renders PAGE_SIZE_FEATURED items, every later page renders
  // PAGE_SIZE_REGULAR — chunk every page upfront (not just the current
  // one) so they can all sit in the scroll-snap track at once and native
  // touch/trackpad drag gets real browser momentum, same as DoctorCarousel.
  const canFeatureFirst = featureFirst && items.length >= 4;
  const firstPageSize = canFeatureFirst ? PAGE_SIZE_FEATURED : PAGE_SIZE_REGULAR;
  const pages: Item[][] = [];
  if (items.length === 0) {
    pages.push([]);
  } else {
    pages.push(items.slice(0, firstPageSize));
    for (let i = firstPageSize; i < items.length; i += PAGE_SIZE_REGULAR) {
      pages.push(items.slice(i, i + PAGE_SIZE_REGULAR));
    }
  }
  const totalPages = pages.length;
  const safePage = Math.min(page, totalPages - 1);
  const showPager = totalPages > 1;

  const goPrev = () => setPage((p) => p - 1);
  const goNext = () => setPage((p) => p + 1);

  return (
    <section
      className={isDark ? "relative overflow-hidden gh2-section-forest gh-medical-pattern gh-medical-pattern-dark" : ""}
      style={
        isDark
          ? {
              padding: "clamp(64px,8vw,120px) 0",
            }
          : { background: "var(--color-background-page)", padding: "clamp(48px,6vw,96px) 0" }
      }
    >
      {isDark ? <SectionSeam theme="dark" /> : null}
      <Container>
        {/* Header row */}
        <div className="flex flex-wrap items-end justify-between gap-8 mb-12 lg:mb-14">
          {/* Left: eyebrow / title / intro */}
          <div>
            {eyebrow && (
              <span
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: isDark ? "var(--color-brand-accent)" : "var(--color-brand-primary)" }}
              >
                {eyebrow}
              </span>
            )}
            {title && (
              <h2
                className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.02]"
                style={{
                  fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)",
                  color: isDark ? "rgba(255,255,255,0.92)" : "var(--color-text-primary)",
                }}
              >
                {title}
              </h2>
            )}
            {intro && (
              <p
                className="mt-3 max-w-2xl text-[length:var(--text-body-lg)] leading-relaxed"
                style={{ color: isDark ? "rgba(255,255,255,0.70)" : "var(--color-text-muted)" }}
              >
                {intro}
              </p>
            )}
          </div>

          {/* Right: pager arrows */}
          {showPager && (
            <CarouselNav
              onPrev={goPrev}
              onNext={goNext}
              canPrev={safePage > 0}
              canNext={safePage < totalPages - 1}
              progress={(safePage + 1) / totalPages}
              dark={isDark}
              prevLabel={previousPageLabel}
              nextLabel={nextPageLabel}
              page={safePage}
              totalPages={totalPages}
            />
          )}
        </div>

        {/* Card grid — dark sections reuse the home-page catalog tiles so
            service pages and the country home share one card design. */}
        <SwipePageTrack
          pages={pages}
          page={safePage}
          onPageChange={setPage}
          renderPage={(paged, pageIndex) => {
            const pageFeatured = canFeatureFirst && pageIndex === 0;
            return (
              <div className={pageFeatured ? "gh-card-grid gh-card-grid--featured" : "gh-card-grid"}>
                {isDark
                  ? paged.map((item, i) => (
                      <ServiceTile
                        key={item.detailHref ?? item.href ?? item.title}
                        service={toCatalogItem(item)}
                        variant={pageFeatured && i === 0 ? "featured" : "default"}
                        i18n={{
                          ...SERVICE_CATALOG_DEFAULT_I18N,
                          // Featured tile shows the service's own summary, and Book
                          // buttons keep the caller's (localised) label.
                          featuredDescription:
                            paged[0]?.description ?? SERVICE_CATALOG_DEFAULT_I18N.featuredDescription,
                          bookConsultation:
                            item.bookLabel ?? SERVICE_CATALOG_DEFAULT_I18N.bookConsultation,
                          learnMore: learnMoreLabel,
                          learnMoreAria: `${learnMoreLabel}: {title}`,
                        }}
                      />
                    ))
                  : paged.map((item, i) => (
                      <ServiceCard
                        key={item.detailHref ?? item.href ?? item.title}
                        {...item}
                        ctaLabel={learnMoreLabel}
                        dark={isDark}
                        featured={pageFeatured && i === 0}
                      />
                    ))}
              </div>
            );
          }}
        />

        {/* Bottom pager — mirrors the header one so paging past row 1
            doesn't force a scroll back to the top of the list. */}
        {showPager && (
          <div className="mt-10 flex justify-center">
            <CarouselNav
              onPrev={goPrev}
              onNext={goNext}
              canPrev={safePage > 0}
              canNext={safePage < totalPages - 1}
              variant="segments"
              dark={isDark}
              prevLabel={previousPageLabel}
              nextLabel={nextPageLabel}
              page={safePage}
              totalPages={totalPages}
            />
          </div>
        )}
      </Container>
    </section>
  );
}
