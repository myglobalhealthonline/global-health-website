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
import { countrySlug, registerCountrySlugs } from "@/lib/routing/country-slug";
import styles from "./CountryEntryGate.module.css";

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

// Seeded-country codes use internal short codes that don't all match
// ISO 3166-1 alpha-2 (`sp` for Spain, `rm` for Romania). Alias only
// the mismatches; everything else passes through, which means admin-
// added countries that use a real ISO2 code (`uk`, `de`, …) get the
// right flag without a code change.
const FLAG_CODE_ALIAS: Record<string, string> = {
  sp: "es",
  rm: "ro",
};

function flagClassForCode(code: string): string {
  const normalized = code.toLowerCase();
  const iso = FLAG_CODE_ALIAS[normalized] ?? normalized;
  return `fi fi-${iso}`;
}

export function CountryEntryGate({ countries, countryMeta }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  // Client-side: replay the registry so client-component slug helpers
  // resolve admin-added codes the same way server pages do.
  registerCountrySlugs(countries);

  const chosenCountry = countries.find((c) => c.code === countryCode) ?? null;

  function pickCountry(code: string) {
    setCountryCode(code);
    setStep(1);
  }

  function enter(lang: LocaleCode) {
    if (!chosenCountry) return;
    const slug = chosenCountry.slug || countrySlug(chosenCountry.code);
    // Navigate directly to /{slug}/{lang} — query ?lang= can mis-resolve with [lang] routes (→ /ireland/services/en 404).
    router.push(`/${slug}/${lang}`);
  }

  const steps = [
    { n: 1, label: "Country" },
    { n: 2, label: "Language" },
    { n: 3, label: "Enter" },
  ];

  return (
    <div className={`${styles.root} relative flex min-h-screen flex-col overflow-hidden text-white`}>
      {/* Medical-pattern texture */}
      <div aria-hidden className={`${styles.pattern} pointer-events-none absolute inset-0`} />
      <div aria-hidden className={`${styles.blooms} pointer-events-none absolute inset-0`} />

      {/* Top — wordmark + eyebrow */}
      <header className={`${styles.header} relative flex items-center justify-between`}>
        <div className="inline-flex items-center gap-2.5">
          <span className={`${styles.logoMark} inline-flex items-center justify-center`}>g</span>
          <span className={`${styles.wordmark} text-white`}>Global Health</span>
        </div>
        <p className={`${styles.tagline} uppercase`}>Medicine without borders</p>
      </header>

      {/* Step pager */}
      <div className={`${styles.pagerWrap} relative w-full`}>
        <ol className={`${styles.stepList} flex gap-8`}>
          {steps.map((s, i) => {
            const isCurrent = i === step;
            const isDone = i < step;
            const stepClass = isCurrent
              ? styles.stepItemCurrent
              : isDone
                ? styles.stepItemDone
                : styles.stepItemPending;
            return (
              <li key={s.n} className={`${styles.stepItem} inline-flex items-center gap-2.5 ${stepClass}`}>
                <span
                  className={`${styles.stepBadge} inline-flex items-center justify-center ${
                    isDone ? styles.stepBadgeDone : ""
                  }`}
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
      <main className={`${styles.body} relative flex flex-1 items-center`}>
        <div className={`${styles.content} w-full`}>
          {step === 0 ? (
            <>
              <h1 className={`${styles.heroTitle} ${styles.heroTitleCountry} text-white`}>
                Where are <span className={styles.heroHighlight}>you</span>?
              </h1>
              <p className={styles.heroLead}>
                We connect you with doctors registered in your country. Pick yours to continue.
              </p>

              <div className={`${styles.countryGrid} mt-14 grid gap-3`}>
                {countries.map((c) => {
                  const meta = countryMeta?.[c.code];
                  const flagCls = flagClassForCode(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => pickCountry(c.code)}
                      className={`${styles.countryCard} gh-landing-card flex flex-col gap-4 text-left text-white`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`${styles.flagWrap} inline-flex items-center justify-center`}>
                          <span
                            aria-hidden
                            className={`${flagCls} ${styles.flagIcon} inline-block`}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`${styles.countryName} text-white`}>{c.name}</p>
                        </div>
                      </div>
                      <div className={`${styles.cardFooter} flex items-center justify-between`}>
                        <span className={styles.cardMeta}>
                          <strong className={`${styles.cardMetaStrong} text-white`}>
                            {meta?.doctors ?? "—"}
                          </strong>{" "}
                          {meta?.doctors === 1 ? "doctor" : "doctors"}
                        </span>
                        <span className={`${styles.cardEnter} inline-flex items-center gap-1`}>
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
                className={`${styles.backButton} inline-flex items-center gap-2 text-white`}
              >
                <ArrowRight className={`${styles.backIcon} size-3.5`} aria-hidden />
                Change country · {chosenCountry.name}
              </button>

              <h1 className={`${styles.heroTitle} ${styles.heroTitleLanguage} text-white`}>
                Choose your <span className={styles.heroHighlight}>language</span>
              </h1>
              <p className={styles.heroLead}>
                Your consultation, your prescriptions, and the website — all in the language you
                pick.
              </p>

              <div className={`${styles.languageGrid} mt-12 grid gap-3`}>
                {chosenCountry.supportedLocales.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => enter(l)}
                    className={`${styles.languageCard} gh-landing-card flex items-center justify-between gap-4 text-left text-white`}
                  >
                    <div>
                      <p className={`${styles.langHello} text-white`}>{LANG_HELLO[l]}</p>
                      <p className={styles.langMeta}>
                        {LANG_NAMES[l]} · {l.toUpperCase()}
                      </p>
                    </div>
                    <ArrowRight className={`${styles.langArrow} size-[18px]`} aria-hidden />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className={`${styles.footer} relative flex flex-wrap justify-between gap-4`}>
        <span suppressHydrationWarning>
          © {new Date().getFullYear()} Global Health · EU-registered telemedicine provider
        </span>
        <span>
          GDPR compliant · Doctors registered locally in {countries.length}{" "}
          {countries.length === 1 ? "country" : "countries"}
        </span>
      </footer>
    </div>
  );
}
