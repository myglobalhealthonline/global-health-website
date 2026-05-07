import { BookingCTA } from "@/components/sections/BookingCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { TrustSignals } from "@/components/sections/TrustSignals";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { PricingCard } from "@/components/cards/PricingCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Star, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type ConsultationListingTemplateProps = {
  title: string;
  description: string;
  mode: "general" | "specialist";
  primaryCtaLabel?: string;
  secondaryCta?: { label: string; href: string };
  explanation?: { title: string; body: string };
  listing: Array<{
    title: string;
    description: string;
    href: string;
    serviceType?: "general" | "specialist";
    audience?: string;
    duration?: string;
    startingPrice?: string;
  }>;
  pricing?: {
    title: string;
    description?: string;
    items: Array<{ name: string; price: string; description: string }>;
  };
  howItWorks?: {
    title?: string;
    subtitle?: string;
    steps: Array<{ title: string; description: string; ctaLabel?: string; ctaHref?: string }>;
  };
  trust?: {
    title?: string;
    subtitle?: string;
    items: Array<{ title: string; description?: string }>;
  };
  faq?: { title?: string; items: Array<{ question: string; answer: string }> };
  bookingHref: string;
  bookingLabel: string;
};

export function ConsultationListingTemplate({
  title,
  description,
  mode,
  primaryCtaLabel,
  secondaryCta,
  explanation,
  listing,
  pricing,
  howItWorks,
  trust,
  faq,
  bookingHref,
  bookingLabel,
}: ConsultationListingTemplateProps) {
  const isSpecialist = mode === "specialist";

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-12 pb-8">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
              Your First Visit
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight leading-[1.1] text-[var(--color-text-primary)] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-lg text-[var(--color-text-muted)]">{description}</p>
            
            {/* Rating */}
            <div className="mt-5 flex items-center justify-center gap-3">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="size-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-lg font-bold text-[var(--color-text-primary)]">4.94</span>
              <span className="text-sm text-[var(--color-text-muted)]">Based on 19 reviews, verified by doctify</span>
            </div>
            
            {/* Doctify mini chart */}
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-[var(--color-text-muted)]">
              <div className="text-right">
                <p>Overall experience</p>
                <p>Ease of use</p>
                <p>Impact of care/usefulness</p>
                <p>Quality of Service</p>
              </div>
              <div className="space-y-1">
                {[1, 2, 3, 4].map((row) => (
                  <div key={row} className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="size-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Services Grid */}
      <ServicesGrid
        eyebrow={isSpecialist ? "Specialist Consultations" : "General Consultations"}
        items={listing}
        showRating={false}
      />

      {/* Doctify Badge */}
      <Section className="bg-white py-8">
        <Container>
          <div className="mx-auto max-w-md text-center">
            <div className="inline-flex flex-col items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] px-8 py-5 shadow-[var(--shadow-card)]">
              <p className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Excellent</p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="size-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">doctify</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Doctor Spotlight */}
      <Section className="bg-[var(--color-brand-primary)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <Container className="relative">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
            <div className="relative mx-auto max-w-sm lg:max-w-none">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] shadow-2xl">
                <Image
                  src="/images/ireland/doctor-spotlight-ai.svg"
                  alt="Dr. Khoiamul Islam"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg cursor-pointer hover:scale-110 transition-transform">
                    <Play className="size-6 text-[var(--color-brand-primary)] ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
            </div>
            <div className="text-white">
              <blockquote className="text-2xl sm:text-3xl font-extrabold leading-[1.2] text-white">
                &ldquo;Telemedicine is changing the way we do medicine, and we are here for you.&rdquo;
              </blockquote>
              <div className="mt-6 rounded-[var(--radius-card)] border border-white/15 bg-white/10 backdrop-blur-sm p-5">
                <p className="text-lg font-bold text-white">Dr. Khoiamul Islam</p>
                <p className="text-sm font-semibold text-[var(--color-brand-accent)]">Doctor in Medicine</p>
                <p className="text-sm text-white/70">IMC 542074</p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Partners */}
      <Section className="bg-white py-10">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
              Partners
            </span>
          </div>
          <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-8 sm:gap-12">
            {["Level Health", "ID Diagnostics", "Coombe Pharmacy", "Doctify"].map((partner) => (
              <div
                key={partner}
                className="flex h-14 w-36 items-center justify-center rounded-xl bg-[var(--color-background-soft)] border border-[var(--color-border)] px-4"
              >
                <span className="text-sm font-bold text-[var(--color-text-muted)]">{partner}</span>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Pricing */}
      {pricing?.items.length ? (
        <Section className="bg-[var(--color-background-soft)]">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
                Pricing
              </span>
              <h2 className="gh-h2 mt-4 text-[var(--color-text-primary)]">{pricing.title}</h2>
              {pricing.description ? (
                <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{pricing.description}</p>
              ) : null}
            </div>
            <div className="mx-auto mt-8 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {pricing.items.map((item) => (
                <PricingCard key={item.name} {...item} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* How It Works */}
      {howItWorks ? (
        <HowItWorks title={howItWorks.title} subtitle={howItWorks.subtitle} steps={howItWorks.steps} />
      ) : null}

      {/* Trust Signals */}
      {trust ? <TrustSignals title={trust.title} subtitle={trust.subtitle} items={trust.items} /> : null}

      {/* FAQ */}
      {faq?.items.length ? <FAQSection title={faq.title} items={faq.items} /> : null}

      {/* Booking CTA */}
      <BookingCTA
        title="Start Your Online Consultation"
        description="Choose your country and connect with a licensed doctor in minutes."
        ctaLabel={bookingLabel}
        ctaHref={bookingHref}
      />
    </>
  );
}
