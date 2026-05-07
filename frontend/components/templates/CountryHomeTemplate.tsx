import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Star, ChevronRight, Play } from "lucide-react";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { HealthcareMediaFrame } from "@/components/media/HealthcareMediaFrame";

export type CountryHomeTemplateProps = {
  countryName: string;
  hero: {
    eyebrow?: string;
    title: string;
    description: string;
    primaryCta?: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
    trustBadges?: string[];
    heroImage?: { src: string; alt: string };
  };
  primaryBooking: { label: string; href: string };
  quickActions?: Array<{ title: string; href: string }>;
  availability?: {
    eyebrow?: string;
    title: string;
    description: string;
    cta: { label: string; href: string };
  };
  about?: {
    eyebrow: string;
    title: string;
    description: string[];
    highlight: string;
    cta: { label: string; href: string };
    image: { src: string; alt: string };
  };
  specialties?: {
    title: string;
    subtitle: string;
    cta: { label: string; href: string };
  };
  serviceCards?: Array<{
    title: string;
    description: string;
    href: string;
  }>;
  steps?: Array<{
    title: string;
    description: string;
    ctaLabel?: string;
    ctaHref?: string;
  }>;
  homeDelivery?: {
    title: string;
    description: string;
    cta: { label: string; href: string };
    image?: { src: string; alt: string };
  };
  doctorSpotlight?: {
    quote: string;
    name: string;
    title: string;
    credential: string;
    image?: { src: string; alt: string };
  };
  trustTitle?: string;
  trustSubtitle?: string;
  trustItems?: Array<{ title: string; description: string }>;
  bookingCta?: {
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    asideImage?: { src: string; alt: string };
  };
  partnerLogos?: Array<{ src: string; alt: string }>;
  partnerTrustLine?: string;
};

