import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Building2, Clock3, MapPin } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { getPublicJob } from "@/lib/content/get-public-jobs";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { sanitizeCareerDescriptionHtml } from "@/lib/content/sanitize-page-body";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { breadcrumbJsonLd, jobPostingJsonLd } from "@/lib/seo/structured-data";
import { buildPublicMetadata, noindexFollow } from "@/lib/seo/page-seo";
import { getSiteUrl } from "@/lib/seo/site-url";
import { JobApplicationForm } from "./_components/job-application-form";
import { JobShareActions } from "./_components/job-share-actions";

export const revalidate = 60;
type Params = { country: string; lang: string; slug: string };

async function resolve(params: Params) {
  const code = countryCodeFromSlug(params.country);
  if (!code || !isSupportedLocale(params.lang)) return null;
  const config = (await getPublicCountryByCode(code)) ?? getCountryByCode(code);
  if (!config) return null;
  const locale = params.lang as LocaleCode;
  const countryName = getCommonLocale(locale).countryNames?.[code] ?? config.name;
  return { code, config, locale, countryName, t: loadLocaleBundle(locale).company.careers };
}

const plainText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const value = await params;
  const context = await resolve(value);
  if (!context) return {};
  const result = await getPublicJob(context.code, value.lang, value.slug);
  if (result.state !== "loaded") return { title: context.t.unavailableTitle, robots: result.state === "missing" ? { index: false } : undefined };
  const sourceLocale = result.job.locale.toLowerCase();
  const isFallback = sourceLocale !== value.lang;
  const path = `/${value.country}/${sourceLocale}/careers/${result.job.slug}`;
  const metadata = buildPublicMetadata({
    path, title: result.job.title, brandSuffix: true,
    description: plainText(result.job.descriptionHtml ?? "").slice(0, 155) || `${result.job.department} · ${result.job.location}`,
    type: "website", kind: "corporate", subtitle: `${result.job.department} · ${result.job.location}`,
    sourceImage: "/images/stock/doctors.jpg", imageAlt: result.job.title,
  });
  return isFallback ? noindexFollow(metadata) : metadata;
}

export default async function JobDetailPage({ params }: { params: Promise<Params> }) {
  const value = await params;
  const context = await resolve(value);
  if (!context) notFound();
  const result = await getPublicJob(context.code, value.lang, value.slug);
  if (result.state === "missing") notFound();
  const base = `/${value.country}/${value.lang}`;
  if (result.state === "unavailable") return <main className="gh-careers-detail gh2-section-ivory">
    <div className="mx-auto max-w-[var(--container-width)] px-5 py-24 md:px-10">
      <Link href={`${base}/careers`}><ArrowLeft className="size-4" aria-hidden />{context.t.backToOpenings}</Link>
      <div className="gh-careers-state gh2-card-ivory" role="status"><strong>{context.t.unavailableTitle}</strong><p>{context.t.unavailableBody}</p></div>
    </div>
  </main>;
  if (result.state !== "loaded") notFound();

  const job = result.job;
  const descriptionHtml = sanitizeCareerDescriptionHtml(job.descriptionHtml);
  const sourceLocale = job.locale.toLowerCase();
  const relativeUrl = `${base}/careers/${job.slug}`;
  const canonicalPath = `/${value.country}/${sourceLocale}/careers/${job.slug}`;
  const canonicalUrl = `${getSiteUrl()}${canonicalPath}`;
  const workplaceLabel = context.t[`workplace${job.workplaceMode}` as "workplaceREMOTE" | "workplaceHYBRID" | "workplaceONSITE"];

  return <>
    <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: "/" }, { name: context.countryName, url: base },
      { name: context.t.breadcrumb, url: `${base}/careers` }, { name: job.title, url: relativeUrl }])} />
    <JsonLd data={jobPostingJsonLd({ id: job.id, title: job.title, descriptionHtml, datePosted: job.publishedAt,
      validThrough: job.closesAt, employmentType: job.employmentType, workplaceMode: job.workplaceMode,
      location: job.location, countryName: context.countryName, countryCode: context.code, url: canonicalUrl })} />
    <GH2CompactHero
      eyebrow={context.t.breadcrumb}
      title={<span lang={sourceLocale}>{job.title}</span>}
      body={<span lang={sourceLocale}>{job.department} · {job.location}</span>}
      watermark={context.t.watermark}
      backHref={`${base}/careers`}
      backLabel={context.t.backToOpenings}
    />
    <main className="gh-careers-detail gh-inline-clamp-section relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
      <SectionSeam theme="light" />
      <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
      <div className="gh-careers-detail-grid">
        <article className="gh-careers-job-main gh2-card-ivory">
          <div className="gh-careers-prose gh-article-body" lang={sourceLocale} dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
          <JobApplicationForm jobId={job.id} privacyHref={`${base}/legal/privacy-policy`} locale={context.locale} copy={{
            heading: context.t.applyHeading, fullName: context.t.formFullName, email: context.t.formEmail,
            phone: context.t.formPhone, message: context.t.formMessage, cv: context.t.formCv, cvHelp: context.t.formCvHelp,
            privacyPrefix: context.t.formPrivacyPrefix, privacyLink: context.t.formPrivacyLink, submit: context.t.formSubmit,
            submitting: context.t.formSubmitting, success: context.t.formSuccess, invalidPdf: context.t.formInvalidPdf,
            tooLarge: context.t.formTooLarge, infected: context.t.formInfected, unavailable: context.t.formUnavailable,
            genericError: context.t.formGenericError, closed: context.t.formClosed,
          }} />
        </article>
        <aside className="gh-careers-job-aside gh2-card-ivory">
          <a href="#apply" className="gh2-btn-lime">{context.t.ctaApply}</a>
          <JobShareActions url={canonicalUrl} title={job.title} copyLabel={context.t.copyLink} copiedLabel={context.t.copiedLink} shareLabel={context.t.shareJob} />
          <dl>
            <div><dt><MapPin aria-hidden />{context.t.locationLabel}</dt><dd lang={sourceLocale}>{job.location}</dd></div>
            <div><dt><Building2 aria-hidden />{context.t.departmentLabel}</dt><dd lang={sourceLocale}>{job.department}</dd></div>
            <div><dt><BriefcaseBusiness aria-hidden />{context.t.employmentTypeLabel}</dt><dd lang={sourceLocale}>{job.employmentType}</dd></div>
            <div><dt><Clock3 aria-hidden />{context.t.workplaceLabel}</dt><dd>{workplaceLabel}</dd></div>
            {job.minimumExperience ? <div><dt>{context.t.experienceLabel}</dt><dd lang={sourceLocale}>{job.minimumExperience}</dd></div> : null}
          </dl>
        </aside>
      </div>
      </div>
    </main>
  </>;
}
