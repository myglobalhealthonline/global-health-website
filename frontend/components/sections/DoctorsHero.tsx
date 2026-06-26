import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import {
  ArrowUpRight,
  Users,
  ShieldCheck,
  Star,
  CalendarDays,
  BadgeCheck,
  Video,
} from "lucide-react";

/** Editorial display serif for the hero headline only — the warm,
 *  high-contrast face the reference design uses. Body/UI stay on the
 *  brand sans; this is scoped to the H1. */
const headlineSerif = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

/**
 * Premium doctors-page hero (clinical-editorial gh2 system).
 *
 * Two-column composition: editorial type + dual CTA + trust-card row on
 * the left; arch-framed team portrait with overlapping glass info cards
 * on the right. Deep forest-night canvas, single lime accent, dotted-grid
 * atmosphere + medical-plus pattern. Purpose-built for /[country]/[lang]/
 * doctors — NOT the shared PageHero (which other service pages reuse).
 *
 * The marketing claims on the trust + floating cards (rating, review
 * count, "available today", etc.) are presentational defaults; only the
 * headline / lede / availability / primary CTA flow from i18n. Swap the
 * defaults for real figures before launch.
 */

type CtaLink = { label: string; href: string };

type InfoCard = {
  icon: ReactNode;
  title: string;
  subtitle: string;
};

export type DoctorsHeroProps = {
  /** Active country display name — interpolated into the first trust card. */
  countryName: string;
  /** Eyebrow above the headline, e.g. "Ireland · The team". Rendered uppercase. */
  eyebrow: string;
  /** Three-part headline; the accent word carries the lime glow. */
  titleLead: string;
  titleAccent: string;
  titleTrail?: string;
  lede: ReactNode;
  /** Live count of available clinicians + its (already pluralised) label. */
  availableCount: number;
  availableLabel: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  heroImage: { src: string; alt: string; priority?: boolean };
};

const ICON_TILE =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-brand-accent)]";

/** Lift the "online care" phrase out of the muted body into brighter,
 *  slightly heavier text — the subtle emphasis the reference shows.
 *  No-op when the phrase is absent (other locales) or lede isn't a string. */
function emphasizeOnlineCare(node: ReactNode): ReactNode {
  if (typeof node !== "string") return node;
  const phrase = "online care";
  const idx = node.toLowerCase().indexOf(phrase);
  if (idx === -1) return node;
  return (
    <>
      {node.slice(0, idx)}
      <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 600 }}>
        {node.slice(idx, idx + phrase.length)}
      </span>
      {node.slice(idx + phrase.length)}
    </>
  );
}

