/**
 * Booking CTA — dark luxury version.
 * Full variant:    forest-night card, lime glow accent, centered.
 * Compact variant: dark glass card, inline layout.
 * Minimal variant: compact card, reduced padding, no proof pills.
 *
 * No side-stripe borders. Depth via tinted shadows and glass bg.
 */

import { Check, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";

type BookingCTAProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  asideImage?: { src: string; alt: string };
  variant?: "full" | "compact" | "inline" | "service" | "doctor" | "pricing" | "support";
  eyebrow?: string;
  points?: string[];
  showProofPoints?: boolean;
  density?: "full" | "compact" | "minimal";
};

export function BookingCTA({
  title,
  description,
  ctaLabel,
  ctaHref,
  asideImage,
  variant = "full",
  eyebrow,
  points,
  showProofPoints,
  density,
}: BookingCTAProps) {
  const proofPoints =
    points ??
    (variant === "service"
      ? ["Clinician review", "Eligibility checked", "Follow-up guidance"]
      : variant === "doctor"
        ? ["Credential-led", "Specialty fit", "Clear booking route"]
        : variant === "pricing"
          ? ["Compare options", "See inclusions", "Book when ready"]
          : variant === "support"
            ? ["Privacy-aware", "Clear response path", "Booking support"]
            : ["Online appointment", "Private intake", "Clear next steps"]);

  const renderProofPoints = showProofPoints ?? (density !== "minimal");

  const asideUnoptimized = asideImage
    ? /^https?:\/\//i.test(asideImage.src) || asideImage.src.startsWith("/api/media/")
    : false;

  const effectiveDensity = density ?? (variant === "full" ? "full" : "compact");
  const isCompact = effectiveDensity !== "full";
  const isMinimal = effectiveDensity === "minimal";

  const eyebrowLabel =
    eyebrow ??
    (variant === "pricing"
      ? "Pricing decision"
      : variant === "doctor"
        ? "Clinician booking"
        : variant === "service"
          ? "Service fit"
          : "Booking support");

  /* ── Compact / Minimal variant ── */
  if (isCompact) {
    return (
      <section
        style={{
          background: "var(--color-background-dark)",
          padding: isMinimal ? "clamp(24px,3vw,40px) 0" : "clamp(48px,6vw,80px) 0",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Container>
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: "var(--radius-card)",
              border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.03)",
              padding: isMinimal ? "clamp(20px,2.5vw,28px)" : "clamp(28px,3.5vw,48px)",
            }}
          >
            {/* Lime top hairline */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(176,241,34,0.25) 50%, transparent 100%)",
              }}
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <span
                  className="inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{
                    background: "rgba(176,241,34,0.10)",
                    border: "1px solid rgba(176,241,34,0.18)",
                    color: "var(--color-brand-accent)",
                  }}
                >
                  {eyebrowLabel}
                </span>
                <h2
                  className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
                  style={{
                    fontSize: "clamp(1.5rem,3vw,2.25rem)",
                    color: "rgba(255,255,255,0.95)",
                  }}
                >
                  {title}
                </h2>
                <p
                  className="mt-3 leading-relaxed"
                  style={{
                    fontSize: "var(--text-body-lg)",
                    color: "rgba(255,255,255,0.55)",
                    maxWidth: "52ch",
                  }}
                >
                  {description}
                </p>

                {renderProofPoints ? (
                  <ul className="mt-4 flex flex-wrap items-center gap-2">
                    {proofPoints.map((point) => (
                      <li
                        key={point}
                        className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.09)",
                          color: "rgba(255,255,255,0.65)",
                        }}
                      >
                        <Check
                          className="size-3.5 shrink-0"
                          style={{ color: "var(--color-brand-accent)" }}
                          aria-hidden
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className={isMinimal ? "mt-4" : "mt-6"}>
                  <Link
                    href={ctaHref}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13.5px] font-bold transition-[background-color,transform] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]/40 motion-reduce:transition-none"
                    style={{
                      background: "var(--color-brand-accent)",
                      color: "#0a1f14",
                    }}
                  >
                    {ctaLabel}
                    <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden />
                  </Link>
                </div>
              </div>

              {asideImage ? (
                <div
                  className="relative mx-auto w-full max-w-[280px] shrink-0 overflow-hidden sm:mx-0"
                  style={{
                    borderRadius: "var(--radius-card)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <Image
                    src={asideImage.src}
                    alt={asideImage.alt}
                    width={560}
                    height={420}
                    unoptimized={asideUnoptimized}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </Container>
      </section>
    );
  }

  /* ── Full variant ── */
  return (
    <section
      style={{
        background: "var(--color-background-dark)",
        padding: "clamp(64px,8vw,112px) 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Container>
        <div
          className="relative overflow-hidden text-center"
          style={{
            borderRadius: "var(--radius-card)",
            border: "1px solid rgba(255,255,255,0.09)",
            background: "rgba(255,255,255,0.03)",
            padding: "clamp(40px,5vw,72px)",
          }}
        >
          {/* Lime atmospheric glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 700px 400px at 50% -20%, rgba(176,241,34,0.08), transparent 60%)",
            }}
          />

          <div className="relative flex flex-col items-center gap-8">
            <div className="max-w-2xl">
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{
                  background: "rgba(176,241,34,0.10)",
                  border: "1px solid rgba(176,241,34,0.18)",
                  color: "var(--color-brand-accent)",
                }}
              >
                {eyebrowLabel}
              </span>

              <h2
                className="mt-5 font-extrabold tracking-[-0.035em] leading-[1.02]"
                style={{
                  fontSize: "clamp(2rem,4vw,3.25rem)",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                {title}
              </h2>
              <p
                className="mt-4 mx-auto leading-relaxed"
                style={{
                  fontSize: "var(--text-body-lg)",
                  color: "rgba(255,255,255,0.55)",
                  maxWidth: "48ch",
                }}
              >
                {description}
              </p>

              {renderProofPoints ? (
                <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {proofPoints.map((point) => (
                    <li
                      key={point}
                      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium"
                      style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        color: "rgba(255,255,255,0.72)",
                      }}
                    >
                      <Check
                        className="size-3.5 shrink-0"
                        style={{ color: "var(--color-brand-accent)" }}
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-8">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-[15px] font-bold transition-[background-color,transform] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]/40 motion-reduce:transition-none"
                  style={{
                    background: "var(--color-brand-accent)",
                    color: "#0a1f14",
                  }}
                >
                  {ctaLabel}
                  <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden />
                </Link>
              </div>
            </div>

            {asideImage ? (
              <div
                className="relative mx-auto w-full max-w-[320px] shrink-0 overflow-hidden"
                style={{
                  borderRadius: "var(--radius-card)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <Image
                  src={asideImage.src}
                  alt={asideImage.alt}
                  width={560}
                  height={420}
                  unoptimized={asideUnoptimized}
                  className="h-auto w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
