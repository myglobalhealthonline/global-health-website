import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Minus, Plus } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqJsonLd } from "@/lib/seo/structured-data";

type ConsultationListingTemplateProps = {
  title: string;
  description: string;
  mode: "general" | "specialist";
  primaryCtaLabel?: string;
  secondaryCta?: { label: string; href: string };
  explanation?: { title: string; body: string };
  listing: Array<{
    title: string;
    description: string;
    href: string;
    serviceType?: "general" | "specialist";
    audience?: string;
    duration?: string;
    startingPrice?: string;
    imageSrc?: string;
    themeColor?: string;
    stats?: string;
  }>;
  pricing?: {
    title: string;
    description?: string;
    items: Array<{ name: string; price: string; description: string }>;
  };
  howItWorks?: {
    title?: string;
    subtitle?: string;
    steps: Array<{ title: string; description: string; ctaLabel?: string; ctaHref?: string }>;
  };
  trust?: {
    title?: string;
    subtitle?: string;
    items: Array<{ title: string; description?: string }>;
  };
  faq?: { title?: string; items: Array<{ question: string; answer: string }> };
  bookingHref: string;
  bookingLabel: string;
  showReviewScore?: boolean;
  showFinalCta?: boolean;
  guidanceVariant?: "general" | "specialist" | "none";
  doctifyWidgetUrl?: string;
  heroImageSrc?: string;
  heroImageAlt?: string;
};

