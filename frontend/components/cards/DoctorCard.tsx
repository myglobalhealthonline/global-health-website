"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, ShieldCheck, CalendarDays, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  IconInstagram,
  IconFacebook,
  IconLinkedin,
} from "@/components/ui/BrandIcons";
import { Flag } from "@/components/ui/Flag";
import { focalStyle, DoctorAvatarFallback } from "@/components/media/doctor-photo";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";

/* ─── Mint icon box ──────────────────────────────────────────────────────── */
function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]"
      style={{
        background: "var(--dc-icon-bg, rgba(29,75,54,0.07))",
        border: "1px solid var(--dc-icon-line, rgba(29,75,54,0.10))",
      }}
    >
      {children}
    </span>
  );
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
type DoctorCardProps = {
  name: string;
  title: string;
  imcRegistration?: string;
  /** Register division/scope (IMC General/Specialist Division). */
  registrationDivision?: string;
  /** Admin-verified registration (sighted documentation). */
  registrationVerified?: boolean;
  medicalRegistrationUrl?: string;
  /** Country regulator's public verification page (medicalcouncil.ie,
   *  ordemdosmedicos.pt) — fallback "Verify" link for doctors who don't
   *  carry their own medicalRegistrationUrl. A doctor whose registration
   *  body differs from the country's default regulator (e.g. a Spanish
   *  psychologist registered with COP, not CGCOM) sets medicalRegistrationUrl
   *  to their own body's site; that always wins over this generic fallback. */
  verificationUrl?: string;
  /** Confirmed extra professional credentials (FRCP, fellowships). */
  credentials?: Array<{ label: string; bodyName: string; bodyUrl?: string }>;
  country?: string;
  languages?: string[];
  whatsappNumber?: string;
  /** Optional social profile URLs surfaced under the WhatsApp button.
   *  Per-doctor (not per-clinic) so each clinician can opt in
   *  independently. Absolute https:// URLs only. */
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  linkedinUrl?: string | null;
  bio: string;
  imageSrc?: string | null;
  imageAltText?: string | null;
  imageTitle?: string | null;
  imageCaption?: string | null;
  imageDescription?: string | null;
  /** Focal point (0-100, default 50) + zoom (1-3, default 1) — doctor's
   *  chosen crop, set via the admin/doctor-portal focal-point editor. */
  imageFocalX?: number;
  imageFocalY?: number;
  imageZoom?: number;
  /** Card-wide link target — usually the doctor's profile page. The whole
   *  card surface routes here; inner CTAs sit above via z-index. */
  href?: string;
  /** Optional separate booking target. When provided, a primary
   *  "Book Appointment" CTA is rendered alongside the "View profile"
   *  outline button. When omitted, only the "View profile" CTA shows —
   *  avoids labelling a button "Book Appointment" while routing it at
   *  the profile page. */
  bookingHref?: string;
  ctaLabel?: string;
  bookLabel?: string;
  /** Override the primary button label (default: "Book with {firstName}"). */
  primaryLabel?: string;
  /** Dark variant — forest-glass surface + light text, for dark sections
   *  (doctors directory, dark DoctorsSection). Defaults to the original
   *  white card for light sections (DoctorWall, consult page). */
  dark?: boolean;
  /** Overlay-link aria-label — already resolved (e.g. "View profile for
   *  Dr. Smith"). Falls back to the English default when the caller hasn't
   *  threaded a localised value through yet. */
  viewProfileAriaLabel?: string;
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export function DoctorCard({
  name,
  title,
  imcRegistration,
  registrationDivision,
  registrationVerified,
  medicalRegistrationUrl,
  verificationUrl,
  credentials = [],
  country,
  languages = [],
  instagramUrl,
  facebookUrl,
  linkedinUrl,
  imageSrc,
  imageAltText,
  imageTitle,
  imageCaption,
  imageDescription,
  imageFocalX = 50,
  imageFocalY = 50,
  imageZoom = 1,
  href,
  bookingHref,
  ctaLabel = "View profile",
  bookLabel = "Pick a time",
  /** Override the primary button label (default: "Book with {firstName}"). */
  primaryLabel,
  dark = false,
  viewProfileAriaLabel,
}: DoctorCardProps) {
  const trimmedImage = imageSrc?.trim();
  const hasImage = Boolean(trimmedImage);
  const src = trimmedImage ?? "";
  const unoptimized = isUnoptimizedImageSrc(src);
  // Doctor phone (WhatsApp) is clinic↔clinician contact only — never shown on
  // public cards (the public API no longer sends the number either).
  const profileHref = href;
  const bookHref = bookingHref ?? null;
  const firstName = name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)[0] ?? name;

  // Card palette as root-scoped CSS vars so descendants (text, icons,
  // borders) recolor for the dark variant without per-element prop
  // threading. Light = the original white-card greens; dark = light ink
  // on the forest-glass surface. `background: var(--color-brand-primary)`
  // usages (initials tile, title badge, Book button) intentionally stay
  // green in both modes — only text/border tokens switch here.
  const cardVars = {
    "--dc-ink": dark ? "rgba(255,255,255,0.92)" : "var(--color-brand-primary)",
    "--dc-muted": dark ? "rgba(255,255,255,0.72)" : "rgba(29,75,54,0.45)",
    "--dc-line": dark ? "rgba(255,255,255,0.22)" : "rgba(29,75,54,0.20)",
    // Dark variant mirrors FeaturedDoctor's lime accent dosage: lime-tinted
    // icon tiles + lime icon strokes instead of flat white-on-forest.
    "--dc-icon-bg": dark ? "rgba(176,241,34,0.10)" : "rgba(29,75,54,0.08)",
    "--dc-icon-line": dark ? "rgba(176,241,34,0.18)" : "rgba(29,75,54,0.10)",
    "--dc-icon-ink": dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)",
    "--dc-hover": dark ? "rgba(255,255,255,0.08)" : "rgba(29,75,54,0.04)",
  } as CSSProperties;

  // Static cards (no profileHref link-wrap) must not lift on hover — only
  // apply gh2-card-hover when the card is actually clickable.
  const lightHoverClass = profileHref ? "gh2-card-hover" : "";

  return (
    <article
      className={`
        group relative flex h-full flex-col overflow-hidden ${dark ? "gh2-glass-forest gh2-glass-hover" : `gh2-card-ivory ${lightHoverClass}`}
        motion-reduce:transition-none motion-reduce:hover:translate-y-0
        focus-within:ring-2 focus-within:ring-[var(--color-brand-primary)]/30
      `}
      style={{
        ...cardVars,
        borderRadius: "var(--radius-card)",
      }}
    >
      {/* Whole-card overlay link — routes to profile. CTAs below sit
          above this via z-index so their own anchor handlers fire. */}
      {profileHref ? (
        <Link
          href={profileHref}
          aria-label={viewProfileAriaLabel ?? `View profile for ${name}`}
          className="absolute inset-0 z-0 rounded-[var(--radius-card)] focus:outline-none"
          tabIndex={-1}
        />
      ) : null}

      {/* ── Portrait ── */}
      <div
        className="relative z-[1] overflow-hidden"
        style={{ aspectRatio: "1 / 1.1" }}
      >
        {hasImage ? (
          <Image
            src={src}
            alt={imageAltText?.trim() || (title ? `${name}, ${title}` : name)}
            title={imageTitle?.trim() || undefined}
            aria-describedby={
              imageCaption || imageDescription ? `${nameToInitials(name)}-image-seo` : undefined
            }
            fill
            sizes="(min-width:1024px) 360px, (min-width:768px) 50vw, 100vw"
            unoptimized={unoptimized}
            style={focalStyle(imageFocalX, imageFocalY, imageZoom)}
          />
        ) : (
          <DoctorAvatarFallback />
        )}
        {imageCaption || imageDescription ? (
          <p id={`${nameToInitials(name)}-image-seo`} className="sr-only">
            {[imageCaption, imageDescription].filter(Boolean).join(" ")}
          </p>
        ) : null}

        {/* Country flag chip — top-left overlay */}
        {country ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-sm">
            <Flag code={country} size="sm" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white">
              {country.toUpperCase()}
            </span>
          </span>
        ) : null}

        {/* Title badge — bottom-left overlay (role/specialty, NOT a
            verification credential — shield-check icon dropped because
            it implied verified clinical credential). */}
        {title ? (
          <div className="absolute bottom-3 left-3">
            <span
              className="inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold"
              style={
                dark
                  ? {
                      background: "rgba(10,31,20,0.72)",
                      border: "1px solid rgba(176,241,34,0.28)",
                      color: "var(--color-brand-accent)",
                      backdropFilter: "blur(6px)",
                      WebkitBackdropFilter: "blur(6px)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    }
                  : {
                      background: "var(--color-brand-primary)",
                      color: "#ffffff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    }
              }
            >
              {title}
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Body ── */}
      <div className="relative z-[1] flex flex-1 flex-col px-5 pb-5 pt-4">

        {/* Name — dark green, extrabold */}
        <h3
          className="text-[1.1rem] font-extrabold tracking-[-0.015em] leading-snug"
          style={{ color: "var(--dc-ink)" }}
        >
          {name}
        </h3>

        {/* Metadata rows */}
        <div className="mt-4 space-y-3">
          {imcRegistration ? (
            <div className="flex items-start gap-3">
              <IconBox>
                <ShieldCheck
                  className="size-[15px]"
                  style={{ color: "var(--dc-icon-ink)" }}
                  strokeWidth={1.6}
                  aria-hidden
                />
              </IconBox>
              <div className="min-w-0">
                <p
                  className="text-[10.5px] font-bold uppercase tracking-[0.13em]"
                  style={{ color: "var(--dc-muted)" }}
                >
                  Registration{registrationVerified ? " · Verified" : ""}
                </p>
                {medicalRegistrationUrl || verificationUrl ? (
                  <a
                    href={medicalRegistrationUrl ?? verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Verify registration on the official register"
                    className="relative z-20 inline-flex items-center gap-1 text-[13px] font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
                    style={{ color: "var(--dc-ink)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {imcRegistration}
                    <ArrowUpRight className="size-[14px]" strokeWidth={2} aria-hidden />
                  </a>
                ) : (
                  <p className="text-[13px] font-semibold" style={{ color: "var(--dc-ink)" }}>
                    {imcRegistration}
                  </p>
                )}
                {registrationDivision ? (
                  <p className="text-[12px]" style={{ color: "var(--dc-muted)" }}>
                    {registrationDivision}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {credentials.length > 0 ? (
            <div className="flex items-start gap-3">
              <IconBox>
                <ShieldCheck
                  className="size-[15px]"
                  style={{ color: "var(--dc-icon-ink)" }}
                  strokeWidth={1.6}
                  aria-hidden
                />
              </IconBox>
              <div className="min-w-0">
                <p
                  className="text-[10.5px] font-bold uppercase tracking-[0.13em]"
                  style={{ color: "var(--dc-muted)" }}
                >
                  Credentials
                </p>
                <ul className="space-y-0.5">
                  {credentials.map((c) => (
                    <li key={c.label} className="text-[13px] font-semibold" style={{ color: "var(--dc-ink)" }}>
                      {c.bodyUrl ? (
                        <a
                          href={c.bodyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-20 underline underline-offset-2 transition-opacity hover:opacity-75"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.label}
                        </a>
                      ) : (
                        c.label
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {languages.length > 0 ? (
            <div className="flex items-start gap-3">
              <IconBox>
                <Globe
                  className="size-[15px]"
                  style={{ color: "var(--dc-icon-ink)" }}
                  strokeWidth={1.6}
                  aria-hidden
                />
              </IconBox>
              <div className="min-w-0">
                <p
                  className="text-[10.5px] font-bold uppercase tracking-[0.13em]"
                  style={{ color: "var(--dc-muted)" }}
                >
                  Languages
                </p>
                <p
                  className="text-[13px] font-semibold leading-snug"
                  style={{ color: "var(--dc-ink)" }}
                >
                  {languages.join(", ")}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Actions ── */}
        {primaryLabel && bookHref ? (
          /* Compact inline row — booking page: View + Continue pinned to bottom */
          <div className="mt-auto flex items-center gap-2 pt-5">
            {profileHref ? (
              <Link
                href={profileHref}
                className={`gh2-btn-compact relative z-20 flex-1 ${
                  dark
                    ? "gh2-btn-compact-secondary-dark"
                    : "gh2-btn-compact-secondary border-[color:var(--dc-line)] text-[color:var(--dc-ink)]"
                }`}
              >
                {ctaLabel}
              </Link>
            ) : null}
            <Link
              href={bookHref}
              className={`gh2-btn-compact relative z-20 flex-1 gap-1 ${
                dark ? "gh2-btn-compact-primary-dark" : "gh2-btn-compact-primary"
              }`}
            >
              {primaryLabel}
              <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
            </Link>
          </div>
        ) : (
          /* Default stacked layout — full-width buttons for non-booking contexts */
          <div className="mt-auto space-y-2 pt-5">
            {bookHref ? (
              <Link
                href={bookHref}
                className={`relative z-20 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-[13.5px] font-extrabold tracking-[-0.005em] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                  dark
                    ? "focus-visible:ring-[var(--color-brand-accent)]/40"
                    : "text-white focus-visible:ring-[var(--color-brand-primary)]/40"
                }`}
                style={
                  dark
                    ? {
                        background: "var(--color-brand-accent)",
                        color: "#0a1f14",
                        boxShadow: "0 8px 12px -2px rgba(176,241,34,0.14)",
                      }
                    : {
                        background: "var(--color-brand-primary)",
                        boxShadow: "0 6px 18px rgba(29,75,54,0.25)",
                      }
                }
              >
                <CalendarDays className="size-[15px] shrink-0" strokeWidth={1.8} aria-hidden />
                {primaryLabel ?? bookLabel ?? `Book with ${firstName}`}
                <ArrowRight
                  className="size-[15px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </Link>
            ) : null}
            {profileHref ? (
              <Link
                href={profileHref}
                className={
                  bookHref
                    ? "relative z-20 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold tracking-[-0.005em] text-[color:var(--dc-ink)] transition-colors duration-200 hover:bg-[var(--dc-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/40"
                    : "relative z-20 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[color:var(--dc-line)] px-4 text-[13px] font-bold tracking-[-0.005em] text-[color:var(--dc-ink)] transition-[background-color,color,border-color] duration-200 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/40"
                }
              >
                {ctaLabel}
                <ArrowRight className="size-[14px] shrink-0" strokeWidth={1.8} aria-hidden />
              </Link>
            ) : null}
          </div>
        )}


          {/* Social row — only renders when at least one URL is set.
              Sits below the action stack so the primary book CTA stays
              the visual anchor. Icons open in a new tab; stopPropagation
              prevents card-wide href interception. */}
          {instagramUrl || facebookUrl || linkedinUrl ? (
            <div className="relative z-20 flex items-center justify-center gap-2 pt-1">
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} on Instagram`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--dc-line)] text-[color:var(--dc-ink)] transition-colors hover:bg-[var(--color-brand-primary)] hover:text-white"
                >
                  <IconInstagram className="size-[14px]" />
                </a>
              ) : null}
              {facebookUrl ? (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} on Facebook`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--dc-line)] text-[color:var(--dc-ink)] transition-colors hover:bg-[var(--color-brand-primary)] hover:text-white"
                >
                  <IconFacebook className="size-[14px]" />
                </a>
              ) : null}
              {linkedinUrl ? (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} on LinkedIn`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--dc-line)] text-[color:var(--dc-ink)] transition-colors hover:bg-[var(--color-brand-primary)] hover:text-white"
                >
                  <IconLinkedin className="size-[14px]" />
                </a>
              ) : null}
            </div>
          ) : null}

      </div>
    </article>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function nameToInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p && !/^Dr\.?$/i.test(p));
  if (parts.length === 0) return "·";
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "·"
  );
}
