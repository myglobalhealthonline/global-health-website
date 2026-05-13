import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { sanitizeServiceDetailHtml } from "@/lib/content/service-detail-format";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle,
  Clock,
  FileText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Tag,
  type LucideIcon,
} from "lucide-react";

type ServiceDetailTemplateProps = {
  title: string;
  description: string;
  body: string[];
  bodyHtml?: string | null;
  keyFacts?: Array<{ label: string; value: string }>;
  bookingHref: string;
  bookingLabel: string;
  imageSrc?: string;
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
          id="service-detail-plus-pattern"
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

      <rect width="100%" height="100%" fill="url(#service-detail-plus-pattern)" />
    </svg>
  );
}

function HeroInfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <Icon className="size-5 text-[var(--color-brand-accent)]" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{label}</p>
          <p className="mt-1 text-base font-bold leading-6 text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function KeyFactCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>

      <p className="mt-2 text-base font-extrabold leading-6 text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}

function SidebarFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
        <Icon className="size-5 text-[var(--color-brand-primary)]" />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="mt-1 text-lg font-extrabold leading-6 text-[var(--color-text-primary)]">
          {value}
        </p>
      </div>
    </div>
  );
}

export function ServiceDetailTemplate({
  title,
  description,
  body,
  bodyHtml,
  keyFacts = [],
  bookingHref,
  bookingLabel,
  imageSrc,
}: ServiceDetailTemplateProps) {
  const unoptimized =
    !!imageSrc && (/^https?:\/\//i.test(imageSrc) || imageSrc.startsWith("/api/media/"));

  const duration =
    keyFacts.find((fact) => /duration/i.test(fact.label))?.value ?? "Confirmed during booking";

  const price = keyFacts.find((fact) => /price/i.test(fact.label))?.value ?? "Shown before booking";

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden bg-[var(--color-brand-primary)] text-white">
        <HeroPlusPattern />

        <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 z-0 opacity-20" />
        <div className="absolute -right-40 top-0 z-0 size-[34rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 z-0 size-[30rem] rounded-full bg-[var(--color-brand-accent)]/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-black/15 to-transparent" />

        <Container className="relative z-10 py-16 sm:py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.86fr] lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
                <Stethoscope className="size-4" />
                Clinical service guide
              </span>

              <h1 className="mt-7 max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                {title}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
                {description}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <HeroInfoCard icon={Clock} label="Duration" value={duration} />
                <HeroInfoCard icon={Tag} label="Starting price" value={price} />
              </div>

              <div className="mt-9">
                <Link
                  href={bookingHref}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[var(--color-brand-primary)] shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-brand-accent)]"
                >
                  {bookingLabel}
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2.25rem] bg-white/10 blur-2xl" />

              <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.5rem] bg-white/10">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={title}
                      fill
                      className="object-cover"
                      unoptimized={unoptimized}
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      priority
                    />
                  ) : (
                    <div className="flex size-28 items-center justify-center rounded-[2rem] bg-white/10">
                      <Stethoscope className="size-14 text-[var(--color-brand-accent)]" />
                    </div>
                  )}

                  {imageSrc ? (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  ) : null}

                  <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-white/90 p-5 text-[var(--color-text-primary)] shadow-xl backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-brand-primary)]">
                          Service overview
                        </p>
                        <p className="mt-1 text-lg font-extrabold leading-6">
                          Review details before booking.
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

      {/* ===== CONTENT ===== */}
      <section className="bg-[var(--color-background-soft)] py-16 sm:py-20 lg:py-28">
        <Container>
          <article className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div className="space-y-8">
              {keyFacts.length > 0 ? (
                <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
                      <Sparkles className="size-6 text-[var(--color-brand-primary)]" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-primary)]">
                        Key facts
                      </p>
                      <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                        Service details
                      </h2>
                    </div>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2">
                    {keyFacts.map((fact) => (
                      <KeyFactCard key={fact.label} label={fact.label} value={fact.value} />
                    ))}
                  </dl>
                </div>
              ) : null}

              <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-7 shadow-sm sm:p-9 lg:p-12">
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
                    <FileText className="size-6 text-[var(--color-brand-primary)]" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-primary)]">
                      Guide
                    </p>
                    <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                      What to know
                    </h2>
                  </div>
                </div>

                {bodyHtml ? (
                  <div
                    className="prose prose-lg max-w-none text-[var(--color-text-muted)] prose-headings:text-[var(--color-text-primary)] prose-h2:mt-10 prose-h2:text-3xl prose-h2:font-extrabold prose-h3:mt-8 prose-h3:text-2xl prose-h3:font-bold prose-p:leading-8 prose-li:leading-8 prose-a:text-[var(--color-brand-primary)] prose-strong:text-[var(--color-text-primary)] [&_ul]:space-y-3 [&_ol]:space-y-3"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeServiceDetailHtml(bodyHtml),
                    }}
                  />
                ) : (
                  <div className="space-y-5">
                    {body.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-lg leading-9 text-[var(--color-text-muted)]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
                <div className="flex gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
                    <ShieldCheck className="size-6 text-[var(--color-brand-primary)]" />
                  </div>

                  <div>
                    <h2 className="text-xl font-extrabold text-[var(--color-text-primary)]">
                      Before booking
                    </h2>

                    <p className="mt-2 text-base leading-7 text-[var(--color-text-muted)]">
                      Review the service information carefully. If symptoms are urgent or severe,
                      use emergency or urgent care services instead of online booking.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== SIDEBAR ===== */}
            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                  Price and duration
                </p>

                <div className="mt-6 space-y-5">
                  <SidebarFact icon={Clock} label="Duration" value={duration} />
                  <SidebarFact icon={Tag} label="Starting price" value={price} />
                </div>

                <Link
                  href={bookingHref}
                  className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-90"
                >
                  <CalendarClock className="size-4" />
                  {bookingLabel}
                </Link>
              </div>

              <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                  Service guide
                </p>

                <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
                  This page explains the service, expected details, and booking information.
                </p>
              </div>
            </aside>
          </article>
        </Container>
      </section>

      {/* ===== MOBILE STICKY CTA ===== */}
      <div className="sticky bottom-0 z-40 border-t border-[var(--color-border)] bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
        <Link
          href={bookingHref}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3.5 text-sm font-bold text-white"
        >
          <CalendarClock className="size-4" />
          {bookingLabel}
        </Link>
      </div>
    </>
  );
}