import { Check, ArrowRight, Sparkles } from "lucide-react";
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
  /**
   * Whether to render the proof-point pill list below the description.
   * Defaults to `true` for full/compact variants, `false` when `density="minimal"`.
   */
  showProofPoints?: boolean;
  /**
   * Controls padding and visual weight of the CTA block.
   * - `"full"`: full gradient block with large padding (maps to variant="full" behaviour).
   * - `"compact"`: white card with standard padding (default for non-full variants).
   * - `"minimal"`: white card with reduced padding, no proof pills by default.
   */
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

  // Proof pills are hidden when explicitly disabled or when density is minimal (no caller override).
  const renderProofPoints = showProofPoints ?? (density !== "minimal");

  const asideUnoptimized = asideImage
    ? /^https?:\/\//i.test(asideImage.src) || asideImage.src.startsWith("/api/media/")
    : false;

  // Determine visual mode: density prop takes precedence over variant for layout decisions.
  const effectiveDensity = density ?? (variant === "full" ? "full" : "compact");
  const isCompact = effectiveDensity !== "full";
  const isMinimal = effectiveDensity === "minimal";

  if (isCompact) {
    return (
      <section className={isMinimal ? "bg-white py-8" : "bg-white py-12 sm:py-16"}>
        <Container>
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
            <div className="absolute left-0 top-0 h-full w-1 bg-[var(--color-brand-primary)]" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 mb-3 text-sm font-medium text-[var(--color-brand-primary)]">
                  <Sparkles className="size-4" />
                  <span>{eyebrow ?? (variant === "pricing" ? "Pricing decision" : variant === "doctor" ? "Clinician booking" : variant === "service" ? "Service fit" : "Booking support")}</span>
                </div>
                <h2 className="gh-h2 text-[var(--color-text-primary)]">{title}</h2>
                <p className="mt-3 max-w-2xl text-base text-[var(--color-text-muted)] leading-relaxed">
                  {description}
                </p>
                {renderProofPoints ? (
                  <ul className="mt-4 flex flex-wrap items-center gap-2">
                    {proofPoints.map((point) => (
                      <li
                        key={point}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--color-background-soft)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)]"
                      >
                        <Check className="size-4 text-[var(--color-brand-primary)]" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className={isMinimal ? "mt-3" : "mt-5"}>
                  <Link href={ctaHref} className="gh-btn gh-btn-primary">
                    {ctaLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>

              {asideImage ? (
                <div className="relative mx-auto w-full max-w-[280px] shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] sm:mx-0">
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

  // Full variant
  return (
    <section className="bg-[var(--color-brand-primary)] py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-dark)] p-8 text-white shadow-[var(--shadow-elevated)] sm:p-10 lg:p-14">
          <div className="relative flex flex-col gap-8 items-center text-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 mb-4 text-sm font-medium text-[var(--color-brand-accent)] ring-1 ring-white/15">
                <Sparkles className="size-4" />
                <span>{eyebrow ?? "Booking support"}</span>
              </div>
              <h2 className="gh-h2 text-white">{title}</h2>
              <p className="mt-3 max-w-2xl mx-auto text-lg text-white/85 leading-relaxed">
                {description}
              </p>
              {renderProofPoints ? (
                <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {proofPoints.map((point) => (
                    <li
                      key={point}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90"
                    >
                      <Check className="size-4 text-[var(--color-brand-accent)]" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-8">
                <Link
                  href={ctaHref}
                  className="gh-btn bg-white text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-accent)] shadow-xl"
                >
                  {ctaLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {asideImage ? (
              <div className="relative mx-auto w-full max-w-[320px] shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
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
