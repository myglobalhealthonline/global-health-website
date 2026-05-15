"use client";

/**
 * Two-step landing page: pick country → pick language → enter site.
 *
 * Mirrors `ui_kits/website/Landing.jsx` from the design bundle line-by-line:
 *   • Forest-night background with medical-pattern texture + radial blooms
 *   • Top header: mint "g" mark + wordmark + "MEDICINE WITHOUT BORDERS"
 *   • 3-step pager (Country · Language · Enter) with active+done states
 *   • Step 0: "Where are you?" + country card grid
 *   • Step 1: "Choose your language" + language card grid with "Hello." in each
 *   • Footer: copyright + GDPR note
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { CountryConfig } from "@/data/countries";
import type { LocaleCode } from "@/lib/i18n/types";
import { countrySlug } from "@/lib/routing/country-slug";

type Props = {
  countries: CountryConfig[];
  /**
   * Per-country live counts from the DB, keyed by country code (e.g. "ie").
   * Caller computes this server-side. Pass an empty object to suppress the
   * "N doctors" line on each card.
   */
  countryMeta?: Record<string, { doctors?: number }>;
};

const LANG_NAMES: Record<LocaleCode, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  cs: "Čeština",
  ro: "Română",
  de: "Deutsch",
};

const LANG_HELLO: Record<LocaleCode, string> = {
  en: "Hello.",
  pt: "Olá.",
  es: "Hola.",
  cs: "Ahoj.",
  ro: "Salut.",
  de: "Hallo.",
};

// Per-country counts are provided by the caller via `countryMeta` — no
// hardcoded data lives in this file. Earlier versions baked in capitals + a
// fake doctor count per country; both were removed when this section was
// converted to be database-driven.

const FLAG_CLASS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

const PATTERN_WHITE =
  "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E\")";

