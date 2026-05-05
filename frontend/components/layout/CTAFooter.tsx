import Image from "next/image";
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
    <div className="bg-[var(--color-brand-primary)] py-[var(--section-padding-y-sm)] text-[var(--color-brand-secondary)]">
      <Container>
        <div className="grid gap-8 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:p-10">
          <div className="space-y-4">
            <p className="gh-heading-eyebrow text-white/72">Start Your Online Consultation</p>
            <h2 className="gh-h2 max-w-lg text-[var(--color-brand-secondary)]">
              Choose your country and connect with a licensed doctor in minutes
            </h2>
            <p className="gh-body max-w-xl text-white/82">{trustLine}</p>
          </div>
          <div className="flex flex-col gap-5 lg:items-end">
            <div className="hidden overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-2 lg:block">
              <Image
                src="/images/footer/footer-cta-ai.svg"
                alt="Illustration of a patient booking an online consultation on a phone"
                width={480}
                height={304}
                className="h-auto w-[280px] rounded-[18px]"
              />
            </div>
            <Link href={cta.href} className="gh-btn min-w-[220px] bg-[var(--color-brand-secondary)] text-[var(--color-brand-primary)] hover:bg-white">
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
