"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { Flag } from "@/components/ui/Flag";
import {
  DIAL_OPTIONS,
  PRIORITY_OPTION_COUNT,
  countryForDial,
  searchDialOptions,
  type DialOption,
} from "@/lib/phone/dial-codes";

type Props = {
  /** Selected dial code, digits only (no "+"). */
  value: string;
  /** Fires with the new dial code (digits) and the country that was picked. */
  onChange: (dial: string, option: DialOption) => void;
  disabled?: boolean;
  /** Accessible name for the trigger. */
  ariaLabel?: string;
  /** Class for the trigger button — defaults to the shared input skin. */
  className?: string;
  id?: string;
};

/** Panel geometry, recomputed from the trigger rect while open. */
type Rect = { top: number; left: number; width: number; maxHeight: number };

const PANEL_MIN_WIDTH = 288;
const PANEL_MAX_HEIGHT = 320;
const GAP = 6;

/**
 * Country dial-code picker with search.
 *
 * Replaces the native `<select>` that used to carry nine hard-coded markets:
 * the list is now every country, so search is what keeps it usable — type a
 * country name ("germ"), an alias ("uae", "holland"), an ISO code ("de") or
 * the dial digits ("49"/"+49").
 *
 * The panel is portalled to <body> with fixed positioning so it escapes the
 * scroll/overflow of whatever card, drawer or dialog hosts the field.
 * PortalDialog closes on overlay click (not on outside pointerdown), so a
 * body-level panel coexists with it; Escape is stopped here so it dismisses
 * the panel only, leaving the dialog open.
 */
export function CountryDialSelect({
  value,
  onChange,
  disabled = false,
  ariaLabel = "Country code",
  className = "gh-select",
  id,
}: Props) {
  const reactId = useId();
  const listboxId = `dial-listbox-${reactId}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe mount flag, must run post-hydration
  useEffect(() => setMounted(true), []);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const selected = useMemo(() => countryForDial(value), [value]);
  const results = useMemo(() => searchDialOptions(query), [query]);
  /** Divider position — only meaningful in the unfiltered list. */
  const dividerAfter = query.trim() ? -1 : PRIORITY_OPTION_COUNT - 1;

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(r.width, PANEL_MIN_WIDTH), vw - 16);
    const below = vh - r.bottom - GAP - 8;
    const above = r.top - GAP - 8;
    const flip = below < 200 && above > below;
    const maxHeight = Math.max(160, Math.min(PANEL_MAX_HEIGHT, flip ? above : below));
    setRect({
      top: flip ? r.top - GAP - maxHeight : r.bottom + GAP,
      left: Math.min(Math.max(8, r.left), Math.max(8, vw - width - 8)),
      width,
      maxHeight,
    });
  }, []);

  function openPanel() {
    if (disabled) return;
    setQuery("");
    const current = DIAL_OPTIONS.findIndex((o) => o.dial === value);
    setActiveIndex(current >= 0 ? current : 0);
    position();
    setOpen(true);
  }

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  }, []);

  // Keep the panel glued to the trigger while anything scrolls or resizes.
  // Capture phase because scroll does not bubble from inner containers.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => position();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, position]);

  // Outside pointerdown dismisses. Trigger clicks are excluded so its own
  // onClick can toggle instead of reopening a just-closed panel.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, close]);

  // Keep the active option in view during keyboard navigation.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLLIElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, query]);

  function pick(option: DialOption) {
    onChange(option.dial, option);
    close();
  }

  function onSearchKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      // Stop here: a dialog hosting this field also listens for Escape on
      // document and would otherwise close underneath the panel.
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + results.length) % results.length);
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActiveIndex(e.key === "Home" ? 0 : Math.max(0, results.length - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const option = results[activeIndex];
      if (option) pick(option);
    }
  }

  function onTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (open) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPanel();
    }
  }

  const panel =
    open && rect && mounted
      ? createPortal(
          <div
            ref={panelRef}
            className="gh-dial-panel"
            style={{ top: rect.top, left: rect.left, width: rect.width, maxHeight: rect.maxHeight }}
          >
            <div className="gh-dial-panel__search">
              <Search className="gh-dial-panel__search-icon size-4" aria-hidden />
              <input
                // Panel only exists after a deliberate open, so focus belongs
                // in its search box — typing is the point of the control.
                autoFocus
                type="text"
                role="combobox"
                aria-expanded
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  results[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
                }
                aria-label="Search countries"
                className="gh-dial-panel__search-input"
                placeholder="Search country or code"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onSearchKeyDown}
              />
            </div>
            <ul ref={listRef} id={listboxId} role="listbox" className="gh-dial-panel__list">
              {results.length === 0 ? (
                <li className="gh-dial-panel__empty">No country matches “{query}”</li>
              ) : (
                results.map((option, i) => {
                  // Compared by key, not dial: +44 is four countries and +590
                  // three, so a dial comparison would tick several rows at once.
                  const isSelected = option.key === selected?.key;
                  return (
                    <li
                      key={`${option.key}-${option.dial}`}
                      id={`${listboxId}-${i}`}
                      role="option"
                      aria-selected={isSelected}
                      data-active={i === activeIndex}
                      className={`gh-dial-option${
                        i === dividerAfter ? " gh-dial-option--divider" : ""
                      }`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => pick(option)}
                    >
                      <Flag code={option.code} size="sm" />
                      <span className="gh-dial-option__name">{option.label}</span>
                      <span className="gh-dial-option__dial">+{option.dial}</span>
                      {isSelected ? (
                        <Check className="size-4 shrink-0" aria-hidden />
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`gh-dial-trigger ${className}`}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={onTriggerKeyDown}
      >
        {selected ? <Flag code={selected.code} size="sm" /> : null}
        {/* Flag + code only: the control is narrow by design (it sits beside
            the number input) and the panel carries the full country names. */}
        <span className="gh-dial-trigger__dial">+{value}</span>
        <ChevronDown className="gh-dial-trigger__chevron size-4 shrink-0" aria-hidden />
      </button>
      {panel}
    </>
  );
}
