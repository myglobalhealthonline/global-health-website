import { Check } from "lucide-react";
import { Container } from "@/components/layout/Container";
import type { NavLink } from "@/data/navigation";
import Link from "next/link";

export function CTAFooter({
  cta,
  trustLine,
}: {
  cta: NavLink;
  trustLine: string;
}) {
  const points = ["100% online", "No waiting rooms", "Confidential"];

  return (
    <div className="bg-[var(--color-brand-primary)] py-14 text-[var(--color-brand-secondary)]">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Start Your Online Consultation</p>
            <h2 className="max-w-lg text-3xl font-extrabold tracking-tight sm:text-4xl">
              Choose your country and connect with a licensed doctor in minutes
            </h2>
            <p className="max-w-xl text-sm text-white/80">{trustLine}</p>
          </div>
          <div className="flex flex-col gap-5 lg:items-end">
            <Link
              href={cta.href}
              className="inline-flex min-h-12 min-w-[220px] items-center justify-center rounded-full bg-[var(--color-brand-secondary)] px-6 py-3 text-base font-semibold text-[var(--color-brand-primary)] shadow-[var(--shadow-card)] transition-colors hover:bg-white"
            >
              {cta.label}
            </Link>
            <ul className="flex flex-wrap gap-3 text-sm font-medium text-white/90">
              {points.map((point) => (
                <li key={point} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Check className="size-4" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </div>
  );
}
