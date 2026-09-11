"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Loader2, MapPin } from "lucide-react";
import { addToCart } from "@/lib/api/cart-client";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { CommonLocale } from "@/lib/i18n/types";

type Slot = { id: string; startAt: string; endAt: string };

type Props = {
  countryCode: string;
  countrySlug: string;
  lang: string;
  testSlug: string;
  centreSlug: string;
  locationSlug: string;
  testName: string;
  centreName: string;
  centreAddress: string | null;
  /** Centre price, already formatted for display. */
  priceLabel: string;
  /** The centre's own timezone — slots are rendered in it, not the viewer's. */
  centreTz: string;
  t: ReturnType<typeof loadLocaleBundle>["bookATest"];
  /** Shared booking-form copy — the GDPR consent wording and the date/time
   *  picker labels are reused verbatim from the consultation flow. */
  c: CommonLocale["bookingForm"];
};

const EYEBROW = "text-[11px] font-bold uppercase tracking-[0.16em]";

/**
 * Slot picker + patient intake for one exam at one centre.
 *
 * Visual language is the consultation flow's (/book): a dark forest-glass step
 * panel with date pills and a time grid in the `gh2-selectable-dark` pattern,
 * details on the ivory ground, and a dark summary panel carrying the CTA.
 *
 * Slots are fetched client-side through the same-origin proxy rather than
 * rendered on the server: inventory moves minute to minute, and a server-rendered
 * page cached even briefly would offer times that are already gone.
 *
 * The exam and centre ids are NOT taken from this component — the cart route
 * re-resolves the offering from the slugs' ids server-side, so nothing the
 * browser sends decides what is charged.
 */