export function CountryHomeTemplate({
  countryName,
  hero,
  primaryBooking,
  quickActions = [],
  availability,
  about,
  specialties,
  serviceCards = [],
  steps = [],
  homeDelivery,
  doctorSpotlight,
  trustTitle = "Why patients choose us",
  trustSubtitle,
  trustItems = [],
  bookingCta,
  partnerLogos = [],
  partnerTrustLine,
}: CountryHomeTemplateProps) {
  return (
    <>
      {/* Quick Actions Nav */}
      {quickActions.length > 0 ? (
        <div className="border-b border-[var(--color-border)] bg-white">
          <Container>
            <nav
              aria-label={`${countryName} quick links`}
              className="flex items-center justify-center gap-1 py-3 text-sm font-semibold"
            >
              {quickActions.map((action, i) => (
                <Link
                  key={action.href + action.title}
                  href={action.href}
                  className={`px-4 py-2 transition-colors hover:text-[var(--color-brand-primary)] ${
                    i === 0 ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {action.title}
                </Link>
              ))}
            </nav>
          </Container>
        </div>
      ) : null}

      {/* Hero Section - Green bg with text left, image right */}
      <section className="relative overflow-hidden bg-[var(--color-brand-primary)]">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.03] translate-x-1/4 -translate-y-1/4" />
        
        <Container className="relative py-12 sm:py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* Left: Text */}
            <div className="text-white">
              {hero.eyebrow && (
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--color-brand-accent)]">
                  {hero.eyebrow}
                </p>
              )}
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight leading-[1.1] text-white sm:text-4xl lg:text-[3rem]">
                {hero.title}
              </h1>
              <p className="mt-4 text-lg text-white/90 leading-relaxed max-w-lg">
                {hero.description}
              </p>
              
              {/* Star rating */}
              <div className="mt-5 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-sm font-bold text-white">4.94</span>
                <span className="text-sm text-white/70">— doctify</span>
              </div>
              
              {/* CTAs */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={hero.primaryCta?.href ?? primaryBooking.href}
                  className="gh-btn bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)] hover:bg-white"
                >
                  {hero.primaryCta?.label ?? primaryBooking.label}
                </Link>
                {hero.secondaryCta && (
                  <Link
                    href={hero.secondaryCta.href}
                    className="gh-btn border-2 border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  >
                    {hero.secondaryCta.label}
                  </Link>
                )}
              </div>
              
              {/* Trust badges */}
              {hero.trustBadges && hero.trustBadges.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {hero.trustBadges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-medium text-white/90"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Right: Hero Image */}
            <div className="relative">
              {hero.heroImage ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-2xl">
                  <Image
                    src={hero.heroImage.src}
                    alt={hero.heroImage.alt}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              ) : (
                <HealthcareMediaFrame variant="hero" priority />
              )}
            </div>
          </div>
        </Container>
        
        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full">
            <path d="M0 60L1440 60L1440 0C1440 0 1140 60 720 60C300 60 0 0 0 0L0 60Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Availability Banner */}
      {availability && (
        <Section className="bg-white py-10">
          <Container>
            <div className="rounded-[var(--radius-card)] bg-gradient-to-br from-[var(--color-brand-primary)] to-[var(--color-brand-primary-hover)] p-8 text-white shadow-[var(--shadow-elevated)] sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Clock className="size-6 text-[var(--color-brand-accent)]" />
                  </div>
                  <div>
                    {availability.eyebrow && (
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-accent)]">
                        {availability.eyebrow}
                      </p>
                    )}
                    <h2 className="text-2xl font-extrabold text-white">{availability.title}</h2>
                    <p className="mt-1 text-white/85">{availability.description}</p>
                  </div>
                </div>
                <Link
                  href={availability.cta.href}
                  className="gh-btn bg-white text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-accent)] shrink-0"
                >
                  {availability.cta.label}
                </Link>
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* About Section with Stats */}
      {about && (
        <Section className="bg-white">
          <Container>
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
              {/* Left: Image with stats overlay */}
              <div className="relative">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-xl">
                  <Image
                    src={about.image.src}
                    alt={about.image.alt}
                    fill
                    className="object-cover"
                  />
                </div>
                {/* Stats cards */}
                <div className="absolute -bottom-4 left-4 right-4 flex gap-3 sm:left-6 sm:right-auto">
                  <div className="rounded-xl bg-white shadow-lg border border-[var(--color-border)] px-4 py-3 text-center">
                    <p className="text-xl font-extrabold text-[var(--color-brand-primary)]">10K+</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Satisfied Patients</p>
                  </div>
                  <div className="rounded-xl bg-white shadow-lg border border-[var(--color-border)] px-4 py-3 text-center">
                    <p className="text-xl font-extrabold text-[var(--color-brand-primary)]">500+</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Positive Reviews</p>
                  </div>
                </div>
              </div>
              
              {/* Right: Text */}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
                  {about.eyebrow}
                </span>
                <h2 className="gh-h2 mt-4 text-[var(--color-text-primary)]">{about.title}</h2>
                <div className="mt-4 space-y-3">
                  {about.description.map((para, i) => (
                    <p key={i} className="gh-body text-[var(--color-text-muted)] leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-[var(--color-brand-primary)] italic">
                  {about.highlight}
                </p>
                <Link
                  href={about.cta.href}
                  className="gh-btn gh-btn-primary mt-6"
                >
                  {about.cta.label}
                </Link>
                
                {/* Doctify rating */}
                <div className="mt-6 flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="size-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">4.94</span>
                  <span className="text-xs text-[var(--color-text-muted)]">Based on 19 reviews, verified by doctify</span>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* Specialties Section */}
      {specialties && serviceCards.length > 0 && (
        <Section className="bg-[var(--color-background-soft)]">
          <Container>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
                  Specialties
                </span>
                <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">{specialties.title}</h2>
                <p className="gh-body-lg mt-2 text-[var(--color-text-muted)]">{specialties.subtitle}</p>
              </div>
              <Link
                href={specialties.cta.href}
                className="gh-btn gh-btn-outline shrink-0"
              >
                {specialties.cta.label}
              </Link>
            </div>
            
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {serviceCards.map((card) => (
                <Link
                  key={card.href + card.title}
                  href={card.href}
                  className="group relative rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/20"
                >
                  <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--color-brand-accent)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-accent)]/30 text-[var(--color-brand-primary)] mb-4 transition-transform group-hover:scale-110">
                    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)] transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {card.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ChevronRight className="size-4" />
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* How It Works */}
      {steps.length > 0 && (
        <HowItWorks
          title="How does it work?"
          subtitle="Simple Scheduling in 3 Steps"
          steps={steps}
        />
      )}

      {/* Home Delivery */}
      {homeDelivery && (
        <Section className="bg-[var(--color-brand-primary)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/[0.03] translate-x-1/4 -translate-y-1/4" />
          <Container>
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
              <div className="text-white">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-accent)] border border-white/10">
                  Prescription Service
                </span>
                <h2 className="gh-h2 mt-4 text-white">{homeDelivery.title}</h2>
                <p className="text-lg mt-3 text-white/85 leading-relaxed max-w-xl">
                  {homeDelivery.description}
                </p>
                <Link
                  href={homeDelivery.cta.href}
                  className="gh-btn mt-6 bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)] hover:bg-white"
                >
                  {homeDelivery.cta.label}
                </Link>
              </div>
              <div className="relative">
                <HealthcareMediaFrame
                  src={homeDelivery.image?.src}
                  alt={homeDelivery.image?.alt}
                  variant="delivery"
                />
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* Partners */}
      {partnerLogos.length > 0 ? (
        <Section className="bg-white py-10">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
                Partners
              </span>
            </div>
            <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-8 sm:gap-12">
              {partnerLogos.map((logo) => (
                <div
                  key={logo.src}
                  className="flex h-14 w-36 items-center justify-center sm:h-16 sm:w-44"
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={200}
                    height={80}
                    className="max-h-14 w-auto max-w-[11rem] object-contain sm:max-h-16"
                  />
                </div>
              ))}
            </div>
          </Container>
        </Section>
      ) : partnerTrustLine ? (
        <Section className="bg-white py-10">
          <Container>
            <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand-primary)]/10">
                <svg className="size-5 text-[var(--color-brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{partnerTrustLine}</p>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Doctor Spotlight */}
      {doctorSpotlight && (
        <Section className="bg-[var(--color-brand-primary)] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
          <Container className="relative">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
              <div className="relative mx-auto max-w-sm lg:max-w-none">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] shadow-2xl">
                  <Image
                    src={doctorSpotlight.image?.src ?? "/images/ireland/doctor-spotlight-ai.svg"}
                    alt={doctorSpotlight.image?.alt ?? doctorSpotlight.name}
                    fill
                    className="object-cover"
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg cursor-pointer hover:scale-110 transition-transform">
                      <Play className="size-6 text-[var(--color-brand-primary)] ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-white">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-accent)] border border-white/10">
                  Doctor Profile
                </span>
                <blockquote className="mt-5 text-2xl sm:text-3xl font-extrabold leading-[1.2] text-white">
                  &ldquo;{doctorSpotlight.quote}&rdquo;
                </blockquote>
                <div className="mt-6 rounded-[var(--radius-card)] border border-white/15 bg-white/10 backdrop-blur-sm p-5">
                  <p className="text-lg font-bold text-white">{doctorSpotlight.name}</p>
                  <p className="text-sm font-semibold text-[var(--color-brand-accent)]">{doctorSpotlight.title}</p>
                  <p className="text-sm text-white/70">{doctorSpotlight.credential}</p>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* Country Trust Proof */}
      {trustItems.length > 0 ? (
        <Section className="bg-white py-10">
          <Container>
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
                  Local access
                </span>
                <h2 className="gh-h2 mt-4 text-[var(--color-text-primary)]">{trustTitle}</h2>
                {trustSubtitle ? <p className="gh-body mt-3 text-[var(--color-text-muted)]">{trustSubtitle}</p> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {trustItems.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
                    <h3 className="font-bold text-[var(--color-text-primary)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Booking CTA */}
      <BookingCTA
        variant="compact"
        eyebrow={`${countryName} booking`}
        title={bookingCta?.title ?? "Ready to get started?"}
        description={bookingCta?.description ?? "Book an online consultation with your local clinic team."}
        ctaLabel={bookingCta?.ctaLabel ?? primaryBooking.label}
        ctaHref={bookingCta?.ctaHref ?? primaryBooking.href}
        asideImage={bookingCta?.asideImage}
      />
    </>
  );
}
