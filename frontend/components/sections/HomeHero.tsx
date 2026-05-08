"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Globe } from "lucide-react";
import type { CountryCode, CountryConfig } from "@/data/countries";

const localeNames: Record<string, string> = {
  en: "English",
  cs: "Cestina",
  es: "Espanol",
  pt: "Portugues",
  ro: "Romana",
};

const localeCodes: string[] = ["en", "cs", "es", "pt", "ro"];

const localeToFlagCode: Record<string, string> = {
  en: "gb",
  cs: "cz",
  es: "es",
  pt: "pt",
  ro: "ro",
};

const countryToFlagCode: Record<CountryCode, string> = {
  ie: "ie",
  cz: "cz",
  pt: "pt",
  sp: "es",
  rm: "ro",
};

const countryIconByCode: Record<CountryCode, string> = {
  ie: "/icons/countries/ie-menu.png",
  cz: "/icons/countries/cz-menu.png",
  pt: "/icons/countries/pt-menu.png",
  sp: "/icons/countries/sp-menu.png",
  rm: "/icons/countries/rm-menu.png",
};

function setLocaleCookie(locale: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `gh_locale=${encodeURIComponent(locale)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function FlagBadge({ alpha2, title }: { alpha2: string; title: string }) {
  return (
    <span
      className="relative inline-flex h-5 min-w-[28px] max-w-[28px] shrink-0 overflow-hidden rounded-sm shadow-sm ring-1 ring-black/10"
      title={title}
      aria-hidden
    >
      <span
        className={`fi fi-${alpha2} pointer-events-none absolute inset-0 block !m-0 !h-full !w-full !min-h-0 !min-w-0 bg-cover bg-center bg-no-repeat leading-none`}
      />
    </span>
  );
}

type HomeHeroProps = {
  countries: CountryConfig[];
};

export function HomeHero({ countries }: HomeHeroProps) {
  const [langOpen, setLangOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const countriesSorted = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries],
  );

  return (
    <section className="relative isolate min-h-screen overflow-hidden">
      {/* Background */}
      <Image
        src="/images/hero/homehero.png"
        alt=""
        fill
        priority
        className="object-cover scale-105"
      />
      <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0">
        <div className="absolute inset-0 bg-[rgba(15,46,37,0.78)]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[var(--container-width)] gap-14 px-5 py-12 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-12">
        {/* LEFT: Text content */}
        <div className="text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 mb-8 ring-1 ring-white/15">
            <Globe className="size-4 text-[var(--color-brand-accent)]" />
            <span className="text-sm font-medium text-white/90">5 Countries • Online Care</span>
          </div>

          <Image
            src="/logos/global-health-official.png"
            alt="Global Health"
            width={280}
            height={120}
            className="mb-8 h-14 w-auto brightness-0 invert sm:h-16"
          />

          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[3.5rem]">
            Medical Consultations
            <br />
            <span className="text-[var(--color-brand-accent)]">Wherever You Are</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
            Choose your country and language to enter your local clinic. 
            Expert doctors, online prescriptions, and health tests — all from home.
          </p>

          {/* Quick stats */}
          <div className="mt-8 flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <span className="text-base font-bold text-[var(--color-brand-accent)]">50+</span>
              </div>
              <span className="text-sm text-white/70">Expert Doctors</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <span className="text-base font-bold text-[var(--color-brand-accent)]">5</span>
              </div>
              <span className="text-sm text-white/70">Countries</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <span className="text-base font-bold text-[var(--color-brand-accent)]">24/7</span>
              </div>
              <span className="text-sm text-white/70">Available</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Language + Country selector */}
        <div className="w-full max-w-[520px] justify-self-end">
          {/* White card container */}
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-elevated)] sm:p-8">
            <p className="mb-4 text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Globe className="size-5 text-[var(--color-brand-primary)]" />
              Select Your Language
            </p>

            <div className="relative mb-6">
              <button
                type="button"
                onClick={() => setLangOpen((prev) => !prev)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
              >
                <FlagBadge
                  alpha2={localeToFlagCode[selectedLang] ?? "gb"}
                  title={localeNames[selectedLang] ?? "English"}
                />
                <span className="text-base font-semibold">{localeNames[selectedLang] ?? "English"}</span>
                <span className="text-sm text-[var(--color-text-muted)] uppercase tracking-wider">({selectedLang})</span>
                <ChevronDown className={`ml-auto size-4 text-[var(--color-text-muted)] transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
              </button>

              {langOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-elevated)]">
                  {localeCodes.map((locale) => (
                    <button
                      key={locale}
                      type="button"
                      onClick={() => {
                        setSelectedLang(locale);
                        setLocaleCookie(locale);
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-background-soft)] ${selectedLang === locale ? "bg-[var(--color-background-soft)]" : ""}`}
                    >
                      <FlagBadge alpha2={localeToFlagCode[locale] ?? "gb"} title={localeNames[locale] ?? locale} />
                      <span className="text-sm font-medium">{localeNames[locale] ?? locale}</span>
                      <span className="text-sm text-[var(--color-text-muted)] uppercase">({locale})</span>
                      {selectedLang === locale && (
                        <span className="ml-auto text-[var(--color-brand-primary)] text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Choose Your Clinic</p>
              {countriesSorted.map((country, index) => (
                <Link
                  key={country.code}
                  href={country.legacyHomePath}
                  onClick={() => setLocaleCookie(selectedLang)}
                  className="group flex min-h-14 items-center justify-between gap-3 rounded-xl bg-[var(--color-background-soft)] px-5 text-[var(--color-text-primary)] transition-all duration-200 hover:bg-[var(--color-background-panel)] hover:shadow-[var(--shadow-card)]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="flex items-center gap-3">
                    <FlagBadge alpha2={countryToFlagCode[country.code]} title={country.name} />
                    <span className="text-base font-semibold leading-tight">Medical Clinic {country.name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Image
                      src={countryIconByCode[country.code]}
                      alt={`${country.name} icon`}
                      width={36}
                      height={36}
                      className="size-9 rounded-full border border-[var(--color-border)] object-cover transition-transform group-hover:scale-110"
                    />
                    <ChevronDown className="size-4 text-[var(--color-brand-primary)] -rotate-90 opacity-0 transition-all group-hover:opacity-100" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
