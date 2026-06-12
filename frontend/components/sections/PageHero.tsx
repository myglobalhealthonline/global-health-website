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
  secondaryLabel,
  secondaryHref,
  rightSlot,
  heroImage,
  index = "01",
  watermark,
  variant = "default",
}: PageHeroProps) {
  if (variant === "immersive") {
    return (
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
        style={{ background: "#0F2E25" }}
      >
        <div className="grid lg:grid-cols-2" style={{ minHeight: "min(100vh, 880px)" }}>

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
                unoptimized={
                  /^https?:\/\//i.test(heroImage.src) ||
                  heroImage.src.startsWith("/api/media/")
                }
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

          {/* RIGHT — content */}
          <div
            className="relative flex flex-col justify-center px-8 py-12 md:px-12 lg:px-16 lg:py-20"
            style={{ background: "#0F2E25" }}
          >
            {/* Lime radial glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 600px 500px at 110% -10%, rgba(176,241,34,0.11), transparent 60%)",
              }}
            />

            <div className="relative">
              {countryCode || countryLabel ? (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.65)",
                    }}
                  >
                    {countryCode ? <Flag code={countryCode} size="sm" /> : null}
                    {countryLabel}
                  </span>
                </div>
              ) : null}

              <h1
                className="font-extrabold leading-[1.0] tracking-[-0.035em]"
                style={{
                  fontSize: "clamp(2.4rem, 3.5vw + 0.5rem, 4rem)",
                  color: "rgba(255,255,255,0.95)",
                  maxWidth: "16ch",
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
                    color: "rgba(255,255,255,0.58)",
                  }}
                >
                  {lede}
                </p>
              ) : null}

              {(ctaHref && ctaLabel) || (secondaryHref && secondaryLabel) ? (
                <div className="mt-10 flex flex-wrap items-center gap-3">
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
          </div>

        </div>
      </section>
    );
  }

  // Default variant — compact hero with arch-framed image in right slot
  const hasRightColumn = Boolean(rightSlot || heroImage);
  const watermarkText = watermark ?? countryLabel ?? "";

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
