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
    <section
      aria-labelledby="hero-title"
      className="
        relative overflow-hidden
        bg-[var(--color-background-dark)]
        gh-medical-pattern gh-medical-pattern-dark
      "
    >
      {/* Lime bloom — single source, top-right, 7% max. Warmth not spotlight. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 700px 500px at 105% -5%, rgba(176,241,34,0.07), transparent 50%)",
        }}
      />

      <div
        className="relative z-[1] mx-auto max-w-[var(--container-width)] px-8 md:px-16"
        style={{
          minHeight: "calc(100svh - var(--header-height))",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          gap: "clamp(32px,4vw,72px)",
        }}
      >
        {/* ── Type column ── */}
        <div className="flex flex-col py-16 lg:py-24 max-w-[720px]">

          {/* Eyebrow */}
          <div className="flex flex-wrap items-center gap-5 mb-10">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-brand-accent)]">
              <Flag code={countryCode} size="sm" />
              {countryName}
            </span>
            <span
              className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              <span aria-hidden className="gh-pulse-dot !size-1.5" />
              {doctorCount} available
            </span>
          </div>

          {/* Headline — the design IS the type */}
          <h1
            id="hero-title"
            className="font-extrabold text-white max-w-[14ch]"
            style={{
              fontSize: "clamp(3.25rem, 7.5vw + 0.5rem, 7.5rem)",
              lineHeight: 0.91,
              letterSpacing: "-0.045em",
            }}
          >
            {displayHeroTitle ? (
              displayHeroTitle
            ) : (
              <>
                See a doctor,{" "}
                <span style={{ color: "var(--color-brand-accent)" }}>
                  from anywhere.
                </span>
              </>
            )}
          </h1>

          {/* Lede — white/45, restrained */}
          <p
            className="mt-8 max-w-[44ch] text-[length:var(--text-body-lg)] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {displayHeroSubtitle ??
              "Locally-registered clinicians. Same-day appointments. Pay only after the call connects."}
          </p>

          {/* CTAs — outline primary, ghost secondary */}
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              href={bookHref}
              className="
                inline-flex items-center gap-2.5
                rounded-full px-8 py-[14px]
                text-sm font-bold tracking-[-0.01em] text-white
                transition-colors duration-200
                hover:bg-white/10
                motion-reduce:transition-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
              "
              style={{ border: "1px solid rgba(255,255,255,0.22)" }}
            >
              {displayCtaLabel}
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
            <Link
              href="#services"
              className="
                text-sm font-semibold text-white/35
                hover:text-white/65
                transition-colors duration-200
                motion-reduce:transition-none
                focus-visible:outline-none
              "
            >
              Browse services
            </Link>
          </div>

          {/* Proof points — minimal, uppercase, very low opacity */}
          <ul
            className="mt-12 flex flex-wrap gap-x-8 gap-y-2"
          >
            {[
              { icon: ShieldCheck, label: `Licensed in ${countryName}` },
              { icon: Clock, label: "Same-day slots" },
              { icon: Stethoscope, label: "No clinic visits" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                <Icon
                  className="size-3.5 text-[var(--color-brand-accent)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Availability panel — glass, no heavy card ── */}
        {doctorsForPanel.length > 0 ? (
          <aside
            aria-label="Doctors available now"
            className="hidden lg:flex flex-col self-center"
            style={{
              width: 296,
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 20,
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              padding: "28px",
              flexShrink: 0,
            }}
          >
            <p
              className="text-[10px] font-bold tracking-[0.22em] uppercase mb-6 inline-flex items-center gap-2"
              style={{ color: "var(--color-brand-accent)" }}
            >
              <span aria-hidden className="gh-pulse-dot !size-1.5" />
              Available now
            </p>

            <ul className="space-y-5">
              {doctorsForPanel.map((d) => (
                <li key={d.name} className="flex items-center gap-3">
                  <AvatarBubble name={d.name} />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[13px] font-bold"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {d.name}
                    </p>
                    <p
                      className="truncate text-[11px]"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      {d.role}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div
              className="mt-6 pt-5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p
                className="text-[11px] mb-5 leading-relaxed"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                {totalDoctorsAcrossEurope} doctors across Europe
                <br />
                Consulting in {languageLabel}
              </p>
              <Link
                href={bookHref}
                className="
                  flex items-center justify-center gap-2
                  w-full rounded-full py-3
                  text-[13px] font-bold text-white
                  transition-colors duration-200
                  hover:bg-white/10
                  motion-reduce:transition-none
                "
                style={{ border: "1px solid rgba(255,255,255,0.14)" }}
              >
                Book now
                <ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden />
              </Link>
            </div>
          </aside>
        ) : null}
      </div>

      {/* Bottom hairline separator */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />
    </section>
  );
}

function AvatarBubble({ name }: { name: string }) {
  const initials =
    name.match(/[A-Z]/g)?.slice(0, 2).join("") || name.slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight"
      style={{
        background: "rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.70)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {initials}
    </span>
  );
}
