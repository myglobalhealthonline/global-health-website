import { ArrowRight, HeartPulse, Microscope, ShieldPlus, Stethoscope } from "lucide-react";
import Link from "next/link";

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
  serviceType?: "general" | "specialist";
  audience?: string;
  duration?: string;
  startingPrice?: string;
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
  serviceType,
  audience,
  duration,
  startingPrice,
  ctaLabel = "View details",
}: ServiceCardProps) {
  return (
    <article className="gh-card gh-card-interactive flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="gh-icon-circle">
          {renderServiceIcon(title)}
        </span>
        {(serviceType || duration) ? (
          <div className="flex flex-wrap gap-2">
            {serviceType ? (
              <span className="gh-badge gh-badge-neutral text-xs">{serviceType}</span>
            ) : null}
            {duration ? (
              <span className="gh-badge gh-badge-neutral text-xs">{duration}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <h3 className="gh-h3 mt-4 text-[var(--color-text-primary)]">{title}</h3>
      <p className="gh-body-sm mt-2 flex-1 text-[var(--color-text-muted)]">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {audience ? (
          <span className="text-xs text-[var(--color-text-muted)]">
            <span className="font-semibold text-[var(--color-text-primary)]">For:</span> {audience}
          </span>
        ) : null}
        {startingPrice ? (
          <span className="text-xs text-[var(--color-text-muted)]">
            <span className="font-semibold text-[var(--color-text-primary)]">From:</span> {startingPrice}
          </span>
        ) : null}
      </div>
      <Link href={href} className="gh-link-arrow mt-5">
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
