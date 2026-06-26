import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Users,
  Clock,
  Stethoscope,
  Pill,
  Activity,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Flag } from "@/components/ui/Flag";

/**
 * Reusable premium service-page hero (clinical-editorial gh2 system).
 *
 * One layout shared across every Global Health service page — only the copy,
 * icons and left image change per page. Composition: full-bleed healthcare
 * image on the left with an optional frosted checklist card + dark trust badge
 * floating over it; eyebrow pill, headline (one lime accent word), lede, dual
 * CTA and a three-up feature-card row on the right over a layered dark-emerald
 * medical-tech background; then an optional curved off-white trust strip.
 *
 * All human-readable copy + icons flow in via props (wired to i18n at the page
 * level). The floating checklist card is intentionally text-free (skeleton
 * bars) so it needs no translation.
 */

type CtaLink = { label: string; href: string };
type FeatureCard = { icon: ReactNode; title: string; subtitle: string };
type Badge = { icon?: ReactNode; title: string; subtitle: string; accent?: string };
type TrustStat = { icon: ReactNode; title: string; subtitle: string };

export type ServiceHeroProps = {
  countryCode?: string;
  /** Eyebrow text, already interpolated, e.g. "Ireland · Specialists". */
  countryLabel?: string;
  titleLead: string;
  titleAccent: string;
  titleTrail?: string;
  lede?: ReactNode;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  heroImage: { src: string; alt: string; priority?: boolean };
  /** Three compact feature cards under the CTAs. Icons supplied per page. */
  featureCards: FeatureCard[];
  /** Optional dark glass badge floating over the lower-left of the image. */
  badge?: Badge;
  /** Optional curved off-white trust strip below the hero (3 stats). */
  trustStats?: TrustStat[];
  /** Frosted checklist card over the image (decorative, text-free). Default off. */
  floatingChecklist?: boolean;
};

