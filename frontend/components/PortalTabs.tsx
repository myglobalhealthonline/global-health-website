"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type PortalTabItem = {
  value: string;
  label: ReactNode;
  /** Optional count/status badge (e.g. unread count, "pending"). */
  badge?: ReactNode;
  /** Signal tone for the badge — pending-send counts, alerts. */
  badgeAlert?: boolean;
  /** Optional outline icon rendered left of the label (design brief §3).
   *  Consumers that omit it keep the label-only look unchanged. */
  icon?: ReactNode;
};

/**
 * PortalTabs — DESIGN.md §5.12. Underline tabs with full arrow-key/Home/End
 * roving-tabindex navigation (§14.8). New primitive shared by all three
 * portals; consolidates the various per-page `*-tab` implementations —
 * migrate consumers one at a time, not big-bang.
 */
export function PortalTabs({
  items,
  value,
  onChange,
  ariaLabel,
  className = "",
  sticky = false,
  syncParam,
}: {
  items: PortalTabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  /** Pins the strip under the portal topbar (`--portal-topbar-h`), themed
   *  + glass-fallbacked (portal.css). Opt-in — existing inline consumers
   *  are unaffected unless they pass this. */
  sticky?: boolean;
  /** Opt-in shallow `?<param>=` URL sync: reads the starting tab from the
   *  URL once on mount (deep links / back-forward), then keeps the URL in
   *  sync via `router.replace` (no scroll, no extra history entries) on
   *  every change. The primitive stays fully controlled — this only reads
   *  and writes the query string around the existing `value`/`onChange`. */
  syncParam?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didInitFromUrl = useRef(false);

  // One-time read of the initial tab from the URL. The parent owns `value`;
  // this just nudges it once so a deep link / browser back-forward lands on
  // the right tab. Intentionally mount-only (not resynced on every param
  // change) so in-page tab clicks don't fight external nav.
  useEffect(() => {
    if (!syncParam || didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    const fromUrl = searchParams.get(syncParam);
    if (fromUrl && fromUrl !== value && items.some((i) => i.value === fromUrl)) {
      onChange(fromUrl);
    }
    // Guarded by didInitFromUrl above, not the dep array — this is
    // deliberately a run-once effect; listing the real deps (rather than
    // disabling the lint rule) just means it re-checks and no-ops on
    // every re-render of them instead of only on mount.
  }, [syncParam, searchParams, value, items, onChange]);

  function select(next: string) {
    onChange(next);
    if (syncParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(syncParam, next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = items.findIndex((i) => i.value === value);
    if (idx === -1) return;
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = items.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      const next = items[nextIdx];
      select(next.value);
      refs.current[next.value]?.focus();
    }
  }

  const strip = (
    <div role="tablist" aria-label={ariaLabel} className={`gh-portal-tabs ${className}`} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[item.value] = el;
            }}
            type="button"
            role="tab"
            id={`gh-tab-${item.value}`}
            aria-selected={active}
            aria-controls={`gh-tabpanel-${item.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => select(item.value)}
            className="gh-portal-tab"
            data-active={active || undefined}
          >
            {item.icon ? <span aria-hidden>{item.icon}</span> : null}
            {item.label}
            {item.badge ? (
              <span
                className={`gh-portal-tab__badge${item.badgeAlert ? " gh-portal-tab__badge--alert" : ""}`}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  if (!sticky) return strip;
  return <div className="gh-portal-tabs-sticky">{strip}</div>;
}

/**
 * PortalTabPanel — pairs with PortalTabs. Keeps every panel mounted and
 * toggles visibility with the `hidden` attribute (correct pattern per A2
 * findings: unmounting on switch loses form/scroll state). Wires the ARIA
 * relationship (`role="tabpanel"`, `aria-labelledby`) so consumers don't
 * have to hand-roll it. Purely a rendering convenience — optional; existing
 * consumers that already render their own tabpanel divs are unaffected.
 */
export function PortalTabPanel({
  value,
  activeValue,
  children,
  className,
}: {
  /** This panel's tab value — must match the corresponding `PortalTabItem.value`. */
  value: string;
  /** The currently active tab value (i.e. the `value` prop passed to `PortalTabs`). */
  activeValue: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`gh-tabpanel-${value}`}
      aria-labelledby={`gh-tab-${value}`}
      hidden={value !== activeValue}
      className={className}
    >
      {children}
    </div>
  );
}
