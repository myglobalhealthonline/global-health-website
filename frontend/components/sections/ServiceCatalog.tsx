"use client";

/**
 * Filterable service catalogue — dark luxury version.
 * Forest night bg, glass cards, lime hover CTA, active filter = lime pill.
 */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { currencySymbol } from "@/lib/format-currency";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Package,
  Stethoscope,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export type ServiceTileType = "general" | "specialist" | "prescription" | "test";

export type ServiceCatalogItem = {
  type: ServiceTileType;
  title: string;
  tag: string;
  price: number | null;
  currency?: string;
  dur: string;
  /** Single-CTA target (category tiles, or legacy). Whole tile links here. */
  href: string;
  imageSrc?: string | null;
  /** Two-CTA mode (consultation tiles): "Learn more" → detailHref opens the
   *  service detail page; "Book" → bookHref enters the consult flow. When both
   *  are set the tile renders two buttons instead of a single whole-tile link. */
  detailHref?: string;
  bookHref?: string;
};

/**
 * Forest-glass card surface — exact tokens from the hero "Available now"
 * card: forest-night #0F2E25 at 72%, 18px backdrop blur, 14%-white
 * hairline. Matches the `.gh-glass-card` class. Kept as an inline const
 * here because the featured tile spreads it with an extra `minHeight`.
 */
const GLASS_CARD_STYLE = {
  background: "rgba(255, 255, 255, 0.045)",
  border: "1px solid rgba(255, 255, 255, 0.11)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 18px 50px rgba(0, 0, 0, 0.22)",
} as const;

const DEFAULT_ICONS: Record<ServiceTileType, ReactNode> = {
  general: <Stethoscope className="size-5" strokeWidth={1.5} aria-hidden />,
  specialist: <User className="size-5" strokeWidth={1.5} aria-hidden />,
  prescription: <Package className="size-5" strokeWidth={1.5} aria-hidden />,
  test: <CheckCircle2 className="size-5" strokeWidth={1.5} aria-hidden />,
};

const DEFAULT_SERVICE_IMAGES: Record<ServiceTileType, string> = {
  general: "/images/stock/gp.jpg",
  specialist: "/images/stock/specialist.jpg",
  prescription: "/images/stock/prescriptions.jpg",
  test: "/images/stock/tests.jpg",
};

const FILTER_IDS = ["all", "general", "specialist", "prescription", "test"] as const;
type FilterId = (typeof FILTER_IDS)[number];

/** Desktop grid: 3 cols.
 *  Featured page:  row1 = featured(2col) + 1 card  → 3 slots
 *                  row2 = 3 cards                   → 3 slots  = 5 items per page
 *  Regular page:   row1 = 3 cards, row2 = 3 cards  = 6 items per page */
const PAGE_SIZE_FEATURED = 5;
const PAGE_SIZE_REGULAR = 6;

export type ServiceCatalogI18n = {
  eyebrow: string;
  headline: string;
  featuredDescription: string;
  priceFrom: string;
  durationLabel: string;
  turnaroundLabel: string;
  orderKit: string;
  bookConsultation: string;
  prevServices: string;
  nextServices: string;
  filters: { all: string; general: string; specialist: string; prescription: string; test: string };
};

const DEFAULT_I18N: ServiceCatalogI18n = {
  eyebrow: "What we treat",
  headline: "Care for what's actually going on.",
  featuredDescription: "Most patients start here. Choose an open consultation slot with a doctor registered in your country.",
  priceFrom: "From",
  durationLabel: "Duration",
  turnaroundLabel: "Turnaround",
  orderKit: "Order kit",
  bookConsultation: "Book consultation",
  prevServices: "Previous services",
  nextServices: "Next services",
  filters: { all: "All", general: "General", specialist: "Specialist", prescription: "Prescriptions", test: "Home tests" },
};

