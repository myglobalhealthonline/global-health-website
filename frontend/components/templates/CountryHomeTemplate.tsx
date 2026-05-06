import Image from "next/image";
import Link from "next/link";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { TrustSignals } from "@/components/sections/TrustSignals";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

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
    eyebrow?: string;
    title: string;
    description: string[];
    highlight?: string;
    cta?: { label: string; href: string };
    image?: { src: string; alt: string };
  };
  servicesTitle?: string;
  servicesIntro?: string;
  servicesCta?: { label: string; href: string };
  services: Array<{ title: string; description: string; href: string }>;
  steps?: Array<{ title: string; description: string; ctaLabel?: string; ctaHref?: string }>;
  homeDelivery?: {
    title: string;
    description: string;
    cta: { label: string; href: string };
    image?: { src: string; alt: string };
  };
  doctorsTitle?: string;
  doctorSpotlight?: {
    quote: string;
    name: string;
    title: string;
    credential: string;
    image?: { src: string; alt: string };
  };
  doctors: Array<{ name: string; title: string; bio: string; href?: string }>;
  trustTitle?: string;
  trustSubtitle?: string;
  trustItems?: Array<{ title: string; description: string }>;
  faqTitle?: string;
  faqs: Array<{ question: string; answer: string }>;
  bookingCta?: { title: string; description: string; ctaLabel: string; ctaHref: string };
};

