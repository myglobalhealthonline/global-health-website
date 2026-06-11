import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Stethoscope, Globe2, Clock } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
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
        heroImage={{
          src: "/images/stock/about.jpg",
          alt: "Telemedicine care team reviewing a secure digital health dashboard",
          priority: true,
        }}
      />

      {/* LIGHT — three pillars */}
      <section style={{ background: "var(--color-background-soft)", borderTop: "1px solid rgba(29,75,54,0.10)", padding: "clamp(64px,8vw,120px) 0" }}>
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p
            className="gh-eyebrow"
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--color-brand-primary)" }}
          >
            {about.pillars_eyebrow}
          </p>
          <h2
            className="mt-3 max-w-[20ch] font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{ fontSize: "clamp(2rem, 4vw + 0.5rem, 3.5rem)", color: "var(--color-text-primary)" }}
          >
            {about.pillars_headline_pre}{" "}
            <span style={{ color: "#8FB021" }}>{about.pillars_headline_accent}</span>
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
        className="gh-medical-pattern gh-medical-pattern-dark"
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(64px,8vw,120px) 0",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                {about.steps_eyebrow}
              </p>
              <h2
                className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02] text-white"
                style={{ fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)" }}
              >
                {about.steps_headline_pre}{" "}
                <span style={{ color: "var(--color-brand-accent)" }}>{about.steps_headline_accent}</span>
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
      <section style={{ background: "var(--color-background-soft)", borderTop: "1px solid rgba(29,75,54,0.10)", padding: "clamp(40px,5vw,64px) 0" }}>
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p
                className="gh-eyebrow"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.20em", textTransform: "uppercase", color: "var(--color-brand-primary)" }}
              >
                {about.coverage_eyebrow}
              </p>
              <h2
                className="mt-3 max-w-[16ch] font-extrabold tracking-[-0.025em] leading-[1.05]"
                style={{ fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)", color: "var(--color-text-primary)" }}
              >
                {about.coverage_headline}
              </h2>
            </div>
            <Link
              href="/"
              className="gh-btn"
              style={{ background: "var(--color-brand-accent)", color: "#0a1f14", borderColor: "var(--color-brand-accent)" }}
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
                className="flex items-center gap-3 rounded-[var(--radius-card-sm)] px-4 py-3"
                style={{ border: "1px solid rgba(29,75,54,0.12)", background: "rgba(255,255,255,0.70)" }}
              >
                <span aria-hidden className={`fi fi-${c.code} inline-block text-xl leading-none`} />
                <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {c.name}
                </span>
                <Globe2
                  className="ml-auto size-4"
                  style={{ color: "rgba(29,75,54,0.35)" }}
                  strokeWidth={1.5}
                  aria-hidden
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </section>
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
          className="inline-flex size-10 items-center justify-center rounded-full"
          style={{ background: "rgba(29,75,54,0.08)", border: "1px solid rgba(29,75,54,0.20)", color: "var(--color-brand-primary)" }}
        >
          {icon}
        </span>
        <span
          className="text-xs font-bold uppercase tracking-[0.16em] [font-variant-numeric:tabular-nums]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-extrabold tracking-[-0.015em]" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h3>
      <p className="mt-3 max-w-[42ch] text-[length:var(--text-body)] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
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
      className="grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-7 pt-8"
      style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
    >
      <span
        className="font-extrabold tracking-[-0.03em] [font-variant-numeric:tabular-nums]"
        style={{ fontSize: "2rem", color: "var(--color-brand-accent)", lineHeight: 1 }}
      >
        {num}
      </span>
      <div>
        <h3
          className="text-lg font-extrabold tracking-[-0.01em]"
          style={{ color: "rgba(255,255,255,0.90)" }}
        >
          {title}
        </h3>
        <p
          className="mt-2 max-w-[56ch] text-[length:var(--text-body)] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.70)" }}
        >
          {body}
        </p>
      </div>
    </article>
  );
}
