import Image from "next/image";
import { ArrowRight, MapPin, Languages } from "lucide-react";
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
  imageLabel,
  href,
  ctaLabel = "Meet doctor",
}: DoctorCardProps) {
  return (
    <article className="gh-card gh-card-hover flex h-full flex-col overflow-hidden">
      <div className="overflow-hidden">
        <Image
          src={imageLabel ? `/uploads/${imageLabel}` : "/images/ireland/doctor-spotlight-ai.svg"}
          alt={`Illustrative clinician portrait for ${name}`}
          width={360}
          height={420}
          className="h-52 w-full object-cover sm:h-56"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="gh-h3 text-[var(--color-text-primary)]">{name}</h3>
        <p className="gh-body-sm mt-1 font-semibold text-[var(--color-brand-primary)]">{title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
          {country ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {country}
            </span>
          ) : null}
          {languages.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Languages className="size-3.5" aria-hidden />
              {languages.join(", ")}
            </span>
          ) : null}
        </div>
        <p className="gh-body-sm mt-4 flex-1 text-[var(--color-text-muted)] line-clamp-3">{bio}</p>
        {href ? (
          <Link href={href} className="gh-link-arrow mt-5">
            {ctaLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
