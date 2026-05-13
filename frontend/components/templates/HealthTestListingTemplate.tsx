import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { BookingCTA } from "@/components/sections/BookingCTA";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";

type Item = {
  title: string;
  shortDescription: string;
  price: string;
  imageSrc: string;
  sampleType?: string | null;
  resultsTimeline?: string | null;
  href: string;
  ctaLabel: string;
};

type Props = {
  title: string;
  description: string;
  items: Item[];
};

function HeroPlusPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full text-white opacity-[0.14] [mask-image:radial-gradient(circle_at_70%_35%,black,transparent_70%)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="health-test-listing-plus-pattern-clean"
          width="52"
          height="52"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M26 17v18M17 26h18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#health-test-listing-plus-pattern-clean)" />
    </svg>
  );
}

function MetaChip({
  icon: Icon,
  children,
}: {
  icon: typeof FlaskConical;
  children: React.ReactNode;
}) {
  if (!children) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
      <Icon className="size-3.5 text-[var(--color-brand-primary)]" />
      {children}
    </span>
  );
}

function HealthTestCard({ item }: { item: Item }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link
        href={item.href}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[var(--color-background-soft)] p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-[var(--color-brand-primary)]/5" />

        <div className="absolute right-6 top-6 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-brand-primary)] shadow-sm">
          {item.price}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageSrc}
          alt={item.title}
          className="relative z-10 max-h-[230px] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          loading="lazy"
        />
      </Link>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="mb-4 flex flex-wrap gap-2">
          {item.sampleType ? (
            <MetaChip icon={FlaskConical}>{item.sampleType}</MetaChip>
          ) : null}

          {item.resultsTimeline ? (
            <MetaChip icon={Clock}>{item.resultsTimeline}</MetaChip>
          ) : null}
        </div>

        <Link href={item.href}>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-primary)]">
            {item.title}
          </h2>
        </Link>

        <p className="mt-4 line-clamp-3 text-base leading-7 text-[var(--color-text-muted)]">
          {item.shortDescription}
        </p>

        <div className="mt-auto pt-7">
          <Link
            href={item.href}
            className="group/btn inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
          >
            {item.ctaLabel}
            <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function HealthTestListingTemplate({ title, description, items }: Props) {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden bg-[var(--color-brand-primary)] text-white">
        <HeroPlusPattern />

        <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 z-0 opacity-20" />
        <div className="absolute -right-40 top-0 z-0 size-[32rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 z-0 size-[28rem] rounded-full bg-[var(--color-brand-accent)]/20 blur-3xl" />

        <Container className="relative z-10 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
              <FlaskConical className="size-4" />
              Home Health Tests
            </span>

            <h1 className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {title}
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
              {description}
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="#health-tests"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[var(--color-brand-primary)] shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-brand-accent)]"
              >
                View tests
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ===== TEST GRID ===== */}
      <section id="health-tests" className="bg-[var(--color-background-soft)] py-20 sm:py-28 lg:py-32">
        <Container>
          <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
                Available tests
              </span>

              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                Choose a health test
              </h2>
            </div>

            {items.length > 0 ? (
              <p className="text-sm font-semibold text-[var(--color-text-muted)]">
                {items.length === 1 ? "1 test available" : `${items.length} tests available`}
              </p>
            ) : null}
          </div>

          {items.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <HealthTestCard key={item.href} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[var(--color-border)] bg-white p-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
                <FlaskConical className="size-7 text-[var(--color-brand-primary)]" />
              </div>

              <h3 className="mt-5 text-xl font-extrabold text-[var(--color-text-primary)]">
                No health tests available
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-[var(--color-text-muted)]">
                Add items to the health test listing to populate this page.
              </p>
            </div>
          )}
        </Container>
      </section>

      {/* ===== TRUST STRIP ===== */}
      <section className="border-y border-[var(--color-border)] bg-white">
        <Container className="py-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-primary)]/10">
                <CheckCircle className="size-5 text-[var(--color-brand-primary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Clear test details
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-primary)]/10">
                <FlaskConical className="size-5 text-[var(--color-brand-primary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Sample information shown
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-primary)]/10">
                <ShieldCheck className="size-5 text-[var(--color-brand-primary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Online booking available
              </p>
            </div>
          </div>
        </Container>
      </section>

      <BookingCTA
        variant="compact"
        eyebrow="Start Your Online Consultation"
        title="Choose your country and connect with a licensed doctor in minutes"
        description="100% online, no waiting rooms, confidential."
        ctaLabel="Start Consultation"
        ctaHref="/general-consultation-ie"
      />
    </>
  );
}