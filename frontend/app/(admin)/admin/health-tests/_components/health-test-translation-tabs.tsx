"use client";

import { useState } from "react";
import { PortalTabs } from "@/components/PortalTabs";

export type HealthTestTranslationInitial = {
  locale: string;
  title: string;
  shortDescription: string | null;
  sampleType: string | null;
  resultsTimeline: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type LocaleTab = { code: string; isDefault: boolean };

type BaseFallback = {
  title: string;
  shortDescription: string | null;
  sampleType: string | null;
  resultsTimeline: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type Props = {
  locales: LocaleTab[];
  defaultLocale: string;
  initialTranslations: HealthTestTranslationInitial[];
  baseFallback: BaseFallback;
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

/** Per-locale CMS content tabs for a health test. Inactive panels stay
 *  mounted (hidden) so the form submits `tr_<LOCALE>_<field>` for every
 *  language. Array/JSON detail fields are not translated here (no public
 *  detail page yet). */
export function HealthTestTranslationTabs({
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
    if (found) {
      return {
        title: found.title,
        shortDescription: found.shortDescription,
        sampleType: found.sampleType,
        resultsTimeline: found.resultsTimeline,
        seoTitle: found.seoTitle,
        seoDescription: found.seoDescription,
      };
    }
    if (code === upperDefault) return baseFallback;
    return {
      title: "",
      shortDescription: null,
      sampleType: null,
      resultsTimeline: null,
      seoTitle: null,
      seoDescription: null,
    };
  }

  return (
    <div className="gh-admin-health-translations">
      <header>
        <h3 className="m-0 text-sm font-bold text-[var(--color-text-primary)]">
          Content &amp; translations
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Title, description, sample type, results timing and SEO per language.
          The <span className="font-semibold">{localeLabel(upperDefault)}</span> tab is the
          default — blank fields fall back to it.
        </p>
      </header>

      <PortalTabs
        ariaLabel="Health test translations"
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
          <div key={l.code} role="tabpanel" hidden={l.code !== active} className="gh-admin-health-panel">
            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Title{isDefault ? " *" : ""}</span>
              <input
                name={`tr_${l.code}_title`}
                className="gh-input min-w-0"
                defaultValue={v.title}
                required={isDefault}
                placeholder={isDefault ? "" : "Leave blank to use the default language"}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Short description</span>
              <textarea
                name={`tr_${l.code}_shortDescription`}
                rows={4}
                className="gh-input min-h-[6rem] min-w-0 resize-y"
                defaultValue={v.shortDescription ?? ""}
              />
            </label>

            <div className="gh-admin-health-field-grid gh-admin-health-field-grid--two">
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">Sample type</span>
                <input
                  name={`tr_${l.code}_sampleType`}
                  className="gh-input min-w-0"
                  defaultValue={v.sampleType ?? ""}
                  placeholder="Finger Prick"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">Results timeline</span>
                <input
                  name={`tr_${l.code}_resultsTimeline`}
                  className="gh-input min-w-0"
                  defaultValue={v.resultsTimeline ?? ""}
                  placeholder="Results in 2–3 working days"
                />
              </label>
            </div>

            <div className="gh-admin-health-field-grid gh-admin-health-field-grid--two">
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">SEO title</span>
                <input
                  name={`tr_${l.code}_seoTitle`}
                  className="gh-input min-w-0"
                  defaultValue={v.seoTitle ?? ""}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">SEO description</span>
                <input
                  name={`tr_${l.code}_seoDescription`}
                  className="gh-input min-w-0"
                  defaultValue={v.seoDescription ?? ""}
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
