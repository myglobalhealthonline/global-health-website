"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CalendarClock, Check, ChevronDown, Globe, Loader2, RotateCw } from "lucide-react";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { formatPriceRounded } from "@/lib/format-currency";

/**
 * Same-day GP quick-book — the hero panel on the country home page. Replaces
 * the old doctor→service→slot wizard / "Open calendars" card with a
 * timeslot-first flow:
 *
 *   1. Pick a consultation language.
 *   2. Pick an open time (aggregated across every GP who speaks it).
 *   3. Continue → /book?gp=1 collects details; the backend auto-assigns the GP
 *      (priority window + fair rotation). The patient never picks a doctor.
 *
 * Dark glass skin so it sits on the forest-green hero. Renders nothing when the
 * country has no configured same-day GP service / GP languages.
 */

type Slot = {
  startAt: string;
  endAt: string;
  priceCents: number;
  pricingType: "STANDARD" | "PEAK" | "OFF_PEAK";
  currencyCode: string;
};

type ServiceInfo = {
  id: string;
  slug: string;
  name: string;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string;
};

export type SameDayBookingI18n = {
  eyebrow: string;
  title: string;
  languageLabel: string;
  languagePlaceholder: string;
  pickTime: string;
  today: string;
  tomorrow: string;
  pickLanguageFirst: string;
  loading: string;
  noSlots: string;
  continue: string;
  reassure: string;
  minSuffix: string;
};

const DEFAULT_I18N: SameDayBookingI18n = {
  eyebrow: "Need help?",
  title: "Same-Day Consultation",
  languageLabel: "Consultation language",
  languagePlaceholder: "Select your language…",
  pickTime: "Pick a time",
  today: "Today",
  tomorrow: "Tomorrow",
  pickLanguageFirst: "Choose a language to see available times.",
  loading: "Finding open times…",
  noSlots: "No times today or tomorrow for this language. Try another language.",
  continue: "Continue",
  reassure: "Choose your language and pick a time. We will assign the right GP.",
  minSuffix: "min",
};

// Scrollbar: track transparent (shows the panel/container colour), thumb lime.
const LIME_SCROLLBAR =
  "[scrollbar-width:thin] [scrollbar-color:var(--color-brand-accent)_transparent] " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-brand-accent)]";

// Doctor.languages are free-text — some markets store ISO codes ("en"),
// others full names ("english"). Map both to a clean Title-Case label.
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  english: "English",
  pt: "Portuguese",
  portuguese: "Portuguese",
  es: "Spanish",
  spanish: "Spanish",
  cs: "Czech",
  cz: "Czech",
  czech: "Czech",
  ro: "Romanian",
  romanian: "Romanian",
  ar: "Arabic",
  arabic: "Arabic",
  fr: "French",
  french: "French",
  de: "German",
  german: "German",
  it: "Italian",
  italian: "Italian",
  pl: "Polish",
  polish: "Polish",
  nl: "Dutch",
  dutch: "Dutch",
  ru: "Russian",
  russian: "Russian",
};

const ENGLISH_CODES = ["en", "english"];

