import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Stethoscope, Globe2, Clock, BadgeCheck, Users } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";
import { DoctifyReviewsSection } from "@/components/sections/DoctifyReviews";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const metadata: Metadata = {
  title: `About | ${SITE_NAME}`,
  description:
    "Global Health is a European telemedicine platform connecting patients with locally-licensed doctors. Medicine Anytime Anywhere.",
};

export default async function AboutPage() {
  const locale = await getPageLocale();
  const { about } = loadLocaleBundle(locale);

  return (
    <section>
      {/* DARK — hero */}
      <PageHero
        watermark="About"
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
      <section className="gh-inline-clamp-section-pricing border-t border-[rgba(29,75,54,0.10)] bg-[var(--color-background-soft)]">
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

      {/* DARK — how we work */}
      <section
        className="gh-inline-clamp-section-pricing gh-medical-pattern gh-medical-pattern-dark border-t border-white/7 bg-[var(--color-background-dark)]"
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]"
              >
                {about.steps_eyebrow}
              </p>
              <h2
                className="mt-4 text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white"
              >
                {about.steps_headline_pre}{" "}
                <span className="text-[var(--color-brand-accent)]">{about.steps_headline_accent}</span>
                {about.steps_headline_post}
              </h2>
            </div>
            <div className="space-y-8">
              <DarkStep num="01" title={about.s1_title} body={about.s1_body} />
              <DarkStep num="02" title={about.s2_title} body={about.s2_body} />
              <DarkStep num="03" title={about.s3_title} body={about.s3_body} />
              <DarkStep num="04" title={about.s4_title} body={about.s4_body} />
            </div>
          </div>
        </div>
      </section>

      {/* LIGHT — coverage */}
      <section className="gh-inline-clamp-section-cta border-t border-[rgba(29,75,54,0.10)] bg-[var(--color-background-soft)]">
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p
                className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]"
              >
                {about.coverage_eyebrow}
              </p>
              <h2
                className="mt-3 max-w-[16ch] text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.025em] text-[var(--color-text-primary)]"
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
          <ul className="mt-10 grid gap-2 sm:grid-cols-3 lg:grid-cols-5 text-[length:var(--text-meta)]">
            {[
              { code: "ie", name: "Ireland" },
              { code: "pt", name: "Portugal" },
              { code: "es", name: "Spain" },
              { code: "cz", name: "Czechia" },
              { code: "ro", name: "Romania" },
            ].map((c) => (
              <li
                key={c.code}
                className="flex items-center gap-3 rounded-[var(--radius-card-sm)] border border-[rgba(29,75,54,0.12)] bg-white/70 px-4 py-3"
              >
                <span aria-hidden className={`fi fi-${c.code} inline-block text-xl leading-none`} />
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {c.name}
                </span>
                <Globe2
                  className="ml-auto size-4 text-[rgba(29,75,54,0.35)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Doctify — independent verified patient reviews, full grid */}
      <DoctifyReviewsSection
        theme="ivory"
        variant="grid"
        language={locale}
        headline="Trusted by patients"
        headlineAccent="across Europe"
      />
    </section>
  );
}

function AboutArchPanel({ locale }: { locale: { float1_title: string; float1_subtitle: string; float2_title: string; float2_subtitle: string; float3_title: string; float3_subtitle: string } }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <HeroPlusImage
        src="/images/stock/about.jpg"
        alt="Telemedicine care team reviewing a secure digital health dashboard"
      />

      {/* Floating — Five countries */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-6 top-[12%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0s]"
      >
        <Globe2 className="size-5 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{locale.float1_title}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{locale.float1_subtitle}</span>
        </span>
      </div>

      {/* Floating — Verified doctors */}
      <div
        className="gh-glass-emerald gh-floaty absolute -right-4 top-[56%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:1.4s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{locale.float2_title}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{locale.float2_subtitle}</span>
        </span>
      </div>

      {/* Floating — No waiting rooms */}
      <div
        className="gh-glass-emerald gh-floaty absolute -left-8 bottom-[5%] z-10 flex max-w-[232px] items-center gap-2.5 rounded-2xl px-3.5 py-3 [animation-delay:0.7s]"
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(176,241,34,0.12)] text-[var(--color-brand-accent)]"
        >
          <Users className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight text-white">{locale.float3_title}</span>
          <span className="block text-[11.5px] leading-tight text-white/55">{locale.float3_subtitle}</span>
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

function DarkStep({
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
      className="grid gap-5 border-t border-white/8 pt-8 sm:grid-cols-[auto_1fr] sm:gap-7"
    >
      <span
        className="text-[2rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--color-brand-accent)] [font-variant-numeric:tabular-nums]"
      >
        {num}
      </span>
      <div>
        <h3
          className="text-lg font-extrabold tracking-[-0.01em] text-white/90"
        >
          {title}
        </h3>
        <p
          className="mt-2 max-w-[56ch] text-[length:var(--text-body)] leading-relaxed text-white/70"
        >
          {body}
        </p>
      </div>
    </article>
  );
}
