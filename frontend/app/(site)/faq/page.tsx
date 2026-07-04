import { DoctifyReviewsSection } from "@/components/sections/DoctifyReviews";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/sections/PageHero";
import { FAQTabs } from "@/components/sections/FAQTabs";
import { faqJsonLd } from "@/lib/seo/structured-data";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const metadata: Metadata = {
  title: `FAQ | ${SITE_NAME}`,
  description:
    "Common questions about booking, online consultations, payments, privacy, and emergency-care limits on Global Health.",
};

export default async function FAQPage() {
  const locale = await getPageLocale();
  const { faq } = loadLocaleBundle(locale);

  const FAQ_GROUPS = [
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

  return (
    <section>
      <JsonLd data={faqJsonLd(FAQ_GROUPS.flatMap((group) => group.items))} />

      <PageHero
        countryLabel={faq.hero_eyebrow}
        titleLead={faq.hero_title_lead}
        titleAccent={faq.hero_title_accent}
        titleTrail={faq.hero_title_trail}
        lede={faq.hero_lede}
        ctaLabel={faq.hero_cta}
        ctaHref="/contact"
        secondaryLabel={faq.hero_secondary}
        secondaryHref="/"
        heroImage={{
          src: "/images/stock/contact.jpg",
          alt: "Telehealth care coordinator helping a patient during an online consultation",
          priority: true,
        }}
      />

      <FAQTabs groups={FAQ_GROUPS} />

      <section
        className="gh2-section-forest relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark"
        style={{
          padding: "clamp(64px,8vw,96px) 0",
        }}
      >
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
            <Link
              href="/contact"
              className="gh2-btn-lime gh-focus-on-dark lg:justify-self-end"
            >
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
        eyebrow="Patient reviews"
        headline="What our patients"
        headlineAccent="are saying"
        body="Read independent, verified reviews from real patients who have used Global Health services."
      />
    </section>
  );
}
