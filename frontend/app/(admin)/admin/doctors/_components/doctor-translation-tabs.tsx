"use client";

import { useState } from "react";
import { RichTextHtmlField } from "../../_components/rich-text-html-field";
import { PortalTabs } from "@/components/PortalTabs";

export type DoctorTranslationInitial = {
  locale: string;
  title: string;
  bio: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type LocaleTab = { code: string; isDefault: boolean };

type BaseFallback = {
  title: string;
  bio: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type Props = {
  locales: LocaleTab[];
  defaultLocale: string;
  initialTranslations: DoctorTranslationInitial[];
  /** Pre-fills the default-locale tab when no translation row exists yet. */
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

/**
 * Per-locale professional title + bio + SEO for a doctor. Every panel stays
 * mounted (inactive ones hidden) so the form submits tr_<LOCALE>_<field> for
 * every language. Bio uses the same rich-text editor as the base field, one
 * instance per locale. Full name + qualifications are NOT here (single).
 */
export function DoctorTranslationTabs({
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
        bio: found.bio,
        seoTitle: found.seoTitle,
        seoDescription: found.seoDescription,
      };
    }
    if (code === upperDefault) return baseFallback;
    return { title: "", bio: null, seoTitle: null, seoDescription: null };
  }

  return (
    <div className="gh-admin-doctor-translation-tabs flex flex-col gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-5">
      <header>
        <h3 className="m-0 text-sm font-bold text-[var(--color-text-primary)]">
          Title, bio &amp; SEO by language
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          The <span className="font-semibold">{localeLabel(upperDefault)}</span> tab is the
          default — other languages fall back to it when a field is left blank. Full name and
          qualifications stay the same across languages.
        </p>
      </header>

      <PortalTabs
        ariaLabel="Doctor translations"
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
          <div key={l.code} role="tabpanel" hidden={l.code !== active} className="gh-admin-doctor-tab-panel flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Professional title{isDefault ? " *" : ""}</span>
              <input
                name={`tr_${l.code}_title`}
                className="gh-input min-w-0"
                defaultValue={v.title}
                required={isDefault}
                placeholder={isDefault ? "e.g. Consultant Cardiologist" : "Leave blank to use the default language"}
              />
            </label>

            <RichTextHtmlField
              name={`tr_${l.code}_bio`}
              label="Bio"
              initialValue={v.bio ?? ""}
              helperText="Supports the same formatting tools used for service detail content. Blank = use the default language."
            />

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">SEO title</span>
              <input
                name={`tr_${l.code}_seoTitle`}
                className="gh-input min-w-0"
                defaultValue={v.seoTitle ?? ""}
                maxLength={160}
                placeholder="Optional — defaults to the doctor's full name + title"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">SEO description</span>
              <textarea
                name={`tr_${l.code}_seoDescription`}
                className="gh-input min-h-[5rem] min-w-0 resize-y"
                defaultValue={v.seoDescription ?? ""}
                maxLength={320}
                placeholder="Optional — short summary for search results and link previews."
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
