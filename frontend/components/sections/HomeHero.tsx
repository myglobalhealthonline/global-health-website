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
  heroImageSrc: _heroImageSrc,
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
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        className="grid lg:grid-cols-[1.1fr_0.9fr]"
        style={{ minHeight: "calc(100svh - var(--header-height))" }}
      >
        {/* LEFT — forest green brand panel */}
        <div
          className="
            relative flex flex-col justify-center overflow-hidden
            bg-[var(--color-brand-primary)]
            gh-medical-pattern gh-medical-pattern-dark
            px-8 py-20 md:px-16 lg:px-20
            min-h-[480px]
          "
        >
          {/* Lime atmospheric bloom — top-right corner only, 10% max */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 700px 500px at 110% -10%, rgba(176,241,34,0.10), transparent 55%)",
            }}
          />

          <div className="relative z-[1]">
            {/* Eyebrow row */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--color-brand-accent)]">
                <Flag code={countryCode} size="sm" />
                {countryName}
              </span>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase text-white/50">
                <span aria-hidden className="gh-pulse-dot !size-2" />
                {doctorCount} available
              </span>
            </div>

            {/* Headline — Manrope 800, white */}
            <h1
              id="hero-title"
              className="
                text-[length:var(--text-display)]
                font-extrabold leading-[0.93] tracking-[-0.04em]
                text-white
                max-w-[13ch]
              "
            >
              {displayHeroTitle ? (
                displayHeroTitle
              ) : (
                <>
                  See a doctor,{" "}
                  <span className="text-[var(--color-brand-accent)]">
                    from anywhere.
                  </span>
                </>
              )}
            </h1>

            <p className="mt-7 max-w-[46ch] text-[length:var(--text-body-lg)] leading-relaxed text-white/65">
              {displayHeroSubtitle ??
                "Locally-registered clinicians, one-form booking, no waiting rooms. Pay only after the video call connects."}
            </p>

            {/* CTA cluster */}
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={bookHref}
                className="gh-btn gh-btn-ghost-dark active:scale-[0.98] motion-reduce:active:scale-100"
              >
                {displayCtaLabel}
                <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <Link
                href="#services"
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-full px-6 py-3
                  border border-white/20 bg-transparent
                  text-sm font-semibold text-white/80
                  hover:bg-white/10 hover:border-white/35
                  transition-colors duration-200
                  motion-reduce:transition-none
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                "
              >
                Browse services
              </Link>
            </div>

            {/* Proof points */}
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5 text-[length:var(--text-meta)] text-white/55">
              <li className="inline-flex items-center gap-2">
                <ShieldCheck
                  className="size-3.5 text-[var(--color-brand-accent)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Licensed in {countryName}
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock
                  className="size-3.5 text-[var(--color-brand-accent)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Same-day slots
              </li>
              <li className="inline-flex items-center gap-2">
                <Stethoscope
                  className="size-3.5 text-[var(--color-brand-accent)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                No clinic visits
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT — white availability or booking panel */}
        <div
          className="
            flex flex-col justify-center
            bg-[var(--color-background-page)]
            px-8 py-20 md:px-12 lg:px-16
            border-t lg:border-t-0 lg:border-l border-[var(--color-border)]
          "
        >
          {doctorsForPanel.length > 0 ? (
            <aside aria-label="Doctors available now" className="max-w-[400px]">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--color-brand-primary)] mb-5">
                <span aria-hidden className="gh-pulse-dot !size-1.5" />
                Available right now
              </p>

              <p className="text-[length:var(--text-h3)] font-extrabold tracking-[-0.025em] leading-tight text-[var(--color-text-primary)] mb-8">
                {totalDoctorsAcrossEurope} doctors{" "}
                <span className="text-[var(--color-brand-primary)]">
                  across Europe
                </span>
              </p>

              <ul className="divide-y divide-[var(--color-border)] mb-6">
                {doctorsForPanel.map((d) => (
                  <li key={d.name} className="flex items-center gap-4 py-4">
                    <AvatarBubble name={d.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                        {d.name}
                      </p>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {d.role}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--color-accent-soft)] border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-brand-primary)]">
                      Free
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-[length:var(--text-meta)] text-[var(--color-text-muted)] mb-8">
                Consulting in {languageLabel}
              </p>

              <Link
                href={bookHref}
                className="gh-btn gh-btn-primary w-full"
              >
                Book a consultation
                <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
            </aside>
          ) : (
            <div className="max-w-[400px]">
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--color-brand-primary)] mb-5">
                Book online
              </p>
              <h2 className="text-[length:var(--text-h2)] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)] leading-tight mb-7">
                Your consultation<br />starts here.
              </h2>
              <p className="text-[length:var(--text-body-lg)] text-[var(--color-text-muted)] mb-9 max-w-[36ch]">
                Choose a time that works for you. Video call with a doctor licensed in {countryName}.
              </p>
              <Link href={bookHref} className="gh-btn gh-btn-primary">
                {displayCtaLabel}
                <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </div>
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
