import Image from "next/image";
import Link from "next/link";
/* eslint-disable react/no-unescaped-entities */
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
    <main className="bg-[var(--color-background-page)]">

      {/* ── HERO — dark forest, medical cross pattern, split layout ── */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(48px,6vw,80px) 0 clamp(56px,7vw,96px)",
        }}
      >
        {/* Lime radial glow — top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 900px 600px at 100% -15%, rgba(176,241,34,0.13), transparent 55%)",
          }}
        />

        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-center gap-10 lg:grid-cols-[420px_1fr] lg:gap-16 xl:grid-cols-[460px_1fr] xl:gap-20">

            {/* ── LEFT — portrait ── */}
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: 28,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                aspectRatio: "3 / 4",
              }}
            >
              {profileImageSrc ? (
                <Image
                  src={profileImageSrc}
                  alt={profile.name}
                  fill
                  sizes="(min-width:1280px) 460px, (min-width:1024px) 420px, 100vw"
                  priority
                  className="object-cover object-top"
                  unoptimized={
                    /^https?:\/\//i.test(profileImageSrc) ||
                    profileImageSrc.startsWith("/api/media/")
                  }
                />
              ) : (
                /* placeholder gradient when no image */
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(176,241,34,0.08) 0%, rgba(29,75,54,0.30) 100%)",
                  }}
                />
              )}

              {/* Bottom name card overlay */}
              {profileImageSrc ? (
                <div
                  className="absolute bottom-0 left-0 right-0 px-5 py-4"
                  style={{
                    background:
                      "linear-gradient(0deg, rgba(8,22,15,0.82) 0%, rgba(8,22,15,0.55) 70%, transparent 100%)",
                  }}
                >
                  <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {profile.title}
                  </p>
                  <p className="mt-0.5 text-[15px] font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
                    {profile.name}
                  </p>
                </div>
              ) : null}
            </div>

            {/* ── RIGHT — info ── */}
            <div>
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
                  fontSize: "clamp(2.4rem, 4.5vw + 0.5rem, 4.2rem)",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                {profile.name}
              </h1>

              {/* Role — lime green */}
              <p
                className="mt-3 text-[1.1rem] font-semibold"
                style={{ color: "var(--color-brand-accent)" }}
              >
                {profile.title}
              </p>

              {/* Description */}
              {hero.description ? (
                <p
                  className="mt-4 max-w-[46ch] text-[15px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.72)" }}
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

              {/* Metadata chips — horizontal */}
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

              {/* CTA buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {/* Primary — lime, dark text */}
                <Link
                  href={hero.primaryCta.href}
                  className="inline-flex items-center gap-2 rounded-full text-[14.5px] font-bold transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: "var(--color-brand-accent)",
                    color: "var(--color-brand-primary)",
                    padding: "13px 24px",
                  }}
                >
                  <CalendarDays className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                  {hero.primaryCta.label}
                </Link>

                {/* Secondary — outlined */}
                {profile.medicalRegistrationUrl ? (
                  <a
                    href={profile.medicalRegistrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full text-[14.5px] font-semibold transition-[background-color] duration-200 hover:bg-white/10"
                    style={{
                      border: "1.5px solid rgba(255,255,255,0.22)",
                      color: "rgba(255,255,255,0.85)",
                      padding: "12px 22px",
                    }}
                  >
                    <ExternalLink className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                    Medical registration
                  </a>
                ) : hero.secondaryCta ? (
                  <Link
                    href={hero.secondaryCta.href}
                    className="inline-flex items-center gap-2 rounded-full text-[14.5px] font-semibold transition-[background-color] duration-200 hover:bg-white/10"
                    style={{
                      border: "1.5px solid rgba(255,255,255,0.22)",
                      color: "rgba(255,255,255,0.85)",
                      padding: "12px 22px",
                    }}
                  >
                    {hero.secondaryCta.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY — long-form bio + sticky booking ── */}
      <section className="gh-section bg-[var(--color-background-page)]">
        <div className="gh-container grid gap-16 lg:grid-cols-[1.5fr_1fr] lg:gap-24">
          <article>
            <span className="gh-heading-eyebrow">Profile</span>
            <h2
              className="gh-display mt-5 text-[clamp(1.85rem,3.5vw,2.75rem)]"
              style={{ fontWeight: 800 }}
            >
              About {profile.name.split(" ").slice(0, 2).join(" ")}
            </h2>
            <div
              className="mt-8 text-[16px] leading-[1.85] text-[var(--color-text-body)] [&_p]:mt-5 [&_p:first-child]:mt-0 [&_a]:text-[var(--color-brand-primary)] [&_a]:underline [&_a]:underline-offset-2"
              dangerouslySetInnerHTML={{ __html: safeBio }}
            />

            {profile.qualifications.length > 0 ? (
              <div className="mt-14 border-t border-[var(--color-border)] pt-10">
                <span className="gh-heading-eyebrow">Qualifications</span>
                <ul className="mt-6 space-y-3 text-[15px] leading-[1.7] text-[var(--color-text-body)]">
                  {profile.qualifications.map((q) => (
                    <li key={q} className="flex items-start gap-3">
                      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-primary)]" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {doctifyWidgetUrl ? (
              <div className="mt-12 overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-background-soft)] p-6">
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
            <div className="rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-8 text-white md:p-10">
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                Book this clinician
              </span>
              <h3
                className="gh-display mt-5 text-[1.85rem] text-white"
                style={{ fontWeight: 800 }}
              >
                Same-day video slots, typically.
              </h3>
              <p className="mt-4 text-[14.5px] leading-[1.7] text-white/75">
                You'll receive a calendar invite immediately after booking — no
                back-and-forth.
              </p>
              <Link
                href={hero.primaryCta.href}
                className="gh-btn gh-btn-accent mt-8 w-full justify-center"
              >
                {hero.primaryCta.label}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="gh-section-sm border-t border-[var(--color-border)] bg-[var(--color-background-soft)]">
        <div className="gh-container">
          <div className="grid items-end gap-10 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <span className="gh-heading-eyebrow">Next step</span>
              <h2
                className="gh-display mt-5 text-[clamp(1.85rem,4vw,3rem)]"
                style={{ fontWeight: 800 }}
              >
                {bottomCta.title}
              </h2>
              <p className="mt-6 max-w-[520px] text-[15px] leading-[1.7] text-[var(--color-text-muted)]">
                {bottomCta.description}
              </p>
            </div>
            <Link href={bottomCta.ctaHref} className="gh-btn gh-btn-primary lg:justify-self-end">
              {bottomCta.ctaLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
