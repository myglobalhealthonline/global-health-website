import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Languages, Mail, Video } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryAbout, type AboutCopyTemplates } from "@/lib/content/country-about";
import { getCountryContact, fillTemplate } from "@/lib/content/country-contact";
import { groupJobsByDepartment, listPublicJobs } from "@/lib/content/get-public-jobs";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { AboutArchPanel } from "@/components/sections/AboutBlocks";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export const revalidate = 60;
const CAREERS_EMAIL = "careers@myglobalhealth.online";
const CAREERS_KEYWORDS: Record<string, string[]> = {
  ie: ["online doctor jobs ireland", "telemedicine jobs ireland", "remote doctor jobs"],
  es: ["trabajo médico online", "empleo telemedicina"], pt: ["emprego telemedicina", "emprego médico telemedicina"],
  cz: ["telemedicína práce", "práce lékař online"], ro: ["locuri de muncă telemedicină", "job medic online"],
  br: ["vagas telemedicina", "vagas médico telemedicina", "vaga médico home office"],
};
type Params = { country: string; lang: string };

async function resolve(country: string, lang: string) {
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return null;
  const config = (await getPublicCountryByCode(code)) ?? getCountryByCode(code);
  const contact = getCountryContact(code);
  const about = getCountryAbout(code);
  if (!config || !contact || !about) return null;
  const bundle = loadLocaleBundle(lang as LocaleCode);
  const t = bundle.company.careers;
  const aboutT = bundle.about.country as unknown as AboutCopyTemplates;
  const countryName = getCommonLocale(lang as LocaleCode).countryNames?.[code] ?? config.name;
  const languageNames = about.consultLanguages.map((item) => aboutT[`lang_${item}`] ?? item.toUpperCase());
  const vars = { country: countryName, regulator: contact.regulator.name, email: CAREERS_EMAIL };
  return { code, config, contact, countryName, languageNames, t, vars };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) return { title: SITE_NAME };
  return buildPublicMetadata({
    path: `/${country}/${lang}/careers`, title: fillTemplate(resolved.t.titleTemplate, resolved.vars),
    description: fillTemplate(resolved.t.descriptionTemplate, resolved.vars), brandSuffix: false,
    type: "website", kind: "corporate", subtitle: resolved.countryName,
    sourceImage: "/images/stock/doctors.jpg", imageAlt: resolved.t.heroImageAlt,
    keywords: CAREERS_KEYWORDS[resolved.code], locale: ogLocales(resolved.config, lang).locale,
    languages: hreflangAlternates(resolved.config, "/careers"),
  });
}

export default async function CountryCareersPage({ params }: { params: Promise<Params> }) {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) notFound();
  const { config, countryName, languageNames, t, vars, contact } = resolved;
  const base = `/${country}/${lang}`;
  const result = await listPublicJobs(config.code, lang);
  const groups = result.state === "loaded" ? groupJobsByDepartment(result.jobs) : [];
  const trustCards = [
    { icon: <BadgeCheck className="size-[18px]" aria-hidden />, title: t.trustRegulatedTitle, subtitle: contact.regulator.name },
    { icon: <Video className="size-[18px]" aria-hidden />, title: t.trustRemoteTitle, subtitle: t.trustRemoteSubtitle },
    { icon: <Languages className="size-[18px]" aria-hidden />, title: t.trustLanguagesTitle, subtitle: languageNames.join(" · ") },
  ];

  return <section>
    <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: "/" }, { name: countryName, url: base }, { name: t.breadcrumb, url: `${base}/careers` }])} />
    <PageHero countryCode={config.code} countryLabel={`${SITE_NAME} · ${countryName}`} watermark={t.watermark}
      titleLead={t.h1Template} titleAccent="" lede={fillTemplate(t.introTemplate, vars)}
      ctaLabel={t.openPositions} ctaHref="#open-positions" secondaryLabel={t.ctaContact} secondaryHref={`${base}/contact`}
      trustCards={trustCards} rightSlot={<AboutArchPanel src="/images/stock/doctors.jpg" alt={t.heroImageAlt}
        floats={trustCards} />} mobileBgSrc="/images/stock/doctors.jpg" />

    <section id="open-positions" className="gh-careers-openings gh2-section-ivory">
      <SectionSeam theme="light" />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <p className="gh-eyebrow">{t.rolesEyebrow}</p>
        <h2>{t.openPositions}</h2>
        {result.state === "unavailable" ? (
          <div className="gh-careers-state" role="status"><strong>{t.unavailableTitle}</strong><p>{t.unavailableBody}</p></div>
        ) : result.state === "empty" ? (
          <div className="gh-careers-state"><strong>{t.emptyTitle}</strong><p>{t.emptyBody}</p>
            <a href={`mailto:${CAREERS_EMAIL}`}><Mail className="size-4" aria-hidden />{CAREERS_EMAIL}</a></div>
        ) : (
          <div className="gh-careers-groups">
            {groups.map((group) => <section key={group.department} className="gh-careers-group">
              <h3>{group.department}</h3>
              <ul>{group.jobs.map((job) => <li key={job.id}>
                <Link href={`${base}/careers/${job.slug}`} aria-label={`${job.title} — ${job.location}`}>
                  <span>{job.title}</span><small>{job.location}</small>
                </Link>
              </li>)}</ul>
            </section>)}
          </div>
        )}
      </div>
    </section>
  </section>;
}