function languageLabel(code: string): string {
  const key = code.toLowerCase();
  return LANGUAGE_NAMES[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

const DESKTOP_QUERY = "(min-width: 1024px)";

export function SameDayBooking({
  country,
  lang,
  countryCode,
  languages,
  configured,
  className,
  i18n,
  viewport,
}: {
  /** Country URL slug, e.g. "ireland". */
  country: string;
  /** UI locale, e.g. "en". */
  lang: string;
  /** ISO country code, e.g. "ie" — used for the availability API. */
  countryCode: string;
  /** Consultation language codes the GP pool offers. */
  languages: string[];
  /** False when no same-day GP service is set up for this country. */
  configured: boolean;
  /** Extra classes for placement (the hero positions it absolutely). */
  className?: string;
  i18n?: Partial<SameDayBookingI18n>;
  /**
   * HomeHero mounts two instances of this component — one laid out inline in
   * the mobile text column, one in the desktop side panel — because those are
   * genuinely different DOM parents (the desktop grid cell is `hidden` below
   * `lg`, so a single node can't be CSS-repositioned between them). Tailwind's
   * `lg:` classes only toggle `display`, so without this both instances still
   * mount, both fetch gp-availability, and both render the H2 into the DOM.
   * `viewport` tells an instance which breakpoint it's meant to serve; it
   * checks the real viewport on mount and only the matching instance
   * fetches/renders.
   */
  viewport: "mobile" | "desktop";
}) {
  const t = { ...DEFAULT_I18N, ...i18n };
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Default to English (codes vary: "en" / "english") so times load on mount
  // without the patient having to pick a language first; fall back to the first
  // offered language only when no English variant exists.
  const defaultLanguage =
    languages.find((l) => ENGLISH_CODES.includes(l.toLowerCase())) ?? languages[0] ?? "";
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [clinicTz, setClinicTz] = useState("UTC");
  const [loading, setLoading] = useState(false);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [routing, startRouting] = useTransition();
  // Distinguishes "fetch failed" from "fetch succeeded, no slots" so the UI can
  // offer a retry instead of silently rendering the same empty state (spec §11).
  const [fetchError, setFetchError] = useState(false);
  // True until the mount effect below proves this instance doesn't match the
  // live viewport — see the `viewport` prop doc. Starts true so SSR still
  // renders real content on both instances (no blank/no-index first paint).
  const [isActive, setIsActive] = useState(true);
  const loadedRef = useRef(false);

  async function loadAvailability(code: string) {
    setSlots([]);
    setSelectedStart(null);
    setFetchError(false);
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/public/gp-availability?country=${encodeURIComponent(countryCode)}&language=${encodeURIComponent(code)}&days=7`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { slots?: Slot[]; clinicTimezone?: string; service?: ServiceInfo | null };
      };
      const nextSlots = json.ok && json.data?.slots ? json.data.slots : [];
      setSlots(nextSlots);
      setService(json.data?.service ?? null);
      setClinicTz(json.data?.clinicTimezone ?? "UTC");
    } catch {
      setSlots([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  function onLanguageChange(code: string) {
    setSelectedLanguage(code);
    void loadAvailability(code);
  }

  // Auto-load the default language's times on mount so the panel shows
  // availability immediately instead of waiting for a language pick — but
  // only for the instance matching the real viewport (see `viewport` prop
  // doc): otherwise both the mobile and desktop instance fire the same
  // gp-availability request. Re-checks on resize so crossing the 1024px
  // breakpoint without a reload still loads the now-visible instance.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    function sync(matches: boolean) {
      const active = viewport === "desktop" ? matches : !matches;
      setIsActive(active);
      if (active && !loadedRef.current && defaultLanguage) {
        loadedRef.current = true;
        void loadAvailability(defaultLanguage);
      }
    }
    sync(mq.matches);
    const listener = (e: MediaQueryListEvent) => sync(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same-day flow only ever offers TODAY + TOMORROW (clinic-local). Bucket the
  // returned slots into those two days and drop anything later.
  const { today, tomorrow } = useMemo(() => {
    const now = new Date();
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const todayKey = formatAppDate(now.toISOString(), clinicTz);
    const tomorrowKey = formatAppDate(tomorrowDate.toISOString(), clinicTz);
    const todaySlots: Slot[] = [];
    const tomorrowSlots: Slot[] = [];
    for (const s of slots) {
      const key = formatAppDate(s.startAt, clinicTz);
      if (key === todayKey) todaySlots.push(s);
      else if (key === tomorrowKey) tomorrowSlots.push(s);
    }
    return {
      today: { label: todayKey, slots: todaySlots },
      tomorrow: { label: tomorrowKey, slots: tomorrowSlots },
    };
  }, [slots, clinicTz]);

  const hasTwoDaySlots = today.slots.length > 0 || tomorrow.slots.length > 0;

  const renderGroup = (heading: string, group: { label: string; slots: Slot[] }) => (
    <div key={heading}>
      <p className="mb-2 flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
        <span className="text-[var(--color-brand-accent)]">{heading}</span>
        <span className="font-medium normal-case tracking-normal text-white/70">{group.label}</span>
      </p>
      {/* @lg container query, not sm: — in the desktop hero the card sits in a
          ~420px column while the viewport is >=1024px, so viewport breakpoints
          overstate the available width and cram 5 columns into the panel. */}
      <div className="grid grid-cols-4 gap-2 @lg:grid-cols-5">
        {group.slots.map((s) => {
          const active = selectedStart === s.startAt;
          return (
            <button
              key={s.startAt}
              type="button"
              onClick={() => setSelectedStart(s.startAt)}
              aria-pressed={active}
              className="gh2-selectable-dark inline-flex flex-col items-center justify-center rounded-lg px-2 py-1.5 text-[13.5px] font-semibold [font-variant-numeric:tabular-nums]"
            >
              <span>{formatAppTime(s.startAt, clinicTz)}</span>
              <span className={`text-[11px] font-medium ${active ? "text-[#0a1f1a]/80" : "text-white/70"}`}>
                {formatPriceRounded(s.priceCents, s.currencyCode)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  function onContinue() {
    if (!selectedStart) return;
    startRouting(() => {
      router.push(
        `/${country}/${lang}/book?gp=1&language=${encodeURIComponent(selectedLanguage)}&at=${encodeURIComponent(selectedStart)}#booking`,
      );
    });
  }

  if (!configured || languages.length === 0 || !isActive) return null;

  const tzLabel = clinicTz.includes("/")
    ? clinicTz.slice(clinicTz.lastIndexOf("/") + 1).replace(/_/g, " ")
    : clinicTz;

  return (
    <div
      className={`gh-sameday @container relative flex w-full max-w-[900px] flex-col rounded-[26px] p-6 @lg:p-8 ${className ?? ""}`}
      style={{
        background: "rgba(8, 33, 27, 0.82)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 24px 70px rgba(0,0,0,0.42)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-accent)]">
        <CalendarClock className="size-4" strokeWidth={1.8} aria-hidden />
        {t.eyebrow}
      </p>
      <h2 className="mt-2 text-[clamp(1.5rem,1rem+1.4vw,2rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-white">
        {t.title}
      </h2>

      {/* Step 1 — language (custom dropdown — native select ignores CSS for open state) */}
      <div className="mt-5 block">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
          <Globe className="size-3.5 text-[var(--color-brand-accent)]" strokeWidth={1.8} aria-hidden />
          {t.languageLabel}
        </span>
        <div ref={dropdownRef} className="relative mt-2">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-[16px] border-2 border-[var(--color-brand-accent)]/40 bg-white/[0.08] px-5 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:border-[var(--color-brand-accent)]/70 hover:bg-white/[0.12] focus:border-[var(--color-brand-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]/40"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <span>{selectedLanguage ? languageLabel(selectedLanguage) : t.languagePlaceholder}</span>
            <ChevronDown
              className={`size-4 text-[var(--color-brand-accent)] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              strokeWidth={2.5}
              aria-hidden
            />
          </button>

          {dropdownOpen && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-[var(--z-dropdown)] max-h-[240px] overflow-y-auto rounded-[16px] border border-[var(--color-brand-accent)]/30 bg-[#0a1f1a] py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] [scrollbar-width:thin] [scrollbar-color:var(--color-brand-accent)_transparent]"
            >
              {languages.map((code) => {
                const isSelected = selectedLanguage === code;
                return (
                  <li
                    key={code}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onLanguageChange(code);
                      setDropdownOpen(false);
                    }}
                    className={`flex cursor-pointer items-center gap-2 px-5 py-2.5 text-[15px] font-semibold transition-colors duration-150 ${
                      isSelected
                        ? "bg-[var(--color-brand-accent)] text-[#0a1f1a]"
                        : "text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    {isSelected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                    {languageLabel(code)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Step 2 — time */}
      <div className="mt-5 border-t border-white/10 pt-5">
        {!selectedLanguage ? (
          <p className="py-5 text-center text-[13px] text-white/55">{t.pickLanguageFirst}</p>
        ) : loading ? (
          <p className="flex items-center justify-center gap-2 py-5 text-[13px] text-white/65">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t.loading}
          </p>
        ) : fetchError ? (
          <div className="rounded-[16px] border border-[rgba(255,196,0,0.3)] bg-[rgba(255,196,0,0.08)] px-4 py-5 text-center">
            <AlertTriangle className="mx-auto size-5 text-[var(--color-brand-accent)]" aria-hidden />
            <p className="mt-2 text-[13px] font-semibold text-white">Couldn&apos;t load times.</p>
            <button
              type="button"
              onClick={() => void loadAvailability(selectedLanguage)}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--color-brand-accent)]/50 px-4 text-[13px] font-semibold text-[var(--color-brand-accent)] transition-colors hover:bg-white/[0.06]"
            >
              <RotateCw className="size-3.5" aria-hidden />
              Retry
            </button>
          </div>
        ) : !hasTwoDaySlots ? (
          <p className="py-5 text-center text-[13px] text-white/55">{t.noSlots}</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
                {t.pickTime}
              </p>
              <p className="text-[11px] text-white/45">{tzLabel}</p>
            </div>

            {/* Today + Tomorrow only — no date picker. */}
            <div className={`mt-3 flex max-h-[240px] flex-col gap-4 overflow-y-auto pr-1.5 ${LIME_SCROLLBAR}`}>
              {today.slots.length > 0 ? renderGroup(t.today, today) : null}
              {tomorrow.slots.length > 0 ? renderGroup(t.tomorrow, tomorrow) : null}
            </div>

            {/* Step 3 — continue */}
            <button
              type="button"
              onClick={onContinue}
              disabled={!selectedStart || routing}
              className="gh2-btn-lime mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {routing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {t.continue}
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </button>
            {service?.durationMinutes ? (
              <p className="mt-2 text-center text-[11px] text-white/45">
                {service.name} · {service.durationMinutes} {t.minSuffix}
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* Reassurance */}
      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11.5px] font-medium text-white/55">
        <Check className="size-3.5 shrink-0 text-[var(--color-brand-accent)]" strokeWidth={2.2} aria-hidden />
        {t.reassure}
      </p>
    </div>
  );
}