export function CountryHomeTemplate({
  countryName,
  hero,
  primaryBooking,
  quickActions = [],
  availability,
  about,
  servicesTitle = "Services",
  servicesIntro,
  servicesCta,
  services,
  steps,
  homeDelivery,
  doctorsTitle = "Medical team",
  doctorSpotlight,
  doctors,
  trustTitle = "Why patients choose us",
  trustSubtitle,
  trustItems = [
    {
      title: "Licensed clinicians",
      description: `Country hub: ${countryName}`,
    },
    {
      title: "Secure digital consultations",
      description: "Private online care with clear booking routes.",
    },
  ],
  faqTitle = "FAQs",
  faqs,
  bookingCta,
}: CountryHomeTemplateProps) {
  return (
    <>
      {quickActions.length > 0 ? (
        <Section className="border-b border-[var(--color-border)] bg-[var(--color-brand-secondary)] py-5">
          <Container>
            <nav
              aria-label={`${countryName} quick links`}
              className="flex flex-wrap gap-2 text-sm font-medium sm:gap-3"
            >
              {quickActions.map((action) => (
                <Link
                  key={action.href + action.title}
                  href={action.href}
                  className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-2.5 text-[var(--color-brand-primary)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--color-brand-secondary)]"
                >
                  {action.title}
                </Link>
              ))}
            </nav>
          </Container>
        </Section>
      ) : null}

      <HeroSection
        eyebrow={hero.eyebrow}
        title={hero.title}
        description={hero.description}
        primaryCta={hero.primaryCta ?? primaryBooking}
        secondaryCta={hero.secondaryCta}
        trustBadges={hero.trustBadges}
        heroImage={hero.heroImage}
        variant="split"
      />

      {availability ? (
        <Section className="bg-[var(--color-background-page)] py-10">
          <Container>
            <div className="rounded-[30px] bg-[var(--color-brand-primary)] p-8 text-[var(--color-brand-secondary)] shadow-[var(--shadow-elevated)] sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  {availability.eyebrow ? (
                    <p className="gh-heading-eyebrow text-white/90">
                      {availability.eyebrow}
                    </p>
                  ) : null}
                  <h2 className="gh-h2 mt-3 text-[var(--color-brand-secondary)]">
                    {availability.title}
                  </h2>
                  <p className="gh-body-lg mt-3 max-w-2xl text-white/90">
                    {availability.description}
                  </p>
                </div>
                <Link href={availability.cta.href} className="gh-btn bg-[var(--color-brand-secondary)] text-[var(--color-brand-primary)] hover:bg-white">
                  {availability.cta.label}
                </Link>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {about ? (
        <Section className="bg-[var(--color-brand-secondary)]">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
              <div>
                {about.eyebrow ? (
                  <p className="gh-kicker">
                    {about.eyebrow}
                  </p>
                ) : null}
                <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">
                  {about.title}
                </h2>
                <div className="gh-body mt-4 space-y-4 text-[var(--color-text-muted)]">
                  {about.description.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {about.highlight ? (
                  <p className="gh-body-lg mt-5 font-semibold text-[var(--color-text-primary)]">{about.highlight}</p>
                ) : null}
                {about.cta ? (
                  <Link href={about.cta.href} className="gh-btn gh-btn-outline mt-6">
                    {about.cta.label}
                  </Link>
                ) : null}
              </div>
              {about.image ? (
                <div className="overflow-hidden rounded-[30px] bg-[var(--color-background-soft)] p-2 shadow-[var(--shadow-elevated)]">
                  <Image
                    src={about.image.src}
                    alt={about.image.alt}
                    width={1200}
                    height={900}
                    className="h-auto w-full rounded-[24px] object-cover"
                  />
                </div>
              ) : null}
            </div>
          </Container>
        </Section>
      ) : null}

      <ServicesGrid title={servicesTitle} intro={servicesIntro} cta={servicesCta} items={services} />

      {steps?.length ? (
        <HowItWorks title="How does it work?" subtitle="Simple Scheduling in 3 Steps" steps={steps} />
      ) : null}

      {homeDelivery ? (
        <Section className="bg-[var(--color-brand-secondary)]">
          <Container>
            <div className="grid gap-8 rounded-[30px] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <h2 className="gh-h2 text-[var(--color-text-primary)]">
                  {homeDelivery.title}
                </h2>
                <p className="gh-body mt-4 max-w-2xl text-[var(--color-text-muted)]">{homeDelivery.description}</p>
                <Link href={homeDelivery.cta.href} className="gh-btn gh-btn-primary mt-6">
                  {homeDelivery.cta.label}
                </Link>
              </div>
              {homeDelivery.image ? (
                <div className="overflow-hidden rounded-[30px] bg-[var(--color-brand-secondary)] p-2 shadow-[var(--shadow-card)]">
                  <Image
                    src={homeDelivery.image.src}
                    alt={homeDelivery.image.alt}
                    width={1200}
                    height={900}
                    className="h-auto w-full rounded-[24px] object-cover"
                  />
                </div>
              ) : null}
            </div>
          </Container>
        </Section>
      ) : null}

      {doctorSpotlight ? (
        <Section className="bg-[var(--color-background-page)]">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              {doctorSpotlight.image ? (
                <div className="overflow-hidden rounded-[30px] bg-[var(--color-brand-secondary)] p-2 shadow-[var(--shadow-elevated)]">
                  <Image
                    src={doctorSpotlight.image.src}
                    alt={doctorSpotlight.image.alt}
                    width={900}
                    height={1100}
                    className="h-auto w-full rounded-[24px] object-cover"
                  />
                </div>
              ) : null}
              <div>
                <p className="gh-kicker">
                  Testimonials
                </p>
                <blockquote className="mt-4 text-[var(--text-h2)] font-extrabold tracking-tight text-[var(--color-text-primary)]">
                  &ldquo;{doctorSpotlight.quote}&rdquo;
                </blockquote>
                <p className="mt-5 text-lg font-semibold text-[var(--color-text-primary)]">{doctorSpotlight.name}</p>
                <p className="mt-1 text-sm font-medium text-[var(--color-brand-primary)]">{doctorSpotlight.title}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{doctorSpotlight.credential}</p>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {doctors.length > 0 ? (
        <section id="team">
          <DoctorsSection
            title={doctorsTitle}
            intro={`Meet clinicians connected to the ${countryName} clinic routes.`}
            doctors={doctors}
          />
        </section>
      ) : null}

      <TrustSignals title={trustTitle} subtitle={trustSubtitle} items={trustItems} />

      {faqs.length > 0 ? <FAQSection title={faqTitle} items={faqs} /> : null}

      <BookingCTA
        title={bookingCta?.title ?? "Ready to get started?"}
        description={bookingCta?.description ?? "Book an online consultation with your local clinic team."}
        ctaLabel={bookingCta?.ctaLabel ?? primaryBooking.label}
        ctaHref={bookingCta?.ctaHref ?? primaryBooking.href}
      />
    </>
  );
}
