"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  LANGUAGES,
  resolveLanguage,
  type LanguageEntry,
} from "@/lib/content/languages";

/**
 * Controlled languages multi-select shared by the admin doctor form and
 * the doctor-portal self-edit form. Pick from the canonical registry so
 * the same language never shows two ways ("BANGLA" vs "Bangla" vs "bn").
 *
 * Controlled: parent owns the selected `string[]` (canonical labels) and
 * gets every change via `onChange`. Legacy free-typed values that aren't
 * in the registry are surfaced as amber "legacy" chips and kept until
 * the editor replaces them — saving never silently drops a doctor's
 * existing language.
 */
type Props = {
  /** Canonical labels currently selected. */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Optional input theme — "light" (admin) or "dark" (doctor portal
   *  uses light surfaces too, so default light is fine). */
  className?: string;
};

export function LanguagePicker({ selected, onChange, className }: Props) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected],
  );

  const matches = useMemo<LanguageEntry[]>(() => {
    const q = query.trim().toLowerCase();
    return LANGUAGES.filter((l) => {
      if (selectedSet.has(l.label.toLowerCase())) return false;
      if (!q) return true;
      return (
        l.label.toLowerCase().includes(q) ||
        l.code.toLowerCase() === q ||
        (l.aliases ?? []).some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [query, selectedSet]);

  function add(label: string) {
    if (selected.some((s) => s.toLowerCase() === label.toLowerCase())) return;
    onChange([...selected, label]);
    setQuery("");
  }

  function remove(label: string) {
    onChange(selected.filter((s) => s.toLowerCase() !== label.toLowerCase()));
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {/* Selected chips */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((label) => {
            const known = resolveLanguage(label) !== null;
            return (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={{
                  background: known ? "rgba(27,77,62,0.10)" : "rgba(217,119,6,0.10)",
                  color: known ? "var(--color-brand-primary)" : "#92400E",
                  border: `1px solid ${known ? "rgba(27,77,62,0.20)" : "#FDE68A"}`,
                }}
                title={known ? undefined : "Legacy free-text value — pick a listed language to replace it"}
              >
                {label}
                <button
                  type="button"
                  onClick={() => remove(label)}
                  aria-label={`Remove ${label}`}
                  className="inline-flex"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Search box */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search languages…"
          className="gh-input min-w-0 pl-9"
        />
      </div>

      {/* Options — full list when short or searching; otherwise a hint. */}
      {query.trim() || matches.length <= 12 ? (
        <div className="flex flex-wrap gap-1.5">
          {matches.slice(0, 40).map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => add(l.label)}
              className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background-page)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-text-body)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            >
              {l.label}
            </button>
          ))}
          {matches.length === 0 ? (
            <span className="text-xs text-[var(--color-text-muted)]">
              No languages match “{query}”.
            </span>
          ) : null}
        </div>
      ) : (
        <span className="text-xs text-[var(--color-text-muted)]">
          Start typing to find a language, or browse the {LANGUAGES.length}
          {" "}supported languages.
        </span>
      )}
    </div>
  );
}

/** Fold arbitrary stored tokens (labels / codes / legacy free text) into
 *  canonical labels, de-duplicated, preserving unknown values as-is.
 *  Shared init helper so both forms hydrate the picker the same way. */
export function canonicalizeLanguages(stored: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of stored) {
    const entry = resolveLanguage(token);
    const label = entry ? entry.label : token.trim();
    if (label && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      out.push(label);
    }
  }
  return out;
}
