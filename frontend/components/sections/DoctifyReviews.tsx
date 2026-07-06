"use client";

import { useEffect, useId, useState } from "react";

/**
 * Doctify review widgets (practice: Global Health Ireland, tenant athena-ie).
 * Three embeddable variants re-skinned to the gh2 design system:
 *
 *  - <DoctifyRatingStrip />  — compact average-rating carousel (iframe),
 *    theme-transparent so it sits on forest or ivory bands.
 *  - <DoctifyWidget />       — script-injected horizontal / carousel / grid
 *    widget with soft ivory review cards (matches gh2-card-ivory surfaces).
 *  - <DoctifyReviewsSection /> — full section wrapper (forest or ivory)
 *    with the standard eyebrow + headline treatment.
 */

const TENANT = "athena-ie";
const SLUG = "global-health-ireland";

/** Soft ivory background color that matches the site's --color-background-soft */
const ITEM_BG = "f6f8f1";

function useDoctifyId(): string {
  // Doctify accepts any container id; useId is stable across SSR/CSR and
  // unique per instance so multiple widgets can coexist on one page.
  return "doctify" + useId().replace(/[^a-zA-Z0-9]/g, "");
}

/* ── Compact average-rating strip (iframe + autoresize plugin) ── */

export function DoctifyRatingStrip({
  onDark = false,
  language = "en",
  className,
}: {
  onDark?: boolean;
  language?: string;
  className?: string;
}) {
  const id = useDoctifyId();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://www.doctify.com/wv2/doctify-widget-autoresize-plugin.js?tenantId=${TENANT}&widgetName=average-carousel-rating-widget&containerId=${id}`;
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, [id]);

  const src =
    `https://www.doctify.com/wv2/average-carousel-rating-widget?containerId=${id}` +
    `&dotsArrowsColor=${onDark ? "FFFFFF" : "1D4B36"}&language=${language}` +
    `&profileType=practice&slugs=${SLUG}&tenantId=${TENANT}` +
    `&theme=${onDark ? "ivory" : "transparent"}&widgetName=average-carousel-rating-widget`;

  return (
    <iframe
      id={id}
      src={src}
      title="Doctify patient reviews"
      name="average-carousel-rating-widget"
      className={`doctify-widget block min-h-[120px] w-full border-0 ${className ?? ""}`}
      loading="lazy"
      scrolling="no"
    />
  );
}

/* ── Script-injected widgets (horizontal badge / carousel / grid) ── */

export type DoctifyWidgetVariant = "horizontal" | "carousel" | "grid" | "micro";

const VARIANT_QUERY: Record<DoctifyWidgetVariant, string> = {
  micro: "type=micro-star-widget&layoutType=layoutI",
  horizontal: "type=horizontal-widget&layoutType=layoutXL",
  carousel:
    `type=carousel-widget&layoutType=layoutA&itemBackground=${ITEM_BG}&itemFrame=true`,
  grid:
    `type=grid-widget&layoutType=layoutA&itemBackground=${ITEM_BG}&itemFrame=true`,
};

