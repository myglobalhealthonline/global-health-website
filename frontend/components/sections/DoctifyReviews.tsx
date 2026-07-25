"use client";

import { useEffect, useId, useState } from "react";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import {
  openCookiePreferences,
  readConsent,
  writeConsent,
} from "@/components/compliance/cookie-consent";
import { useConsent } from "@/components/compliance/use-consent";
import { SectionSeam } from "@/components/ui/SectionSeam";

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
 *
 * Every widget that injects a doctify.com script or iframe is gated on the
 * "third-party content" consent category. The gate lives on each leaf rather
 * than on DoctifyReviewsLazy because DoctifyReviewsSection renders
 * DoctifyRatingStrip directly — a wrapper-level gate would miss it.
 */

const TENANT = "athena-ie";
const SLUG = "global-health-ireland";

/** Doctify's widget scripts hijack the single global `window.onresize`
 *  (a plain assignment, not `addEventListener`) to reposition/redraw their
 *  carousel. If the container that handler was built for is gone — this
 *  component unmounted, or React's dev-mode double-effect-invoke tore down
 *  and rebuilt it — the stale closure still fires on the next resize and
 *  throws reading properties off DOM nodes that no longer exist. Nothing
 *  else in this app sets window.onresize, so clearing it here is safe and
 *  kills the dangling-handler crash for good. */
function cleanupDoctifyScript(script: HTMLScriptElement) {
  script.remove();
  window.onresize = null;
}

/** Soft ivory background color that matches the site's --color-background-soft */
const ITEM_BG = "f6f8f1";

function useDoctifyId(): string {
  // Doctify accepts any container id; useId is stable across SSR/CSR and
  // unique per instance so multiple widgets can coexist on one page.
  return "doctify" + useId().replace(/[^a-zA-Z0-9]/g, "");
}

/** True only once consent is known AND third-party content is allowed.
 *  Un-resolved consent reads as "not allowed", so SSR and the first client
 *  paint agree and nothing loads before the visitor has decided. */
function useDoctifyAllowed(): boolean {
  const { consent, ready } = useConsent();
  return ready && consent?.thirdParty === true;
}

/**
 * Shown in place of a widget when third-party content is refused. "Load
 * reviews" grants the category outright (and persists it), so the choice
 * sticks across pages instead of being a per-view escape hatch that keeps
 * asking. Marketing consent is left exactly as it was.
 */
function DoctifyPlaceholder({
  language,
  minHeightClass,
  onDark = false,
  className,
}: {
  language: string;
  minHeightClass: string;
  onDark?: boolean;
  className?: string;
}) {
  const t = getCommonLocale(resolveLocale({ explicitLocale: language })).cookie;

  function allowThirdParty() {
    const existing = readConsent();
    writeConsent({
      marketing: existing?.marketing === true,
      thirdParty: true,
      analytics: existing?.analytics === true,
    });
  }

  return (
    <div
      className={`gh-cookie-placeholder ${onDark ? "gh-cookie-placeholder-dark" : ""} ${minHeightClass} ${className ?? ""}`}
    >
      <p className="gh-cookie-placeholder-title">{t.doctifyBlockedTitle}</p>
      <p className="gh-cookie-placeholder-body">{t.doctifyBlockedBody}</p>
      <div className="gh-cookie-placeholder-actions">
        <button
          type="button"
          onClick={allowThirdParty}
          className={onDark ? "gh2-btn-lime" : "gh-btn gh-btn-primary"}
        >
          {t.doctifyLoad}
        </button>
        <button
          type="button"
          onClick={openCookiePreferences}
          className={onDark ? "gh-cookie-link" : "text-sm font-semibold text-[var(--color-brand-primary)] underline"}
        >
          {t.settingsLink}
        </button>
      </div>
    </div>
  );
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
  const allowed = useDoctifyAllowed();

  useEffect(() => {
    if (!allowed) return;
    const script = document.createElement("script");
    script.src = `https://www.doctify.com/wv2/doctify-widget-autoresize-plugin.js?tenantId=${TENANT}&widgetName=average-carousel-rating-widget&containerId=${id}`;
    script.async = true;
    document.body.appendChild(script);
    return () => cleanupDoctifyScript(script);
  }, [id, allowed]);

  if (!allowed) {
    return (
      <DoctifyPlaceholder
        language={language}
        minHeightClass="min-h-[160px]"
        onDark={onDark}
        className={className}
      />
    );
  }

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
      className={`doctify-widget block min-h-[160px] w-full border-0 ${className ?? ""}`}
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
  const allowed = useDoctifyAllowed();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!allowed) return;
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
      cleanupDoctifyScript(script);
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    };
  }, [id, variant, language, theme, allowed]);

  const minHeightClass =
    variant === "micro"
      ? "min-h-[48px]"
      : variant === "horizontal"
        ? "min-h-[120px]"
        : variant === "grid"
          ? "min-h-[400px]"
          : "min-h-[320px]";

  if (!allowed) {
    return (
      <DoctifyPlaceholder
        language={language}
        minHeightClass={minHeightClass}
        onDark={theme === "dark"}
        className={className}
      />
    );
  }

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
          ? "gh-inline-clamp-section relative gh2-section-forest gh-medical-pattern gh-medical-pattern-dark"
          : "gh-inline-clamp-section relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
      }
    >
      <SectionSeam theme={dark ? "dark" : "light"} />
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
  const allowed = useDoctifyAllowed();

  useEffect(() => {
    if (!allowed) return;
    const script = document.createElement("script");
    script.src = `https://www.doctify.com/wv2/doctify-widget-autoresize-plugin.js?tenantId=${TENANT}&widgetName=average-carousel-rating-widget&containerId=${id}`;
    script.async = true;
    document.body.appendChild(script);
    return () => cleanupDoctifyScript(script);
  }, [id, allowed]);

  if (!allowed) {
    return (
      <DoctifyPlaceholder
        language={language}
        minHeightClass="min-h-[120px]"
        onDark
        className={className}
      />
    );
  }

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
      className={`doctify-widget block min-h-[120px] w-full border-0 ${className ?? ""}`}
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
