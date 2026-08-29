import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Flag } from "@/components/ui/Flag";
import { HeroPlusImage } from "@/components/sections/HeroPlusImage";
import { fitHeadingFontSize } from "@/lib/text/fit-heading-size";
import { isUnoptimizedImageSrc as isUnlistedRemote } from "@/lib/content/asset-media-url";
import { BookCta } from "@/components/booking/BookNowButton";
import type { BookabilitySummary } from "@/lib/content/get-country-collections";

export type PageHeroProps = {
  countryCode?: string;
  countryLabel?: string;
  titleLead: string;
  titleAccent: string;
  titleTrail?: string;
  lede?: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  bookability?: BookabilitySummary;
  unavailableLabel?: string;
  returningLabel?: string;
  nextAvailableLabel?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  rightSlot?: ReactNode;
  heroImage?: { src: string; alt: string; priority?: boolean };
  /** Mobile/tablet-only full-bleed background photo (behind a dark-green
   *  tint), shown instead of the desktop plus-mask. Falls back to
   *  `heroImage.src` when omitted — set explicitly when the right column
   *  is a custom `rightSlot` panel (its own image src isn't visible here). */
  mobileBgSrc?: string;
  index?: string;
  watermark?: string;
  /** Optional icon trailing the secondary CTA label (immersive variant). */
  secondaryIcon?: ReactNode;
  /** Compact trust/feature cards rendered under the CTAs (immersive
   *  variant only). Pass 2–3 for the lab-tests-style hero. */
  trustCards?: Array<{ icon: ReactNode; title: string; subtitle: string }>;
  /** "immersive": full-viewport 50/50 — image fills left column, content right. */
  variant?: "default" | "immersive";
};

