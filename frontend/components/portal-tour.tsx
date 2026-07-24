"use client";

/**
 * PortalTour — hand-rolled onboarding spotlight tour for the patient/doctor
 * portals. No new dependency: createPortal + fixed-position divs.
 *
 * Auto-starts once per browser (localStorage[storageKey]) and can be
 * restarted from the sidebar via `window.dispatchEvent(new Event("gh:tour:start"))`.
 *
 * Cross-page steps: a step with `route` navigates there first (router.push),
 * then polls for its target element to appear (page still loading). A route
 * that only differs by query string (e.g. an appointment `?tab=`) clicks the
 * real tab button instead of relying on router history — see the resolve
 * effect below for why. Progress is mirrored to sessionStorage so the tour
 * survives the navigation/remount (the doctor/patient layout doesn't unmount
 * across same-portal routes, but a hard reload or route-group boundary would
 * otherwise reset to step 0).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type TourStep = {
  /** data-tour attribute value to spotlight; omit for a centered welcome card. */
  target?: string;
  /** Navigate here first if not already on this route (cross-page steps). */
  route?: string;
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
const POLL_INTERVAL_MS = 150;
const POLL_TIMEOUT_MS = 4000;
const ACTIVE_FLAG_KEY = "gh_tour_active";

function isVisible(el: Element): boolean {
  const htmlEl = el as HTMLElement;
  if (htmlEl.offsetParent !== null) return true;
  // offsetParent is null for fixed-position elements even when visible.
  return getComputedStyle(htmlEl).position === "fixed";
}

function sessionKey(storageKey: string): string {
  return `gh_tour_state:${storageKey}`;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => setMounted(true), []);

  const start = useCallback((atStep = 0) => {
    setStepIndex(atStep);
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
      sessionStorage.removeItem(sessionKey(storageKey));
      sessionStorage.removeItem(ACTIVE_FLAG_KEY);
    } catch {
      // ponytail: storage can throw in locked-down browsers — tour just
      // won't remember dismissal, not worth a fallback store.
    }
    setActive(false);
    targetElRef.current = null;
  }, [storageKey]);

  // Resume mid-tour progress (cross-page nav) takes priority over the
  // once-per-browser first-run check.
  useEffect(() => {
    let resumeStep: number | null = null;
    try {
      const raw = sessionStorage.getItem(sessionKey(storageKey));
      if (raw) resumeStep = JSON.parse(raw).step ?? 0;
    } catch {
      resumeStep = null;
    }
    if (resumeStep !== null) {
      start(resumeStep);
      return;
    }
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(storageKey);
    } catch {
      seen = "1";
    }
    const timer = seen === null ? window.setTimeout(() => start(0), 600) : undefined;
    const onStart = () => start(0);
    window.addEventListener("gh:tour:start", onStart);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("gh:tour:start", onStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, [storageKey]);

  // Broadcast active state + persist progress for demo components / cross-
  // page resume.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("gh:tour:state", { detail: { active } }));
    try {
      if (active) {
        sessionStorage.setItem(sessionKey(storageKey), JSON.stringify({ step: stepIndex }));
        sessionStorage.setItem(ACTIVE_FLAG_KEY, "1");
      }
    } catch {
      // ponytail: same non-fatal storage guard as finish().
    }
  }, [active, stepIndex, storageKey]);

  // Resolve the current step's target: navigate if needed, then poll for
  // the element (page may still be loading), skipping steps whose element
  // never appears/stays hidden. Loop-guarded: if every remaining step
  // skips, end tour.
  useEffect(() => {
    if (!active) return;
    const step = steps[stepIndex];
    if (!step) {
      finish();
      return;
    }
    if (!step.target) {
      targetElRef.current = null;
      setRect(null);
      return;
    }
    if (step.route) {
      const [routePath, routeQuery] = step.route.split("?");
      const currentSearch = searchParams.toString();
      const currentFull = pathname + (currentSearch ? `?${currentSearch}` : "");
      if (routePath !== pathname) {
        router.push(step.route);
        return;
      }
      if (step.route !== currentFull) {
        // Same page, only the query differs — typically a `?tab=` step.
        // AppointmentTabs/PortalTabs only read `?tab=` from the URL once on
        // mount (deliberately, so in-page clicks don't fight external nav),
        // so a route-only change here wouldn't otherwise flip the active
        // tab. Click the real tab button (stable `#gh-tab-<id>` id) instead
        // of fighting that guard, then mirror the URL for the address bar.
        const tabId = new URLSearchParams(routeQuery).get("tab");
        if (tabId) {
          const tabBtn = document.getElementById(`gh-tab-${tabId}`);
          if (tabBtn instanceof HTMLElement) tabBtn.click();
        }
        router.replace(step.route, { scroll: false });
        return;
      }
    }

    let cancelled = false;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const tryResolve = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el && isVisible(el)) {
        targetElRef.current = el;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        return;
      }
      if (Date.now() < deadline) {
        window.setTimeout(tryResolve, POLL_INTERVAL_MS);
        return;
      }
      // Timed out — skip forward, loop-guarded by advancing at most
      // steps.length times before giving up entirely.
      let idx = stepIndex + 1;
      let guard = 0;
      const advance = () => {
        while (idx < steps.length && guard <= steps.length) {
          const next = steps[idx];
          if (!next.target || document.querySelector(`[data-tour="${next.target}"]`)) {
            setStepIndex(idx);
            return;
          }
          idx += 1;
          guard += 1;
        }
        finish();
      };
      advance();
    };

    tryResolve();
    return () => {
      cancelled = true;
    };
  }, [active, stepIndex, steps, pathname, searchParams, router, finish]);

  // Continuous tracking while a target step is showing — every frame,
  // update `rect` only when it actually moved (>0.5px) so re-renders stay
  // cheap. Replaces separate scroll/resize listeners: this also follows the
  // smooth `scrollIntoView` from the resolve effect above without a fixed
  // delay before the first measurement.
  useEffect(() => {
    if (!active || !targetElRef.current) return;
    let raf = 0;
    let last: Rect | null = null;
    const tick = () => {
      const el = targetElRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const changed =
          !last ||
          Math.abs(r.top - last.top) > 0.5 ||
          Math.abs(r.left - last.left) > 0.5 ||
          Math.abs(r.width - last.width) > 0.5 ||
          Math.abs(r.height - last.height) > 0.5;
        if (changed) {
          last = { top: r.top, left: r.left, width: r.width, height: r.height };
          setRect(last);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, stepIndex]);

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finish();
      return;
    }
    // Deliberately don't clear `rect` here — keeping the stale value lets
    // the CSS transition glide the spotlight/card from the old position to
    // the new one once the resolve effect measures it, instead of the
    // fallback centered style flashing in for a frame.
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
