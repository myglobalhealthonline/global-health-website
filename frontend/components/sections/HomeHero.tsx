import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Stethoscope, Clock } from "lucide-react";
import type { CountryCode } from "@/data/countries";
import { Flag } from "@/components/ui/Flag";
import { HeroReveal } from "@/components/motion/HeroReveal";
import styles from "./HomeHero.module.css";

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
      className={`${styles.root} gh-medical-pattern gh-medical-pattern-dark relative overflow-hidden`}
    >
      {/* ── Base layer: hero photo, full-bleed ── */}
      <div className={`${styles.photoLayer} gh-medical-pattern-layer absolute inset-0`}>
        <Image
          src={heroPhotoSrc}
          alt=""
          aria-hidden
          fill
          priority
          unoptimized={unoptimizedHeroPhoto}
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      {/* ── Green forest overlay — uniform tint so photo looks faded/green-cast ── */}
      <div
        aria-hidden
        className={`${styles.tintOverlay} gh-medical-pattern-layer pointer-events-none absolute inset-0`}
      />

      {/* ── Watermark — sits above overlay, below content ── */}
      <div
        aria-hidden
        className={`${styles.watermark} gh-medical-pattern-layer gh2-watermark pointer-events-none absolute bottom-[-0.06em] left-[-0.04em] select-none`}
      >
        {countryName}
      </div>

      {/* ── Content ── */}
      <div
        className={`${styles.grid} relative mx-auto grid max-w-[var(--container-width)] items-center gap-12 px-5 pb-14 pt-[calc(var(--header-height)+3.5rem)] md:px-10 lg:gap-16 lg:pb-16 lg:pt-[calc(var(--header-height)+4rem)]`}
      >
        {/* ── LEFT — text column ── */}
        <div className="flex max-w-[760px] flex-col py-10 lg:py-20">
          <HeroReveal delay={0}>
            <div className="mb-9 flex flex-wrap items-center gap-3">
              <span
                className={`${styles.countryBadge} inline-flex items-center gap-2.5 rounded-full py-1.5 pl-2 pr-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85`}
              >
                <Flag code={countryCode} size="sm" />
                {countryName}
              </span>
              <span
                className={`${styles.availableBadge} inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-accent)]`}
              >
                <span aria-hidden className="gh-pulse-dot !size-1.5" />
                {doctorCount} {i18n?.available ?? "available"}
              </span>
            </div>
          </HeroReveal>

          <HeroReveal delay={130}>
            <h1 id="hero-title" className={`${styles.title} max-w-[13ch] text-white`}>
              {displayHeroTitle ? (
                displayHeroTitle
              ) : (
                <>
                  {i18n?.titleMain ?? "Medicine Anytime"}{" "}
                  <span className={`${styles.titleAccent} gh2-underline`}>
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
              className={`${styles.subtitle} mt-8 max-w-[46ch] text-[length:var(--text-body-lg)] leading-relaxed`}
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
            <div className={`${styles.trustDivider} mt-12 pt-7`}>
              <ul className="flex flex-wrap gap-x-9 gap-y-3">
                {trustItems.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className={`${styles.trustItem} inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.13em]`}
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

        {/* ── RIGHT — availability panel over visible photo (desktop only) ── */}
        <HeroReveal delay={380} className="relative hidden min-h-[600px] lg:block">
          {doctorsForPanel.length > 0 ? (
            <aside
              aria-label="Doctors available now"
              className={`${styles.availabilityPanel} absolute -bottom-8 -left-9 flex w-[300px] flex-col`}
            >
              <p
                className={`${styles.panelEyebrow} mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]`}
              >
                <span aria-hidden className="gh-pulse-dot !size-1.5" />
                {i18n?.openCalendars ?? "Open calendars"}
              </p>

              <ul className="space-y-3.5">
                {doctorsForPanel.map((d) => (
                  <li key={d.name} className="flex items-center gap-3">
                    <AvatarBubble name={d.name} imageSrc={d.imageSrc} />
                    <div className="min-w-0 flex-1">
                      <p className={`${styles.doctorName} truncate text-[13px] font-bold`}>
                        {d.name}
                      </p>
                      <p className={`${styles.doctorRole} truncate text-[11px]`}>
                        {d.role}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className={`${styles.doctorDot} size-1.5 shrink-0 rounded-full`}
                    />
                  </li>
                ))}
              </ul>

              <div className={`${styles.panelDivider} mt-4 pt-4`}>
                <p className={`${styles.panelMeta} mb-4 text-[11px] leading-relaxed`}>
                  {(i18n?.doctorsAcrossEurope ?? "{count} doctors across Europe").replace(
                    "{count}",
                    String(totalDoctorsAcrossEurope),
                  )}
                  <br />
                  {(i18n?.consultingIn ?? "Consulting in {lang}").replace(
                    "{lang}",
                    languageLabel,
                  )}
                </p>
                <Link
                  href={bookHref}
                  className={`${styles.panelBookBtn} flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13px] font-bold text-white transition-colors duration-200 hover:bg-white/10 motion-reduce:transition-none`}
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
        className={`${styles.bottomRule} gh-medical-pattern-layer absolute bottom-0 left-0 right-0 h-px`}
      />
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
        className={`${styles.avatarImage} relative inline-flex size-10 shrink-0 overflow-hidden rounded-full`}
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
      className={`${styles.avatarFallback} inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight`}
    >
      {initials}
    </span>
  );
}
