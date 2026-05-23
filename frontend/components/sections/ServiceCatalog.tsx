"use client";

/**
 * Filterable service catalogue — dark luxury version.
 * 5 cards visible at once. Prev/Next arrows appear when there are more.
 * Featured (first) card takes 2 slot-widths; regular cards take 1.
 */

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
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

/** Gap between cards in pixels — must match the gap-6 (24px) on the track. */
const GAP = 24;
/** Cards visible at once (in regular-card slot units). */
const VISIBLE_SLOTS = 5;

export function ServiceCatalog({
  services,
  intro,
}: {
  services: ServiceCatalogItem[];
  intro?: string;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const shown =
    filter === "all" ? services : services.filter((s) => s.type === filter);

  const availableTypes = new Set(services.map((s) => s.type));
  const visibleFilters = FILTERS.filter(
    (f) => f.id === "all" || availableTypes.has(f.id as ServiceTileType),
  );

  // Featured first only on "all" tab and when enough cards exist
  const useFeaturedFirst = filter === "all" && shown.length >= 4;

  // Carousel state
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
    el.scrollLeft = 0;
    // rAF lets the DOM settle after filter change before measuring
    requestAnimationFrame(updateArrows);
  }, [filter, shown.length, updateArrows]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
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
    const card = el.querySelector<HTMLElement>("[data-service-card]");
    if (!card) return;
    const step = card.offsetWidth + GAP;
    el.scrollBy({ left: direction === "next" ? step : -step, behavior: "smooth" });
  }

  // Featured card = 2 slots, regular = 1. Show arrows when total slots > VISIBLE_SLOTS.
  const totalSlots = useFeaturedFirst
    ? 2 + (shown.length - 1) // featured=2, rest=1 each
    : shown.length;
  const showArrows = totalSlots > VISIBLE_SLOTS;

  if (services.length === 0) return null;

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

        {/* ── Header row ── */}
        <header className="mb-10 md:mb-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p
                className="text-[11px] font-bold tracking-[0.2em] uppercase"
                style={{ color: "var(--color-brand-accent)" }}
              >
                What we treat
              </p>
              <h2
                className="mt-4 max-w-[18ch] font-extrabold tracking-[-0.03em] leading-[1.02] text-white text-[length:var(--text-h1)]"
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

            {/* Filter pills + carousel arrows — stacked right column */}
            <div className="flex flex-col items-end gap-4">
              {visibleFilters.length > 2 ? (
                <div className="flex flex-wrap justify-end gap-2">
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
                        onClick={() => setFilter(f.id)}
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

              {/* Arrows — only when cards overflow */}
              {showArrows && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollBy("prev")}
                    disabled={!canPrev}
                    aria-label="Previous services"
                    className="inline-flex size-10 items-center justify-center rounded-full border transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: canPrev ? "var(--color-brand-accent)" : "rgba(255,255,255,0.06)",
                      borderColor: canPrev ? "var(--color-brand-accent)" : "rgba(255,255,255,0.18)",
                      color: canPrev ? "#0a1f14" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollBy("next")}
                    disabled={!canNext}
                    aria-label="Next services"
                    className="inline-flex size-10 items-center justify-center rounded-full border transition-[background-color,border-color,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: canNext ? "var(--color-brand-accent)" : "rgba(255,255,255,0.06)",
                      borderColor: canNext ? "var(--color-brand-accent)" : "rgba(255,255,255,0.18)",
                      color: canNext ? "#0a1f14" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Scroll track ── */}
        <div
          ref={trackRef}
          className="gh-service-track flex gap-6 overflow-x-auto"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollSnapType: "x mandatory",
            paddingBottom: 4,
          }}
        >
          {shown.map((s, i) => {
            const isFeatured = useFeaturedFirst && i === 0;
            return (
              <div
                key={`${s.type}-${s.title}-${s.href}`}
                data-service-card
                className="shrink-0"
                style={{
                  /* Regular slot = (100% - 4 gaps) / 5
                   * Featured slot = 2× regular + 1 gap   */
                  width: isFeatured
                    ? `calc((100% - ${(VISIBLE_SLOTS - 1) * GAP}px) / ${VISIBLE_SLOTS} * 2 + ${GAP}px)`
                    : `calc((100% - ${(VISIBLE_SLOTS - 1) * GAP}px) / ${VISIBLE_SLOTS})`,
                  minWidth: isFeatured ? 360 : 220,
                  maxWidth: isFeatured ? 640 : 340,
                  scrollSnapAlign: "start",
                }}
              >
                <ServiceTile service={s} variant={isFeatured ? "featured" : "default"} />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .gh-service-track::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Service tile — featured (horizontal) and default (vertical)     */
/* ─────────────────────────────────────────────────────────────── */

function ServiceTile({
  service: s,
  variant,
}: {
  service: ServiceCatalogItem;
  variant: "default" | "featured";
}) {
  const isFeatured = variant === "featured";
  const symbol = currencySymbol(s.currency);

  /* ── Featured card — horizontal: image left | content right ── */
  if (isFeatured) {
    return (
      <Link
        href={s.href}
        className={cn(
          "group relative overflow-hidden text-left h-full",
          "rounded-[var(--radius-card)]",
          "transition-[transform,box-shadow,border-color] duration-300",
          "ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:-translate-y-0.5",
          "focus-visible:outline-none",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          "grid grid-cols-1 sm:grid-cols-[2fr_3fr]",
        )}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          minHeight: 260,
        }}
      >
        {/* Image */}
        <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
          {s.imageSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.imageSrc}
                alt={s.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
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
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.50)" }}>
                  From
                </p>
                <p className="mt-1 text-3xl font-semibold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]" style={{ color: "rgba(255,255,255,0.92)" }}>
                  {s.price == null ? "—" : `${symbol}${s.price}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.50)" }}>
                  {s.type === "test" ? "Turnaround" : "Duration"}
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.50)" }}>
                  {s.dur}
                </p>
              </div>
            </div>
            <span
              className="mt-4 inline-flex items-center justify-between gap-2 w-full rounded-full px-5 py-3 text-[length:var(--text-meta)] font-semibold transition-all duration-200 group-hover:bg-[var(--color-brand-accent)] motion-reduce:transition-none"
              style={{ border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.70)" }}
            >
              <span className="group-hover:text-[#0a1f14] transition-colors duration-200">
                {s.type === "test" ? "Order kit" : "Book consultation"}
              </span>
              <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0a1f14] motion-reduce:group-hover:translate-x-0" strokeWidth={1.5} aria-hidden />
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
          <img src={s.imageSrc} alt={s.title} className="block h-full w-full object-cover" />
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
          style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span
            className="inline-flex size-11 items-center justify-center rounded-[var(--radius-tile)]"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--color-brand-accent)" }}
          >
            {DEFAULT_ICONS[s.type]}
          </span>
          <span
            className="uppercase rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.08em]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}
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
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.60)" }}>
                From
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none tracking-[-0.015em] [font-variant-numeric:tabular-nums]" style={{ color: "rgba(255,255,255,0.88)" }}>
                {s.price == null ? "—" : `${symbol}${s.price}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.60)" }}>
                {s.type === "test" ? "Turnaround" : "Duration"}
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
                {s.dur}
              </p>
            </div>
          </div>

          <span
            className="mt-4 inline-flex items-center justify-between gap-2 w-full rounded-full px-4 py-2.5 text-[length:var(--text-meta)] font-semibold transition-all duration-200 group-hover:bg-[var(--color-brand-accent)] motion-reduce:transition-none"
            style={{ border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.70)" }}
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
