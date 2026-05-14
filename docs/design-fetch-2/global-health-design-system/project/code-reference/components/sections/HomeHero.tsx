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
      {/* Green overlay layer */}
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(10,52,42,0.82)_0%,rgba(14,76,60,0.74)_45%,rgba(18,96,76,0.66)_100%)]" />
      {/* Medical pattern overlay */}
      <div className="gh-medical-pattern gh-medical-pattern-dark absolute inset-0" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[var(--container-width)] gap-14 px-5 pb-12 pt-6 sm:px-8 sm:pb-14 sm:pt-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-12 lg:pb-16 lg:pt-10">
        {/* LEFT: Text content */}
        <div className="text-white">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[rgba(15,46,37,0.72)] px-4 py-2 backdrop-blur-md">
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
          <div className="mt-8 inline-flex flex-wrap items-center gap-4">
            {[
              { value: "50+", label: "Expert Doctors", icon: "👨‍⚕️" },
              { value: "5", label: "Countries", icon: "🌍" },
              { value: "24/7", label: "Available", icon: "⚡" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-full border border-white/20 bg-[rgba(15,46,37,0.72)] px-5 py-2.5 backdrop-blur-md"
              >
                <span className="text-lg">{stat.icon}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-white">{stat.value}</span>
                  <span className="text-xs font-medium text-white/60">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Language + Country selector */}
        <div className="w-full max-w-[520px] justify-self-end">
          {/* Glassmorphic dark-green card container */}
          <div className="rounded-[var(--radius-card)] border border-white/20 bg-[rgba(15,46,37,0.72)] p-6 text-white shadow-[0_24px_60px_rgba(4,22,17,0.34)] backdrop-blur-lg sm:p-8">
            <p className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Globe className="size-5 text-[var(--color-brand-accent)]" />
              Select Your Language
            </p>

            <div className="relative mb-6">
              <button
                type="button"
                onClick={() => setLangOpen((prev) => !prev)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 text-white transition-colors hover:border-white/35 hover:bg-white/15"
              >
                <FlagBadge
                  alpha2={localeToFlagCode[selectedLang] ?? "gb"}
                  title={localeNames[selectedLang] ?? "English"}
                />
                <span className="text-base font-semibold">{localeNames[selectedLang] ?? "English"}</span>
                <span className="text-sm uppercase tracking-wider text-white/70">({selectedLang})</span>
                <ChevronDown className={`ml-auto size-4 text-white/70 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
              </button>

              {langOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-white/20 bg-[rgba(15,46,37,0.92)] shadow-[var(--shadow-elevated)] backdrop-blur-md">
                  {localeCodes.map((locale) => (
                    <button
                      key={locale}
                      type="button"
                      onClick={() => {
                        setSelectedLang(locale);
                        setLocaleCookie(locale);
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-white transition-colors hover:bg-white/10 ${selectedLang === locale ? "bg-white/10" : ""}`}
                    >
                      <FlagBadge alpha2={localeToFlagCode[locale] ?? "gb"} title={localeNames[locale] ?? locale} />
                      <span className="text-sm font-medium">{localeNames[locale] ?? locale}</span>
                      <span className="text-sm uppercase text-white/70">({locale})</span>
                      {selectedLang === locale && (
                        <span className="ml-auto text-xs font-bold text-[var(--color-brand-accent)]">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-white/80">Choose Your Clinic</p>
              {countriesSorted.map((country, index) => (
                <Link
                  key={country.code}
                  href={country.legacyHomePath}
                  onClick={() => setLocaleCookie(selectedLang)}
                  className="group flex min-h-14 items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-5 text-white transition-all duration-200 hover:border-white/30 hover:bg-white/20"
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
                      className="size-9 rounded-full border border-white/20 object-cover transition-transform group-hover:scale-110"
                    />
                    <ChevronDown className="size-4 -rotate-90 text-[var(--color-brand-accent)] opacity-0 transition-all group-hover:opacity-100" />
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
