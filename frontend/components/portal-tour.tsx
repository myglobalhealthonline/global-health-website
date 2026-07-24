"use client";

/**
 * PortalTour — hand-rolled onboarding spotlight tour for the patient/doctor
 * portals. No new dependency: createPortal + fixed-position divs.
 *
 * Auto-starts once per browser (localStorage[storageKey]) and can be
 * restarted from the sidebar via `window.dispatchEvent(new Event("gh:tour:start"))`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TourStep = {
  /** data-tour attribute value to spotlight; omit for a centered welcome card. */
  target?: string;
  title: string;
  body: string;
};

export type TourLabels = {
  next: string;
  back: string;
  done: string;
  skip: string;
  /** e.g. "{current} / {total}" */
  progress: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const MOBILE_BREAKPOINT = 640;

function isVisible(el: Element): boolean {
  const htmlEl = el as HTMLElement;
  if (htmlEl.offsetParent !== null) return true;
  // offsetParent is null for fixed-position elements even when visible.
  return getComputedStyle(htmlEl).position === "fixed";
}

export function PortalTour({
  steps,
  labels,
  storageKey,
}: {
  steps: TourStep[];
  labels: TourLabels;
  storageKey: string;
}) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const targetElRef = useRef<Element | null>(null);

  useEffect(() => setMounted(true), []);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ponytail: storage can throw in locked-down browsers — tour just
      // won't remember dismissal, not worth a fallback store.
    }
    setActive(false);
    targetElRef.current = null;
  }, [storageKey]);

  useEffect(() => {
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(storageKey);
    } catch {
      seen = "1";
    }
    const timer = seen === null ? window.setTimeout(start, 600) : undefined;
    const onStart = () => start();
    window.addEventListener("gh:tour:start", onStart);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("gh:tour:start", onStart);
    };
  }, [storageKey, start]);

  // Resolve the current step's target, skipping steps whose element is
  // missing/hidden. Loop-guarded: if every remaining step skips, end tour.
  useEffect(() => {
    if (!active) return;
    let idx = stepIndex;
    let guard = 0;
    while (idx < steps.length && guard <= steps.length) {
      const step = steps[idx];
      if (!step.target) {
        targetElRef.current = null;
        setRect(null);
        if (idx !== stepIndex) setStepIndex(idx);
        return;
      }
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el && isVisible(el)) {
        targetElRef.current = el;
        if (idx !== stepIndex) setStepIndex(idx);
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        const measure = () => {
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        };
        const t = window.setTimeout(measure, 350);
        return () => window.clearTimeout(t);
      }
      idx += 1;
      guard += 1;
    }
    // Nothing left to show.
    finish();
  }, [active, stepIndex, steps, finish]);

  // Recompute rect on resize/scroll while a target step is showing.
  useEffect(() => {
    if (!active || !targetElRef.current) return;
    let raf = 0;
    const recompute = () => {
      raf = 0;
      const el = targetElRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const onEvent = () => {
      if (raf) return;
      raf = requestAnimationFrame(recompute);
    };
    window.addEventListener("resize", onEvent, { passive: true });
    window.addEventListener("scroll", onEvent, { passive: true, capture: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onEvent);
      window.removeEventListener("scroll", onEvent, { capture: true });
    };
  }, [active, stepIndex]);

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, steps.length, finish]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (!active) return;
    cardRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, stepIndex, finish, goNext, goBack]);

  if (!mounted || !active) return null;

  const step = steps[stepIndex];
  if (!step) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
  const progressText = labels.progress
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(steps.length));

  const cardStyle: React.CSSProperties = {};
  if (isMobile) {
    cardStyle.left = 12;
    cardStyle.right = 12;
    cardStyle.bottom = 12;
    cardStyle.width = "auto";
    cardStyle.maxWidth = "none";
  } else if (rect) {
    const cardWidth = 340;
    const spaceBelow = window.innerHeight - rect.top - rect.height;
    const placeBelow = spaceBelow > 200;
    cardStyle.top = placeBelow ? rect.top + rect.height + 14 : Math.max(12, rect.top - 14);
    if (!placeBelow) cardStyle.transform = "translateY(-100%)";
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - cardWidth - 12));
    cardStyle.left = left;
    cardStyle.width = cardWidth;
  } else {
    cardStyle.top = "50%";
    cardStyle.left = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
    cardStyle.width = 340;
  }

  const spotlightStyle: React.CSSProperties | null = rect
    ? {
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      }
    : null;

  return createPortal(
    <div className="gh-portal-tour">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="gh-portal-tour__catcher"
        onClick={(e) => e.preventDefault()}
      />
      {spotlightStyle ? (
        <div className="gh-portal-tour__spotlight" style={spotlightStyle} aria-hidden />
      ) : (
        <div className="gh-portal-tour__dim" aria-hidden />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gh-portal-tour-title"
        tabIndex={-1}
        className="gh-portal-tour__card"
        style={cardStyle}
      >
        <h2 id="gh-portal-tour-title" className="gh-portal-tour__title">
          {step.title}
        </h2>
        <p className="gh-portal-tour__body">{step.body}</p>
        <div className="gh-portal-tour__footer">
          <button
            type="button"
            className="gh-portal-tour__btn gh-portal-tour__btn--ghost"
            onClick={finish}
          >
            {labels.skip}
          </button>
          <span className="gh-portal-tour__progress">{progressText}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {stepIndex > 0 ? (
              <button
                type="button"
                className="gh-portal-tour__btn gh-portal-tour__btn--ghost"
                onClick={goBack}
              >
                {labels.back}
              </button>
            ) : null}
            <button
              type="button"
              className="gh-portal-tour__btn gh-portal-tour__btn--primary"
              onClick={goNext}
            >
              {stepIndex >= steps.length - 1 ? labels.done : labels.next}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
