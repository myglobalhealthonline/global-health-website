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

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, ShieldCheck, Lock, Globe2, FileCheck2, Search } from "lucide-react";
import type { CountryConfig } from "@/data/countries";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";
import { setClientLocaleCookie } from "@/lib/i18n/get-client-locale";
import { countrySlug, registerCountrySlugs } from "@/lib/routing/country-slug";
import type { GlobeArc, GlobeMarker } from "@/components/ui/cobe-globe";
import styles from "./CountryEntryGate.module.css";

// WebGL/canvas — browser-only, no server-rendered fallback worth paying for.
// Static circle placeholder holds the globe's aspect-square footprint so the
// panel layout doesn't shift when the real canvas mounts.
const Globe = dynamic(() => import("@/components/ui/cobe-globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="aspect-square w-full rounded-full"
      style={{ background: "radial-gradient(circle at 35% 32%, #143a2c, #08211b 72%)" }}
    />
  ),
});

export type EntryGateCopy = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  selectTitle: string;
  selectHint: string;
  motto: string;
  searchPlaceholder: string;
  noCountryResults: string;
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
  /** Browser-detected locale, resolved server-side. */
  detectedLocale: LocaleCode;
  /** Entry-gate copy already translated to `detectedLocale`. */
  copy: EntryGateCopy;
};

type EntryRevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

function HeroReveal({ children, className = "" }: EntryRevealProps) {
  return <div className={className}>{children}</div>;
}

// Legacy country codes do not all match ISO 3166-1 alpha-2 (`sp` for Spain,
// `rm` for Romania). Alias only the mismatches.
const FLAG_CODE_ALIAS: Record<string, string> = { sp: "es", rm: "ro" };
const COUNTRY_LOCATIONS: Record<string, [number, number]> = {
  br: [-14.235, -51.9253],
  cz: [49.8175, 15.473],
  de: [51.1657, 10.4515],
  es: [40.4637, -3.7492],
  ie: [53.1424, -7.6921],
  pt: [39.3999, -8.2245],
  rm: [45.9432, 24.9668],
  ro: [45.9432, 24.9668],
  sp: [40.4637, -3.7492],
};
const FALLBACK_COUNTRY_LOCATION: [number, number] = [50.2, 9.1];

function flagClassForCode(code: string): string {
  const normalized = code.toLowerCase();
  const iso = FLAG_CODE_ALIAS[normalized] ?? normalized;
  return `fi fi-${iso}`;
}

