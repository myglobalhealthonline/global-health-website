import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";
import { fitHeadingFontSize } from "@/lib/text/fit-heading-size";
import { isUnoptimizedImageSrc as isUnlistedRemote } from "@/lib/content/asset-media-url";
import {
  ArrowUpRight,
  Users,
  ShieldCheck,
  Star,
  CalendarDays,
  BadgeCheck,
  Video,
} from "lucide-react";
import { BookCta, type BookabilityActionProps } from "@/components/booking/BookNowButton";

/**
 * Premium doctors-page hero (clinical-editorial gh2 system).
 *
 * Two-column composition: editorial type + dual CTA + trust-card row on
 * the left; plus-shaped team portrait with overlapping glass info cards
 * on the right. Deep forest-night canvas, single lime accent, dotted-grid
 * atmosphere + medical-plus pattern. Purpose-built for /[country]/[lang]/
 * doctors — NOT the shared PageHero (which other service pages reuse).
 *
 * The marketing claims on the trust + floating cards (rating, review
 * count, "available today", etc.) are presentational defaults; only the
 * headline / lede / availability / primary CTA flow from i18n. Swap the
 * defaults for real figures before launch.
 */

type CtaLink = { label: string; href: string } & BookabilityActionProps;

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
  /** i18n strings for trust cards — falls back to English when absent. */
  trustCard1Title?: string;
  trustCard1Subtitle?: string;
  trustCard2Title?: string;
  trustCard2Subtitle?: string;
  trustCard3Title?: string;
  trustCard3Subtitle?: string;
  /** i18n strings for floating cards — falls back to English when absent. */
  floatCard1Title?: string;
  floatCard1Subtitle?: string;
  floatCard2Title?: string;
  floatCard2Subtitle?: string;
  floatCard3Title?: string;
  floatCard3Subtitle?: string;
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
  trustCard1Title,
  trustCard1Subtitle,
  trustCard2Title,
  trustCard2Subtitle,
  trustCard3Title,
  trustCard3Subtitle,
  floatCard1Title,
  floatCard1Subtitle,
  floatCard2Title,
  floatCard2Subtitle,
  floatCard3Title,
  floatCard3Subtitle,
}: DoctorsHeroProps) {
  const trustCards: InfoCard[] = [
    {
      icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: (trustCard1Title ?? "Licensed in {country}").replace("{country}", countryName),
      subtitle: trustCard1Subtitle ?? "Fully verified clinicians",
    },
    {
      icon: <Star className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: trustCard2Title ?? "4.9 patient rating",
      subtitle: trustCard2Subtitle ?? "From 2,000+ reviews",
    },
    {
      icon: <CalendarDays className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: trustCard3Title ?? "Same-day availability",
      subtitle: trustCard3Subtitle ?? "Appointments today",
    },
  ];

  const titleFontSize = fitHeadingFontSize(`${titleLead} ${titleAccent} ${titleTrail ?? ""}`, {
    minRem: 2,
    maxRem: 4.2,
    viewportTerm: "5vw",
    idealChars: 24,
  });

  return (
    <section className="gh2-hero gh-medical-pattern gh-medical-pattern-dark relative isolate !overflow-visible text-white gh-hero-cap">
      {/* Mobile/tablet only — full-bleed portrait behind a dark-green tint,
       *  replacing the plus mask (which is desktop-only, see aside below). */}
      <div aria-hidden className="gh-medical-pattern-layer absolute inset-0 overflow-hidden lg:hidden">
        <Image
          src={heroImage.src}
          alt=""
          fill
          priority={heroImage.priority}
          sizes="100vw"
          className="object-cover object-center"
          unoptimized={isUnlistedRemote(heroImage.src)}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,26,18,0.62) 0%, rgba(6,26,18,0.78) 55%, rgba(6,26,18,0.94) 100%)," +
              "linear-gradient(90deg, rgba(6,26,18,0.88) 0%, rgba(6,26,18,0.55) 55%, rgba(6,26,18,0.35) 100%)",
          }}
        />
      </div>

      {/* ── Atmosphere layers (behind content via .gh-medical-pattern-layer).
           Both hidden below lg — masked dot-grid + giant outlined watermark
           are pure ambience with real paint cost, not needed on phones. ── */}
      <div
        aria-hidden
        className="gh-medical-pattern-layer gh-dot-grid inset-0 hidden lg:block"
        style={{
          opacity: 0.5,
          maskImage:
            "radial-gradient(680px 520px at 18% 30%, #000 0%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(680px 520px at 18% 30%, #000 0%, transparent 72%)",
        }}
      />
      {/* Watermark bleeds off the section edge on purpose, so it gets its
           own clip container — the section itself must stay overflow-visible
           so long titles/copy (long translations) push it taller instead of
           getting silently clipped. */}
      <div aria-hidden className="gh-medical-pattern-layer pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
        <div
          className="gh2-watermark absolute -right-[0.06em] bottom-[-0.16em] select-none"
          style={{
            fontSize: "clamp(5rem,15vw,14rem)",
            WebkitTextStroke: "1.5px rgba(255,255,255,0.08)",
          }}
        >
          Doctors
        </div>
      </div>
      {/* Lime bloom behind the portrait */}
      <div
        aria-hidden
        className="gh-medical-pattern-layer pointer-events-none right-[-6%] top-[6%] hidden lg:block"
        style={{
          width: 560,
          height: 560,
          // ponytail: no filter: blur(). The gradient already fades to
          // transparent at 62% of the radius, so there is no hard edge to
          // soften and the interior is a ~170px ramp — an 8px blur on that is
          // a no-op that cost a 313k px² filter raster and its own layer.
          background:
            "radial-gradient(circle, rgba(176,241,34,0.16), transparent 62%)",
        }}
      />

      <div
        className="relative z-[1] mx-auto flex max-w-[var(--container-width)] flex-col justify-center px-5 md:px-10 max-lg:!min-h-[min(calc(100svh-var(--header-height)),760px)]"
        style={{
          minHeight: "calc(100svh - var(--header-height))",
          paddingTop: "clamp(20px,3.5vw,40px)",
          paddingBottom: "clamp(20px,3.5vw,40px)",
        }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
          {/* ── LEFT — type, CTAs, trust cards ───────────────────────── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
              {eyebrow}
            </p>

            <h1
              className="font-extrabold tracking-[-0.035em]"
              style={{
                marginTop: 18,
                maxWidth: "15ch",
                lineHeight: 1,
                fontSize: titleFontSize,
                color: "rgba(255,255,255,0.95)",
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
              <BookCta
                href={primaryCta.href}
                className="gh2-btn-lime gh-focus-on-dark "
                bookability={primaryCta.bookability}
                unavailableLabel={primaryCta.unavailableLabel}
                returningLabel={primaryCta.returningLabel}
                nextAvailableLabel={primaryCta.nextAvailableLabel}
              >
                {primaryCta.label}
                <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden />
              </BookCta>
              <Link
                href={secondaryCta.href}
                className="gh2-btn-ghost gh-focus-on-dark "
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

          {/* ── RIGHT — plus-shaped portrait + floating info cards ───── */}
          <aside className="relative hidden lg:block">
            <div className="relative mx-auto aspect-square w-full max-w-[620px]">
              <HeroPlusImage src={heroImage.src} alt={heroImage.alt} />

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
                title={floatCard1Title ?? "Available today"}
                subtitle={floatCard1Subtitle ?? "Most appointments in 24 hours"}
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
                title={floatCard2Title ?? "Verified clinicians"}
                subtitle={floatCard2Subtitle ?? "Identity & license verification"}
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
                title={floatCard3Title ?? "Online consultation"}
                subtitle={floatCard3Subtitle ?? "Private, secure & convenient"}
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