export function CountryEntryGate({ countries, countryMeta }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  const chosenCountry = countries.find((c) => c.code === countryCode) ?? null;

  function pickCountry(code: string) {
    setCountryCode(code);
    setStep(1);
  }

  function enter(lang: LocaleCode) {
    if (!chosenCountry) return;
    router.push(`/${countrySlug(chosenCountry.code)}?lang=${lang}`);
  }

  const steps = [
    { n: 1, label: "Country" },
    { n: 2, label: "Language" },
    { n: 3, label: "Enter" },
  ];

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden text-white"
      style={{ background: "var(--color-background-dark)" }}
    >
      {/* Medical-pattern texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.04,
          backgroundImage: PATTERN_WHITE,
          backgroundSize: "28px",
        }}
      />
      {/* Radial accent blooms */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 400px at 80% -10%, rgba(200,230,160,0.10), transparent 60%), radial-gradient(700px 400px at 0% 110%, rgba(176,241,34,0.06), transparent 70%)",
        }}
      />

      {/* Top — wordmark + eyebrow */}
      <header
        className="relative flex items-center justify-between"
        style={{ padding: "28px clamp(20px,4vw,48px)" }}
      >
        <div className="inline-flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--color-accent)",
              color: "var(--color-background-dark)",
              fontFamily: "var(--font-display)",
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            g
          </span>
          <span
            className="text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Global Health
          </span>
        </div>
        <p
          className="m-0 uppercase"
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.18em",
            fontWeight: 700,
          }}
        >
          Medicine without borders
        </p>
      </header>

      {/* Step pager */}
      <div
        className="relative w-full"
        style={{
          padding: "0 clamp(20px,4vw,48px)",
          maxWidth: 1080,
          margin: "0 auto",
        }}
      >
        <ol
          className="m-0 flex gap-8 p-0"
          style={{ listStyle: "none", fontSize: 12, fontWeight: 600 }}
        >
          {steps.map((s, i) => {
            const isCurrent = i === step;
            const isDone = i < step;
            const color = isCurrent
              ? "#fff"
              : isDone
                ? "var(--color-accent)"
                : "rgba(255,255,255,0.40)";
            return (
              <li
                key={s.n}
                className="inline-flex items-center gap-2.5"
                style={{
                  color,
                  fontWeight: isCurrent ? 700 : 600,
                }}
              >
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: "1.5px solid currentColor",
                    fontSize: 11,
                    fontWeight: 800,
                    background: isDone ? "var(--color-accent)" : "transparent",
                    color: isDone ? "var(--color-background-dark)" : "currentColor",
                  }}
                >
                  {isDone ? "✓" : s.n}
                </span>
                {s.label}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Body */}
      <main
        className="relative flex flex-1 items-center"
        style={{ padding: "48px clamp(20px,4vw,48px) 96px" }}
      >
        <div className="w-full" style={{ maxWidth: 1080, margin: "0 auto" }}>
          {step === 0 ? (
            <>
              <h1
                className="m-0 text-white"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(40px, 6vw, 80px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.96,
                  maxWidth: "16ch",
                }}
              >
                Where are{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 60%, rgba(200,230,160,0.30) 60% 92%, transparent 92%)",
                    paddingInline: "0.05em",
                  }}
                >
                  you
                </span>
                ?
              </h1>
              <p
                className="m-0 mt-5"
                style={{
                  fontSize: 18,
                  lineHeight: 1.55,
                  color: "rgba(255,255,255,0.70)",
                  maxWidth: "44ch",
                }}
              >
                We connect you with doctors registered in your country. Pick yours to continue.
              </p>

              <div
                className="mt-14 grid gap-3"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(200px, 1fr))",
                }}
              >
                {countries.map((c) => {
                  const meta = countryMeta?.[c.code];
                  const flagCls = FLAG_CLASS[c.code] ?? "";
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => pickCountry(c.code)}
                      className="gh-landing-card flex flex-col gap-4 text-left text-white"
                      style={{
                        padding: 22,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 20,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 180ms ease-out",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex items-center justify-center"
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.10)",
                          }}
                        >
                          <span
                            aria-hidden
                            className={`${flagCls} inline-block`}
                            style={{
                              width: 28,
                              height: 20,
                              borderRadius: 3,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className="m-0 text-white"
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 20,
                              fontWeight: 800,
                              letterSpacing: "-0.015em",
                              lineHeight: 1.1,
                            }}
                          >
                            {c.name}
                          </p>
                          {/* Capital label dropped — Country model has no
                              `capital` field today. Re-add once available. */}
                        </div>
                      </div>
                      <div
                        className="flex items-center justify-between"
                        style={{
                          paddingTop: 12,
                          borderTop: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.60)",
                          }}
                        >
                          <strong
                            className="text-white"
                            style={{ fontWeight: 700 }}
                          >
                            {meta?.doctors ?? "—"}
                          </strong>{" "}
                          {meta?.doctors === 1 ? "doctor" : "doctors"}
                        </span>
                        <span
                          className="inline-flex items-center gap-1"
                          style={{
                            fontSize: 12,
                            color: "var(--color-accent)",
                            fontWeight: 700,
                          }}
                        >
                          Enter <ArrowRight className="size-3.5" aria-hidden />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 1 && chosenCountry ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setCountryCode(null);
                }}
                className="inline-flex items-center gap-2 text-white"
                style={{
                  padding: "8px 12px 8px 8px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.80)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 32,
                }}
              >
                <ArrowRight
                  className="size-3.5"
                  aria-hidden
                  style={{ transform: "rotate(180deg)" }}
                />
                Change country · {chosenCountry.name}
              </button>

              <h1
                className="m-0 text-white"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(40px, 6vw, 80px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.96,
                  maxWidth: "18ch",
                }}
              >
                Choose your{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 60%, rgba(200,230,160,0.30) 60% 92%, transparent 92%)",
                    paddingInline: "0.05em",
                  }}
                >
                  language
                </span>
              </h1>
              <p
                className="m-0 mt-5"
                style={{
                  fontSize: 18,
                  lineHeight: 1.55,
                  color: "rgba(255,255,255,0.70)",
                  maxWidth: "44ch",
                }}
              >
                Your consultation, your prescriptions, and the website — all in
                the language you pick.
              </p>

              <div
                className="mt-12 grid gap-3"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  maxWidth: 720,
                }}
              >
                {chosenCountry.supportedLocales.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => enter(l)}
                    className="gh-landing-card flex items-center justify-between gap-4 text-left text-white"
                    style={{
                      padding: "22px 24px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 20,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 180ms ease-out",
                    }}
                  >
                    <div>
                      <p
                        className="m-0 text-white"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 22,
                          fontWeight: 800,
                          letterSpacing: "-0.015em",
                        }}
                      >
                        {LANG_HELLO[l]}
                      </p>
                      <p
                        className="m-0"
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "rgba(255,255,255,0.60)",
                        }}
                      >
                        {LANG_NAMES[l]} · {l.toUpperCase()}
                      </p>
                    </div>
                    <ArrowRight
                      className="size-[18px]"
                      aria-hidden
                      style={{ color: "var(--color-accent)" }}
                    />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative flex flex-wrap justify-between gap-4"
        style={{
          padding: "20px clamp(20px,4vw,48px) 28px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 12,
          color: "rgba(255,255,255,0.40)",
        }}
      >
        <span>
          © {new Date().getFullYear()} Global Health · EU-registered telemedicine provider
        </span>
        <span>GDPR compliant · Doctors registered locally in 5 countries</span>
      </footer>

      <style jsx>{`
        .gh-landing-card:hover {
          background: rgba(200, 230, 160, 0.1) !important;
          border-color: var(--color-accent) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
