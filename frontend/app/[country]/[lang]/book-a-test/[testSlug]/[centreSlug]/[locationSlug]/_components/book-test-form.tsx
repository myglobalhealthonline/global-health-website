"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Calendar, Check, Loader2, MapPin } from "lucide-react";
import { addToCart } from "@/lib/api/cart-client";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { PhoneField } from "@/components/forms/phone-field";
import { DobField } from "@/components/forms/dob-field";
import { dialCodeForCountrySlug } from "@/lib/phone/dial-codes";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { CommonLocale } from "@/lib/i18n/types";
import { StepIndicator } from "../../../../../book/_components/step-indicator";
import { BookingSectionHeader } from "../../../../../book/_components/booking-section-header";

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
  /** Shared booking-form copy — consent wording, picker labels and the
   *  selected-time card are reused verbatim from the consultation flow. */
  c: CommonLocale["bookingForm"];
  /** Shared wizard chrome copy (step names, sidebar heading). */
  bp: Pick<CommonLocale["bookPage"], "stepTime" | "stepDetails" | "bookingSteps">;
};

const EYEBROW = "text-[11px] font-bold uppercase tracking-[0.16em]";
/* Field styling is the consultation form's, verbatim, so both booking
 * journeys render identical inputs inside the ivory cards. */
const LABEL = "gh-field-label text-xs font-semibold text-[var(--color-text-body)]";
const INPUT =
  "mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40";

