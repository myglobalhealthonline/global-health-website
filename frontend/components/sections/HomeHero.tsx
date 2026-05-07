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
      className="relative inline-flex h-5 min-w-[28px] max-w-[28px] shrink-0 overflow-hidden rounded-sm shadow-md ring-1 ring-black/15"
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
      {/* Background with parallax feel */}
      <Image
        src="/images/hero/homehero.png"
        alt=""
        fill
        priority
        className="object-cover scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(27,77,62,0.82)] via-[rgba(27,77,62,0.72)] to-[rgba(20,59,48,0.88)]" />

      {/* Animated floating orbs for visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#c8e6a0]/8 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[var(--container-width)] gap-14 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8">
        {/* LEFT: Text content */}
        <div className="text-white motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 mb-8">
            <Globe className="size-4 text-[#c8e6a0]" />
            <span className="text-sm font-medium text-white/90">5 Countries • Online Care</span>
          </div>

          <Image
            src="/logos/global-health-official.png"
            alt="Global Health"
            width={280}
            height={120}
            className="mb-8 h-16 w-auto brightness-0 invert"
          />

          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-5xl lg:text-[4rem]">
            Medical Consultations
            <br />
            <span className="text-[#c8e6a0]">Wherever You Are</span>
          </h1>

          <p className="mt-6 max-w-xl text-xl leading-relaxed text-white/80">
            Choose your country and language to enter your local clinic. 
            Expert doctors, online prescriptions, and health tests — all from home.
          </p>

          {/* Quick stats */}
          <div className="mt-8 flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <span className="text-lg font-bold text-[#c8e6a0]">50+</span>
              </div>
              <span className="text-sm text-white/70">Expert Doctors</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <span className="text-lg font-bold text-[#c8e6a0]">5</span>
              </div>
              <span className="text-sm text-white/70">Countries</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <span className="text-lg font-bold text-[#c8e6a0]">24/7</span>
              </div>
              <span className="text-sm text-white/70">Available</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Language + Country selector */}
        <div className="w-full max-w-[520px] justify-self-end motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-150">
          {/* Glass card container */}
          <div className="rounded-[var(--radius-card)] border border-white/20 bg-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            <p className="mb-4 text-xl font-semibold text-white flex items-center gap-2">
              <Globe className="size-5 text-[#c8e6a0]" />
              Select Your Language
            </p>

            <div className="relative mb-6">
              <button
                type="button"
                onClick={() => setLangOpen((prev) => !prev)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/30 bg-[rgba(13,66,52,0.6)] px-4 text-white backdrop-blur-sm transition-all hover:bg-[rgba(13,66,52,0.8)] hover:border-white/50"
              >
                <FlagBadge
                  alpha2={localeToFlagCode[selectedLang] ?? "gb"}
                  title={localeNames[selectedLang] ?? "English"}
                />
                <span className="text-base font-semibold">{localeNames[selectedLang] ?? "English"}</span>
                <span className="text-sm text-white/60 uppercase tracking-wider">({selectedLang})</span>
                <ChevronDown className={`ml-auto size-4 transition-transform duration-300 ${langOpen ? "rotate-180" : ""}`} />
              </button>

              {langOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-white/30 bg-[rgba(13,66,52,0.95)] shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-2 duration-200">
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
                      <span className="text-sm text-white/60 uppercase">({locale})</span>
                      {selectedLang === locale && (
                        <span className="ml-auto text-[#c8e6a0] text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-white/60 uppercase tracking-wider mb-2">Choose Your Clinic</p>
              {countriesSorted.map((country, index) => (
                <Link
                  key={country.code}
                  href={country.legacyHomePath}
                  onClick={() => setLocaleCookie(selectedLang)}
                  className="group flex min-h-14 items-center justify-between gap-3 rounded-xl bg-white px-5 text-[var(--color-brand-primary)] shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:bg-[#f6f9f6]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="flex items-center gap-3">
                    <FlagBadge alpha2={countryToFlagCode[country.code]} title={country.name} />
                    <span className="text-lg font-semibold leading-tight">Medical Clinic {country.name}</span>
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
