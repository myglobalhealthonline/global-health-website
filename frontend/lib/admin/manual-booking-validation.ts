/**
 * Pure, framework-free validation for the admin manual-booking form.
 *
 * The client form calls `validateManualBooking()` to block submit + show
 * per-field errors (UX). The server action re-runs the SAME checks as a hard
 * guard so a bypassed/disabled client can't create a booking, a payment link,
 * or fire any email/WhatsApp. Keeping it pure makes it unit-testable and
 * shareable between the two call sites.
 */
export type ManualBookingValues = {
  fullName: string;
  email: string;
  /** Combined "+<dial> <national>" string built by the form. */
  phone: string;
  serviceId: string;
  doctorId: string;
  timeSlotId: string;
  consultationMode: string;
  clinicId?: string;
  locationAddress?: string;
};

export type ManualBookingErrorKey =
  | "fullName"
  | "email"
  | "phone"
  | "serviceId"
  | "doctorId"
  | "timeSlotId"
  | "consultationMode"
  | "venue";

export type ManualBookingErrors = Partial<Record<ManualBookingErrorKey, string>>;

const EMAIL_RE = /^\S+@\S+\.\S+$/;
// "+<code>[ -]<national>", ≥6 national digits. Mirrors the backend
// manual phone schema so client + server agree on what's valid.
const PHONE_RE = /^\+[1-9]\d{0,3}[\s-]?\d{6,14}$/;

// combinePhone moved to the shared phone module (reused by every phone field).
export { combinePhone } from "@/lib/phone/dial-codes";

export function validateManualBooking(
  values: ManualBookingValues,
): ManualBookingErrors {
  const errors: ManualBookingErrors = {};

  if (values.fullName.trim().length < 2) {
    errors.fullName = "Enter the patient's full name (min 2 characters).";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const phone = values.phone.trim();
  if (!phone) {
    errors.phone = "Phone number is required.";
  } else if (!phone.startsWith("+")) {
    errors.phone = "Select a country code for the phone number.";
  } else if (!PHONE_RE.test(phone)) {
    errors.phone = "Enter a valid phone number, e.g. +353 871234567.";
  }

  if (!values.serviceId) errors.serviceId = "Choose a service.";
  if (!values.doctorId) errors.doctorId = "Choose a doctor.";
  if (!values.timeSlotId) errors.timeSlotId = "Pick an available time slot.";

  if (
    values.consultationMode !== "ONLINE" &&
    values.consultationMode !== "IN_PERSON"
  ) {
    errors.consultationMode = "Choose a consultation mode.";
  }

  if (values.consultationMode === "IN_PERSON") {
    const hasClinic = Boolean(values.clinicId?.trim());
    const hasAddress = Boolean(values.locationAddress?.trim());
    if (!hasClinic && !hasAddress) {
      errors.venue = "In-person bookings need a clinic or a location address.";
    } else if (hasClinic && hasAddress) {
      errors.venue = "Provide a clinic OR a location address, not both.";
    }
  }

  return errors;
}

export function hasErrors(errors: ManualBookingErrors): boolean {
  return Object.keys(errors).length > 0;
}
