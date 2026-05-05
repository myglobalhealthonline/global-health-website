import { ArrowRight } from "lucide-react";
import Link from "next/link";

type DoctorCardProps = {
  name: string;
  title: string;
  country?: string;
  languages?: string[];
  bio: string;
  imageLabel?: string;
  href?: string;
  ctaLabel?: string;
};

export function DoctorCard({
  name,
  title,
  country,
  languages = [],
  bio,
  imageLabel = "Profile",
  href,
  ctaLabel = "Meet doctor",
}: DoctorCardProps) {
  return (
    <article className="gh-card flex h-full flex-col p-6">
      <span className="gh-heading-eyebrow inline-flex w-fit rounded-full bg-[var(--color-background-soft)] px-3 py-1 text-[var(--color-brand-primary)]">
        Medical team
      </span>
      <h3 className="gh-h3 mt-4 text-[var(--color-text-primary)]">{name}</h3>
      <p className="gh-body-sm mt-1 font-semibold text-[var(--color-brand-primary)]">{title}</p>
      {(country || languages.length > 0) ? (
        <p className="gh-body-sm mt-2 text-[var(--color-text-muted)]">
          {country ? `${country}` : ""}
          {country && languages.length > 0 ? " · " : ""}
          {languages.length > 0 ? `Languages: ${languages.join(", ")}` : ""}
        </p>
      ) : null}
      <div className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-background-soft),#eef6e2)] px-4 py-8 text-center text-xs font-medium text-[var(--color-text-muted)]">
        {imageLabel} image placeholder
      </div>
      <p className="gh-body-sm mt-4 flex-1 text-[var(--color-text-muted)]">{bio}</p>
      {href ? (
        <Link href={href} className="gh-link-arrow mt-5">
          {ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </article>
  );
}
