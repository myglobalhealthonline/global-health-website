"use client";

import { Star } from "lucide-react";
import { Container } from "@/components/layout/Container";

export function TeamHero({ countryName }: { countryName: string }) {
  return (
    <section className="relative overflow-hidden bg-[var(--color-brand-primary)]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.03] translate-x-1/4 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white/[0.03] -translate-x-1/3 translate-y-1/3" />
      
      <Container className="relative py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-accent)] border border-white/10">
            Team
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight leading-[1.08] text-white sm:text-5xl lg:text-[3.5rem]">
            Meet our doctors
          </h1>
          <p className="mt-4 text-lg text-white/85 max-w-xl mx-auto leading-relaxed">
            Certified and experienced professionals in {countryName} ready to take care of your health.
          </p>
          
          {/* Rating badge */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-5 py-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="size-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">4.9/5</p>
              <p className="text-xs text-white/70">2,000+ reviews</p>
            </div>
          </div>
        </div>
      </Container>
      
      {/* Bottom curve */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" className="w-full">
          <path d="M0 60L1440 60L1440 0C1440 0 1140 60 720 60C300 60 0 0 0 0L0 60Z" fill="var(--color-background-soft)" />
        </svg>
      </div>
    </section>
  );
}
