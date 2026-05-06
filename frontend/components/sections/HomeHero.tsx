"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { CountryCode, CountryConfig } from "@/data/countries";

const localeNames: Record<string, string> = {
  en: "English",
  cs: "Čeština",
  es: "Español",
  pt: "Português",
  ro: "Română",
};

/** ISO 3166-1 alpha-2 for `flag-icons` (`fi fi-xx`). Internal `sp`/`rm` map to Spain/Romania. */
const countryToFlagCode: Record<CountryCode, string> = {
  ie: "ie",
  pt: "pt",
  sp: "es",
  cz: "cz",
  rm: "ro",
};

/** Locale → flag (English shown as GB). */
const localeToFlagCode: Record<string, string> = {
  en: "gb",
  cs: "cz",
  es: "es",
  pt: "pt",
  ro: "ro",
};

function FlagBadge({ alpha2, title, size = "md" }: { alpha2: string; title: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-5 min-w-[28px] max-w-[28px]" : "h-7 min-w-10 max-w-10";
  return (
    <span
      className={`relative inline-flex shrink-0 ${box} overflow-hidden rounded-sm shadow-md ring-1 ring-black/15`}
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

  const availableLangs = ["en", "cs", "es", "pt", "ro"];

  return (
    <section className="relative min-h-[600px] overflow-hidden bg-[#1B4D3E]">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      
      {/* Soft gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1B4D3E] via-[#1B4D3E] to-[#143b30]" />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* LEFT: Text content */}
          <div className="text-white">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide">GLOBAL HEALTH</p>
                <p className="text-[10px] tracking-[0.2em] text-white/60">MEDICINE WITHOUT BORDERS</p>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.2rem]">
              Medical Consultations
              <br />
              Wherever You Are
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
              Choose the country and connect with specialized doctors.
            </p>
          </div>

          {/* RIGHT: Language + Country buttons */}
          <div className="flex flex-col items-start lg:items-end">
            {/* Language Selector — keep menu above country links (hover scale creates stacking contexts) */}
            <div className="relative z-50 mb-6 w-full max-w-sm lg:w-auto">
              <button
                type="button"
                onClick={() => setLangOpen(!langOpen)}
                className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20 lg:w-auto"
              >
                <FlagBadge alpha2={localeToFlagCode[selectedLang] ?? "gb"} title={localeNames[selectedLang]} size="sm" />
                <span>{localeNames[selectedLang]}</span>
                <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform lg:ml-0 ${langOpen ? "rotate-180" : ""}`} />
              </button>

              {langOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1B4D3E] shadow-2xl">
                  {availableLangs.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedLang(lang);
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/10 ${
                        selectedLang === lang ? "bg-white/10 font-semibold" : ""
                      }`}
                    >
                      <FlagBadge alpha2={localeToFlagCode[lang] ?? "gb"} title={localeNames[lang]} size="sm" />
                      <span className="text-white">{localeNames[lang]}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Country Buttons */}
            <div className="relative z-0 flex w-full max-w-sm flex-col gap-3">
              {countries.map((country) => {
                const alpha2 = countryToFlagCode[country.code];
                return (
                  <Link
                    key={country.code}
                    href={country.legacyHomePath}
                    className="group relative isolate flex items-center justify-between gap-4 rounded-xl bg-white px-5 py-4 text-[#1B4D3E] shadow-lg transition-[transform,box-shadow] hover:shadow-xl active:scale-[0.99]"
                  >
                    <span className="font-semibold">
                      Medical Clinic {country.name}
                    </span>
                    <FlagBadge alpha2={alpha2} title={country.name} size="md" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
