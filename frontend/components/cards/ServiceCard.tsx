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
    <article className="gh-card flex h-full flex-col p-6">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
        {renderServiceIcon(title)}
      </span>
      <h3 className="gh-h3 mt-5 text-[var(--color-text-primary)]">{title}</h3>
      <p className="gh-body-sm mt-3 flex-1 text-[var(--color-text-muted)]">{description}</p>
      <Link href={href} className="gh-link-arrow mt-5">
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
