"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  WORLD_COUNTRIES,
  defaultSlugForCountry,
  findCountryByIso,
  type WorldCountry,
} from "@/data/world-countries";

type Props = {
  /** Hidden-input names so the surrounding `<form>` posts the picked
   *  values without extra wiring. */
  codeName?: string;
  nameName?: string;
  slugName?: string;
  /** Pre-selected ISO when editing an existing row. */
  initialIso?: string;
};

/**
 * Searchable country picker with `flag-icons` previews.
 *
 * Shipped as a single combo control to replace three separate text
 * inputs (`code`, `name`, `slug`) in the admin Country form. Picking a
 * country auto-fills all three via hidden inputs; the visible button
 * shows the flag + name. Search is case-insensitive on `name` and `iso`.
 *
 * Pure client component — no network calls. The dataset is bundled at
 * build time from `frontend/data/world-countries.ts`.
 */
export function CountrySelect({
  codeName = "code",
  nameName = "name",
  slugName = "slug",
  initialIso,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<WorldCountry | null>(() =>
    initialIso ? findCountryByIso(initialIso) : null,
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close on outside click + Escape so the picker behaves like a native select.
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the search input on open so the admin can start typing immediately.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORLD_COUNTRIES;
    return WORLD_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q),
    );
  }, [query]);

  function pick(c: WorldCountry) {
    setSelected(c);
    setOpen(false);
    setQuery("");
  }

  // Derived values for the hidden inputs the form submits.
  const code = selected?.iso ?? "";
  const name = selected?.name ?? "";
  const slug = selected ? defaultSlugForCountry(selected.name) : "";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="gh-input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {selected ? (
            <span
              aria-hidden
              className={`fi fi-${selected.iso}`}
              style={{
                display: "inline-block",
                width: 22,
                height: 16,
                borderRadius: 2,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
                flex: "0 0 22px",
              }}
            />
          ) : (
            <span
              aria-hidden
              style={{
                width: 22,
                height: 16,
                borderRadius: 2,
                background: "var(--color-background-soft)",
                border: "1px dashed var(--color-border)",
                flex: "0 0 22px",
              }}
            />
          )}
          <span className="truncate text-[14px]">
            {selected ? (
              <>
                {selected.name}{" "}
                <span className="text-[var(--color-text-muted)]">
                  · {selected.iso.toUpperCase()}
                </span>
              </>
            ) : (
              <span className="text-[var(--color-text-muted)]">
                Pick a country…
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-[var(--color-text-muted)]"
          aria-hidden
        />
      </button>

      {/* Hidden inputs the surrounding <form> submits. Keeps the parent
          form schema unchanged so the existing server action doesn't need
          to learn about this component. */}
      <input type="hidden" name={codeName} value={code} />
      <input type="hidden" name={nameName} value={name} />
      <input type="hidden" name={slugName} value={slug} />

      {open ? (
        <div
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-lg"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="border-b border-[var(--color-border)] p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or ISO code…"
                className="gh-input w-full min-w-0 pl-8 text-[14px]"
              />
            </div>
          </div>
          <ul
            role="listbox"
            className="max-h-[280px] overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-[var(--color-text-muted)]">
                No match for &ldquo;{query}&rdquo;
              </li>
            ) : (
              filtered.map((c) => {
                const isPicked = selected?.iso === c.iso;
                return (
                  <li key={c.iso}>
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] hover:bg-[var(--color-background-soft)]"
                    >
                      <span
                        aria-hidden
                        className={`fi fi-${c.iso}`}
                        style={{
                          display: "inline-block",
                          width: 22,
                          height: 16,
                          borderRadius: 2,
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
                          flex: "0 0 22px",
                        }}
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-[12px] text-[var(--color-text-muted)]">
                        {c.iso.toUpperCase()}
                      </span>
                      {isPicked ? (
                        <Check
                          className="size-4 text-[var(--color-brand-primary)]"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
