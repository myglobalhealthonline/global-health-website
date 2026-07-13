"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { DIAL_OPTIONS, combinePhone, splitPhone } from "@/lib/phone/dial-codes";
import {
  hasErrors,
  validateManualBooking,
  type ManualBookingErrors,
} from "@/lib/admin/manual-booking-validation";
import type { CalendarItem } from "@/components/calendar/calendar-types";

export type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number | null;
};
export type ClinicOption = { id: string; name: string; city: string | null };

/** Bookable consultation lengths (multiples of the 15-min base grid). */
const DURATION_OPTIONS = [15, 30, 45, 60];

/** An existing patient matching the typed email — from /api/admin/patients/by-email. */
type PatientOption = {
  email: string;
  fullName: string;
  dateOfBirth: string | null;
  phone: string | null;
  appointmentCount: number;
  nationalIdNumber: string | null;
  taxIdNumber: string | null;
  passportNumber: string | null;
  addressLine1: string | null;
  addressCity: string | null;
  addressCountryCode: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  slot: CalendarItem | null;
  doctorId: string;
  doctorName: string;
  countryCode: string;
  clinicTz: string;
  services: ServiceOption[];
  clinics: ClinicOption[];
  defaultDialCode: string;
  action: (formData: FormData) => void | Promise<void>;
};

/**
 * Slim booking dialog reached by clicking an OPEN slot on the doctor's week
 * grid. Doctor + time are fixed (the slot was chosen on the calendar); the
 * admin only fills the patient, the service, mode + notes. Mirrors the
 * validation + patient-typeahead behaviour of the full manual-booking form but
 * drops the service→doctor cascade (doctor is already known here).
 */
export function BookSlotDialog({
  open,
  onClose,
  slot,
  doctorId,
  doctorName,
  countryCode,
  clinicTz,
  services,
  clinics,
  defaultDialCode,
  action,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dialCode, setDialCode] = useState(defaultDialCode);
  const [phoneNational, setPhoneNational] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  // Consultation length — defaults to the chosen service's duration (snapped
  // to a base-grid option), overridable. Consumes consecutive base slots.
  const [duration, setDuration] = useState<number>(
    snapDuration(services[0]?.durationMinutes),
  );
  const [consultationMode, setConsultationMode] = useState<"ONLINE" | "IN_PERSON">("ONLINE");
  const [clinicId, setClinicId] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const [errors, setErrors] = useState<ManualBookingErrors>({});

  // The parent remounts this component (via `key={slot.id}`) whenever a new
  // slot is clicked, so the useState defaults above are the reset — no
  // setState-in-effect cascade needed.

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

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const result = validateManualBooking({
      fullName,
      email,
      phone: combinedPhone,
      serviceId,
      doctorId,
      timeSlotId: slot?.id ?? "",
      consultationMode,
      clinicId: consultationMode === "IN_PERSON" ? clinicId : "",
      locationAddress: consultationMode === "IN_PERSON" ? locationAddress : "",
    });
    if (hasErrors(result)) {
      e.preventDefault();
      setErrors(result);
      return;
    }
    setErrors({});
    // Native submit proceeds → server action creates the booking.
  }

  if (!slot) return null;

  const noServices = services.length === 0;

  return (
    <PortalDialog
      open={open}
      onClose={onClose}
      width="lg"
      title={`Book — ${doctorName}`}
    >
      <form action={action} onSubmit={onSubmit} noValidate className="grid gap-4">
        <input type="hidden" name="countryCode" value={countryCode} />
        <input type="hidden" name="doctorId" value={doctorId} />
        <input type="hidden" name="timeSlotId" value={slot.id} />
        <input type="hidden" name="phone" value={combinedPhone} />
        <input type="hidden" name="durationMinutes" value={duration} />

        {/* Locked slot summary */}
        <div
          className="rounded-[var(--radius-card-sm)] border px-3 py-2.5 text-sm"
          style={{ borderColor: "var(--color-border)", background: "var(--color-background-subtle, transparent)" }}
        >
          <span className="font-semibold text-[var(--color-text-primary)]">
            {formatAppDate(slot.startAt, clinicTz)} · {formatAppTime(slot.startAt, clinicTz)}
          </span>
          <span className="ml-1 text-portal-meta text-[var(--color-text-muted)]">(clinic time)</span>
        </div>

        {noServices ? (
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-sm">
            This doctor has no bookable services in {countryCode.toUpperCase()}. Assign a service
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
              <select
                aria-label="Country code"
                className="gh-select max-w-[140px]"
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
              >
                {DIAL_OPTIONS.map((o) => (
                  <option key={o.key} value={o.dial}>
                    {o.label} (+{o.dial})
                  </option>
                ))}
              </select>
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

        {/* Appointment */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Service *</span>
            <select
              name="serviceId"
              className="gh-select"
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                const svc = services.find((s) => s.id === e.target.value);
                setDuration(snapDuration(svc?.durationMinutes));
              }}
              disabled={noServices}
              aria-invalid={Boolean(errors.serviceId)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.serviceId ? <FieldError msg={errors.serviceId} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Duration *</span>
            <select
              className="gh-select"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
            <span className="text-portal-meta text-[var(--color-text-muted)]">
              Blocks {duration} min ({Math.ceil(duration / 15)} × 15-min slot
              {Math.ceil(duration / 15) === 1 ? "" : "s"}).
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Mode *</span>
            <select
              name="consultationMode"
              className="gh-select"
              value={consultationMode}
              onChange={(e) => setConsultationMode(e.target.value as "ONLINE" | "IN_PERSON")}
            >
              <option value="ONLINE">Online</option>
              <option value="IN_PERSON">In-person</option>
            </select>
          </label>
        </div>

        {consultationMode === "IN_PERSON" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Clinic</span>
              <select
                name="clinicId"
                className="gh-select"
                value={clinicId}
                onChange={(e) => {
                  setClinicId(e.target.value);
                  if (e.target.value) setLocationAddress("");
                }}
              >
                <option value="">Select clinic…</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? ` · ${c.city}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">…or location address</span>
              <input
                type="text"
                name="locationAddress"
                className="gh-input"
                maxLength={300}
                value={locationAddress}
                onChange={(e) => {
                  setLocationAddress(e.target.value);
                  if (e.target.value) setClinicId("");
                }}
              />
            </label>
            {errors.venue ? (
              <div className="sm:col-span-2">
                <FieldError msg={errors.venue} />
              </div>
            ) : null}
          </div>
        ) : null}

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

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="gh-btn gh-btn-ghost">
            Cancel
          </button>
          <SubmitButton disabled={noServices} />
        </div>
      </form>
    </PortalDialog>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  return (
    <button type="submit" className="gh-btn gh-btn-primary" disabled={disabled}>
      Confirm booking
    </button>
  );
}

/** Snap a service's duration to the nearest bookable option (round up to a
 *  15-min multiple, clamp to the option range). Defaults to 15. */
function snapDuration(minutes: number | null | undefined): number {
  if (!minutes || minutes <= 0) return 15;
  const rounded = Math.ceil(minutes / 15) * 15;
  const max = DURATION_OPTIONS[DURATION_OPTIONS.length - 1];
  return Math.min(Math.max(rounded, DURATION_OPTIONS[0]), max);
}

function FieldError({ msg }: { msg: string }) {
  return <span className="text-portal-meta font-semibold text-[var(--color-status-error)]">{msg}</span>;
}
