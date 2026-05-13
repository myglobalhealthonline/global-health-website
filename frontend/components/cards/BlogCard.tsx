import Link from "next/link";
import { ArrowRight } from "lucide-react";

type BlogCardProps = {
  title: string;
  excerpt: string;
  href: string;
};

export function BlogCard({ title, excerpt, href }: BlogCardProps) {
  return (
    <article className="gh-card gh-card-hover flex h-full flex-col p-6">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-primary)]">
        Health guide
      </span>
      <h3 className="mt-3 text-lg font-bold leading-snug text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
        {excerpt}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-brand-primary)] transition-colors hover:text-[var(--color-brand-primary-hover)]"
      >
        Read article
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
