import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Code2,
  HeartHandshake,
  Languages,
  Mail,
  Stethoscope,
  Video,
} from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryAbout, type AboutCopyTemplates } from "@/lib/content/country-about";
import { getCountryContact, fillTemplate } from "@/lib/content/country-contact";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { AboutArchPanel, Pillar } from "@/components/sections/AboutBlocks";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export const revalidate = 300;

/** One hiring inbox for every market — not the market's patient-support email. */
const CAREERS_EMAIL = "careers@myglobalhealth.online";

/**
 * Meta keywords per market, in the market's language, from OpenSEO/DataForSEO
 * research (2026-08-30). Brazil is the one market with real volume
 * ("vagas telemedicina" ~320/mo, "vagas médico telemedicina" ~170/mo); the
 * rest are the exact low-volume phrases people do use.
 */
const CAREERS_KEYWORDS: Record<string, string[]> = {
  ie: ["online doctor jobs ireland", "telemedicine jobs ireland", "telehealth jobs ireland", "remote doctor jobs"],
  es: ["trabajo médico online", "empleo telemedicina", "empleo médico telemedicina"],
  pt: ["emprego telemedicina", "emprego médico telemedicina", "telemedicina emprego"],
  cz: ["telemedicína práce", "práce lékař online", "kariéra telemedicína"],
  ro: ["locuri de muncă telemedicină", "job medic online", "cariere telemedicină"],
  br: ["vagas telemedicina", "vagas médico telemedicina", "plantão telemedicina vagas", "vaga telemedicina clínico geral", "vaga médico home office"],
};

type Params = { country: string; lang: string };

/**
 * Route params → country config + locale-resolved careers copy. Same resolver
 * shape as /about: templates live in company.json (careers), market facts
 * (regulator, email, consultation languages) come from the shared per-country
 * content files. One component serves every market × locale.
 */
async function resolve(country: string, lang: string) {
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return null;
  const config = (await getPublicCountryByCode(code)) ?? getCountryByCode(code);
  const contact = getCountryContact(code);
  const about = getCountryAbout(code);
  if (!config || !contact || !about) return null;
  const bundle = loadLocaleBundle(lang as LocaleCode);
  const t = bundle.company.careers;
  // Language names are already translated in the about bundle (`lang_<code>`).
  const aboutT = bundle.about.country as unknown as AboutCopyTemplates;
  const countryName = getCommonLocale(lang as LocaleCode).countryNames?.[code] ?? config.name;
  const languageNames = about.consultLanguages.map(
    (c) => aboutT[`lang_${c}`] ?? c.toUpperCase(),
  );
  const vars = {
    country: countryName,
    regulator: contact.regulator.name,
    email: CAREERS_EMAIL,
  };
  return { code, config, contact, countryName, languageNames, t, vars };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) return { title: SITE_NAME };
  const { config, countryName, t, vars } = resolved;

  return buildPublicMetadata({
    path: `/${country}/${lang}/careers`,
    title: fillTemplate(t.titleTemplate, vars),
    description: fillTemplate(t.descriptionTemplate, vars),
    brandSuffix: false,
    type: "website",
    kind: "corporate",
    subtitle: countryName,
    sourceImage: "/images/stock/doctors.jpg",
    imageAlt: t.heroImageAlt,
    keywords: CAREERS_KEYWORDS[resolved.code],
    locale: ogLocales(config, lang).locale,
    languages: hreflangAlternates(config, "/careers"),
  });
}