export function ServiceHero({
  countryCode,
  countryLabel,
  titleLead,
  titleAccent,
  titleTrail,
  lede,
  primaryCta,
  secondaryCta,
  heroImage,
  featureCards,
  badge,
  trustStats,
  floatingChecklist = false,
}: ServiceHeroProps) {
  return (
    <section
      className="gh-medical-pattern gh-medical-pattern-dark relative isolate flex flex-col overflow-hidden lg:min-h-[calc(100svh-var(--header-height))]"
      style={{ background: "#031F18" }}
    >
      <div className="grid lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        {/* ── LEFT — full-bleed healthcare image + floating cards ───────── */}
        <div
          className="relative overflow-hidden"
          style={{ minHeight: "clamp(300px, 46vw, 900px)" }}
        >
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            fill
            priority={heroImage.priority}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-center"
            unoptimized={
              /^https?:\/\//i.test(heroImage.src) ||
              heroImage.src.startsWith("/api/media/")
            }
          />
          {/* Brand green wash so the photo matches the emerald canvas */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(3,31,24,0.30) 0%, rgba(3,31,24,0.10) 30%, rgba(3,31,24,0.55) 100%)",
            }}
          />
          {/* Bottom fade */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{
              height: "52%",
              background:
                "linear-gradient(to top, rgba(3,31,24,0.92) 0%, rgba(3,31,24,0.35) 48%, transparent 100%)",
            }}
          />
          {/* Right-edge bleed into the content column — desktop only */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block"
            style={{
              width: "40%",
              background:
                "linear-gradient(to right, rgba(3,31,24,0) 0%, rgba(3,31,24,0.78) 68%, #031F18 100%)",
            }}
          />

          {/* Floating frosted checklist card — upper-middle-left */}
          {floatingChecklist ? (
            <div
              className="absolute left-5 top-[12%] hidden w-[244px] rounded-2xl p-4 sm:block md:left-8"
              style={{
                background: "rgba(245,255,248,0.86)",
                border: "1px solid rgba(255,255,255,0.6)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                boxShadow: "0 22px 60px rgba(2,18,13,0.32)",
              }}
            >
              <span
                className="inline-flex size-9 items-center justify-center rounded-xl"
                style={{ background: "rgba(29,75,54,0.10)", color: "#1D4B36" }}
              >
                <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <ul className="mt-3 space-y-2.5">
                {[Stethoscope, Pill, Activity].map((Icon, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: "rgba(29,75,54,0.08)", color: "#1D4B36" }}
                    >
                      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
                    </span>
                    <span
                      className="h-2 flex-1 rounded-full"
                      style={{ background: "rgba(29,75,54,0.14)" }}
                    />
                    <span
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "#B0F122", color: "#0a1f14" }}
                    >
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  </li>
                ))}
                {/* one unchecked row */}
                <li className="flex items-center gap-2.5">
                  <span
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgba(29,75,54,0.08)", color: "#1D4B36" }}
                  >
                    <Clock className="size-3.5" strokeWidth={2} aria-hidden />
                  </span>
                  <span
                    className="h-2 flex-1 rounded-full"
                    style={{ background: "rgba(29,75,54,0.10)" }}
                  />
                  <span
                    className="inline-flex size-5 shrink-0 rounded-md"
                    style={{ border: "1.5px solid rgba(29,75,54,0.30)" }}
                  />
                </li>
              </ul>
            </div>
          ) : null}

          {/* Dark trust badge — lower-left */}
          {badge ? (
            <div className="gh-glass-emerald absolute bottom-6 left-5 hidden max-w-[300px] items-start gap-3 rounded-2xl px-4 py-3.5 sm:flex md:left-8">
              <span
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-brand-accent)]"
                style={{ background: "rgba(176,241,34,0.12)" }}
              >
                {badge.icon ?? <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-bold leading-tight text-white">
                  {badge.title}
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-white/65">
                  {badge.accent ? (
                    <>
                      {badge.subtitle}{" "}
                      <span className="font-semibold text-[var(--color-brand-accent)]">
                        {badge.accent}
                      </span>
                    </>
                  ) : (
                    badge.subtitle
                  )}
                </span>
              </span>
            </div>
          ) : null}
        </div>

        {/* ── RIGHT — content over layered premium background ───────────── */}
        <div
          className="relative isolate flex flex-col justify-center overflow-hidden px-8 py-12 md:px-12 lg:px-16 lg:py-10"
          style={{ background: "#031F18" }}
        >
          {/* gradient depth + vignette */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(circle at 90% 12%, rgba(22,89,64,0.32), transparent 40%)," +
                "radial-gradient(circle at 14% 88%, rgba(2,18,13,0.55), transparent 46%)," +
                "linear-gradient(135deg, #062b21 0%, #031F18 46%, #02140e 100%)",
            }}
          />
          {/* technical grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(176,241,34,0.05) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(176,241,34,0.05) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(120% 120% at 80% 20%, #000 0%, rgba(0,0,0,0.45) 55%, transparent 90%)",
              WebkitMaskImage:
                "radial-gradient(120% 120% at 80% 20%, #000 0%, rgba(0,0,0,0.45) 55%, transparent 90%)",
            }}
          />
          {/* dotted texture */}
          <div
            aria-hidden
            className="gh-dot-grid pointer-events-none absolute inset-0 z-0"
            style={{
              opacity: 0.6,
              maskImage:
                "radial-gradient(680px 520px at 88% 10%, #000 0%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(680px 520px at 88% 10%, #000 0%, transparent 72%)",
            }}
          />
          {/* soft radial glow behind content */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(circle at 38% 40%, rgba(176,241,34,0.10), transparent 30%)," +
                "radial-gradient(circle at 72% 72%, rgba(18,120,76,0.22), transparent 38%)," +
                "radial-gradient(ellipse 620px 520px at 112% -8%, rgba(176,241,34,0.12), transparent 62%)",
            }}
          />
          {/* faint medical plus symbols */}
          <span
            aria-hidden
            className="pointer-events-none absolute z-0 select-none font-bold leading-none"
            style={{ top: "-2%", right: "6%", fontSize: "180px", color: "rgba(176,241,34,0.06)" }}
          >
            +
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute z-0 select-none font-bold leading-none"
            style={{ bottom: "10%", right: "12%", fontSize: "72px", color: "rgba(176,241,34,0.05)" }}
          >
            +
          </span>

          <div className="relative z-10" style={{ maxWidth: 640 }}>
            {countryCode || countryLabel ? (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{
                    background: "rgba(3,28,22,0.75)",
                    border: "1px solid rgba(176,241,34,0.22)",
                    color: "rgba(245,255,248,0.80)",
                  }}
                >
                  {countryCode ? <Flag code={countryCode} size="sm" /> : null}
                  {countryLabel}
                </span>
              </div>
            ) : null}

            <h1
              className="font-extrabold tracking-[-0.035em]"
              style={{
                fontSize: "clamp(2.5rem, 2.4vw + 1.9rem, 4.25rem)",
                lineHeight: 1.0,
                color: "#F5FFF8",
                maxWidth: "14ch",
              }}
            >
              {titleLead}{" "}
              <span style={{ color: "var(--color-brand-accent)" }}>{titleAccent}</span>
              {titleTrail ? <span>{` ${titleTrail}`}</span> : null}
            </h1>

            {lede ? (
              <p
                className="mt-5 leading-relaxed"
                style={{
                  maxWidth: "44ch",
                  fontSize: "var(--text-body-lg)",
                  color: "#B8C9C2",
                }}
              >
                {lede}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link
                href={primaryCta.href}
                className="gh2-btn-lime pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(176,241,34,0.45)]"
              >
                {primaryCta.label}
                <span
                  aria-hidden
                  className="ml-1 inline-flex size-7 items-center justify-center rounded-full"
                  style={{ background: "rgba(10,31,20,0.16)" }}
                >
                  <ArrowUpRight className="size-4" strokeWidth={2} />
                </span>
              </Link>
              <Link
                href={secondaryCta.href}
                className="gh2-btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                {secondaryCta.label}
                <Users className="size-4" strokeWidth={1.75} aria-hidden />
              </Link>
            </div>

            {/* Feature cards */}
            {featureCards.length > 0 ? (
              <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {featureCards.map((card) => (
                  <li key={card.title} className="gh-glass-emerald rounded-2xl px-4 py-3.5">
                    <span
                      className="inline-flex size-9 items-center justify-center rounded-xl text-[var(--color-brand-accent)]"
                      style={{ background: "rgba(176,241,34,0.12)" }}
                    >
                      {card.icon}
                    </span>
                    <span className="mt-3 block text-[14.5px] font-bold leading-tight text-white">
                      {card.title}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-white/55">
                      {card.subtitle}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Curved off-white trust strip (optional) ──────────────────── */}
      {trustStats && trustStats.length > 0 ? (
        <div className="relative">
          {/* wave cap */}
          <svg
            aria-hidden
            className="block w-full"
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            style={{ height: "clamp(24px,3.5vw,52px)", display: "block" }}
          >
            <path
              d="M0,80 L0,40 C360,0 1080,0 1440,40 L1440,80 Z"
              fill="var(--color-background-soft)"
            />
          </svg>
          <div style={{ background: "var(--color-background-soft)" }}>
            <div className="mx-auto max-w-[var(--container-width)] px-5 pb-7 pt-1 md:px-10">
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0">
                {trustStats.map((stat, i) => (
                  <li
                    key={stat.title}
                    className={`flex items-start gap-3.5 sm:px-7 ${
                      i > 0 ? "sm:border-l sm:border-[rgba(29,75,54,0.14)]" : ""
                    }`}
                  >
                    <span
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(29,75,54,0.08)", color: "#1D4B36" }}
                    >
                      {stat.icon}
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block text-[15px] font-bold leading-tight"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {stat.title}
                      </span>
                      <span
                        className="mt-1 block text-[13px] leading-snug"
                        style={{ color: "var(--color-text-body)" }}
                      >
                        {stat.subtitle}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
