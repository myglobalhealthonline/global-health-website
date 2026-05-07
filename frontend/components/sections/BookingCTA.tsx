import { Check, ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type BookingCTAProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  asideImage?: { src: string; alt: string };
};

export function BookingCTA({ title, description, ctaLabel, ctaHref, asideImage }: BookingCTAProps) {
  const points = ["100% online", "No waiting rooms", "Confidential"];

  return (
    <Section className="bg-[var(--color-background-soft)] pb-[var(--section-padding-y-sm)]">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[var(--color-brand-primary)] to-[var(--color-brand-primary-hover)] p-8 text-white shadow-[var(--shadow-elevated)] sm:p-10 lg:p-14">
          {/* Background image overlay */}
          <div className="absolute inset-0 opacity-10">
            <Image
              src="/images/hero/homehero.png"
              alt=""
              fill
              className="object-cover"
            />
          </div>
          
          {/* Animated shine effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -inset-[100%] animate-[spin_8s_linear_infinite] opacity-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white to-transparent rotate-45" />
            </div>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
          
          <div
            className={`relative flex flex-col gap-8 ${asideImage ? "lg:flex-row lg:items-center lg:justify-between lg:text-left" : "items-center text-center"}`}
          >
            <div className={`max-w-2xl ${asideImage ? "lg:flex-1" : ""}`}>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-1.5 mb-5 border border-white/20">
                <Sparkles className="size-4 text-[var(--color-brand-accent)]" />
                <span className="text-sm font-medium text-white">Start Your Consultation Today</span>
              </div>
              
              <h2 className="gh-h2 text-white">{title}</h2>
              <p className="text-lg mt-3 max-w-2xl text-white/95 leading-relaxed mx-auto">{description}</p>
              
              <ul className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {points.map((point) => (
                  <li key={point} className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-2 text-sm font-medium border border-white/20 text-white">
                    <Check className="size-4 text-[var(--color-brand-accent)]" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
              
              <div className="mt-8">
                <Link
                  href={ctaHref}
                  className="gh-btn bg-white text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-accent)] shadow-xl"
                >
                  {ctaLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {asideImage ? (
              <div className="relative mx-auto w-full max-w-[320px] shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/10 sm:mx-0 lg:max-w-[280px]">
                <Image
                  src={asideImage.src}
                  alt={asideImage.alt}
                  width={560}
                  height={420}
                  className="h-auto w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </Section>
  );
}