function locationForCountry(country: CountryConfig): [number, number] {
  const normalized = country.code.toLowerCase();
  const iso = FLAG_CODE_ALIAS[normalized] ?? normalized;
  return COUNTRY_LOCATIONS[normalized] ?? COUNTRY_LOCATIONS[iso] ?? FALLBACK_COUNTRY_LOCATION;
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

export function CountryEntryGate({ countries, detectedLocale, copy }: Props) {
  const [countryQuery, setCountryQuery] = useState("");
  const panelSlotRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

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

  // Scale the country panel down as one piece (like object-fit: contain) so it
  // fits the viewport with no inner scrollbar and nothing clipped. Two-column
  // only (>=1024px): below that the layout is single-column and the page scrolls
  // naturally, so scaling is left off. Only ever scales DOWN; floors at 0.72 to
  // keep text legible (below that the page scrolls the small remainder).
  useLayoutEffect(() => {
    const slot = panelSlotRef.current;
    const panel = panelRef.current;
    const grid = slot?.parentElement;
    if (!slot || !panel || !grid) return;

    let raf = 0;
    const measureAndApply = () => {
      if (window.innerWidth < 1024) {
        // Single-column: let CSS flow govern (no scaling).
        panel.style.removeProperty("--gate-fit");
        slot.style.removeProperty("height");
        return;
      }
      // offsetHeight is the UNSCALED layout height (ignores the transform),
      // so measuring never feeds back into the scale it produces.
      const natural = panel.offsetHeight;
      if (!natural) return;
      // Anchor on the grid top, not the panel's own (centered) top — the grid
      // top is fixed by the header above it, so shrinking the panel can't move
      // the reference and oscillate the result.
      const top = grid.getBoundingClientRect().top;
      // Subtract the footer's real height — it sits below the flex-1 body,
      // so budget that ignores it over-scales the panel and reintroduces
      // the page scrollbar this mechanism exists to prevent.
      const footerH = footerRef.current?.offsetHeight ?? 0;
      const avail = window.innerHeight - top - footerH - 24;
      const fit = Math.max(0.72, Math.min(1, avail / natural));
      panel.style.setProperty("--gate-fit", fit.toFixed(4));
      // Reserve the scaled height so the footer/page flow beneath it.
      slot.style.height = `${Math.round(natural * fit)}px`;
    };
    // Apply the first measurement synchronously (before paint) so the panel
    // never flashes at scale(1) and then snaps down.
    measureAndApply();

    const applyAsync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measureAndApply);
    };
    const ro = new ResizeObserver(applyAsync);
    ro.observe(panel);
    window.addEventListener("resize", applyAsync);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", applyAsync);
    };
    // ResizeObserver on the panel catches list-length/content changes itself.
  }, []);

  // Real crawlable href per country (real anchor, not JS-only) so search
  // engines can discover /{slug}/{lang} without executing the click handler —
  // fixes zero-outbound-internal-link crawl-depth risk on "/".
  function hrefFor(country: CountryConfig): string {
    const slug = country.slug || countrySlug(country.code);
    const lang = (
      country.supportedLocales?.includes(detectedLocale)
        ? detectedLocale
        : country.defaultLocale ?? "en"
    ) as LocaleCode;
    return `/${slug}/${lang}`;
  }

  function enter(country: CountryConfig, event: React.MouseEvent) {
    // Plain left-click: still do a hard navigation (edge proxy re-runs, unlike
    // router.push) after persisting the locale cookie. Modified clicks
    // (ctrl/cmd/middle/shift) fall through to native <a> behavior (new tab).
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    const lang = (
      country.supportedLocales?.includes(detectedLocale)
        ? detectedLocale
        : country.defaultLocale ?? "en"
    ) as LocaleCode;
    setClientLocaleCookie(lang);
    globalThis.location.assign(hrefFor(country));
  }

  const trust = [
    { icon: ShieldCheck, label: copy.trustLicensed },
    { icon: Lock, label: copy.trustSecure },
    { icon: Globe2, label: copy.trustLocal },
    { icon: FileCheck2, label: copy.trustGdpr },
  ];

  const globeMarkers = useMemo<GlobeMarker[]>(
    () =>
      countries.map((country) => {
        const normalized = country.code.toLowerCase();
        const iso = FLAG_CODE_ALIAS[normalized] ?? normalized;
        return {
          id: country.code.replace(/[^a-z0-9_-]/gi, "-"),
          label: country.label || country.name,
          flagCode: iso,
          location: locationForCountry(country),
        };
      }),
    [countries],
  );

  const globeArcs = useMemo<GlobeArc[]>(() => {
    const [origin, ...destinations] = globeMarkers;
    if (!origin) return [];
    return destinations.map((marker) => ({
      id: `${origin.id}-${marker.id}`,
      from: origin.location,
      to: marker.location,
    }));
  }, [globeMarkers]);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = countryQuery.trim().toLowerCase();
    if (!normalizedQuery) return countries;
    return countries.filter((country) => {
      const haystack = `${country.name} ${country.label} ${country.code} ${country.slug}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [countries, countryQuery]);

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
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
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
            <div ref={panelSlotRef} className="min-w-0">
              <div ref={panelRef} className={styles.selectPanel}>
                <div aria-hidden className={styles.globeStage}>
                  <Globe
                    markers={globeMarkers}
                    arcs={globeArcs}
                    className={styles.countryGlobe}
                    initialPhi={-2.34}
                    theta={0.24}
                    speed={0.0026}
                    markerSize={0.05}
                    arcHeight={0.22}
                    scale={1.06}
                  />
                </div>
                <div className={styles.panelBody}>
                  <p className={styles.motto}>{copy.motto}</p>
                  <h2 className={styles.selectTitle}>{copy.selectTitle}</h2>
                  <p className={styles.selectHint}>{copy.selectHint}</p>

                  <label className={styles.searchBox}>
                    <Search className="size-4" aria-hidden />
                    <span className="sr-only">{copy.searchPlaceholder}</span>
                    <input
                      type="search"
                      value={countryQuery}
                      onChange={(event) => setCountryQuery(event.target.value)}
                      placeholder={copy.searchPlaceholder}
                    />
                  </label>

                  <div className={styles.countryScroller}>
                    {filteredCountries.map((c, i) => {
                      const flagCls = flagClassForCode(c.code);
                      return (
                        <HeroReveal key={c.code} delay={i * 55 + 340}>
                          <a
                            href={hrefFor(c)}
                            onClick={(event) => enter(c, event)}
                            className={`${styles.countryCard} ${styles.countryRow} flex w-full items-center text-left text-white`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              <span className={`${styles.flagWrap} inline-flex items-center justify-center`}>
                                <span aria-hidden className={`${flagCls} ${styles.flagIcon} inline-block`} />
                              </span>
                              <p className={`${styles.countryName} min-w-0 flex-1 truncate text-white`} title={c.name}>{c.name}</p>
                            </div>
                            <div className={`${styles.cardFooter} flex items-center gap-1.5`}>
                              <span className={styles.cardEnter}>
                                {copy.continueTo.replace("{country}", c.name)}
                              </span>
                              <ArrowRight className={`${styles.cardArrow} size-4`} aria-hidden />
                            </div>
                          </a>
                        </HeroReveal>
                      );
                    })}
                    {filteredCountries.length === 0 ? (
                      <p className={styles.noResults}>{copy.noCountryResults}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer ref={footerRef} className={`${styles.footer} relative flex flex-wrap justify-between gap-4`}>
        <span suppressHydrationWarning>
          © {new Date().getFullYear()} Global Health · {copy.euProvider}
        </span>
        <span>{copy.gdprNote}</span>
      </footer>
    </div>
  );
}
