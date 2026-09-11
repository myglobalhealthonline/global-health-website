import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Languages, Mail, Phone } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { fillTemplate } from "@/lib/content/country-contact";
import {
  formatPressMonth,
  getPressRelease,
  pressReleaseCopy,
  type PressBlock,
} from "@/lib/content/press-releases";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pressReleaseJsonLd } from "@/lib/seo/structured-data";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export const revalidate = 300;

type Params = { country: string; lang: string; slug: string };

const HERO_IMAGE = "/images/stock/contact.jpg";

/**
 * Route params → the market's release + its copy in this locale. A release is
 * published only under the market it was issued for, in every locale that
 * market serves; the chrome strings come from company.json (press).
 */
async function resolve(country: string, lang: string, slug: string) {
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return null;
  const release = getPressRelease(code, slug);
  if (!release) return null;
  const config = (await getPublicCountryByCode(code)) ?? getCountryByCode(code);
  if (!config) return null;
  const bundle = loadLocaleBundle(lang as LocaleCode);
  const t = bundle.company.press;
  const languageNames = bundle.about.country as unknown as Record<string, string>;
  const countryName = getCommonLocale(lang as LocaleCode).countryNames?.[code] ?? config.name;
  const copy = pressReleaseCopy(release.slug, lang as LocaleCode);
  return { config, release, copy, t, languageNames, countryName };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang, slug } = await params;
  const resolved = await resolve(country, lang, slug);
  if (!resolved) return { title: SITE_NAME };
  const { config, release, copy, t } = resolved;

  return buildPublicMetadata({
    path: `/${country}/${lang}/press/${release.slug}`,
    title: copy.title,
    description: copy.description,
    brandSuffix: false,
    type: "article",
    kind: "article",
    subtitle: t.releaseEyebrow,
    sourceImage: HERO_IMAGE,
    imageAlt: copy.title,
    locale: ogLocales(config, lang).locale,
    languages: hreflangAlternates(config, `/press/${release.slug}`),
  });
}

function Block({ block }: { block: PressBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="!mt-12 text-[clamp(1.4rem,1.5vw+0.9rem,1.9rem)] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--color-text-primary)]">
          {block.text}
        </h2>
      );
    case "p":
      return <p>{block.text}</p>;
    case "ul":
      return (
        <ul className="list-disc space-y-2 pl-6 marker:text-[var(--color-brand-primary)]">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "quote":
      return (
        // Pull quote in deep forest (gh2-glass-forest: near-opaque, so the
        // ivory ground can't wash it out to sage). The accent rail is inline
        // so it wins over the class's own border.
        <figure
          className="gh2-glass-forest !my-12 px-6 py-7 md:px-10 md:py-9"
          style={{ borderLeft: "3px solid var(--color-brand-accent)" }}
        >
          <blockquote className="text-[clamp(1.15rem,0.8vw+1rem,1.45rem)] font-semibold leading-[1.45] tracking-[-0.01em] text-white/92">
            {block.text}
          </blockquote>
          <figcaption className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-accent)]">
            {block.cite}
          </figcaption>
        </figure>
      );
  }
}

export default async function CountryPressReleasePage({ params }: { params: Promise<Params> }) {
  const { country, lang, slug } = await params;
  const resolved = await resolve(country, lang, slug);
  if (!resolved) notFound();
  const { config, release, copy, t, languageNames, countryName } = resolved;

  const base = `/${country}/${lang}`;
  const url = `${base}/press/${release.slug}`;
  const isTranslation = lang !== release.originalLocale;
  const contact = release.mediaContact;

  return (
    <section>
      <JsonLd
        data={pressReleaseJsonLd({
          title: copy.title,
          description: copy.description,
          url,
          datePublished: release.published,
          inLanguage: lang,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: countryName, url: base },
          { name: t.breadcrumb, url: `${base}/press` },
          { name: copy.title, url },
        ])}
      />

      {/* DARK — hero */}
      <PageHero
        countryCode={config.code}
        countryLabel={`${SITE_NAME} · ${t.releaseEyebrow}`}
        watermark={t.watermark}
        titleLead={copy.title}
        titleAccent=""
        lede={copy.standfirst}
        ctaLabel={t.releaseMediaContact}
        ctaHref="#media-contact"
        secondaryLabel={t.releaseBackToPress}
        secondaryHref={`${base}/press`}
        heroImage={{ src: HERO_IMAGE, alt: copy.title, priority: true }}
      />

      {/* LIGHT — the release */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <article className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          {isTranslation ? (
            <p className="mb-8 flex max-w-[68ch] flex-wrap items-center gap-x-2 gap-y-1 border-b border-[rgba(29,75,54,0.12)] pb-5 text-[14px] text-[var(--color-text-muted)]">
              <Languages className="size-4 shrink-0 text-[var(--color-brand-primary)]" strokeWidth={1.75} aria-hidden />
              {fillTemplate(t.releaseTranslationTemplate, {
                language: languageNames[`lang_${release.originalLocale}`] ?? release.originalLocale,
              })}
              <Link
                href={`/${country}/${release.originalLocale}/press/${release.slug}`}
                hrefLang={release.originalLocale}
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-4"
              >
                {t.releaseReadOriginal}
              </Link>
            </p>
          ) : null}
          <p className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]">
            <time dateTime={release.published}>{copy.dateline}</time>
          </p>
          <div className="mt-6 max-w-[68ch] space-y-5 text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-primary)]">
            {copy.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </article>
      </section>

      {/* DARK — media contact */}
      <section
        id="media-contact"
        className="gh-inline-clamp-section-pricing relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
      >
        <SectionSeam theme="dark" />
        <div className="mx-auto grid max-w-[var(--container-width)] gap-10 px-5 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-accent)]">
              {t.releaseEyebrow} · {formatPressMonth(release.published, lang)}
            </p>
            <h2 className="mt-4 text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white/92">
              {t.releaseMediaContact}
            </h2>
          </div>
          <div className="space-y-4 text-[length:var(--text-body)] leading-relaxed text-white/80">
            <p>
              <span className="font-semibold text-white/92">{contact.name}</span>
              {copy.contactRole ? <span className="block text-white/65">{copy.contactRole}</span> : null}
            </p>
            <p className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={`mailto:${contact.email}?subject=${encodeURIComponent(copy.title)}`}
                className="gh-btn gh-btn-primary"
              >
                <Mail className="size-4" strokeWidth={1.75} aria-hidden />
                <span className="sr-only">{t.releaseEmailLabel}: </span>
                {contact.email}
              </a>
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone.e164}`}
                  className="gh-focus-on-dark inline-flex items-center gap-2 text-[15px] text-white/85 underline decoration-white/30 underline-offset-4"
                >
                  <Phone className="size-4" strokeWidth={1.75} aria-hidden />
                  <span className="sr-only">{t.releasePhoneLabel}: </span>
                  {contact.phone.display}
                </a>
              ) : null}
            </p>
            <p className="pt-2 text-[15px]">
              <Link
                href={`${base}/press`}
                className="gh-focus-on-dark inline-flex items-center gap-2 font-medium text-[var(--color-brand-accent)] underline underline-offset-4"
              >
                <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
                {t.releaseBackToPress}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
