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
    <article className="gh-card flex h-full flex-col p-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)]">
        {renderServiceIcon(title)}
      </span>
      <h3 className="gh-h3 mt-5 text-[var(--color-text-primary)]">{title}</h3>
      <p className="gh-body-sm mt-3 flex-1 text-[var(--color-text-muted)]">{description}</p>
      {(serviceType || audience || duration || startingPrice) ? (
        <dl className="mt-4 grid gap-2 text-xs text-[var(--color-text-muted)] sm:grid-cols-2">
          {serviceType ? (
            <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-1.5">
              <dt className="inline font-semibold text-[var(--color-text-primary)]">Type: </dt>
              <dd className="inline">{serviceType}</dd>
            </div>
          ) : null}
          {audience ? (
            <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-1.5">
              <dt className="inline font-semibold text-[var(--color-text-primary)]">For: </dt>
              <dd className="inline">{audience}</dd>
            </div>
          ) : null}
          {duration ? (
            <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-1.5">
              <dt className="inline font-semibold text-[var(--color-text-primary)]">Est. duration: </dt>
              <dd className="inline">{duration}</dd>
            </div>
          ) : null}
          {startingPrice ? (
            <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-1.5">
              <dt className="inline font-semibold text-[var(--color-text-primary)]">From: </dt>
              <dd className="inline">{startingPrice}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <Link href={href} className="gh-link-arrow mt-5">
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