export function DoctifyWidget({
  variant,
  language = "en",
  className,
  theme = "light",
}: {
  variant: DoctifyWidgetVariant;
  language?: string;
  className?: string;
  theme?: "light" | "dark";
}) {
  const id = useDoctifyId();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = document.getElementById(id);
    if (!container) return;
    
    // Clear any previous content
    container.innerHTML = "";
    
    const script = document.createElement("script");
    script.src =
      `https://www.doctify.com/get-script?widget_container_id=${id}` +
      `&${VARIANT_QUERY[variant]}&tenant=${TENANT}&language=${language}` +
      `&profileType=practice&slugs=${SLUG}&background=${theme === "dark" ? "ivory" : "transparent"}`;
    script.async = true;
    script.onload = () => setLoaded(true);
    
    document.body.appendChild(script);
    
    // Fallback: if script doesn't trigger load, show container after delay
    const timer = setTimeout(() => setLoaded(true), 3000);
    
    return () => {
      clearTimeout(timer);
      script.remove();
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    };
  }, [id, variant, language, theme]);

  const minHeightClass =
    variant === "micro"
      ? "min-h-[48px]"
      : variant === "horizontal"
        ? "min-h-[120px]"
        : variant === "grid"
          ? "min-h-[400px]"
          : "min-h-[320px]";

  return (
    <div
      id={id}
      className={`doctify-widget-container relative w-full ${minHeightClass} transition-opacity duration-500 ease-in-out ${className ?? ""} ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

/* ── Full section wrapper — gh2 forest / ivory treatments ── */

export function DoctifyReviewsSection({
  theme = "ivory",
  variant = "carousel",
  language = "en",
  eyebrow = "Patient reviews",
  headline = "Rated by real patients",
  headlineAccent = "on Doctify",
  body = "Independent, verified reviews collected by Doctify from patients treated by our clinicians.",
}: {
  theme?: "ivory" | "forest";
  variant?: DoctifyWidgetVariant;
  language?: string;
  eyebrow?: string;
  headline?: string;
  headlineAccent?: string;
  body?: string;
}) {
  const dark = theme === "forest";
  return (
    <section
      className={
        dark
          ? "gh-inline-clamp-section border-t border-white/6 gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          : "gh-inline-clamp-section relative overflow-hidden border-t border-[var(--color-border)] gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
      }
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="mb-10 md:mb-12">
          <span
            className={dark
              ? "text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-accent)]"
              : "text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]"}
          >
            {eyebrow}
          </span>
          <h2
            className={dark
              ? "mt-3 max-w-[24ch] text-[clamp(1.9rem,3.5vw+0.4rem,3rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-white/92"
              : "mt-3 max-w-[24ch] text-[clamp(1.9rem,3.5vw+0.4rem,3rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-[var(--color-text-primary)]"}
          >
            {headline}{" "}
            <span
              className={dark ? "text-[var(--color-brand-accent)]" : "text-[var(--color-brand-primary)]"}
            >
              {headlineAccent}
            </span>
          </h2>
          <p
            className={dark
              ? "mt-4 max-w-[54ch] text-[15px] leading-relaxed text-[var(--gh2-on-dark-muted)]"
              : "mt-4 max-w-[54ch] text-[15px] leading-relaxed text-[var(--color-text-muted)]"}
          >
            {body}
          </p>
        </div>

        {dark ? (
          <div
            className="gh2-glass-forest overflow-hidden rounded-[var(--radius-card)] p-4 md:p-6"
          >
            <DoctifyRatingStrip onDark language={language} />
          </div>
        ) : (
          <DoctifyWidget
            variant={variant}
            language={language}
            theme={dark ? "dark" : "light"}
          />
        )}
      </div>
    </section>
  );
}

/* ── Compact inline rating strip — for hero sections and social proof bars ── */

export function DoctifyInlineRating({
  language = "en",
  className,
}: {
  language?: string;
  className?: string;
}) {
  const id = useDoctifyId();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://www.doctify.com/wv2/doctify-widget-autoresize-plugin.js?tenantId=${TENANT}&widgetName=average-carousel-rating-widget&containerId=${id}`;
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, [id]);

  const src =
    `https://www.doctify.com/wv2/average-carousel-rating-widget?containerId=${id}` +
    `&dotsArrowsColor=FFFFFF&language=${language}` +
    `&profileType=practice&slugs=${SLUG}&tenantId=${TENANT}` +
    `&theme=transparent&widgetName=average-carousel-rating-widget`;

  return (
    <iframe
      id={id}
      src={src}
      title="Doctify patient reviews"
      name="average-carousel-rating-widget"
      className={`doctify-widget block min-h-[100px] w-full border-0 ${className ?? ""}`}
      loading="lazy"
      scrolling="no"
    />
  );
}

/* ── Social proof band — compact horizontal widget for light backgrounds ── */

export function DoctifySocialProof({
  language = "en",
  className,
}: {
  language?: string;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto max-w-[var(--container-width)] px-5 md:px-10 ${className ?? ""}`}
    >
      <DoctifyWidget variant="horizontal" language={language} />
    </div>
  );
}
