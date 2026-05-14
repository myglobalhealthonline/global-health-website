"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
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
    <section className="relative min-h-screen bg-[var(--color-background-page)]">
      <div className="gh-container grid min-h-screen items-center gap-16 py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-24 lg:py-0">
        {/* Left rail — editorial copy. */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3 text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--color-brand-accent)]" />
            Global Health · Est. 2024
          </div>

          <h1
            className="gh-display mt-10 text-[clamp(3rem,7vw,6.25rem)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Medicine
            <br />
            without <span className="gh-display-em">borders.</span>
          </h1>

          <p className="mt-8 max-w-[460px] text-[1.05rem] leading-[1.7] text-[var(--color-text-body)] md:text-[1.15rem]">
            Five countries. One quiet patient experience. Same-day video
            consultations with licensed clinicians — in your language.
          </p>

          <dl className="mt-16 grid max-w-[500px] grid-cols-3 gap-x-10">
            <Stat value="120+" label="Clinicians" />
            <Stat value="6" label="Languages" />
            <Stat value="14 min" label="Avg. wait" />
          </dl>

          <div className="mt-12 hidden text-[12.5px] text-[var(--color-text-muted)] lg:block">
            <p>
              GDPR-compliant &middot; Licensed in Ireland, Portugal, Spain,
              Czechia &amp; Romania
            </p>
          </div>
        </div>

        {/* Right rail — picker panel. */}
        <div className="relative">
          <div className="rounded-[20px] bg-[var(--color-brand-primary)] p-8 text-white shadow-[var(--shadow-elevated)] md:p-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                {selected ? "Step 2 of 2" : "Step 1 of 2"}
              </span>
              {selected ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCode(null);
                    setSelectedLocale(null);
                  }}
                  className="text-[12px] font-medium text-white/60 underline-offset-4 hover:text-white hover:underline"
                >
                  Start over
                </button>
              ) : null}
            </div>

            <h2
              className="mt-6 text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.05] tracking-[-0.015em]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {selected
                ? `${selected.name}. Now pick your language.`
                : "Where are you today?"}
            </h2>

            {!selected ? (
              <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
                {countries.map((country) => (
                  <li key={country.code}>
                    <button
                      type="button"
                      onClick={() => chooseCountry(country)}
                      className="group flex w-full items-center justify-between gap-4 py-4 text-left transition"
                    >
                      <span className="flex items-center gap-4">
                        <span
                          className={`${COUNTRY_FLAGS[country.code]} rounded-[3px]`}
                          style={{ width: 26, height: 19 }}
                          aria-hidden
                        />
                        <span className="flex flex-col">
                          <span className="text-[16px] font-medium leading-tight text-white">
                            {country.name}
                          </span>
                          <span className="text-[12.5px] text-white/55">
                            {country.supportedLocales
                              .map((l) => LOCALE_LABELS[l])
                              .join(" · ")}
                          </span>
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-brand-accent)]" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-8 space-y-6">
                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {selected.supportedLocales.map((locale) => {
                    const active = selectedLocale === locale;
                    return (
                      <li key={locale}>
                        <button
                          type="button"
                          onClick={() => setSelectedLocale(locale)}
                          aria-pressed={active}
                          className={`flex w-full items-center justify-between gap-3 rounded-[12px] px-4 py-4 text-left transition ${
                            active
                              ? "bg-[var(--color-brand-accent)] text-[var(--color-text-primary)]"
                              : "bg-white/5 text-white hover:bg-white/10"
                          }`}
                        >
                          <span className="flex flex-col">
                            <span className="text-[15px] font-medium leading-tight">
                              {LOCALE_LABELS[locale]}
                            </span>
                            <span
                              className={`text-[11.5px] uppercase tracking-[0.16em] ${
                                active ? "text-[var(--color-brand-primary)]/70" : "text-white/45"
                              }`}
                            >
                              {locale}
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
                    className="group inline-flex w-full items-center justify-between rounded-full bg-[var(--color-brand-accent)] px-7 py-4 text-[15px] font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-brand-accent-soft)]"
                  >
                    Enter {selected.name}
                    <ArrowUpRight className="h-5 w-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-[12px] text-[var(--color-text-muted)] lg:hidden">
            GDPR-compliant · Licensed in 5 countries
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd
        className="mt-3 text-[2.25rem] leading-none tracking-[-0.02em] text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-cormorant)" }}
      >
        {value}
      </dd>
    </div>
  );
}
