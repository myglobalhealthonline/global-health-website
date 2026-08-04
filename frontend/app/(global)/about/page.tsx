import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Stethoscope, Globe2, Clock, BadgeCheck, Users } from "lucide-react";
import { PageHero } from "@/components/sections/PageHero";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";
import { FAQSection } from "@/components/sections/FAQSection";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/structured-data";
import { ClinicalReviewer } from "@/components/sections/ClinicalReviewer";
import { getCountryDoctors } from "@/lib/content/get-country-collections";


export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const about = loadLocaleBundle(locale).about;
  const title = `${about.hero_title_lead} ${about.hero_title_accent}`;

  return buildPublicMetadata({
    path: "/about",
    title,
    description: about.hero_lede,
    locale,
    kind: "corporate",
    subtitle: about.hero_eyebrow,
    sourceImage: "/images/stock/about.jpg",
    imageAlt: `${title} - About Global Health`,
  });
}

// Six live markets, each linked to its own country About page — which states
// that market's languages, offering and register, and links on to its market
// home. This page passes PageRank down the hierarchy (SEO brief item 22).
// Flag code ≠ market name for Czech Republic (flag "cz").
const MARKETS: ReadonlyArray<{ code: string; name: string; href: string }> = [
  { code: "ie", name: "Ireland", href: "/ireland/en/about" },
  { code: "pt", name: "Portugal", href: "/portugal/pt/about" },
  { code: "es", name: "Spain", href: "/spain/es/about" },
  { code: "cz", name: "Czech Republic", href: "/czechia/cs/about" },
  { code: "ro", name: "Romania", href: "/romania/ro/about" },
  { code: "br", name: "Brazil", href: "/brazil/pt/about" },
];

// Verifiable company facts for journalists/investors hitting /about (brief
// section 6). Registry numbers + names are locale-independent, so this block
// is authored once in English.
const COMPANY_FACTS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Founded", value: "2023 — Global Guest s.r.o. (IČO: 19071680), Czech Republic" },
  { label: "Ireland branch", value: "2024 — Global Health (CRO 910267), Ireland" },
  { label: "Markets", value: "Ireland · Portugal · Spain · Czech Republic · Romania · Brazil" },
  { label: "Doctors", value: "60+ GPs and specialists across all markets" },
  { label: "Consultations", value: "45,000+ consultations delivered in 2025" },
  { label: "Headquarters", value: "Prague, Czech Republic" },
  { label: "Operations", value: "Dublin · Lisbon · Prague" },
  { label: "Contact", value: "info@myglobalhealth.online" },
];

// SEO/GEO/AEO-optimised FAQ (brief section 7). Single source of truth: this
// same array feeds both the visible <details> list and the FAQPage JSON-LD, so
// the schema always mirrors on-page content (Google's FAQ requirement).
const FAQ_ITEMS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "Is Global Health a regulated healthcare provider?",
    answer:
      "Yes. All doctors on the Global Health platform are registered with the national medical council in their country. Registration numbers are displayed on every doctor profile and are independently verifiable on the relevant medical council website. Global Health is operated by Global Guest s.r.o. (IČO: 19071680), registered in the Czech Republic, with a branch registered in Ireland (CRO 910267). Patient data is processed in compliance with the applicable data protection legislation in each market, including GDPR in Europe.",
  },
  {
    question: "Which countries does Global Health operate in?",
    answer:
      "Global Health currently operates across multiple markets in Europe and Latin America, including Ireland, Portugal, Spain, Czech Republic, Romania and Brazil. New markets are added as the platform grows. Consultations are available in English, Portuguese, Spanish, Czech, Romanian, Arabic, Urdu and more, subject to clinician availability.",
  },
  {
    question: "Are the doctors on Global Health real licensed doctors?",
    answer:
      "Yes. Every doctor on the Global Health platform is individually named, photographed, and registered with the national medical council in their country — for example, the Irish Medical Council (IMC) in Ireland or the Conselho Federal de Medicina (CFM) in Brazil. Registration numbers are displayed on every doctor profile and are independently verifiable on the relevant medical council website. There are no anonymous rotas and no call centres — the doctor on the profile is the doctor on the call.",
  },
  {
    question: "How does booking and payment work on Global Health?",
    answer:
      "Booking an online consultation with Global Health takes three steps. Choose your market and service, select a doctor and an available time slot, and pay securely at checkout — your consultation is confirmed once payment is complete. Stripe handles all payments. Prices are shown in full before you book — no hidden fees, no membership required for pay-per-consultation services.",
  },
  {
    question: "Is my health data safe with Global Health?",
    answer:
      "Yes. All patient data is processed in EU data centres and handled in compliance with the applicable data protection legislation in each market — including GDPR in Europe. Data is never sold, never shared with insurers, and never used for advertising. The only people who can access your clinical records are you and the doctor on your call. Our Data Protection Officer can be contacted at dpo@myglobalhealth.online.",
  },
];

