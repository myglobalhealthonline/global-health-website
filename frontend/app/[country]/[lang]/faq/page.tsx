import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  getCountryAbout,
  getCountryContact,
  resolveAboutCopy,
  type AboutCopyTemplates,
} from "@/lib/content/country-about";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { FAQTabs } from "@/components/sections/FAQTabs";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/structured-data";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { getMarketFaq, marketFaqLocales } from "@/lib/content/country-faq";
import { hreflangAlternates, indexableHreflangCluster, ogLocales } from "@/lib/seo/hreflang";
import { buildPublicMetadata, noindexFollow } from "@/lib/seo/page-seo";
import { buildBookHref } from "@/lib/routing/book-href";

export const revalidate = 300;

type Params = { country: string; lang: string };

/**
 * Route params → country config plus the two copy sources this page merges:
 * the market's own regulatory FAQs (same `resolveAboutCopy` the country /about
 * page uses, so the two can never disagree) and the six-locale `faq` bundle
 * that backs the global FAQ. The market group leads — it is the only part of
 * the page that differs per country, and it is what makes these 33 URLs
 * something other than one page submitted 33 times.
 */
async function resolve(country: string, lang: string) {
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return null;
  const config = (await getPublicCountryByCode(code)) ?? getCountryByCode(code);
  const contact = getCountryContact(code);
  const about = getCountryAbout(code);
  if (!config || !contact || !about) return null;
  const locale = lang as LocaleCode;
  const bundle = loadLocaleBundle(locale);
  const aboutT = bundle.about.country as unknown as AboutCopyTemplates;
  // Market name in the page's own language ("Brasil", "Česko"), matching the
  // country /about page.
  const countryName = getCommonLocale(locale).countryNames?.[code] ?? config.name;
  const defaultLocale = (config.defaultLocale ?? "en").toLowerCase() as LocaleCode;
  return {
    code,
    config,
    countryName,
    locale,
    defaultLocale,
    faq: bundle.faq,
    aboutBundle: bundle.about,
    aboutT,
    market: resolveAboutCopy(config, contact, about, aboutT, countryName),
    // Researched, per-market copy where it exists. `exact: false` means this
    // locale is reading someone else's language — see country-faq.ts.
    marketFaq: getMarketFaq(code, locale, defaultLocale),
  };
}

/**
 * The tabbed question set.
 *
 * Researched per-market copy wins outright when this country has it: those
 * groups are written against that market's own SERP and healthcare system
 * (which instrument the sick note actually is, who issues it, which regulator),
 * so pairing them with the generic set would restate the same answers in
 * weaker words. Until a market has that copy, fall back to the original shape —
 * templated market FAQs from `country-about`, then the four shared groups.
 */
