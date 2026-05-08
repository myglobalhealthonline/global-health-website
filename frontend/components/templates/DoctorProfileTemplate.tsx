import Image from "next/image";
import Link from "next/link";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { sanitizeDoctorBioHtml } from "@/lib/content/doctor-bio-format";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  GraduationCap,
  Languages,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Star,
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
   * Whether to render the static star/review score block in the hero section.
   * Defaults to `false` — the 4.94 score is not per-doctor data and showing it
   * on every profile implies individual rating data that does not exist.
   */
  showReviewScore?: boolean;
};

export function DoctorProfileTemplate({
  hero,
  profile,
  bottomCta,
  profileImageSrc,
  bookingCtaImage,
  showReviewScore = false,
}: DoctorProfileTemplateProps) {
  const src = profileImageSrc ?? "/images/ireland/doctor-profile-fallback.png";
  const unoptimized = /^https?:\/\//i.test(src) || src.startsWith("/api/media/");

  return (
    <>
      {/* ── Hero: green background with doctor image + info ── */}
      <section className="relative overflow-hidden bg-[var(--color-brand-primary)]">
        {/* SVG pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.03] translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white/[0.03] -translate-x-1/3 translate-y-1/3" />

        <Container className="relative py-12 sm:py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* Left: portrait */}
            <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] shadow-2xl">
                <Image
                  src={src}
                  alt={`Doctor portrait for ${profile.name}`}
                  fill
                  unoptimized={unoptimized}
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>

            {/* Right: info */}
            <div className="text-white">
              {/* Back link */}
              {hero.secondaryCta ? (
                <Link
                  href={hero.secondaryCta.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20 mb-5"
                >
                  <ArrowLeft className="size-3.5" />
                  {hero.secondaryCta.label}
                </Link>
              ) : null}

              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-accent)] border border-white/10">
                Doctor Profile
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight leading-[1.1] text-white sm:text-4xl lg:text-[3rem]">
                {profile.name}
              </h1>
              <p className="mt-2 text-lg font-semibold text-[var(--color-brand-accent)]">
                {profile.title}
              </p>

              {/* Meta row */}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-[var(--color-brand-accent)]" />
                  {profile.country}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Languages className="size-4 text-[var(--color-brand-accent)]" />
                  {profile.languages.join(", ")}
                </span>
                {profile.imcRegistration ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-[var(--color-brand-accent)]" />
                    IMC {profile.imcRegistration}
                  </span>
                ) : null}
              </div>

              {/* Specialty tags */}
              {profile.specialties.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-medium text-white/90"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA row */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={hero.primaryCta.href}
                  className="gh-btn bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)] hover:bg-white"
                >
                  <CalendarClock className="size-4" />
                  {hero.primaryCta.label}
                </Link>
                {profile.medicalRegistrationUrl ? (
                  <a
                    href={profile.medicalRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gh-btn border-2 border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  >
                    <ExternalLink className="size-4" />
                    Medical registration
                  </a>
                ) : null}
              </div>

              {/* Static star rating — only shown when real per-doctor score data is available. */}
              {showReviewScore ? (
                <div className="mt-5 flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="size-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-white">4.94</span>
                  <span className="text-sm text-white/70">— verified patients</span>
                </div>
              ) : null}
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

      {/* ── About Doctor ── */}
      <Section className="bg-white">
        <Container>
          <div className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
              About Doctor
            </span>
            <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">
              Expertise & Background
            </h2>

            {/* Bio */}
            <div className="mt-6">
              {profile.bio ? (
                <div
                  className="prose prose-lg max-w-none text-[var(--color-text-body)] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeDoctorBioHtml(profile.bio) }}
                />
              ) : (
                <p className="text-base italic text-[var(--color-text-muted)]">
                  No bio available for this doctor.
                </p>
              )}
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Qualifications & Areas ── */}
      <Section className="bg-[var(--color-background-soft)]">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Qualifications */}
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-background-soft)] ring-1 ring-[var(--color-border)]">
                    <GraduationCap className="size-5 text-[var(--color-brand-primary)]" />
                  </span>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Qualifications</h3>
                </div>
                <ul className="mt-4 space-y-2">
                  {profile.qualifications.length > 0 ? (
                    profile.qualifications.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-body)]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-primary)]" />
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm italic text-[var(--color-text-muted)]">No qualifications listed.</li>
                  )}
                </ul>
              </div>

              {/* Consultation areas */}
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-background-soft)] ring-1 ring-[var(--color-border)]">
                    <Stethoscope className="size-5 text-[var(--color-brand-primary)]" />
                  </span>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Consultation Areas</h3>
                </div>
                <ul className="mt-4 space-y-2">
                  {profile.specialties.length > 0 ? (
                    profile.specialties.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-text-body)]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-primary)]" />
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm italic text-[var(--color-text-muted)]">No specialties listed.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Compact inline booking CTA — no proof pills to avoid repetition with the hero CTA. */}
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
