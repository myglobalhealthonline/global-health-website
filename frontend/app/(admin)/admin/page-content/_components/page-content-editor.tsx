"use client";

import { useState } from "react";
import type { AdminPageContentDto, AdminPageContentTranslationDto } from "@/lib/admin/admin-api";
import { PortalTabs } from "@/components/PortalTabs";
import { FormSection } from "@/components/FormSection";
import { Btn } from "../../_components/atoms";
import { ManagedImageField } from "../../_components/managed-image-field";
import { RichTextHtmlFieldLazy as RichTextHtmlField } from "../../_components/rich-text-html-field-lazy";
import {
  DISCLAIMER_SLOTS,
  FAQ_SLOTS,
  WHO_FOR_SLOTS,
  WHY_CHOOSE_SLOTS,
} from "./page-content-form-parse";

type LocaleTab = { code: string; isDefault: boolean };

const LOCALE_LABELS: Record<string, string> = {
  EN: "English",
  PT: "Portuguese",
  ES: "Spanish",
  CS: "Czech",
  RO: "Romanian",
  DE: "German",
};

function localeLabel(code: string): string {
  return LOCALE_LABELS[code.toUpperCase()] ?? code.toUpperCase();
}

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-portal-body text-[var(--color-text-primary)]";
const labelClass = "block text-portal-meta font-semibold text-[var(--color-text-muted)]";

function emptyTranslation(locale: string): AdminPageContentTranslationDto {
  return {
    id: "",
    pageContentId: "",
    locale: locale as AdminPageContentTranslationDto["locale"],
    heroTitle: null,
    heroTitleLead: null,
    heroTitleAccent: null,
    heroSubtitle: null,
    ctaLabel: null,
    intro: null,
    whoForTitle: null,
    whoForIntro: null,
    whoForItems: [],
    whyChooseTitle: null,
    whyChooseItems: [],
    faq: [],
    disclaimerParagraphs: [],
    disclaimerShort: null,
    body: null,
    seoTitle: null,
    seoDescription: null,
    createdAt: "",
    updatedAt: "",
  };
}

/** Section header toggle checkbox — value is shared across every locale tab
 *  (it lives on the base row, not the translation), so it only needs to be
 *  rendered once regardless of which tab is active. */
function SectionToggle({
  name,
  defaultChecked,
  warn,
}: {
  name: string;
  defaultChecked: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {warn ? (
        <span
          className="gh-pill inline-flex items-center gap-1.5 whitespace-nowrap"
          style={{
            padding: "3px 10px",
            borderRadius: "var(--portal-radius-pill)",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: "var(--portal-warning-soft)",
            color: "var(--portal-warning-text)",
          }}
        >
          No content — hidden on site
        </span>
      ) : null}
      <label className="inline-flex items-center gap-2 text-portal-compact text-[var(--color-text-primary)]">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4" />
        Show on site
      </label>
    </div>
  );
}

function RepeatableTextRows({
  prefix,
  locale,
  count,
  values,
  placeholder,
}: {
  prefix: string;
  locale: string;
  count: number;
  values: string[];
  placeholder: string;
}) {
  return (
    <div className="gh-form-section__span-2 grid gap-2">
      {Array.from({ length: count }, (_, i) => (
        <input
          key={i}
          name={`${prefix}__${locale}__${i}`}
          defaultValue={values[i] ?? ""}
          maxLength={2000}
          className={inputClass}
          style={{ marginTop: 0 }}
          placeholder={`${placeholder} ${i + 1}`}
        />
      ))}
    </div>
  );
}

