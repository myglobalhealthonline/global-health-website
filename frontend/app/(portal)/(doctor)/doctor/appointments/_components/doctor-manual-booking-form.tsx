"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Check, Copy, Loader2 } from "lucide-react";
import { fetchAvailabilityRangeClient } from "@/lib/api/doctor-availability-client";
import type { DoctorTimeSlotView } from "@/lib/api/doctor-availability-types";
import type {
  DoctorBookableService,
  DoctorBookingClinic,
} from "@/lib/api/doctor-api";
import { CountryDialSelect } from "@/components/forms/country-dial-select";
import { combinePhone, dialCodeForCountry } from "@/lib/phone/dial-codes";
import { formatAppTime } from "@/lib/format-datetime";
import { BRAZIL_STATES } from "@/lib/content/booking-address-copy";

/**
 * Doctor-side walk-in / phone-in booking form.
 *
 * Mirrors the admin manual-booking form with the doctor's narrower
 * authority: no doctor picker (it is always this doctor), no country picker
 * (the service carries its market), no insurance, and — deliberately — no
 * price anywhere. The backend resolves the published catalogue price for the
 * chosen service + slot and mints the Stripe link at that amount; the doctor
 * never sees or influences the number.
 *
 * The slot list is the doctor's own calendar (OPEN + future only). The
 * backend claims it atomically, so a slot taken while the form was open
 * comes back as a 409 and the picker reloads.
 */

/** How far ahead to offer slots. */
const LOOKAHEAD_DAYS = 60;

export type DoctorManualBookingCopy = {
  sectionPatient: string;
  patientHint: string;
  sectionAppointment: string;
  fullName: string;
  email: string;
  phone: string;
  phoneHint: string;
  dateOfBirth: string;
  nationalId: string;
  taxId: string;
  passport: string;
  utente: string;
  addressLine1: string;
  city: string;
  /** Brazil only — the UF picker's label + its empty option. */
  addressState: string;
  addressStatePlaceholder: string;
  addressPostalCode: string;
  /** Brazil's name for the postal code. */
  addressCep: string;
  addressCountry: string;
  service: string;
  servicePlaceholder: string;
  mode: string;
  modeOnline: string;
  modeInPerson: string;
  clinic: string;
  clinicNone: string;
  clinicHint: string;
  locationAddress: string;
  notes: string;
  notesPlaceholder: string;
  timeSlot: string;
  clinicTime: string;
  loadingSlots: string;
  noOpenSlots: string;
  dayLabel: string;
  timeLabel: string;
  billingNote: string;
  errorsTitle: string;
  errFullName: string;
  errEmail: string;
  errEmailInvalid: string;
  errPhone: string;
  errPhoneInvalid: string;
  errService: string;
  errSlot: string;
  errVenue: string;
  errVenueBoth: string;
  couldNotCreate: string;
  cancel: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successDesc: string;
  successAccountCreated: string;
  successEmailQueued: string;
  successEmailNotQueued: string;
  paymentLinkLabel: string;
  paymentLinkHint: string;
  paymentLinkMissing: string;
  portalInviteLabel: string;
  copy: string;
  copied: string;
  openAppointment: string;
  bookAnother: string;
};

type FieldErrors = {
  fullName?: string;
  email?: string;
  phone?: string;
  serviceId?: string;
  timeSlotId?: string;
  venue?: string;
};