export default async function CountryCareersPage({ params }: { params: Promise<Params> }) {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) notFound();
  const { config, contact, countryName, languageNames, t, vars } = resolved;

  const base = `/${country}/${lang}`;
  const applyHref = `mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(`Careers — ${SITE_NAME} ${countryName}`)}`;

  const pillars = [
    {
      icon: <Stethoscope className="size-5" strokeWidth={1.5} aria-hidden />,
      title: t.pillarDoctorsTitle,
      body: t.pillarDoctorsBody,
    },
    {
      icon: <HeartHandshake className="size-5" strokeWidth={1.5} aria-hidden />,
      title: t.pillarOpsTitle,
      body: t.pillarOpsBody,
    },
    {
      icon: <Code2 className="size-5" strokeWidth={1.5} aria-hidden />,
      title: t.pillarTechTitle,
      body: t.pillarTechBody,
    },
  ];

  const trustCards = [
    {
      icon: <BadgeCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.trustRegulatedTitle,
      subtitle: contact.regulator.name,
    },
    {
      icon: <Video className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.trustRemoteTitle,
      subtitle: t.trustRemoteSubtitle,
    },
    {
      icon: <Languages className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.trustLanguagesTitle,
      subtitle: languageNames.join(" · "),
    },
  ];

  return (
    <section>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: countryName, url: base },
          { name: t.breadcrumb, url: `${base}/careers` },
        ])}
      />

      {/* DARK — hero, same anatomy as /about */}
      <PageHero
        countryCode={config.code}
        countryLabel={`${SITE_NAME} · ${countryName}`}
        watermark={t.watermark}
        titleLead={t.h1Template}
        titleAccent=""
        lede={fillTemplate(t.introTemplate, vars)}
        ctaLabel={t.ctaApply}
        ctaHref="#apply"
        secondaryLabel={t.ctaContact}
        secondaryHref={`${base}/contact`}
        trustCards={trustCards}
        rightSlot={
          <AboutArchPanel
            src="/images/stock/doctors.jpg"
            alt={t.heroImageAlt}
            floats={trustCards.map(({ title, subtitle }, i) => ({
              icon:
                i === 0 ? (
                  <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />
                ) : i === 1 ? (
                  <Video className="size-4" strokeWidth={2} aria-hidden />
                ) : (
                  <Languages className="size-4" strokeWidth={2} aria-hidden />
                ),
              title,
              subtitle,
            }))}
          />
        }
        mobileBgSrc="/images/stock/doctors.jpg"
      />

      {/* LIGHT — the three tracks people join us on, as /about pillars */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]">
            {t.whyEyebrow}
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(2rem,4vw+0.5rem,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">
            {t.whyHeading}
          </h2>
          <p className="mt-6 max-w-[62ch] text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
            {fillTemplate(t.whyBodyTemplate, vars)}
          </p>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar, i) => (
              <Pillar
                key={pillar.title}
                icon={pillar.icon}
                eyebrow={String(i + 1).padStart(2, "0")}
                title={pillar.title}
                body={pillar.body}
              />
            ))}
          </div>
        </div>
      </section>

      {/* DARK — how to apply */}
      <section
        id="apply"
        className="gh-inline-clamp-section-pricing relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
      >
        <SectionSeam theme="dark" />
        <div className="mx-auto grid max-w-[var(--container-width)] gap-12 px-5 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-accent)]">
              {t.rolesEyebrow}
            </p>
            <h2 className="mt-4 text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white/92">
              {t.rolesHeading}
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={applyHref} className="gh2-btn-lime gh-focus-on-dark">
                <Mail className="size-4" strokeWidth={1.75} aria-hidden />
                {t.ctaApply}
              </a>
              <Link href={`${base}/contact`} className="gh2-btn-ghost gh-focus-on-dark">
                {t.ctaContact}
              </Link>
            </div>
          </div>
          <div className="space-y-5 text-[length:var(--text-body)] leading-relaxed text-white/70">
            <p>{t.rolesBody}</p>
            <p className="font-medium text-white/90">{fillTemplate(t.doctorNoteTemplate, vars)}</p>
            <p className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-[15px]">
              <a
                href={`mailto:${CAREERS_EMAIL}`}
                className="inline-flex items-center gap-2 font-medium underline underline-offset-4"
                style={{ color: "var(--color-brand-accent)" }}
              >
                <Mail className="size-4" strokeWidth={1.75} aria-hidden />
                {CAREERS_EMAIL}
              </a>
              <a
                href={contact.regulator.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium underline underline-offset-4"
                style={{ color: "var(--color-brand-accent)" }}
              >
                <BadgeCheck className="size-4" strokeWidth={1.75} aria-hidden />
                {contact.regulator.name}
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </a>
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
