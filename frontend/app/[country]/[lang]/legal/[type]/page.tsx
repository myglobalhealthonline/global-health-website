import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  exactLocalesForLegalType,
  getCountryLegal,
  getCountryLegalDocument,
  getCountryDisclaimer,
  legalTypeFromSlug,
} from "@/lib/content/get-country-legal";
import { sanitizePageBodyHtml } from "@/lib/content/sanitize-page-body";
import { SITE_NAME } from "@/lib/constants";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { indexableHreflangCluster } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export const revalidate = 300;

type Params = { country: string; lang: string; type: string };

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang, type } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  const legalType = legalTypeFromSlug(type);
  if (!code || !config || !legalType || !isSupportedLocale(lang)) {
    return { title: SITE_NAME };
  }
  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const legalDescription = c.legalPage.heroBody
    .replace("{site}", SITE_NAME)
    .replace("{country}", config.name);
  const [result, legal] = await Promise.all([
    getCountryLegalDocument(code, legalType, lang),
    getCountryLegal(code),
  ]);
  let documentTitle: string | null = result?.document.title ?? null;
  if (!result) {
    // Mirror the page's medical-disclaimer fallback so the standalone page
    // still has a real title when only the profile field is set.
    if (legalType === "MEDICAL_DISCLAIMER") {
      const { fullParagraphs } = await getCountryDisclaimer(code, lang);
      if (fullParagraphs.length > 0) {
        documentTitle = c.legalPage.typeMedicalDisclaimer;
      }
    }
    if (!documentTitle) return { title: SITE_NAME };
  }
  const title = `${documentTitle} · ${config.name}`;
  // International-locale batch (2026-08-09): the exact-locale → "en" → any-
  // published-row fallback (get-country-legal.ts) lets a type with only ONE
  // real translation 200 for every supported locale — verified live: 46 of
  // 297 country x locale x type combinations serve the wrong language. A
  // page whose OWN route locale isn't in the exact-translation set is
  // showing fallback content, not a real localized document: noindex,follow
  // (still crawlable/linkable, just not offered to search as this locale's
  // page) and the hreflang cluster only advertises the locales that are
  // actually real, matching the same set sitemap.ts now submits.
  const exactLocales = exactLocalesForLegalType(legal, legalType, config.defaultLocale);
  const isExactLocale = exactLocales.has(lang.toLowerCase());
  const metadata = buildPublicMetadata({
    path: `/${country}/${lang}/legal/${type}`,
    title,
    description: `${documentTitle}. ${legalDescription}`,
    locale: `${lang}_${code.toUpperCase()}`,
    subtitle: config.name,
    imageAlt: `${documentTitle} — ${config.name}`,
    languages: indexableHreflangCluster(config, `/legal/${type}`, exactLocales),
  });
  return isExactLocale ? metadata : { ...metadata, robots: { index: false, follow: true } };
}

export default async function CountryLegalDocumentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang, type } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();
  const legalType = legalTypeFromSlug(type);
  if (!legalType) notFound();

  const result = await getCountryLegalDocument(code, legalType, lang);

  // Medical-disclaimer fallback: when no published CountryLegalDocument exists,
  // render the per-country CountryLegalProfile.fullDisclaimer (admin "Medical
  // Disclaimer" section). A published document still wins where present (e.g.
  // Ireland's richer HTML), so this only fills the gap for markets that only
  // have the profile field. Keeps the standalone page + footer/doctor links
  // resolving instead of 404ing.
  const disclaimerParagraphs =
    !result && legalType === "MEDICAL_DISCLAIMER"
      ? (await getCountryDisclaimer(code, lang)).fullParagraphs
      : [];

  if (!result && disclaimerParagraphs.length === 0) notFound();

  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const t = c.legalDocPage;

  // Render-time sanitization is the security boundary: admin-authored HTML
  // must never execute script in a visitor's browser, even if a payload
  // slips past the editor.
  const safeHtml = result ? sanitizePageBodyHtml(result.document.content) : null;
  const title = result ? result.document.title : "Medical Disclaimer";
  const pdfUrl = result?.document.pdfUrl ?? null;
  const metaLine = result
    ? t.meta
        .replace("{version}", String(result.document.version))
        .replace(
          "{date}",
          DATE_FMT.format(new Date(result.document.publishedAt ?? result.document.updatedAt)),
        )
    : null;

  return (
    <>
      <GH2CompactHero
        eyebrow={t.heroEyebrow.replace("{country}", config.name)}
        title={title}
        accent=""
        watermark={t.heroWatermark}
        meta={metaLine ? <p className="gh2-index">{metaLine}</p> : undefined}
      />

      <section className="relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <div
          className="mx-auto max-w-3xl px-5 md:px-10"
          style={{ padding: "clamp(48px,6vw,80px) 20px" }}
        >
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Link
            href={`/${slug}/${lang}/legal`}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {t.backToAll}
          </Link>
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gh2-btn-lime"
            >
              <FileDown className="size-4" aria-hidden />
              {t.downloadPdf}
            </a>
          ) : null}
        </div>

        {safeHtml ? (
          <div
            className="gh-legal-prose space-y-4 text-base leading-relaxed text-[var(--color-text-body)] [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.01em] [&_h2]:text-[var(--color-text-primary)] [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[var(--color-text-primary)] [&_a]:font-medium [&_a]:text-[var(--color-brand-primary)] [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:list-inside [&_ol]:list-decimal [&_ol]:space-y-1 [&_table]:mt-6 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-[var(--color-border)] [&_th]:bg-[var(--color-background-panel)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold [&_th]:text-[var(--color-text-primary)] [&_td]:border [&_td]:border-[var(--color-border)] [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:text-[var(--color-text-body)]"
            // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- safeHtml = sanitizePageBodyHtml(result.document.content), sanitize-html with a controlled allowlist.
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : disclaimerParagraphs.length > 0 ? (
          <div className="gh-legal-prose space-y-4 text-base leading-relaxed text-[var(--color-text-body)]">
            {disclaimerParagraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        ) : pdfUrl ? (
          <p className="text-[15px] leading-relaxed text-[var(--color-text-body)]">
            {t.pdfOnly}
          </p>
        ) : null}
        </div>
      </section>
    </>
  );
}
