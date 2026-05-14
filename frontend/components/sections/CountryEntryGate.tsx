"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Globe2 } from "lucide-react";
import type { CountryConfig } from "@/data/countries";
import type { LocaleCode } from "@/lib/i18n/types";
import { countrySlug } from "@/lib/routing/country-slug";

const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  cs: "Čeština",
  ro: "Română",
  de: "Deutsch",
};

const COUNTRY_FLAGS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

const COUNTRY_TAGLINES: Record<string, string> = {
  ie: "Ireland",
  pt: "Portugal",
  sp: "Spain",
  cz: "Czechia",
  rm: "Romania",
};

type Props = {
  countries: CountryConfig[];
};

export function CountryEntryGate({ countries }: Props) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode | null>(null);

  const selected = countries.find((c) => c.code === selectedCode) ?? null;

  function chooseCountry(country: CountryConfig) {
    setSelectedCode(country.code);
    setSelectedLocale(country.defaultLocale);
  }

  const continueHref = selected
    ? `/${countrySlug(selected.code)}?lang=${selectedLocale ?? selected.defaultLocale}`
    : null;

  return (
    <section className="relative isolate overflow-hidden bg-[var(--color-background-soft)]">
      {/* soft editorial backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1100px 600px at 85% -10%, rgba(176, 241, 34, 0.18), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(27, 77, 62, 0.10), transparent 60%)",
        }}
      />

      <div
        className="mx-auto grid w-full max-w-[1240px] gap-16 px-6 py-20 md:py-28 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:px-10"
      >
        {/* Left: editorial copy */}
        <div className="flex flex-col justify-center">
          <span className="gh-heading-eyebrow inline-flex items-center gap-2">
            <span className="h-px w-8 bg-[var(--color-brand-primary)]" />
            Medicine without borders
          </span>

          <h1
            className="mt-6 font-[var(--font-cormorant)] text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.02] tracking-[-0.02em] text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Care that travels{" "}
            <em className="italic font-medium text-[var(--color-brand-primary)]">
              with you.
            </em>
          </h1>

          <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-[var(--color-text-muted)] md:text-[1.15rem]">
            Same trusted clinicians, five countries, one quiet experience. Choose
            where you are — we'll bring local doctors to your screen in your language.
          </p>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-[var(--color-border)] pt-8">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Clinicians
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
                120+
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Languages
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
                6
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Avg. wait
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
                14 min
              </dd>
            </div>
          </dl>
        </div>

        {/* Right: picker card */}
        <div className="relative">
          <div className="rounded-[28px] border border-[var(--color-border)] bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,46,37,0.25)] md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[var(--color-brand-primary)]">
                <Globe2 className="h-5 w-5" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
                  Choose your clinic
                </span>
              </div>
              {selected ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCode(null);
                    setSelectedLocale(null);
                  }}
                  className="text-[12px] font-semibold text-[var(--color-text-muted)] underline-offset-4 hover:underline"
                >
                  Reset
                </button>
              ) : null}
            </div>

            <h2
              className="mt-4 text-[1.5rem] font-bold leading-tight tracking-tight text-[var(--color-text-primary)] md:text-[1.75rem]"
            >
              {selected
                ? `${COUNTRY_TAGLINES[selected.code] ?? selected.name}. Now your language.`
                : "Where are you today?"}
            </h2>

            {/* Country grid */}
            {!selected ? (
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {countries.map((country) => (
                  <li key={country.code}>
                    <button
                      type="button"
                      onClick={() => chooseCountry(country)}
                      className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3.5 text-left transition hover:-translate-y-[1px] hover:border-[var(--color-brand-primary)] hover:shadow-[0_8px_24px_-8px_rgba(27,77,62,0.25)]"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`${COUNTRY_FLAGS[country.code]} rounded-[4px] shadow-sm`}
                          style={{ width: 28, height: 20 }}
                          aria-hidden
                        />
                        <span className="flex flex-col">
                          <span className="text-[15px] font-semibold leading-tight text-[var(--color-text-primary)]">
                            {country.name}
                          </span>
                          <span className="text-[12px] text-[var(--color-text-muted)]">
                            {country.supportedLocales
                              .map((l) => LOCALE_LABELS[l])
                              .join(" · ")}
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-brand-primary)]" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 space-y-5">
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {selected.supportedLocales.map((locale) => {
                    const active = selectedLocale === locale;
                    return (
                      <li key={locale}>
                        <button
                          type="button"
                          onClick={() => setSelectedLocale(locale)}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
                            active
                              ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white shadow-[0_8px_20px_-10px_rgba(27,77,62,0.6)]"
                              : "border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)]"
                          }`}
                          aria-pressed={active}
                        >
                          <span className="flex flex-col">
                            <span className="text-[15px] font-semibold leading-tight">
                              {LOCALE_LABELS[locale]}
                            </span>
                            <span
                              className={`text-[12px] ${
                                active ? "text-white/70" : "text-[var(--color-text-muted)]"
                              }`}
                            >
                              {locale.toUpperCase()}
                            </span>
                          </span>
                          {active ? <Check className="h-4 w-4" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {continueHref ? (
                  <Link
                    href={continueHref}
                    className="gh-btn gh-btn-primary w-full justify-center"
                  >
                    Enter {selected.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            )}

            <p className="mt-6 border-t border-[var(--color-border)] pt-4 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              We'll remember your choice on this device. You can switch anytime
              from the header.
            </p>
          </div>

          {/* decorative chip */}
          <div className="pointer-events-none absolute -top-4 -right-4 hidden rounded-full bg-[var(--color-brand-accent)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)] shadow-md md:block">
            Live · 5 clinics
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="border-t border-[var(--color-border)] bg-white/60 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-5 text-[12px] font-medium text-[var(--color-text-muted)] lg:px-10">
          <span>GDPR-compliant · End-to-end encrypted consultations</span>
          <span className="flex items-center gap-4">
            <span>Licensed in IE · PT · ES · CZ · RO</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-border-strong)]" />
            <span>Insurance receipts available</span>
          </span>
        </div>
      </div>
    </section>
  );
}
