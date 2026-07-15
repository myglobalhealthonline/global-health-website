"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
}: ServicesGridProps) {
  const [page, setPage] = useState(0);
  const isDark = variant === "dark";

  const useFeaturedFirst = featureFirst && page === 0 && items.length >= 4;
  const pageSize = useFeaturedFirst ? PAGE_SIZE_FEATURED : PAGE_SIZE_REGULAR;
  const totalPages = Math.ceil(items.length / pageSize);
  const paged = items.slice(page * pageSize, (page + 1) * pageSize);
  const showPager = totalPages > 1;

  const arrowActive = isDark
    ? {
        background: "var(--color-brand-accent)",
        color: "#0a1f14",
        border: "1px solid var(--color-brand-accent)",
      }
    : {
        background: "var(--color-brand-primary)",
        color: "#ffffff",
        border: "1px solid var(--color-brand-primary)",
      };

  const arrowInactive = isDark
    ? {
        background: "transparent",
        color: "rgba(255,255,255,0.50)",
        border: "1px solid rgba(255,255,255,0.20)",
      }
    : {
        background: "transparent",
        color: "var(--color-text-muted)",
        border: "1px solid var(--color-border)",
      };

  const counterColor = isDark ? "rgba(255,255,255,0.50)" : "var(--color-text-muted)";

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
            <div className="flex items-center gap-3 shrink-0">
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: counterColor }}
              >
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                aria-label="Previous page"
                className="size-11 rounded-full inline-flex items-center justify-center transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={page === 0 ? arrowInactive : arrowActive}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                aria-label="Next page"
                className="size-11 rounded-full inline-flex items-center justify-center transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={page >= totalPages - 1 ? arrowInactive : arrowActive}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Card grid — dark sections reuse the home-page catalog tiles so
            service pages and the country home share one card design. */}
        <div className={useFeaturedFirst ? "gh-card-grid gh-card-grid--featured" : "gh-card-grid"}>
          {isDark
            ? paged.map((item, i) => (
                <ServiceTile
                  key={item.detailHref ?? item.href ?? item.title}
                  service={toCatalogItem(item)}
                  variant={useFeaturedFirst && i === 0 ? "featured" : "default"}
                  i18n={{
                    ...SERVICE_CATALOG_DEFAULT_I18N,
                    // Featured tile shows the service's own summary, and Book
                    // buttons keep the caller's (localised) label.
                    featuredDescription:
                      paged[0]?.description ?? SERVICE_CATALOG_DEFAULT_I18N.featuredDescription,
                    bookConsultation:
                      item.bookLabel ?? SERVICE_CATALOG_DEFAULT_I18N.bookConsultation,
                  }}
                />
              ))
            : paged.map((item, i) => (
                <ServiceCard
                  key={item.detailHref ?? item.href ?? item.title}
                  {...item}
                  dark={isDark}
                  featured={useFeaturedFirst && i === 0}
                />
              ))}
        </div>
      </Container>
    </section>
  );
}
