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
    <article className="flex h-full flex-col rounded-[24px] bg-[var(--color-brand-secondary)] p-6 shadow-[var(--shadow-card)]">
      <span className="inline-flex w-fit rounded-full bg-[var(--color-background-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
        Medical team
      </span>
      <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">{name}</h3>
      <p className="mt-1 text-sm font-medium text-[var(--color-brand-primary)]">{title}</p>
      <p className="mt-4 flex-1 text-sm leading-6 text-[var(--color-text-muted)]">{bio}</p>
      {href ? (
        <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]">
          View profile
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </article>
  );
}
