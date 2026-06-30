"use client";

import { useState } from "react";
import {
  LanguagePicker,
  canonicalizeLanguages,
} from "@/components/forms/LanguagePicker";

/**
 * Admin doctor-form languages field.
 *
 * Thin wrapper around the shared <LanguagePicker>: holds local selection
 * state and mirrors it into a hidden `languagesCsv` field so the
 * server-action form parse (`doctor-form-parse.ts`, comma-split) is
 * unchanged. The doctor-portal self-edit form uses the same picker but
 * wired to its own React state instead of a hidden input.
 */
export function LanguageMultiSelect({ initial = [] }: { initial?: string[] }) {
  const [selected, setSelected] = useState<string[]>(() =>
    canonicalizeLanguages(initial),
  );

  return (
    <div className="gh-admin-doctor-language-select flex flex-col gap-2">
      <span className="gh-field-label">Languages</span>
      {/* Hidden field consumed by doctor-form-parse.ts (comma-split). */}
      <input type="hidden" name="languagesCsv" value={selected.join(", ")} />
      <LanguagePicker selected={selected} onChange={setSelected} />
      <span className="text-xs text-[var(--color-text-muted)]">
        Pick from the list so languages stay consistent across the site.
      </span>
    </div>
  );
}
