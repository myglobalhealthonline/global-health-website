import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqJsonLd } from "@/lib/seo/structured-data";

/**
 * Variant controls the editorial mood per page. Kept compatible with the
 * existing `getMarketingPageData()` payloads so every static page upgrades
 * automatically.
 */
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

const TRUST_BADGES = [
  "Licensed across 5 countries",
  "GDPR & ISO 27001 aligned",
  "Insurance receipts included",
];

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
  const showBadges = variant === "standard";
  const faqFirst = variant === "faq";

  const Hero = (
    <section className="relative isolate overflow-hidden bg-[var(--color-background-soft)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 480px at 90% -10%, rgba(176, 241, 34, 0.18), transparent 60%), radial-gradient(800px 460px at -10% 110%, rgba(27, 77, 62, 0.08), transparent 60%)",
        }}
      />
      <div className="mx-auto w-full max-w-[1240px] px-6 py-20 md:py-24 lg:px-10">
        <span className="gh-heading-eyebrow inline-flex items-center gap-2">
          <span className="h-px w-8 bg-[var(--color-brand-primary)]" />
          {eyebrow}
        </span>
        <h1
          className="mt-6 max-w-3xl text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          {hero.title}
        </h1>
        <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-[var(--color-text-muted)] md:text-[1.15rem]">
          {hero.description}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={hero.primaryCta.href} className="gh-btn gh-btn-primary">
            {hero.primaryCta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {hero.secondaryCta ? (
            <Link href={hero.secondaryCta.href} className="gh-btn gh-btn-outline">
              {hero.secondaryCta.label}
            </Link>
          ) : null}
        </div>
        {showBadges ? (
          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-[var(--color-text-muted)]">
            {TRUST_BADGES.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-brand-primary)]" />
                {b}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );

  const Intro = intro ? (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-[920px] px-6 py-16 lg:px-10 lg:py-20">
        <h2
          className="text-[clamp(1.75rem,3.2vw,2.75rem)] leading-tight tracking-tight text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          {intro.title}
        </h2>
        <p className="mt-6 text-[1.05rem] leading-[1.75] text-[var(--color-text-muted)] md:text-[1.15rem]">
          {intro.body}
        </p>
      </div>
    </section>
  ) : null;

  const Features =
    features.length > 0 ? (
      <section className="bg-[var(--color-background-soft)]">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20">
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, idx) => (
              <li key={f.title}>
                <article className="group flex h-full flex-col rounded-3xl border border-[var(--color-border)] bg-white p-7 transition hover:-translate-y-[2px] hover:border-[var(--color-brand-primary)] hover:shadow-[0_18px_40px_-20px_rgba(27,77,62,0.30)]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-[13px] font-bold text-[var(--color-brand-primary)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 text-[1.1rem] font-bold tracking-tight text-[var(--color-text-primary)]">
                    {f.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-[var(--color-text-muted)]">
                    {f.description}
                  </p>
                  {f.href ? (
                    <Link
                      href={f.href}
                      className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-brand-primary)] underline-offset-4 hover:underline"
                    >
                      {f.ctaLabel ?? "Learn more"}
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
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
      <section className="bg-white">
        <div className="mx-auto w-full max-w-[920px] px-6 py-16 lg:px-10 lg:py-20">
          <span className="gh-heading-eyebrow">Frequently asked</span>
          <h2
            className="mt-3 text-[clamp(1.6rem,3vw,2.5rem)] leading-tight tracking-tight text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {faqs.title ?? "Good questions, plain answers."}
          </h2>
          <div className="mt-8 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {faqs.items.map((it) => (
              <details key={it.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15.5px] font-semibold text-[var(--color-text-primary)]">
                  {it.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-[640px] text-[14.5px] leading-[1.7] text-[var(--color-text-muted)]">
                  {it.answer}
                </p>
              </details>
            ))}
          </div>
          <JsonLd data={faqJsonLd(faqs.items)} />
        </div>
      </section>
    ) : null;

  const Related =
    relatedLinks.length > 0 ? (
      <section className="bg-[var(--color-background-soft)]">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-14 lg:px-10">
          <span className="gh-heading-eyebrow">Related pages</span>
          <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {relatedLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--color-border)] py-3 text-[14px] font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-primary)]"
                >
                  <span>{l.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    ) : null;

  const BottomCta = bottomCta ? (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-brand-primary)] p-10 text-white md:p-14">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-xl">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]">
                Next step
              </span>
              <h2
                className="mt-3 text-[clamp(1.75rem,3.5vw,3rem)] leading-tight tracking-tight text-white"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {bottomCta.title}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/80">
                {bottomCta.description}
              </p>
            </div>
            <Link href={bottomCta.ctaHref} className="gh-btn gh-btn-ghost-dark">
              {bottomCta.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  ) : null;

  return (
    <main className="bg-white">
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
