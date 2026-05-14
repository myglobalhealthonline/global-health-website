import Link from "next/link";
import { ArrowUpRight, Minus, Plus } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqJsonLd } from "@/lib/seo/structured-data";

export type StaticMarketingTemplateVariant =
  | "standard"
  | "light"
  | "document"
  | "directory"
  | "pricing"
  | "faq";

const VARIANT_EYEBROW: Record<StaticMarketingTemplateVariant, string> = {
  standard: "Healthcare access",
  light: "Global Health",
  document: "Information",
  directory: "Network",
  pricing: "Plans & pricing",
  faq: "Frequently asked",
};

type StaticMarketingTemplateProps = {
  hero: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  intro?: { title: string; body: string };
  features?: Array<{ title: string; description: string; href?: string; ctaLabel?: string }>;
  faqs?: { title?: string; items: Array<{ question: string; answer: string }> };
  relatedLinks?: Array<{ label: string; href: string }>;
  bottomCta?: { title: string; description: string; ctaLabel: string; ctaHref: string };
  variant?: StaticMarketingTemplateVariant;
};

export function StaticMarketingTemplate({
  hero,
  intro,
  features = [],
  faqs,
  relatedLinks = [],
  bottomCta,
  variant = "standard",
}: StaticMarketingTemplateProps) {
  const eyebrow = VARIANT_EYEBROW[variant];
  const faqFirst = variant === "faq";

  const Hero = (
    <section className="gh-section-sm border-b border-[var(--color-border)] bg-[var(--color-background-soft)]">
      <div className="gh-container">
        <span className="gh-heading-eyebrow">{eyebrow}</span>
        <h1
          className="gh-display mt-8 max-w-[20ch] text-[clamp(2.5rem,6vw,5.5rem)]"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          {hero.title}
        </h1>
        <p className="mt-8 max-w-[640px] text-[1.05rem] leading-[1.7] text-[var(--color-text-body)] md:text-[1.2rem]">
          {hero.description}
        </p>
        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link href={hero.primaryCta.href} className="gh-btn gh-btn-primary">
            {hero.primaryCta.label}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          {hero.secondaryCta ? (
            <Link href={hero.secondaryCta.href} className="gh-btn gh-btn-outline">
              {hero.secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );

  const Intro = intro ? (
    <section className="gh-section bg-[var(--color-background-page)]">
      <div className="gh-container max-w-[920px]">
        <h2
          className="gh-display text-[clamp(1.85rem,4vw,3rem)]"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          {intro.title}
        </h2>
        <p className="mt-8 text-[1.05rem] leading-[1.8] text-[var(--color-text-body)] md:text-[1.2rem]">
          {intro.body}
        </p>
      </div>
    </section>
  ) : null;

  const Features =
    features.length > 0 ? (
      <section className="gh-section border-t border-[var(--color-border)] bg-[var(--color-background-page)]">
        <div className="gh-container">
          <ul className="grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-2">
            {features.map((f, idx) => (
              <li key={f.title}>
                <article>
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="gh-display mt-5 text-[clamp(1.5rem,2.4vw,2rem)]"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {f.title}
                  </h3>
                  <p className="mt-3 max-w-[460px] text-[15px] leading-[1.7] text-[var(--color-text-muted)]">
                    {f.description}
                  </p>
                  {f.href ? (
                    <Link
                      href={f.href}
                      className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-text-primary)] underline underline-offset-4"
                    >
                      {f.ctaLabel ?? "Learn more"}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>
    ) : null;

  const Faqs =
    faqs?.items.length ? (
      <section className="gh-section bg-[var(--color-background-soft)]">
        <div className="gh-container grid gap-16 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
          <div>
            <span className="gh-heading-eyebrow">Frequently asked</span>
            <h2
              className="gh-display mt-5 text-[clamp(1.85rem,4vw,3rem)]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {faqs.title ?? "Good questions, plain answers."}
            </h2>
          </div>
          <div className="border-t border-[var(--color-border)]">
            {faqs.items.map((it) => (
              <details key={it.question} className="group border-b border-[var(--color-border)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[16px] font-medium text-[var(--color-text-primary)]">
                  {it.question}
                  <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                    <Plus className="h-5 w-5 text-[var(--color-text-muted)] group-open:hidden" />
                    <Minus className="hidden h-5 w-5 text-[var(--color-text-primary)] group-open:block" />
                  </span>
                </summary>
                <p className="pb-7 pr-10 text-[14.5px] leading-[1.75] text-[var(--color-text-muted)]">
                  {it.answer}
                </p>
              </details>
            ))}
            <JsonLd data={faqJsonLd(faqs.items)} />
          </div>
        </div>
      </section>
    ) : null;

  const Related =
    relatedLinks.length > 0 ? (
      <section className="gh-section-sm border-y border-[var(--color-border)] bg-[var(--color-background-page)]">
        <div className="gh-container">
          <span className="gh-heading-eyebrow">Related pages</span>
          <ul className="mt-8 grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {relatedLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-4 text-[14.5px] text-[var(--color-text-primary)] transition hover:text-[var(--color-brand-primary)]"
                >
                  <span>{l.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    ) : null;

  const BottomCta = bottomCta ? (
    <section className="gh-section bg-[var(--color-brand-primary)] text-white">
      <div className="gh-container">
        <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
              Next step
            </span>
            <h2
              className="gh-display mt-5 text-[clamp(2rem,5vw,4rem)] text-white"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {bottomCta.title}
            </h2>
            <p className="mt-6 max-w-[520px] text-[15px] leading-[1.7] text-white/75">
              {bottomCta.description}
            </p>
          </div>
          <div className="lg:justify-self-end">
            <Link href={bottomCta.ctaHref} className="gh-btn gh-btn-accent">
              {bottomCta.ctaLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  ) : null;

  return (
    <main className="bg-[var(--color-background-page)]">
      {Hero}
      {faqFirst ? (
        <>
          {Faqs}
          {Intro}
          {Features}
        </>
      ) : (
        <>
          {Intro}
          {Features}
          {Faqs}
        </>
      )}
      {Related}
      {BottomCta}
    </main>
  );
}
