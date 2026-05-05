import Link from "next/link";
import { ArrowRight } from "lucide-react";

type HealthTestCardProps = {
  title: string;
  description: string;
  href: string;
};

export function HealthTestCard({ title, description, href }: HealthTestCardProps) {
  return (
    <article className="gh-card flex h-full flex-col p-6">
      <h3 className="gh-h3 text-[var(--color-text-primary)]">{title}</h3>
      <p className="gh-body-sm mt-3 flex-1 text-[var(--color-text-muted)]">{description}</p>
      <Link href={href} className="gh-link-arrow mt-5">
        Explore test
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
