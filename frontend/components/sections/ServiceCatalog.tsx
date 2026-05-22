"use client";

/**
 * Filterable service catalogue. Bento layout: first card in a non-
 * filtered view spans 2x at lg+ so the page has a clear focal point
 * instead of N identical tiles. Per-type gradient stripes carry
 * visual identity without resorting to colour theme switches.
 */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { currencySymbol } from "@/lib/format-currency";
import {
  ArrowUpRight,
  CheckCircle2,
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
  /** Price in major-currency units (e.g. 50 for €50). Pass null if unknown. */
  price: number | null;
  currency?: string;
  /** Free-text duration (e.g. "30 min", "Sent home"). */
  dur: string;
  href: string;
  /** Optional uploaded hero image. */
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

  // Only show filter pills for service types that actually exist in the data,
  // plus the "all" pill. Avoids dead "Home tests (0)" chips in countries
  // without those services.
  const availableTypes = new Set(services.map((s) => s.type));
  const visibleFilters = FILTERS.filter(
    (f) => f.id === "all" || availableTypes.has(f.id as ServiceTileType),
  );

  if (services.length === 0) {
    return null;
  }

  // Featured layout: first card spans 2x at lg+ when we're showing
  // 4+ services with no filter applied. Filtered views go flat so a
  // single "Specialist" filter doesn't leave a 2x card hanging alone.
  const useFeaturedFirst = filter === "all" && shown.length >= 4;

  return (
    <section id="services" className="gh-section scroll-mt-24">
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {/* Header — eyebrow + heading + lede in one editorial block.
          * Three columns at lg so the head, sub-head and filter row
          * sit on one baseline; stacks at md. */}
        <header className="grid items-end gap-8 lg:grid-cols-[1fr_auto] mb-10 md:mb-14">
          <div>
            <p className="gh-eyebrow text-[var(--color-brand-primary)]">
              What we treat
            </p>
            <h2
              className="
                mt-3 max-w-[18ch]
                font-semibold tracking-[-0.025em] leading-[1.05]
                text-[var(--color-text-primary)]
                text-[clamp(2rem,4vw+0.5rem,3.5rem)]
              "
            >
              Care for what's actually going on.
            </h2>
            {intro ? (
              <p className="mt-5 max-w-[58ch] text-[length:var(--text-body-lg)] text-[var(--color-text-muted)]">
                {intro}
              </p>
            ) : null}
          </div>

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
                    onClick={() => setFilter(f.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2",
                      "text-[length:var(--text-meta)] font-semibold",
                      "transition-[background-color,border-color,color] duration-200",
                      "motion-reduce:transition-none",
                      isActive
                        ? "bg-[var(--color-brand-primary)] text-white border border-[var(--color-brand-primary)]"
                        : "bg-transparent text-[var(--color-text-body)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-background-soft)]",
                    )}
                  >
                    {f.label}
                    <span
                      className={cn(
                        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
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

const STRIPE_GRADIENTS: Record<ServiceTileType, string> = {
  general:
    "linear-gradient(135deg, #1B4D3E 0%, #2D6A5A 55%, #3F8770 100%)",
  specialist:
    "linear-gradient(135deg, #0F2E25 0%, #1B4D3E 60%, #2D6A5A 100%)",
  prescription:
    "linear-gradient(135deg, #143B30 0%, #1B4D3E 50%, #143B30 100%)",
  test:
    "linear-gradient(135deg, #C8E6A0 0%, #B0F122 60%, #C8E6A0 100%)",
};

function ServiceTile({
  service: s,
  variant,
}: {
  service: ServiceCatalogItem;
  variant: "default" | "featured";
}) {
  const isFeatured = variant === "featured";
  const stripeBg = STRIPE_GRADIENTS[s.type];
  const stripeFg = s.type === "test" ? "var(--color-background-dark)" : "#fff";
  const symbol = currencySymbol(s.currency);

  return (
    <Link
      href={s.href}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden text-left",
        "rounded-[var(--radius-card)]",
        "border border-[var(--color-border)]",
        "bg-[var(--color-background-page)]",
        "shadow-[var(--shadow-soft)]",
        "transition-[transform,box-shadow,border-color] duration-300",
        "ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-0.5",
        "hover:border-[var(--color-border-strong)]",
        "hover:shadow-[var(--shadow-card-hover)]",
        "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
    >
      {/* Top stripe — image when admin uploaded one, otherwise a
        * gradient + icon + tag combo that's still visually distinct
        * per service type. Featured cards get a taller stripe so the
        * card has more presence. */}
      {s.imageSrc ? (
        <div
          className="relative overflow-hidden"
          style={{ height: isFeatured ? 240 : 160 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.imageSrc}
            alt={s.title}
            className="block h-full w-full object-cover"
          />
          <span
            className="
              absolute right-3 top-3 uppercase
              rounded-full px-2.5 py-1
              text-[10px] font-bold tracking-[0.08em]
              bg-black/55 text-white
            "
          >
            {s.tag}
          </span>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-start justify-between overflow-hidden p-5",
            isFeatured ? "h-[160px]" : "h-[110px]",
          )}
          style={{ background: stripeBg, color: stripeFg }}
        >
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-2xl",
              isFeatured ? "size-14" : "size-11",
              s.type === "test"
                ? "bg-[rgba(20,59,48,0.12)]"
                : "bg-white/16",
            )}
          >
            {DEFAULT_ICONS[s.type]}
          </span>
          <span
            className={cn(
              "uppercase rounded-full px-2.5 py-1",
              "text-[10px] font-bold tracking-[0.08em]",
              s.type === "test"
                ? "bg-[rgba(20,59,48,0.12)] text-[var(--color-background-dark)]"
                : "bg-white/16 text-white",
            )}
          >
            {s.tag}
          </span>
        </div>
      )}

      <div className={cn("flex flex-1 flex-col", isFeatured ? "p-7" : "p-6")}>
        <h3
          className={cn(
            "font-semibold tracking-[-0.015em]",
            "text-[var(--color-text-primary)]",
            isFeatured
              ? "text-[length:var(--text-h2)] leading-tight max-w-[14ch]"
              : "text-[length:var(--text-h3)] leading-snug",
          )}
        >
          {s.title}
        </h3>

        {isFeatured ? (
          <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)] max-w-[40ch]">
            Most patients start here. Same-day consultations with a doctor
            registered in your country, follow-up notes included.
          </p>
        ) : null}

        {/* Footer — price / time on one row, then a forest pill that
          * spans full width acts as the primary action plane. */}
        <div className="mt-auto pt-6">
          <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
            <div>
              <p className="gh-eyebrow text-[var(--color-text-muted)]">From</p>
              <p
                className={cn(
                  "font-semibold leading-none tracking-[-0.015em]",
                  "text-[var(--color-text-primary)] [font-variant-numeric:tabular-nums]",
                  isFeatured ? "mt-2 text-3xl" : "mt-1 text-2xl",
                )}
              >
                {s.price == null ? "—" : `${symbol}${s.price}`}
              </p>
            </div>
            <div className="text-right">
              <p className="gh-eyebrow text-[var(--color-text-muted)]">
                {s.type === "test" ? "Turnaround" : "Duration"}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-body)]">
                {s.dur}
              </p>
            </div>
          </div>

          <span
            className="
              mt-4 inline-flex items-center justify-between gap-2
              w-full rounded-full
              border border-[var(--color-border-strong)]
              px-4 py-2.5
              text-[length:var(--text-meta)] font-semibold
              text-[var(--color-brand-primary)]
              transition-colors duration-200
              group-hover:bg-[var(--color-brand-primary)]
              group-hover:text-white
              group-hover:border-[var(--color-brand-primary)]
              motion-reduce:transition-none
            "
          >
            {s.type === "test" ? "Order kit" : "Book consultation"}
            <ArrowUpRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
