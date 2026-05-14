/**
 * Editorial type-first hero — "See a doctor. From anywhere."
 *
 * Mirrors `ui_kits/website/HomeHero.jsx` exactly:
 *   • Faint medical-pattern overlay
 *   • Tiny eyebrow with hyphen rule
 *   • Display H1 clamp(48px,9vw,128px) with accent-band on "From anywhere."
 *   • 22px lede paragraph
 *   • 2-col hero bottom: country booking card + dark "Right now" feed
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CountryCode } from "@/data/countries";
import { countrySlug } from "@/lib/routing/country-slug";

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

const COUNTRY_META: Record<
  string,
  { doctors: number; language: string; nextSlot: string }
> = {
  ie: { doctors: 14, language: "English", nextSlot: "today 14:30" },
  pt: { doctors: 11, language: "Portuguese", nextSlot: "today 11:15" },
  sp: { doctors: 9, language: "Spanish", nextSlot: "today 16:00" },
  cz: { doctors: 7, language: "Czech", nextSlot: "tomorrow 09:00" },
  rm: { doctors: 6, language: "Romanian", nextSlot: "today 17:30" },
};

const NOW_FEED = [
  { name: "Dr. Inês C.", role: "GP, Portugal", waitMin: 9 },
  { name: "Dr. Siobhán W.", role: "GP, Ireland", waitMin: 16 },
  { name: "Dr. María R.", role: "Dermatology, Spain", waitMin: 24 },
];

export function HomeHero({
  countryCode,
  countryName,
}: {
  countryCode: CountryCode;
  countryName: string;
}) {
  const meta = COUNTRY_META[countryCode];
  const totalOnline = Object.values(COUNTRY_META).reduce(
    (sum, c) => sum + c.doctors,
    0,
  );
  const bookHref = `/${countrySlug(countryCode)}/services`;
  const flag = FLAG_CLASS[countryCode] ?? "";

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
        {/* Eyebrow with hyphen */}
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

        {/* Big headline */}
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
          Online video consultations with locally-registered doctors in
          Ireland, Portugal, Spain, Czechia, and Romania. Same day, in your
          language, from your sofa.
        </p>

        {/* 2-col hero bottom */}
        <div
          className="gh-hero-bottom grid gap-4"
          style={{ marginTop: 48 }}
        >
          {/* LEFT — country booking card */}
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
              className="grid grid-cols-3 gap-3"
              style={{
                padding: "16px 0",
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <Stat label="Doctors" value={String(meta?.doctors ?? "—")} />
              <Stat label="Language" value={meta?.language ?? "—"} />
              <Stat label="Next slot" value={meta?.nextSlot ?? "—"} highlight />
            </div>

            <Link
              href={bookHref}
              className="gh-btn gh-btn-primary"
              style={{ minHeight: 52 }}
            >
              Book consultation in {countryName}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* RIGHT — dark "Right now" feed */}
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
                Right now
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
                {totalOnline} doctors online across Europe
              </p>
            </div>
            <div className="relative flex flex-col gap-2.5">
              {NOW_FEED.map((d) => {
                const initials = d.name.match(/[A-Z]/g)?.slice(0, 2).join("") ?? "·";
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
                    <span
                      className="whitespace-nowrap"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(200,230,160,0.16)",
                        color: "var(--color-accent)",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      in {d.waitMin} min
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
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

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
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
          color: highlight
            ? "var(--color-brand-primary)"
            : "var(--color-text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
    </div>
  );
}
