/**
 * Closer CTA — forest-night canvas, asymmetric layout. Lime number
 * callout left, declarative headline right. This is the ONE dark section
 * on the page; the lime accent is earned here.
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
      {/* Lime atmospheric glow — toned to 10% max so it reads as warmth,
        * not a spotlight. Single source, top-right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 800px 500px at 95% -10%, rgba(176, 241, 34, 0.10), transparent 60%)",
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
        <div className="grid items-center gap-12 lg:grid-cols-[auto_1fr] lg:gap-16">
          {/* Lime numeric callout */}
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
                text-[length:var(--text-display)]
                font-semibold leading-none tracking-[-0.04em]
                text-[var(--color-accent)]
                [font-variant-numeric:tabular-nums]
              "
            >
              24h
            </p>
            <p className="mt-3 gh-eyebrow text-white/55">
              Average to first slot
            </p>
          </div>

          {/* Headline + lede + CTAs */}
          <div className="lg:max-w-[600px] lg:ml-auto">
            <h2
              className="
                text-[length:var(--text-h1)]
                font-extrabold tracking-[-0.035em] leading-[1.0]
                text-white
              "
            >
              Stop putting your{" "}
              <span className="text-[var(--color-accent)]">health</span>
              {" "}on the calendar.
            </h2>
            <p className="mt-6 max-w-[52ch] text-[length:var(--text-body-lg)] text-white/75 leading-relaxed">
              Skip the waiting room. Book a video call with a doctor licensed
              in your country, get a prescription or referral, and move on
              with your day.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="gh-btn gh-btn-ghost-dark"
              >
                Book a consultation
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <Link
                href={secondaryHref}
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-full px-6 py-3
                  border border-white/25 bg-transparent
                  text-sm font-semibold text-white/90
                  hover:bg-white/10 hover:border-white/45
                  transition-colors duration-200
                  motion-reduce:transition-none
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                "
              >
                Talk to our team
              </Link>
            </div>

            <ul className="mt-10 grid gap-x-6 gap-y-3 sm:grid-cols-3 text-sm text-white/65">
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
