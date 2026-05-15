"use client";

import { Container } from "@/components/layout/Container";

export function TeamHero({ countryName }: { countryName: string }) {
  return (
    <section className="gh-medical-pattern gh-medical-pattern-dark relative overflow-hidden bg-[var(--color-brand-primary)]">
      <Container className="relative py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-accent)] ring-1 ring-white/15">
            Team
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight leading-[1.05] text-white sm:text-5xl lg:text-[3.5rem]">
            Meet our doctors
          </h1>
          <p className="mt-4 text-lg text-white/85 max-w-xl mx-auto leading-relaxed">
            Certified and experienced professionals in {countryName} ready to take care of your health.
          </p>
          {/* Rating badge (4.9/5 · 2,000+ reviews) removed when the public
              surface was made fully DB-driven. Re-add once a real review
              source is wired in (Trustpilot / Google). */}
        </div>
      </Container>
    </section>
  );
}
