"use client";

import { useState } from "react";
import { PortalTabs } from "@/components/PortalTabs";
import { HtmlBodyFieldLazy } from "./html-body-field-lazy";

export type BlogTranslationInitial = {
  locale: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
};

type Props = {
  /** Locales offered as tabs — the post's own locale is excluded by the
   *  caller, because a post is not a translation of itself. */
  locales: string[];
  /** The post's own language, named in the helper text so the editor knows
   *  where the original is edited. */
  originalLocale: string;
  initialTranslations: BlogTranslationInitial[];
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
 * Per-locale title, slug, excerpt, body and SEO for a blog post — the same
 * tab pattern as DoctorTranslationTabs, so the two admin screens behave
 * alike. Every panel stays mounted (inactive ones hidden) and the fields are
 * named `tr_<LOCALE>_<field>`, so one submit saves every language at once
 * instead of the old flow of one page reload per locale.
 *
 * A tab left entirely blank is skipped on save; clearing the title and slug
 * of a language that already exists is what removes it, and the panel says so
 * rather than leaving deletion to a separate button.
 */
export function BlogTranslationTabs({ locales, originalLocale, initialTranslations }: Props) {
  const [active, setActive] = useState(locales[0] ?? "");

  function valuesFor(code: string): BlogTranslationInitial {
    const found = initialTranslations.find((t) => t.locale.toUpperCase() === code);
    return (
      found ?? { locale: code, title: "", slug: "", excerpt: null, content: null, seoTitle: null, seoDesc: null }
    );
  }

  if (locales.length === 0) return null;

  return (
    <div className="gh-admin-blog-translation-tabs flex flex-col gap-4">
      <p className="m-0 text-portal-meta text-[var(--color-text-muted)]">
        The post itself is written in{" "}
        <span className="font-semibold">{localeLabel(originalLocale)}</span> and is edited in the
        form above. Each tab below is a full translation with its own title, slug and body — the
        slug is the URL that language is published under.
      </p>

      <PortalTabs
        ariaLabel="Blog translations"
        value={active}
        onChange={setActive}
        items={locales.map((code) => ({
          value: code,
          label: `${localeLabel(code)}${
            initialTranslations.some((t) => t.locale.toUpperCase() === code) ? " ·" : ""
          }`,
        }))}
      />

      {locales.map((code) => {
        const v = valuesFor(code);
        const exists = initialTranslations.some((t) => t.locale.toUpperCase() === code);
        return (
          <div
            key={code}
            role="tabpanel"
            hidden={code !== active}
            className="gh-admin-blog-tab-panel flex flex-col gap-4"
          >
            <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--two">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Title</span>
                <input
                  type="text"
                  name={`tr_${code}_title`}
                  defaultValue={v.title}
                  className="gh-input min-w-0"
                  placeholder="Leave blank to skip this language"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Slug</span>
                <input
                  type="text"
                  name={`tr_${code}_slug`}
                  defaultValue={v.slug}
                  className="gh-input min-w-0"
                  placeholder="native-language-url"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Excerpt</span>
              <textarea
                name={`tr_${code}_excerpt`}
                rows={2}
                defaultValue={v.excerpt ?? ""}
                className="gh-input"
              />
            </label>

            <div className="flex flex-col gap-1">
              <span className="gh-field-label">Body (HTML)</span>
              <HtmlBodyFieldLazy name={`tr_${code}_content`} initialValue={v.content ?? ""} />
            </div>

            <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--two">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">SEO title</span>
                <input
                  type="text"
                  name={`tr_${code}_seoTitle`}
                  defaultValue={v.seoTitle ?? ""}
                  className="gh-input min-w-0"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">SEO description</span>
                <input
                  type="text"
                  name={`tr_${code}_seoDesc`}
                  defaultValue={v.seoDesc ?? ""}
                  className="gh-input min-w-0"
                />
              </label>
            </div>

            <p className="m-0 text-portal-meta text-[var(--color-text-muted)]">
              {exists
                ? "Clearing both the title and the slug removes this language when you save."
                : "Title and slug are both required to create this language. A body is needed before it can be served."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
