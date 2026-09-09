"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { CountryDialSelect } from "@/components/forms/country-dial-select";
import { combinePhone, splitPhone } from "@/lib/phone/dial-codes";
import { formatPriceRounded } from "@/lib/format-currency";
import {
  hasTestBookingErrors,
  parseDiscountPercent,
  validateTestBooking,
  type TestBookingErrors,
} from "@/lib/admin/manual-booking-validation";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { bareSlotId } from "@/lib/calendar/use-slot-manager";

/** One exam this centre offers, with the price the patient would pay. */
export type ExamOption = {
  examTypeId: string;
  name: string;
  patientPriceCents: number;
  currencyCode: string;
  durationMinutes: number | null;
};

/** An existing patient matching the typed email — from /api/admin/patients/by-email. */
type PatientOption = {
  email: string;
  fullName: string;
  dateOfBirth: string | null;
  phone: string | null;
  appointmentCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  slot: CalendarItem | null;
  testCenterId: string;
  testCenterName: string;
  countryCode: string;
  centerTz: string;
  exams: ExamOption[];
  defaultDialCode: string;
  action: (formData: FormData) => void | Promise<void>;
};

/**
 * Booking dialog reached by clicking an OPEN slot on a test centre's week grid.
 *
 * Centre and time are fixed (the slot was chosen on the calendar); the admin
 * fills the patient, picks which exam, and optionally discounts it. Mirrors the
 * doctor slot dialog's patient typeahead and validation, minus everything a
 * test booking has no notion of — no doctor, no service cascade, no
 * consultation mode, no clinic picker.
 */
