import { Check } from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import type { NavLink } from "@/data/navigation";
import Link from "next/link";

export function CTAFooter({
  cta,
  trustLine,
  decorImage,
}: {
  cta: NavLink;
  trustLine: string;
  decorImage?: { src: string; alt: string };
}) {
  const points = ["100% online", "No waiting rooms", "Confidential"];

  return (
    <div className="gh-medical-pattern gh-medical-pattern-dark border-t border-white/10 bg-[var(--color-brand-primary)] py-16 sm:py-20 lg:py-24 text-[var(--color-brand-secondary)]">
      <Container>
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-5">
            <p className="gh-heading-eyebrow text-[var(--color-brand-accent)]">Start Your Online Consultation</p>
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              Choose your country and connect with a licensed doctor in minutes
            </h2>
            <p className="gh-body max-w-xl text-white/85">{trustLine}</p>
            <ul className="flex flex-wrap gap-3 text-sm font-medium text-white/85">
              {points.map((point) => (
                <li key={point} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Check className="size-4 text-[var(--color-brand-accent)]" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex w-full flex-col items-stretch gap-5 sm:flex-row sm:items-center lg:w-auto lg:flex-col lg:items-end">
            {decorImage ? (
              <div className="relative w-full max-w-[260px] shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10">
                <Image
                  src={decorImage.src}
                  alt={decorImage.alt}
                  width={480}
                  height={320}
                  className="h-auto w-full object-cover opacity-95"
                />
              </div>
            ) : null}
            <Link
              href={cta.href}
              className="gh-btn min-w-[220px] bg-[var(--color-brand-secondary)] text-[var(--color-brand-primary)] hover:bg-white"
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
