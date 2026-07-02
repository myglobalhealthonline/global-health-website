"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export type PortalTabItem = {
  value: string;
  label: ReactNode;
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
}: {
  items: PortalTabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

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
      onChange(next.value);
      refs.current[next.value]?.focus();
    }
  }

  return (
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
            onClick={() => onChange(item.value)}
            className="gh-portal-tab"
            data-active={active || undefined}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
