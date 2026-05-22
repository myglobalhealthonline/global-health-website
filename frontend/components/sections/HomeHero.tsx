import Link from "next/link";
import { ArrowRight, ShieldCheck, Stethoscope, Clock } from "lucide-react";
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
  const displayCtaLabel = ctaLabel?.trim() || "Book a consultation";
  const doctorsForPanel = (liveDoctors ?? []).slice(0, 4);

  return (
    <section
      aria-labelledby="hero-title"
      className="
        relative overflow-hidden
        bg-[var(--color-background-page)]
      "
    >
      {/* Subtle grain texture — warming the white canvas without adding
        * ink. Invisible at a glance, tactile when the eye settles. */}
      <div aria-hidden className="gh-hero-grain pointer-events-none absolute inset-0 -z-10" />

      <div
        className="
          relative mx-auto max-w-[var(--container-width)]
          px-5 md:px-10
          gh-section
          grid gap-12
          lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-16
        "
      >
        {/* Left column — headline + sub + CTAs + proof points */}
        <div className="flex flex-col lg:pt-4">
          {/* Eyebrow row — country + live indicator */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="gh-eyebrow inline-flex items-center gap-2 text-[var(--color-brand-primary)]">
              <Flag code={countryCode} size="sm" />
              {countryName}
            </span>
            <span className="gh-eyebrow inline-flex items-center gap-2 text-[var(--color-text-muted)]">
              <span aria-hidden className="gh-pulse-dot !size-2" />
              {doctorCount} doctors available
            </span>
          </div>

          {/* Headline — uses the design-system display token. */}
          <h1
            id="hero-title"
            className="
              mt-6
              text-[length:var(--text-display)]
              font-semibold leading-[0.95] tracking-[-0.035em]
              text-[var(--color-text-primary)]
              max-w-[16ch]
            "
          >
            {displayHeroTitle ? (
              displayHeroTitle
            ) : (
              <>
                See a doctor,{" "}
                <span className="text-[var(--color-brand-primary)]">
                  from anywhere.
                </span>
              </>
            )}
          </h1>

          <p className="mt-6 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed text-[var(--color-text-body)]">
            {displayHeroSubtitle ??
              "Locally-registered clinicians, one-form booking, no waiting rooms. Pay only after the video call connects."}
          </p>

          {/* CTA cluster */}
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href={bookHref}
              className="gh-btn gh-btn-primary active:scale-[0.98] motion-reduce:active:scale-100"
            >
              {displayCtaLabel}
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
            <Link href="#services" className="gh-btn gh-btn-outline">
              Browse services
            </Link>
          </div>

          {/* Proof points */}
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[length:var(--text-meta)] text-[var(--color-text-muted)]">
            <li className="inline-flex items-center gap-2">
              <ShieldCheck
                className="size-4 text-[var(--color-brand-primary)]"
                strokeWidth={1.5}
                aria-hidden
              />
              Licensed in {countryName}
            </li>
            <li className="inline-flex items-center gap-2">
              <Clock
                className="size-4 text-[var(--color-brand-primary)]"
                strokeWidth={1.5}
                aria-hidden
              />
              Same-day slots
            </li>
            <li className="inline-flex items-center gap-2">
              <Stethoscope
                className="size-4 text-[var(--color-brand-primary)]"
                strokeWidth={1.5}
                aria-hidden
              />
              No clinic visits
            </li>
          </ul>
        </div>

        {/* Right column — live availability panel */}
        {doctorsForPanel.length > 0 ? (
          <aside
            aria-label="Doctors available now"
            className="
              rounded-[var(--radius-card)]
              border border-[var(--color-border)]
              bg-[var(--color-background-soft)]
              p-[var(--space-inset)]
              shadow-[var(--shadow-card)]
              lg:sticky lg:top-28
            "
          >
            <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <p className="gh-eyebrow inline-flex items-center gap-2 text-[var(--color-brand-primary)]">
                <span aria-hidden className="gh-pulse-dot !size-2" />
                Available right now
              </p>
              <p className="text-[length:var(--text-meta)] text-[var(--color-text-muted)] [font-variant-numeric:tabular-nums]">
                {totalDoctorsAcrossEurope} across Europe
              </p>
            </div>

            <ul className="mt-2 divide-y divide-[var(--color-border)]">
              {doctorsForPanel.map((d) => (
                <li key={d.name} className="flex items-center gap-4 py-4">
                  <AvatarBubble name={d.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {d.name}
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-muted)]">
                      {d.role}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--color-accent)]/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-brand-primary)]">
                    Free
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[length:var(--text-meta)] text-[var(--color-text-muted)]">
              Consulting in {languageLabel}
            </p>
          </aside>
        ) : null}
      </div>

      {/* Optional admin-uploaded hero image — editorial wide slot below fold */}
      {heroImageSrc ? (
        <div className="mx-auto max-w-[var(--container-width)] px-5 pb-16 md:px-10 md:pb-20">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageSrc}
              alt={displayHeroTitle ?? `${countryName} clinic`}
              className="block w-full object-cover"
              style={{ maxHeight: 480 }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

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
        bg-[var(--color-background-panel)]
        text-[11px] font-bold tracking-tight
        text-[var(--color-brand-primary)]
        ring-1 ring-[var(--color-border)]
      "
    >
      {initials}
    </span>
  );
}