export function PageHero({
  countryCode,
  countryLabel,
  titleLead,
  titleAccent,
  titleTrail,
  lede,
  ctaLabel,
  ctaHref,
  bookability,
  unavailableLabel,
  returningLabel,
  nextAvailableLabel,
  secondaryLabel,
  secondaryHref,
  rightSlot,
  heroImage,
  mobileBgSrc,
  watermark,
  secondaryIcon,
  trustCards,
  variant = "default",
}: PageHeroProps) {
  const titleFontSizeImmersive = fitHeadingFontSize(`${titleLead} ${titleAccent} ${titleTrail ?? ""}`, {
    minRem: 2.25,
    maxRem: 4.75,
    viewportTerm: "3vw + 2rem",
    idealChars: 20,
  });
  const titleFontSizeDefault = fitHeadingFontSize(`${titleLead} ${titleAccent} ${titleTrail ?? ""}`, {
    minRem: 2,
    maxRem: 4.2,
    viewportTerm: "5vw",
    idealChars: 22,
  });

  if (variant === "immersive") {
    return (
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate !overflow-visible gh-hero-cap"
        style={{ background: "#0F2E25" }}
      >
        <div
          className="grid lg:grid-cols-2 max-lg:!min-h-[min(calc(100svh-var(--header-height)),760px)]"
          style={{ minHeight: "min(calc(100svh - var(--header-height)), 940px)" }}
        >

          {/* LEFT — full-bleed image */}
          <div
            className="relative overflow-hidden"
            style={{ minHeight: "clamp(260px, 45vw, 880px)" }}
          >
            {heroImage ? (
              <Image
                src={heroImage.src}
                alt={heroImage.alt}
                fill
                priority={heroImage.priority}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-center"
                unoptimized={isUnlistedRemote(heroImage.src)}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, #0d2a1f 0%, #1a3d2b 100%)" }}
              />
            )}
            {/* Bottom fade */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{
                height: "55%",
                background:
                  "linear-gradient(to top, rgba(6,26,18,0.90) 0%, rgba(6,26,18,0.40) 45%, transparent 100%)",
              }}
            />
            {/* Right-edge bleed into content column — desktop only */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block"
              style={{
                width: "38%",
                background:
                  "linear-gradient(to right, rgba(15,46,37,0) 0%, rgba(15,46,37,0.75) 70%, #0F2E25 100%)",
              }}
            />
          </div>

          {/* RIGHT — content + layered premium background. No overflow-hidden:
               long titles/copy (long translations) must push this taller and
               scroll, never get clipped — the "+" watermark glyphs below bleed
               only ~2%, a non-issue left unclipped. */}
          <div
            className="relative isolate flex flex-col justify-center px-8 py-12 md:px-12 lg:px-16 lg:py-20"
            style={{ background: "#0F2E25" }}
          >
            {/* 1 — dark-to-green gradient depth (base) + edge vignette */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(circle at 90% 12%, rgba(22,89,64,0.34), transparent 40%)," +
                  "radial-gradient(circle at 14% 88%, rgba(3,26,20,0.55), transparent 46%)," +
                  "linear-gradient(135deg, #0a2a20 0%, #0F2E25 46%, #06201a 100%)",
              }}
            />
            {/* 2 — technical grid (thin lime lines). Hidden below lg: masked
                 background layers are the heaviest atmosphere here and add
                 nothing readable at phone widths. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
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
            {/* 3 — faint dotted texture on top of the grid. Desktop-only,
                 same reasoning as layer 2. */}
            <div
              aria-hidden
              className="gh-dot-grid pointer-events-none absolute inset-0 z-0 hidden lg:block"
              style={{
                opacity: 0.6,
                maskImage:
                  "radial-gradient(680px 520px at 88% 10%, #000 0%, transparent 72%)",
                WebkitMaskImage:
                  "radial-gradient(680px 520px at 88% 10%, #000 0%, transparent 72%)",
              }}
            />
            {/* 4 — soft radial glow behind headline + buttons (ambient depth) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(circle at 38% 40%, rgba(176,241,34,0.10), transparent 30%)," +
                  "radial-gradient(circle at 72% 72%, rgba(18,120,76,0.24), transparent 38%)," +
                  "radial-gradient(ellipse 620px 520px at 112% -8%, rgba(176,241,34,0.12), transparent 62%)",
              }}
            />
            {/* 5 — large faint medical plus symbols. Desktop-only watermark
                 glyphs; at phone widths they're either clipped or crowd the
                 headline for no readable benefit. */}
            <span
              aria-hidden
              className="pointer-events-none absolute z-0 hidden select-none font-bold leading-none lg:block"
              style={{
                top: "-2%",
                right: "6%",
                fontSize: "180px",
                color: "rgba(176,241,34,0.06)",
              }}
            >
              +
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute z-0 hidden select-none font-bold leading-none lg:block"
              style={{
                top: "34%",
                right: "30%",
                fontSize: "110px",
                color: "rgba(176,241,34,0.045)",
              }}
            >
              +
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute z-0 hidden select-none font-bold leading-none lg:block"
              style={{
                bottom: "8%",
                right: "12%",
                fontSize: "72px",
                color: "rgba(176,241,34,0.05)",
              }}
            >
              +
            </span>
            <div className="relative z-10" style={{ maxWidth: 620 }}>
              {countryCode || countryLabel ? (
                <div className="mb-7 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{
                      background: "rgba(7,38,30,0.75)",
                      border: "1px solid rgba(176,241,34,0.22)",
                      color: "rgba(255,255,255,0.78)",
                    }}
                  >
                    {countryCode ? <Flag code={countryCode} size="sm" /> : null}
                    {countryLabel}
                  </span>
                </div>
              ) : null}

              <h1
                className="font-extrabold leading-[0.98] tracking-[-0.035em]"
                style={{
                  fontSize: titleFontSizeImmersive,
                  color: "rgba(255,255,255,0.96)",
                  maxWidth: "13ch",
                }}
              >
                {titleLead}{" "}
                <span style={{ color: "var(--color-brand-accent)" }}>{titleAccent}</span>
                {titleTrail ? <span>{` ${titleTrail}`}</span> : null}
              </h1>

              {lede ? (
                <p
                  className="mt-6 leading-relaxed"
                  style={{
                    maxWidth: "44ch",
                    fontSize: "var(--text-body-lg)",
                    color: "rgba(255,255,255,0.58)",
                  }}
                >
                  {lede}
                </p>
              ) : null}

              {(ctaHref && ctaLabel) || (secondaryHref && secondaryLabel) ? (
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {ctaHref && ctaLabel && (bookability || /\/book(?:[/?#]|$)/.test(ctaHref)) ? (
                    <BookCta
                      href={ctaHref}
                      className="gh2-btn-lime pr-2 gh-focus-on-dark "
                      bookability={bookability}
                      unavailableLabel={unavailableLabel}
                      returningLabel={returningLabel}
                      nextAvailableLabel={nextAvailableLabel}
                    >
                      {ctaLabel}
                      <span
                        aria-hidden
                        className="ml-1 inline-flex size-7 items-center justify-center rounded-full"
                        style={{ background: "rgba(10,31,20,0.16)" }}
                      >
                        <ArrowUpRight className="size-4" strokeWidth={2} />
                      </span>
                    </BookCta>
                  ) : ctaHref && ctaLabel ? (
                    <Link href={ctaHref} className="gh2-btn-lime pr-2 gh-focus-on-dark ">
                      {ctaLabel}
                      <span
                        aria-hidden
                        className="ml-1 inline-flex size-7 items-center justify-center rounded-full"
                        style={{ background: "rgba(10,31,20,0.16)" }}
                      >
                        <ArrowUpRight className="size-4" strokeWidth={2} />
                      </span>
                    </Link>
                  ) : null}
                  {secondaryHref && secondaryLabel ? (
                    <Link
                      href={secondaryHref}
                      className="gh2-btn-ghost gh-focus-on-dark "
                    >
                      {secondaryLabel}
                      {secondaryIcon}
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {trustCards && trustCards.length > 0 ? (
                <ul className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {trustCards.map((card) => (
                    <li
                      key={card.title}
                      className="gh-glass-emerald rounded-xl px-3.5 py-3"
                    >
                      <span
                        className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--color-brand-accent)]"
                        style={{ background: "rgba(176,241,34,0.12)" }}
                      >
                        {card.icon}
                      </span>
                      <span className="mt-2 block text-[13px] font-bold leading-tight text-white">
                        {card.title}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-white/55">
                        {card.subtitle}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

        </div>
      </section>
    );
  }

  // Default variant — compact hero with plus-shaped image in right slot
  const hasRightColumn = Boolean(rightSlot || heroImage);
  const watermarkText = watermark ?? countryLabel ?? "";
  const bgSrc = mobileBgSrc ?? heroImage?.src;

  return (
    <section className="gh2-hero gh-medical-pattern gh-medical-pattern-dark relative isolate !overflow-visible text-white gh-hero-cap">
      {/* Mobile/tablet only — full-bleed portrait behind a dark-green tint,
       *  replacing the plus mask (which is desktop-only, see aside below). */}
      {bgSrc ? (
        <div aria-hidden className="gh-medical-pattern-layer absolute inset-0 overflow-hidden lg:hidden">
          <Image
            src={bgSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
            unoptimized={isUnlistedRemote(bgSrc)}
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
      ) : null}

      {/* Hidden below lg — huge outlined text over the mobile bg photo adds
           visual noise without a legibility/brand payoff at phone widths.
           Bleeds off the section edge on purpose, so it needs its own clip —
           the section itself must stay overflow-visible so long titles/copy
           (long translations) push it taller instead of getting clipped. */}
      <div aria-hidden className="gh-medical-pattern-layer pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
        <div
          className="gh2-watermark absolute -right-[0.06em] bottom-[-0.16em] select-none"
          // Length-aware vw term: the watermark is nowrap and right-anchored,
          // so a long translated string at the fixed 14vw size would push its
          // start past the left clip edge and read as a half-cut word. ~0.62em
          // per glyph → keep the string within ~100vw.
          style={{
            fontSize: `clamp(4rem, ${Math.min(14, Math.round(150 / Math.max(watermarkText.length, 1)))}vw, 13rem)`,
          }}
        >
          {watermarkText}
        </div>
      </div>

      <div
        className="relative z-[1] mx-auto flex max-w-[var(--container-width)] flex-col justify-center px-5 md:px-10 max-lg:!min-h-[min(calc(100svh-var(--header-height)),760px)]"
        style={{
          minHeight: "calc(100svh - var(--header-height))",
          paddingTop: "clamp(20px,3.5vw,40px)",
          paddingBottom: "clamp(20px,3.5vw,40px)",
        }}
      >
        <div className={hasRightColumn ? "grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14" : ""}>
          <div>
            {countryCode || countryLabel ? (
              <p className="flex flex-wrap items-center gap-3">
                {countryCode ? <Flag code={countryCode} size="sm" /> : null}
                {countryLabel ? (
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                    {countryLabel}
                  </span>
                ) : null}
              </p>
            ) : null}

            <h1
              className="font-extrabold tracking-[-0.035em]"
              style={{
                marginTop: countryCode || countryLabel ? 22 : 0,
                maxWidth: hasRightColumn ? "16ch" : "18ch",
                lineHeight: 1,
                fontSize: titleFontSizeDefault,
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {titleLead}{" "}
              <span style={{ color: "var(--color-brand-accent)" }}>{titleAccent}</span>
              {titleTrail ? <span>{` ${titleTrail}`}</span> : null}
            </h1>

            {lede ? (
              <p
                className="leading-relaxed"
                style={{
                  marginTop: 28,
                  maxWidth: "44ch",
                  fontSize: "var(--text-body-lg)",
                  color: "rgba(255,255,255,0.58)",
                }}
              >
                {lede}
              </p>
            ) : null}

            {(ctaHref && ctaLabel) || (secondaryHref && secondaryLabel) ? (
              <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 40 }}>
                {ctaHref && ctaLabel && (bookability || /\/book(?:[/?#]|$)/.test(ctaHref)) ? (
                  <BookCta
                    href={ctaHref}
                    className="gh2-btn-lime gh-focus-on-dark "
                    bookability={bookability}
                    unavailableLabel={unavailableLabel}
                    returningLabel={returningLabel}
                    nextAvailableLabel={nextAvailableLabel}
                  >
                    {ctaLabel}
                    <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
                  </BookCta>
                ) : ctaHref && ctaLabel ? (
                  <Link href={ctaHref} className="gh2-btn-lime gh-focus-on-dark ">
                    {ctaLabel}
                    <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
                  </Link>
                ) : null}
                {secondaryHref && secondaryLabel ? (
                  <Link
                    href={secondaryHref}
                    className="gh2-btn-ghost gh-focus-on-dark "
                  >
                    {secondaryLabel}
                    {secondaryIcon}
                  </Link>
                ) : null}
              </div>
            ) : null}

            {trustCards && trustCards.length > 0 ? (
              <ul className="mt-7 grid max-w-[620px] grid-cols-1 gap-3 sm:grid-cols-3">
                {trustCards.map((card) => (
                  <li
                    key={card.title}
                    className="gh-glass-emerald flex items-center gap-3 rounded-2xl px-3.5 py-3"
                  >
                    <span
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-brand-accent)]"
                      style={{ background: "rgba(176,241,34,0.12)" }}
                    >
                      {card.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold leading-tight text-white">
                        {card.title}
                      </span>
                      <span className="block overflow-hidden text-[11.5px] leading-tight text-white/55" style={{ wordBreak: "break-word" }}>
                        {card.subtitle}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {rightSlot || heroImage ? (
            <aside className="relative hidden lg:block">
              {rightSlot ?? (heroImage ? <HeroImagePanel image={heroImage} /> : null)}
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeroImagePanel({ image }: { image: { src: string; alt: string; priority?: boolean } }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <HeroPlusImage src={image.src} alt={image.alt} />
    </div>
  );
}
