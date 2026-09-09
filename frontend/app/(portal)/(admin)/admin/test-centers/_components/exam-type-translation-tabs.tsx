"use client";

import { useState } from "react";
import { PortalTabs } from "@/components/PortalTabs";

export type ExamTypeTranslationInitial = {
  locale: string;
  name: string;
  summary: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  preparationBody: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type Values = Omit<ExamTypeTranslationInitial, "locale">;

type Props = {
  /** Every LocaleCode — see the note below on why this is not country-gated. */
  locales: string[];
  defaultLocale: string;
  initialTranslations: ExamTypeTranslationInitial[];
  baseFallback: Values;
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
 * Per-locale public copy for an exam type. Inactive panels stay mounted
 * (hidden) so the form submits `tr_<LOCALE>_<field>` for every language in one
 * go — the shared `parseLocaleTranslations` collects them back.
 *
 * Every locale is offered, not just a country's enabled ones: an ExamType is a
 * single global catalogue row reused by every market, so there is no country to
 * gate against. A locale left blank simply produces no translation row and
 * falls back to the base columns.
 */
export function ExamTypeTranslationTabs({
  locales,
  defaultLocale,
  initialTranslations,
  baseFallback,
}: Props) {
  const upperDefault = defaultLocale.toUpperCase();
  const [active, setActive] = useState(
    locales.find((l) => l === upperDefault) ?? locales[0] ?? upperDefault,
  );

  function valuesFor(code: string): Values {
    const found = initialTranslations.find((t) => t.locale.toUpperCase() === code);
    if (found) {
      return {
        name: found.name,
        summary: found.summary,
        heroTitle: found.heroTitle,
        heroDescription: found.heroDescription,
        preparationBody: found.preparationBody,
        seoTitle: found.seoTitle,
        seoDescription: found.seoDescription,
      };
    }
    // The default-locale tab prefills from the base columns, which ARE the
    // default-locale copy; every other language starts empty.
    if (code === upperDefault) return baseFallback;
    return {
      name: "",
      summary: null,
      heroTitle: null,
      heroDescription: null,
      preparationBody: null,
      seoTitle: null,
      seoDescription: null,
    };
  }

  return (
    <div className="gh-admin-health-translations">
      <header>
        <h3 className="m-0 text-sm font-bold text-[var(--color-text-primary)]">
          Public content &amp; translations
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          What patients see on the Book a Test pages, per language. The{" "}
          <span className="font-semibold">{localeLabel(upperDefault)}</span> tab is the
          default — a language left blank falls back to it.
        </p>
      </header>

      <PortalTabs
        ariaLabel="Exam type translations"
        value={active}
        onChange={setActive}
        items={locales.map((code) => ({
          value: code,
          label: `${localeLabel(code)}${code === upperDefault ? " · default" : ""}`,
        }))}
      />

      {locales.map((code) => {
        const v = valuesFor(code);
        const isDefault = code === upperDefault;
        return (
          <div
            key={code}
            role="tabpanel"
            hidden={code !== active}
            className="gh-admin-health-panel"
          >
            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Name{isDefault ? " *" : ""}</span>
              <input
                name={`tr_${code}_name`}
                className="gh-input min-w-0"
                defaultValue={v.name}
                placeholder={isDefault ? "" : "Leave blank to use the default language"}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Summary</span>
              <textarea
                name={`tr_${code}_summary`}
                rows={3}
                className="gh-input min-h-[5rem] min-w-0 resize-y"
                defaultValue={v.summary ?? ""}
                placeholder="Short line shown on the catalogue card"
              />
            </label>

            <div className="gh-admin-health-field-grid gh-admin-health-field-grid--two">
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">Hero title</span>
                <input
                  name={`tr_${code}_heroTitle`}
                  className="gh-input min-w-0"
                  defaultValue={v.heroTitle ?? ""}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">Hero description</span>
                <input
                  name={`tr_${code}_heroDescription`}
                  className="gh-input min-w-0"
                  defaultValue={v.heroDescription ?? ""}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Preparation</span>
              <textarea
                name={`tr_${code}_preparationBody`}
                rows={4}
                className="gh-input min-h-[6rem] min-w-0 resize-y"
                defaultValue={v.preparationBody ?? ""}
                placeholder="Fast for 12 hours. Bring your prescription and ID."
              />
            </label>

            <div className="gh-admin-health-field-grid gh-admin-health-field-grid--two">
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">SEO title</span>
                <input
                  name={`tr_${code}_seoTitle`}
                  className="gh-input min-w-0"
                  defaultValue={v.seoTitle ?? ""}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">SEO description</span>
                <input
                  name={`tr_${code}_seoDescription`}
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
