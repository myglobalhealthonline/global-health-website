/**
 * Shared calendar model used by the patient, doctor, and admin calendar
 * surfaces. A `CalendarItem` is the unified shape both a scheduled
 * consultation and a concrete availability slot map onto, so one set of
 * grid/agenda/dialog components renders all three portals.
 */

export type CalendarItemKind = "consultation" | "slot";

export type CalendarItem = {
  id: string;
  kind: CalendarItemKind;
  /** ISO UTC instant. */
  startAt: string;
  /** ISO UTC instant; null when unknown (consultations carry no end). */
  endAt: string | null;
  /** Slot status (OPEN/HELD/BOOKED/BLOCKED) or appointment status. */
  status: string;
  /** Primary label rendered in the agenda row. */
  title: string;
  meta?: {
    doctorId?: string | null;
    doctorName?: string | null;
    patientName?: string | null;
    consultationType?: string | null;
    meetingUrl?: string | null;
    countryCode?: string | null;
    blockReason?: string | null;
    /** IANA tz the patient booked in — lets the dialog show their local time. */
    patientTimezone?: string | null;
  };
};
