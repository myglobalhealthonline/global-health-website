import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  getCountryLegalDocument,
  getCountryDisclaimer,
  legalTypeFromSlug,
} from "@/lib/content/get-country-legal";
import { sanitizePageBodyHtml } from "@/lib/content/sanitize-page-body";
import { SITE_NAME } from "@/lib/constants";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const revalidate = 300;

type Params = { country: string; lang: string; type: string };

// ponytail: empty array opts the route into static generation without
// prerendering any slug at build time (no backend call); real slugs render
// on-demand and get cached via ISR.
export function generateStaticParams() {
  return [];
}

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
  const result = await getCountryLegalDocument(code, legalType, lang);
  if (!result) {
    // Mirror the page's medical-disclaimer fallback so the standalone page
    // still has a real title when only the profile field is set.
    if (legalType === "MEDICAL_DISCLAIMER") {
      const { fullParagraphs } = await getCountryDisclaimer(code, lang);
      if (fullParagraphs.length > 0) {
        return {
          title: `Medical Disclaimer — ${config.name}`,
          description: `Medical disclaimer for ${SITE_NAME} in ${config.name}.`,
        };
      }
    }
    return { title: SITE_NAME };
  }
  return {
    title: `${result.document.title} — ${config.name}`,
    description: `${result.document.title} for ${SITE_NAME} in ${config.name}.`,
  };
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

      <section
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
            className="gh-legal-prose space-y-4 text-base leading-relaxed text-[var(--color-text-body)] [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.01em] [&_h2]:text-[var(--color-text-primary)] [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[var(--color-text-primary)] [&_a]:font-medium [&_a]:text-[var(--color-brand-primary)] [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:list-inside [&_ol]:list-decimal [&_ol]:space-y-1"
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
      </section>
    </>
  );
}
