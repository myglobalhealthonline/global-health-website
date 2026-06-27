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
  };
  bottomCta: { title: string; description: string; ctaLabel: string; ctaHref: string };
  profileImageSrc?: string;
  bookingCtaImage?: { src: string; alt: string };
  showReviewScore?: boolean;
  doctifyWidgetUrl?: string;
  t?: {
    backToTeam?: string;
    doctorProfileLabel?: string;
    registeredIn?: string;
    onlineConsultAvailable?: string;
    verifiedProfile?: string;
    verifyRegistration?: string;
    primaryCareConsults?: string;
    languagesLabel?: string;
    availabilityLabel?: string;
    onlineAppointments?: string;
  };
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export function DoctorProfileTemplate({
  hero,
  profile,
  bottomCta,
  profileImageSrc,
  doctifyWidgetUrl,
  t,
}: DoctorProfileTemplateProps) {
  const safeBio = sanitizeDoctorBioHtml(profile.bio);
  const backHref = hero.secondaryCta?.href;
  const verifyHref = profile.verificationUrl ?? profile.medicalRegistrationUrl;
  const primarySpecialty = profile.specialties[0] ?? "General practice";
  const languageList = profile.languages.length > 0 ? profile.languages.join(", ") : "English";

  return (
    <section className="bg-[var(--color-background-page)]">

      {/* ── HERO — viewport-locked 50/50 split ── */}
      <section
        className="gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
        style={{
          background: "#031F18",
          height: "calc(100svh - var(--header-height))",
          minHeight: 620,
        }}
      >
        <div className="grid h-full lg:grid-cols-2">

          {/* ── LEFT — full-bleed doctor portrait ── */}
          <div className="relative h-full overflow-hidden">
            {/* Oversized "Doctor" watermark behind portrait */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden select-none"
            >
              <span
                style={{
                  fontSize: "clamp(5rem, 16vw, 14rem)",
                  fontWeight: 800,
                  WebkitTextStroke: "2px rgba(255,255,255,0.042)",
                  color: "transparent",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  paddingLeft: "4%",
                }}
              >
                Doctor
              </span>
            </div>

            {profileImageSrc ? (
              <Image
                src={profileImageSrc}
                alt={profile.name}
                fill
                sizes="(min-width:1024px) 50vw, 100vw"
                priority
                className="object-cover object-top"
                style={{ zIndex: 1 }}
                unoptimized={
                  /^https?:\/\//i.test(profileImageSrc) ||
                  profileImageSrc.startsWith("/api/media/")
                }
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  zIndex: 1,
                  background:
                    "linear-gradient(160deg, rgba(176,241,34,0.08) 0%, rgba(3,31,24,0.80) 100%)",
                }}
              />
            )}

            {/* Subtle green wash */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: 2, background: "rgba(3,31,24,0.22)", mixBlendMode: "multiply" }}
            />
            {/* Bottom vignette */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{
                zIndex: 2,
                height: "50%",
                background:
                  "linear-gradient(to top, rgba(3,31,24,0.92) 0%, rgba(3,31,24,0.42) 50%, transparent 100%)",
              }}
            />
            {/* Right-edge bleed → content column */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block"
              style={{
                zIndex: 2,
                width: "44%",
                background:
                  "linear-gradient(to right, transparent 0%, rgba(3,31,24,0.55) 42%, rgba(3,31,24,0.90) 72%, #031F18 100%)",
              }}
            />

            {/* Mobile name overlay */}
            {profileImageSrc ? (
              <div
                className="absolute bottom-0 left-0 right-0 px-6 pb-6 lg:hidden"
                style={{ zIndex: 3 }}
              >
                <p
                  className="text-[12px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: "var(--color-brand-accent)" }}
                >
                  {profile.title}
                </p>
                <p
                  className="mt-1 font-extrabold tracking-[-0.02em]"
                  style={{ fontSize: "1.35rem", color: "rgba(255,255,255,0.95)" }}
                >
                  {profile.name}
                </p>
              </div>
            ) : null}
          </div>

          {/* ── RIGHT — profile content ── */}
          <div
            className="relative flex h-full flex-col justify-center overflow-y-auto px-8 py-6 md:px-12 lg:px-14 lg:py-8"
            style={{ background: "#031F18" }}
          >
            {/* Layer 1 — gradient depth */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(circle at 88% 14%, rgba(22,89,64,0.30), transparent 42%)," +
                  "radial-gradient(circle at 12% 88%, rgba(2,18,13,0.55), transparent 44%)," +
                  "linear-gradient(135deg, #062b21 0%, #031F18 50%, #02140e 100%)",
              }}
            />
            {/* Layer 2 — technical lime grid */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(167,243,11,0.045) 1px, transparent 1px)," +
                  "linear-gradient(90deg, rgba(167,243,11,0.045) 1px, transparent 1px)",
                backgroundSize: "52px 52px",
                maskImage:
                  "radial-gradient(130% 130% at 80% 18%, #000 0%, rgba(0,0,0,0.40) 52%, transparent 88%)",
                WebkitMaskImage:
                  "radial-gradient(130% 130% at 80% 18%, #000 0%, rgba(0,0,0,0.40) 52%, transparent 88%)",
              }}
            />
            {/* Layer 3 — dot texture */}
            <div
              aria-hidden
              className="gh-dot-grid pointer-events-none absolute inset-0 z-0"
              style={{
                opacity: 0.55,
                maskImage:
                  "radial-gradient(700px 540px at 86% 12%, #000 0%, transparent 70%)",
                WebkitMaskImage:
                  "radial-gradient(700px 540px at 86% 12%, #000 0%, transparent 70%)",
              }}
            />
            {/* Layer 4 — lime ambient glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(ellipse 560px 480px at 72% 64%, rgba(167,243,11,0.10), transparent 62%)," +
                  "radial-gradient(ellipse 640px 540px at 112% -8%, rgba(167,243,11,0.11), transparent 60%)",
              }}
            />
            {/* Layer 5 — faint plus symbols */}
            <span
              aria-hidden
              className="pointer-events-none absolute z-0 select-none font-bold leading-none"
              style={{ top: "-2%", right: "5%", fontSize: "190px", color: "rgba(176,241,34,0.055)" }}
            >+</span>
            <span
              aria-hidden
              className="pointer-events-none absolute z-0 select-none font-bold leading-none"
              style={{ bottom: "8%", right: "10%", fontSize: "78px", color: "rgba(176,241,34,0.045)" }}
            >+</span>

            {/* Content */}
            <div className="relative z-10" style={{ maxWidth: 680 }}>

              {/* Top nav pills */}
              <div className="flex flex-wrap items-center gap-2">
                {backHref ? (
                  <Link
                    href={backHref}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors duration-200 hover:bg-white/10"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "rgba(255,255,255,0.65)",
                    }}
                  >
                    <ArrowLeft className="size-3.5 shrink-0" strokeWidth={2} />
                    {(t?.backToTeam ?? "Back to {country} team").replace("{country}", profile.country)}
                  </Link>
                ) : null}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  <User className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                  {t?.doctorProfileLabel ?? "Doctor Profile"}
                </span>
              </div>

              {/* Name */}
              <h1
                className="mt-5 font-extrabold tracking-[-0.038em] leading-[1.0]"
                style={{
                  fontSize: "clamp(2.4rem, 3.2vw + 0.8rem, 4.2rem)",
                  color: "#F5FFF8",
                }}
              >
                {profile.name}
              </h1>

              {/* Role */}
              <p
                className="mt-2 font-bold uppercase tracking-[0.22em]"
                style={{ fontSize: "clamp(11px, 0.9vw, 14px)", color: "var(--color-brand-accent)" }}
              >
                {profile.title}
              </p>

              {/* Description */}
              {hero.description ? (
                <p
                  className="mt-3 leading-relaxed"
                  style={{
                    maxWidth: "46ch",
                    fontSize: "clamp(0.88rem, 0.5vw + 0.72rem, 1rem)",
                    color: "#B8C9C2",
                  }}
                >
                  {hero.description}
                </p>
              ) : null}

              {/* Tag pills — specialty / country / languages */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
                  style={{
                    background: "rgba(5,34,27,0.78)",
                    border: "1px solid rgba(167,243,11,0.20)",
                    color: "rgba(255,255,255,0.80)",
                  }}
                >
                  <Stethoscope className="size-3.5 shrink-0" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.8} aria-hidden />
                  {primarySpecialty}
                </span>
                {profile.country ? (
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
                    style={{
                      background: "rgba(5,34,27,0.78)",
                      border: "1px solid rgba(167,243,11,0.20)",
                      color: "rgba(255,255,255,0.80)",
                    }}
                  >
                    <MapPin className="size-3.5 shrink-0" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.8} aria-hidden />
                    {profile.country}
                  </span>
                ) : null}
                {profile.languages.length > 0 ? (
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
                    style={{
                      background: "rgba(5,34,27,0.78)",
                      border: "1px solid rgba(167,243,11,0.20)",
                      color: "rgba(255,255,255,0.80)",
                    }}
                  >
                    <Globe className="size-3.5 shrink-0" style={{ color: "var(--color-brand-accent)" }} strokeWidth={1.8} aria-hidden />
                    {languageList}
                  </span>
                ) : null}
              </div>

              {/* Trust badge row */}
              <div
                className="mt-4 flex flex-wrap items-center gap-y-2 border-t pt-4"
                style={{ borderColor: "rgba(255,255,255,0.10)" }}
              >
                {[
                  { Icon: ShieldCheck, label: (t?.registeredIn ?? "Registered in {country}").replace("{country}", profile.country) },
                  { Icon: Video, label: t?.onlineConsultAvailable ?? "Online consultation available" },
                  { Icon: BadgeCheck, label: t?.verifiedProfile ?? "Verified profile" },
                ].map(({ Icon, label }, i) => (
                  <span key={label} className="flex items-center">
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="mx-4 hidden h-4 w-px sm:block"
                        style={{ background: "rgba(255,255,255,0.14)" }}
                      />
                    ) : null}
                    <span
                      className="inline-flex items-center gap-2 text-[12.5px] font-medium"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      <Icon
                        className="size-3.5 shrink-0"
                        style={{ color: "var(--color-brand-accent)" }}
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
                  className="gh2-btn-lime"
                  style={{ boxShadow: "0 4px 24px rgba(167,243,11,0.28)" }}
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
                    className="rounded-[16px] px-3.5 py-3.5"
                    style={{
                      background: "rgba(5,34,27,0.78)",
                      border: "1px solid rgba(167,243,11,0.18)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      boxShadow:
                        "0 8px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <span
                      className="inline-flex size-8 items-center justify-center rounded-[8px]"
                      style={{
                        background: "rgba(167,243,11,0.13)",
                        border: "1px solid rgba(167,243,11,0.18)",
                        color: "var(--color-brand-accent)",
                      }}
                    >
                      {card.icon}
                    </span>
                    <p className="mt-2.5 text-[13px] font-bold leading-tight text-white">
                      {card.title}
                    </p>
                    <p
                      className="mt-1 text-[11.5px] leading-snug"
                      style={{ color: "rgba(255,255,255,0.50)" }}
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
