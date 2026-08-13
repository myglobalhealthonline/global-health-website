"use client";

import type React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Tag, Stethoscope, FlaskConical } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { CartItemKind } from "@/lib/api/cart-types";

/**
 * Matches the visual style of ServiceCard dark (full-bleed image with
 * gradient overlay, or glass card when no image) but renders an
 * AddToCartButton instead of a Link — used for prescriptions & tests.
 */
type CartI18n = {
  adding: string;
  added: string;
  addToCart: string;
  couldNotAdd: string;
  viewCart: string;
  soldOut?: string;
};

type CartServiceCardProps = {
  title: string;
  description?: string | null;
  imageSrc?: string | null;
  /** Chips row */
  duration?: string | null;
  startingPrice?: string | null;
  sampleType?: string | null;
  resultsTimeline?: string | null;
  /** Cart integration */
  kind: CartItemKind;
  healthTestId?: string;
  serviceId?: string;
  ctaLabel?: string;
  soldOut?: boolean;
  lowStock?: number | null;
  /** Icon variant */
  iconVariant?: "stethoscope" | "flask";
  /** When set, a "Learn more" link to the detail page renders beside the
   *  Add-to-cart button (two-CTA mode for health-test cards). */
  detailHref?: string;
  detailLabel?: string;
  i18n?: CartI18n;
};

