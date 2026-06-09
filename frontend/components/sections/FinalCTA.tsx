/**
 * Closer CTA — forest-night canvas, asymmetric layout. Lime number
 * callout left, declarative headline right. This is the ONE dark section
 * on the page; the lime accent is earned here.
 */

import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Stethoscope, Clock } from "lucide-react";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

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
        {/* Top rule */}
        <div aria-hidden style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginBottom: "clamp(48px,6vw,80px)" }} />

        {/* Main grid */}
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20 items-end">
          {/* Left — oversized lime stat */}
          <RevealOnScroll delay={0}>
            <div>
              <p
                className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3"
                style={{ color: "rgba(255,255,255,0.32)" }}
              >
                Average to first slot
              </p>
              <p
                className="font-extrabold leading-none tracking-[-0.05em] [font-variant-numeric:tabular-nums]"
                style={{
                  fontSize: "clamp(5rem,13vw,9rem)",
                  color: "var(--color-brand-accent)",
                }}
              >
                24h
              </p>
              <p
                className="mt-5 font-bold tracking-[-0.02em]"
                style={{
                  fontSize: "clamp(1.1rem,2vw,1.5rem)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Tomorrow, not next month.
              </p>
            </div>
          </RevealOnScroll>

          {/* Right — headline + CTAs */}
          <RevealOnScroll delay={150}>
            <div>
            <h2
              className="font-extrabold tracking-[-0.035em] leading-[1.02]"
              style={{
                fontSize: "clamp(2rem,4vw,3.25rem)",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              Stop putting your{" "}
              <span style={{ color: "var(--color-brand-accent)" }}>health</span>{" "}
              on the calendar.
            </h2>
            {/* Provider-first lede per Google Ads "restricted services"
                guidance. Anchored on the doctors (credentials, registration,
                multilingual care) rather than the consultation flow. Avoid
                "video call", "skip the waiting room", "get a prescription"
                near landing-page CTAs. */}
            <p
              className="mt-6 leading-relaxed"
              style={{
                fontSize: "var(--text-body-lg)",
                color: "rgba(255,255,255,0.52)",
                maxWidth: "50ch",
              }}
            >
              Browse profiles of licensed doctors registered with national
              medical councils across Europe. Filter by specialty, language
              and country.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={primaryHref} className="gh-btn gh-btn-ghost-dark">
                Meet our doctors
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 border border-white/20 bg-transparent text-sm font-semibold text-white/75 hover:bg-white/08 hover:border-white/38 transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Meet the team
              </Link>
            </div>

            <ul
              className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm"
              style={{ color: "rgba(255,255,255,0.40)" }}
            >
              <li className="inline-flex items-center gap-2">
                <Stethoscope className="size-4 shrink-0" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.5} aria-hidden />
                Locally-registered doctors
              </li>
              <li className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 shrink-0" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.5} aria-hidden />
                GDPR-compliant
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock className="size-4 shrink-0" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.5} aria-hidden />
                Flexible scheduling
              </li>
            </ul>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
