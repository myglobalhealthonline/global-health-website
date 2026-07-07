"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PortalTabs } from "@/components/PortalTabs";

const RichTextHtmlField = dynamic(
  () =>
    import("@/app/(admin)/admin/_components/rich-text-html-field").then(
      (m) => m.RichTextHtmlField,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="min-h-[17rem] w-full rounded-[var(--portal-radius)] border border-[var(--portal-line)] bg-[var(--portal-surface)]"
      />
    ),
  },
);

export type ServiceTranslationInitial = {
  locale: string;
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  ctaLabel: string | null;
};

type LocaleTab = { code: string; isDefault: boolean };

type BaseFallback = {
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  ctaLabel: string | null;
};

type Props = {
  locales: LocaleTab[];
  defaultLocale: string;
  initialTranslations: ServiceTranslationInitial[];
  /** Used to pre-fill the default-locale tab when no translation row exists
   *  yet (pre-backfill). */
  baseFallback: BaseFallback;
};

const EMPTY: Omit<ServiceTranslationInitial, "locale"> = {
  name: "",
  summary: null,
  seoTitle: null,
  seoDescription: null,
  heroTitle: null,
  heroDescription: null,
  detailBody: null,
  ctaLabel: null,
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
 * Per-locale CMS content tabs. Every panel stays mounted (inactive ones are
 * hidden, not unmounted) so the form submits `tr_<LOCALE>_<field>` for every
 * locale in one go. The default-locale tab seeds the Service base columns.
 */
export function ServiceTranslationTabs({
  locales,
  defaultLocale,
  initialTranslations,
  baseFallback,
}: Props) {
  const upperDefault = defaultLocale.toUpperCase();
  const [active, setActive] = useState(
    locales.find((l) => l.code === upperDefault)?.code ?? locales[0]?.code ?? upperDefault,
  );

  function valuesFor(code: string): Omit<ServiceTranslationInitial, "locale"> {
    const found = initialTranslations.find((t) => t.locale.toUpperCase() === code);
    if (found) return found;
    if (code === upperDefault) return baseFallback;
    return EMPTY;
  }

  return (
    <div className="gh-admin-service-translations">
      <header>
        <h3 className="m-0 text-sm font-bold text-[var(--color-text-primary)]">
          Content &amp; translations
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Name, summary, hero, SEO and CTA per language. The{" "}
          <span className="font-semibold">{localeLabel(upperDefault)}</span> tab is the
          default — other languages fall back to it when a field is left blank.
        </p>
      </header>

      {/* Tab strip */}
      <PortalTabs
        ariaLabel="Service translations"
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
            className="gh-admin-service-translation-panel"
          >
            <label className="flex flex-col gap-2">
              <span className="gh-field-label">
                Title (name){isDefault ? " *" : ""}
              </span>
              <input
                name={`tr_${l.code}_name`}
                className="gh-input min-w-0"
                defaultValue={v.name}
                required={isDefault}
                placeholder={isDefault ? "" : "Leave blank to use the default language"}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Summary</span>
              <textarea
                name={`tr_${l.code}_summary`}
                rows={4}
                className="gh-input min-h-[6rem] min-w-0 resize-y"
                defaultValue={v.summary ?? ""}
              />
            </label>

            <div className="gh-admin-service-field-grid gh-admin-service-field-grid--two">
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">SEO title</span>
                <input
                  name={`tr_${l.code}_seoTitle`}
                  className="gh-input min-w-0"
                  defaultValue={v.seoTitle ?? ""}
                  placeholder="Optional — used for the page <title>"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">SEO description</span>
                <textarea
                  name={`tr_${l.code}_seoDescription`}
                  rows={2}
                  className="gh-input min-w-0 resize-y"
                  defaultValue={v.seoDescription ?? ""}
                  placeholder="Optional — meta description"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Hero title</span>
              <input
                name={`tr_${l.code}_heroTitle`}
                className="gh-input min-w-0"
                defaultValue={v.heroTitle ?? ""}
                placeholder="e.g. Online Medical Consultation Ireland"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Hero description</span>
              <textarea
                name={`tr_${l.code}_heroDescription`}
                rows={3}
                className="gh-input min-w-0 resize-y"
                defaultValue={v.heroDescription ?? ""}
                placeholder="Short tagline shown under the hero title."
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">CTA button label</span>
              <input
                name={`tr_${l.code}_ctaLabel`}
                className="gh-input min-w-0"
                defaultValue={v.ctaLabel ?? ""}
                placeholder="e.g. Book Consultation"
              />
            </label>

            <RichTextHtmlField
              name={`tr_${l.code}_detailBody`}
              label="Detail body"
              initialValue={v.detailBody ?? ""}
              helperText="Rich description shown on the service detail page. Select text, then apply heading, bold, italic, underline, colour, bullet or numbered lists — same tools as the doctor bio."
            />
          </div>
        );
      })}
    </div>
  );
}
