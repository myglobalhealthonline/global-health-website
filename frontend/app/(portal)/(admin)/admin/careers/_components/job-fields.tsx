"use client";

import { useMemo, useState } from "react";
import { FormSection } from "@/components/FormSection";
import { PortalTabPanel, PortalTabs } from "@/components/PortalTabs";
import { RichTextHtmlFieldLazy } from "../../_components/rich-text-html-field-lazy";
import type { AdminJobDetailDto, AdminJobLocale } from "@/lib/admin/admin-api";
import { slugifyJobTitle } from "./job-form-parse";

type CountryOption = {
  id: string;
  name: string;
  defaultLocale: string;
  countryLocales: Array<{ locale: string }>;
};

const inputClass = "gh-input min-w-0";
const localeNames: Record<AdminJobLocale, string> = {
  EN: "English",
  PT: "Português",
  ES: "Español",
  CS: "Čeština",
  RO: "Română",
  DE: "Deutsch",
};
const asLocale = (value: string) => value.toUpperCase() as AdminJobLocale;

export function JobFields({
  countries,
  job,
}: {
  countries: CountryOption[];
  job?: AdminJobDetailDto;
}) {
  const locked = Boolean(job?.publishedAt);
  const countryLocked = Boolean(job);
  const initialCountry = job?.countryId ?? countries[0]?.id ?? "";
  const [countryId, setCountryId] = useState(initialCountry);
  const selectedCountry = countries.find((country) => country.id === countryId);
  const defaultLocale = asLocale(selectedCountry?.defaultLocale ?? "EN");
  const localeOptions = useMemo(() => {
    if (!selectedCountry) return [];
    return [...new Set([
      selectedCountry.defaultLocale,
      ...selectedCountry.countryLocales.map(({ locale }) => locale),
      ...(job?.localizations.map(({ locale }) => locale) ?? []),
    ])].map(asLocale);
  }, [job?.localizations, selectedCountry]);
  const [activeLocale, setActiveLocale] = useState<AdminJobLocale>(
    localeOptions.includes("EN") ? "EN" : localeOptions[0] ?? defaultLocale,
  );
  const [slug, setSlug] = useState(job?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(job));

  return <>
    <FormSection title="Listing" description="One public URL with content for every enabled language.">
      <label><span className="gh-field-label">Country *</span>
        <select name="countryId" className="gh-select" value={countryId} disabled={countryLocked} onChange={(event) => {
          const next = countries.find((country) => country.id === event.target.value);
          setCountryId(event.target.value);
          setActiveLocale(asLocale(next?.defaultLocale ?? "EN"));
        }}>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select>
        {countryLocked ? <input type="hidden" name="countryId" value={countryId} /> : null}
      </label>
      <label><span className="gh-field-label">URL slug *</span><input name="slug" className={inputClass} value={slug} maxLength={120} required readOnly={locked} onChange={(event) => {
        setSlug(event.target.value.toLowerCase());
        setSlugEdited(true);
      }} /></label>
      <input type="hidden" name="defaultLocale" value={defaultLocale} />
    </FormSection>

    <FormSection className="mt-4" title="Job settings" description="Shared by every language version.">
      <label><span className="gh-field-label">Workplace *</span><select name="workplaceMode" className="gh-select" defaultValue={job?.workplaceMode ?? "REMOTE"}><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On site</option></select></label>
      <label><span className="gh-field-label">Closing date and time (UTC)</span><input name="closesAt" type="datetime-local" className={inputClass} defaultValue={job?.closesAt?.slice(0, 16) ?? ""} /></label>
      <label><span className="gh-field-label">Status *</span><select name="status" className="gh-select" defaultValue={job?.status ?? "DRAFT"} disabled={job?.status === "ARCHIVED"}>
        {job?.status !== "PUBLISHED" && job?.status !== "ARCHIVED" ? <option value="DRAFT">Draft</option> : null}
        {job?.status !== "ARCHIVED" ? <option value="PUBLISHED">Published</option> : null}
        {job ? <option value="ARCHIVED">Archived</option> : null}
      </select>{job?.status === "ARCHIVED" ? <input type="hidden" name="status" value="ARCHIVED" /> : null}</label>
    </FormSection>

    <FormSection className="mt-4" title="Content & translations" description={`Complete ${localeNames[defaultLocale]}; blank languages use it as the public fallback.`}>
      <div className="gh-form-section__span-2 min-w-0">
        <PortalTabs
          ariaLabel="Job translations"
          value={activeLocale}
          onChange={(value) => setActiveLocale(asLocale(value))}
          items={localeOptions.map((locale) => ({
            value: locale,
            label: `${localeNames[locale]}${locale === defaultLocale ? " · default" : ""}`,
          }))}
        />
        {localeOptions.map((locale) => {
          const initial = job?.localizations.find((localization) => localization.locale === locale);
          return <PortalTabPanel key={locale} value={locale} activeValue={activeLocale} className="mt-5">
            <input type="hidden" name="translationLocale" value={locale} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2"><span className="gh-field-label">Job title{locale === defaultLocale ? " *" : ""}</span><input name={`tr_${locale}_title`} className={inputClass} defaultValue={initial?.title ?? ""} maxLength={140} onChange={(event) => {
                if (locale === defaultLocale && !slugEdited) setSlug(slugifyJobTitle(event.target.value));
              }} /></label>
              <label className="flex flex-col gap-2"><span className="gh-field-label">Department{locale === defaultLocale ? " *" : ""}</span><input name={`tr_${locale}_department`} className={inputClass} defaultValue={initial?.department ?? ""} maxLength={80} /></label>
              <label className="flex flex-col gap-2"><span className="gh-field-label">Location{locale === defaultLocale ? " *" : ""}</span><input name={`tr_${locale}_location`} className={inputClass} defaultValue={initial?.location ?? ""} maxLength={120} /></label>
              <label className="flex flex-col gap-2"><span className="gh-field-label">Employment type{locale === defaultLocale ? " *" : ""}</span><input name={`tr_${locale}_employmentType`} className={inputClass} defaultValue={initial?.employmentType ?? ""} placeholder="Full time, Contract…" maxLength={80} /></label>
              <label className="flex flex-col gap-2 md:col-span-2"><span className="gh-field-label">Minimum experience</span><input name={`tr_${locale}_minimumExperience`} className={inputClass} defaultValue={initial?.minimumExperience ?? ""} maxLength={100} /></label>
              <div className="min-w-0 md:col-span-2"><RichTextHtmlFieldLazy name={`tr_${locale}_descriptionHtml`} label={`Job description${locale === defaultLocale ? " *" : ""}`} initialValue={initial?.descriptionHtml ?? ""} /></div>
            </div>
          </PortalTabPanel>;
        })}
      </div>
    </FormSection>
  </>;
}
