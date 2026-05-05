import { ArrowRight, HeartPulse, Microscope, ShieldPlus, Stethoscope } from "lucide-react";
import Link from "next/link";

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
  ctaLabel?: string;
};

function renderServiceIcon(title: string) {
  const lower = title.toLowerCase();
  const className = "size-6";

  if (lower.includes("cardio") || lower.includes("neuro") || lower.includes("pneumo")) {
    return <HeartPulse className={className} aria-hidden />;
  }
  if (lower.includes("derma") || lower.includes("genetic") || lower.includes("immun")) {
    return <Microscope className={className} aria-hidden />;
  }
  if (lower.includes("psy") || lower.includes("nutrition") || lower.includes("geriat")) {
    return <ShieldPlus className={className} aria-hidden />;
  }
  return <Stethoscope className={className} aria-hidden />;
}

export function ServiceCard({
  title,
  description,
  href,
  ctaLabel = "View details",
}: ServiceCardProps) {
  return (
    <article className="flex h-full flex-col rounded-[24px] bg-[var(--color-brand-secondary)] p-6 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1">
      <span className="flex size-12 items-center justify-center rounded-[18px] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
        {renderServiceIcon(title)}
      </span>
      <h3 className="mt-5 text-xl font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:text-[var(--color-brand-primary-hover)]"
      >
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
