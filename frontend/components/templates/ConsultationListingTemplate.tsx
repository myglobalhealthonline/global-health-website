import { BookingCTA } from "@/components/sections/BookingCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { PricingCard } from "@/components/cards/PricingCard";
import { ConsultationDestinationCard } from "@/components/cards/ConsultationDestinationCard";
import { Container } from "@/components/layout/Container";
import {
  ArrowRight,
  CheckCircle,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
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
    imageSrc?: string;
    themeColor?: string;
    stats?: string;
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
  showReviewScore?: boolean;
  showFinalCta?: boolean;
  guidanceVariant?: "general" | "specialist" | "none";
  doctifyWidgetUrl?: string;
  heroImageSrc?: string;
  heroImageAlt?: string;
};

function HeroPlusPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full text-white opacity-[0.16] [mask-image:radial-gradient(circle_at_72%_30%,black,transparent_72%)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="consultation-listing-plus-pattern"
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M28 18v20M18 28h20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#consultation-listing-plus-pattern)" />
    </svg>
  );
}

function DoctifyRatingWidget({ widgetUrl }: { widgetUrl?: string }) {
  if (!widgetUrl) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-white/15 bg-white shadow-xl shadow-black/10">
      <iframe
        title="Doctify live rating"
        src={widgetUrl}
        className="h-[132px] w-full border-0"
        loading="lazy"
      />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">{eyebrow}</span>

      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-5 text-base leading-7 text-[var(--color-text-muted)] sm:text-lg sm:leading-8">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function GuidanceCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
        <Icon className="size-6 text-[var(--color-brand-primary)]" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-[var(--color-text-primary)]">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

function TrustCard({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
        <ShieldCheck className="size-6 text-[var(--color-brand-primary)]" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-[var(--color-text-primary)]">{title}</h3>

      {description ? (
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
      ) : null}
    </div>
  );
}

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
  showReviewScore = false,
  showFinalCta = true,
  guidanceVariant,
  doctifyWidgetUrl,
  heroImageSrc = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1600",
  heroImageAlt = "Doctor consultation",
}: ConsultationListingTemplateProps) {
  const isSpecialist = mode === "specialist";
  const effectiveGuidanceVariant = guidanceVariant ?? (isSpecialist ? "specialist" : "general");
  const primaryLabel = primaryCtaLabel ?? bookingLabel;

  const guidanceItems =
    effectiveGuidanceVariant === "specialist"
      ? [
          {
            icon: Search,
            title: "Choose the right specialty",
            desc: "Select the specialty that best matches your concern.",
          },
          {
            icon: ShieldCheck,
            title: "Check suitability",
            desc: "Some symptoms may need GP, urgent, or in-person care.",
          },
          {
            icon: CheckCircle,
            title: "Prepare before booking",
            desc: "Bring reports, medicines, photos, or referral details if relevant.",
          },
        ]
      : [
          {
            icon: CheckCircle,
            title: "Start with GP care",
            desc: "Suitable for common, non-emergency health concerns.",
          },
          {
            icon: ShieldCheck,
            title: "Know the limits",
            desc: "Emergency symptoms should be handled by urgent or emergency care.",
          },
          {
            icon: CheckCircle,
            title: "Prepare your details",
            desc: "Share symptoms, medicines, allergies, and relevant history.",
          },
        ];

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden bg-[var(--color-brand-primary)] text-white">
        <HeroPlusPattern />

        <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 z-0 opacity-20" />
        <div className="absolute -right-32 top-0 z-0 h-[32rem] w-[32rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 z-0 h-[28rem] w-[28rem] rounded-full bg-[var(--color-brand-accent)]/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-black/15 to-transparent" />

        <Container className="relative z-10 py-20 sm:py-28 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.95fr]">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
                {isSpecialist ? "Specialist consultations" : "GP consultations"}
              </span>

              <h1 className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                {title}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
                {description}
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href={bookingHref}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[var(--color-brand-primary)] shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-brand-accent)]"
                >
                  {primaryLabel}
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>

                {secondaryCta ? (
                  <Link
                    href={secondaryCta.href}
                    className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
                  >
                    {secondaryCta.label}
                  </Link>
                ) : isSpecialist ? (
                  <Link
                    href="/general-consultation-ie"
                    className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
                  >
                    Start with a GP
                  </Link>
                ) : null}
              </div>

              {showReviewScore ? <DoctifyRatingWidget widgetUrl={doctifyWidgetUrl} /> : null}
            </div>

            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-white/10 blur-2xl" />

              <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-black/20">
                  <img
                    src={heroImageSrc}
                    alt={heroImageAlt}
                    className="h-full w-full object-cover"
                    loading="eager"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                  <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-white/90 p-5 text-[var(--color-text-primary)] shadow-xl backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-brand-primary)]">
                          {isSpecialist ? "Specialist care" : "GP care"}
                        </p>
                        <p className="mt-1 text-lg font-extrabold">
                          Book online and prepare clearly.
                        </p>
                      </div>

                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-white">
                        <CheckCircle className="size-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ===== LISTING ===== */}
      <section className="bg-[var(--color-background-soft)] py-20 sm:py-28 lg:py-32">
        <Container>
          <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <SectionHeading
                eyebrow={isSpecialist ? "Browse by specialty" : "Available services"}
                title={isSpecialist ? "Choose your specialist" : "Book your consultation"}
              />

              <p className="max-w-2xl text-base leading-7 text-[var(--color-text-muted)] lg:ml-auto">
                {isSpecialist
                  ? "Compare the available specialties and choose the consultation that best matches your concern."
                  : "Select the service that matches your needs and book online in minutes."}
              </p>
            </div>

            {listing.length ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {listing.map((item) => (
                  <ConsultationDestinationCard
                    key={item.href}
                    href={item.href}
                    title={item.title}
                    description={item.description}
                    stats={
                      item.stats ??
                      [item.duration, item.startingPrice].filter(Boolean).join(" • ")
                    }
                    imageSrc={item.imageSrc}
                    themeColor={item.themeColor ?? "150 50% 25%"}
                    ctaLabel={isSpecialist ? "Explore" : "Learn more"}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </Container>
      </section>

      {/* ===== EXPLANATION ===== */}
      {explanation ? (
        <section className="bg-white py-20 sm:py-28 lg:py-32">
          <Container>
            <div className="grid overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background-soft)] shadow-sm lg:grid-cols-[0.85fr_1.15fr]">
              <div className="relative overflow-hidden bg-[var(--color-brand-primary)] p-8 text-white sm:p-10 lg:p-12">
                <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 opacity-25" />

                <div className="relative z-10">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)]">
                    <CheckCircle className="size-4" />
                    Good to know
                  </span>

                  <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
                    {explanation.title}
                  </h2>
                </div>
              </div>

              <div className="p-8 sm:p-10 lg:p-12">
                <p className="text-lg leading-8 text-[var(--color-text-muted)]">
                  {explanation.body}
                </p>

                <div className="mt-8">
                  <Link
                    href={bookingHref}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-90"
                  >
                    {primaryLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* ===== GUIDANCE ===== */}
      {effectiveGuidanceVariant !== "none" ? (
        <section className="bg-[var(--color-background-soft)] py-20 sm:py-28 lg:py-32">
          <Container>
            <div className="mb-12">
              <SectionHeading
                eyebrow="Before you book"
                title={
                  isSpecialist
                    ? "Prepare for your specialist consultation"
                    : "Prepare for your GP consultation"
                }
                description={
                  isSpecialist
                    ? "A few details can help make the appointment more useful."
                    : "Share the right context so the clinician can advise clearly."
                }
                align="center"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {guidanceItems.map(({ icon, title: itemTitle, desc }) => (
                <GuidanceCard
                  key={itemTitle}
                  icon={icon}
                  title={itemTitle}
                  description={desc}
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* ===== TRUST ===== */}
      {trust?.items.length ? (
        <section className="bg-white py-20 sm:py-28 lg:py-32">
          <Container>
            <div className="mb-12">
              <SectionHeading
                eyebrow="Why choose us"
                title={trust.title ?? "Trusted care, clearly explained"}
                description={trust.subtitle}
                align="center"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trust.items.map((item) => (
                <TrustCard
                  key={item.title}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* ===== PRICING ===== */}
      {pricing?.items.length ? (
        <section className="bg-[var(--color-background-soft)] py-20 sm:py-28 lg:py-32">
          <Container>
            <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8 lg:p-10">
              <div className="mb-12">
                <SectionHeading
                  eyebrow="Pricing"
                  title={pricing.title}
                  description={pricing.description}
                  align="center"
                />
              </div>

              <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
                {pricing.items.map((item) => (
                  <PricingCard key={item.name} {...item} />
                ))}
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* ===== HOW IT WORKS ===== */}
      {howItWorks ? (
        <HowItWorks
          title={howItWorks.title}
          subtitle={howItWorks.subtitle}
          steps={howItWorks.steps}
        />
      ) : null}

      {/* ===== FAQ ===== */}
      {faq?.items.length ? <FAQSection title={faq.title} items={faq.items} /> : null}

      {/* ===== FINAL CTA ===== */}
      {showFinalCta ? (
        <BookingCTA
          variant="full"
          eyebrow={isSpecialist ? "Specialist booking" : "GP booking"}
          title={isSpecialist ? "Find the right specialist" : "Choose a GP consultation"}
          description={
            isSpecialist
              ? "Review the specialty options and book the route that best matches your concern."
              : "Choose the consultation type that matches your concern and complete the intake form."
          }
          ctaLabel={bookingLabel}
          ctaHref={bookingHref}
        />
      ) : null}
    </>
  );
}