export function CartServiceCard({
  title,
  description,
  imageSrc,
  duration,
  startingPrice,
  sampleType,
  resultsTimeline,
  kind,
  healthTestId,
  serviceId,
  ctaLabel,
  soldOut = false,
  lowStock,
  iconVariant = "stethoscope",
  detailHref,
  detailLabel = "Learn more",
  i18n,
}: CartServiceCardProps) {
  const soldOutLabel = i18n?.soldOut ?? "Sold out";
  const trimmed = imageSrc?.trim();
  const hasImage = Boolean(trimmed);
  const Icon = iconVariant === "flask" ? FlaskConical : Stethoscope;

  const chips = [
    duration ? { label: duration, type: "meta" as const } : null,
    sampleType ? { label: `Sample: ${sampleType}`, type: "meta" as const } : null,
    resultsTimeline ? { label: `Results: ${resultsTimeline}`, type: "meta" as const } : null,
    startingPrice ? { label: startingPrice, type: "price" as const } : null,
  ].filter(Boolean) as { label: string; type: "meta" | "price" }[];

  const buttonLabel = soldOut
    ? "Sold out"
    : lowStock != null
      ? ctaLabel ?? `Add to cart · Only ${lowStock} left`
      : ctaLabel;

  if (hasImage) {
    return (
      <article
        className="group relative flex h-full flex-col overflow-hidden gh2-glass-forest motion-reduce:transition-none"
        data-soldout={soldOut || undefined}
      >
        {/* Product photo */}
        <div
          className={`relative overflow-hidden ${soldOut ? "opacity-60" : ""}`}
          style={{ aspectRatio: "16 / 10" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trimmed!}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-16"
            style={{ background: "linear-gradient(180deg, transparent 0%, rgba(13,38,30,0.55) 100%)" }}
          />
          {/* Price chip — top-right overlay */}
          {startingPrice ? (
            <span
              className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${soldOut ? "line-through" : ""}`}
              style={{
                background: "var(--color-brand-accent)",
                color: "#0a1f14",
                boxShadow: "0 1px 5px rgba(176,241,34,0.14)",
              }}
            >
              <Tag className="size-3.5" aria-hidden />
              {startingPrice}
            </span>
          ) : null}
          {/* Icon circle — bottom-left overlay */}
          <span
            className="absolute bottom-3 left-3 inline-flex size-10 items-center justify-center rounded-full"
            style={{
              background: "rgba(10,31,20,0.65)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <Icon className="size-[18px] text-white" strokeWidth={1.5} aria-hidden />
          </span>
        </div>

        {/* Body */}
        <div className="relative flex flex-1 flex-col p-5 sm:p-6">
          <h3
            className="text-xl font-extrabold tracking-[-0.02em] leading-tight"
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            {title}
          </h3>
          {description ? (
            <p
              className="mt-2 text-sm leading-relaxed line-clamp-2"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              {description}
            </p>
          ) : null}

          {chips.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips
                .filter((c) => c.type !== "price")
                .map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.75)",
                    }}
                  >
                    <Clock className="size-3.5" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                    {c.label}
                  </span>
                ))}
            </div>
          ) : null}

          <div className="mt-auto pt-6">
            <div className="space-y-2.5">
              {soldOut ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  {soldOutLabel}
                </button>
              ) : (
                <AddToCartButton
                  kind={kind}
                  healthTestId={healthTestId}
                  serviceId={serviceId}
                  label={buttonLabel}
                  i18n={i18n}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-extrabold tracking-[-0.005em] transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  style={{
                    background: "var(--color-brand-accent)",
                    color: "#0a1f14",
                    boxShadow: "0 8px 12px -2px rgba(176,241,34,0.14)",
                  } as React.CSSProperties}
                />
              )}
              {detailHref ? (
                <Link
                  href={detailHref}
                  className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/[0.06] px-5 text-sm font-bold tracking-[-0.005em] text-white/90 transition-[background-color,color] duration-200 hover:bg-white hover:text-[var(--color-brand-primary)]"
                >
                  {detailLabel}
                  {/* sr-only suffix (not aria-label): SEO/a11y anchor-text
                      audits read visible/text content only, so an aria-label
                      alone still flags "Learn more" as generic — matches
                      ServiceCard's TwoActions pattern. */}
                  <span className="sr-only">: {title}</span>
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // No image — glass card (matches ServiceCard dark no-image variant)
  return (
    <article className="group flex h-full flex-col overflow-hidden gh2-glass-forest" data-soldout={soldOut || undefined}>
      <div className={`flex h-full flex-col p-6 sm:p-7 ${soldOut ? "opacity-60" : ""}`}>
        <h3
          className="text-lg font-bold tracking-[-0.01em]"
          style={{ color: "rgba(255,255,255,0.88)" }}
        >
          {title}
        </h3>
        {description ? (
          <p
            className="mt-2 flex-1 text-sm leading-relaxed line-clamp-3"
            style={{ color: "rgba(255,255,255,0.72)" }}
          >
            {description}
          </p>
        ) : null}

        {chips.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {chips.map((c) =>
              c.type === "price" ? (
                <span
                  key={c.label}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${soldOut ? "line-through" : ""}`}
                  style={{
                    background: "rgba(176,241,34,0.12)",
                    color: "var(--color-brand-accent)",
                  }}
                >
                  <Tag className="size-3.5" aria-hidden />
                  {c.label}
                </span>
              ) : (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.70)",
                  }}
                >
                  <Clock className="size-3.5" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                  {c.label}
                </span>
              )
            )}
          </div>
        ) : null}

        <div className="mt-auto space-y-2.5 pt-6">
          {soldOut ? (
            <button
              type="button"
              disabled
              className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              {soldOutLabel}
            </button>
          ) : (
            <AddToCartButton
              kind={kind}
              healthTestId={healthTestId}
              serviceId={serviceId}
              label={buttonLabel}
              i18n={i18n}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-extrabold tracking-[-0.005em] transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              style={{
                background: "var(--color-brand-accent)",
                color: "#0a1f14",
                boxShadow: "0 4px 12px rgba(176,241,34,0.14)",
              } as React.CSSProperties}
            />
          )}
          {detailHref ? (
            <Link
              href={detailHref}
              className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/[0.06] px-5 text-sm font-bold tracking-[-0.005em] text-white/90 transition-[background-color,color] duration-200 hover:bg-white hover:text-[var(--color-brand-primary)]"
            >
              {detailLabel}
              <span className="sr-only">: {title}</span>
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
