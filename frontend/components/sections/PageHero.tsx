import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Flag } from "@/components/ui/Flag";

export type PageHeroProps = {
  countryCode?: string;
  countryLabel?: string;
  titleLead: string;
  titleAccent: string;
  titleTrail?: string;
  lede?: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  rightSlot?: ReactNode;
  heroImage?: { src: string; alt: string; priority?: boolean };
  index?: string;
  watermark?: string;
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
  secondaryLabel,
  secondaryHref,
  rightSlot,
  heroImage,
  index = "01",
  watermark,
}: PageHeroProps) {
  const hasRightColumn = Boolean(rightSlot || heroImage);
  const watermarkText = watermark ?? titleAccent.replace(/[^\p{L}\p{N}\s-]/gu, "");

  return (
    <section
      className="gh2-hero gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden text-white"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        aria-hidden
        className="gh2-watermark pointer-events-none absolute -right-[0.06em] bottom-[-0.16em] z-0 select-none"
        style={{ fontSize: "clamp(5rem,14vw,13rem)" }}
      >
        {watermarkText}
      </div>

      <div
        className="relative z-[1] mx-auto max-w-[var(--container-width)] px-5 md:px-10"
        style={{
          paddingTop: "clamp(72px,9vw,128px)",
          paddingBottom: "clamp(48px,6vw,80px)",
        }}
      >
        <div className={hasRightColumn ? "grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16" : ""}>
          <div>
            {countryCode || countryLabel ? (
              <p className="flex flex-wrap items-center gap-3">
                <span aria-hidden className="gh2-index" style={{ color: "rgba(176,241,34,0.50)" }}>
                  {index}
                </span>
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
                fontSize: "clamp(2.4rem, 5vw, 4.2rem)",
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
                {ctaHref && ctaLabel ? (
                  <Link
                    href={ctaHref}
                    className="gh2-btn-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(176,241,34,0.45)]"
                  >
                    {ctaLabel}
                    <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
                  </Link>
                ) : null}
                {secondaryHref && secondaryLabel ? (
                  <Link
                    href={secondaryHref}
                    className="gh2-btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    {secondaryLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          {rightSlot || heroImage ? (
            <aside className="hidden lg:block">
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
    <div className="relative mx-auto max-w-[420px]">
      <div aria-hidden className="gh2-arch-frame" />
      <div className="gh2-arch gh2-zoom relative aspect-[4/4.8] overflow-hidden border border-white/10 bg-white/[0.045]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority={image.priority}
          sizes="(min-width: 1024px) 420px, 100vw"
          className="object-cover"
          unoptimized={/^https?:\/\//i.test(image.src) || image.src.startsWith("/api/media/")}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[rgba(15,46,37,0.58)] via-transparent to-transparent"
        />
      </div>
    </div>
  );
}