export function ConsultationListingTemplate({
  title,
  description,
  mode,
  primaryCtaLabel,
  secondaryCta,
  explanation,
  listing,
  pricing,
  howItWorks,
  trust,
  faq,
  bookingHref,
  bookingLabel,
  showFinalCta = true,
}: ConsultationListingTemplateProps) {
  const ctaLabel = primaryCtaLabel ?? bookingLabel;

  return (
    <main className="bg-[var(--color-background-page)]">
      {/* HERO */}
      <section className="gh-section-sm border-b border-[var(--color-border)] bg-[var(--color-background-soft)]">
        <div className="gh-container">
          <span className="gh-heading-eyebrow">
            {mode === "specialist" ? "Specialist consultation" : "General consultation"}
          </span>
          <h1
            className="gh-display mt-8 max-w-[20ch] text-[clamp(2.5rem,6vw,5.5rem)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-8 max-w-[640px] text-[1.05rem] leading-[1.7] text-[var(--color-text-body)] md:text-[1.2rem]">
              {description}
            </p>
          ) : null}
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Link href={bookingHref} className="gh-btn gh-btn-primary">
              {ctaLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            {secondaryCta ? (
              <Link href={secondaryCta.href} className="gh-btn gh-btn-outline">
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* EXPLANATION */}
      {explanation ? (
        <section className="gh-section bg-[var(--color-background-page)]">
          <div className="gh-container max-w-[920px]">
            <h2
              className="gh-display text-[clamp(1.85rem,4vw,3rem)]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {explanation.title}
            </h2>
            <p className="mt-8 text-[1.05rem] leading-[1.8] text-[var(--color-text-body)] md:text-[1.2rem]">
              {explanation.body}
            </p>
          </div>
        </section>
      ) : null}

      {/* LISTING */}
      {listing.length > 0 ? (
        <section className="gh-section border-t border-[var(--color-border)] bg-[var(--color-background-page)]">
          <div className="gh-container">
            <header className="flex flex-wrap items-end justify-between gap-6">
              <h2
                className="gh-display max-w-[20ch] text-[clamp(1.85rem,4vw,3rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {mode === "specialist"
                  ? "Specialist categories."
                  : "Common reasons to book."}
              </h2>
            </header>

            <ul className="mt-14 grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {listing.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="group block">
                    <div
                      className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-panel)]"
                      style={item.themeColor ? { backgroundColor: item.themeColor } : undefined}
                    >
                      {item.imageSrc ? (
                        <Image
                          src={item.imageSrc}
                          alt={item.title}
                          fill
                          sizes="(min-width:1024px) 380px, (min-width:768px) 50vw, 100vw"
                          className="object-cover transition duration-700 group-hover:scale-[1.04]"
                        />
                      ) : null}
                    </div>
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <h3
                        className="gh-display text-[1.5rem]"
                        style={{ fontFamily: "var(--font-cormorant)" }}
                      >
                        {item.title}
                      </h3>
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-text-primary)]" />
                    </div>
                    {item.description ? (
                      <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                        {item.description}
                      </p>
                    ) : null}
                    {item.duration || item.startingPrice || item.stats ? (
                      <p className="mt-4 flex flex-wrap gap-x-4 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        {item.duration ? <span>{item.duration}</span> : null}
                        {item.startingPrice ? <span>from {item.startingPrice}</span> : null}
                        {item.stats ? <span>{item.stats}</span> : null}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* PRICING */}
      {pricing && pricing.items.length > 0 ? (
        <section className="gh-section bg-[var(--color-background-soft)]">
          <div className="gh-container">
            <header className="max-w-2xl">
              <span className="gh-heading-eyebrow">Pricing</span>
              <h2
                className="gh-display mt-5 text-[clamp(1.85rem,4vw,3rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {pricing.title}
              </h2>
              {pricing.description ? (
                <p className="mt-6 text-[1.05rem] leading-[1.7] text-[var(--color-text-muted)]">
                  {pricing.description}
                </p>
              ) : null}
            </header>
            <ul className="mt-14 grid grid-cols-1 gap-0 border-t border-[var(--color-border)] md:grid-cols-2 lg:grid-cols-3">
              {pricing.items.map((p, idx) => (
                <li
                  key={p.name}
                  className={`flex h-full flex-col border-b border-[var(--color-border)] py-10 md:px-10 ${idx % 3 !== 0 ? "lg:border-l lg:border-l-[var(--color-border)]" : ""} ${idx % 2 !== 0 ? "md:border-l md:border-l-[var(--color-border)] lg:border-l-0" : ""}`}
                >
                  <p
                    className="text-[2.5rem] leading-none tracking-[-0.02em] text-[var(--color-text-primary)]"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {p.price}
                  </p>
                  <h3 className="mt-4 text-[16px] font-medium text-[var(--color-text-primary)]">
                    {p.name}
                  </h3>
                  <p className="mt-2 flex-1 text-[14.5px] leading-[1.7] text-[var(--color-text-muted)]">
                    {p.description}
                  </p>
                  <Link
                    href={bookingHref}
                    className="mt-6 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-text-primary)] underline underline-offset-4"
                  >
                    Book this
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* HOW IT WORKS */}
      {howItWorks && howItWorks.steps.length > 0 ? (
        <section className="bg-[var(--color-brand-primary)] text-white">
          <div className="gh-container gh-section">
            <div className="grid gap-16 lg:grid-cols-[1fr_1.3fr] lg:gap-24">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                  {howItWorks.subtitle ?? "How it works"}
                </span>
                <h2
                  className="gh-display mt-5 text-[clamp(2rem,4vw,3.5rem)] text-white"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {howItWorks.title ?? "Three steps. No paperwork."}
                </h2>
              </div>
              <ol>
                {howItWorks.steps.map((step, idx) => (
                  <li
                    key={step.title}
                    className="grid grid-cols-[auto_1fr] items-start gap-8 border-t border-white/10 py-8 first:border-t-0 first:pt-0"
                  >
                    <span
                      className="text-[2.5rem] leading-none tracking-[-0.02em] text-[var(--color-brand-accent)]"
                      style={{ fontFamily: "var(--font-cormorant)" }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3
                        className="text-[1.5rem] leading-tight text-white"
                        style={{ fontFamily: "var(--font-cormorant)" }}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-md text-[14.5px] leading-[1.7] text-white/70">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      {/* TRUST */}
      {trust && trust.items.length > 0 ? (
        <section className="gh-section bg-[var(--color-background-page)]">
          <div className="gh-container">
            <span className="gh-heading-eyebrow">{trust.subtitle ?? "Why patients trust us"}</span>
            <h2
              className="gh-display mt-5 max-w-[20ch] text-[clamp(1.85rem,4vw,3rem)]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {trust.title ?? "Healthcare-grade by default."}
            </h2>
            <ul className="mt-14 grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-3">
              {trust.items.map((t, idx) => (
                <li key={t.title}>
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="gh-display mt-4 text-[1.5rem]"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {t.title}
                  </h3>
                  {t.description ? (
                    <p className="mt-2 text-[14.5px] leading-[1.7] text-[var(--color-text-muted)]">
                      {t.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      {faq && faq.items.length > 0 ? (
        <section className="gh-section bg-[var(--color-background-soft)]">
          <div className="gh-container grid gap-16 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
            <div>
              <span className="gh-heading-eyebrow">Frequently asked</span>
              <h2
                className="gh-display mt-5 text-[clamp(1.85rem,4vw,3rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {faq.title ?? "Good questions, plain answers."}
              </h2>
            </div>
            <div className="border-t border-[var(--color-border)]">
              {faq.items.map((it) => (
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
              <JsonLd data={faqJsonLd(faq.items)} />
            </div>
          </div>
        </section>
      ) : null}

      {showFinalCta ? (
        <section className="gh-section bg-[var(--color-background-page)]">
          <div className="gh-container">
            <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
              <h2
                className="gh-display max-w-[20ch] text-[clamp(2rem,5vw,4.25rem)]"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Ready when <span className="gh-display-em">you are.</span>
              </h2>
              <Link href={bookingHref} className="gh-btn gh-btn-primary lg:justify-self-end">
                {ctaLabel}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
