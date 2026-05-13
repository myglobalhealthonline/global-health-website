import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { sanitizeDoctorBioHtml } from "@/lib/content/doctor-bio-format";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle,
  ExternalLink,
  GraduationCap,
  Languages,
  MapPin,
  ShieldCheck,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";

type DoctorProfileTemplateProps = {
  hero: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  profile: {
    name: string;
    title: string;
    country: string;
    languages: string[];
    bio: string;
    qualifications: string[];
    specialties: string[];
    imageLabel: string;
    imcRegistration?: string;
    medicalRegistrationUrl?: string;
  };
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
  profileImageSrc?: string;
  bookingCtaImage?: { src: string; alt: string };

  /**
   * Use this only with a real Doctify widget URL.
   * This avoids showing a fake per-doctor static score.
   */
  showReviewScore?: boolean;
  doctifyWidgetUrl?: string;
};

function HeroPlusPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-white opacity-[0.18] [mask-image:radial-gradient(circle_at_72%_28%,black,transparent_72%)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="doctor-profile-plus-pattern"
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

      <rect width="100%" height="100%" fill="url(#doctor-profile-plus-pattern)" />
    </svg>
  );
}

function DoctifyRatingWidget({ widgetUrl }: { widgetUrl?: string }) {
  if (!widgetUrl) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/15 bg-white shadow-xl shadow-black/10">
      <iframe
        title="Doctify live rating"
        src={widgetUrl}
        className="h-[132px] w-full border-0"
        loading="lazy"
      />
    </div>
  );
}

function MetaPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="size-5 text-[var(--color-brand-accent)]" />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{label}</p>
        <p className="mt-1 text-sm font-bold leading-5 text-white">{value}</p>
      </div>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-brand-primary)]/10">
          <Icon className="size-6 text-[var(--color-brand-primary)]" />
        </div>

        <h3 className="text-xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h3>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

