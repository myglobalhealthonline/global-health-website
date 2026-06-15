"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AdminCard } from "../../_components/atoms";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { formatPriceRounded } from "@/lib/format-currency";
import { DIAL_OPTIONS } from "@/lib/phone/dial-codes";
import {
  combinePhone,
  hasErrors,
  validateManualBooking,
  type ManualBookingErrors,
} from "@/lib/admin/manual-booking-validation";

type ServiceOption = {
  id: string;
  slug: string;
  name: string;
  basePriceCents: number | null;
  currencyCode: string | null;
};

type DoctorOption = {
  id: string;
  slug: string;
  fullName: string;
  title: string | null;
  serviceIds: string[];
};

type ClinicOption = { id: string; name: string; city: string | null };

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  priceCents?: number;
  pricingType?: "STANDARD" | "PEAK" | "OFF_PEAK";
  currencyCode?: string;
};

type Props = {
  countryCode: string;
  countryName: string;
  services: ServiceOption[];
  doctors: DoctorOption[];
  clinics: ClinicOption[];
  defaultDialCode: string;
  /** Server action that creates the booking. Runs only after the native
   *  submit proceeds — i.e. after client validation passes. */
  action: (formData: FormData) => void | Promise<void>;
};

/**
 * Admin manual-booking form (walk-in / phone-in). Client component so we can:
 *   - block submit + show per-field errors when anything required is missing
 *     or invalid (no incomplete booking ever reaches the server action),
 *   - filter doctors to the chosen service, then load that doctor's REAL open
 *     slots and force picking one (the appointment time is inventory, not
 *     free text),
 *   - capture the phone with a country-code picker (defaulted from the booking
 *     country, overridable) and submit it as "+<code> <number>".
 *
 * The server action re-validates everything — this is UX, not the only guard.
 */