function FaqRows({
  locale,
  faq,
}: {
  locale: string;
  faq: Array<{ question: string; answer: string }>;
}) {
  return (
    <div className="gh-form-section__span-2 grid gap-2">
      {Array.from({ length: FAQ_SLOTS }, (_, i) => {
        const row = faq[i];
        return (
          <div
            key={i}
            className="grid gap-2 rounded border border-[var(--color-border)] bg-[var(--color-background-soft)] p-2 sm:grid-cols-2"
          >
            <input
              name={`faq_q__${locale}__${i}`}
              defaultValue={row?.question ?? ""}
              maxLength={400}
              className={inputClass}
              style={{ marginTop: 0 }}
              placeholder={`Question ${i + 1}`}
            />
            <input
              name={`faq_a__${locale}__${i}`}
              defaultValue={row?.answer ?? ""}
              maxLength={4000}
              className={inputClass}
              style={{ marginTop: 0 }}
              placeholder={`Answer ${i + 1}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export function PageContentEditor({
  countryName,
  pageLabel,
  locales,
  record,
  saveAction,
}: {
  countryName: string;
  pageLabel: string;
  locales: LocaleTab[];
  record: AdminPageContentDto | null;
  saveAction: (formData: FormData) => void | Promise<void>;
}) {
  const [activeLocale, setActiveLocale] = useState(
    locales.find((l) => l.isDefault)?.code ?? locales[0]?.code ?? "EN",
  );
  const localeCsv = locales.map((l) => l.code).join(",");

  const translationsByLocale = new Map(
    (record?.translations ?? []).map((t) => [t.locale.toUpperCase(), t]),
  );
  const defaultLocale = locales.find((l) => l.isDefault)?.code ?? locales[0]?.code;
  const defaultTranslation = defaultLocale ? translationsByLocale.get(defaultLocale) : undefined;

  const nonEmpty = (s?: string | null) => !!s && s.trim().length > 0;
  const listNonEmpty = (v: unknown) => Array.isArray(v) && v.length > 0;

  return (
    <form action={saveAction} className="gh-admin-page-form mt-6 flex flex-col gap-6">
      <input type="hidden" name="locales" value={localeCsv} />

      <FormSection
        title="Publish"
        description={`${countryName} · ${pageLabel}`}
        right={
          <Btn type="submit" variant="primary" size="md">
            Save
          </Btn>
        }
      >
        <label className={labelClass}>
          Status
          <select name="status" defaultValue={record?.status ?? "DRAFT"} className={inputClass}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
        <label className="mt-6 inline-flex items-center gap-2 text-portal-body text-[var(--color-text-primary)]">
          <input type="checkbox" name="isActive" defaultChecked={record?.isActive ?? true} className="size-4" />
          Active
        </label>
      </FormSection>

      <div>
        <PortalTabs
          ariaLabel="Page content languages"
          value={activeLocale}
          onChange={setActiveLocale}
          items={locales.map((l) => ({
            value: l.code,
            label: `${localeLabel(l.code)}${l.isDefault ? " · default" : ""}`,
          }))}
        />
        <p className="mt-2 text-portal-meta text-[var(--color-text-muted)]">
          Empty fields in other languages fall back to the default language on the site.
        </p>
      </div>

      <FormSection title="Hero" description="Overrides the page's default headline, subheadline and CTA.">
        {locales.map((l) => {
          const t = translationsByLocale.get(l.code) ?? emptyTranslation(l.code);
          return (
            <div key={l.code} className={l.code === activeLocale ? "contents" : "hidden"}>
              <label className={labelClass}>
                Hero title
                <input name={`heroTitle__${l.code}`} defaultValue={t.heroTitle ?? ""} maxLength={240} className={inputClass} />
              </label>
              <label className={labelClass}>
                Headline lead
                <input name={`heroTitleLead__${l.code}`} defaultValue={t.heroTitleLead ?? ""} maxLength={240} className={inputClass} />
                <span className="mt-1 block text-portal-thead text-[var(--color-text-muted)]">
                  Composed as the page H1: lead + italic accent word. Leave empty to use the default headline.
                </span>
              </label>
              <label className={labelClass}>
                Headline accent
                <input name={`heroTitleAccent__${l.code}`} defaultValue={t.heroTitleAccent ?? ""} maxLength={240} className={inputClass} />
              </label>
              <label className={labelClass}>
                Hero subtitle
                <textarea name={`heroSubtitle__${l.code}`} defaultValue={t.heroSubtitle ?? ""} maxLength={480} rows={2} className={inputClass} />
              </label>
              <label className={labelClass}>
                CTA label
                <input name={`ctaLabel__${l.code}`} defaultValue={t.ctaLabel ?? ""} maxLength={120} className={inputClass} />
              </label>
            </div>
          );
        })}
        <label className={labelClass}>
          CTA target (href)
          <input name="ctaHref" defaultValue={record?.ctaHref ?? ""} maxLength={2000} placeholder="/ie/en/book-online" className={inputClass} />
        </label>
        <div className="gh-form-section__span-2">
          <ManagedImageField
            name="heroImagePath"
            label="Hero image"
            helperText="Optional. Shared across every language."
            initialPath={record?.heroImagePath ?? null}
          />
        </div>
      </FormSection>

      <FormSection
        title="Intro"
        description="Positioning paragraph shown under the hero."
        right={<SectionToggle name="showIntro" defaultChecked={record?.showIntro ?? false} warn={(record?.showIntro ?? false) && !nonEmpty(defaultTranslation?.intro)} />}
      >
        {locales.map((l) => {
          const t = translationsByLocale.get(l.code) ?? emptyTranslation(l.code);
          return (
            <div key={l.code} hidden={l.code !== activeLocale} className="gh-form-section__span-2">
              <textarea name={`intro__${l.code}`} defaultValue={t.intro ?? ""} maxLength={4000} rows={4} className={inputClass} />
            </div>
          );
        })}
      </FormSection>

      <FormSection
        title="Who it's for"
        description="Each item renders as one checklist card, identical design to the Ireland page."
        right={
          <SectionToggle
            name="showWhoFor"
            defaultChecked={record?.showWhoFor ?? false}
            warn={(record?.showWhoFor ?? false) && !listNonEmpty(defaultTranslation?.whoForItems)}
          />
        }
      >
        {locales.map((l) => {
          const t = translationsByLocale.get(l.code) ?? emptyTranslation(l.code);
          return (
            <div key={l.code} className={l.code === activeLocale ? "contents" : "hidden"}>
              <label className={labelClass}>
                Title
                <input name={`whoForTitle__${l.code}`} defaultValue={t.whoForTitle ?? ""} maxLength={240} className={inputClass} />
              </label>
              <label className={labelClass}>
                Intro
                <input name={`whoForIntro__${l.code}`} defaultValue={t.whoForIntro ?? ""} maxLength={2000} className={inputClass} />
              </label>
              <RepeatableTextRows prefix="whoForItems" locale={l.code} count={WHO_FOR_SLOTS} values={t.whoForItems ?? []} placeholder="Item" />
            </div>
          );
        })}
      </FormSection>

      <FormSection
        title="Why choose Global Health"
        description="Each item renders as one card, identical design to the Ireland page."
        right={
          <SectionToggle
            name="showWhyChoose"
            defaultChecked={record?.showWhyChoose ?? false}
            warn={(record?.showWhyChoose ?? false) && !listNonEmpty(defaultTranslation?.whyChooseItems)}
          />
        }
      >
        {locales.map((l) => {
          const t = translationsByLocale.get(l.code) ?? emptyTranslation(l.code);
          return (
            <div key={l.code} className={l.code === activeLocale ? "contents" : "hidden"}>
              <label className={labelClass}>
                Title
                <input name={`whyChooseTitle__${l.code}`} defaultValue={t.whyChooseTitle ?? ""} maxLength={240} className={inputClass} />
              </label>
              <RepeatableTextRows prefix="whyChooseItems" locale={l.code} count={WHY_CHOOSE_SLOTS} values={t.whyChooseItems ?? []} placeholder="Item" />
            </div>
          );
        })}
      </FormSection>

      <FormSection
        title="FAQ"
        description="Question/answer pairs shown in the FAQ accordion."
        right={
          <SectionToggle
            name="showFaq"
            defaultChecked={record?.showFaq ?? false}
            warn={(record?.showFaq ?? false) && !listNonEmpty(defaultTranslation?.faq)}
          />
        }
      >
        {locales.map((l) => {
          const t = translationsByLocale.get(l.code) ?? emptyTranslation(l.code);
          return (
            <div key={l.code} className={l.code === activeLocale ? "contents" : "hidden"}>
              <FaqRows locale={l.code} faq={t.faq ?? []} />
            </div>
          );
        })}
      </FormSection>

      <FormSection
        title="Disclaimer"
        description="Legal text — publish only clinic-approved wording."
        right={
          <SectionToggle
            name="showDisclaimer"
            defaultChecked={record?.showDisclaimer ?? false}
            warn={
              (record?.showDisclaimer ?? false) &&
              !listNonEmpty(defaultTranslation?.disclaimerParagraphs) &&
              !nonEmpty(defaultTranslation?.disclaimerShort)
            }
          />
        }
      >
        {locales.map((l) => {
          const t = translationsByLocale.get(l.code) ?? emptyTranslation(l.code);
          return (
            <div key={l.code} className={l.code === activeLocale ? "contents" : "hidden"}>
              <label className={labelClass}>
                Short disclaimer
                <input name={`disclaimerShort__${l.code}`} defaultValue={t.disclaimerShort ?? ""} maxLength={2000} className={inputClass} />
              </label>
              <RepeatableTextRows
                prefix="disclaimerParagraphs"
                locale={l.code}
                count={DISCLAIMER_SLOTS}
                values={t.disclaimerParagraphs ?? []}
                placeholder="Paragraph"
              />
            </div>
          );
        })}
      </FormSection>

      <FormSection
        title="Rich body"
        description="Editable rich-text body shown under the hero."
        right={<SectionToggle name="showBody" defaultChecked={record?.showBody ?? false} warn={(record?.showBody ?? false) && !nonEmpty(defaultTranslation?.body)} />}
      >
        {locales.map((l) => {
          const t = translationsByLocale.get(l.code) ?? emptyTranslation(l.code);
          return (
            <div key={l.code} hidden={l.code !== activeLocale} className="gh-form-section__span-2">
              <RichTextHtmlField name={`body__${l.code}`} label="Body content" initialValue={t.body ?? ""} />
            </div>
          );
        })}
      </FormSection>

      <FormSection title="SEO" description="Meta title, description, and Open Graph image.">
        {locales.map((l) => {
          const t = translationsByLocale.get(l.code) ?? emptyTranslation(l.code);
          return (
            <div key={l.code} className={l.code === activeLocale ? "contents" : "hidden"}>
              <label className={labelClass}>
                SEO title
                <input name={`seoTitle__${l.code}`} defaultValue={t.seoTitle ?? ""} maxLength={180} className={inputClass} />
              </label>
              <label className={labelClass}>
                SEO description
                <textarea name={`seoDescription__${l.code}`} defaultValue={t.seoDescription ?? ""} maxLength={320} rows={3} className={inputClass} />
              </label>
            </div>
          );
        })}
        <div className="gh-form-section__span-2">
          <ManagedImageField name="ogImagePath" label="Open Graph (social share) image" helperText="Shared across every language." initialPath={record?.ogImagePath ?? null} />
        </div>
      </FormSection>

      <div className="gh-admin-support-actions flex items-center justify-end gap-2">
        <Btn type="submit" variant="primary" size="md">
          Save
        </Btn>
      </div>
    </form>
  );
}
