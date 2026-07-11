import {
  ADMIN_PAGE_KEY_LABELS,
  ADMIN_PAGE_KEYS,
  type AdminCountryDto,
  type AdminPageDto,
} from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../_components/managed-image-field";
import { FormSection } from "@/components/FormSection";
import { RichTextHtmlFieldLazy as RichTextHtmlField } from "../../_components/rich-text-html-field-lazy";

type Props = {
  countries: AdminCountryDto[];
  page?: AdminPageDto | null;
  defaultCountryId?: string;
  isCreate?: boolean;
};

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-portal-body text-[var(--color-text-primary)]";

const labelClass =
  "block text-portal-meta font-semibold text-[var(--color-text-muted)]";

export function PageFields({ countries, page, defaultCountryId, isCreate }: Props) {
  const selectedCountryId = page?.countryId ?? defaultCountryId ?? countries[0]?.id ?? "";
  const selectedCountry = countries.find((c) => c.id === selectedCountryId) ?? null;
  // When editing, the locale is fixed by the row's existing (country, pageKey, locale) uniqueness;
  // it can be changed via the dropdown but server-side validation will reject a duplicate.

  return (
    <div className="gh-admin-page-fields flex flex-col gap-5">
      <FormSection
        title="Scope"
        description="Each page is uniquely identified by (country, page type, locale)."
      >
          <label className={labelClass}>
            Country
            <select
              name="countryId"
              required
              defaultValue={selectedCountryId}
              disabled={!isCreate && Boolean(page)}
              className={inputClass}
            >
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Page type
            <select
              name="pageKey"
              required
              defaultValue={page?.pageKey ?? "HOME"}
              disabled={!isCreate && Boolean(page)}
              className={inputClass}
            >
              {ADMIN_PAGE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {ADMIN_PAGE_KEY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Locale
            <select
              name="locale"
              required
              defaultValue={page?.locale ?? selectedCountry?.defaultLocale ?? "EN"}
              disabled={!isCreate && Boolean(page)}
              className={inputClass}
            >
              {(selectedCountry?.countryLocales.map((cl) => cl.locale) ?? ["EN", "PT", "ES", "CS", "RO", "DE"]).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        {!isCreate ? (
          <p className="gh-form-section__span-2 text-portal-meta" style={{ color: "var(--portal-muted)" }}>
            Scope is locked after creation. To move a page to a different country/locale, create a new page and disable the old one.
          </p>
        ) : null}
      </FormSection>

      <FormSection
        title="Hero"
        description="Top-of-page headline, subheadline, supporting image, and primary CTA."
      >
          <label className={labelClass}>
            Hero title
            <input
              type="text"
              name="heroTitle"
              maxLength={240}
              defaultValue={page?.heroTitle ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Hero subtitle
            <textarea
              name="heroSubtitle"
              maxLength={480}
              rows={2}
              defaultValue={page?.heroSubtitle ?? ""}
              className={inputClass}
            />
          </label>
          <div className="gh-form-section__span-2">
            <ManagedImageField
              name="heroImagePath"
              label="Hero image"
              helperText="Optional. Provide a /path or full https URL."
              initialPath={page?.heroImagePath ?? page?.heroImage?.path ?? null}
            />
          </div>
          <label className={labelClass}>
            CTA label
            <input
              type="text"
              name="ctaLabel"
              maxLength={120}
              defaultValue={page?.ctaLabel ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            CTA target (href)
            <input
              type="text"
              name="ctaHref"
              maxLength={2000}
              placeholder="/ireland/en/book-online"
              defaultValue={page?.ctaHref ?? ""}
              className={inputClass}
            />
          </label>
      </FormSection>

      <FormSection
        title="Body"
        description="Editable rich-text body shown under the hero. Supports basic HTML."
      >
          <label className={`${labelClass} gh-form-section__span-2`}>
            Title (internal)
            <input
              type="text"
              name="title"
              required
              maxLength={240}
              defaultValue={page?.title ?? ""}
              className={inputClass}
            />
          </label>
          <div className="gh-form-section__span-2">
            <RichTextHtmlField
              name="body"
              label="Body content"
              helperText="HTML allowed: paragraphs, headings, lists, links."
              initialValue={page?.body ?? ""}
            />
          </div>
      </FormSection>

      <FormSection
        title="SEO"
        description="Meta title, description, and Open Graph image used in social shares."
      >
          <label className={labelClass}>
            SEO title
            <input
              type="text"
              name="seoTitle"
              maxLength={180}
              defaultValue={page?.seoTitle ?? ""}
              className={inputClass}
            />
            <span className="mt-1 text-portal-thead text-[var(--color-text-muted)]">
              Recommended ~60 characters. Used as the browser tab title and search-result headline.
            </span>
          </label>
          <label className={labelClass}>
            SEO description
            <textarea
              name="seoDescription"
              maxLength={320}
              rows={3}
              defaultValue={page?.seoDescription ?? ""}
              className={inputClass}
            />
            <span className="mt-1 text-portal-thead text-[var(--color-text-muted)]">
              Recommended ~155 characters. Shown under the title in search results.
            </span>
          </label>
          <div className="gh-form-section__span-2">
            <ManagedImageField
              name="ogImagePath"
              label="Open Graph (social share) image"
              helperText="Optional. 1200×630 recommended."
              initialPath={page?.ogImagePath ?? page?.ogImage?.path ?? null}
            />
          </div>
      </FormSection>

      <FormSection title="Publish" description="Drafts are hidden from the public site.">
          <label className={labelClass}>
            Status
            <select
              name="status"
              defaultValue={page?.status ?? "DRAFT"}
              className={inputClass}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </label>
          <label className="mt-6 inline-flex items-center gap-2 text-portal-body text-[var(--color-text-primary)]">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={page?.isActive ?? true}
              className="size-4"
            />
            Active
          </label>
      </FormSection>
    </div>
  );
}