export function DoctorsHero({
  countryName,
  eyebrow,
  titleLead,
  titleAccent,
  titleTrail,
  lede,
  availableCount,
  availableLabel,
  primaryCta,
  secondaryCta,
  heroImage,
}: DoctorsHeroProps) {
  const trustCards: InfoCard[] = [
    {
      icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: `Licensed in ${countryName}`,
      subtitle: "Fully verified clinicians",
    },
    {
      icon: <Star className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: "4.9 patient rating",
      subtitle: "From 2,000+ reviews",
    },
    {
      icon: <CalendarDays className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: "Same-day availability",
      subtitle: "Appointments today",
    },
  ];

  return (
    <section
      className="gh2-hero gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden text-white"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* ── Atmosphere layers (behind content via .gh-medical-pattern-layer) ── */}
      <div
        aria-hidden
        className="gh-medical-pattern-layer gh-dot-grid inset-0"
        style={{
          opacity: 0.5,
          maskImage:
            "radial-gradient(680px 520px at 18% 30%, #000 0%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(680px 520px at 18% 30%, #000 0%, transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="gh2-watermark gh-medical-pattern-layer pointer-events-none left-[-0.04em] top-[0.04em] z-0 select-none"
        style={{
          fontSize: "clamp(5rem,15vw,14rem)",
          WebkitTextStroke: "1.5px rgba(255,255,255,0.08)",
        }}
      >
        Doctors
      </div>
      {/* Lime bloom behind the portrait */}
      <div
        aria-hidden
        className="gh-medical-pattern-layer pointer-events-none right-[-6%] top-[6%] hidden lg:block"
        style={{
          width: 560,
          height: 560,
          background:
            "radial-gradient(circle, rgba(176,241,34,0.16), transparent 62%)",
          filter: "blur(8px)",
        }}
      />

      <div
        className="relative z-[1] mx-auto flex max-w-[var(--container-width)] flex-col justify-center px-5 md:px-10"
        style={{
          minHeight: "calc(100svh - var(--header-height))",
          paddingTop: "clamp(20px,3.5vw,40px)",
          paddingBottom: "clamp(20px,3.5vw,40px)",
        }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* ── LEFT — type, CTAs, trust cards ───────────────────────── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
              {eyebrow}
            </p>

            <h1
              className={`${headlineSerif.className} tracking-[-0.01em]`}
              style={{
                marginTop: 18,
                maxWidth: "15ch",
                lineHeight: 1.02,
                fontWeight: 700,
                fontSize: "clamp(2.6rem, 5.4vw, 4.6rem)",
                color: "rgba(255,255,255,0.97)",
              }}
            >
              {titleLead}{" "}
              <span className="gh-accent-glow">{titleAccent}</span>
              {titleTrail ? <span>{` ${titleTrail}`}</span> : null}
            </h1>

            {lede ? (
              <p
                className="leading-relaxed"
                style={{
                  marginTop: 18,
                  maxWidth: "46ch",
                  fontSize: "var(--text-body-lg)",
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                {emphasizeOnlineCare(lede)}
              </p>
            ) : null}

            {/* Live availability line */}
            <div
              className="mt-5 inline-flex items-center gap-2.5 rounded-full py-1.5 pl-2.5 pr-4"
              style={{
                background: "rgba(176,241,34,0.08)",
                border: "1px solid rgba(176,241,34,0.20)",
              }}
            >
              <span className="gh2-live-dot" aria-hidden />
              <span className="text-[13px] font-semibold text-white/80">
                {availableCount} {availableLabel}
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={primaryCta.href}
                className="gh2-btn-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(176,241,34,0.45)]"
              >
                {primaryCta.label}
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <Link
                href={secondaryCta.href}
                className="gh2-btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                {secondaryCta.label}
                <Users className="size-4" strokeWidth={1.75} aria-hidden />
              </Link>
            </div>

            {/* Trust cards */}
            <ul className="mt-7 grid max-w-[620px] grid-cols-1 gap-3 sm:grid-cols-3">
              {trustCards.map((c) => (
                <li
                  key={c.title}
                  className="gh-glass-emerald flex items-center gap-3 rounded-2xl px-3.5 py-3"
                >
                  <span
                    className={ICON_TILE}
                    style={{ background: "rgba(176,241,34,0.12)" }}
                  >
                    {c.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold leading-tight text-white">
                      {c.title}
                    </span>
                    <span className="block text-[11.5px] leading-tight text-white/55">
                      {c.subtitle}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── RIGHT — arch portrait + floating info cards ──────────── */}
          <aside className="relative hidden lg:block">
            <div className="relative mx-auto max-w-[440px]">
              <div aria-hidden className="gh2-arch-frame" />
              <div className="gh2-arch gh2-zoom relative aspect-[4/4.7] overflow-hidden border border-white/10 bg-white/[0.045]">
                <Image
                  src={heroImage.src}
                  alt={heroImage.alt}
                  fill
                  priority={heroImage.priority}
                  sizes="(min-width: 1024px) 440px, 100vw"
                  className="object-cover object-center"
                  unoptimized={
                    /^https?:\/\//i.test(heroImage.src) ||
                    heroImage.src.startsWith("/api/media/")
                  }
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-[rgba(8,42,32,0.62)] via-transparent to-transparent"
                />
              </div>

              {/* Floating card — Available today (upper-right) */}
              <FloatingCard
                className="-right-6 top-[12%] gh-floaty"
                style={{ animationDelay: "0s" }}
                icon={
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-brand-accent)] opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-[var(--color-brand-accent)]" />
                  </span>
                }
                title="Available today"
                subtitle="Most appointments in 24 hours"
              />

              {/* Floating card — Verified clinicians (lower-right) */}
              <FloatingCard
                className="-right-4 top-[58%] gh-floaty"
                style={{ animationDelay: "1.4s" }}
                icon={
                  <span
                    className="inline-flex size-7 items-center justify-center rounded-lg text-[var(--color-brand-accent)]"
                    style={{ background: "rgba(176,241,34,0.12)" }}
                  >
                    <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />
                  </span>
                }
                title="Verified clinicians"
                subtitle="Identity & license verification"
              />

              {/* Floating card — Online consultation (bottom-left overlap) */}
              <FloatingCard
                className="-left-8 bottom-[5%] gh-floaty"
                style={{ animationDelay: "0.7s" }}
                icon={
                  <span
                    className="inline-flex size-7 items-center justify-center rounded-lg text-[var(--color-brand-accent)]"
                    style={{ background: "rgba(176,241,34,0.12)" }}
                  >
                    <Video className="size-4" strokeWidth={2} aria-hidden />
                  </span>
                }
                title="Online consultation"
                subtitle="Private, secure & convenient"
              />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function FloatingCard({
  icon,
  title,
  subtitle,
  className,
  style,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`gh-glass-emerald absolute z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-3 ${className ?? ""}`}
      style={{ maxWidth: 232, ...style }}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold leading-tight text-white">
          {title}
        </span>
        <span className="block text-[11.5px] leading-tight text-white/55">
          {subtitle}
        </span>
      </span>
    </div>
  );
}
