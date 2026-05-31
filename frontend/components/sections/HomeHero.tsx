import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Stethoscope, Clock } from "lucide-react";
import type { CountryCode } from "@/data/countries";
import { Flag } from "@/components/ui/Flag";

export type LiveDoctorItem = {
  name: string;
  role: string;
  imageSrc?: string | null;
};

export function HomeHero({
  countryCode,
  countryName,
  doctorCount,
  languageLabel,
  bookHref,
  totalDoctorsAcrossEurope,
  liveDoctors,
  heroTitle,
  heroSubtitle,
  heroImageSrc,
  ctaLabel,
}: {
  countryCode: CountryCode;
  countryName: string;
  doctorCount: number;
  languageLabel: string;
  bookHref: string;
  totalDoctorsAcrossEurope: number;
  liveDoctors?: LiveDoctorItem[];
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageSrc?: string | null;
  ctaLabel?: string | null;
}) {
  const displayHeroTitle = heroTitle?.trim() || null;
  const displayHeroSubtitle = heroSubtitle?.trim() || null;
  const displayCtaLabel = ctaLabel?.trim() || "Book a consultation";
  const doctorsForPanel = (liveDoctors ?? []).slice(0, 4);
  const heroPhotoSrc = normalizeHeroPhoto(heroImageSrc);
  const unoptimizedHeroPhoto =
    /^https?:\/\//i.test(heroPhotoSrc) || heroPhotoSrc.startsWith("/api/media/");

  return (
    <section
      aria-labelledby="hero-title"
      className="
        relative overflow-hidden
        bg-[var(--color-background-dark)]
        gh-medical-pattern gh-medical-pattern-dark
      "
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 700px 500px at 105% -5%, rgba(176,241,34,0.07), transparent 50%)",
        }}
      />

      <div
        className="gh-home-hero-grid relative z-[1] mx-auto grid max-w-[var(--container-width)] items-center gap-10 px-5 py-14 md:px-10 lg:py-20"
        style={{ minHeight: "calc(100svh - var(--header-height))" }}
      >
        <div className="flex max-w-[720px] flex-col py-12 lg:py-24">
          <div className="mb-10 flex flex-wrap items-center gap-5">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]">
              <Flag code={countryCode} size="sm" />
              {countryName}
            </span>
            <span
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              <span aria-hidden className="gh-pulse-dot !size-1.5" />
              {doctorCount} available
            </span>
          </div>

          <h1
            id="hero-title"
            className="max-w-[14ch] text-[length:var(--text-display)] font-extrabold text-white"
            style={{
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
            }}
          >
            {displayHeroTitle ? (
              displayHeroTitle
            ) : (
              <>
                Meet our{" "}
                <span style={{ color: "var(--color-brand-accent)" }}>
                  licensed doctors.
                </span>
              </>
            )}
          </h1>

          <p
            className="mt-8 max-w-[44ch] text-[length:var(--text-body-lg)] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            {displayHeroSubtitle ??
              "Licensed clinicians registered with national medical councils across Ireland, Portugal, Spain, Czechia and Romania."}
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              href={bookHref}
              className="
                inline-flex items-center gap-2.5
                rounded-full px-8 py-[14px]
                text-sm font-bold tracking-[-0.01em] text-white
                transition-colors duration-200
                hover:bg-white/10
                motion-reduce:transition-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
              "
              style={{ border: "1px solid rgba(255,255,255,0.22)" }}
            >
              {displayCtaLabel}
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
            <Link
              href="#services"
              className="
                text-sm font-semibold text-white/60
                transition-colors duration-200
                hover:text-white/85
                motion-reduce:transition-none
                focus-visible:outline-none
              "
            >
              Browse services
            </Link>
          </div>

          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-2">
            {[
              { icon: ShieldCheck, label: `Licensed in ${countryName}` },
              { icon: Clock, label: "Same-day slots" },
              { icon: Stethoscope, label: "No clinic visits" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "rgba(255,255,255,0.58)" }}
              >
                <Icon
                  className="size-3.5 text-[var(--color-brand-accent)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                {label}
              </li>
            ))}
          </ul>

          <div
            className="relative mt-10 aspect-[16/10] overflow-hidden lg:hidden"
            style={{
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 28px 70px rgba(0,0,0,0.28)",
            }}
          >
            <Image
              src={heroPhotoSrc}
              alt={`Doctor speaking with a patient during a telemedicine consultation for ${countryName}`}
              fill
              priority
              unoptimized={unoptimizedHeroPhoto}
              className="object-cover"
              sizes="100vw"
            />
          </div>
        </div>

        <div className="relative hidden min-h-[520px] lg:block">
          <div
            className="absolute inset-y-6 left-0 right-0 overflow-hidden"
            style={{
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              boxShadow: "0 32px 90px rgba(0,0,0,0.30)",
            }}
          >
            <Image
              src={heroPhotoSrc}
              alt={`Doctor speaking with a patient during a telemedicine consultation for ${countryName}`}
              fill
              priority
              unoptimized={unoptimizedHeroPhoto}
              className="object-cover"
              sizes="(min-width: 1280px) 520px, 42vw"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(15,46,37,0.02) 0%, rgba(15,46,37,0.52) 100%)",
              }}
            />
          </div>

          <div
            className="absolute left-6 top-10 inline-flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(255,255,255,0.42)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.16)",
              color: "var(--color-brand-primary)",
            }}
          >
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] text-white">
              <Stethoscope className="size-4" strokeWidth={1.7} aria-hidden />
            </span>
            <span className="text-[12px] font-bold leading-tight">
              Secure online care
              <span className="block text-[10px] font-semibold text-[var(--color-text-muted)]">
                From home
              </span>
            </span>
          </div>

          {doctorsForPanel.length > 0 ? (
            <aside
              aria-label="Doctors available now"
              className="absolute bottom-0 right-0 flex w-[312px] flex-col"
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 22,
                background: "rgba(15,46,37,0.72)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                boxShadow: "0 24px 70px rgba(0,0,0,0.24)",
                padding: "24px",
              }}
            >
              <p
                className="mb-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "var(--color-brand-accent)" }}
              >
                <span aria-hidden className="gh-pulse-dot !size-1.5" />
                Available now
              </p>

              <ul className="space-y-4">
                {doctorsForPanel.map((d) => (
                  <li key={d.name} className="flex items-center gap-3">
                    <AvatarBubble name={d.name} imageSrc={d.imageSrc} />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[13px] font-bold"
                        style={{ color: "rgba(255,255,255,0.88)" }}
                      >
                        {d.name}
                      </p>
                      <p
                        className="truncate text-[11px]"
                        style={{ color: "rgba(255,255,255,0.64)" }}
                      >
                        {d.role}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div
                className="mt-5 pt-5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}
              >
                <p
                  className="mb-5 text-[11px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.40)" }}
                >
                  {totalDoctorsAcrossEurope} doctors across Europe
                  <br />
                  Consulting in {languageLabel}
                </p>
                <Link
                  href={bookHref}
                  className="
                    flex w-full items-center justify-center gap-2
                    rounded-full py-3
                    text-[13px] font-bold text-white
                    transition-colors duration-200
                    hover:bg-white/10
                    motion-reduce:transition-none
                  "
                  style={{ border: "1px solid rgba(255,255,255,0.18)" }}
                >
                  Book now
                  <ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden />
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />

      <style>{`
        .gh-home-hero-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 1024px) {
          .gh-home-hero-grid {
            grid-template-columns: minmax(0, 0.98fr) minmax(420px, 0.78fr);
          }
        }
      `}</style>
    </section>
  );
}

function normalizeHeroPhoto(src?: string | null): string {
  const trimmed = src?.trim();
  if (!trimmed) return "/images/hero/homehero.png";
  if (trimmed.endsWith(".svg") || trimmed.includes("-ai.") || trimmed.includes("-placeholder.")) {
    return "/images/hero/homehero.png";
  }
  return trimmed;
}

function AvatarBubble({ name, imageSrc }: { name: string; imageSrc?: string | null }) {
  const initials =
    name.match(/[A-Z]/g)?.slice(0, 2).join("") || name.slice(0, 2).toUpperCase();
  if (imageSrc?.trim()) {
    const src = imageSrc.trim();
    return (
      <span
        aria-hidden
        className="relative inline-flex size-10 shrink-0 overflow-hidden rounded-full"
        style={{ border: "1px solid rgba(255,255,255,0.20)" }}
      >
        <Image
          src={src}
          alt=""
          fill
          unoptimized={/^https?:\/\//i.test(src) || src.startsWith("/api/media/")}
          className="object-cover object-top"
          sizes="40px"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight"
      style={{
        background: "rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.70)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {initials}
    </span>
  );
}
