/**
 * Editorial type-first hero — "See a doctor. From anywhere."
 *
 * Data-driven. All country-specific values (doctor count, locale, live-doctor
 * feed) are passed in by the caller. Earlier versions hard-coded a
 * `COUNTRY_META` table and a fake "NOW_FEED" — both removed so the hero only
 * shows what the database actually knows.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CountryCode } from "@/data/countries";

const PATTERN_LIGHT =
  "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%231B4D3E' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E\")";
const PATTERN_DARK =
  "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E\")";

const FLAG_CLASS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

export type LiveDoctorItem = {
  name: string;
  role: string;
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
  /** Active doctors registered in this country, from the DB. */
  doctorCount: number;
  /** Display label for the country's default locale (e.g. "English"). */
  languageLabel: string;
  /** Where the primary CTA points. Caller passes the lang-aware path. */
  bookHref: string;
  /** Sum of active doctors across all countries. */
  totalDoctorsAcrossEurope: number;
  /** Optional spotlight: a handful of doctors to surface in the "Right now" feed.
   *  Pass undefined or [] to hide the feed entirely (preferred over fake data). */
  liveDoctors?: LiveDoctorItem[];
  /** Admin overrides — when set, these replace the default copy/visual. */
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageSrc?: string | null;
  ctaLabel?: string | null;
}) {
  const flag = FLAG_CLASS[countryCode] ?? "";
  const displayHeroTitle = heroTitle?.trim() || null;
  const displayHeroSubtitle = heroSubtitle?.trim() || null;
  const displayCtaLabel = ctaLabel?.trim() || `Book consultation in ${countryName}`;

  return (
    <section
      className="relative overflow-hidden"
      style={{ paddingBottom: 64, paddingTop: 64 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.04,
          backgroundImage: PATTERN_LIGHT,
          backgroundSize: "28px",
        }}
      />

      <div
        className="relative z-[1] mx-auto"
        style={{
          maxWidth: 1320,
          padding: "0 clamp(20px, 4vw, 40px)",
        }}
      >
        <div
          className="inline-flex items-center gap-3 uppercase"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--color-brand-primary)",
            letterSpacing: "0.18em",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 24,
              height: 1,
              background: "var(--color-brand-primary)",
            }}
          />
          Medicine without borders
        </div>

        <h1
          className="m-0 text-[var(--color-text-primary)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(48px, 9vw, 128px)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 0.92,
            marginTop: 20,
            maxWidth: "14ch",
          }}
        >
          {displayHeroTitle ? (
            displayHeroTitle
          ) : (
            <>
              See a doctor.{" "}
              <span
                style={{
                  background:
                    "linear-gradient(180deg, transparent 64%, var(--color-accent) 64% 92%, transparent 92%)",
                  paddingInline: "0.05em",
                }}
              >
                From anywhere.
              </span>
            </>
          )}
        </h1>

        <p
          className="text-[var(--color-text-muted)]"
          style={{
            marginTop: 28,
            fontSize: "clamp(17px, 1.4vw, 22px)",
            lineHeight: 1.55,
            maxWidth: "44ch",
          }}
        >
          {displayHeroSubtitle ??
            "Online video consultations with locally-registered doctors. Same day, in your language, from your sofa."}
        </p>

        {heroImageSrc ? (
          // Admin-uploaded hero visual sits between the lede and the booking
          // panel. Wrapped in a `next/image`-less <img> because the source can
          // be an arbitrary /api/media path or external HTTPS URL and we don't
          // pre-register it in next.config remotePatterns.
          <div
            className="mt-10 overflow-hidden"
            style={{
              borderRadius: 24,
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-soft)",
              background: "var(--color-background-soft)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageSrc}
              alt={displayHeroTitle ?? `${countryName} clinic`}
              className="block w-full"
              style={{ maxHeight: 440, objectFit: "cover" }}
            />
          </div>
        ) : null}

        <div className="gh-hero-bottom grid gap-4" style={{ marginTop: 48 }}>
          <div
            className="flex flex-col gap-5"
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 24,
              background: "var(--color-background-page)",
              padding: 28,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center gap-4">
              <span
                className="inline-flex shrink-0 items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "var(--color-background-soft)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <span
                  aria-hidden
                  className={`${flag} inline-block`}
                  style={{
                    width: 30,
                    height: 22,
                    borderRadius: 3,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              </span>
              <div className="flex-1">
                <p
                  className="m-0 uppercase"
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                  }}
                >
                  Booking in
                </p>
                <p
                  className="m-0"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.1,
                  }}
                >
                  {countryName}
                </p>
              </div>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#16A34A",
                  boxShadow: "0 0 0 4px rgba(22,163,74,0.18)",
                  animation: "gh-pulse 2s ease-out infinite",
                }}
              />
            </div>

            <div
              className="grid grid-cols-2 gap-3"
              style={{
                padding: "16px 0",
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <Stat label="Doctors" value={String(doctorCount)} />
              <Stat label="Language" value={languageLabel} />
            </div>

            <Link
              href={bookHref}
              className="gh-btn gh-btn-primary"
              style={{ minHeight: 52 }}
            >
              {displayCtaLabel}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* "Right now" feed only renders when the caller passed real data.
              Empty feed → omit the panel entirely. */}
          {liveDoctors && liveDoctors.length > 0 ? (
            <div
              className="relative flex flex-col gap-4 overflow-hidden text-white"
              style={{
                borderRadius: 24,
                background: "var(--color-background-dark)",
                padding: 28,
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  opacity: 0.06,
                  backgroundImage: PATTERN_DARK,
                  backgroundSize: "28px",
                }}
              />
              <div className="relative">
                <p
                  className="m-0 uppercase"
                  style={{
                    fontSize: 11,
                    color: "var(--color-accent)",
                    letterSpacing: "0.18em",
                    fontWeight: 700,
                  }}
                >
                  Doctors live
                </p>
                <p
                  className="m-0"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: "-0.015em",
                    lineHeight: 1.2,
                    marginTop: 4,
                  }}
                >
                  {totalDoctorsAcrossEurope} active doctors across Europe
                </p>
              </div>
              <div className="relative flex flex-col gap-2.5">
                {liveDoctors.slice(0, 4).map((d) => {
                  const initials =
                    d.name.match(/[A-Z]/g)?.slice(0, 2).join("") ?? "·";
                  return (
                    <div
                      key={d.name}
                      className="flex items-center gap-3"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 14,
                        padding: "10px 14px",
                      }}
                    >
                      <span
                        className="inline-flex items-center justify-center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          background:
                            "linear-gradient(135deg, var(--color-accent), var(--color-brand-primary))",
                          color: "var(--color-background-dark)",
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="m-0 truncate text-white"
                          style={{ fontSize: 13, fontWeight: 700 }}
                        >
                          {d.name}
                        </p>
                        <p
                          className="m-0"
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.65)",
                          }}
                        >
                          {d.role}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes gh-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(22,163,74,0.18); }
          50% { box-shadow: 0 0 0 8px rgba(22,163,74,0.05); }
        }
        .gh-hero-bottom { grid-template-columns: 1fr; }
        @media (min-width: 900px) {
          .gh-hero-bottom { grid-template-columns: 1.1fr 1fr; gap: 20px; }
        }
      `}</style>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="m-0 uppercase"
        style={{
          fontSize: 11,
          color: "var(--color-text-muted)",
          letterSpacing: "0.08em",
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <p
        className="m-0"
        style={{
          marginTop: 2,
          fontSize: 14,
          fontWeight: 700,
          color: "var(--color-text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
    </div>
  );
}