export function ServiceCatalog({
  services,
  intro,
  i18n: i18nProp,
}: {
  services: ServiceCatalogItem[];
  intro?: string;
  i18n?: ServiceCatalogI18n;
}) {
  const i18n = i18nProp ?? DEFAULT_I18N;
  const [filter, setFilter] = useState<FilterId>("all");
  const [page, setPage] = useState(0);

  const FILTERS = FILTER_IDS.map((id) => ({ id, label: i18n.filters[id] }));

  const allShown =
    filter === "all" ? services : services.filter((s) => s.type === filter);

  const availableTypes = new Set(services.map((s) => s.type));
  const visibleFilters = FILTERS.filter(
    (f) => f.id === "all" || availableTypes.has(f.id as ServiceTileType),
  );

  if (services.length === 0) return null;

  const useFeaturedFirst = filter === "all" && page === 0 && allShown.length >= 4;
  const pageSize = useFeaturedFirst ? PAGE_SIZE_FEATURED : PAGE_SIZE_REGULAR;
  const totalPages = Math.ceil(allShown.length / pageSize);
  const shown = allShown.slice(page * pageSize, (page + 1) * pageSize);
  const showPager = totalPages > 1;

  function handleFilter(id: FilterId) {
    setFilter(id);
    setPage(0);
  }

  return (
    <section
      id="services"
      className="scroll-mt-24 gh-medical-pattern gh-medical-pattern-dark"
      style={{
        background: "linear-gradient(178deg, #12342A 0%, #0F2E25 100%)",
        padding: "clamp(64px,8vw,120px) 0",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {/* Header */}
        <header className="grid items-end gap-8 lg:grid-cols-[1fr_auto] mb-12 md:mb-16">
          <div>
            <p className="flex items-center gap-3">
              <span aria-hidden className="gh2-index" style={{ color: "rgba(176,241,34,0.50)" }}>
                02
              </span>
              <span
                className="text-[11px] font-bold tracking-[0.2em] uppercase"
                style={{ color: "var(--color-brand-accent)" }}
              >
                {i18n.eyebrow}
              </span>
            </p>
            <h2
              className="mt-5 max-w-[18ch] font-extrabold tracking-[-0.035em] leading-[1.0] text-white"
              style={{ fontSize: "clamp(2.1rem, 4.2vw + 0.5rem, 3.75rem)" }}
            >
              {i18n.headline}
            </h2>
            {intro ? (
              <p
                className="mt-5 max-w-[58ch] text-[length:var(--text-body-lg)] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.70)" }}
              >
                {intro}
              </p>
            ) : null}
          </div>

          {/* Filter chips + pager arrows */}
          <div className="flex flex-wrap items-center gap-4">
            {visibleFilters.length > 2 ? (
              <div className="flex flex-wrap gap-2">
                {visibleFilters.map((f) => {
                  const count =
                    f.id === "all"
                      ? services.length
                      : services.filter((s) => s.type === f.id).length;
                  const isActive = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleFilter(f.id)}
                      aria-pressed={isActive}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[length:var(--text-meta)] font-semibold transition-all duration-200 motion-reduce:transition-none"
                      style={
                        isActive
                          ? {
                              background: "var(--color-brand-accent)",
                              color: "#0a1f14",
                              border: "1px solid var(--color-brand-accent)",
                            }
                          : {
                              background: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.60)",
                              border: "1px solid rgba(255,255,255,0.12)",
                            }
                      }
                    >
                      {f.label}
                      <span
                        className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                        style={
                          isActive
                            ? { background: "rgba(0,0,0,0.18)", color: "#0a1f14" }
                            : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.70)" }
                        }
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Prev / Next — only when more than one page */}
            {showPager && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label={i18n.prevServices}
                  className="inline-flex size-10 items-center justify-center rounded-full border transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: page > 0 ? "var(--color-brand-accent)" : "transparent",
                    borderColor: page > 0 ? "var(--color-brand-accent)" : "rgba(255,255,255,0.20)",
                    color: page > 0 ? "#0a1f14" : "rgba(255,255,255,0.50)",
                  }}
                >
                  <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: "rgba(255,255,255,0.40)" }}
                >
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  aria-label={i18n.nextServices}
                  className="inline-flex size-10 items-center justify-center rounded-full border transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: page < totalPages - 1 ? "var(--color-brand-accent)" : "transparent",
                    borderColor: page < totalPages - 1 ? "var(--color-brand-accent)" : "rgba(255,255,255,0.20)",
                    color: page < totalPages - 1 ? "#0a1f14" : "rgba(255,255,255,0.50)",
                  }}
                >
                  <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
                </button>
              </div>
            )}
          </div>
        </header>

        <RevealOnScroll
          stagger
          className={cn(
            "gh-card-grid",
            useFeaturedFirst ? "gh-card-grid--featured" : null,
          )}
        >
          {shown.map((s, i) => (
            <ServiceTile
              key={`${s.type}-${s.title}-${s.href}`}
              service={s}
              variant={useFeaturedFirst && i === 0 ? "featured" : "default"}
              i18n={i18n}
            />
          ))}
        </RevealOnScroll>
      </div>
    </section>
  );
}

