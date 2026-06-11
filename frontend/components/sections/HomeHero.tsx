import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Stethoscope, Clock } from "lucide-react";
import type { CountryCode } from "@/data/countries";
import { Flag } from "@/components/ui/Flag";
import { HeroReveal } from "@/components/motion/HeroReveal";

export type LiveDoctorItem = {
  name: string;
  role: string;
  imageSrc?: string | null;
};

export type HomeHeroI18n = {
  titleMain: string;
  titleAccent: string;
  subtitle: string;
  cta: string;
  secondary: string;
  trustLicensed: string;
  trustAvailability: string;
  trustAppointments: string;
  available: string;
  secureOnlineCare: string;
  fromHome: string;
  openCalendars: string;
  doctorsAcrossEurope: string;
  consultingIn: string;
  bookNow: string;
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
  i18n,
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
  i18n?: HomeHeroI18n;
}) {
  const displayHeroTitle = heroTitle?.trim() || null;
  const displayHeroSubtitle = heroSubtitle?.trim() || null;
  const displayCtaLabel = ctaLabel?.trim() || i18n?.cta || "Book Appointment";
  const doctorsForPanel = (liveDoctors ?? []).slice(0, 3);
  const heroPhotoSrc = normalizeHeroPhoto(heroImageSrc);
  const unoptimizedHeroPhoto =
    /^https?:\/\//i.test(heroPhotoSrc) || heroPhotoSrc.startsWith("/api/media/");

  const trustItems = [
    { icon: ShieldCheck, label: `${i18n?.trustLicensed ?? "Licensed in"} ${countryName}` },
    { icon: Clock, label: i18n?.trustAvailability ?? "Live availability" },
    { icon: Stethoscope, label: i18n?.trustAppointments ?? "Online appointments" },
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className="gh-medical-pattern gh-medical-pattern-dark relative overflow-hidden"
      style={{ background: "#0F2E25" }}
    >
      {/* ── Base layer: hero photo, full-bleed ── */}
      <Image
        src={heroPhotoSrc}
        alt=""
        aria-hidden
        fill
        priority
        unoptimized={unoptimizedHeroPhoto}
        className="object-cover object-center"
        sizes="100vw"
        style={{ zIndex: 0 }}
      />

      {/* ── Green forest overlay — strong left (text), fades right (photo shows) ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 1,
          background: `
            radial-gradient(ellipse 900px 600px at 100% -10%, rgba(176,241,34,0.09), transparent 52%),
            radial-gradient(ellipse 600px 800px at -5% 110%, rgba(0,0,0,0.30), transparent 55%),
            linear-gradient(to right,
              rgba(11,36,28,0.97) 0%,
              rgba(11,36,28,0.92) 25%,
              rgba(11,36,28,0.72) 48%,
              rgba(11,36,28,0.40) 68%,
              rgba(11,36,28,0.18) 85%,
              rgba(11,36,28,0.08) 100%
            )
          `,
        }}
      />

      {/* ── Watermark — sits above overlay, below content ── */}
      <div
        aria-hidden
        className="gh2-watermark pointer-events-none absolute bottom-[-0.06em] left-[-0.04em] select-none"
        style={{ fontSize: "clamp(7rem, 21vw, 19rem)", zIndex: 2 }}
      >
        {countryName}
      </div>

      {/* ── Content ── */}
      <div
        className="gh-home-hero-grid relative mx-auto grid max-w-[var(--container-width)] items-center gap-12 px-5 py-14 md:px-10 lg:gap-16 lg:py-16"
        style={{ minHeight: "calc(100svh - var(--header-height))", zIndex: 3 }}
      >
        {/* ── LEFT — text column ── */}
        <div className="flex max-w-[760px] flex-col py-10 lg:py-20">
          <HeroReveal delay={0}>
            <div className="mb-9 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2.5 rounded-full py-1.5 pl-2 pr-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <Flag code={countryCode} size="sm" />
                {countryName}
              </span>
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-accent)]"
                style={{
                  background: "rgba(176,241,34,0.08)",
                  border: "1px solid rgba(176,241,34,0.20)",
                }}
              >
                <span aria-hidden className="gh-pulse-dot !size-1.5" />
                {doctorCount} {i18n?.available ?? "available"}
              </span>
            </div>
          </HeroReveal>

          <HeroReveal delay={130}>
            <h1
              id="hero-title"
              className="max-w-[13ch] text-white"
              style={{
                fontSize: "clamp(3rem, 7vw + 0.75rem, 6rem)",
                fontWeight: 800,
                lineHeight: 0.94,
                letterSpacing: "-0.045em",
              }}
            >
              {displayHeroTitle ? (
                displayHeroTitle
              ) : (
                <>
                  {i18n?.titleMain ?? "Medicine Anytime"}{" "}
                  <span className="gh2-underline" style={{ color: "var(--color-brand-accent)" }}>
                    {i18n?.titleAccent ?? "Anywhere."}
                    <svg aria-hidden viewBox="0 0 220 14" fill="none" preserveAspectRatio="none">
                      <path
                        d="M3 10.5C45 4.5 130 2.5 217 7.5"
                        stroke="rgba(143,176,33,0.85)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </>
              )}
            </h1>
          </HeroReveal>

          <HeroReveal delay={240}>
            <p
              className="mt-8 max-w-[46ch] text-[length:var(--text-body-lg)] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              {displayHeroSubtitle ??
                (i18n?.subtitle ??
                  "Choose a service, select an open time, and speak with licensed clinicians registered with national medical councils across Europe.")}
            </p>
          </HeroReveal>

          <HeroReveal delay={340}>
            <div className="mt-11 flex flex-wrap items-center gap-4">
              <Link
                href={bookHref}
                className="gh2-btn-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]/60 motion-reduce:transition-none"
              >
                {displayCtaLabel}
                <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
              </Link>
              <Link
                href="#services"
                className="gh2-btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 motion-reduce:transition-none"
              >
                {i18n?.secondary ?? "Browse services"}
              </Link>
            </div>
          </HeroReveal>

          <HeroReveal delay={430}>
            <div
              className="mt-12 pt-7"
              style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
            >
              <ul className="flex flex-wrap gap-x-9 gap-y-3">
                {trustItems.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.13em]"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    <Icon
                      className="size-3.5 text-[var(--color-brand-accent)]"
                      strokeWidth={1.6}
                      aria-hidden
                    />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </HeroReveal>
        </div>

        {/* ── RIGHT — floating chips over visible photo (desktop only) ── */}
        <HeroReveal delay={380} className="relative hidden min-h-[600px] lg:block">
          {/* Floating chip — top */}
          <div
            className="absolute -left-5 top-16 inline-flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(255,255,255,0.45)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
              color: "var(--color-brand-primary)",
            }}
          >
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] text-white">
              <Stethoscope className="size-4" strokeWidth={1.7} aria-hidden />
            </span>
            <span className="text-[12px] font-bold leading-tight">
              {i18n?.secureOnlineCare ?? "Secure online care"}
              <span className="block text-[10px] font-semibold text-[var(--color-text-muted)]">
                {i18n?.fromHome ?? "From home"}
              </span>
            </span>
          </div>

          {/* Availability ticket */}
          {doctorsForPanel.length > 0 ? (
            <aside
              aria-label="Doctors available now"
              className="absolute -bottom-8 -left-9 flex w-[300px] flex-col"
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 22,
                background: "rgba(13,38,30,0.80)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: "0 24px 70px rgba(0,0,0,0.30)",
                padding: "22px",
              }}
            >
              <p
                className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                <span aria-hidden className="gh-pulse-dot !size-1.5" />
                {i18n?.openCalendars ?? "Open calendars"}
              </p>

              <ul className="space-y-3.5">
                {doctorsForPanel.map((d) => (
                  <li key={d.name} className="flex items-center gap-3">
                    <AvatarBubble name={d.name} imageSrc={d.imageSrc} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.88)" }}>
                        {d.name}
                      </p>
                      <p className="truncate text-[11px]" style={{ color: "rgba(255,255,255,0.60)" }}>
                        {d.role}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: "var(--color-brand-accent)" }}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}>
                <p className="mb-4 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
                  {(i18n?.doctorsAcrossEurope ?? "{count} doctors across Europe").replace("{count}", String(totalDoctorsAcrossEurope))}
                  <br />
                  {(i18n?.consultingIn ?? "Consulting in {lang}").replace("{lang}", languageLabel)}
                </p>
                <Link
                  href={bookHref}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13px] font-bold text-white transition-colors duration-200 hover:bg-white/10 motion-reduce:transition-none"
                  style={{ border: "1px solid rgba(255,255,255,0.20)" }}
                >
                  {i18n?.bookNow ?? "Book now"}
                  <ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden />
                </Link>
              </div>
            </aside>
          ) : null}
        </HeroReveal>
      </div>

      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "rgba(255,255,255,0.06)", zIndex: 4 }}
      />

      <style>{`
        .gh-home-hero-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 1024px) {
          .gh-home-hero-grid {
            grid-template-columns: minmax(0, 1.02fr) minmax(420px, 0.76fr);
          }
        }
      `}</style>
    </section>
  );
}

function normalizeHeroPhoto(src?: string | null): string {
  const trimmed = src?.trim();
  if (!trimmed) return "/images/stock/home-hero.jpg";
  if (trimmed.endsWith(".svg") || trimmed.includes("-ai.") || trimmed.includes("-placeholder.")) {
    return "/images/stock/home-hero.jpg";
  }
  return trimmed;
}

function AvatarBubble({ name, imageSrc }: { name: string; imageSrc?: string | null }) {
  const initials =
    name.match(/[A-Z]/g)?.slice(0, 2).join("") || name.slice(0, 2).toUpperCase();
  if (imageSrc?.trim()) {
    const src = imageSrc.trim();
    return (
      <span
        aria-hidden
        className="relative inline-flex size-10 shrink-0 overflow-hidden rounded-full"
        style={{ border: "1px solid rgba(255,255,255,0.20)" }}
      >
        <Image
          src={src}
          alt=""
          fill
          unoptimized={/^https?:\/\//i.test(src) || src.startsWith("/api/media/")}
          className="object-cover object-top"
          sizes="40px"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight"
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
