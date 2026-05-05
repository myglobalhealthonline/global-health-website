import Link from "next/link";
import { ArrowRight } from "lucide-react";

type BlogCardProps = {
  title: string;
  excerpt: string;
  href: string;
};

export function BlogCard({ title, excerpt, href }: BlogCardProps) {
  return (
    <article className="gh-card flex h-full flex-col p-6">
      <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">Health guide</span>
      <h3 className="gh-h3 text-[var(--color-text-primary)]">{title}</h3>
      <p className="gh-body-sm mt-3 flex-1 text-[var(--color-text-muted)]">{excerpt}</p>
      <Link href={href} className="gh-link-arrow mt-5">
        Read article
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