export function BookTestForm({
  countryCode,
  countrySlug,
  lang,
  testSlug,
  centreSlug,
  locationSlug,
  testName,
  centreName,
  centreAddress,
  priceLabel,
  centreTz,
  t,
  c,
}: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [ids, setIds] = useState<{
    examTypeId: string;
    testCenterId: string;
    testCenterLocationId: string;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [notes, setNotes] = useState("");
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/public/test-availability?country=${encodeURIComponent(countryCode)}` +
            `&test=${encodeURIComponent(testSlug)}` +
            `&centre=${encodeURIComponent(centreSlug)}` +
            `&location=${encodeURIComponent(locationSlug)}&days=14`,
          { signal: controller.signal },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          data?: {
            slots?: Slot[];
            examTypeId?: string;
            testCenterId?: string;
            testCenterLocationId?: string;
          };
        };
        if (controller.signal.aborted) return;
        if (res.ok && json.ok && json.data) {
          setSlots(json.data.slots ?? []);
          if (
            json.data.examTypeId &&
            json.data.testCenterId &&
            json.data.testCenterLocationId
          ) {
            setIds({
              examTypeId: json.data.examTypeId,
              testCenterId: json.data.testCenterId,
              testCenterLocationId: json.data.testCenterLocationId,
            });
          }
        } else {
          setSlots([]);
        }
      } catch {
        if (!controller.signal.aborted) setSlots([]);
      }
    })();
    return () => controller.abort();
  }, [countryCode, testSlug, centreSlug, locationSlug]);

  /** Group by the centre's local day so the picker reads as a calendar. */
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots ?? []) {
      const key = formatAppDate(slot.startAt, centreTz);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [slots, centreTz]);

  const activeDay = selectedDay ?? byDay[0]?.[0] ?? null;
  const activeSlots = byDay.find(([day]) => day === activeDay)?.[1] ?? [];
  const selectedSlot = slots?.find((s) => s.id === selectedSlotId) ?? null;
  const tzLabel = centreTz.includes("/")
    ? centreTz.slice(centreTz.lastIndexOf("/") + 1).replace(/_/g, " ")
    : centreTz;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!selectedSlotId || !ids) {
      setError(t.booking.chooseTime);
      return;
    }
    setSubmitting(true);
    const result = await addToCart({
      kind: "TEST_BOOKING",
      examTypeId: ids.examTypeId,
      testCenterId: ids.testCenterId,
      testCenterLocationId: ids.testCenterLocationId,
      testCenterTimeSlotId: selectedSlotId,
      patient: {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        notes: notes.trim() || undefined,
        // One ticked box maps to all four backend consent fields, exactly as
        // the consultation form does — the UI was collapsed, not the consent.
        // The literal `true` types are why this cannot be defaulted: the
        // patient has to have actually ticked it, and the button is disabled
        // until they do.
        consentAccepted: true,
        gdprConsentClinic: true,
        gdprConsentPlatform: true,
        crossBorderConsentAccepted: true,
        patientTimezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
      },
    });
    setSubmitting(false);
    if (!result.ok) {
      // A 409 here means someone took the slot between render and submit —
      // re-fetching would hide that, so say it plainly and let them re-pick.
      setError(result.message || t.booking.slotTaken);
      setSelectedSlotId("");
      return;
    }
    router.push(`/${countrySlug}/${lang}/cart`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10"
    >
      <div className="grid min-w-0 gap-12">
        {/* STEP 1 — time, dark forest glass (same panel as /book) */}
        <section
          aria-labelledby="book-test-time"
          className="gh2-glass-forest gh2-dark-content min-w-0 p-5 sm:p-7"
        >
          <p className={`${EYEBROW} text-[var(--color-brand-accent)]`}>{t.booking.stepTime}</p>
          <h2
            id="book-test-time"
            className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-white"
          >
            {t.booking.chooseTime}
          </h2>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-white/60">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--color-brand-accent)]" aria-hidden />
            {centreAddress ?? centreName}
          </p>

          <div className="mt-6 border-t border-white/10 pt-6">
            {slots === null ? (
              <p className="flex items-center gap-2 text-sm text-white/65">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t.booking.loadingSlots}
              </p>
            ) : slots.length === 0 ? (
              <div className="gh2-status-card gh2-status-card-dark text-center">
                <Calendar className="mx-auto size-6 text-[var(--color-brand-accent)]" aria-hidden />
                <p className="mt-3 font-semibold text-white/85">{t.booking.noSlots}</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className={`${EYEBROW} text-white/55`}>{c.pickDate}</p>
                  <p className="text-xs text-white/55">
                    {c.daysAvailable
                      .replace("{count}", String(byDay.length))
                      .replace("{day}", byDay.length === 1 ? c.day : c.days)
                      .replace("{tz}", tzLabel)}
                  </p>
                </div>

                {/* Date pills — local selection, no navigation. */}
                <div
                  role="tablist"
                  aria-label={c.availableDatesAriaLabel}
                  className="gh2-scroll-fade mt-3 -mx-1 flex min-w-0 max-w-full gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
                >
                  {byDay.map(([day, daySlots]) => {
                    const isActive = activeDay === day;
                    const date = new Date(daySlots[0]!.startAt);
                    const part = (opts: Intl.DateTimeFormatOptions) =>
                      date.toLocaleDateString(lang, { ...opts, timeZone: centreTz });
                    return (
                      <button
                        key={day}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        data-selected={isActive}
                        onClick={() => setSelectedDay(day)}
                        className="gh2-selectable-dark relative flex min-w-[68px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-4 py-3 transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                      >
                        {isActive ? (
                          <Check className="absolute right-1.5 top-1.5 size-3.5 text-[#0a1f1a]" aria-hidden />
                        ) : null}
                        <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${isActive ? "text-[#0a1f1a]/70" : "text-white/55"}`}>
                          {part({ weekday: "short" })}
                        </span>
                        <span className={`text-2xl font-bold leading-none [font-variant-numeric:tabular-nums] ${isActive ? "text-[#0a1f1a]" : "text-white/90"}`}>
                          {part({ day: "numeric" })}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${isActive ? "text-[#0a1f1a]/70" : "text-white/55"}`}>
                          {part({ month: "short" })}
                        </span>
                        <span className={`mt-1 text-[10px] font-semibold ${isActive ? "text-[#0a1f1a]/80" : "text-[var(--color-brand-accent)]"}`}>
                          {daySlots.length} {daySlots.length === 1 ? c.slotSingular : c.slotPlural}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Time grid for the active day — picking a time selects it. */}
                {activeDay ? (
                  <div className="mt-6">
                    <p className={`${EYEBROW} text-white/55`}>
                      {c.pickTimeOn.replace("{date}", activeDay)}
                    </p>
                    <div
                      role="group"
                      aria-label={c.pickTimeOn.replace("{date}", activeDay)}
                      className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6"
                    >
                      {activeSlots.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlotId(slot.id);
                            setError(null);
                          }}
                          aria-pressed={selectedSlotId === slot.id}
                          className="gh2-selectable-dark inline-flex min-h-[48px] items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold [font-variant-numeric:tabular-nums] transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                        >
                          {formatAppTime(slot.startAt, centreTz)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="mt-5 text-xs text-white/55">{t.booking.centreTime}</p>
              </>
            )}
          </div>
        </section>

        {/* STEP 2 — details, on the ivory ground */}
        <section aria-labelledby="book-test-details" className="min-w-0">
          <p className={`${EYEBROW} text-[var(--color-brand-primary)]`}>{t.booking.stepDetails}</p>
          <h2
            id="book-test-details"
            className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--color-text-primary)]"
          >
            {t.booking.yourDetails}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">{t.booking.fullName}</span>
              <input
                className="gh-input"
                required
                maxLength={120}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">{t.booking.email}</span>
              <input
                type="email"
                className="gh-input"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">{t.booking.phone}</span>
              <input
                type="tel"
                className="gh-input"
                maxLength={32}
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">{t.booking.dateOfBirth}</span>
              <input
                type="date"
                className="gh-input"
                autoComplete="bday"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </label>
          </div>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="gh-field-label">{t.booking.notes}</span>
            <textarea
              className="gh-input"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div role="group" className="mt-8 grid gap-2 border-t border-[rgba(29,75,54,0.12)] pt-6">
            <p className={`${EYEBROW} text-[var(--color-brand-primary)]`}>{c.gdprConsent}</p>
            <label className="flex items-start gap-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                required
                aria-required="true"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-1 size-4 shrink-0 rounded border-[var(--color-border)] accent-[var(--color-brand-primary)]"
              />
              <span>{c.gdprCombinedConsent}</span>
            </label>
          </div>
        </section>
      </div>

      {/* SUMMARY — dark glass, sticky beside the steps on desktop */}
      <aside
        aria-label={t.booking.summaryHeading}
        className="gh2-glass-forest gh2-dark-content p-6 sm:p-7 lg:sticky lg:top-28"
      >
        <p className={`${EYEBROW} text-[var(--color-brand-accent)]`}>{t.booking.summaryHeading}</p>
        <dl className="mt-4 divide-y divide-white/10">
          <div className="py-3">
            <dt className={`${EYEBROW} text-white/50`}>{t.booking.summaryTest}</dt>
            <dd className="mt-1 font-semibold text-white/92">{testName}</dd>
          </div>
          <div className="py-3">
            <dt className={`${EYEBROW} text-white/50`}>{t.booking.summaryLocation}</dt>
            <dd className="mt-1 font-semibold text-white/92">
              {centreName}
              {centreAddress ? (
                <span className="mt-0.5 block text-sm font-normal text-white/60">{centreAddress}</span>
              ) : null}
            </dd>
          </div>
          <div className="py-3">
            <dt className={`${EYEBROW} text-white/50`}>{t.booking.summaryTime}</dt>
            <dd
              className={`mt-1 font-semibold [font-variant-numeric:tabular-nums] ${
                selectedSlot ? "text-white/92" : "text-white/45"
              }`}
              aria-live="polite"
            >
              {selectedSlot
                ? `${formatAppDate(selectedSlot.startAt, centreTz)} · ${formatAppTime(selectedSlot.startAt, centreTz)}`
                : t.booking.noTimeYet}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className={`${EYEBROW} text-white/50`}>{t.booking.summaryPrice}</dt>
            <dd className="text-2xl font-extrabold tracking-[-0.02em] text-[var(--color-brand-accent)]">
              {priceLabel}
            </dd>
          </div>
        </dl>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[rgba(255,196,0,0.35)] bg-[rgba(255,196,0,0.10)] px-4 py-3 text-sm text-white/90"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="gh2-btn-lime mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          disabled={submitting || !selectedSlotId || !consented || slots === null}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {t.booking.addToCart}
        </button>
        <p className="mt-4 text-xs leading-relaxed text-white/55">{t.booking.arriveEarly}</p>
      </aside>
    </form>
  );
}
