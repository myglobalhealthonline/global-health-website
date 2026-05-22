/**
 * Closer CTA — forest-night canvas with an offset typographic display
 * that breaks the "centred-on-dark" reflex. Lime number callout on
 * the left, declarative headline on the right, two CTAs anchored to
 * the right column.
 */

import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Stethoscope, Clock } from "lucide-react";

export function FinalCTA({
  primaryHref = "/",
  secondaryHref = "/contact",
}: {
  primaryHref?: string;
  secondaryHref?: string;
}) {
  return (
    <section
      className="
        relative overflow-hidden
        bg-[var(--color-background-dark)]
        gh-medical-pattern gh-medical-pattern-dark
      "
    >
      {/* Lime atmospheric glow — subtle, single source, top-right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 600px at 95% -10%, rgba(176, 241, 34, 0.16), transparent 60%)",
        }}
      />

      <div
        className="
          relative z-[1]
          mx-auto max-w-[var(--container-width)]
          px-5 md:px-10
          gh-section
        "
      >
        <div className="grid items-end gap-12 lg:grid-cols-[auto_1fr] lg:gap-16">
          {/* Lime numeric callout — anchors the eye, replaces the
            * centred-headline cliché. Numerals are tabular so the
            * digits never wobble. */}
          <div>
            <p
              className="gh-eyebrow text-[var(--color-accent)]"
              style={{ letterSpacing: "0.18em" }}
            >
              Tomorrow, not next month
            </p>
            <p
              className="
                mt-3
                font-semibold leading-none tracking-[-0.04em]
                text-[var(--color-accent)]
                [font-variant-numeric:tabular-nums]
                text-[clamp(4.5rem,11vw,9rem)]
              "
            >
              24h
            </p>
            <p className="mt-3 text-sm uppercase tracking-[0.18em] text-white/60">
              Average to first slot
            </p>
          </div>

          {/* Headline + lede + CTAs + proof points stack. Right-aligned
            * column on lg so the lime number and the type form a
            * diagonal that reads top-left to bottom-right. */}
          <div className="lg:max-w-[640px] lg:ml-auto">
            <h2
              className="
                font-semibold tracking-[-0.03em] leading-[1.02]
                text-white
                text-[clamp(2.25rem,4.5vw+0.4rem,4rem)]
              "
            >
              Stop putting your{" "}
              <span className="text-[var(--color-accent)]">health</span>
              {" "}on the calendar.
            </h2>
            <p className="mt-6 max-w-[52ch] text-base text-white/75 sm:text-lg leading-relaxed">
              Skip the waiting room. Book a video call with a doctor licensed
              in your country, get a prescription or referral, and move on
              with your day.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-full px-6 py-3
                  bg-[var(--color-accent)]
                  text-[var(--color-background-dark)]
                  text-sm font-bold
                  hover:bg-white hover:text-[var(--color-background-dark)]
                  transition-colors duration-200
                  motion-reduce:transition-none
                  active:scale-[0.98] motion-reduce:active:scale-100
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                "
              >
                Book a consultation
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <Link
                href={secondaryHref}
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-full px-6 py-3
                  border border-white/30 bg-transparent
                  text-sm font-semibold text-white/90
                  hover:bg-white/10 hover:border-white/50
                  transition-colors duration-200
                  motion-reduce:transition-none
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                "
              >
                Talk to our team
              </Link>
            </div>

            {/* Proof points — three concrete signals instead of the
              * generic "trust us" copy. */}
            <ul className="mt-10 grid gap-x-6 gap-y-3 sm:grid-cols-3 text-sm text-white/70">
              <li className="inline-flex items-center gap-2">
                <Stethoscope
                  className="size-4 text-[var(--color-accent)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Locally-registered doctors
              </li>
              <li className="inline-flex items-center gap-2">
                <ShieldCheck
                  className="size-4 text-[var(--color-accent)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                GDPR-compliant by default
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock
                  className="size-4 text-[var(--color-accent)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                No waiting rooms
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
