"use client";

import { useState } from "react";
import { PortalTabs } from "@/components/PortalTabs";

export type DisclaimerTranslationInitial = {
  locale: string;
  shortDisclaimer: string | null;
  fullDisclaimer: string | null;
};

type LocaleTab = { code: string; isDefault: boolean };

type BaseFallback = {
  shortDisclaimer: string | null;
  fullDisclaimer: string | null;
};

type Props = {
  locales: LocaleTab[];
  defaultLocale: string;
  initialTranslations: DisclaimerTranslationInitial[];
  /** Pre-fills the default-locale tab from the base CountryLegalProfile columns. */
  baseFallback: BaseFallback;
};

const EMPTY: BaseFallback = { shortDisclaimer: null, fullDisclaimer: null };

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
 * Per-locale medical-disclaimer tabs. Every panel stays mounted (inactive ones
 * are hidden, not unmounted) so the form submits `tr_<LOCALE>_shortDisclaimer`
 * and `tr_<LOCALE>_fullDisclaimer` for every locale in one post. The
 * default-locale tab seeds the CountryLegalProfile base columns; other locales
 * fall back to it field-by-field when left blank. Plain text — separate
 * paragraphs with a blank line.
 */
export function DisclaimerTranslationTabs({
  locales,
  defaultLocale,
  initialTranslations,
  baseFallback,
}: Props) {
  const upperDefault = defaultLocale.toUpperCase();
  const [active, setActive] = useState(
    locales.find((l) => l.code === upperDefault)?.code ?? locales[0]?.code ?? upperDefault,
  );

  function valuesFor(code: string): BaseFallback {
    const found = initialTranslations.find((t) => t.locale.toUpperCase() === code);
    if (found) return found;
    if (code === upperDefault) return baseFallback;
    return EMPTY;
  }

  return (
    <div className="gh-admin-disclaimer-tabs flex flex-col gap-4">
      {/* Tab strip */}
      <PortalTabs
        ariaLabel="Disclaimer translations"
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
          <div
            key={l.code}
            role="tabpanel"
            hidden={l.code !== active}
            className="gh-admin-disclaimer-panel flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Short disclaimer</span>
              <textarea
                name={`tr_${l.code}_shortDisclaimer`}
                rows={6}
                className="gh-input resize-y"
                defaultValue={v.shortDisclaimer ?? ""}
                placeholder={blankHint}
              />
              <span className="text-portal-thead text-[var(--color-text-muted)]">
                Condensed version for service pages, booking flow, and doctor profiles.
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Full disclaimer</span>
              <textarea
                name={`tr_${l.code}_fullDisclaimer`}
                rows={14}
                className="gh-input resize-y"
                defaultValue={v.fullDisclaimer ?? ""}
                placeholder={blankHint}
              />
              <span className="text-portal-thead text-[var(--color-text-muted)]">
                Long-form version for the standalone legal page and footer link.
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
