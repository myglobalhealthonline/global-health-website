"use client";

import { useState } from "react";
import { PortalTabs } from "@/components/PortalTabs";

export type PlanTranslationInitial = {
  locale: string;
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  notesTerms: string | null;
  features: string[];
};

type LocaleTab = { code: string; isDefault: boolean };

type BaseFallback = {
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  notesTerms: string | null;
  /** Seed bullets for the default-locale tab when no translation row exists. */
  features: string[];
};

type Props = {
  locales: LocaleTab[];
  defaultLocale: string;
  initialTranslations: PlanTranslationInitial[];
  /** Seeds the default-locale tab when no translation row exists yet. */
  baseFallback: BaseFallback;
};

const EMPTY: Omit<PlanTranslationInitial, "locale"> = {
  name: "",
  shortDescription: null,
  longDescription: null,
  notesTerms: null,
  features: [],
};

function localeLabel(code: string): string {
  const names: Record<string, string> = {
    EN: "English",
    PT: "Português",
    ES: "Español",
    CS: "Čeština",
    RO: "Română",
    DE: "Deutsch",
  };
  return names[code] ?? code;
}

/**
 * Per-locale plan content tabs (mirrors the Service CMS pattern). Every panel
 * stays mounted (inactive ones hidden, not unmounted) so a single form submits
 * `tr_<LOCALE>_<field>` for every locale at once. The default-locale tab seeds
 * the plan base columns. "Feature bullets" is one bullet per line — when filled
 * it replaces the auto card bullets for that language; blank → defaults.
 */
export function PlanTranslationTabs({ locales, defaultLocale, initialTranslations, baseFallback }: Props) {
  const upperDefault = defaultLocale.toUpperCase();
  const [active, setActive] = useState(
    locales.find((l) => l.code === upperDefault)?.code ?? locales[0]?.code ?? upperDefault,
  );

  function valuesFor(code: string): Omit<PlanTranslationInitial, "locale"> {
    const found = initialTranslations.find((t) => t.locale.toUpperCase() === code);
    if (found) return found;
    if (code === upperDefault) return { ...baseFallback };
    return EMPTY;
  }

  return (
    <div className="gh-admin-plan-translations flex flex-col gap-4">
      <p className="text-xs text-[var(--color-text-muted)]">
        Name, description, notes and the public-card bullets per language. The{" "}
        <span className="font-semibold">{localeLabel(upperDefault)}</span> tab is the default —
        other languages fall back to it when a field is left blank.
      </p>

      {/* Tab strip */}
      <PortalTabs
        ariaLabel="Plan translations"
        value={active}
        onChange={setActive}
        items={locales.map((l) => ({
          value: l.code,
          label: `${localeLabel(l.code)}${l.isDefault ? " · default" : ""}`,
        }))}
      />

      {locales.map((l) => {
        const v = valuesFor(l.code);
        const isDefault = l.code === upperDefault;
        return (
          <div key={l.code} role="tabpanel" hidden={l.code !== active} className="gh-admin-plan-translation-panel flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Plan name{isDefault ? " *" : ""}</span>
              <input
                name={`tr_${l.code}_name`}
                className="gh-input min-w-0"
                defaultValue={v.name}
                required={isDefault}
                placeholder={isDefault ? "" : "Leave blank to use the default language"}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Short description</span>
              <input
                name={`tr_${l.code}_shortDescription`}
                className="gh-input min-w-0"
                defaultValue={v.shortDescription ?? ""}
                placeholder="One-line card summary"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Long description</span>
              <textarea
                name={`tr_${l.code}_longDescription`}
                rows={3}
                className="gh-textarea min-w-0"
                defaultValue={v.longDescription ?? ""}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Notes &amp; terms (fine print under the card)</span>
              <textarea
                name={`tr_${l.code}_notesTerms`}
                rows={2}
                className="gh-textarea min-w-0"
                defaultValue={v.notesTerms ?? ""}
                placeholder="Optional small print, e.g. cancellation or eligibility notes"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Feature bullets — one per line</span>
              <textarea
                name={`tr_${l.code}_features`}
                rows={5}
                className="gh-textarea min-w-0"
                defaultValue={v.features.join("\n")}
                placeholder={"Leave blank to use the auto bullets, or enter one per line, e.g.\n1 online GP consultation credit each month\nSecure online/video consultations"}
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                When filled, these replace the card&apos;s &quot;Includes&quot; list for this language.
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
