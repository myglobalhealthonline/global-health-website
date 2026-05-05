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
    <article className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
        {renderServiceIcon(title)}
      </span>
      <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
      >
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