/**
 * The Book-a-Test wizard: Test → Location → Time → Details, in the same
 * chrome as the consultation wizard on /book (flow header, dark step rail,
 * forest step panel with ivory form cards).
 *
 * Test and Location were chosen on the previous pages; this component owns
 * TIME and DETAILS. The step is URL-driven like /book: picking a time writes
 * `?slot=<id>`, "Change time" drops it — so browser Back works between steps.
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
  bp,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const slotParam = useSearchParams().get("slot");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [ids, setIds] = useState<{
    examTypeId: string;
    testCenterId: string;
    testCenterLocationId: string;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
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

  const selectedSlot = slotParam ? (slots?.find((s) => s.id === slotParam) ?? null) : null;
  // A ?slot= that the loaded inventory no longer carries (taken, expired, or a
  // stale link) falls back to the time step with a notice — never a details
  // form for a time that cannot be booked.
  const slotStale = Boolean(slotParam) && slots !== null && !selectedSlot;
  const onDetails = Boolean(slotParam) && !slotStale;
  const currentStep = onDetails ? 4 : 3;

  const tzLabel = centreTz.includes("/")
    ? centreTz.slice(centreTz.lastIndexOf("/") + 1).replace(/_/g, " ")
    : centreTz;
  const slotLabel = (slot: Slot) =>
    `${formatAppDate(slot.startAt, centreTz)} · ${formatAppTime(slot.startAt, centreTz)}`;
  const activeDay =
    selectedDay ??
    (selectedSlot ? formatAppDate(selectedSlot.startAt, centreTz) : null) ??
    byDay[0]?.[0] ??
    null;
  const activeSlots = byDay.find(([day]) => day === activeDay)?.[1] ?? [];

  const base = `/${countrySlug}/${lang}`;
  const timeHref = `${pathname}#booking`;
  const maxDob = new Date().toISOString().slice(0, 10);
  const privacyPolicyHref = `${base}/legal/privacy-policy`;

  function chooseSlot(slotId: string) {
    setError(null);
    router.push(`${pathname}?slot=${encodeURIComponent(slotId)}#booking`);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!selectedSlot || !ids) {
      setError(t.booking.chooseTime);
      return;
    }
    const form = new FormData(e.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    setSubmitting(true);
    const result = await addToCart({
      kind: "TEST_BOOKING",
      examTypeId: ids.examTypeId,
      testCenterId: ids.testCenterId,
      testCenterLocationId: ids.testCenterLocationId,
      testCenterTimeSlotId: selectedSlot.id,
      patient: {
        fullName: text("fullName"),
        email: text("email"),
        phone: text("phone") || undefined,
        dateOfBirth: text("dateOfBirth") || undefined,
        notes: text("notes") || undefined,
        // One ticked box maps to all four backend consent fields, exactly as
        // the consultation form does — the UI was collapsed, not the consent.
        // The box is `required`, so the form cannot submit without it.
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
      // re-fetching would hide that, so say it plainly and send them back to
      // re-pick.
      setError(result.message || t.booking.slotTaken);
      router.push(timeHref);
      return;
    }
    router.push(`${base}/cart`);
  }

  const panelHeader = (
    <header className="border-b border-[var(--color-border)] pb-5">
      <p className={`${EYEBROW} text-[var(--color-brand-accent)]`}>{t.booking.summaryHeading}</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--color-text-primary)]">
        {testName}
      </h2>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-[var(--color-text-muted)]">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--color-brand-accent)]" aria-hidden />
        <span>
          {centreName}
          {centreAddress ? ` · ${centreAddress}` : ""}
        </span>
      </p>
    </header>
  );

  const errorNotice = error ? (
    <div
      role="alert"
      className="gh-status-error flex items-start gap-2 rounded-[var(--radius-card)] px-4 py-3 text-sm font-semibold"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{error}</span>
    </div>
  ) : null;

  return (
    <>
      <GH2FlowHeader
        title={t.hero.eyebrow}
        subtitle={`${testName} · ${centreName}`}
        activeStep={currentStep}
        steps={[t.booking.summaryTest, t.booking.summaryLocation, bp.stepTime, bp.stepDetails]}
      />

      <section
        id="booking"
        className="scroll-mt-24 gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel py-[clamp(48px,6vw,88px)]"
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.8fr)]">
            {/* Below `lg:` document order = visual order — the step content
                renders first, this rail after (same as /book). */}
            <aside className="order-2 lg:order-none lg:sticky lg:top-24 lg:self-start">
              <div className="gh2-glass-forest gh2-dark-content p-5">
                <p className={`${EYEBROW} text-[var(--color-brand-accent)]`}>{bp.bookingSteps}</p>
                <StepIndicator
                  current={currentStep}
                  labels={[t.booking.summaryTest, t.booking.summaryLocation, bp.stepTime, bp.stepDetails]}
                  values={[testName, centreName, selectedSlot ? slotLabel(selectedSlot) : null, null]}
                  hrefs={[
                    `${base}/book-a-test`,
                    `${base}/book-a-test/${testSlug}#centres`,
                    timeHref,
                    null,
                  ]}
                />
                <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-white/10 pt-5">
                  <span className={`${EYEBROW} text-white/55`}>{t.booking.summaryPrice}</span>
                  <span className="text-2xl font-extrabold tracking-[-0.02em] text-[var(--color-brand-accent)]">
                    {priceLabel}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/60">{t.booking.arriveEarly}</p>
              </div>
            </aside>

            {!onDetails ? (
              /* STEP 3 — TIME only. Picking a time writes ?slot= and advances. */
              <div className="grid min-w-0 gap-6">
                <BookingSectionHeader
                  eyebrow={bp.stepTime}
                  title={t.booking.chooseTime}
                  description={t.booking.centreTime}
                />
                {slotStale ? (
                  <div
                    role="alert"
                    className="gh2-card-ivory border-l-4 p-4 text-sm font-semibold text-[var(--color-text-primary)]"
                    style={{ borderLeftColor: "var(--color-status-warning-text)" }}
                  >
                    {t.booking.slotTaken}
                  </div>
                ) : null}
                {errorNotice}
                <div className="gh2-glass-forest gh2-dark-content min-w-0 p-5 sm:p-6">
                  {panelHeader}
                  <div className="mt-5">
                    {slots === null ? (
                      <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        {t.booking.loadingSlots}
                      </p>
                    ) : slots.length === 0 ? (
                      <div className="gh2-status-card gh2-status-card-dark text-center">
                        <Calendar className="mx-auto size-6 text-[var(--color-brand-accent)]" aria-hidden />
                        <p className="mt-3 font-semibold text-white/85">{t.booking.noSlots}</p>
                        <Link
                          href={`${base}/book-a-test/${testSlug}#centres`}
                          className="gh2-btn-lime mt-5 inline-flex"
                        >
                          {t.booking.changeLocation}
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className={`${EYEBROW} text-[var(--color-text-muted)]`}>{c.pickDate}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
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
                                className={`gh2-selectable-dark relative flex min-w-[68px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-4 py-3 transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${isActive ? "shadow-[var(--shadow-card)]" : ""}`}
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

                        {/* Time grid for the active day — picking a time advances. */}
                        {activeDay ? (
                          <div className="mt-6">
                            <p className={`${EYEBROW} text-[var(--color-text-muted)]`}>
                              {c.pickTimeOn.replace("{date}", activeDay)}
                            </p>
                            <div
                              role="group"
                              aria-label={c.pickTimeOn.replace("{date}", activeDay)}
                              className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                            >
                              {activeSlots.map((slot) => (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => chooseSlot(slot.id)}
                                  className="gh2-selectable-dark inline-flex min-h-[56px] items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold text-white/90 [font-variant-numeric:tabular-nums] transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                                >
                                  {formatAppTime(slot.startAt, centreTz)}
                                </button>
                              ))}
                            </div>
                            <p className="mt-4 text-xs text-[var(--color-text-muted)]">{c.pickTimeToContinue}</p>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 4 — DETAILS. The time is fixed (summary card + Change time). */
              <div className="grid min-w-0 gap-6">
                <BookingSectionHeader
                  eyebrow={bp.stepDetails}
                  title={t.booking.yourDetails}
                  description={t.booking.arriveEarly}
                />
                <div className="gh2-glass-forest gh2-dark-content min-w-0 p-5 sm:p-6">
                  {panelHeader}
                  <form onSubmit={onSubmit} className="mt-6 grid gap-6">
                    {/* Selected time — confirmed on the previous step. */}
                    <div className="gh2-card-ivory flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                          {c.selectedTime}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                          {selectedSlot ? (
                            `${slotLabel(selectedSlot)} (${tzLabel}) · ${priceLabel}`
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              {t.booking.loadingSlots}
                            </span>
                          )}
                        </p>
                      </div>
                      <Link
                        href={timeHref}
                        className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-page)]"
                      >
                        {c.changeTime}
                      </Link>
                    </div>

                    {/* Patient details */}
                    <div role="group" className="gh2-card-ivory p-5 sm:p-6">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                        {c.patientDetails}
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className={LABEL} data-required>
                            {t.booking.fullName}
                          </span>
                          <input
                            type="text"
                            name="fullName"
                            required
                            aria-required="true"
                            minLength={2}
                            maxLength={120}
                            autoComplete="name"
                            className={INPUT}
                          />
                        </label>
                        <label className="block">
                          <span className={LABEL} data-required>
                            {t.booking.email}
                          </span>
                          <input
                            type="email"
                            name="email"
                            required
                            aria-required="true"
                            maxLength={254}
                            autoComplete="email"
                            className={INPUT}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-[var(--color-text-body)]">
                            {t.booking.phone}
                          </span>
                          <PhoneField
                            name="phone"
                            defaultDial={dialCodeForCountrySlug(countrySlug)}
                            className="mt-1 flex gap-2"
                            selectClassName="block rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-2 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                            inputClassName={INPUT.replace("mt-1 ", "")}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-[var(--color-text-body)]">
                            {t.booking.dateOfBirth}
                          </span>
                          <DobField name="dateOfBirth" max={maxDob} className={INPUT} />
                        </label>
                      </div>
                      <label className="mt-4 block">
                        <span className="text-xs font-semibold text-[var(--color-text-body)]">
                          {t.booking.notes}
                        </span>
                        <textarea name="notes" rows={3} maxLength={1000} className={INPUT} />
                      </label>
                    </div>

                    {/* Consent — the combined GDPR tick, same wording as consultations. */}
                    <div role="group" className="gh2-card-ivory p-5 sm:p-6">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
                        {c.gdprConsent}
                      </p>
                      <label className="mt-2 flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                        <input
                          type="checkbox"
                          name="gdprCombinedConsent"
                          required
                          aria-required="true"
                          className="mt-0.5 size-4 shrink-0 rounded border-[var(--color-border)]"
                        />
                        <span>
                          {c.gdprCombinedConsent}{" "}
                          <Link
                            href={privacyPolicyHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[var(--color-brand-primary)] underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.privacyPolicyLinkLabel}
                          </Link>
                        </span>
                      </label>
                    </div>

                    {errorNotice}

                    <button
                      type="submit"
                      disabled={submitting || !selectedSlot || !ids}
                      className="gh2-btn-lime w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                      {t.booking.addToCart}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
