import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Heart,
  Package,
  Star,
  ChevronRight,
} from "lucide-react";
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
    highlights?: string[];
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
              className="flex items-center justify-start gap-1 overflow-x-auto py-2 text-sm font-semibold sm:justify-center sm:py-2.5"
            >
              {quickActions.map((action, i) => (
                <Link
                  key={action.href + action.title}
                  href={action.href}
                  className={`shrink-0 rounded-full px-4 py-2 transition-colors hover:text-[var(--color-brand-primary)] ${
                    i === 0
                      ? "text-[var(--color-brand-primary)] bg-[var(--color-background-soft)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {action.title}
                </Link>
              ))}
            </nav>
          </Container>
        </div>
      ) : null}

      {/* Hero Section - Dark green, text left, image right */}
      <section className="gh-medical-pattern gh-medical-pattern-dark relative overflow-hidden bg-[var(--color-brand-primary)]">
        <Container className="relative pb-16 pt-8 sm:pb-20 sm:pt-10 lg:pb-24 lg:pt-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
            {/* Left: Text */}
            <div className="mx-auto max-w-2xl text-center text-white lg:mx-0 lg:text-left">
              {hero.eyebrow && (
                <p className="gh-heading-eyebrow text-[var(--color-brand-accent)]">
                  {hero.eyebrow}
                </p>
              )}
              <h1 className="mt-4 text-[var(--text-display)] font-extrabold tracking-tight leading-[1.05] text-white">
                {hero.title}
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-white/85 lg:mx-0">
                {hero.description}
              </p>

              {/* Star rating */}
              <div className="mt-5 flex items-center justify-center gap-2 lg:justify-start">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="size-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-white">4.94</span>
                <span className="text-sm text-white/70">— doctify</span>
              </div>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link
                  href={hero.primaryCta?.href ?? primaryBooking.href}
                  className="gh-btn bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)] hover:bg-white"
                >
                  {hero.primaryCta?.label ?? primaryBooking.label}
                </Link>
                {hero.secondaryCta && (
                  <Link
                    href={hero.secondaryCta.href}
                    className="gh-btn border-2 border-white/30 bg-white/10 text-white hover:bg-white/20"
                  >
                    {hero.secondaryCta.label}
                  </Link>
                )}
              </div>

              {/* Trust badges */}
              {hero.trustBadges && hero.trustBadges.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
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
            <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
              {hero.heroImage ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] bg-white/10 p-1 shadow-[var(--shadow-elevated)] sm:p-2">
                  <Image
                    src={hero.heroImage.src}
                    alt={hero.heroImage.alt}
                    fill
                    className="object-contain object-center"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    priority
                  />
                </div>
              ) : (
                <HealthcareMediaFrame variant="hero" priority />
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Availability Banner */}
      {availability && (
        <Section variant="white" className="py-10">
          <Container>
            <div className="rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-8 text-white shadow-[var(--shadow-elevated)] sm:p-10">
              <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:text-left">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Clock className="size-6 text-[var(--color-brand-accent)]" />
                  </div>
                  <div>
                    {availability.eyebrow && (
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-accent)]">
                        {availability.eyebrow}
                      </p>
                    )}
                    <h2 className="text-2xl font-extrabold text-white">
                      {availability.title}
                    </h2>
                    <p className="mt-1 text-white/85">
                      {availability.description}
                    </p>
                  </div>
                </div>
                <Link
                  href={availability.cta.href}
                  className="gh-btn w-full shrink-0 bg-white text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-accent)] sm:w-auto"
                >
                  {availability.cta.label}
                </Link>
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* About Section */}
      {about && (
        <Section variant="soft" className="py-16 sm:py-20 lg:py-28">
          <Container>
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16 xl:gap-24">
              {/* Left: Image — layered frame (cream outer, white inner) */}
              <div className="relative order-2 mx-auto w-full max-w-2xl lg:order-1 lg:max-w-none">
                <div className="relative rounded-[2rem] border border-[var(--color-border)] bg-gradient-to-b from-[#fafaf7] to-[var(--color-background-panel)] p-4 shadow-[var(--shadow-elevated)] sm:p-5">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white p-3 ring-1 ring-[var(--color-border)]/60 sm:p-4">
                    <Image
                      src={about.image.src}
                      alt={about.image.alt}
                      fill
                      className="object-contain object-center"
                      sizes="(min-width: 1024px) 42vw, 100vw"
                    />
                  </div>
                </div>
              </div>

              {/* Right: Text */}
              <div className="order-1 text-center lg:order-2 lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 shadow-[var(--shadow-soft)]">
                  <Heart
                    className="size-3.5 text-[var(--color-brand-primary)]"
                    aria-hidden
                  />
                  <span className="gh-heading-eyebrow !text-[10px] !tracking-[0.2em] text-[var(--color-brand-primary)]">
                    {about.eyebrow}
                  </span>
                </div>
                <h2 className="mx-auto mt-6 max-w-xl text-[var(--text-h2)] font-extrabold leading-[1.12] tracking-tight text-[var(--color-text-primary)] lg:mx-0">
                  {about.title}
                </h2>
                <div className="mx-auto mt-6 max-w-xl space-y-4 lg:mx-0">
                  {about.description.map((para, i) => (
                    <p
                      key={i}
                      className="text-[1.05rem] leading-[1.7] text-[var(--color-text-body)] sm:text-lg sm:leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>
                <blockquote className="mx-auto mt-8 max-w-xl rounded-r-xl border-l-[3px] border-[var(--color-brand-accent)] bg-white/70 py-1 pl-5 pr-4 text-left text-base font-medium italic leading-relaxed text-[var(--color-brand-primary)] shadow-[var(--shadow-soft)] lg:mx-0">
                  {about.highlight}
                </blockquote>
                <Link
                  href={about.cta.href}
                  className="group/cta mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-8 py-3.5 text-sm font-bold text-white shadow-[var(--shadow-card)] transition-all hover:bg-[var(--color-brand-primary-hover)] hover:shadow-[var(--shadow-card-hover)]"
                >
                  {about.cta.label}
                  <ChevronRight
                    className="size-4 transition-transform group-hover/cta:translate-x-0.5"
                    aria-hidden
                  />
                </Link>

                <div className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3.5 text-center shadow-[var(--shadow-soft)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 lg:mx-0 lg:justify-start lg:text-left">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className="size-4 shrink-0 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                      4.94
                    </span>
                  </div>
                  <p className="text-xs leading-snug text-[var(--color-text-muted)] sm:border-l sm:border-[var(--color-border)] sm:pl-3">
                    Based on 19 reviews, verified by Doctify
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* Specialties Section */}
      {specialties && serviceCards.length > 0 && (
        <Section variant="soft">
          <Container>
            <div className="mb-12 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
              <div>
                <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
                  Specialties
                </span>
                <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">
                  {specialties.title}
                </h2>
                <p className="gh-body-lg mt-2 text-[var(--color-text-muted)]">
                  {specialties.subtitle}
                </p>
              </div>
              <Link
                href={specialties.cta.href}
                className="gh-btn gh-btn-outline w-full shrink-0 sm:w-auto"
              >
                {specialties.cta.label}
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {serviceCards.map((card) => (
                <Link
                  key={card.href + card.title}
                  href={card.href}
                  className="group relative flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] mb-4">
                    <svg
                      className="size-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {card.description}
                  </p>
                  <div className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-[var(--color-brand-primary)]">
                    Learn more{" "}
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
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
          variant="white"
        />
      )}

      {/* Home Delivery / Prescription service */}
      {homeDelivery && (
        <Section
          variant="primary"
          pattern="dark"
          className="relative overflow-hidden py-8 sm:py-10 lg:py-12"
        >
          <div
            className="gh-medical-pattern-layer -right-24 top-1/3 size-[24rem] rounded-full bg-[var(--color-brand-accent)]/12 blur-3xl lg:top-1/2 lg:-translate-y-1/2"
            aria-hidden
          />
          <div
            className="gh-medical-pattern-layer -left-16 bottom-8 size-[16rem] rounded-full bg-white/5 blur-2xl"
            aria-hidden
          />
          <Container className="relative z-10">
            {/* items-start: pattern-layer fix + avoids empty bands when column heights differ */}
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12 xl:gap-14">
              <div className="order-2 text-center text-white lg:order-1 lg:text-left">
                <div className="rounded-[2rem] border border-white/15 bg-white/[0.07] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-md sm:p-6 lg:p-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5">
                    <Package
                      className="size-3.5 text-[var(--color-brand-accent)]"
                      aria-hidden
                    />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]">
                      Prescription service
                    </span>
                  </div>
                  <h2 className="mx-auto mt-5 max-w-xl text-[var(--text-h2)] font-extrabold leading-[1.12] tracking-tight text-white lg:mx-0">
                    {homeDelivery.title}
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/88 sm:text-lg lg:mx-0">
                    {homeDelivery.description}
                  </p>
                  {homeDelivery.highlights &&
                  homeDelivery.highlights.length > 0 ? (
                    <ul className="mx-auto mt-6 max-w-xl space-y-2.5 text-left lg:mx-0">
                      {homeDelivery.highlights.map((line) => (
                        <li
                          key={line}
                          className="flex gap-3 text-sm leading-snug text-white/90 sm:text-base"
                        >
                          <CheckCircle2
                            className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-accent)]"
                            aria-hidden
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Link
                    href={homeDelivery.cta.href}
                    className="group/delivery mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-accent)] px-7 py-3 text-sm font-bold text-[var(--color-brand-primary)] shadow-lg shadow-black/10 transition-all hover:bg-white"
                  >
                    {homeDelivery.cta.label}
                    <ChevronRight
                      className="size-4 transition-transform group-hover/delivery:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </div>
              </div>
              <div className="order-1 w-full lg:order-2">
                <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                  <div
                    className="absolute -inset-2 rounded-[1.75rem] bg-[var(--color-brand-accent)]/12 blur-xl sm:-inset-3"
                    aria-hidden
                  />
                  <div className="relative overflow-hidden rounded-[1.5rem] border border-white/25 bg-white/5 p-1.5 shadow-[var(--shadow-elevated)] backdrop-blur-sm sm:rounded-[1.75rem] sm:p-2">
                    <HealthcareMediaFrame
                      src={homeDelivery.image?.src}
                      alt={homeDelivery.image?.alt}
                      variant="delivery"
                      objectFit="contain"
                      className="[&>div]:flex [&>div]:max-h-[260px] [&>div]:items-center [&>div]:justify-center [&>div]:overflow-hidden sm:[&>div]:max-h-[300px] lg:[&>div]:max-h-[380px] xl:[&>div]:max-h-[420px] [&_img]:h-auto [&_img]:max-h-full [&_img]:w-auto [&_img]:max-w-full [&_img]:object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* Partners */}
      {partnerLogos.length > 0 ? (
        <Section variant="white" className="py-10">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
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
        <Section variant="white" className="py-10">
          <Container>
            <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 text-center sm:flex-row">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand-primary)]/10">
                <svg
                  className="size-5 text-[var(--color-brand-primary)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {partnerTrustLine}
              </p>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Doctor Spotlight */}
      {doctorSpotlight && (
        <Section variant="primary">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
              <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)]">
                  <Image
                    src={
                      doctorSpotlight.image?.src ??
                      "/images/ireland/doctor-spotlight-ai.svg"
                    }
                    alt={doctorSpotlight.image?.alt ?? doctorSpotlight.name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="mx-auto max-w-2xl text-center text-white lg:mx-0 lg:text-left">
                <span className="gh-heading-eyebrow text-[var(--color-brand-accent)]">
                  Doctor Profile
                </span>
                <blockquote className="mt-5 text-2xl sm:text-3xl font-extrabold leading-[1.15] text-white">
                  &ldquo;{doctorSpotlight.quote}&rdquo;
                </blockquote>
                <div className="mt-6 rounded-[var(--radius-card)] border border-white/15 bg-white/10 p-5">
                  <p className="text-lg font-bold text-white">
                    {doctorSpotlight.name}
                  </p>
                  <p className="text-sm font-semibold text-[var(--color-brand-accent)]">
                    {doctorSpotlight.title}
                  </p>
                  <p className="text-sm text-white/70">
                    {doctorSpotlight.credential}
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* Country Trust Proof */}
      {trustItems.length > 0 ? (
        <Section variant="white" className="py-10">
          <Container>
            <div className="grid gap-8 text-center lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:text-left">
              <div>
                <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
                  Local access
                </span>
                <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">
                  {trustTitle}
                </h2>
                {trustSubtitle ? (
                  <p className="gh-body mt-3 text-[var(--color-text-muted)]">
                    {trustSubtitle}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {trustItems.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5"
                  >
                    <h3 className="font-bold text-[var(--color-text-primary)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {item.description}
                    </p>
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
        description={
          bookingCta?.description ??
          "Book an online consultation with your local clinic team."
        }
        ctaLabel={bookingCta?.ctaLabel ?? primaryBooking.label}
        ctaHref={bookingCta?.ctaHref ?? primaryBooking.href}
        asideImage={bookingCta?.asideImage}
      />
    </>
  );
}
