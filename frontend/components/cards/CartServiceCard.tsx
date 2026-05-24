"use client";

import { Clock, Tag, Stethoscope, FlaskConical } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { CartItemKind } from "@/lib/api/cart-types";

/**
 * Matches the visual style of ServiceCard dark (full-bleed image with
 * gradient overlay, or glass card when no image) but renders an
 * AddToCartButton instead of a Link — used for prescriptions & tests.
 */
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
}: CartServiceCardProps) {
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
        className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]"
        style={{ minHeight: 400 }}
      >
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trimmed!}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(175deg, rgba(10,31,20,0.50) 0%, rgba(10,31,20,0.75) 45%, rgba(8,22,15,0.96) 100%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative flex h-full flex-col p-6 sm:p-7">
          {/* Icon circle */}
          <span
            className="inline-flex size-11 items-center justify-center rounded-full"
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <Icon className="size-5 text-white" strokeWidth={1.5} aria-hidden />
          </span>

          {/* Text + CTA pushed to bottom */}
          <div className="mt-auto pt-8">
            <h3
              className="text-2xl font-extrabold tracking-[-0.02em] leading-tight"
              style={{ color: "rgba(255,255,255,0.95)" }}
            >
              {title}
            </h3>
            {description ? (
              <p
                className="mt-2 text-sm leading-relaxed line-clamp-3"
                style={{ color: "rgba(255,255,255,0.52)" }}
              >
                {description}
              </p>
            ) : null}

            {chips.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {chips.map((c) =>
                  c.type === "price" ? (
                    <span
                      key={c.label}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                      style={{
                        background: "rgba(176,241,34,0.14)",
                        color: "var(--color-brand-accent)",
                      }}
                    >
                      <Tag className="size-3.5" aria-hidden />
                      {c.label}
                    </span>
                  ) : (
                    <span
                      key={c.label}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: "rgba(255,255,255,0.10)",
                        color: "rgba(255,255,255,0.75)",
                      }}
                    >
                      <Clock className="size-3.5" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                      {c.label}
                    </span>
                  )
                )}
              </div>
            ) : null}

            <div className="mt-5">
              {soldOut ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold cursor-not-allowed"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  Sold out
                </button>
              ) : (
                <AddToCartButton
                  kind={kind}
                  healthTestId={healthTestId}
                  serviceId={serviceId}
                  label={buttonLabel}
                />
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // No image — glass card (matches ServiceCard dark no-image variant)
  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div className="flex h-full flex-col p-6 sm:p-7">
        <h3
          className="text-lg font-bold tracking-[-0.01em]"
          style={{ color: "rgba(255,255,255,0.88)" }}
        >
          {title}
        </h3>
        {description ? (
          <p
            className="mt-2 flex-1 text-sm leading-relaxed line-clamp-3"
            style={{ color: "rgba(255,255,255,0.65)" }}
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
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
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

        <div className="mt-auto pt-5">
          {soldOut ? (
            <button
              type="button"
              disabled
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              Sold out
            </button>
          ) : (
            <AddToCartButton
              kind={kind}
              healthTestId={healthTestId}
              serviceId={serviceId}
              label={buttonLabel}
            />
          )}
        </div>
      </div>
    </article>
  );
}
