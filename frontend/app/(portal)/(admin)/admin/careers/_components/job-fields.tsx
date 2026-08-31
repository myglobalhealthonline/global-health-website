"use client";

import { useMemo, useState } from "react";
import { FormSection } from "@/components/FormSection";
import { RichTextHtmlFieldLazy } from "../../_components/rich-text-html-field-lazy";
import type { AdminJobDto } from "@/lib/admin/admin-api";
import { slugifyJobTitle } from "./job-form-parse";

type CountryOption = { id: string; name: string; defaultLocale: string; countryLocales: Array<{ locale: string }> };
const inputClass = "gh-input min-w-0";

export function JobFields({ countries, job }: { countries: CountryOption[]; job?: AdminJobDto }) {
  const locked = Boolean(job?.publishedAt);
  const initialCountry = job?.countryId ?? countries[0]?.id ?? "";
  const [countryId, setCountryId] = useState(initialCountry);
  const selectedCountry = countries.find((country) => country.id === countryId);
  const localeOptions = useMemo(() => {
    if (!selectedCountry) return [];
    return [...new Set([selectedCountry.defaultLocale, ...selectedCountry.countryLocales.map((row) => row.locale)])].map((v) => v.toUpperCase());
  }, [selectedCountry]);
  const [locale, setLocale] = useState(job?.locale ?? localeOptions[0] ?? "EN");
  const [title, setTitle] = useState(job?.title ?? "");
  const [slug, setSlug] = useState(job?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(job));

  return <>
    <FormSection title="Listing" description="Market, language and public URL.">
      <label><span className="gh-field-label">Country *</span>
        <select name="countryId" className="gh-select" value={countryId} disabled={locked} onChange={(event) => {
          const next = countries.find((country) => country.id === event.target.value);
          setCountryId(event.target.value); setLocale(next?.defaultLocale.toUpperCase() ?? "EN");
        }}>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select>
        {locked ? <input type="hidden" name="countryId" value={countryId} /> : null}
      </label>
      <label><span className="gh-field-label">Language *</span>
        <select name="locale" className="gh-select" value={locale} disabled={locked} onChange={(event) => setLocale(event.target.value)}>
          {localeOptions.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>{locked ? <input type="hidden" name="locale" value={locale} /> : null}
      </label>
      <label><span className="gh-field-label">Job title *</span><input name="title" className={inputClass} value={title} maxLength={160} required onChange={(event) => {
        setTitle(event.target.value); if (!slugEdited) setSlug(slugifyJobTitle(event.target.value));
      }} /></label>
      <label><span className="gh-field-label">URL slug *</span><input name="slug" className={inputClass} value={slug} maxLength={120} required readOnly={locked} onChange={(event) => { setSlug(event.target.value.toLowerCase()); setSlugEdited(true); }} /></label>
    </FormSection>
    <FormSection className="mt-4" title="Job details" description="The summary shown beside the full description.">
      <label><span className="gh-field-label">Department *</span><input name="department" className={inputClass} defaultValue={job?.department ?? ""} maxLength={100} required /></label>
      <label><span className="gh-field-label">Location *</span><input name="location" className={inputClass} defaultValue={job?.location ?? ""} maxLength={160} required /></label>
      <label><span className="gh-field-label">Workplace *</span><select name="workplaceMode" className="gh-select" defaultValue={job?.workplaceMode ?? "REMOTE"}><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On site</option></select></label>
      <label><span className="gh-field-label">Employment type *</span><input name="employmentType" className={inputClass} defaultValue={job?.employmentType ?? ""} placeholder="Full time, Contract…" maxLength={80} required /></label>
      <label><span className="gh-field-label">Minimum experience</span><input name="minimumExperience" className={inputClass} defaultValue={job?.minimumExperience ?? ""} maxLength={100} /></label>
      <label><span className="gh-field-label">Closing date and time (UTC)</span><input name="closesAt" type="datetime-local" className={inputClass} defaultValue={job?.closesAt?.slice(0, 16) ?? ""} /></label>
      <label><span className="gh-field-label">Status *</span><select name="status" className="gh-select" defaultValue={job?.status ?? "DRAFT"} disabled={job?.status === "ARCHIVED"}>
        {job?.status !== "PUBLISHED" && job?.status !== "ARCHIVED" ? <option value="DRAFT">Draft</option> : null}
        {job?.status !== "ARCHIVED" ? <option value="PUBLISHED">Published</option> : null}
        {job ? <option value="ARCHIVED">Archived</option> : null}
      </select>{job?.status === "ARCHIVED" ? <input type="hidden" name="status" value="ARCHIVED" /> : null}</label>
    </FormSection>
    <FormSection className="mt-4" title="Description" description="Headings, paragraphs, links and lists are supported.">
      <div className="gh-form-section__span-2"><RichTextHtmlFieldLazy name="descriptionHtml" label="Job description *" initialValue={job?.descriptionHtml} /></div>
    </FormSection>
  </>;
}
