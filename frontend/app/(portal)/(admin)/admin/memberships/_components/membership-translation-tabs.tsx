"use client";

import { useState } from "react";
import { PortalTabs } from "@/components/PortalTabs";

export type MembershipTranslationInitial = {
  locale: string;
  name: string;
  description: string | null;
};

type LocaleTab = { code: string; isDefault: boolean };

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
 * Per-locale name + description for a membership programme or level
 * (decision 23). Every panel stays mounted so one submit carries
 * `tr_<LOCALE>_name` / `tr_<LOCALE>_description` for every locale.
 *
 * The tab list comes from the country's own CountryLocale rows, so a market
 * that enables a new language gets the tab without a code change. A locale left
 * blank simply has no translation row — the member surface falls back to the
 * country default.
 */
export function MembershipTranslationTabs({
  locales,
  defaultLocale,
  initialTranslations,
  baseFallback,
  descriptionHint = "Shown to the member on their membership page and card.",
  idPrefix,
}: {
  locales: LocaleTab[];
  defaultLocale: string;
  initialTranslations: MembershipTranslationInitial[];
  /** Seeds the default-locale tab from the row's internal name. */
  baseFallback: { name: string; description: string | null };
  /** What the Description box is actually used for at this call site. */
  descriptionHint?: string;
  /** Distinguishes the plan tab-strip from a level's on the same page. */
  idPrefix: string;
}) {
  const upperDefault = defaultLocale.toUpperCase();
  const [active, setActive] = useState(
    locales.find((l) => l.code === upperDefault)?.code ?? locales[0]?.code ?? upperDefault,
  );

  function valuesFor(code: string): { name: string; description: string | null } {
    const found = initialTranslations.find((t) => t.locale.toUpperCase() === code);
    if (found) return { name: found.name, description: found.description };
    if (code === upperDefault) return baseFallback;
    return { name: "", description: null };
  }

  return (
    <div className="flex flex-col gap-4">
      <PortalTabs
        ariaLabel={`${idPrefix} translations`}
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
        const blankHint = isDefault
          ? undefined
          : `Leave blank to use the ${localeLabel(upperDefault)} text`;
        return (
          <div key={l.code} role="tabpanel" hidden={l.code !== active} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Name</span>
              <input
                name={`tr_${l.code}_name`}
                className="gh-input"
                maxLength={200}
                defaultValue={v.name}
                placeholder={blankHint}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Description</span>
              <textarea
                name={`tr_${l.code}_description`}
                rows={4}
                className="gh-input resize-y"
                defaultValue={v.description ?? ""}
                placeholder={blankHint}
              />
              <span className="text-portal-thead text-[var(--color-text-muted)]">
                {descriptionHint}
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
