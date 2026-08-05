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
  /** Alt text for the shared cover image, in this locale. */
  coverImageAlt: string | null;
};

type Props = {
  /** Every locale the site serves, the post's own included. English leads the
   *  strip; the post's own locale is marked as the original. */
  locales: string[];
  /** The post's own language. Its tab writes the post's own columns
   *  (title, slug, body …) rather than a translation row, because a post is
   *  not a translation of itself. */
  originalLocale: string;
  /** Current values of the post's own language, shown in its tab. */
  original: Omit<BlogTranslationInitial, "locale">;
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
 * Every language of a blog post in one tab strip, the same pattern as
 * DoctorTranslationTabs. The post's own language posts back the post's own
 * field names (`title`, `slug`, `body`, …); the others post
 * `tr_<LOCALE>_<field>` and become BlogTranslation rows. All panels stay
 * mounted, so one submit saves the article and every translation together.
 *
 * Keeping the original in the strip is the point: an editor should not have
 * to know that one language lives in the form above and five live below.
 */
export function BlogTranslationTabs({ locales, originalLocale, original, initialTranslations }: Props) {
  const upperOriginal = originalLocale.toUpperCase();
  // English first, then the rest alphabetically. The admin team works in
  // English, so it leads and opens by default even when the article was
  // authored in the market's language — that one keeps its "original" label
  // wherever it sits in the strip.
  const ordered = [...new Set([upperOriginal, ...locales.map((l) => l.toUpperCase())])].sort(
    (a, b) => (a === "EN" ? -1 : b === "EN" ? 1 : a.localeCompare(b)),
  );
  const [active, setActive] = useState(ordered[0]);

  function valuesFor(code: string): Omit<BlogTranslationInitial, "locale"> {
    if (code === upperOriginal) return original;
    return (
      initialTranslations.find((t) => t.locale.toUpperCase() === code) ?? {
        title: "",
        slug: "",
        excerpt: null,
        content: null,
        seoTitle: null,
        seoDesc: null,
        coverImageAlt: null,
      }
    );
  }

  /** Field names differ for the original: it is the post itself. */
  function fieldName(
    code: string,
    field: "title" | "slug" | "excerpt" | "body" | "seoTitle" | "seoDesc" | "coverImageAlt",
  ) {
    if (code !== upperOriginal) {
      return `tr_${code}_${field === "body" ? "content" : field}`;
    }
    return field === "seoDesc" ? "seoDescription" : field;
  }

  return (
    <div className="gh-admin-blog-translation-tabs flex flex-col gap-4">
      <p className="m-0 text-portal-meta text-[var(--color-text-muted)]">
        Every language of this article, including the original. Each one has its own title, slug
        and body — the slug is the URL that language is published at. Saving writes them all at
        once.
      </p>

      <PortalTabs
        ariaLabel="Article languages"
        value={active}
        onChange={setActive}
        items={ordered.map((code) => {
          const isOriginal = code === upperOriginal;
          const exists = initialTranslations.some((t) => t.locale.toUpperCase() === code);
          return {
            value: code,
            label: `${localeLabel(code)}${isOriginal ? " · original" : exists ? " ·" : ""}`,
          };
        })}
      />

      {ordered.map((code) => {
        const v = valuesFor(code);
        const isOriginal = code === upperOriginal;
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
                <span className="gh-field-label">Title{isOriginal ? " *" : ""}</span>
                <input
                  type="text"
                  name={fieldName(code, "title")}
                  defaultValue={v.title}
                  className="gh-input min-w-0"
                  maxLength={240}
                  required={isOriginal}
                  placeholder={isOriginal ? undefined : "Leave blank to skip this language"}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Slug{isOriginal ? " *" : ""}</span>
                <input
                  type="text"
                  name={fieldName(code, "slug")}
                  defaultValue={v.slug}
                  className="gh-input min-w-0"
                  maxLength={160}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  title="Lowercase letters, numbers and hyphens only"
                  required={isOriginal}
                  placeholder="native-language-url"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Excerpt</span>
              <textarea
                name={fieldName(code, "excerpt")}
                rows={2}
                maxLength={600}
                defaultValue={v.excerpt ?? ""}
                className="gh-input"
              />
            </label>

            <div className="flex flex-col gap-1">
              <span className="gh-field-label">Body (HTML)</span>
              <HtmlBodyFieldLazy name={fieldName(code, "body")} initialValue={v.content ?? ""} />
            </div>

            <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--two">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">SEO title</span>
                <input
                  type="text"
                  name={fieldName(code, "seoTitle")}
                  defaultValue={v.seoTitle ?? ""}
                  className="gh-input min-w-0"
                  maxLength={180}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">SEO description</span>
                <input
                  type="text"
                  name={fieldName(code, "seoDesc")}
                  defaultValue={v.seoDesc ?? ""}
                  className="gh-input min-w-0"
                  maxLength={320}
                />
              </label>
            </div>

            {/* The cover image is one asset shared by every language, but its
                alt text is prose and has to be read in the language of the
                page around it. The original's alt lives with the image itself,
                up in the cover field — this is the same string for the other
                languages. Left blank, the page falls back to the original's
                alt and then to the displayed title. */}
            {!isOriginal && (
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Cover image alt text</span>
                <input
                  type="text"
                  name={fieldName(code, "coverImageAlt")}
                  defaultValue={v.coverImageAlt ?? ""}
                  className="gh-input min-w-0"
                  maxLength={300}
                  placeholder={`Describe the cover image in ${localeLabel(code)}`}
                />
                <span className="text-portal-meta text-[var(--color-text-muted)]">
                  Same image, described in this language. Blank falls back to the original.
                </span>
              </label>
            )}

            <p className="m-0 text-portal-meta text-[var(--color-text-muted)]">
              {isOriginal
                ? "This is the article itself. Its cover image and alt text are set above, under the cover field."
                : exists
                  ? "Clearing both the title and the slug removes this language when you save."
                  : "Title and slug are both required to create this language. A body is needed before it can be served."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
