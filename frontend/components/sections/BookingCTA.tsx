import { Check, ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type BookingCTAProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  asideImage?: { src: string; alt: string };
  variant?: "full" | "compact" | "inline" | "service" | "doctor" | "pricing" | "support";
  eyebrow?: string;
  points?: string[];
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
  const asideUnoptimized = asideImage
    ? /^https?:\/\//i.test(asideImage.src) || asideImage.src.startsWith("/api/media/")
    : false;
  const isCompact = variant !== "full";

  return (
    <Section className={isCompact ? "bg-white py-8" : "bg-[var(--color-background-soft)] pb-[var(--section-padding-y-sm)]"}>
      <Container>
        <div
          className={`relative overflow-hidden rounded-[var(--radius-card)] ${
            isCompact
              ? "border border-[var(--color-border)] bg-white p-5 text-[var(--color-text-primary)] shadow-[var(--shadow-card)] sm:p-6"
              : "bg-gradient-to-br from-[var(--color-brand-primary)] to-[var(--color-brand-primary-hover)] p-8 text-white shadow-[var(--shadow-elevated)] sm:p-10 lg:p-14"
          }`}
        >
          {/* Background image overlay */}
          {!isCompact ? (
            <div className="absolute inset-0 opacity-10">
              <Image src="/images/hero/homehero.png" alt="" fill className="object-cover" />
            </div>
          ) : null}
          
          {/* Animated shine effect */}
          {!isCompact ? <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -inset-[100%] animate-[spin_8s_linear_infinite] opacity-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white to-transparent rotate-45" />
            </div>
          </div> : null}
          
          {/* Decorative circles */}
          {!isCompact ? (
            <>
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
            </>
          ) : null}
          
          <div
            className={`relative flex flex-col gap-6 ${
              asideImage || isCompact ? "lg:flex-row lg:items-center lg:justify-between lg:text-left" : "items-center text-center"
            }`}
          >
            <div className={`max-w-2xl ${asideImage ? "lg:flex-1" : ""}`}>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-sm font-medium ${
                  isCompact
                    ? "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                    : "bg-white/15 backdrop-blur-sm border border-white/20 text-white"
                }`}
              >
                <Sparkles className={`size-4 ${isCompact ? "text-[var(--color-brand-primary)]" : "text-[var(--color-brand-accent)]"}`} />
                <span>{eyebrow ?? (variant === "pricing" ? "Pricing decision" : variant === "doctor" ? "Clinician booking" : variant === "service" ? "Service fit" : "Booking support")}</span>
              </div>
              
              <h2 className={`gh-h2 ${isCompact ? "text-[var(--color-text-primary)]" : "text-white"}`}>{title}</h2>
              <p
                className={`mt-3 max-w-2xl leading-relaxed ${
                  isCompact ? "text-base text-[var(--color-text-muted)]" : "mx-auto text-lg text-white/95"
                }`}
              >
                {description}
              </p>
              
              <ul className={`mt-5 flex flex-wrap items-center gap-2 ${isCompact ? "justify-start" : "justify-center"}`}>
                {proofPoints.map((point) => (
                  <li
                    key={point}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                      isCompact
                        ? "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]"
                        : "border border-white/20 bg-white/15 text-white backdrop-blur-sm"
                    }`}
                  >
                    <Check className={`size-4 ${isCompact ? "text-[var(--color-brand-primary)]" : "text-[var(--color-brand-accent)]"}`} aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
              
              <div className={isCompact ? "mt-5" : "mt-8"}>
                <Link
                  href={ctaHref}
                  className={
                    isCompact
                      ? "gh-btn gh-btn-primary"
                      : "gh-btn bg-white text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-accent)] shadow-xl"
                  }
                >
                  {ctaLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {asideImage ? (
              <div className="relative mx-auto w-full max-w-[320px] shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/10 sm:mx-0 lg:max-w-[280px]">
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
    </Section>
  );
}
