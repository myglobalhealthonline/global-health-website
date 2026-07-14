import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowRight, ShieldCheck, Stethoscope, Clock } from "lucide-react";
import type { CountryCode } from "@/data/countries";
import { Flag } from "@/components/ui/Flag";
import { HeroReveal } from "@/components/motion/HeroReveal";
import { fitHeadingFontSize, IDEAL_HEADING_CHARS } from "@/lib/text/fit-heading-size";
import { isUnoptimizedImageSrc as isUnlistedRemote } from "@/lib/content/asset-media-url";

// SameDayBooking renders real server-fetchable markup (slot grid, CTA) once
// hydrated — keep SSR on so it isn't blank/no-index on first paint. Dynamic
// import still code-splits its client JS (date-fns-style formatters, fetch
// logic) out of the initial HomeHero bundle. Placeholder mirrors the panel's
// rounded-glass shape + typical rendered height to avoid CLS.
const SameDayBooking = dynamic(
  () => import("@/components/sections/SameDayBooking").then((m) => m.SameDayBooking),
  {
    loading: () => (
      <div
        aria-hidden
        className="w-full max-w-[900px] animate-pulse rounded-[26px] p-6 sm:p-8"
        style={{
          minHeight: 420,
          background: "rgba(8, 33, 27, 0.82)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      />
    ),
  },
);

export type LiveDoctorItem = {
  name: string;
  role: string;
  imageSrc?: string | null;
};

/** Same-day GP quick-book data for the hero panel. */
export type SameDayHeroData = {
  countryCode: string;
  countrySlug: string;
  lang: string;
  languages: string[];
  configured: boolean;
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
  sameDay,
  heroTitle,
  heroSubtitle,
  heroBullets,
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
  sameDay?: SameDayHeroData;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  /** Verbatim trust bullets (no country name appended). Overrides i18n. */
  heroBullets?: string[] | null;
  heroImageSrc?: string | null;
  ctaLabel?: string | null;
  i18n?: HomeHeroI18n;
}) {
  const displayHeroTitle = heroTitle?.trim() || null;
  const displayHeroSubtitle = heroSubtitle?.trim() || null;
  const displayCtaLabel = ctaLabel?.trim() || i18n?.cta || "Book Appointment";
  const doctorsForPanel = (liveDoctors ?? []).slice(0, 3);
  const showSameDay = Boolean(sameDay?.configured && sameDay.languages.length > 0);
  const heroPhotoSrc = normalizeHeroPhoto(heroImageSrc);
  // /api/media/* is same-origin (rewritten) and images.unsplash.com /
  // images.pexels.com are allow-listed in next.config.ts remotePatterns —
  // only a genuinely different remote host needs unoptimized.
  const unoptimizedHeroPhoto = isUnlistedRemote(heroPhotoSrc);

  const titleText =
    displayHeroTitle ?? `${i18n?.titleMain ?? "Medicine Anytime"} ${i18n?.titleAccent ?? "Anywhere."}`;
  const titleFontSize = fitHeadingFontSize(titleText, {
    minRem: 2.25,
    maxRem: 6,
    viewportTerm: "8vw",
    idealChars: IDEAL_HEADING_CHARS,
  });

  // Per-country override supplies all three bullets verbatim; otherwise the
  // i18n default composes them (bullet 1 appends the country name).
  const bulletOverride = heroBullets && heroBullets.length === 3 ? heroBullets : null;
  const trustItems = [
    {
      icon: ShieldCheck,
      label: bulletOverride?.[0] ?? `${i18n?.trustLicensed ?? "Licensed in"} ${countryName}`,
    },
    { icon: Clock, label: bulletOverride?.[1] ?? i18n?.trustAvailability ?? "Live availability" },
    {
      icon: Stethoscope,
      label: bulletOverride?.[2] ?? i18n?.trustAppointments ?? "Online appointments",
    },
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className="gh-home-hero-root gh-medical-pattern gh-medical-pattern-dark relative !overflow-visible gh-hero-cap-full max-lg:!min-h-[min(calc(100svh-var(--header-height)),760px)]"
    >
      {/* ── Base layer: hero photo, full-bleed ── */}
      <div className="gh-home-hero-photoLayer gh-medical-pattern-layer absolute inset-0">
        {/* quality 60: decorative background under a heavy tint overlay —
            compression artefacts invisible, saves ~8 KiB on the LCP path. */}
        <Image
          src={heroPhotoSrc}
          alt=""
          aria-hidden
          fill
          priority
          fetchPriority="high"
          quality={60}
          unoptimized={unoptimizedHeroPhoto}
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      {/* ── Green forest overlay — uniform tint so photo looks faded/green-cast ── */}
      <div
        aria-hidden
        className="gh-home-hero-tintOverlay gh-medical-pattern-layer pointer-events-none absolute inset-0"
      />

      {/* ── Watermark — sits above overlay, below content. Hidden below lg:
           its clamp() font-size still reads huge on phone widths and is
           pure atmosphere, not content. Bleeds off the section edge on
           purpose, so it gets its own clip — the section itself must stay
           overflow-visible so long titles/copy (long translations) push it
           taller instead of getting silently clipped. ── */}
      <div aria-hidden className="gh-medical-pattern-layer pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
        <div className="gh-home-hero-watermark gh2-watermark absolute bottom-[-0.06em] left-[-0.04em] select-none">
          {countryName}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="gh-home-hero-grid relative mx-auto grid max-w-[var(--container-width)] items-center gap-12 px-5 pb-14 pt-[calc(var(--header-height)+3.5rem)] md:px-10 lg:gap-16 lg:pb-16 lg:pt-[calc(var(--header-height)+4rem)] max-lg:!min-h-[min(calc(100svh-var(--header-height)),760px)]">
        {/* ── LEFT — text column ── */}
        <div className="gh-home-hero-left flex max-w-[760px] flex-col py-10 lg:py-20">
          <HeroReveal delay={0}>
            <div className="mb-9 flex flex-wrap items-center gap-3">
              <span className="gh-home-hero-countryBadge inline-flex items-center gap-2.5 rounded-full py-1.5 pl-2 pr-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">
                <Flag code={countryCode} size="sm" />
                {countryName}
              </span>
              <span className="gh-home-hero-availableBadge inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-accent)]">
                <span aria-hidden className="gh-pulse-dot !size-1.5" />
                {doctorCount} {i18n?.available ?? "available"}
              </span>
            </div>
          </HeroReveal>

          {/* fade=false: the headline is the LCP candidate — first paint at
              opacity 0 would exclude it from LCP entirely (NO_LCP). */}
          <HeroReveal delay={130} fade={false}>
            <h1
              id="hero-title"
              className="gh-home-hero-title text-white"
              style={{ fontSize: titleFontSize, maxWidth: `${IDEAL_HEADING_CHARS}ch` }}
            >
              {displayHeroTitle ? (
                displayHeroTitle
              ) : (
                <>
                  {i18n?.titleMain ?? "Medicine Anytime"}{" "}
                  <span className="gh-home-hero-titleAccent gh2-underline">
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
            <p className="gh-home-hero-subtitle mt-8 max-w-[46ch] text-[length:var(--text-body-lg)] leading-relaxed">
              {displayHeroSubtitle ??
                (i18n?.subtitle ??
                  "Choose a service, select an open time, and speak with licensed clinicians registered with national medical councils across Europe.")}
            </p>
          </HeroReveal>

          <HeroReveal delay={340}>
            <div className="mt-11 flex flex-wrap items-center gap-4">
              <Link
                href={bookHref}
                className="gh2-btn-lime gh-focus-on-dark motion-reduce:transition-none"
              >
                {displayCtaLabel}
                <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
              </Link>
              <Link
                href="#services"
                className="gh2-btn-ghost gh-focus-on-dark motion-reduce:transition-none"
              >
                {i18n?.secondary ?? "Browse services"}
              </Link>
            </div>
          </HeroReveal>

          <HeroReveal delay={430}>
            <div className="gh-home-hero-trustDivider mt-12 pt-7">
              <ul className="flex flex-wrap gap-x-9 gap-y-3">
                {trustItems.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="gh-home-hero-trustItem inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.13em]"
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

          {/* Same-day quick-book on mobile/tablet (hero panel is lg-only). */}
          {showSameDay && sameDay ? (
            <HeroReveal delay={300} className="mt-12 lg:hidden">
              <SameDayBooking
                country={sameDay.countrySlug}
                lang={sameDay.lang}
                countryCode={sameDay.countryCode}
                languages={sameDay.languages}
                configured={sameDay.configured}
                className="max-w-none"
              />
            </HeroReveal>
          ) : null}
        </div>

        {/* ── RIGHT — same-day GP quick-book (falls back to the static panel) ── */}
        <HeroReveal delay={380} className="relative hidden min-h-[660px] w-full lg:flex lg:items-end">
          {showSameDay && sameDay ? (
            <div className="gh-home-hero-availabilityPanel w-full pb-8">
              <SameDayBooking
                country={sameDay.countrySlug}
                lang={sameDay.lang}
                countryCode={sameDay.countryCode}
                languages={sameDay.languages}
                configured={sameDay.configured}
                className="max-w-none"
              />
            </div>
          ) : doctorsForPanel.length > 0 ? (
            <aside
              aria-label="Doctors available now"
              className="gh-home-hero-availabilityPanel absolute -bottom-8 -left-9 flex w-[300px] flex-col"
            >
              <p className="gh-home-hero-panelEyebrow mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]">
                <span aria-hidden className="gh-pulse-dot !size-1.5" />
                {i18n?.openCalendars ?? "Open calendars"}
              </p>

              <ul className="space-y-3.5">
                {doctorsForPanel.map((d) => (
                  <li key={d.name} className="flex items-center gap-3">
                    <AvatarBubble name={d.name} imageSrc={d.imageSrc} />
                    <div className="min-w-0 flex-1">
                      <p className="gh-home-hero-doctorName truncate text-[13px] font-bold">
                        {d.name}
                      </p>
                      <p className="gh-home-hero-doctorRole truncate text-[11px]">
                        {d.role}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="gh-home-hero-doctorDot size-1.5 shrink-0 rounded-full"
                    />
                  </li>
                ))}
              </ul>

              <div className="gh-home-hero-panelDivider mt-4 pt-4">
                <p className="gh-home-hero-panelMeta mb-4 text-[11px] leading-relaxed">
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
                  className="gh-home-hero-panelBookBtn flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13px] font-bold text-white transition-colors duration-200 hover:bg-white/10 motion-reduce:transition-none"
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
        className="gh-home-hero-bottomRule gh-medical-pattern-layer absolute bottom-0 left-0 right-0 h-px"
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
        className="gh-home-hero-avatarImage relative inline-flex size-10 shrink-0 overflow-hidden rounded-full"
      >
        <Image
          src={src}
          alt=""
          fill
          unoptimized={isUnlistedRemote(src)}
          className="object-cover object-top"
          sizes="40px"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="gh-home-hero-avatarFallback inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight"
    >
      {initials}
    </span>
  );
}
