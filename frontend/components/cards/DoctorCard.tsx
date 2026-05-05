import { ArrowRight } from "lucide-react";
import Link from "next/link";

type DoctorCardProps = {
  name: string;
  title: string;
  bio: string;
  href?: string;
};

export function DoctorCard({ name, title, bio, href }: DoctorCardProps) {
  return (
    <article className="gh-card flex h-full flex-col p-6">
      <span className="gh-heading-eyebrow inline-flex w-fit rounded-full bg-[var(--color-background-soft)] px-3 py-1 text-[var(--color-brand-primary)]">
        Medical team
      </span>
      <h3 className="gh-h3 mt-4 text-[var(--color-text-primary)]">{name}</h3>
      <p className="gh-body-sm mt-1 font-semibold text-[var(--color-brand-primary)]">{title}</p>
      <p className="gh-body-sm mt-4 flex-1 text-[var(--color-text-muted)]">{bio}</p>
      {href ? (
        <Link href={href} className="gh-link-arrow mt-5">
          View profile
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </article>
  );
}
