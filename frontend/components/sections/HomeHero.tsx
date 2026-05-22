/**
 * Dark editorial hero — forest-night canvas, massive sans display,
 * Cormorant italic accent (single word), live-availability bar
 * inline below the headline, asymmetric CTA cluster.
 *
 * The previous "type + side panel" composition was technically clean
 * but read like every other SaaS template. This one borrows from
 * magazine cover layouts — heavy ink, big imagery feel from type alone,
 * one italic moment to break the sans monotony.
 */

import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Stethoscope, Clock } from "lucide-react";
import type { CountryCode } from "@/data/countries";
import { Flag } from "@/components/ui/Flag";

export type LiveDoctorItem = {
  name: string;
  role: string;
};

export function HomeHero({
  countryCode,
  countryName,
  doctorCount,
  languageLabel,
  bookHref,
  totalDoctorsAcrossEurope,
  liveDoctors,
  heroTitle,
  heroSubtitle,
  heroImageSrc,
  ctaLabel,
}: {
  countryCode: CountryCode;
  countryName: string;
  doctorCount: number;
  languageLabel: string;
  bookHref: string;
  totalDoctorsAcrossEurope: number;
  liveDoctors?: LiveDoctorItem[];
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageSrc?: string | null;
  ctaLabel?: string | null;
}) {
  const displayHeroTitle = heroTitle?.trim() || null;
  const displayHeroSubtitle = heroSubtitle?.trim() || null;
  const displayCtaLabel = ctaLabel?.trim() || `Book a consultation`;
  const doctorsForPanel = (liveDoctors ?? []).slice(0, 4);

  return (
    <section
      className="
        relative isolate overflow-hidden
        bg-[var(--color-background-dark)]
        text-white
      "
    >
      {/* Layered background — three planes stacked for depth.
        * Plane 1: gradient mesh top-right (lime → fade).
        * Plane 2: dotted texture overlay at 4% opacity.
        * Plane 3: bottom hairline that separates from the marquee. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 1400px 800px at 100% -20%, rgba(176, 241, 34, 0.22), transparent 55%),
            radial-gradient(ellipse 900px 700px at -10% 110%, rgba(200, 230, 160, 0.10), transparent 60%),
            linear-gradient(180deg, #0A2620 0%, var(--color-background-dark) 60%, #0A2620 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='1' fill='%23ffffff'/%3E%3C/svg%3E\")",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10 pt-20 pb-24 md:pt-28 md:pb-32">
        {/* Eyebrow row — country + live indicator + crumbs. Tabular
          * numerics for the doctor count so it doesn't bounce. */}
        <div className="flex flex-wrap items-center gap-4 text-[length:var(--text-eyebrow)]">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm">
            <Flag code={countryCode} size="sm" />
            <span className="font-semibold tracking-[0.04em] uppercase text-white">
              {countryName}
            </span>
          </span>
          <span className="inline-flex items-center gap-2 text-white/60">
            <span aria-hidden className="gh-pulse-dot !size-2" />
            <span className="uppercase tracking-[0.16em]">
              {doctorCount} doctors live now
            </span>
          </span>
        </div>

        {/* Massive editorial headline. Mixed weight (sans semibold +
          * serif italic for one accent word) creates the magazine feel.
          * Scale tops out at 11rem (≈176px) on huge desktops. */}
        <h1
          className="
            mt-10 max-w-[18ch]
            font-semibold
            tracking-[-0.04em] leading-[0.92]
            text-[clamp(3.25rem,9vw,11rem)]
          "
        >
          {displayHeroTitle ? (
            displayHeroTitle
          ) : (
            <>
              See a doctor
              <br />
              <span
                className="
                  italic font-normal
                  tracking-[-0.01em]
                  text-[var(--color-accent)]
                "
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                from anywhere
              </span>{" "}
              <span className="text-white/95">on your terms.</span>
            </>
          )}
        </h1>

        {/* Subhead — narrow column, generous leading. Sits under the
          * headline like editorial standfirst. */}
        <p className="mt-8 max-w-[42ch] text-base md:text-lg leading-relaxed text-white/72">
          {displayHeroSubtitle ??
            "Locally-registered clinicians, single-form booking, no waiting rooms. Pay only after the video call connects."}
        </p>

        {/* CTA cluster + proof points stacked. Lime pill primary,
          * ghost-on-dark secondary, proof points under both. */}
        <div className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-4">
          <Link
            href={bookHref}
            className="
              inline-flex items-center justify-center gap-2
              rounded-full bg-[var(--color-accent)]
              px-7 py-4
              text-[15px] font-bold text-[var(--color-background-dark)]
              transition-[background-color,transform] duration-200
              hover:bg-white
              active:scale-[0.98] motion-reduce:active:scale-100
              motion-reduce:transition-none
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
            "
          >
            {displayCtaLabel}
            <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
          </Link>
          <Link
            href="#services"
            className="
              inline-flex items-center justify-center gap-2
              rounded-full
              border border-white/25 bg-transparent
              px-6 py-4 text-[15px] font-semibold text-white/90
              transition-[background-color,border-color] duration-200
              hover:bg-white/10 hover:border-white/40
              motion-reduce:transition-none
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
            "
          >
            Browse services
          </Link>

          <ul className="ml-2 hidden flex-wrap gap-x-6 gap-y-2 lg:flex text-[length:var(--text-meta)] text-white/60">
            <li className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--color-accent)]" strokeWidth={1.5} aria-hidden />
              Licensed in {countryName}
            </li>
            <li className="inline-flex items-center gap-2">
              <Clock className="size-4 text-[var(--color-accent)]" strokeWidth={1.5} aria-hidden />
              Same-day slots
            </li>
            <li className="inline-flex items-center gap-2">
              <Stethoscope className="size-4 text-[var(--color-accent)]" strokeWidth={1.5} aria-hidden />
              No clinic visits
            </li>
          </ul>
        </div>

        {/* Live availability strip — sits at the bottom of the hero
          * as a horizontal rail. Doctor avatars + names + free-slot
          * chips. Replaces the side panel — keeps the hero focused on
          * type while still giving the page real product signal. */}
        {doctorsForPanel.length > 0 ? (
          <div
            className="
              mt-16 md:mt-20
              rounded-[var(--radius-card)]
              border border-white/10
              bg-white/[0.03]
              backdrop-blur-sm
              p-6 md:p-7
            "
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <p className="gh-eyebrow text-[var(--color-accent)]">
                Available right now
              </p>
              <p className="text-[length:var(--text-meta)] text-white/55">
                Consulting in {languageLabel} ·{" "}
                <span className="font-semibold text-white/90 [font-variant-numeric:tabular-nums]">
                  {totalDoctorsAcrossEurope} across Europe
                </span>
              </p>
            </div>
            <ul className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {doctorsForPanel.map((d) => (
                <li key={d.name} className="flex items-center gap-3 min-w-0">
                  <AvatarBubble name={d.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {d.name}
                    </p>
                    <p className="truncate text-xs text-white/55">
                      {d.role}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--color-accent)]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                    Free
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Admin-uploaded hero image — appears below if provided.
          * Wide editorial slot, doesn't compete with the headline. */}
        {heroImageSrc ? (
          <div
            className="
              mt-16 overflow-hidden
              rounded-[var(--radius-card)]
              border border-white/10
            "
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageSrc}
              alt={displayHeroTitle ?? `${countryName} clinic`}
              className="block w-full"
              style={{ maxHeight: 480, objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Forest-gradient initials bubble used in the live strip. */
function AvatarBubble({ name }: { name: string }) {
  const initials =
    name.match(/[A-Z]/g)?.slice(0, 2).join("") || name.slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className="
        inline-flex size-10 shrink-0
        items-center justify-center
        rounded-full
        text-[11px] font-bold tracking-tight
        text-[var(--color-background-dark)]
        ring-2 ring-[var(--color-background-dark)]
      "
      style={{
        background:
          "linear-gradient(135deg, var(--color-accent) 0%, #B0F122 60%, var(--color-accent) 100%)",
      }}
    >
      {initials}
    </span>
  );
}
