/**
 * Featured doctor spotlight.
 *
 * Theme-aware: `dark` (default) renders the forest-glass card for dark
 * sections (homepage team band); `dark={false}` renders a white elevated
 * card for light sections (doctors directory spotlight).
 *
 * Two rendering modes:
 * - default (standalone=true): wraps in its own dark <section>
 * - asCard (standalone=false): card only, no section wrapper
 */

import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Globe, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { toDoctorBioPlainText } from "@/lib/content/doctor-bio-format";
import {
  IconInstagram,
  IconFacebook,
  IconLinkedin,
  type BrandIcon,
} from "@/components/ui/BrandIcons";
import { focalStyle, DoctorAvatarFallback } from "@/components/media/doctor-photo";
import { SectionSeam } from "@/components/ui/SectionSeam";

type DoctorSpotlightProps = {
  name: string;
  title: string;
  imcRegistration?: string;
  registrationDivision?: string;
  registrationVerified?: boolean;
  medicalRegistrationUrl?: string;
  verificationUrl?: string;
  credentials?: Array<{ label: string; bodyName: string; bodyUrl?: string }>;
  languages?: string[];
  bio: string;
  imageSrc?: string | null;
  imageAltText?: string | null;
  imageTitle?: string | null;
  imageCaption?: string | null;
  imageDescription?: string | null;
  imageFocalX?: number;
  imageFocalY?: number;
  imageZoom?: number;
  href?: string;
  bookingHref?: string;
  /** WhatsApp contact — rendered as a "Call" pill next to the booking
   *  CTA when set (same wa.me href shape as DoctorCard). */
  whatsappNumber?: string;
  /** Optional social profile URLs surfaced as an icon row below the
   *  CTAs. Each is an absolute https:// URL or undefined. */
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
};

