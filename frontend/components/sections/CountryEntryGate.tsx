"use client";

/**
 * Entry / country-selection screen — the first thing a visitor sees at "/".
 *
 * Reads like the front desk of an online medical clinic, not a settings page:
 *   • Brand + medical-clinic headline + supporting copy + trust signals (left)
 *   • "Select the country where you need medical care" + country cards (right)
 *
 * Language is detected automatically server-side (Accept-Language → gh_locale
 * cookie) and passed in as `detectedLocale` + translated `copy` — there is NO
 * manual language step. Picking a country navigates straight into that
 * country's site in the detected language (falling back to the country's
 * default locale when it doesn't support the detected one).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Lock, Globe2, FileCheck2 } from "lucide-react";
import type { CountryConfig } from "@/data/countries";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";
import { countrySlug, registerCountrySlugs } from "@/lib/routing/country-slug";
import { HeroReveal } from "@/components/motion/HeroReveal";
import styles from "./CountryEntryGate.module.css";

export type EntryGateCopy = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  selectTitle: string;
  selectHint: string;
  continueTo: string;
  doctor: string;
  doctors: string;
  trustLicensed: string;
  trustSecure: string;
  trustLocal: string;
  trustGdpr: string;
  euProvider: string;
  gdprNote: string;
};

type Props = {
  countries: CountryConfig[];
  /** Per-country live doctor counts keyed by country code (e.g. "ie"). */
  countryMeta?: Record<string, { doctors?: number }>;
  /** Browser-detected locale, resolved server-side. */
  detectedLocale: LocaleCode;
  /** Entry-gate copy already translated to `detectedLocale`. */
  copy: EntryGateCopy;
};

// Seeded-country codes use internal short codes that don't all match ISO
// 3166-1 alpha-2 (`sp` for Spain, `rm` for Romania). Alias only the mismatches.
const FLAG_CODE_ALIAS: Record<string, string> = { sp: "es", rm: "ro" };

function flagClassForCode(code: string): string {
  const normalized = code.toLowerCase();
  const iso = FLAG_CODE_ALIAS[normalized] ?? normalized;
  return `fi fi-${iso}`;
}

/** First supported locale among the browser's preference list, or null. */
function matchNavigatorLocale(): LocaleCode | null {
  if (typeof navigator === "undefined") return null;
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of prefs) {
    const base = raw?.split("-")[0]?.toLowerCase();
    if (base && (supportedLocaleCodes as readonly string[]).includes(base)) {
      return base as LocaleCode;
    }
  }
  return null;
}

