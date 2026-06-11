"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, ShieldCheck, Phone, CalendarDays, ArrowRight } from "lucide-react";
import {
  IconInstagram,
  IconFacebook,
  IconLinkedin,
} from "@/components/ui/BrandIcons";
import { Flag } from "@/components/ui/Flag";

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
  medicalRegistrationUrl?: string;
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
  /** Initials fallback shown when imageSrc is missing. Without it the card
   *  falls back to a single stock SVG for every photo-less doctor. */
  initials?: string;
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
  /** Dark variant — forest-glass surface + light text, for dark sections
   *  (doctors directory, dark DoctorsSection). Defaults to the original
   *  white card for light sections (DoctorWall, consult page). */
  dark?: boolean;
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export function DoctorCard({
  name,
  title,
  imcRegistration,
  medicalRegistrationUrl,
  country,
  languages = [],
  whatsappNumber,
  instagramUrl,
  facebookUrl,
  linkedinUrl,
  imageSrc,
  initials,
  href,
  bookingHref,
  ctaLabel = "View profile",
  dark = false,
}: DoctorCardProps) {
  const trimmedImage = imageSrc?.trim();
  const hasImage = Boolean(trimmedImage);
  const src = trimmedImage ?? "";
  const unoptimized = /^https?:\/\//i.test(src) || src.startsWith("/api/media/");
  const initialsLabel = initials?.trim() || nameToInitials(name);
  const whatsappDigits = whatsappNumber?.replace(/[^\d+]/g, "");
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits.replace("+", "")}`
    : null;
  const profileHref = href;
  const bookHref = bookingHref ?? null;

  // Card palette as root-scoped CSS vars so descendants (text, icons,
  // borders) recolor for the dark variant without per-element prop
  // threading. Light = the original white-card greens; dark = light ink
  // on the forest-glass surface. `background: var(--color-brand-primary)`
  // usages (initials tile, title badge, Book button) intentionally stay
  // green in both modes — only text/border tokens switch here.
  const cardVars = {
    "--dc-ink": dark ? "rgba(255,255,255,0.92)" : "var(--color-brand-primary)",
    "--dc-muted": dark ? "rgba(255,255,255,0.55)" : "rgba(29,75,54,0.45)",
    "--dc-line": dark ? "rgba(255,255,255,0.22)" : "rgba(29,75,54,0.20)",
    "--dc-icon-bg": dark ? "rgba(255,255,255,0.06)" : "rgba(29,75,54,0.07)",
    "--dc-icon-line": dark ? "rgba(255,255,255,0.10)" : "rgba(29,75,54,0.10)",
    "--dc-hover": dark ? "rgba(255,255,255,0.08)" : "rgba(29,75,54,0.04)",
  } as CSSProperties;

  return (
    <article
      className={`
        group relative flex flex-col overflow-hidden ${dark ? "gh-glass-card" : "bg-white"}
        transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:-translate-y-[3px]
        ${dark ? "" : "hover:border-[rgba(29,75,54,0.22)] hover:shadow-[var(--shadow-card-hover)]"}
        motion-reduce:transition-none motion-reduce:hover:translate-y-0
        focus-within:ring-2 focus-within:ring-[var(--color-brand-primary)]/30
      `}
      style={{
        ...cardVars,
        borderRadius: 24,
        ...(dark
          ? {}
          : {
              border: "1px solid rgba(29,75,54,0.10)",
              boxShadow: "0 2px 8px rgba(15,46,37,0.06), 0 8px 28px rgba(15,46,37,0.07)",
            }),
      }}
    >
      {/* Whole-card overlay link — routes to profile. CTAs below sit
          above this via z-index so their own anchor handlers fire. */}
      {profileHref ? (
        <Link
          href={profileHref}
          aria-label={`View profile for ${name}`}
          className="absolute inset-0 z-0 rounded-[24px] focus:outline-none"
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
            alt={name}
            fill
            sizes="(min-width:1024px) 360px, (min-width:768px) 50vw, 100vw"
            unoptimized={unoptimized}
            className="object-cover object-top"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-extrabold tracking-tight text-white"
            style={{
              background: "var(--color-brand-primary)",
              fontSize: "clamp(48px,8vw,80px)",
              letterSpacing: "-0.02em",
            }}
            aria-hidden
          >
            {initialsLabel}
          </div>
        )}

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
              className="inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{
                background: "var(--color-brand-primary)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
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
                  style={{ color: "var(--dc-ink)" }}
                  strokeWidth={1.6}
                  aria-hidden
                />
              </IconBox>
              <div className="min-w-0">
                <p
                  className="text-[10.5px] font-bold uppercase tracking-[0.13em]"
                  style={{ color: "var(--dc-muted)" }}
                >
                  Registration
                </p>
                {medicalRegistrationUrl ? (
                  <a
                    href={medicalRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-20 text-[13px] font-semibold transition-opacity hover:opacity-75"
                    style={{ color: "var(--dc-ink)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {imcRegistration}
                  </a>
                ) : (
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--dc-ink)" }}
                  >
                    {imcRegistration}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {languages.length > 0 ? (
            <div className="flex items-start gap-3">
              <IconBox>
                <Globe
                  className="size-[15px]"
                  style={{ color: "var(--dc-ink)" }}
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
        <div className="mt-5 space-y-2">

          {/* Row 1 — primary book + phone (only when bookingHref provided).
              Matches the site-wide primary CTA: glow shadow + hover lift. */}
          {bookHref ? (
            <div className="flex items-center gap-2">
              <Link
                href={bookHref}
                className="relative z-20 inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13.5px] font-extrabold tracking-[-0.005em] text-white transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                style={{
                  background: "var(--color-brand-primary)",
                  boxShadow: "0 6px 18px rgba(29,75,54,0.25)",
                }}
              >
                <CalendarDays className="size-[15px] shrink-0" strokeWidth={1.8} aria-hidden />
                Book Appointment
                <ArrowRight
                  className="size-[15px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </Link>

              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-20 inline-flex size-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[color:var(--dc-line)] bg-transparent text-[color:var(--dc-ink)] transition-colors duration-200 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/40"
                  aria-label="Contact on WhatsApp"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="size-4" strokeWidth={1.6} />
                </a>
              ) : null}
            </div>
          ) : null}

          {/* Row 2 — secondary outline → profile. Fills solid on hover
              (site-wide outline-button behaviour). */}
          {profileHref ? (
            <Link
              href={profileHref}
              className="relative z-20 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[color:var(--dc-line)] px-4 text-[13px] font-bold tracking-[-0.005em] text-[color:var(--dc-ink)] transition-[background-color,color,border-color] duration-200 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/40"
            >
              {ctaLabel}
              <ArrowRight className="size-[14px] shrink-0" strokeWidth={1.8} aria-hidden />
            </Link>
          ) : null}

          {/* When there's no booking CTA and no profile CTA fell through,
              render a single phone shortcut if available so the card
              still has an action. */}
          {!bookHref && !profileHref && whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-20 inline-flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-[color:var(--dc-line)] px-4 py-[9px] text-[13px] font-semibold text-[color:var(--dc-ink)] hover:bg-[color:var(--dc-hover)]"
            >
              <Phone className="size-4" strokeWidth={1.6} aria-hidden />
              WhatsApp
            </a>
          ) : null}

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