function faqGroups(resolved: NonNullable<Awaited<ReturnType<typeof resolve>>>) {
  const { faq, market, countryName, marketFaq } = resolved;
  if (marketFaq) return marketFaq.groups;
  return [
    { eyebrow: countryName, title: market.faqHeading, items: market.faqs },
    {
      eyebrow: faq.g1_eyebrow,
      title: faq.g1_title,
      items: [
        { question: faq.g1_q1, answer: faq.g1_a1 },
        { question: faq.g1_q2, answer: faq.g1_a2 },
        { question: faq.g1_q3, answer: faq.g1_a3 },
      ],
    },
    {
      eyebrow: faq.g2_eyebrow,
      title: faq.g2_title,
      items: [
        { question: faq.g2_q1, answer: faq.g2_a1 },
        { question: faq.g2_q2, answer: faq.g2_a2 },
      ],
    },
    {
      eyebrow: faq.g3_eyebrow,
      title: faq.g3_title,
      items: [
        { question: faq.g3_q1, answer: faq.g3_a1 },
        { question: faq.g3_q2, answer: faq.g3_a2 },
      ],
    },
    {
      eyebrow: faq.g4_eyebrow,
      title: faq.g4_title,
      items: [
        { question: faq.g4_q1, answer: faq.g4_a1 },
        { question: faq.g4_q2, answer: faq.g4_a2 },
      ],
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) return { title: SITE_NAME };
  const { code, config, countryName, faq, marketFaq } = resolved;

  // Once a market has researched copy, only the locales that actually carry it
  // are publishable: the rest render a fallback language and must not claim to
  // be a translated alternate. Before any market copy exists the page is the
  // same generic set in every locale, which IS genuinely translated, so the
  // full cluster is correct. Same rule as /legal/* (exactLocalesForLegalType).
  const exactLocales = marketFaqLocales(code);
  const languages = marketFaq
    ? indexableHreflangCluster(config, "/faq", exactLocales)
    : hreflangAlternates(config, "/faq");

  const metadata = buildPublicMetadata({
    path: `/${country}/${lang}/faq`,
    // Country-qualified so the 33 variants don't ship one identical title.
    title: `${faq.faq_section_title} — ${countryName}`,
    description: `${countryName} — ${faq.hero_lede}`,
    type: "website",
    kind: "page",
    subtitle: config.name,
    sourceImage: "/images/stock/contact.jpg",
    imageAlt: `${faq.faq_section_title} — ${countryName}`,
    locale: ogLocales(config, lang).locale,
    ...(languages ? { languages } : {}),
    // Serving a fallback language is fine for a reader and wrong for an index
    // entry.
    noindex: marketFaq ? !marketFaq.exact : false,
  });
  if (!marketFaq || marketFaq.exact) return metadata;
  // `noindex, FOLLOW` — the fallback-language variant is a real page with real
  // internal links; `buildPublicMetadata`'s shared `noindex` is
  // `noindex, nofollow`, which needlessly cuts them. Same override as
  // /services/*, /health/*, /legal/* and blog pagination.
  return noindexFollow(metadata);
}

export default async function CountryFAQPage({ params }: { params: Promise<Params> }) {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) notFound();
  const { config, countryName, locale, faq, aboutBundle, aboutT } = resolved;

  const base = `/${country}/${lang}`;
  const groups = faqGroups(resolved);

  return (
    <section>
      <JsonLd data={faqJsonLd(groups.flatMap((group) => group.items))} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: countryName, url: base },
          { name: faq.faq_section_title, url: `${base}/faq` },
        ])}
      />

      <PageHero
        countryCode={config.code}
        countryLabel={`${SITE_NAME} · ${countryName}`}
        titleLead={faq.hero_title_lead}
        titleAccent={faq.hero_title_accent}
        titleTrail={faq.hero_title_trail}
        lede={faq.hero_lede}
        ctaLabel={faq.hero_cta}
        ctaHref={`${base}/contact`}
        // In-country the secondary CTA books, rather than sending the visitor
        // back to the country picker as the global page does.
        secondaryLabel={aboutT.ctaBook}
        secondaryHref={buildBookHref({ country, lang })}
        heroImage={{
          src: "/images/stock/contact.jpg",
          alt: "Telehealth care coordinator helping a patient during an online consultation",
          priority: true,
        }}
      />

      <FAQTabs groups={groups} />

      <section
        className="gh2-section-forest relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark"
        style={{ padding: "clamp(64px,8vw,96px) 0" }}
      >
        <SectionSeam theme="dark" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 700px 400px at 100% -10%, rgba(176,241,34,0.08), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                {faq.stuck_eyebrow}
              </p>
              <h2
                className="mt-4 max-w-[22ch] font-extrabold leading-[1.02] tracking-[-0.03em] text-white"
                style={{ fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)" }}
              >
                {faq.stuck_h2_pre}{" "}
                <span style={{ color: "var(--color-brand-accent)" }}>{faq.stuck_h2_accent}</span>
              </h2>
            </div>
            <Link href={`${base}/contact`} className="gh2-btn-lime gh-focus-on-dark lg:justify-self-end">
              {faq.stuck_cta}
              <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <DoctifyReviewsSection
        theme="ivory"
        variant="grid"
        language={locale}
        headline={aboutBundle.doctify_headline}
        headlineAccent={aboutBundle.doctify_headline_accent}
      />
    </section>
  );
}