export function CountryEntryGate({ countries, countryMeta, detectedLocale, copy }: Props) {
  const router = useRouter();

  // Replay the slug registry so client slug helpers resolve admin-added codes.
  registerCountrySlugs(countries);

  // Persist the detected language so country pages + return visits stay
  // consistent (no flicker). Client fallback to navigator.languages when the
  // cookie hasn't been set yet — server detection (Accept-Language) is primary.
  useEffect(() => {
    try {
      const hasCookie = /(?:^|;\s*)gh_locale=/.test(document.cookie);
      if (!hasCookie) {
        const loc = matchNavigatorLocale() ?? detectedLocale;
        document.cookie = `gh_locale=${loc}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      /* cookie unavailable — server-detected locale still applies */
    }
  }, [detectedLocale]);

  function enter(country: CountryConfig) {
    const slug = country.slug || countrySlug(country.code);
    // Use the detected language when the country offers it, else its default.
    const lang = (
      country.supportedLocales?.includes(detectedLocale)
        ? detectedLocale
        : country.defaultLocale ?? "en"
    ) as LocaleCode;
    // Navigate directly to /{slug}/{lang} — ?lang= can mis-resolve with [lang].
    router.push(`/${slug}/${lang}`);
  }

  const trust = [
    { icon: ShieldCheck, label: copy.trustLicensed },
    { icon: Lock, label: copy.trustSecure },
    { icon: Globe2, label: copy.trustLocal },
    { icon: FileCheck2, label: copy.trustGdpr },
  ];

  return (
    <div className={`${styles.root} relative flex min-h-[100dvh] flex-col overflow-x-hidden text-white`}>
      <div aria-hidden className={styles.backgroundLayer}>
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/images/hero/country-entry-clinic-hero-mobile-1080.avif"
            type="image/avif"
          />
          <source
            media="(max-width: 767px)"
            srcSet="/images/hero/country-entry-clinic-hero-mobile-1080.webp"
            type="image/webp"
          />
          <source srcSet="/images/hero/country-entry-clinic-hero-2560.avif" type="image/avif" />
          <source srcSet="/images/hero/country-entry-clinic-hero-2560.webp" type="image/webp" />
          <img
            src="/images/hero/country-entry-clinic-hero-2560.webp"
            alt=""
            width={2560}
            height={1440}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className={styles.backgroundImage}
          />
        </picture>
      </div>
      <div aria-hidden className={`${styles.tint} pointer-events-none fixed inset-0`} />
      <div aria-hidden className={`${styles.pattern} pointer-events-none fixed inset-0`} />
      <div aria-hidden className={`${styles.blooms} pointer-events-none fixed inset-0`} />

      {/* Header — brand + tagline */}
      <header className={`${styles.header} relative flex items-center justify-between`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/global-health-light.png" alt="Global Health" className={styles.logo} />
        <p className={`${styles.tagline} hidden uppercase sm:block`}>{copy.eyebrow}</p>
      </header>

      {/* Body — two-column clinic hero */}
      <section className={`${styles.body} relative flex flex-1 items-center`}>
        <div className={`${styles.content} w-full`}>
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            {/* Left — clinic intro + trust */}
            <div className="min-w-0">
              <HeroReveal delay={0}>
                <span className={styles.eyebrow}>{copy.eyebrow}</span>
              </HeroReveal>
              <HeroReveal delay={90}>
                <h1 className={`${styles.heroTitle} text-white`}>
                  {copy.headline}{" "}
                  <span className={styles.heroHighlight}>{copy.headlineAccent}</span>
                </h1>
              </HeroReveal>
              <HeroReveal delay={200}>
                <p className={styles.heroLead}>{copy.subheadline}</p>
              </HeroReveal>
              <HeroReveal delay={300}>
                <ul className={styles.trustList}>
                  {trust.map((t) => (
                    <li key={t.label} className={styles.trustItem}>
                      <span className={styles.trustIcon}>
                        <t.icon className="size-[15px]" strokeWidth={1.8} aria-hidden />
                      </span>
                      {t.label}
                    </li>
                  ))}
                </ul>
              </HeroReveal>
            </div>

            {/* Right — country selection panel */}
            <HeroReveal delay={260} className="min-w-0">
              <div className={styles.selectPanel}>
                <span aria-hidden className={styles.panelGlobe}>
                  <Globe2 strokeWidth={0.6} />
                </span>
                <div className="relative">
                  <h2 className={styles.selectTitle}>{copy.selectTitle}</h2>
                  <p className={styles.selectHint}>{copy.selectHint}</p>

                  <div className={`${styles.countryGrid} mt-7 grid gap-3`}>
                    {countries.map((c, i) => {
                      const meta = countryMeta?.[c.code];
                      const flagCls = flagClassForCode(c.code);
                      const count = meta?.doctors;
                      return (
                        <HeroReveal key={c.code} delay={i * 55 + 340}>
                          <button
                            type="button"
                            onClick={() => enter(c)}
                            className={`${styles.countryCard} flex flex-col gap-4 text-left text-white`}
                            style={{ width: "100%" }}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`${styles.flagWrap} inline-flex items-center justify-center`}>
                                <span aria-hidden className={`${flagCls} ${styles.flagIcon} inline-block`} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`${styles.countryName} text-white`}>{c.name}</p>
                                {typeof count === "number" ? (
                                  <p className={styles.cardMeta}>
                                    <strong className={styles.cardMetaStrong}>{count}</strong>{" "}
                                    {count === 1 ? copy.doctor : copy.doctors}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className={`${styles.cardFooter} flex items-center justify-between`}>
                              <span className={styles.cardEnter}>
                                {copy.continueTo.replace("{country}", c.name)}
                              </span>
                              <ArrowRight className={`${styles.cardArrow} size-4`} aria-hidden />
                            </div>
                          </button>
                        </HeroReveal>
                      );
                    })}
                  </div>
                </div>
              </div>
            </HeroReveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${styles.footer} relative flex flex-wrap justify-between gap-4`}>
        <span suppressHydrationWarning>
          © {new Date().getFullYear()} Global Health · {copy.euProvider}
        </span>
        <span>{copy.gdprNote}</span>
      </footer>
    </div>
  );
}
