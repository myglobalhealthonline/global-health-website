"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin } from "lucide-react";
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
  centreName: string;
  centreAddress: string | null;
  /** The centre's own timezone — slots are rendered in it, not the viewer's. */
  centreTz: string;
  t: ReturnType<typeof loadLocaleBundle>["bookATest"];
  /** Shared booking-form copy — the GDPR consent wording is reused verbatim
   *  from the consultation form rather than reworded for tests. */
  c: CommonLocale["bookingForm"];
};

/**
 * Slot picker + patient intake for one exam at one centre.
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
  centreName,
  centreAddress,
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
    <form onSubmit={onSubmit} className="grid gap-6">
      <section>
        <h2 className="gh-h2">{t.booking.chooseTime}</h2>
        <p className="m-0 flex items-start gap-1.5 text-sm text-[var(--color-text-muted)]">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {centreAddress ?? centreName}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t.booking.centreTime}
        </p>

        {slots === null ? (
          <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t.booking.loadingSlots}
          </p>
        ) : slots.length === 0 ? (
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {t.booking.noSlots}
          </p>
        ) : (
          <div className="grid gap-4">
            {byDay.map(([day, daySlots]) => (
              <div key={day}>
                <h3 className="gh-h4 mb-2">{day}</h3>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      aria-pressed={selectedSlotId === slot.id}
                      className={
                        selectedSlotId === slot.id
                          ? "gh-btn gh-btn-primary"
                          : "gh-btn gh-btn-outline"
                      }
                    >
                      {formatAppTime(slot.startAt, centreTz)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="gh-h2">{t.booking.yourDetails}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{t.booking.fullName}</span>
            <input
              className="gh-input"
              required
              maxLength={120}
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{t.booking.dateOfBirth}</span>
            <input
              type="date"
              className="gh-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">{t.booking.notes}</span>
          <textarea
            className="gh-input"
            rows={2}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </section>

      <div role="group" className="grid gap-2">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
          {c.gdprConsent}
        </p>
        <label className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            required
            aria-required="true"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-[var(--color-border)]"
          />
          <span>{c.gdprCombinedConsent}</span>
        </label>
      </div>

      {error ? (
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{error}</p>
      ) : null}

      <p className="text-sm text-[var(--color-text-muted)]">
        {t.booking.arriveEarly}
      </p>

      <button
        type="submit"
        className="gh-btn gh-btn-primary"
        disabled={submitting || !selectedSlotId || !consented || slots === null}
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {t.booking.addToCart}
      </button>
    </form>
  );
}
