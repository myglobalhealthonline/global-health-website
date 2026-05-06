"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { CountryConfig } from "@/data/countries";

const localeNames: Record<string, string> = {
  en: "English",
  cs: "Čeština",
  es: "Español",
  pt: "Português",
  ro: "Română",
};

const localeCodes: Record<string, string> = {
  en: "EN",
  cs: "CS",
  es: "ES",
  pt: "PT",
  ro: "RO",
};

const countryFlags: Record<string, { code: string; color: string }> = {
  ie: { code: "IE", color: "#009A49" },
  pt: { code: "PT", color: "#006600" },
  sp: { code: "ES", color: "#AA151B" },
  cz: { code: "CZ", color: "#11457E" },
  rm: { code: "RO", color: "#002B7F" },
};

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
            {/* Language Selector */}
            <div className="relative mb-6">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <span className="flex h-5 w-7 items-center justify-center rounded-sm bg-white/20 text-xs font-bold">
                  {localeCodes[selectedLang]}
                </span>
                <span>{localeNames[selectedLang]}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1B4D3E] shadow-2xl">
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
                      <span className="flex h-5 w-7 items-center justify-center rounded-sm bg-white/20 text-xs font-bold">
                        {localeCodes[lang]}
                      </span>
                      <span className="text-white">{localeNames[lang]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Country Buttons */}
            <div className="flex w-full max-w-sm flex-col gap-3">
              {countries.map((country) => {
                const flag = countryFlags[country.code];
                return (
                  <Link
                    key={country.code}
                    href={country.legacyHomePath}
                    className="group flex items-center justify-between rounded-xl bg-white px-5 py-4 text-[#1B4D3E] shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
                  >
                    <span className="font-semibold">
                      Medical Clinic {country.name}
                    </span>
                    <span 
                      className="flex h-7 w-10 items-center justify-center rounded text-xs font-bold text-white"
                      style={{ backgroundColor: flag?.color || "#1B4D3E" }}
                    >
                      {flag?.code}
                    </span>
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
