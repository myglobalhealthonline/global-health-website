"use client";

import { useState } from "react";
import { PortalTabs } from "@/components/PortalTabs";

export type SpecialtyTranslationInitial = {
  locale: string;
  name: string;
  cardSummary: string | null;
};

type LocaleTab = { code: string; isDefault: boolean };

type Props = {
  locales: LocaleTab[];
  defaultLocale: string;
  initialTranslations: SpecialtyTranslationInitial[];
  /** Pre-fill the default-locale tab when no translation row exists yet. */
  baseFallback: { name: string; cardSummary: string | null };
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

/** Per-locale name + card summary tabs for a specialty. Inactive panels stay
 *  mounted (hidden) so the form submits `tr_<LOCALE>_<field>` for every
 *  language at once. */
export function SpecialtyTranslationTabs({
  locales,
  defaultLocale,
  initialTranslations,
  baseFallback,
}: Props) {
  const upperDefault = defaultLocale.toUpperCase();
  const [active, setActive] = useState(
    locales.find((l) => l.code === upperDefault)?.code ?? locales[0]?.code ?? upperDefault,
  );

  function valuesFor(code: string): { name: string; cardSummary: string | null } {
    const found = initialTranslations.find((t) => t.locale.toUpperCase() === code);
    if (found) return { name: found.name, cardSummary: found.cardSummary };
    if (code === upperDefault) return baseFallback;
    return { name: "", cardSummary: null };
  }

  return (
    <div className="gh-admin-specialty-translations flex flex-col gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-5">
      <header>
        <h3 className="m-0 text-sm font-bold text-[var(--color-text-primary)]">
          Name &amp; summary by language
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          The <span className="font-semibold">{localeLabel(upperDefault)}</span> tab is the
          default — other languages fall back to it when left blank.
        </p>
      </header>

      <PortalTabs
        ariaLabel="Specialty translations"
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
          <div
            key={l.code}
            role="tabpanel"
            hidden={l.code !== active}
            className="gh-admin-specialty-panel grid gap-4"
          >
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Name{isDefault ? " *" : ""}</span>
              <input
                name={`tr_${l.code}_name`}
                className="gh-input min-w-0"
                defaultValue={v.name}
                required={isDefault}
                placeholder={isDefault ? "Cardiology" : "Leave blank to use the default language"}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Card summary</span>
              <textarea
                name={`tr_${l.code}_cardSummary`}
                className="gh-input min-h-[5rem] min-w-0 resize-y"
                defaultValue={v.cardSummary ?? ""}
                placeholder="Short description shown on the public specialty card"
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
