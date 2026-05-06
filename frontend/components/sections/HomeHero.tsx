"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
      <Image
        src="/images/hero/homehero.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[rgba(27,77,62,0.76)]" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[var(--container-width)] gap-14 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8">
        <div className="text-white">
          <Image
            src="/logos/global-health-official.png"
            alt="Global Health"
            width={280}
            height={120}
            className="mb-10 h-16 w-auto"
          />

          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-5xl lg:text-[4rem]">
            Medical Consultations
            <br />
            Wherever You Are
          </h1>

          <p className="mt-6 max-w-xl text-xl leading-relaxed text-white/92">
            Choose your country and language to enter your local clinic.
          </p>
        </div>

        <div className="w-full max-w-[520px] justify-self-end">
          <p className="mb-3 text-2xl font-semibold text-white">Select Your Language</p>

          <div className="relative mb-8">
            <button
              type="button"
              onClick={() => setLangOpen((prev) => !prev)}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/35 bg-[rgba(13,66,52,0.84)] px-4 text-white backdrop-blur-sm"
            >
              <FlagBadge
                alpha2={localeToFlagCode[selectedLang] ?? "gb"}
                title={localeNames[selectedLang] ?? "English"}
              />
              <span className="text-base font-semibold uppercase tracking-[0.05em]">{selectedLang}</span>
              <ChevronDown className={`ml-auto size-4 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>

            {langOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-white/30 bg-[rgba(13,66,52,0.95)] shadow-2xl backdrop-blur">
                {localeCodes.map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => {
                      setSelectedLang(locale);
                      setLocaleCookie(locale);
                      setLangOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-white transition-colors hover:bg-white/10"
                  >
                    <FlagBadge alpha2={localeToFlagCode[locale] ?? "gb"} title={localeNames[locale] ?? locale} />
                    <span className="text-sm font-medium uppercase tracking-[0.05em]">{locale}</span>
                    <span className="text-sm text-white/85">{localeNames[locale] ?? locale}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {countriesSorted.map((country) => (
              <Link
                key={country.code}
                href={country.legacyHomePath}
                onClick={() => setLocaleCookie(selectedLang)}
                className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-white px-5 text-[var(--color-brand-primary)] shadow-[var(--shadow-card)] transition-transform hover:scale-[1.01]"
              >
                <span className="flex items-center gap-3">
                  <FlagBadge alpha2={countryToFlagCode[country.code]} title={country.name} />
                  <span className="text-2xl font-semibold leading-tight">Medical Clinic {country.name}</span>
                </span>
                <Image
                  src={countryIconByCode[country.code]}
                  alt={`${country.name} icon`}
                  width={40}
                  height={40}
                  className="size-10 rounded-full border border-[var(--color-border)] object-cover"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