export function ManualBookingForm({
  countryCode,
  countryName,
  services,
  doctors,
  clinics,
  defaultDialCode,
  action,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState(defaultDialCode);
  const [phoneNational, setPhoneNational] = useState("");

  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [consultationMode, setConsultationMode] = useState<"ONLINE" | "IN_PERSON">(
    "ONLINE",
  );
  const [clinicId, setClinicId] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [clinicTimezone, setClinicTimezone] = useState<string>("Europe/Dublin");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");

  const [errors, setErrors] = useState<ManualBookingErrors>({});
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );
  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId) ?? null,
    [doctors, doctorId],
  );

  // Doctors bookable for the chosen service (mirrors the public consult
  // filter). Before a service is picked, show none — the admin picks the
  // service first.
  const filteredDoctors = useMemo(() => {
    if (!serviceId) return [];
    return doctors.filter((d) => d.serviceIds.includes(serviceId));
  }, [doctors, serviceId]);

  // Reset cascades happen in the select handlers below (not effects) so we
  // don't trigger cascading setState-in-effect renders.
  function handleServiceChange(value: string) {
    setServiceId(value);
    setDoctorId((cur) =>
      cur && doctors.find((d) => d.id === cur)?.serviceIds.includes(value) ? cur : "",
    );
    setSelectedSlotId("");
    setSelectedDay(null);
    setSlots([]);
  }

  function handleDoctorChange(value: string) {
    setDoctorId(value);
    setSelectedSlotId("");
    setSelectedDay(null);
    setSlots([]);
  }

  // Load the doctor's open slots for the chosen service. Reuses the public
  // same-origin availability endpoint (peak pricing already attached).
  useEffect(() => {
    if (!selectedService || !selectedDoctor) return;
    const controller = new AbortController();
    const url =
      `/api/public/booking-availability?country=${encodeURIComponent(countryCode)}` +
      `&service=${encodeURIComponent(selectedService.slug)}` +
      `&doctor=${encodeURIComponent(selectedDoctor.slug)}&days=21`;
    void (async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const res = await fetch(url, { signal: controller.signal });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { slots?: Slot[]; clinicTimezone?: string };
          message?: string;
        };
        if (controller.signal.aborted) return;
        if (!res.ok || !json.ok || !json.data) {
          setSlots([]);
          setSlotsError(json.message ?? "Could not load this doctor's availability.");
          return;
        }
        const list = json.data.slots ?? [];
        setSlots(list);
        setClinicTimezone(json.data.clinicTimezone ?? "Europe/Dublin");
        setSelectedDay(
          list.length ? formatAppDate(list[0]!.startAt, json.data.clinicTimezone) : null,
        );
      } catch {
        if (controller.signal.aborted) return;
        setSlots([]);
        setSlotsError("Could not load this doctor's availability.");
      } finally {
        if (!controller.signal.aborted) setSlotsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedService, selectedDoctor, countryCode]);

  // Group slots by clinic-local day for the date-pills + time-grid picker.
  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const day = formatAppDate(s.startAt, clinicTimezone);
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return map;
  }, [slots, clinicTimezone]);

  const combinedPhone = combinePhone(dialCode, phoneNational);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const result = validateManualBooking({
      fullName,
      email,
      phone: combinedPhone,
      serviceId,
      doctorId,
      timeSlotId: selectedSlotId,
      consultationMode,
      clinicId: consultationMode === "IN_PERSON" ? clinicId : "",
      locationAddress: consultationMode === "IN_PERSON" ? locationAddress : "",
    });
    if (hasErrors(result)) {
      e.preventDefault(); // block — no booking, no account, no email
      setErrors(result);
      // Surface the summary so the admin sees what's missing.
      requestAnimationFrame(() =>
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }
    setErrors({});
    // Validation passed — let the native submit invoke the server action.
  }

  const errorList = Object.values(errors);

  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="countryCode" value={countryCode} />
      {/* Combined phone + the picked slot are derived from React state, so
        * the server action's FormData always carries the canonical values. */}
      <input type="hidden" name="phone" value={combinedPhone} />
      <input type="hidden" name="timeSlotId" value={selectedSlotId} />

      <AdminCard>
        <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Patient</h2>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          Existing accounts with this email are reused; otherwise a new patient User is created with a
          unique temporary password.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Email *</span>
            <input
              type="email"
              name="email"
              className="gh-input"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <FieldError msg={errors.email} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Phone *</span>
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                className="gh-select max-w-[150px]"
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
            <span className="text-[12px] text-[var(--color-text-muted)]">
              Saved as <span className="font-mono">{combinedPhone || `+${dialCode} …`}</span>
            </span>
            {errors.phone ? <FieldError msg={errors.phone} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Date of birth</span>
            <input type="date" name="dateOfBirth" className="gh-input" />
          </label>

          <Field label="National ID number" name="nationalIdNumber" maxLength={64} />
          <Field label="Tax ID (NIF / PPS / CPF)" name="taxIdNumber" maxLength={64} />
          <Field label="Passport number" name="passportNumber" maxLength={64} />
          <Field label="Address line 1" name="addressLine1" maxLength={200} />
          <Field label="City" name="addressCity" maxLength={100} />
          <Field
            label="Address country code"
            name="addressCountryCode"
            maxLength={8}
            placeholder="ie / pt / es…"
          />
        </div>
      </AdminCard>

      <AdminCard>
        <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Appointment</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Service *</span>
            <select
              name="serviceId"
              className="gh-select"
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              aria-invalid={Boolean(errors.serviceId)}
            >
              <option value="" disabled>
                Select…
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.basePriceCents != null && s.currencyCode
                    ? ` — ${(s.basePriceCents / 100).toFixed(2)} ${s.currencyCode}`
                    : ""}
                </option>
              ))}
            </select>
            {services.length === 0 ? (
              <span className="text-[12px] text-[var(--color-text-muted)]">
                No active services for this country.
              </span>
            ) : null}
            {errors.serviceId ? <FieldError msg={errors.serviceId} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Doctor *</span>
            <select
              name="doctorId"
              className="gh-select"
              value={doctorId}
              onChange={(e) => handleDoctorChange(e.target.value)}
              disabled={!serviceId}
              aria-invalid={Boolean(errors.doctorId)}
            >
              <option value="" disabled>
                {serviceId ? "Select…" : "Pick a service first"}
              </option>
              {filteredDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {(d.title ? `${d.title} ` : "") + d.fullName}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-[var(--color-text-muted)]">
              Only doctors assigned to the selected service are listed.
            </span>
            {errors.doctorId ? <FieldError msg={errors.doctorId} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Consultation mode *</span>
            <select
              name="consultationMode"
              className="gh-select"
              value={consultationMode}
              onChange={(e) =>
                setConsultationMode(e.target.value as "ONLINE" | "IN_PERSON")
              }
            >
              <option value="ONLINE">Online (telemedicine)</option>
              <option value="IN_PERSON">In-person</option>
            </select>
          </label>

          {consultationMode === "IN_PERSON" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Clinic (in-person)</span>
                <select
                  name="clinicId"
                  className="gh-select"
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.city ? `, ${c.city}` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[12px] text-[var(--color-text-muted)]">
                  Or use the free-text address. Provide one or the other, not both.
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Location address (in-person, free text)</span>
                <input
                  type="text"
                  name="locationAddress"
                  className="gh-input"
                  maxLength={500}
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                />
              </label>
            </>
          ) : null}

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="gh-field-label">Notes</span>
            <textarea name="notes" className="gh-input" rows={3} maxLength={2000} />
          </label>
        </div>

        {errors.venue ? (
          <div className="mt-3">
            <FieldError msg={errors.venue} />
          </div>
        ) : null}

        {/* Slot picker — date pills + time grid for the doctor's real open
          * inventory. */}
        <div className="mt-6 border-t border-[var(--color-border)] pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="gh-field-label">Time slot *</span>
            {slots.length > 0 ? (
              <span className="text-[12px] text-[var(--color-text-muted)]">
                {countryName} clinic time
              </span>
            ) : null}
          </div>

          {!serviceId || !doctorId ? (
            <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
              Choose a service and doctor to load open slots.
            </p>
          ) : slotsLoading ? (
            <p className="mt-2 inline-flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Loading availability…
            </p>
          ) : slotsError ? (
            <p className="gh-status-warning mt-2 rounded-[var(--radius-card-sm)] border px-3 py-2 text-[13px]">
              {slotsError}
            </p>
          ) : slots.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
              No open slots for this doctor and service in the next 21 days.
            </p>
          ) : (
            <SlotPicker
              grouped={grouped}
              tz={clinicTimezone}
              selectedDay={selectedDay}
              selectedSlotId={selectedSlotId}
              onSelectDay={(day, firstSlotId) => {
                setSelectedDay(day);
                setSelectedSlotId(firstSlotId);
              }}
              onSelectSlot={setSelectedSlotId}
            />
          )}
          {errors.timeSlotId ? (
            <div className="mt-2">
              <FieldError msg={errors.timeSlotId} />
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-[12px] text-[var(--color-text-muted)]">
          The patient&apos;s email will include a Stripe payment link AND a set-password invite — they
          can set their own password or sign in immediately with a unique temporary password.
        </p>
      </AdminCard>

      {errorList.length > 0 ? (
        <div
          ref={summaryRef}
          role="alert"
          className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm"
        >
          <p className="font-semibold">Please fix the following before submitting:</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
        <SubmitButton />
        <Link
          href="/admin/appointments"
          className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="gh-btn gh-btn-primary" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? "Creating…" : "Create booking & email patient"}
    </button>
  );
}

function SlotPicker({
  grouped,
  tz,
  selectedDay,
  selectedSlotId,
  onSelectDay,
  onSelectSlot,
}: {
  grouped: Map<string, Slot[]>;
  tz: string;
  selectedDay: string | null;
  selectedSlotId: string;
  onSelectDay: (day: string, firstSlotId: string) => void;
  onSelectSlot: (slotId: string) => void;
}) {
  const daySlots = selectedDay ? grouped.get(selectedDay) ?? [] : [];
  return (
    <div className="mt-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {Array.from(grouped.entries()).map(([day, list]) => {
          const isActive = selectedDay === day;
          const date = list[0]?.startAt ? new Date(list[0]!.startAt) : null;
          const weekday = date
            ? date.toLocaleDateString(undefined, { weekday: "short", timeZone: tz })
            : "";
          const dayNum = date
            ? date.toLocaleDateString(undefined, { day: "numeric", timeZone: tz })
            : "";
          const month = date
            ? date.toLocaleDateString(undefined, { month: "short", timeZone: tz })
            : "";
          return (
            <button
              key={day}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectDay(day, list[0]?.id ?? "")}
              className={
                isActive
                  ? "flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border-2 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] px-4 py-2.5 text-white min-w-[64px]"
                  : "flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-page)] px-4 py-2.5 text-[var(--color-text-body)] min-w-[64px] hover:border-[var(--color-border-strong)]"
              }
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">
                {weekday}
              </span>
              <span className="text-xl font-bold leading-none [font-variant-numeric:tabular-nums]">
                {dayNum}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] opacity-70">
                {month}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {daySlots.map((s) => {
            const isSelected = selectedSlotId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectSlot(s.id)}
                className={
                  isSelected
                    ? "inline-flex flex-col items-center justify-center rounded-xl border-2 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] px-3 py-2 text-sm font-semibold text-white [font-variant-numeric:tabular-nums]"
                    : "inline-flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] [font-variant-numeric:tabular-nums] hover:border-[var(--color-brand-primary)]"
                }
              >
                <span>{formatAppTime(s.startAt, tz)}</span>
                {typeof s.priceCents === "number" ? (
                  <span
                    className={
                      isSelected
                        ? "mt-0.5 text-xs font-medium text-white/85"
                        : "mt-0.5 text-xs font-medium text-[var(--color-text-muted)]"
                    }
                  >
                    {formatPriceRounded(s.priceCents, s.currencyCode ?? "EUR")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <span className="text-[12px] font-medium text-[var(--color-status-danger,#dc2626)]">{msg}</span>
  );
}

function Field({
  label,
  name,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="gh-field-label">{label}</span>
      <input type="text" name={name} className="gh-input" maxLength={maxLength} placeholder={placeholder} />
    </label>
  );
}