export function BookTestSlotDialog({
  open,
  onClose,
  slot,
  testCenterId,
  testCenterName,
  countryCode,
  centerTz,
  exams,
  defaultDialCode,
  action,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dialCode, setDialCode] = useState(defaultDialCode);
  const [phoneNational, setPhoneNational] = useState("");
  const [examTypeId, setExamTypeId] = useState(exams[0]?.examTypeId ?? "");
  const [notes, setNotes] = useState("");
  // Optional admin discount, whole percent. Blank = charge the full price.
  const [discountPercent, setDiscountPercent] = useState("");

  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const [errors, setErrors] = useState<TestBookingErrors>({});
  const [discountError, setDiscountError] = useState<string | null>(null);

  // The parent remounts this component (via `key={slot.id}`) whenever a new
  // slot is clicked, so the useState defaults above are the reset.

  // Debounced existing-patient lookup as the admin types the email.
  useEffect(() => {
    const value = email.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (value.length < 2) {
        setPatientOptions([]);
        setLookupLoading(false);
        return;
      }
      void (async () => {
        setLookupLoading(true);
        try {
          const res = await fetch(
            `/api/admin/patients/by-email?email=${encodeURIComponent(value)}`,
            { signal: controller.signal },
          );
          const json = (await res.json()) as {
            ok?: boolean;
            data?: { patients?: PatientOption[] };
          };
          if (controller.signal.aborted) return;
          setPatientOptions(
            res.ok && json.ok && Array.isArray(json.data?.patients)
              ? json.data!.patients!
              : [],
          );
        } catch {
          if (!controller.signal.aborted) setPatientOptions([]);
        } finally {
          if (!controller.signal.aborted) setLookupLoading(false);
        }
      })();
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [email]);

  function selectPatient(p: PatientOption) {
    setEmail(p.email);
    setFullName(p.fullName);
    setDateOfBirth(p.dateOfBirth ?? "");
    if (p.phone) {
      const parts = splitPhone(p.phone, defaultDialCode);
      setDialCode(parts.dial);
      setPhoneNational(parts.national);
    }
    setShowPatientMenu(false);
  }

  const combinedPhone = combinePhone(dialCode, phoneNational);
  const selectedExam = exams.find((e) => e.examTypeId === examTypeId) ?? null;
  // Calendar item ids are namespaced `s-<slotId>` so a slot and a booking
  // cannot collide in the grid. The API wants the bare id — sending the
  // prefixed one matches no row and fails as "slot no longer available".
  const slotId = slot ? bareSlotId(slot) : "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const result = validateTestBooking({
      fullName,
      email,
      phone: combinedPhone,
      examTypeId,
      testCenterTimeSlotId: slotId,
    });
    const discount = parseDiscountPercent(discountPercent);
    if (hasTestBookingErrors(result) || discount.error) {
      e.preventDefault();
      setErrors(result);
      setDiscountError(discount.error);
      return;
    }
    setErrors({});
    setDiscountError(null);
    // Native submit proceeds → server action creates the booking.
  }

  if (!slot) return null;

  const noExams = exams.length === 0;

  return (
    <PortalDialog
      open={open}
      onClose={onClose}
      width="lg"
      title={`Book a test — ${testCenterName}`}
    >
      <form action={action} onSubmit={onSubmit} noValidate className="grid gap-4">
        <input type="hidden" name="countryCode" value={countryCode} />
        <input type="hidden" name="testCenterId" value={testCenterId} />
        <input type="hidden" name="testCenterTimeSlotId" value={slotId} />
        <input type="hidden" name="phone" value={combinedPhone} />

        {/* Locked slot summary */}
        <div
          className="rounded-[var(--radius-card-sm)] border px-3 py-2.5 text-sm"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-background-subtle, transparent)",
          }}
        >
          <span className="font-semibold text-[var(--color-text-primary)]">
            {formatAppDate(slot.startAt, centerTz)} ·{" "}
            {formatAppTime(slot.startAt, centerTz)}
          </span>
          <span className="ml-1 text-portal-meta text-[var(--color-text-muted)]">
            (centre time)
          </span>
        </div>

        {noExams ? (
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-sm">
            This centre offers no active tests yet. Add one under Manage exams
            before booking.
          </p>
        ) : null}

        {/* Patient */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Full name *</span>
            <input
              type="text"
              name="fullName"
              className="gh-input"
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName ? <FieldError msg={errors.fullName} /> : null}
          </label>

          <label className="relative flex flex-col gap-1.5">
            <span className="gh-field-label">Email *</span>
            <input
              type="email"
              name="email"
              className="gh-input"
              maxLength={254}
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setShowPatientMenu(true);
              }}
              onFocus={() => setShowPatientMenu(true)}
              onBlur={() => setTimeout(() => setShowPatientMenu(false), 150)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <FieldError msg={errors.email} /> : null}
            {showPatientMenu && (lookupLoading || patientOptions.length > 0) ? (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[var(--z-dropdown)] max-h-56 overflow-auto rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page)] shadow-lg">
                {lookupLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-portal-meta text-[var(--color-text-muted)]">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden /> Searching…
                  </div>
                ) : (
                  patientOptions.map((p, i) => (
                    <button
                      key={`${p.email}-${p.fullName}-${i}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectPatient(p)}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[var(--color-brand-primary)]/10"
                    >
                      <span className="text-portal-compact font-semibold text-[var(--color-text-primary)]">
                        {p.fullName}
                      </span>
                      <span className="text-portal-meta text-[var(--color-text-muted)]">
                        {[p.email, p.dateOfBirth ? `DOB ${p.dateOfBirth}` : null, p.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Phone *</span>
            <div className="flex gap-2">
              <CountryDialSelect
                className="gh-select max-w-[140px]"
                value={dialCode}
                onChange={setDialCode}
              />
              <input
                type="tel"
                inputMode="tel"
                className="gh-input flex-1"
                placeholder="871234567"
                maxLength={20}
                value={phoneNational}
                onChange={(e) => setPhoneNational(e.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
            </div>
            {errors.phone ? <FieldError msg={errors.phone} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Date of birth</span>
            <input
              type="date"
              name="dateOfBirth"
              className="gh-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </label>
        </div>

        {/* Exam + price */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Test *</span>
            <select
              name="examTypeId"
              className="gh-select"
              value={examTypeId}
              onChange={(e) => setExamTypeId(e.target.value)}
              aria-invalid={Boolean(errors.examTypeId)}
            >
              {exams.map((e) => (
                <option key={e.examTypeId} value={e.examTypeId}>
                  {e.name}
                </option>
              ))}
            </select>
            {errors.examTypeId ? <FieldError msg={errors.examTypeId} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Discount %</span>
            <input
              type="number"
              name="discountPercent"
              className="gh-input"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              aria-invalid={Boolean(discountError)}
            />
            {discountError ? (
              <FieldError msg={discountError} />
            ) : (
              <span className="text-portal-meta text-[var(--color-text-muted)]">
                {selectedExam
                  ? `Price ${formatPriceRounded(selectedExam.patientPriceCents, selectedExam.currencyCode)}${
                      discountPercent.trim() === "100" ? " — comped in full" : ""
                    }`
                  : "Pick a test to see the price."}
              </span>
            )}
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Notes</span>
          <textarea
            name="notes"
            className="gh-input"
            rows={2}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <p className="text-portal-meta text-[var(--color-text-muted)]">
          The patient receives a payment link, then a confirmation carrying this
          centre&apos;s address and the time to arrive.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="gh-btn gh-btn-ghost">
            Cancel
          </button>
          <button type="submit" className="gh-btn gh-btn-primary" disabled={noExams}>
            Confirm booking
          </button>
        </div>
      </form>
    </PortalDialog>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <span className="text-portal-meta font-semibold text-[var(--color-status-error)]">
      {msg}
    </span>
  );
}
