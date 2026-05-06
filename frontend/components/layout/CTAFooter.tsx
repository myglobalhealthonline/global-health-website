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
    <div className="bg-[var(--color-brand-primary)] py-[var(--section-padding-y-sm)] text-[var(--color-brand-secondary)]">
      <Container>
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-4">
            <p className="gh-heading-eyebrow text-white/90">Start Your Online Consultation</p>
            <h2 className="gh-h2 max-w-lg text-[var(--color-brand-secondary)]">
              Choose your country and connect with a licensed doctor in minutes
            </h2>
            <p className="gh-body max-w-xl text-white/90">{trustLine}</p>
            <ul className="flex flex-wrap gap-3 text-sm font-medium text-white/90">
              {points.map((point) => (
                <li key={point} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Check className="size-4" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:items-center lg:w-auto lg:flex-col lg:items-end">
            {decorImage ? (
              <div className="relative w-full max-w-[280px] shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10">
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