type CreatedBooking = {
  appointmentId: string;
  paymentUrl: string | null;
  setPasswordUrl: string;
  patientAccountCreated: boolean;
  emailQueued: boolean;
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;
// Mirrors the backend phone schema so client + server agree on what's valid.
const PHONE_RE = /^\+[1-9]\d{0,3}[\s-]?\d{6,14}$/;

export function DoctorManualBookingForm({
  services,
  clinics,
  copy,
}: {
  services: DoctorBookableService[];
  clinics: DoctorBookingClinic[];
  copy: DoctorManualBookingCopy;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dialCode, setDialCode] = useState(
    dialCodeForCountry(services[0]?.countryCode ?? ""),
  );
  const [phoneNational, setPhoneNational] = useState("");
  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [taxIdNumber, setTaxIdNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [utenteNumber, setUtenteNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressCountryCode, setAddressCountryCode] = useState("");

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [consultationMode, setConsultationMode] = useState<"ONLINE" | "IN_PERSON">(
    "ONLINE",
  );
  const [clinicId, setClinicId] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [slots, setSlots] = useState<DoctorTimeSlotView[]>([]);
  const [clinicTimezone, setClinicTimezone] = useState<string | undefined>();
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<CreatedBooking | null>(null);
  const [copiedField, setCopiedField] = useState<"payment" | "invite" | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );
  // Venue picklist follows the service's market — an in-person consult can
  // only happen at a clinic in the country the service is sold in.
  const countryClinics = useMemo(
    () =>
      selectedService
        ? clinics.filter((c) => c.countryCode === selectedService.countryCode)
        : [],
    [clinics, selectedService],
  );
  // Portugal's Número de Utente — collected only when booking a PT service.
  const collectUtente = selectedService?.countryCode.toLowerCase() === "pt";
  // Brazil is the one market that addresses by UF + CEP — same split the
  // public BR booking form uses. Keyed off the picked service's country,
  // exactly like `collectUtente` above.
  const isBrazil = selectedService?.countryCode.toLowerCase() === "br";

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    const from = new Date();
    const to = new Date(from.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
    const res = await fetchAvailabilityRangeClient(from.toISOString(), to.toISOString());
    if (!res.ok) {
      setSlots([]);
      setSubmitError(res.message);
    } else {
      const now = Date.now();
      // Only genuinely bookable inventory: OPEN and still in the future.
      setSlots(
        res.data.slots.filter(
          (s) => s.status === "OPEN" && new Date(s.startAt).getTime() > now,
        ),
      );
      setClinicTimezone(res.data.clinicTimezone);
    }
    setLoadingSlots(false);
  }, []);

  // Fetch inside an async closure so the spinner flag is set after the effect
  // body returns — a synchronous setState here would cascade a render.
  useEffect(() => {
    void (async () => {
      await loadSlots();
    })();
  }, [loadSlots]);

  // Group by clinic-local day so the doctor reads their own working hours,
  // not the browser's timezone.
  const tz = clinicTimezone;
  const byDay = useMemo(() => {
    const map = new Map<string, DoctorTimeSlotView[]>();
    for (const s of slots) {
      const label = new Date(s.startAt).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: tz,
      });
      const bucket = map.get(label);
      if (bucket) bucket.push(s);
      else map.set(label, [s]);
    }
    return map;
  }, [slots, tz]);

  const days = useMemo(() => Array.from(byDay.keys()), [byDay]);
  // Derived, not stored: `selectedDay` holds an explicit choice and we fall
  // back to the first day with availability until the doctor makes one.
  const activeDay = selectedDay && days.includes(selectedDay) ? selectedDay : (days[0] ?? "");
  const daySlots = activeDay ? (byDay.get(activeDay) ?? []) : [];

  function handleServiceChange(value: string) {
    setServiceId(value);
    // Clinics are country-scoped — a venue from the previous service's market
    // can't carry over.
    setClinicId("");
    const next = services.find((s) => s.id === value);
    if (next && !phoneNational) setDialCode(dialCodeForCountry(next.countryCode));
  }

  const combinedPhone = combinePhone(dialCode, phoneNational);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (fullName.trim().length < 2) next.fullName = copy.errFullName;
    const mail = email.trim();
    if (!mail) next.email = copy.errEmail;
    else if (!EMAIL_RE.test(mail)) next.email = copy.errEmailInvalid;
    const phone = combinedPhone.trim();
    if (!phoneNational.trim()) next.phone = copy.errPhone;
    else if (!PHONE_RE.test(phone)) next.phone = copy.errPhoneInvalid;
    if (!serviceId) next.serviceId = copy.errService;
    if (!selectedSlotId) next.timeSlotId = copy.errSlot;
    if (consultationMode === "IN_PERSON") {
      const hasClinic = Boolean(clinicId.trim());
      const hasAddress = Boolean(locationAddress.trim());
      if (!hasClinic && !hasAddress) next.venue = copy.errVenue;
      else if (hasClinic && hasAddress) next.venue = copy.errVenueBoth;
    }
    return next;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() =>
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/doctor/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patient: {
            email: email.trim(),
            fullName: fullName.trim(),
            phone: combinedPhone,
            dateOfBirth: dateOfBirth.trim() || null,
            nationalIdNumber: nationalIdNumber.trim() || null,
            taxIdNumber: taxIdNumber.trim() || null,
            passportNumber: passportNumber.trim() || null,
            // Only sent for markets that collect it, so a stale field can't
            // store an utente number outside Portugal.
            utenteNumber: collectUtente ? utenteNumber.trim() || null : null,
            addressLine1: addressLine1.trim() || null,
            addressCity: addressCity.trim() || null,
            // Same gate as `utenteNumber` — never sent outside Brazil.
            addressState: isBrazil ? addressState.trim() || null : null,
            addressPostalCode: addressPostalCode.trim() || null,
            addressCountryCode: addressCountryCode.trim() || null,
          },
          serviceId,
          timeSlotId: selectedSlotId,
          consultationMode,
          clinicId: consultationMode === "IN_PERSON" ? clinicId || null : null,
          locationAddress:
            consultationMode === "IN_PERSON" ? locationAddress.trim() || null : null,
          notes: notes.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        data?: {
          appointment?: { id: string };
          paymentUrl?: string | null;
          setPasswordUrl?: string;
          patientAccountCreated?: boolean;
          emailQueued?: boolean;
        };
      };
      if (!res.ok || !json.ok || !json.data?.appointment) {
        setSubmitError(json.message ?? copy.couldNotCreate);
        // 409 = the slot went while the form was open. Reload the calendar so
        // the doctor picks from what's actually left.
        if (res.status === 409) {
          setSelectedSlotId("");
          setSelectedDay("");
          void loadSlots();
        }
        return;
      }
      setCreated({
        appointmentId: json.data.appointment.id,
        paymentUrl: json.data.paymentUrl ?? null,
        setPasswordUrl: json.data.setPasswordUrl ?? "",
        patientAccountCreated: Boolean(json.data.patientAccountCreated),
        emailQueued: Boolean(json.data.emailQueued),
      });
    } catch {
      setSubmitError(copy.couldNotCreate);
    } finally {
      setPending(false);
    }
  }

  function resetForm() {
    setCreated(null);
    setFullName("");
    setEmail("");
    setDateOfBirth("");
    setPhoneNational("");
    setNationalIdNumber("");
    setTaxIdNumber("");
    setPassportNumber("");
    setUtenteNumber("");
    setAddressLine1("");
    setAddressCity("");
    setAddressCountryCode("");
    setNotes("");
    setClinicId("");
    setLocationAddress("");
    setSelectedSlotId("");
    setSelectedDay("");
    setErrors({});
    setSubmitError(null);
    void loadSlots();
  }

  async function copyToClipboard(value: string, field: "payment" | "invite") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard denied (insecure context / permission) — the link stays
      // selectable on screen, so there's nothing to recover from.
    }
  }

  if (created) {
    return (
      <div className="gh-card p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--portal-text)]">
          <Check className="size-4 text-[var(--color-status-success-text,#15803d)]" aria-hidden />
          {copy.successTitle}
        </h2>
        <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">
          {copy.successDesc}
        </p>
        <ul className="mt-3 grid gap-1 text-portal-label text-[var(--portal-muted)]">
          <li>
            {created.emailQueued ? copy.successEmailQueued : copy.successEmailNotQueued}
          </li>
          {created.patientAccountCreated ? <li>{copy.successAccountCreated}</li> : null}
        </ul>

        <div className="mt-4 grid gap-3">
          <LinkRow
            label={copy.paymentLinkLabel}
            hint={copy.paymentLinkHint}
            value={created.paymentUrl}
            missing={copy.paymentLinkMissing}
            copied={copiedField === "payment"}
            copyLabel={copy.copy}
            copiedLabel={copy.copied}
            onCopy={(v) => void copyToClipboard(v, "payment")}
          />
          <LinkRow
            label={copy.portalInviteLabel}
            value={created.setPasswordUrl || null}
            missing={copy.paymentLinkMissing}
            copied={copiedField === "invite"}
            copyLabel={copy.copy}
            copiedLabel={copy.copied}
            onCopy={(v) => void copyToClipboard(v, "invite")}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/doctor/appointments/${created.appointmentId}`}
            className="gh-btn gh-btn-primary text-sm"
          >
            {copy.openAppointment}
          </Link>
          <button type="button" onClick={resetForm} className="gh-btn gh-btn-soft text-sm">
            <CalendarPlus className="size-3.5" aria-hidden /> {copy.bookAnother}
          </button>
        </div>
      </div>
    );
  }

  const errorList = Object.values(errors).filter(Boolean) as string[];

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="gh-card p-5">
        <h2 className="text-base font-bold text-[var(--portal-text)]">
          {copy.sectionPatient}
        </h2>
        <p className="mt-1 text-portal-label text-[var(--portal-muted)]">
          {copy.patientHint}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{copy.fullName} *</span>
            <input
              type="text"
              className="gh-input"
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName ? <FieldError msg={errors.fullName} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{copy.email} *</span>
            <input
              type="email"
              className="gh-input"
              maxLength={254}
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <FieldError msg={errors.email} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{copy.phone} *</span>
            <div className="flex gap-2">
              <CountryDialSelect
                ariaLabel={copy.phone}
                className="gh-select max-w-[150px]"
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
            <span className="text-portal-label text-[var(--portal-muted)]">
              {copy.phoneHint.replace("{phone}", combinedPhone || `+${dialCode} …`)}
            </span>
            {errors.phone ? <FieldError msg={errors.phone} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{copy.dateOfBirth}</span>
            <input
              type="date"
              className="gh-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </label>

          <TextField
            label={copy.nationalId}
            maxLength={64}
            value={nationalIdNumber}
            onChange={setNationalIdNumber}
          />
          <TextField
            label={copy.taxId}
            maxLength={64}
            value={taxIdNumber}
            onChange={setTaxIdNumber}
          />
          <TextField
            label={copy.passport}
            maxLength={64}
            value={passportNumber}
            onChange={setPassportNumber}
          />
          {collectUtente ? (
            <TextField
              label={copy.utente}
              maxLength={64}
              value={utenteNumber}
              onChange={setUtenteNumber}
            />
          ) : null}
          <TextField
            label={copy.addressLine1}
            maxLength={200}
            value={addressLine1}
            onChange={setAddressLine1}
          />
          <TextField
            label={copy.city}
            maxLength={100}
            value={addressCity}
            onChange={setAddressCity}
          />
          {/* Estado (UF) — Brazil only; no other market has an equivalent. */}
          {isBrazil ? (
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">{copy.addressState}</span>
              <select
                className="gh-select"
                value={addressState}
                onChange={(e) => setAddressState(e.target.value)}
              >
                <option value="">{copy.addressStatePlaceholder}</option>
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <TextField
            label={isBrazil ? copy.addressCep : copy.addressPostalCode}
            maxLength={32}
            value={addressPostalCode}
            onChange={setAddressPostalCode}
          />
          <TextField
            label={copy.addressCountry}
            maxLength={8}
            placeholder="ie / pt / es…"
            value={addressCountryCode}
            onChange={setAddressCountryCode}
          />
        </div>
      </div>

      <div className="gh-card p-5">
        <h2 className="text-base font-bold text-[var(--portal-text)]">
          {copy.sectionAppointment}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{copy.service} *</span>
            <select
              className="gh-select"
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              aria-invalid={Boolean(errors.serviceId)}
            >
              <option value="" disabled>
                {copy.servicePlaceholder}
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.countryName}
                </option>
              ))}
            </select>
            {errors.serviceId ? <FieldError msg={errors.serviceId} /> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{copy.mode} *</span>
            <select
              className="gh-select"
              value={consultationMode}
              onChange={(e) =>
                setConsultationMode(e.target.value as "ONLINE" | "IN_PERSON")
              }
            >
              <option value="ONLINE">{copy.modeOnline}</option>
              <option value="IN_PERSON">{copy.modeInPerson}</option>
            </select>
          </label>

          {consultationMode === "IN_PERSON" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">{copy.clinic}</span>
                <select
                  className="gh-select"
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value)}
                >
                  <option value="">{copy.clinicNone}</option>
                  {countryClinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.city ? `, ${c.city}` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-portal-label text-[var(--portal-muted)]">
                  {copy.clinicHint}
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">{copy.locationAddress}</span>
                <input
                  type="text"
                  className="gh-input"
                  maxLength={500}
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                />
              </label>
            </>
          ) : null}

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="gh-field-label">{copy.notes}</span>
            <textarea
              className="gh-input min-h-[4.5rem] resize-y"
              maxLength={2000}
              placeholder={copy.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        {errors.venue ? (
          <div className="mt-3">
            <FieldError msg={errors.venue} />
          </div>
        ) : null}

        <div className="mt-6 border-t border-[var(--portal-line)] pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="gh-field-label">{copy.timeSlot} *</span>
            {tz ? (
              <span className="text-portal-label text-[var(--portal-muted)]">
                {copy.clinicTime}
              </span>
            ) : null}
          </div>

          {loadingSlots ? (
            <p className="mt-2 inline-flex items-center gap-2 text-portal-compact text-[var(--portal-muted)]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> {copy.loadingSlots}
            </p>
          ) : days.length === 0 ? (
            <p className="mt-2 text-portal-compact text-[var(--portal-muted)]">
              {copy.noOpenSlots}
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              <label className="flex max-w-xs flex-col gap-1.5">
                <span className="gh-field-label">{copy.dayLabel}</span>
                <select
                  className="gh-select"
                  value={activeDay}
                  onChange={(e) => {
                    setSelectedDay(e.target.value);
                    setSelectedSlotId("");
                  }}
                >
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="gh-field-label">{copy.timeLabel}</span>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-6">
                  {daySlots.map((s) => {
                    const isSelected = s.id === selectedSlotId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedSlotId(s.id)}
                        className={
                          isSelected
                            ? "gh-btn gh-btn-primary justify-center px-2 py-1.5 text-portal-label"
                            : "gh-btn gh-btn-soft justify-center px-2 py-1.5 text-portal-label"
                        }
                      >
                        {formatAppTime(s.startAt, tz)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {errors.timeSlotId ? (
            <div className="mt-2">
              <FieldError msg={errors.timeSlotId} />
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-portal-label text-[var(--portal-muted)]">
          {copy.billingNote}
        </p>
      </div>

      {errorList.length > 0 ? (
        <div
          ref={summaryRef}
          role="alert"
          className="gh-status-warning rounded-md border px-4 py-3 text-sm"
        >
          <p className="font-semibold">{copy.errorsTitle}</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {submitError ? (
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--portal-line)] pt-5">
        <Link href="/doctor/appointments" className="gh-btn gh-btn-soft text-sm">
          {copy.cancel}
        </Link>
        <button
          type="submit"
          className="gh-btn gh-btn-primary text-sm"
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? copy.submitting : copy.submit}
        </button>
      </div>
    </form>
  );
}

function LinkRow({
  label,
  hint,
  value,
  missing,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
}: {
  label: string;
  hint?: string;
  value: string | null;
  missing: string;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
      <p className="gh-field-label">{label}</p>
      {value ? (
        <>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-[var(--portal-surface,transparent)] text-portal-label text-[var(--portal-text)]">
              {value}
            </code>
            <button
              type="button"
              onClick={() => onCopy(value)}
              className="gh-btn gh-btn-soft text-xs"
            >
              {copied ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
              {copied ? copiedLabel : copyLabel}
            </button>
          </div>
          {hint ? (
            <p className="mt-1.5 text-portal-label text-[var(--portal-muted)]">{hint}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-1.5 text-portal-label text-[var(--portal-muted)]">{missing}</p>
      )}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <span className="text-portal-label font-medium text-[var(--color-status-danger,#dc2626)]">
      {msg}
    </span>
  );
}

function TextField({
  label,
  maxLength,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  maxLength?: number;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="gh-field-label">{label}</span>
      <input
        type="text"
        className="gh-input"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
