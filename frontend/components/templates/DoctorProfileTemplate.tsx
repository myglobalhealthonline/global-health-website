import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  Globe,
  MapPin,
  ShieldCheck,
  Stethoscope,
  User,
  Video,
} from "lucide-react";
import { sanitizeDoctorBioHtml } from "@/lib/content/doctor-bio-format";
import { focalStyle } from "@/components/media/doctor-photo";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";

/* ─── Types ──────────────────────────────────────────────────────────────── */
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
    registrationChamber?: string;
    registrationDivision?: string;
    registrationVerified?: boolean;
    medicalRegistrationUrl?: string;
    verificationUrl?: string;
    regulatorName?: string | null;
    credentials?: Array<{ label: string; bodyName: string; bodyUrl?: string }>;
    faqs?: Array<{ id: string; question: string; answer: string; category?: string | null }>;
    imageAltText?: string;
    imageTitle?: string;
    imageCaption?: string;
    imageDescription?: string;
    /** Pre-formatted, already-localized "Last reviewed" date (e.g.
     *  "24 July 2026") — caller formats it the same way the blog byline
     *  does. Absent when the admin hasn't set `lastReviewedAt` — never a
     *  fabricated fallback. */
    reviewedDate?: string;
  };
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
  profileImageSrc?: string;
  profileImageFocalX?: number;
  profileImageFocalY?: number;
  profileImageZoom?: number;
  bookingCtaImage?: { src: string; alt: string };
  showReviewScore?: boolean;
  doctifyWidgetUrl?: string;
  t?: {
    backToTeam?: string;
    doctorProfileLabel?: string;
    registeredIn?: string;
    onlineConsultAvailable?: string;
    verifiedProfile?: string;
    lastReviewedLabel?: string;
    verifyRegistration?: string;
    primaryCareConsults?: string;
    languagesLabel?: string;
    availabilityLabel?: string;
    onlineAppointments?: string;
    profileEyebrow?: string;
    aboutHeadingTemplate?: string;
    qualificationsLabel?: string;
    faqsLabel?: string;
    bookThisClinicianLabel?: string;
    openVideoSlotsHeading?: string;
    calendarInviteBody?: string;
    generalPracticeFallback?: string;
    /** Bottom-CTA eyebrow + Doctify iframe title — were English literals. */
    nextStep?: string;
    patientReviews?: string;
  };
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export function DoctorProfileTemplate({
  hero,
  profile,
  bottomCta,
  profileImageSrc,
  profileImageFocalX = 50,
  profileImageFocalY = 50,
  profileImageZoom = 1,
  doctifyWidgetUrl,
  t,
}: DoctorProfileTemplateProps) {
  const safeBio = sanitizeDoctorBioHtml(profile.bio);
  const heroImageStyle = focalStyle(profileImageFocalX, profileImageFocalY, profileImageZoom);
  const backHref = hero.secondaryCta?.href;
  // Doctor's own registration link wins — a doctor whose registration body
  // differs from the country's default regulator (e.g. a Spanish
  // psychologist registered with COP, not CGCOM) sets medicalRegistrationUrl
  // to their own body's site; the generic country verificationUrl is only a
  // fallback. Mirrors the same-priority fix in DoctorCard.tsx.
  const verifyHref = profile.medicalRegistrationUrl ?? profile.verificationUrl;
  const primarySpecialty = profile.title || profile.specialties[0] || (t?.generalPracticeFallback ?? "General practice");
  const languageList = profile.languages.length > 0 ? profile.languages.join(", ") : "English";

  return (
    <section className="bg-[var(--color-background-page)]">

      {/* ── HERO — 50/50 split; grows naturally on short viewports ── */}
      <section
        className="gh-inline-split-hero gh-medical-pattern gh-medical-pattern-dark relative isolate !overflow-visible"
      >
        {/* Mobile/tablet only — full-bleed tinted portrait behind the text,
         *  same treatment as the team page hero: text sits in front of the
         *  photo instead of the photo being hidden below lg. */}
        {profileImageSrc ? (
          <div aria-hidden className="gh-medical-pattern-layer absolute inset-0 lg:hidden">
            <Image
              src={profileImageSrc}
              alt=""
              fill
              sizes="100vw"
              priority
              style={heroImageStyle}
              unoptimized={isUnoptimizedImageSrc(profileImageSrc)}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(3,31,24,0.62) 0%, rgba(3,31,24,0.78) 45%, rgba(3,31,24,0.96) 100%)," +
                  "linear-gradient(90deg, rgba(3,31,24,0.55) 0%, rgba(3,31,24,0.35) 55%, rgba(3,31,24,0.20) 100%)",
              }}
            />
          </div>
        ) : null}

        <div className="relative grid h-auto lg:grid-cols-2">

          {/* ── LEFT — full-bleed doctor portrait (desktop only) ── */}
          <div className="relative hidden h-full overflow-hidden lg:block">
            {/* Oversized "Doctor" watermark behind portrait */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden select-none"
            >
              <span
                className="gh-inline-doctor-watermark"
              >
                Doctor
              </span>
            </div>

            {profileImageSrc ? (
              <Image
                src={profileImageSrc}
                alt={profile.imageAltText ?? profile.name}
                title={profile.imageTitle ?? undefined}
                aria-describedby={
                  profile.imageCaption || profile.imageDescription
                    ? "doctor-profile-image-description"
                    : undefined
                }
                fill
                sizes="(min-width:1024px) 50vw, 100vw"
                priority
                className="z-[1]"
                style={heroImageStyle}
                unoptimized={
                  /^https?:\/\//i.test(profileImageSrc) ||
                  profileImageSrc.startsWith("/api/media/")
                }
              />
            ) : (
              <div
                className="gh-inline-doctor-image-fallback absolute inset-0"
              />
            )}
            {profile.imageCaption || profile.imageDescription ? (
              <p id="doctor-profile-image-description" className="sr-only">
                {[profile.imageCaption, profile.imageDescription].filter(Boolean).join(" ")}
              </p>
            ) : null}

            {/* Subtle green wash */}
            <div
              aria-hidden
              className="gh-inline-hero-overlay pointer-events-none absolute inset-0"
            />
            {/* Bottom vignette */}
            <div
              aria-hidden
              className="gh-inline-doctor-vignette pointer-events-none absolute inset-x-0 bottom-0"
            />
            {/* Right-edge bleed → content column */}
            <div
              aria-hidden
              className="gh-inline-doctor-bleed pointer-events-none absolute inset-y-0 right-0 hidden lg:block"
            />
          </div>

          {/* ── RIGHT — profile content ── */}
          <div
            className="gh-inline-panel-base relative flex h-auto flex-col justify-center overflow-visible px-8 py-6 md:px-12 lg:px-14 lg:py-8"
          >
            {/* Layer 1 — gradient depth. Desktop only: at mobile the panel
                 background is the real profile photo (above), and this
                 opaque gradient would paint over it. */}
            <div
              aria-hidden
              className="gh-inline-panel-depth pointer-events-none absolute inset-0 z-0 hidden lg:block"
            />
            {/* Layer 2 — technical lime grid */}
            <div
              aria-hidden
              className="gh-inline-doctor-grid pointer-events-none absolute inset-0 z-0"
            />
            {/* Layer 3 — dot texture */}
            <div
              aria-hidden
              className="gh-dot-grid gh-inline-panel-dots pointer-events-none absolute inset-0 z-0"
            />
            {/* Layer 4 — lime ambient glow */}
            <div
              aria-hidden
              className="gh-inline-doctor-glow pointer-events-none absolute inset-0 z-0"
            />
            {/* Layer 5 — faint plus symbols */}
            <span
              aria-hidden
              className="gh-inline-plus-large pointer-events-none absolute z-0 select-none font-bold leading-none"
            >+</span>
            <span
              aria-hidden
              className="gh-inline-plus-small pointer-events-none absolute z-0 select-none font-bold leading-none"
            >+</span>

            {/* Content stays at its natural size; the document owns scrolling. */}
            <div className="gh-inline-content-max relative z-10">

              {/* Top nav pills */}
              <div className="flex flex-wrap items-center gap-2">
                {backHref ? (
                  <Link
                    href={backHref}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/6 px-4 py-2 text-[12.5px] font-semibold text-white/65 transition-colors duration-200 hover:bg-white/10"
                  >
                    <ArrowLeft className="size-3.5 shrink-0" strokeWidth={2} />
                    {(t?.backToTeam ?? "Back to {country} team").replace("{country}", profile.country)}
                  </Link>
                ) : null}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/6 px-4 py-2 text-[12.5px] font-semibold text-white/65"
                >
                  <User className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                  {t?.doctorProfileLabel ?? "Doctor Profile"}
                </span>
              </div>

              {/* Name */}
              <h1
                className="mt-5 text-[clamp(2.4rem,3.2vw+0.8rem,4.2rem)] font-extrabold leading-[1.0] tracking-[-0.038em] text-[#F5FFF8]"
              >
                {profile.name}
              </h1>

              {/* Role */}
              <p
                className="mt-2 text-[clamp(11px,0.9vw,14px)] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]"
              >
                {profile.title}
              </p>

              {/* Description */}
              {hero.description ? (
                <p
                  className="mt-3 max-w-[46ch] text-[clamp(0.88rem,0.5vw+0.72rem,1rem)] leading-relaxed text-[#B8C9C2]"
                >
                  {hero.description}
                </p>
              ) : null}

              {/* Tag pills — specialty / country / languages */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(167,243,11,0.20)] bg-[rgba(5,34,27,0.78)] px-3.5 py-1.5 text-[12.5px] font-medium text-white/80"
                >
                  <Stethoscope className="size-3.5 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={1.8} aria-hidden />
                  {primarySpecialty}
                </span>
                {profile.country ? (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(167,243,11,0.20)] bg-[rgba(5,34,27,0.78)] px-3.5 py-1.5 text-[12.5px] font-medium text-white/80"
                  >
                    <MapPin className="size-3.5 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={1.8} aria-hidden />
                    {profile.country}
                  </span>
                ) : null}
                {profile.languages.length > 0 ? (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(167,243,11,0.20)] bg-[rgba(5,34,27,0.78)] px-3.5 py-1.5 text-[12.5px] font-medium text-white/80"
                  >
                    <Globe className="size-3.5 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={1.8} aria-hidden />
                    {languageList}
                  </span>
                ) : null}
              </div>

              {/* Trust badge row */}
              <div
                className="mt-4 flex flex-wrap items-center gap-y-2 border-t border-white/10 pt-4"
              >
                {[
                  { Icon: ShieldCheck, label: (t?.registeredIn ?? "Registered in {country}").replace("{country}", profile.country) },
                  { Icon: Video, label: t?.onlineConsultAvailable ?? "Online consultation available" },
                  { Icon: BadgeCheck, label: t?.verifiedProfile ?? "Verified profile" },
                  // Admin-set only (see profile.reviewedDate) — omitted, not a
                  // fabricated fallback, when no one has reviewed this profile yet.
                  ...(profile.reviewedDate
                    ? [
                        {
                          Icon: CalendarDays,
                          label: `${t?.lastReviewedLabel ?? "Last reviewed"} ${profile.reviewedDate}`,
                        },
                      ]
                    : []),
                ].map(({ Icon, label }, i) => (
                  <span key={label} className="flex items-center">
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="mx-4 hidden h-4 w-px bg-white/14 sm:block"
                      />
                    ) : null}
                    <span
                      className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white/65"
                    >
                      <Icon
                        className="size-3.5 shrink-0 text-[var(--color-brand-accent)]"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      {label}
                    </span>
                  </span>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href={hero.primaryCta.href}
                  className="gh2-btn-lime shadow-[0_4px_24px_rgba(167,243,11,0.28)]"
                >
                  <CalendarDays className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                  {hero.primaryCta.label}
                </Link>

                {verifyHref ? (
                  <a
                    href={verifyHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gh2-btn-ghost"
                  >
                    <ExternalLink className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                    {t?.verifyRegistration ?? "Verify registration"}
                  </a>
                ) : hero.secondaryCta ? (
                  <Link href={hero.secondaryCta.href} className="gh2-btn-ghost">
                    {hero.secondaryCta.label}
                  </Link>
                ) : null}
              </div>

              {/* Detail cards */}
              <ul className="mt-5 grid grid-cols-3 gap-2.5">
                {[
                  {
                    icon: <Stethoscope className="size-5" strokeWidth={1.6} aria-hidden />,
                    title: primarySpecialty,
                    subtitle: t?.primaryCareConsults ?? "Primary care consultations",
                  },
                  {
                    icon: <Globe className="size-5" strokeWidth={1.6} aria-hidden />,
                    title: t?.languagesLabel ?? "Languages",
                    subtitle: languageList,
                  },
                  {
                    icon: <CalendarDays className="size-5" strokeWidth={1.6} aria-hidden />,
                    title: t?.availabilityLabel ?? "Availability",
                    subtitle: t?.onlineAppointments ?? "Online appointments",
                  },
                ].map((card) => (
                  <li
                    key={card.title}
                    className="gh-inline-doctor-glass rounded-[16px] px-3.5 py-3.5"
                  >
                    <span
                      className="inline-flex size-8 items-center justify-center rounded-[8px] border border-[rgba(167,243,11,0.18)] bg-[rgba(167,243,11,0.13)] text-[var(--color-brand-accent)]"
                    >
                      {card.icon}
                    </span>
                    <p className="mt-2.5 text-[13px] font-bold leading-tight text-white">
                      {card.title}
                    </p>
                    <p
                      className="mt-1 text-[11.5px] leading-snug text-white/50"
                    >
                      {card.subtitle}
                    </p>
                  </li>
                ))}
              </ul>

            </div>
          </div>

        </div>
      </section>

      {/* ── BODY — long-form bio + sticky booking ── */}
      <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel py-[clamp(56px,7vw,96px)]">
        <SectionSeam theme="light" />
        <div className="gh-container grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-24">
          <article>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-primary)]"
            >
              {t?.profileEyebrow ?? "Profile"}
            </p>
            <h2
              className="mt-4 text-[clamp(1.85rem,3.5vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--color-text-primary)]"
            >
              {(t?.aboutHeadingTemplate ?? "About {name}").replace(
                "{name}",
                profile.name.split(" ").slice(0, 2).join(" "),
              )}
            </h2>
            <div
              className="mt-8 break-words text-[16px] leading-[1.85] text-[var(--color-text-body)] [&_a]:underline [&_a]:underline-offset-2 [&_p:first-child]:mt-0 [&_p]:mt-5 [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-2"
              // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- safeBio = sanitizeDoctorBioHtml(profile.bio), sanitize-html with a controlled allowlist (frontend/lib/content/doctor-bio-format.ts).
              dangerouslySetInnerHTML={{ __html: safeBio }}
            />

            {profile.qualifications.length > 0 ? (
              <div
                className="mt-14 border-t border-[rgba(29,75,54,0.12)] pt-10"
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-primary)]"
                >
                  {t?.qualificationsLabel ?? "Qualifications"}
                </p>
                <ul className="mt-6 space-y-3 text-[15px] leading-[1.7] text-[var(--color-text-body)]">
                  {profile.qualifications.map((q) => (
                    <li key={q} className="flex items-start gap-3">
                      <span
                        className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[#8FB021]"
                      />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {doctifyWidgetUrl ? (
              <div
                className="mt-12 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6"
              >
                <iframe
                  src={doctifyWidgetUrl}
                  title={t?.patientReviews ?? ""}
                  className="h-[220px] w-full"
                  loading="lazy"
                />
              </div>
            ) : null}

            {profile.faqs && profile.faqs.length > 0 ? (
              <div
                className="mt-14 border-t border-[rgba(29,75,54,0.12)] pt-10"
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-primary)]"
                >
                  {t?.faqsLabel ?? "FAQs"}
                </p>
                <div className="mt-6 grid gap-3">
                  {profile.faqs.map((faq) => (
                    <details
                      key={faq.id}
                      className="rounded-[12px] border border-[var(--color-border)] bg-white p-4"
                    >
                      <summary className="cursor-pointer text-[15px] font-bold text-[var(--color-text-primary)]">
                        {faq.question}
                      </summary>
                      <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-card)] md:p-10"
            >
              <span
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-primary)]"
              >
                {t?.bookThisClinicianLabel ?? "Book this clinician"}
              </span>
              <h3
                className="mt-4 text-[clamp(1.4rem,2.5vw,1.85rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[var(--color-text-primary)]"
              >
                {t?.openVideoSlotsHeading ?? "Open video slots, subject to availability."}
              </h3>
              <p
                className="mt-4 text-[14.5px] leading-[1.7] text-[var(--color-text-muted)]"
              >
                {t?.calendarInviteBody ??
                  "You'll receive a calendar invite immediately after booking — no back-and-forth."}
              </p>
              <Link
                href={hero.primaryCta.href}
                className="gh2-btn-lime mt-8 w-full justify-center"
              >
                {hero.primaryCta.label}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative bg-[linear-gradient(168deg,#15382A_0%,#0F2E25_55%,#0B241C_100%)] gh-inline-clamp-section-cta">
        <SectionSeam theme="dark" />
        <div className="gh-container">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]"
              >
                {t?.nextStep ?? ""}
              </p>
              <h2
                className="mt-4 text-[clamp(1.85rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white/95"
              >
                {bottomCta.title}
              </h2>
              <p
                className="mt-6 max-w-[520px] text-[15px] leading-[1.7] text-white/52"
              >
                {bottomCta.description}
              </p>
            </div>
            <Link
              href={bottomCta.ctaHref}
              className="gh2-btn-lime lg:justify-self-end"
            >
              {bottomCta.ctaLabel}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

    </section>
  );
}
