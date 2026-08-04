import type { Metadata } from "next";
import Link from "next/link";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { GH2LegalSummaryNotice } from "@/components/legal/GH2LegalSummaryNotice";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const { terms } = loadLocaleBundle(locale).legal;

  return buildPublicMetadata({
    path: "/terms",
    title: terms.title,
    description: terms.intro,
    locale,
    kind: "legal",
    subtitle: terms.summaryLabel,
    imageAlt: `${terms.title} - Global Health`,
  });
}

export default async function TermsPage() {
  const locale = await getPageLocale();
  const { terms, summaryNotice } = loadLocaleBundle(locale).legal;

  return (
    <>
      <GH2CompactHero
        eyebrow={terms.eyebrow}
        title={terms.title}
        accent=""
        watermark="Terms"
        meta={<p className="gh2-index">{terms.summaryLabel}</p>}
      />

      {/* Prose body — full-bleed ivory wrapper; body{} is dark forest
          globally, so every section must supply its own background or
          text reads dark-on-dark. Inner div keeps the readable measure. */}
      <section className="relative gh2-section-ivory">
        <SectionSeam theme="light" />
        <div
          className="mx-auto max-w-3xl px-5 md:px-10"
          style={{ padding: "clamp(48px,6vw,80px) 20px" }}
        >
        <div className="space-y-8 text-base leading-relaxed text-[var(--color-text-body)]">
          <section>
            <p>{terms.intro}</p>
          </section>

          <GH2LegalSummaryNotice
            locale={locale}
            badge={summaryNotice.badge}
            text={summaryNotice.text}
            linkIntro={summaryNotice.linkIntro}
          />

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s1_h}
            </h2>
            <p className="mt-2">{terms.s1_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s2_h}
            </h2>
            <p className="mt-2">{terms.s2_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s3_h}
            </h2>
            <p className="mt-2">{terms.s3_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s4_h}
            </h2>
            <p className="mt-2">{terms.s4_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s5_h}
            </h2>
            <p className="mt-2">{terms.s5_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s6_h}
            </h2>
            <p className="mt-2">
              {terms.s6_p_pre}
              <Link
                href="/privacy"
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
              >
                {terms.s6_link}
              </Link>
              {terms.s6_p_post}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s7_h}
            </h2>
            <p className="mt-2">{terms.s7_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s8_h}
            </h2>
            <p className="mt-2">{terms.s8_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s9_h}
            </h2>
            <p className="mt-2">{terms.s9_p}</p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {terms.s10_h}
            </h2>
            <p className="mt-2">
              {terms.s10_pre}{" "}
              <a
                href="mailto:info@myglobalhealth.online"
                className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
              >
                info@myglobalhealth.online
              </a>
              .
            </p>
          </section>
        </div>
        </div>
      </section>
    </>
  );
}
