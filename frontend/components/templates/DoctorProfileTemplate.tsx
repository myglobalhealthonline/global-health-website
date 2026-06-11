import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ExternalLink,
  Globe,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import { sanitizeDoctorBioHtml } from "@/lib/content/doctor-bio-format";

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
    medicalRegistrationUrl?: string;
  };
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
  profileImageSrc?: string;
  bookingCtaImage?: { src: string; alt: string };
  showReviewScore?: boolean;
  doctifyWidgetUrl?: string;
};

/* ─── Hero metadata chip ─────────────────────────────────────────────────── */
function MetaChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.80)",
      }}
    >
      <span style={{ color: "var(--color-brand-accent)", display: "flex" }}>{icon}</span>
      {label}
    </span>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export function DoctorProfileTemplate({
  hero,
  profile,
  bottomCta,
  profileImageSrc,
  doctifyWidgetUrl,
}: DoctorProfileTemplateProps) {
  const safeBio = sanitizeDoctorBioHtml(profile.bio);
  const backHref = hero.secondaryCta?.href;

  return (
    <section className="bg-[var(--color-background-page)]">

      {/* ── HERO — full-bleed 50/50 split with gradient fade ── */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
        style={{ background: "#0F2E25" }}
      >
        <div
          className="grid lg:grid-cols-2"
          style={{ minHeight: "min(100vh, 880px)" }}
        >

          {/* ── LEFT — full-height image with gradient fades ── */}
          <div
            className="relative overflow-hidden"
            style={{ minHeight: "clamp(360px, 60vw, 880px)" }}
          >
            {profileImageSrc ? (
              <Image
                src={profileImageSrc}
                alt={profile.name}
                fill
                sizes="(min-width:1024px) 50vw, 100vw"
                priority
                className="object-cover object-top"
                unoptimized={
                  /^https?:\/\//i.test(profileImageSrc) ||
                  profileImageSrc.startsWith("/api/media/")
                }
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(176,241,34,0.08) 0%, rgba(15,46,37,0.60) 100%)",
                }}
              />
            )}

            {/* Bottom fade — readability on mobile where content sits below */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{
                height: "45%",
                background:
                  "linear-gradient(to top, rgba(6,26,18,0.88) 0%, rgba(6,26,18,0.40) 45%, transparent 100%)",
              }}
            />

            {/* Right-edge fade — image bleeds into content on desktop */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block"
              style={{
                width: "38%",
                background:
                  "linear-gradient(to right, rgba(15,46,37,0) 0%, rgba(15,46,37,0.30) 30%, rgba(15,46,37,0.72) 65%, #0F2E25 100%)",
              }}
            />

            {/* Name card — visible on mobile (hidden on desktop, right column owns it) */}
            {profileImageSrc ? (
              <div
                className="absolute bottom-0 left-0 right-0 px-6 pb-6 lg:hidden"
              >
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--color-brand-accent)" }}>
                  {profile.title}
                </p>
                <p className="mt-1 text-[1.35rem] font-extrabold tracking-[-0.02em]" style={{ color: "rgba(255,255,255,0.95)" }}>
                  {profile.name}
                </p>
              </div>
            ) : null}
          </div>

          {/* ── RIGHT — content column ── */}
          <div
            className="relative flex flex-col justify-center px-8 py-12 md:px-12 lg:px-16 lg:py-20"
            style={{ background: "#0F2E25" }}
          >
            {/* Lime radial glow — top-right of content area */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 600px 500px at 110% -10%, rgba(176,241,34,0.11), transparent 60%)",
              }}
            />

            <div className="relative">
              {/* Nav links */}
              <div className="flex flex-wrap items-center gap-2">
                {backHref ? (
                  <Link
                    href={backHref}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors duration-200 hover:bg-white/10"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.70)",
                    }}
                  >
                    <ArrowLeft className="size-3.5 shrink-0" strokeWidth={2} />
                    Back to {profile.country} team
                  </Link>
                ) : null}

                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.70)",
                  }}
                >
                  <User className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                  Doctor Profile
                </span>
              </div>

              {/* Name */}
              <h1
                className="mt-6 font-extrabold tracking-[-0.03em] leading-[1.0]"
                style={{
                  fontSize: "clamp(2.2rem, 3.5vw + 0.5rem, 3.8rem)",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                {profile.name}
              </h1>

              {/* Role — lime */}
              <p
                className="mt-3 text-[1rem] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                {profile.title}
              </p>

              {/* Description */}
              {hero.description ? (
                <p
                  className="mt-4 text-[15px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.65)", maxWidth: "44ch" }}
                >
                  {hero.description}
                </p>
              ) : null}

              {/* Specialty tags */}
              {profile.specialties.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.specialties.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.75)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Metadata chips */}
              <div className="mt-6 flex flex-wrap gap-2.5">
                {profile.country ? (
                  <MetaChip
                    icon={<MapPin className="size-3.5" strokeWidth={1.8} aria-hidden />}
                    label={profile.country}
                  />
                ) : null}
                {profile.languages.length > 0 ? (
                  <MetaChip
                    icon={<Globe className="size-3.5" strokeWidth={1.8} aria-hidden />}
                    label={profile.languages.join(", ")}
                  />
                ) : null}
                {profile.imcRegistration ? (
                  <MetaChip
                    icon={<ShieldCheck className="size-3.5" strokeWidth={1.8} aria-hidden />}
                    label={profile.imcRegistration}
                  />
                ) : null}
              </div>

              {/* Registration number */}
              {profile.imcRegistration ? (
                <p
                  className="mt-5 text-[13px]"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  <span style={{ color: "rgba(255,255,255,0.28)" }}>Registration No.</span>{" "}
                  <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                    {profile.imcRegistration}
                  </span>
                </p>
              ) : null}

              {/* CTA buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={hero.primaryCta.href} className="gh2-btn-lime">
                  <CalendarDays className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                  {hero.primaryCta.label}
                </Link>

                {profile.medicalRegistrationUrl ? (
                  <a
                    href={profile.medicalRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gh2-btn-ghost"
                  >
                    <ExternalLink className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                    Medical registration
                  </a>
                ) : hero.secondaryCta ? (
                  <Link href={hero.secondaryCta.href} className="gh2-btn-ghost">
                    {hero.secondaryCta.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── BODY — long-form bio + sticky booking ── */}
      <section
        style={{
          background: "var(--color-background-soft)",
          borderTop: "1px solid rgba(29,75,54,0.10)",
          padding: "clamp(56px,7vw,96px) 0",
        }}
      >
        <div className="gh-container grid gap-16 lg:grid-cols-[1.5fr_1fr] lg:gap-24">
          <article>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--color-brand-primary)" }}
            >
              Profile
            </p>
            <h2
              className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.05]"
              style={{
                fontSize: "clamp(1.85rem,3.5vw,2.75rem)",
                color: "var(--color-text-primary)",
              }}
            >
              About {profile.name.split(" ").slice(0, 2).join(" ")}
            </h2>
            <div
              className="mt-8 text-[16px] leading-[1.85] [&_p]:mt-5 [&_p:first-child]:mt-0 [&_a]:underline [&_a]:underline-offset-2"
              style={{
                color: "var(--color-text-body)",
              }}
              dangerouslySetInnerHTML={{ __html: safeBio }}
            />

            {profile.qualifications.length > 0 ? (
              <div
                className="mt-14 pt-10"
                style={{ borderTop: "1px solid rgba(29,75,54,0.12)" }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: "var(--color-brand-primary)" }}
                >
                  Qualifications
                </p>
                <ul className="mt-6 space-y-3 text-[15px] leading-[1.7]" style={{ color: "var(--color-text-body)" }}>
                  {profile.qualifications.map((q) => (
                    <li key={q} className="flex items-start gap-3">
                      <span
                        className="mt-2.5 h-1 w-1 shrink-0 rounded-full"
                        style={{ background: "#8FB021" }}
                      />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {doctifyWidgetUrl ? (
              <div
                className="mt-12 overflow-hidden p-6"
                style={{
                  borderRadius: "var(--radius-card)",
                  border: "1px solid var(--color-border)",
                  background: "white",
                }}
              >
                <iframe
                  src={doctifyWidgetUrl}
                  title="Patient reviews"
                  className="h-[220px] w-full"
                  loading="lazy"
                />
              </div>
            ) : null}
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="p-8 md:p-10"
              style={{
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--color-border)",
                background: "white",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <span
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "var(--color-brand-primary)" }}
              >
                Book this clinician
              </span>
              <h3
                className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.1]"
                style={{ fontSize: "clamp(1.4rem,2.5vw,1.85rem)", color: "var(--color-text-primary)" }}
              >
                Open video slots, subject to availability.
              </h3>
              <p
                className="mt-4 text-[14.5px] leading-[1.7]"
                style={{ color: "var(--color-text-muted)" }}
              >
                You&apos;ll receive a calendar invite immediately after booking — no back-and-forth.
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
      <section
        style={{
          background: "linear-gradient(168deg, #15382A 0%, #0F2E25 55%, #0B241C 100%)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "clamp(40px,5vw,64px) 0",
        }}
      >
        <div className="gh-container">
          <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                Next step
              </p>
              <h2
                className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.05]"
                style={{
                  fontSize: "clamp(1.85rem,4vw,3rem)",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                {bottomCta.title}
              </h2>
              <p
                className="mt-6 max-w-[520px] text-[15px] leading-[1.7]"
                style={{ color: "rgba(255,255,255,0.52)" }}
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
