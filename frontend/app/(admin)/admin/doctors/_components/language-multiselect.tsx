"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import {
  LANGUAGES,
  resolveLanguage,
  type LanguageEntry,
} from "@/lib/content/languages";

/**
 * Languages multi-select for the doctor edit form.
 *
 * Replaces the old free-text "English, Portuguese" input so every
 * doctor's languages come from one canonical list — no more "BANGLA"
 * vs "Bangla" vs "bn" drift. Selected languages are written to a hidden
 * `languagesCsv` field (comma-joined canonical labels) so the existing
 * server-action form parse (`doctor-form-parse.ts`) is unchanged.
 *
 * Legacy free-typed values on `initial` are folded to their canonical
 * entry via resolveLanguage; anything unrecognised is preserved as a
 * one-off custom chip so saving never silently drops a doctor's
 * existing language.
 */
type Props = {
  /** Stored values from the doctor row (labels, codes, or legacy free
   *  text). Pre-selected on mount. */
  initial?: string[];
};

export function LanguageMultiSelect({ initial = [] }: Props) {
  // Build the initial selected set: fold known tokens to canonical
  // labels, keep unknown tokens as-is so nothing is lost.
  const [selected, setSelected] = useState<string[]>(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const token of initial) {
      const entry = resolveLanguage(token);
      const label = entry ? entry.label : token.trim();
      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        out.push(label);
      }
    }
    return out;
  });
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected],
  );

  // Canonical options that match the search box, minus already-selected.
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
    setSelected((prev) =>
      prev.some((s) => s.toLowerCase() === label.toLowerCase())
        ? prev
        : [...prev, label],
    );
    setQuery("");
  }

  function remove(label: string) {
    setSelected((prev) => prev.filter((s) => s.toLowerCase() !== label.toLowerCase()));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="gh-field-label">Languages</span>

      {/* Hidden field consumed by doctor-form-parse.ts (comma-split). */}
      <input type="hidden" name="languagesCsv" value={selected.join(", ")} />

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
                  background: known
                    ? "rgba(27,77,62,0.10)"
                    : "rgba(217,119,6,0.10)",
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

      {/* Search + options */}
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

      {query.trim() || matches.length <= 12 ? (
        <div className="flex flex-wrap gap-1.5">
          {matches.slice(0, 40).map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => add(l.label)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-background-page)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-text-body)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
            >
              <Check className="size-3 opacity-0" aria-hidden />
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

      <span className="text-xs text-[var(--color-text-muted)]">
        Pick from the list so languages stay consistent across the site.
      </span>
    </div>
  );
}