export default async function AboutPage() {
  const locale = await getPageLocale();
  const { about, faq, common } = loadLocaleBundle(locale);

  // Named clinical reviewer byline — Ireland's admin-flagged "Clinical
  // Director" (same CountryDoctorCard.isFeatured lookup the service page
  // uses). Never a fabricated name: renders nothing if IE has none set.
  const ieDoctors = await getCountryDoctors("IE", locale);
  const reviewer = ieDoctors.find((d) => d.isFeatured) ?? null;
  const reviewerHref = reviewer ? `/ireland/en/doctors/${reviewer.slug}` : null;

  return (
    <section>
      {/* DARK — hero */}
      <PageHero
        watermark={about.watermark}
        countryLabel={about.hero_eyebrow}
        titleLead={about.hero_title_lead}
        titleAccent={about.hero_title_accent}
        lede={about.hero_lede}
        ctaLabel={about.hero_cta}
        ctaHref="/"
        secondaryLabel={about.hero_secondary}
        secondaryHref="/contact"
        trustCards={[
          {
            icon: <Stethoscope className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: about.trust_card1_title,
            subtitle: about.trust_card1_subtitle,
          },
          {
            icon: <Clock className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: about.trust_card2_title,
            subtitle: about.trust_card2_subtitle,
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: about.trust_card3_title,
            subtitle: about.trust_card3_subtitle,
          },
        ]}
        rightSlot={<AboutArchPanel locale={about} />}
        mobileBgSrc="/images/stock/about.jpg"
      />

      {/* LIGHT — three pillars */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p
            className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]"
          >
            {about.pillars_eyebrow}
          </p>
          <h2
            className="mt-3 max-w-[20ch] text-[clamp(2rem,4vw+0.5rem,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]"
          >
            {about.pillars_headline_pre}{" "}
            <span className="text-[#8FB021]">{about.pillars_headline_accent}</span>
            {about.pillars_headline_post}
          </h2>

          <div className="mt-14 grid gap-10 lg:grid-cols-3">
            <Pillar
              icon={<Stethoscope className="size-5" strokeWidth={1.5} aria-hidden />}
              eyebrow="01"
              title={about.p1_title}
              body={about.p1_body}
            />
            <Pillar
              icon={<Clock className="size-5" strokeWidth={1.5} aria-hidden />}
              eyebrow="02"
              title={about.p2_title}
              body={about.p2_body}
            />
            <Pillar
              icon={<ShieldCheck className="size-5" strokeWidth={1.5} aria-hidden />}
              eyebrow="03"
              title={about.p3_title}
              body={about.p3_body}
            />
          </div>
        </div>
      </section>

      {/* DARK — mission / why we built this */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest">
        <SectionSeam theme="dark" />
        <div className="mx-auto grid max-w-[var(--container-width)] gap-12 px-5 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-accent)]">
              {about.mission_eyebrow}
            </p>
            <h2 className="mt-4 text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white/92">
              {about.mission_headline_pre}{" "}
              <span className="text-[var(--color-brand-accent)]">{about.mission_headline_accent}</span>
            </h2>
            <p className="mt-6 inline-flex items-center gap-2 text-[length:var(--text-meta)] font-semibold uppercase tracking-[0.14em] text-white/55">
              <BadgeCheck className="size-4 text-[var(--color-brand-accent)]" strokeWidth={2} aria-hidden />
              {about.mission_founded}
            </p>
          </div>
          <div className="space-y-5 text-[length:var(--text-body)] leading-relaxed text-white/70">
            <p>{about.mission_p1}</p>
            <p>{about.mission_p2}</p>
            <p className="font-medium text-white/90">{about.mission_p3}</p>
            <ClinicalReviewer
              label={common.serviceDetailPage.clinicallyReviewedBy}
              name={reviewer?.fullName}
              href={reviewerHref}
              credential={reviewer?.imcRegistration}
              dark
            />
          </div>
        </div>
      </section>

      {/* LIGHT — how we work */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <div>
              <p
                className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]"
              >
                {about.steps_eyebrow}
              </p>
              <h2
                className="mt-4 text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]"
              >
                {about.steps_headline_pre}{" "}
                <span className="text-[var(--color-brand-primary)]">{about.steps_headline_accent}</span>
                {about.steps_headline_post}
              </h2>
            </div>
            <div className="space-y-8">
              <Step num="01" title={about.s1_title} body={about.s1_body} />
              <Step num="02" title={about.s2_title} body={about.s2_body} />
              <Step num="03" title={about.s3_title} body={about.s3_body} />
              <Step num="04" title={about.s4_title} body={about.s4_body} />
            </div>
          </div>
        </div>
      </section>

      {/* DARK — coverage */}
      <section className="gh-inline-clamp-section-cta relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest">
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-accent)]"
              >
                {about.coverage_eyebrow}
              </p>
              <h2
                className="mt-3 max-w-[16ch] text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.025em] text-white/92"
              >
                {about.coverage_headline}
              </h2>
            </div>
            <Link
              href="/"
              className="gh-btn border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)] text-[#0a1f14]"
            >
              {about.coverage_cta}
              <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
          <ul className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-[length:var(--text-meta)]">
            {MARKETS.map((c) => (
              <li key={c.code}>
                <Link
                  href={c.href}
                  className="group flex items-center gap-3 rounded-[var(--radius-card-sm)] border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <span aria-hidden className={`fi fi-${c.code} inline-block text-xl leading-none`} />
                  <span className="font-semibold text-white/90">
                    {c.name}
                  </span>
                  <ArrowUpRight
                    className="ml-auto size-4 text-white/40 transition-colors group-hover:text-[var(--color-brand-accent)]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LIGHT — company facts / at a glance */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
            {about.company_eyebrow}
          </p>
          <h2 className="mt-3 max-w-[18ch] text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">
            {about.company_headline}
          </h2>
          <dl className="mt-12 grid gap-x-12 sm:grid-cols-2">
            {COMPANY_FACTS.map((f) => (
              <div
                key={f.label}
                className="grid gap-1 border-t border-[rgba(29,75,54,0.12)] py-5 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-6"
              >
                <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                  {f.label}
                </dt>
                <dd className="text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-primary)]">
                  {f.label === "Contact" ? (
                    <a
                      href={`mailto:${f.value}`}
                      className="underline decoration-[rgba(29,75,54,0.3)] underline-offset-4 transition-colors hover:decoration-[var(--color-brand-primary)]"
                    >
                      {f.value}
                    </a>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* DARK — FAQ (shared home FAQSection: forest-night, gh2-glass-forest cards) */}
      <FAQSection title={faq.faq_section_title} items={[...FAQ_ITEMS]} theme="dark" />

      {/* Structured data — breadcrumb + FAQ (schema mirrors the visible FAQ above) */}
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "About", url: "/about" },
          ]),
          faqJsonLd(FAQ_ITEMS.map((f) => ({ question: f.question, answer: f.answer }))),
        ]}
      />

      {/* Doctify — independent verified patient reviews, full grid */}
      <DoctifyReviewsSection
        theme="ivory"
        variant="grid"
        language={locale}
        headline={about.doctify_headline}
        headlineAccent={about.doctify_headline_accent}
      />
    </section>
  );
}

function AboutArchPanel({ locale }: { locale: { float1_title: string; float1_subtitle: string; float2_title: string; float2_subtitle: string; float3_title: string; float3_subtitle: string } }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <HeroPlusImage
        src="/images/stock/about.jpg"
        alt="Global Health telemedicine platform — online doctor consultations across multiple markets"
      />

      {/* Floating — Five countries */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[12%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <Globe2 className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{locale.float1_title}</span>
          <span className="block text-[11.5px] leading-tight text-white/70">{locale.float1_subtitle}</span>
        </span>
      </div>

      {/* Floating — Verified doctors */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[56%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:1.4s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{locale.float2_title}</span>
          <span className="block text-[11.5px] leading-tight text-white/70">{locale.float2_subtitle}</span>
        </span>
      </div>

      {/* Floating — No waiting rooms */}
      <div
        className="gh-glass-emerald gh-floaty absolute -left-6 bottom-[5%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0.7s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <Users className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{locale.float3_title}</span>
          <span className="block text-[11.5px] leading-tight text-white/70">{locale.float3_subtitle}</span>
        </span>
      </div>
    </div>
  );
}

function Pillar({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex size-10 items-center justify-center rounded-full border border-[rgba(29,75,54,0.20)] bg-[rgba(29,75,54,0.08)] text-[var(--color-brand-primary)]"
        >
          {icon}
        </span>
        <span
          className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)] [font-variant-numeric:tabular-nums]"
        >
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-extrabold tracking-[-0.015em] text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="mt-3 max-w-[42ch] text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
        {body}
      </p>
    </article>
  );
}

function Step({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <article
      className="grid gap-5 border-t border-[rgba(29,75,54,0.12)] pt-8 sm:grid-cols-[auto_1fr] sm:gap-7"
    >
      <span
        className="text-[2rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--color-brand-primary)] [font-variant-numeric:tabular-nums]"
      >
        {num}
      </span>
      <div>
        <h3
          className="text-lg font-extrabold tracking-[-0.01em] text-[var(--color-text-primary)]"
        >
          {title}
        </h3>
        <p
          className="mt-2 max-w-[56ch] text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]"
        >
          {body}
        </p>
      </div>
    </article>
  );
}
