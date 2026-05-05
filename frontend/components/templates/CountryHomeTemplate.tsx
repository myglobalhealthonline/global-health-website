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

type CountryHomeTemplateProps = {
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
        <Section className="bg-white py-6">
          <Container>
            <nav aria-label={`${countryName} quick links`} className="flex flex-wrap gap-3 text-sm font-medium">
              {quickActions.map((action) => (
                <Link
                  key={action.href + action.title}
                  href={action.href}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-slate-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
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
      />

      {availability ? (
        <Section className="bg-slate-50 py-10">
          <Container>
            <div className="rounded-3xl border border-cyan-100 bg-white p-8 shadow-sm sm:p-10">
              {availability.eyebrow ? (
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  {availability.eyebrow}
                </p>
              ) : null}
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {availability.title}
              </h2>
              <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">{availability.description}</p>
              <Link
                href={availability.cta.href}
                className="mt-6 inline-flex min-h-12 items-center rounded-full bg-cyan-700 px-7 text-sm font-semibold text-white transition-colors hover:bg-cyan-800"
              >
                {availability.cta.label}
              </Link>
            </div>
          </Container>
        </Section>
      ) : null}

      {about ? (
        <Section>
          <Container>
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                {about.eyebrow ? (
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">{about.eyebrow}</p>
                ) : null}
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  {about.title}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                  {about.description.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {about.highlight ? (
                  <p className="mt-5 text-lg font-semibold text-slate-900">{about.highlight}</p>
                ) : null}
                {about.cta ? (
                  <Link
                    href={about.cta.href}
                    className="mt-6 inline-flex min-h-12 items-center rounded-full border border-cyan-700 px-7 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
                  >
                    {about.cta.label}
                  </Link>
                ) : null}
              </div>
              {about.image ? (
                <div className="overflow-hidden rounded-3xl border border-cyan-100 bg-cyan-50 p-2 shadow-sm">
                  <Image
                    src={about.image.src}
                    alt={about.image.alt}
                    width={1200}
                    height={900}
                    className="h-auto w-full rounded-2xl object-cover"
                  />
                </div>
              ) : null}
            </div>
          </Container>
        </Section>
      ) : null}

      <ServicesGrid title={servicesTitle} intro={servicesIntro} cta={servicesCta} items={services} />

      {steps?.length ? <HowItWorks title="How does it work?" subtitle="Simple Scheduling in 3 Steps" steps={steps} /> : null}

      {homeDelivery ? (
        <Section>
          <Container>
            <div className="grid gap-8 rounded-3xl bg-slate-50 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  {homeDelivery.title}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{homeDelivery.description}</p>
                <Link
                  href={homeDelivery.cta.href}
                  className="mt-6 inline-flex min-h-12 items-center rounded-full bg-cyan-700 px-7 text-sm font-semibold text-white transition-colors hover:bg-cyan-800"
                >
                  {homeDelivery.cta.label}
                </Link>
              </div>
              {homeDelivery.image ? (
                <div className="overflow-hidden rounded-3xl border border-cyan-100 bg-white p-2 shadow-sm">
                  <Image
                    src={homeDelivery.image.src}
                    alt={homeDelivery.image.alt}
                    width={1200}
                    height={900}
                    className="h-auto w-full rounded-2xl object-cover"
                  />
                </div>
              ) : null}
            </div>
          </Container>
        </Section>
      ) : null}

      {doctorSpotlight ? (
        <Section className="bg-slate-50">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              {doctorSpotlight.image ? (
                <div className="overflow-hidden rounded-3xl border border-cyan-100 bg-white p-2 shadow-sm">
                  <Image
                    src={doctorSpotlight.image.src}
                    alt={doctorSpotlight.image.alt}
                    width={900}
                    height={1100}
                    className="h-auto w-full rounded-2xl object-cover"
                  />
                </div>
              ) : null}
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Doctor spotlight</p>
                <blockquote className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  “{doctorSpotlight.quote}”
                </blockquote>
                <p className="mt-5 text-lg font-semibold text-slate-900">{doctorSpotlight.name}</p>
                <p className="mt-1 text-sm font-medium text-cyan-700">{doctorSpotlight.title}</p>
                <p className="mt-1 text-sm text-slate-600">{doctorSpotlight.credential}</p>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      <section id="team">
        <DoctorsSection title={doctorsTitle} intro={`Meet clinicians connected to the ${countryName} clinic routes.`} doctors={doctors} />
      </section>

      <TrustSignals title={trustTitle} subtitle={trustSubtitle} items={trustItems} />

      <FAQSection title={faqTitle} items={faqs} />

      <BookingCTA
        title={bookingCta?.title ?? "Ready to get started?"}
        description={bookingCta?.description ?? "Book an online consultation with your local clinic team."}
        ctaLabel={bookingCta?.ctaLabel ?? primaryBooking.label}
        ctaHref={bookingCta?.ctaHref ?? primaryBooking.href}
      />
    </>
  );
}
