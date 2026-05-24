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

export type ServiceTileType = "general" | "specialist" | "prescription" | "test";

export type ServiceCatalogItem = {
  type: ServiceTileType;
  title: string;
  tag: string;
  price: number | null;
  currency?: string;
  dur: string;
  href: string;
  imageSrc?: string | null;
};

const DEFAULT_ICONS: Record<ServiceTileType, ReactNode> = {
  general: <Stethoscope className="size-5" strokeWidth={1.5} aria-hidden />,
  specialist: <User className="size-5" strokeWidth={1.5} aria-hidden />,
  prescription: <Package className="size-5" strokeWidth={1.5} aria-hidden />,
  test: <CheckCircle2 className="size-5" strokeWidth={1.5} aria-hidden />,
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "general", label: "General" },
  { id: "specialist", label: "Specialist" },
  { id: "prescription", label: "Prescriptions" },
  { id: "test", label: "Home tests" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

/** Desktop grid: 3 cols.
 *  Featured page:  row1 = featured(2col) + 1 card  → 3 slots
 *                  row2 = 3 cards                   → 3 slots  = 5 items per page
 *  Regular page:   row1 = 3 cards, row2 = 3 cards  = 6 items per page */
const PAGE_SIZE_FEATURED = 5;
const PAGE_SIZE_REGULAR = 6;

export function ServiceCatalog({
  services,
  intro,
}: {
  services: ServiceCatalogItem[];
  intro?: string;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [page, setPage] = useState(0);

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
      className="scroll-mt-24"
      style={{
        background: "var(--color-background-dark)",
        padding: "clamp(64px,8vw,120px) 0",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {/* Header */}
        <header className="grid items-end gap-8 lg:grid-cols-[1fr_auto] mb-12 md:mb-16">
          <div>
            <p
              className="text-[11px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--color-brand-accent)" }}
            >
              What we treat
            </p>
            <h2
              className="mt-4 max-w-[18ch] font-extrabold tracking-[-0.03em] leading-[1.02] text-white"
              style={{ fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)" }}
            >
              Care for what&apos;s actually going on.
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
                  aria-label="Previous services"
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
                  aria-label="Next services"
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

        <div
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
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceTile({
  service: s,
  variant,
}: {
  service: ServiceCatalogItem;
  variant: "default" | "featured";
}) {
  const isFeatured = variant === "featured";
  const symbol = currencySymbol(s.currency);

  /* ── Featured card — horizontal layout: image left | content right ── */
  if (isFeatured) {
    return (
      <Link
        href={s.href}
        className={cn(
          "group relative overflow-hidden text-left",
          "rounded-[var(--radius-card)]",
          "transition-[transform,box-shadow,border-color] duration-300",
          "ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:-translate-y-0.5",
          "focus-visible:outline-none",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          // Horizontal grid: image 40% | content 60%
          "grid grid-cols-1 sm:grid-cols-[2fr_3fr]",
        )}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          minHeight: 260,
        }}
      >
        {/* Image — fills full height of row */}
        <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
          {s.imageSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.imageSrc}
                alt={s.title}
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
        <div className="flex flex-col justify-between p-6 lg:p-8">
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
              Most patients start here. Same-day consultations with a doctor
              registered in your country, follow-up notes included.
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
                  From
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
                  {s.type === "test" ? "Turnaround" : "Duration"}
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.50)" }}>
                  {s.dur}
                </p>
              </div>
            </div>

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
                {s.type === "test" ? "Order kit" : "Book consultation"}
              </span>
              <ArrowUpRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0a1f14] motion-reduce:group-hover:translate-x-0"
                strokeWidth={1.5}
                aria-hidden
              />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  /* ── Default card — vertical stack ── */
  return (
    <Link
      href={s.href}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden text-left",
        "rounded-[var(--radius-card)]",
        "transition-[transform,box-shadow,border-color] duration-300",
        "ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-0.5",
        "focus-visible:outline-none",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      {/* Top: image or icon tile */}
      {s.imageSrc ? (
        <div className="relative overflow-hidden" style={{ height: 160 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.imageSrc}
            alt={s.title}
            className="block h-full w-full object-cover"
          />
          <span
            className="absolute right-3 top-3 uppercase rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.08em]"
            style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.80)" }}
          >
            {s.tag}
          </span>
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
                From
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
                {s.type === "test" ? "Turnaround" : "Duration"}
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
              {s.type === "test" ? "Order kit" : "Book consultation"}
            </span>
            <ArrowUpRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0a1f14] motion-reduce:group-hover:translate-x-0"
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
