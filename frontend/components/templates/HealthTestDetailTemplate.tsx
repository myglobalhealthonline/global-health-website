import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { BookingCTA } from "@/components/sections/BookingCTA";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FlaskConical,
  ImageIcon,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type ExtraSection = {
  heading: string;
  body: string;
};

type Props = {
  title: string;
  price: string;
  imageSrc: string;
  shortDescription?: string | null;
  detailIntro?: string | null;
  sampleType?: string | null;
  resultsTimeline?: string | null;
  whatThisTestCovers: string[];
  whyGetTested: string[];
  extraSections?: ExtraSection[] | null;
  galleryImagePaths?: string[];
  ctaLabel: string;
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
          id="health-test-plus-pattern"
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

      <rect width="100%" height="100%" fill="url(#health-test-plus-pattern)" />
    </svg>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
          <Icon className="size-5 text-[var(--color-brand-primary)]" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {label}
          </p>
          <p className="mt-1 text-base font-bold leading-6 text-[var(--color-text-primary)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ListCard({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: string[];
  icon: LucideIcon;
}) {
  if (!items.length) return null;

  return (
    <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
          <Icon className="size-6 text-[var(--color-brand-primary)]" />
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h2>
      </div>

      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-base leading-7 text-[var(--color-text-muted)]">
            <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-primary)]/10">
              <CheckCircle className="size-3.5 text-[var(--color-brand-primary)]" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExtraInfoCard({ heading, body }: ExtraSection) {
  return (
    <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
        {heading}
      </h2>

      <p className="mt-4 whitespace-pre-line text-base leading-8 text-[var(--color-text-muted)]">
        {body}
      </p>
    </div>
  );
}

export function HealthTestDetailTemplate({
  title,
  price,
  imageSrc,
  shortDescription,
  detailIntro,
  sampleType,
  resultsTimeline,
  whatThisTestCovers,
  whyGetTested,
  extraSections,
  galleryImagePaths = [],
  ctaLabel,
}: Props) {
  return (
    <>
      {/* ===== HERO / PRODUCT OVERVIEW ===== */}
      <section className="relative isolate overflow-hidden bg-[var(--color-brand-primary)] text-white">
        <HeroPlusPattern />

        <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 z-0 opacity-20" />
        <div className="absolute -right-40 top-0 z-0 size-[34rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 z-0 size-[30rem] rounded-full bg-[var(--color-brand-accent)]/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-black/15 to-transparent" />

        <Container className="relative z-10 py-16 sm:py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
            {/* Image */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-4 -z-10 rounded-[2.25rem] bg-white/10 blur-2xl" />

              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="flex aspect-square items-center justify-center rounded-[1.5rem] bg-white p-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt={title}
                    className="max-h-full w-full object-contain"
                    loading="eager"
                  />
                </div>
              </div>

              {galleryImagePaths.length > 0 ? (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {galleryImagePaths.map((path) => (
                    <div
                      key={path}
                      className="rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={path} alt="" className="h-16 w-full object-contain" loading="lazy" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Content */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
                <FlaskConical className="size-4" />
                Health Test
              </span>

              <h1 className="mt-7 max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                {title}
              </h1>

              <div className="mt-6 inline-flex rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur">
                <p className="text-3xl font-black text-white sm:text-4xl">{price}</p>
              </div>

              {shortDescription ? (
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
                  {shortDescription}
                </p>
              ) : null}

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                      <FlaskConical className="size-5 text-[var(--color-brand-accent)]" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
                        Sample type
                      </p>
                      <p className="mt-1 text-base font-bold leading-6 text-white">
                        {sampleType || "Details provided during booking"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                      <Clock className="size-5 text-[var(--color-brand-accent)]" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
                        Results timeline
                      </p>
                      <p className="mt-1 text-base font-bold leading-6 text-white">
                        {resultsTimeline || "Timeline provided during booking"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/book-online"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[var(--color-brand-primary)] shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-brand-accent)]"
                >
                  {ctaLabel}
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <section className="bg-[var(--color-background-soft)] py-20 sm:py-28 lg:py-32">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_0.38fr] lg:items-start">
            <div className="space-y-8">
              {detailIntro ? (
                <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-7 shadow-sm sm:p-9 lg:p-10">
                  <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
                    Overview
                  </span>

                  <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                    About this test
                  </h2>

                  <p className="mt-6 whitespace-pre-line text-lg leading-8 text-[var(--color-text-muted)]">
                    {detailIntro}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-8 xl:grid-cols-2">
                <ListCard
                  title="What this test covers"
                  items={whatThisTestCovers}
                  icon={ShieldCheck}
                />

                <ListCard title="Why get tested" items={whyGetTested} icon={Sparkles} />
              </div>

              {extraSections?.length ? (
                <div className="space-y-8">
                  {extraSections.map((section) => (
                    <ExtraInfoCard key={section.heading} {...section} />
                  ))}
                </div>
              ) : null}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-brand-primary)]">
                  Test summary
                </p>

                <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                  {title}
                </h3>

                <p className="mt-4 text-3xl font-black text-[var(--color-text-primary)]">{price}</p>

                <div className="mt-6 space-y-3">
                  <InfoPill icon={FlaskConical} label="Sample" value={sampleType} />
                  <InfoPill icon={Clock} label="Results" value={resultsTimeline} />
                  {galleryImagePaths.length > 0 ? (
                    <InfoPill
                      icon={ImageIcon}
                      label="Gallery"
                      value={`${galleryImagePaths.length} image${
                        galleryImagePaths.length === 1 ? "" : "s"
                      }`}
                    />
                  ) : null}
                </div>

                <Link
                  href="/book-online"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-90"
                >
                  {ctaLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* ===== MOBILE STICKY CTA ===== */}
      <div className="sticky bottom-0 z-40 border-t border-[var(--color-border)] bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
        <Link
          href="/book-online"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3.5 text-sm font-bold text-white"
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>

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