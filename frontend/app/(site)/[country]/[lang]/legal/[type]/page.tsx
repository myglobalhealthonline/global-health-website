import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  getCountryLegalDocument,
  legalTypeFromSlug,
} from "@/lib/content/get-country-legal";
import { sanitizePageBodyHtml } from "@/lib/content/sanitize-page-body";
import { SITE_NAME } from "@/lib/constants";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";

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
  const result = await getCountryLegalDocument(code, legalType, lang);
  if (!result) return { title: SITE_NAME };
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
  if (!result) notFound();
  const { document } = result;

  // Render-time sanitization is the security boundary: admin-authored HTML
  // must never execute script in a visitor's browser, even if a payload
  // slips past the editor.
  const safeHtml = sanitizePageBodyHtml(document.content);
  const updatedLabel = DATE_FMT.format(new Date(document.publishedAt ?? document.updatedAt));

  return (
    <>
      <GH2CompactHero
        eyebrow={`${config.name} · Legal`}
        title={document.title}
        accent=""
        watermark="Legal"
        meta={<p className="gh2-index">Version {document.version} · Last updated {updatedLabel}</p>}
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
            All legal documents
          </Link>
          {document.pdfUrl ? (
            <a
              href={document.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gh2-btn-lime"
            >
              <FileDown className="size-4" aria-hidden />
              Download PDF
            </a>
          ) : null}
        </div>

        {safeHtml ? (
          <div
            className="gh-legal-prose space-y-4 text-base leading-relaxed text-[var(--color-text-body)] [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.01em] [&_h2]:text-[var(--color-text-primary)] [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[var(--color-text-primary)] [&_a]:font-medium [&_a]:text-[var(--color-brand-primary)] [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:list-inside [&_ol]:list-decimal [&_ol]:space-y-1"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : document.pdfUrl ? (
          <p className="text-[15px] leading-relaxed text-[var(--color-text-body)]">
            This document is provided as a PDF. Use the download button above to read it.
          </p>
        ) : null}
      </section>
    </>
  );
}
