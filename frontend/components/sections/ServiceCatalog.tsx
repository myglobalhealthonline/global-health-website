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

  if (services.length === 0) return null;

  const useFeaturedFirst = filter === "all" && shown.length >= 4;

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
              style={{ fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)" }}
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
            className="absolute right-3 top-3 uppercase rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.08em]"
            style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.80)" }}
          >
            {s.tag}
          </span>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-start justify-between p-5",
            isFeatured ? "min-h-[120px]" : "min-h-[88px]",
          )}
          style={{
            background: "rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-[var(--radius-tile)]",
              isFeatured ? "size-14" : "size-11",
            )}
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

      <div className={cn("flex flex-1 flex-col", isFeatured ? "p-7" : "p-6")}>
        <h3
          className={cn(
            "font-semibold tracking-[-0.015em]",
            isFeatured
              ? "text-[length:var(--text-h2)] leading-tight max-w-[14ch]"
              : "text-[length:var(--text-h3)] leading-snug",
          )}
          style={{ color: "rgba(255,255,255,0.88)" }}
        >
          {s.title}
        </h3>

        {isFeatured ? (
          <p
            className="mt-3 text-[length:var(--text-body)] leading-relaxed max-w-[40ch]"
            style={{ color: "rgba(255,255,255,0.70)" }}
          >
            Most patients start here. Same-day consultations with a doctor
            registered in your country, follow-up notes included.
          </p>
        ) : null}

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
                className={cn(
                  "font-semibold leading-none tracking-[-0.015em] [font-variant-numeric:tabular-nums]",
                  isFeatured ? "mt-2 text-3xl" : "mt-1 text-2xl",
                )}
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
              <p
                className="mt-1 text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
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