function BulletList({
  items,
  emptyLabel,
}: {
  items: string[];
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="text-sm italic text-[var(--color-text-muted)]">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex gap-3 text-sm leading-6 text-[var(--color-text-body)]"
        >
          <span className="mt-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-primary)]/10">
            <CheckCircle className="size-3.5 text-[var(--color-brand-primary)]" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function DoctorProfileTemplate({
  hero,
  profile,
  bottomCta,
  profileImageSrc,
  bookingCtaImage,
  showReviewScore = false,
  doctifyWidgetUrl,
}: DoctorProfileTemplateProps) {
  const src = profileImageSrc ?? "/images/ireland/doctor-profile-fallback.png";
  const unoptimized = /^https?:\/\//i.test(src) || src.startsWith("/api/media/");

  const languageText = profile.languages.length ? profile.languages.join(", ") : "";
  const specialtyPreview = profile.specialties.slice(0, 4);

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden bg-[var(--color-brand-primary)] text-white">
        <HeroPlusPattern />

        <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0 -z-10 opacity-25" />
        <div className="absolute -right-40 top-0 -z-10 size-[34rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 -z-10 size-[30rem] rounded-full bg-[var(--color-brand-accent)]/20 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-black/15 to-transparent" />

        <Container className="relative z-10 py-16 sm:py-20 lg:py-28">
          {hero.secondaryCta ? (
            <Link
              href={hero.secondaryCta.href}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="size-4" />
              {hero.secondaryCta.label}
            </Link>
          ) : null}

          <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.82fr] lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-accent)] backdrop-blur">
                <UserRound className="size-4" />
                Doctor Profile
              </span>

              <h1 className="mt-7 max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                {profile.name}
              </h1>

              <p className="mt-4 max-w-2xl text-xl font-semibold leading-8 text-[var(--color-brand-accent)]">
                {profile.title}
              </p>

              {hero.description ? (
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
                  {hero.description}
                </p>
              ) : null}

              {specialtyPreview.length ? (
                <div className="mt-7 flex flex-wrap gap-2">
                  {specialtyPreview.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/90 backdrop-blur"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <MetaPill icon={MapPin} label="Location" value={profile.country} />
                <MetaPill icon={Languages} label="Languages" value={languageText} />
                <MetaPill
                  icon={ShieldCheck}
                  label="Registration"
                  value={profile.imcRegistration ? `IMC ${profile.imcRegistration}` : ""}
                />
              </div>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href={hero.primaryCta.href}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-accent)] px-8 py-4 text-base font-bold text-[var(--color-brand-primary)] shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-white"
                >
                  <CalendarClock className="size-5" />
                  {hero.primaryCta.label}
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>

                {profile.medicalRegistrationUrl ? (
                  <a
                    href={profile.medicalRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
                  >
                    <ExternalLink className="size-5" />
                    Medical registration
                  </a>
                ) : null}
              </div>

              {showReviewScore ? <DoctifyRatingWidget widgetUrl={doctifyWidgetUrl} /> : null}
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-4 -z-10 rounded-[2.25rem] bg-white/10 blur-2xl" />

              <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-white/10">
                  <Image
                    src={src}
                    alt={`Doctor portrait for ${profile.name}`}
                    fill
                    unoptimized={unoptimized}
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    priority
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                  <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-white/90 p-5 text-[var(--color-text-primary)] shadow-xl backdrop-blur">
                    <p className="text-sm font-semibold text-[var(--color-brand-primary)]">
                      {profile.imageLabel || "Clinician"}
                    </p>
                    <p className="mt-1 text-lg font-extrabold leading-6">{profile.name}</p>
                    <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                      {profile.title}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ===== MAIN PROFILE CONTENT ===== */}
      <Section variant="soft" className="py-20 sm:py-28 lg:py-32">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-start">
            <article className="rounded-[2rem] border border-[var(--color-border)] bg-white p-7 shadow-sm sm:p-9 lg:p-10">
              <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
                About Doctor
              </span>

              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                Expertise & Background
              </h2>

              <div className="mt-7">
                {profile.bio ? (
                  <div
                    className="prose prose-lg max-w-none text-[var(--color-text-body)] prose-headings:text-[var(--color-text-primary)] prose-p:leading-8 prose-a:text-[var(--color-brand-primary)] prose-strong:text-[var(--color-text-primary)]"
                    dangerouslySetInnerHTML={{ __html: sanitizeDoctorBioHtml(profile.bio) }}
                  />
                ) : (
                  <p className="text-base italic text-[var(--color-text-muted)]">
                    No bio available for this doctor.
                  </p>
                )}
              </div>
            </article>

            <aside className="space-y-6 lg:sticky lg:top-24">
              <div className="rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-sm">
                <h3 className="text-lg font-extrabold text-[var(--color-text-primary)]">
                  Profile details
                </h3>

                <div className="mt-5 space-y-4">
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-primary)]" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                        Country
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                        {profile.country}
                      </p>
                    </div>
                  </div>

                  {languageText ? (
                    <div className="flex gap-3">
                      <Languages className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-primary)]" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                          Languages
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                          {languageText}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {profile.imcRegistration ? (
                    <div className="flex gap-3">
                      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-primary)]" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                          IMC Registration
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                          {profile.imcRegistration}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <Link
                  href={hero.primaryCta.href}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-90"
                >
                  <CalendarClock className="size-4" />
                  {hero.primaryCta.label}
                </Link>
              </div>

              {profile.medicalRegistrationUrl ? (
                <a
                  href={profile.medicalRegistrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 text-sm font-bold text-[var(--color-text-primary)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="inline-flex items-center gap-2">
                    <ExternalLink className="size-4 text-[var(--color-brand-primary)]" />
                    Medical registration
                  </span>
                  <ArrowRight className="size-4 text-[var(--color-text-muted)]" />
                </a>
              ) : null}
            </aside>
          </div>
        </Container>
      </Section>

      {/* ===== QUALIFICATIONS & AREAS ===== */}
      <section className="bg-white py-20 sm:py-28 lg:py-32">
        <Container>
          <div className="mb-12 max-w-3xl">
            <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
              Clinical Information
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Qualifications & Consultation Areas
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DetailCard icon={GraduationCap} title="Qualifications">
              <BulletList items={profile.qualifications} emptyLabel="No qualifications listed." />
            </DetailCard>

            <DetailCard icon={Stethoscope} title="Consultation Areas">
              <BulletList items={profile.specialties} emptyLabel="No specialties listed." />
            </DetailCard>
          </div>
        </Container>
      </section>

      {/* ===== MOBILE STICKY CTA ===== */}
      <div className="sticky bottom-0 z-40 border-t border-[var(--color-border)] bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
        <Link
          href={hero.primaryCta.href}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3.5 text-sm font-bold text-white"
        >
          <CalendarClock className="size-4" />
          {hero.primaryCta.label}
        </Link>
      </div>

      {/* ===== FINAL CTA ===== */}
      <BookingCTA
        variant="doctor"
        eyebrow="Clinician booking"
        title={bottomCta.title}
        description={bottomCta.description}
        ctaLabel={bottomCta.ctaLabel}
        ctaHref={bottomCta.ctaHref}
        asideImage={bookingCtaImage}
        density="compact"
        showProofPoints={false}
      />
    </>
  );
}