/** Two-CTA footer for consultation tiles — sits above the tile-wide overlay
 *  link via z-index. "Learn more" → detail page, "Book" → consult flow. */
function TileActions({
  detailHref,
  bookHref,
  bookLabel,
}: {
  detailHref: string;
  bookHref: string;
  bookLabel: string;
}) {
  return (
    <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2.5">
      <Link
        href={detailHref}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[length:var(--text-meta)] font-semibold transition-colors duration-200 hover:text-white focus-visible:outline-none"
        style={{ border: "1px solid rgba(255,255,255,0.20)", color: "rgba(255,255,255,0.80)" }}
      >
        Learn more
        <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
      </Link>
      <Link
        href={bookHref}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[length:var(--text-meta)] font-bold transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none"
        style={{ background: "var(--color-brand-accent)", color: "#0a1f14" }}
      >
        {bookLabel}
      </Link>
    </div>
  );
}

function ServiceTile({
  service: s,
  variant,
  i18n,
}: {
  service: ServiceCatalogItem;
  variant: "default" | "featured";
  i18n: ServiceCatalogI18n;
}) {
  const isFeatured = variant === "featured";
  const symbol = currencySymbol(s.currency);
  const tileImageSrc = s.imageSrc ?? DEFAULT_SERVICE_IMAGES[s.type];
  const twoButton = Boolean(s.detailHref && s.bookHref);
  // Tile-wide overlay target: detail page in two-CTA mode, else the legacy href.
  const overlayHref = twoButton ? s.detailHref! : s.href;
  const bookLabel = s.type === "test" ? i18n.orderKit : i18n.bookConsultation;
  // Overlay link — sibling of the footer buttons (no nested anchors).
  const overlay = (
    <Link
      href={overlayHref}
      aria-label={twoButton ? `Learn more: ${s.title}` : s.title}
      className="absolute inset-0 z-[1] rounded-[var(--radius-card)] focus:outline-none"
      tabIndex={twoButton ? -1 : 0}
    />
  );

  /* ── Featured card — horizontal layout: image left | content right ── */
  if (isFeatured) {
    return (
      <div
        className={cn(
          "group relative overflow-hidden text-left",
          "rounded-[var(--radius-card)]",
          "gh2-card gh2-zoom",
          "focus-visible:outline-none",
          "motion-reduce:transition-none",
          // Horizontal grid: image 40% | content 60%
          "grid grid-cols-1 sm:grid-cols-[2fr_3fr]",
        )}
        style={{
          ...GLASS_CARD_STYLE,
          minHeight: 260,
        }}
      >
        {overlay}
        {/* Image — fills full height of row */}
        <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
          {tileImageSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tileImageSrc}
                alt={`${s.title} telemedicine consultation`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Subtle right-edge fade into card body */}
              <div
                aria-hidden
                className="absolute inset-y-0 right-0 w-16 hidden sm:block"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(15,46,37,0.55) 100%)",
                }}
              />
            </>
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <span
                className="inline-flex size-16 items-center justify-center rounded-[var(--radius-tile)]"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "var(--color-brand-accent)",
                }}
              >
                {DEFAULT_ICONS[s.type]}
              </span>
            </div>
          )}
          {/* Tag chip */}
          <span
            className="absolute left-3 top-3 uppercase rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.08em]"
            style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.80)" }}
          >
            {s.tag}
          </span>
        </div>

        {/* Content */}
        <div className="relative flex flex-col justify-between p-6 lg:p-8">
          <div>
            <h3
              className="font-extrabold tracking-[-0.02em] leading-tight text-[length:var(--text-h2)]"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {s.title}
            </h3>
            <p
              className="mt-3 text-[length:var(--text-body)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.62)", maxWidth: "38ch" }}
            >
              {i18n.featuredDescription}
            </p>
          </div>

          <div>
            <div
              className="flex items-baseline justify-between gap-4 pb-4 mt-6"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "rgba(255,255,255,0.50)" }}
                >
                  {i18n.priceFrom}
                </p>
                <p
                  className="mt-1 text-3xl font-semibold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  {s.price == null ? "—" : `${symbol}${s.price}`}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "rgba(255,255,255,0.50)" }}
                >
                  {s.type === "test" ? i18n.turnaroundLabel : i18n.durationLabel}
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.50)" }}>
                  {s.dur}
                </p>
              </div>
            </div>

            {twoButton ? (
              <TileActions detailHref={s.detailHref!} bookHref={s.bookHref!} bookLabel={bookLabel} />
            ) : (
              <span
                className="
                  mt-4 inline-flex items-center justify-between gap-2
                  w-full rounded-full px-5 py-3
                  text-[length:var(--text-meta)] font-semibold
                  transition-all duration-200
                  group-hover:bg-[var(--color-brand-accent)]
                  motion-reduce:transition-none
                "
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "rgba(255,255,255,0.70)",
                }}
              >
                <span className="group-hover:text-[#0a1f14] transition-colors duration-200">
                  {s.type === "test" ? i18n.orderKit : i18n.bookConsultation}
                </span>
                <ArrowUpRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0a1f14] motion-reduce:group-hover:translate-x-0"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Default card — vertical stack ── */
  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden text-left",
        "rounded-[var(--radius-card)]",
        "gh2-card gh2-zoom",
        "focus-visible:outline-none",
        "motion-reduce:transition-none",
      )}
      style={GLASS_CARD_STYLE}
    >
      {overlay}
      {/* Top: inset photo or icon tile */}
      {tileImageSrc ? (
        <div className="p-2.5 pb-0">
          <div
            className="relative overflow-hidden rounded-[14px]"
            style={{ height: 168 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tileImageSrc}
              alt={`${s.title} telemedicine consultation`}
              className="block h-full w-full object-cover"
            />
            <span
              className="absolute right-3 top-3 uppercase rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.08em]"
              style={{
                background: "rgba(10,31,20,0.65)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              {s.tag}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="flex items-start justify-between p-5 min-h-[88px]"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span
            className="inline-flex size-11 items-center justify-center rounded-[var(--radius-tile)]"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--color-brand-accent)",
            }}
          >
            {DEFAULT_ICONS[s.type]}
          </span>
          <span
            className="uppercase rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.08em]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.65)",
            }}
          >
            {s.tag}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <h3
          className="font-semibold tracking-[-0.015em] text-[length:var(--text-h3)] leading-snug"
          style={{ color: "rgba(255,255,255,0.88)" }}
        >
          {s.title}
        </h3>

        <div className="mt-auto pt-6">
          <div
            className="flex items-baseline justify-between gap-4 pb-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.60)" }}
              >
                {i18n.priceFrom}
              </p>
              <p
                className="mt-1 text-2xl font-semibold leading-none tracking-[-0.015em] [font-variant-numeric:tabular-nums]"
                style={{ color: "rgba(255,255,255,0.88)" }}
              >
                {s.price == null ? "—" : `${symbol}${s.price}`}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.60)" }}
              >
                {s.type === "test" ? i18n.turnaroundLabel : i18n.durationLabel}
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
                {s.dur}
              </p>
            </div>
          </div>

          <span
            className="
              mt-4 inline-flex items-center justify-between gap-2
              w-full rounded-full px-4 py-2.5
              text-[length:var(--text-meta)] font-semibold
              transition-all duration-200
              group-hover:bg-[var(--color-brand-accent)]
              motion-reduce:transition-none
            "
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.70)",
            }}
          >
            <span className="group-hover:text-[#0a1f14] transition-colors duration-200">
              {s.type === "test" ? i18n.orderKit : i18n.bookConsultation}
            </span>
            <ArrowUpRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0a1f14] motion-reduce:group-hover:translate-x-0"
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
        </div>
      </div>
    </div>
  );
}
