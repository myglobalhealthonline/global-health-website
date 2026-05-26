/**
 * Dark editorial hero for inner pages (consultation services, doctors
 * index, tests, prescriptions). One component, one composition:
 *   - Forest-night canvas with layered gradient mesh + dotted texture
 *   - Eyebrow chip (country flag + label)
 *   - Massive sans display headline with one Cormorant italic accent
 *     phrase
 *   - Lede paragraph (max 42ch)
 *   - Lime pill CTA + ghost-on-dark secondary
 *   - Optional right-column slot for stats / availability counter
 *
 * Replaces the centred-on-white "eyebrow / h1 / lede / pill" pattern
 * that every inner page was duplicating in slightly different markup.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Flag } from "@/components/ui/Flag";

export type PageHeroProps = {
  /** Country flag + label pill above the headline. */
  countryCode?: string;
  countryLabel?: string;
  /** Plain pre-accent words (rendered in sans semibold). */
  titleLead: string;
  /** Single Cormorant italic phrase that anchors the headline. */
  titleAccent: string;
  /** Optional plain trailing words after the italic accent. */
  titleTrail?: string;
  /** Body paragraph under the headline; supports ReactNode for inline
   *  emphasis. */
  lede?: ReactNode;
  /** Primary CTA — text + href. */
  ctaLabel?: string;
  ctaHref?: string;
  /** Secondary CTA (optional). */
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Optional right column — typically a stats block or live
   *  availability strip. Hidden below lg. */
  rightSlot?: ReactNode;
};

export function PageHero({
  countryCode,
  countryLabel,
  titleLead,
  titleAccent,
  titleTrail,
  lede,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
  rightSlot,
}: PageHeroProps) {
  return (
    <section
      className="
        relative isolate overflow-hidden
        bg-[var(--color-background-dark)]
        text-white
      "
    >
      {/* Same layered background as HomeHero so the visual identity
        * stays consistent across the public surface. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 1400px 800px at 95% -15%, rgba(176, 241, 34, 0.28), transparent 52%),
            radial-gradient(ellipse 900px 600px at -5% 105%, rgba(176, 241, 34, 0.07), transparent 55%),
            radial-gradient(ellipse 600px 400px at 50% 120%, rgba(29, 75, 54, 0.6), transparent 70%),
            var(--color-background-dark)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='1' fill='%23ffffff'/%3E%3C/svg%3E\")",
          backgroundSize: "32px 32px",
        }}
      />

      <div
        className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10"
        style={{ padding: rightSlot ? "clamp(80px,10vw,140px) clamp(20px,4vw,40px)" : "clamp(96px,12vw,160px) clamp(20px,4vw,40px)" }}
      >
        <div className={rightSlot ? "grid items-end gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16" : ""}>
          {/* LEFT — eyebrow + headline + lede + CTAs */}
          <div>
            {countryCode || countryLabel ? (
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm">
                {countryCode ? <Flag code={countryCode} size="sm" /> : null}
                {countryLabel ? (
                  <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.06em] text-white/90">
                    {countryLabel}
                  </span>
                ) : null}
              </span>
            ) : null}

            <h1
              style={{
                marginTop: 28,
                maxWidth: rightSlot ? "18ch" : "22ch",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 0.96,
                fontSize: rightSlot
                  ? "clamp(2.75rem, 6.5vw + 0.5rem, 7rem)"
                  : "clamp(3.5rem, 8vw + 0.5rem, 8rem)",
              }}
            >
              {titleLead}{" "}
              <span style={{ color: "var(--color-brand-accent)" }}>
                {titleAccent}
              </span>
              {titleTrail ? <span style={{ color: "rgba(255,255,255,0.95)" }}>{` ${titleTrail}`}</span> : null}
            </h1>

            {lede ? (
              <p
                className="leading-relaxed"
                style={{
                  marginTop: 28,
                  maxWidth: rightSlot ? "44ch" : "52ch",
                  fontSize: "clamp(1rem, 1vw + 0.6rem, 1.2rem)",
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                {lede}
              </p>
            ) : null}

            {(ctaHref && ctaLabel) || (secondaryHref && secondaryLabel) ? (
              <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 40 }}>
                {ctaHref && ctaLabel ? (
                  <Link
                    href={ctaHref}
                    className="
                      inline-flex items-center justify-center gap-2
                      rounded-full
                      px-7 py-4
                      text-[15px] font-bold
                      transition-[background-color,transform] duration-200
                      active:scale-[0.98] motion-reduce:active:scale-100
                      motion-reduce:transition-none
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                    "
                    style={{
                      background: "var(--color-brand-accent)",
                      color: "#0a1f14",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#ffffff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--color-brand-accent)")}
                  >
                    {ctaLabel}
                    <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
                  </Link>
                ) : null}
                {secondaryHref && secondaryLabel ? (
                  <Link
                    href={secondaryHref}
                    className="
                      inline-flex items-center justify-center gap-2
                      rounded-full border border-white/25 bg-transparent
                      px-6 py-4 text-[15px] font-semibold text-white/90
                      transition-[background-color,border-color] duration-200
                      hover:bg-white/10 hover:border-white/40
                      motion-reduce:transition-none
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                    "
                  >
                    {secondaryLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* RIGHT — optional slot. Hidden below lg so the headline
            * gets full attention on mobile. */}
          {rightSlot ? (
            <aside className="hidden lg:block">{rightSlot}</aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