export function FeaturedDoctor({
  doctor,
  standalone = true,
  dark = true,
}: {
  doctor: DoctorSpotlightProps;
  standalone?: boolean;
  /** Surface theme — must match the section the card sits on. */
  dark?: boolean;
}) {
  const trimmedImage = doctor.imageSrc?.trim();
  const hasImage = Boolean(trimmedImage);
  const src = trimmedImage ?? "";
  // /api/media/* is a same-origin rewrite and images.unsplash.com /
  // images.pexels.com are allow-listed in next.config.ts remotePatterns —
  // only a genuinely different remote host needs unoptimized.
  const unoptimized =
    hasImage &&
    /^https?:\/\//i.test(src) &&
    !/^https?:\/\/(images\.unsplash\.com|images\.pexels\.com)\//i.test(src);
  const languageList =
    doctor.languages && doctor.languages.length > 0
      ? doctor.languages.join(", ")
      : "English";
  const bioPreview = toDoctorBioPlainText(doctor.bio);

  const firstName = doctor.name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")[0] ?? doctor.name;

  const profileHref = doctor.href;
  const bookHref = doctor.bookingHref ?? (doctor.href ? `${doctor.href}#services` : undefined);

  // WhatsApp deep link — strip non-digits, drop the leading +, same as
  // DoctorCard so the two surfaces resolve identical wa.me URLs.
  // Doctor phone (WhatsApp) is clinic↔clinician contact only — never shown on
  // the public spotlight (the public API no longer sends the number either).

  // Social icon row — only the URLs the admin actually set render.
  const socialLinks: Array<{ url: string; Icon: BrandIcon; label: string }> = [
    doctor.instagramUrl
      ? { url: doctor.instagramUrl, Icon: IconInstagram, label: "Instagram" }
      : null,
    doctor.facebookUrl
      ? { url: doctor.facebookUrl, Icon: IconFacebook, label: "Facebook" }
      : null,
    doctor.linkedinUrl
      ? { url: doctor.linkedinUrl, Icon: IconLinkedin, label: "LinkedIn" }
      : null,
  ].filter((x): x is { url: string; Icon: BrandIcon; label: string } => x !== null);

  // Theme tokens — scoped per card so both variants share one markup tree.
  const ink = dark ? "rgba(255,255,255,0.92)" : "var(--color-text-primary)";
  const body = dark ? "rgba(255,255,255,0.65)" : "var(--color-text-body)";
  const faint = dark ? "rgba(255,255,255,0.48)" : "var(--color-text-muted)";
  const line = dark ? "rgba(255,255,255,0.15)" : "rgba(29,75,54,0.18)";
  const iconAccent = dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)";

  const surfaceStyle: CSSProperties = { borderRadius: "var(--radius-card)" };

  const card = (
    <>
      <div
        className={`gh-featured-card overflow-hidden ${dark ? "gh2-glass-forest" : "gh2-card-ivory"}`}
        style={surfaceStyle}
      >
        {/* Portrait */}
        <div
          className="relative overflow-hidden gh-featured-photo"
          style={{ minHeight: 240 }}
        >
          {hasImage ? (
            <Image
              src={src}
              alt={doctor.imageAltText?.trim() || doctor.name}
              title={doctor.imageTitle?.trim() || undefined}
              aria-describedby={
                doctor.imageCaption || doctor.imageDescription
                  ? "featured-doctor-image-seo"
                  : undefined
              }
              fill
              unoptimized={unoptimized}
              style={focalStyle(doctor.imageFocalX, doctor.imageFocalY, doctor.imageZoom)}
              sizes="(min-width:640px) 340px, 100vw"
            />
          ) : (
            <div className="absolute inset-0">
              <DoctorAvatarFallback />
            </div>
          )}
          {doctor.imageCaption || doctor.imageDescription ? (
            <p id="featured-doctor-image-seo" className="sr-only">
              {[doctor.imageCaption, doctor.imageDescription].filter(Boolean).join(" ")}
            </p>
          ) : null}

          {/* "Featured" ribbon — lime, ties the spotlight to the brand accent */}
          <span
            className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em]"
            style={{
              background: "var(--color-brand-accent)",
              color: "#0a1f14",
              boxShadow: "0 1px 5px rgba(176,241,34,0.14)",
            }}
          >
            <Sparkles className="size-3.5" strokeWidth={2} aria-hidden />
            Clinical Director
          </span>

          {/* Right-edge fade into card body on desktop (dark surface only —
              on white the hard edge reads cleaner). */}
          {dark ? (
            <div
              aria-hidden
              className="absolute inset-y-0 right-0 w-16 hidden sm:block"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(15,46,37,0.60) 100%)",
              }}
            />
          ) : null}
        </div>

        {/* Info column */}
        <div className="flex flex-col justify-between p-7 md:p-10">
          <div>
            {/* Specialty tag */}
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
              style={
                dark
                  ? {
                      background: "rgba(176,241,34,0.10)",
                      border: "1px solid rgba(176,241,34,0.18)",
                      color: "var(--color-brand-accent)",
                    }
                  : {
                      background: "var(--color-brand-mint-dim)",
                      border: "1px solid rgba(29,75,54,0.15)",
                      color: "var(--color-brand-primary)",
                    }
              }
            >
              {doctor.title}
            </span>

            {/* Name */}
            <h3
              className="mt-3 font-extrabold tracking-[-0.03em] leading-tight text-[length:var(--text-h2)]"
              style={{ color: ink }}
            >
              {doctor.name}
            </h3>

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap gap-4">
              {doctor.imcRegistration && (
                <span className="inline-flex items-center gap-1.5 text-[13px]">
                  <ShieldCheck
                    className="size-4 shrink-0"
                    style={{ color: iconAccent }}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  {doctor.verificationUrl ?? doctor.medicalRegistrationUrl ? (
                    <a
                      href={doctor.verificationUrl ?? doctor.medicalRegistrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Verify registration on the official register"
                      className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 transition-opacity hover:opacity-75 motion-reduce:transition-none"
                      style={{ color: body }}
                    >
                      {doctor.imcRegistration}
                      <ArrowUpRight className="size-[15px]" strokeWidth={2} aria-hidden style={{ color: iconAccent }} />
                    </a>
                  ) : (
                    <span className="font-semibold" style={{ color: body }}>
                      {doctor.imcRegistration}
                    </span>
                  )}
                  {doctor.registrationDivision ? (
                    <span className="font-semibold" style={{ color: body }}>
                      · {doctor.registrationDivision}
                    </span>
                  ) : null}
                </span>
              )}

              {(doctor.credentials ?? []).length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[13px]">
                  <Sparkles className="size-4 shrink-0" style={{ color: iconAccent }} strokeWidth={1.5} aria-hidden />
                  <span className="font-semibold" style={{ color: body }}>
                    {(doctor.credentials ?? []).map((c) => c.label).join(" · ")}
                  </span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 text-[13px]">
                <Globe
                  className="size-4 shrink-0"
                  style={{ color: iconAccent }}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span className="font-semibold" style={{ color: body }}>
                  {languageList}
                </span>
              </span>
            </div>

            {/* Bio excerpt */}
            {bioPreview ? (
              <p
                className="mt-5 line-clamp-3 text-[length:var(--text-body)] leading-relaxed"
                style={{ color: faint, maxWidth: "52ch" }}
              >
                {bioPreview}
              </p>
            ) : null}
          </div>

          {/* CTAs — site-wide pair: lime primary w/ glow + outline secondary */}
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            {bookHref ? (
              <Link
                href={bookHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-extrabold tracking-[-0.005em] transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                style={{
                  background: "var(--color-brand-accent)",
                  color: "#0a1f14",
                  boxShadow: "0 8px 12px -2px rgba(176,241,34,0.14)",
                }}
              >
                Book with {firstName}
                <ArrowRight className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
              </Link>
            ) : null}


            {profileHref ? (
              <Link
                href={profileHref}
                className={`inline-flex h-12 items-center justify-center gap-1.5 rounded-full border px-5 text-sm font-bold tracking-[-0.005em] transition-[background-color,color,border-color] duration-200 focus-visible:outline-none motion-reduce:transition-none ${
                  dark
                    ? "border-white/25 bg-white/[0.06] text-white/90 hover:bg-white hover:text-[var(--color-brand-primary)]"
                    : "border-[var(--color-border-strong)] text-[var(--color-brand-primary)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white"
                }`}
              >
                View profile
                <ArrowRight className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
              </Link>
            ) : null}
          </div>

          {/* Social row — only the URLs the admin set render. */}
          {socialLinks.length > 0 ? (
            <div className="mt-5 flex items-center gap-2">
              {socialLinks.map(({ url, Icon, label }) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${doctor.name} on ${label}`}
                  className="inline-flex size-9 items-center justify-center rounded-full border transition-colors duration-200 hover:bg-[var(--color-brand-primary)] hover:text-white motion-reduce:transition-none"
                  style={{ borderColor: line, color: dark ? "rgba(255,255,255,0.65)" : "var(--color-brand-primary)" }}
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        .gh-featured-card {
          display: grid;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .gh-featured-card {
            grid-template-columns: 320px 1fr;
          }
          .gh-featured-photo {
            min-height: 360px;
          }
        }
      `}</style>
    </>
  );

  if (standalone) {
    return (
      <section
        className="relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
        style={{
          padding: "clamp(48px,7vw,96px) 0",
        }}
      >
        <SectionSeam theme="dark" />
        <div
          className="mx-auto"
          style={{
            maxWidth: "var(--container-width)",
            padding: "0 clamp(20px,4vw,40px)",
          }}
        >
          <p
            className="mb-8 text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "var(--color-brand-accent)" }}
          >
            Featured clinician
          </p>
          {card}
        </div>
      </section>
    );
  }

  return card;
}
