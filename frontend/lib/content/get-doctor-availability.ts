import "server-only";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Server-side fetcher for the public doctor availability endpoint.
 * Used by the booking page when the visitor arrives with `?doctor=<slug>`
 * so we can render the slot picker before they fill the form.
 */

export type SlotPricingType = "STANDARD" | "PEAK" | "OFF_PEAK";

export type PublicSlot = {
  id: string;
  startAt: string;
  endAt: string;
  /** Price (in cents) this slot will be charged. Resolved server-side from
   *  peak-hour pricing config + the slot's clinic-local start time. Optional
   *  for backward compatibility with the doctor-scoped endpoint, which is not
   *  service-aware and omits pricing. */
  priceCents?: number;
  pricingType?: SlotPricingType;
  currencyCode?: string;
};

export type DoctorAvailabilityResult = {
  slots: PublicSlot[];
  /** Clinic timezone the slots are expressed in; the patient sees clinic-local
   *  times. Falls back to "UTC" when the backend omits it. */
  clinicTimezone: string;
};

export async function getDoctorAvailability(
  countryCode: string,
  doctorSlug: string,
  days = 14,
): Promise<DoctorAvailabilityResult> {
  const empty: DoctorAvailabilityResult = { slots: [], clinicTimezone: "UTC" };
  const backend = getBackendOrigin();
  if (!backend) return empty;
  const url = `${backend}/api/doctors/${encodeURIComponent(countryCode)}/${encodeURIComponent(
    doctorSlug,
  )}/availability?days=${days}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return empty;
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { slots?: PublicSlot[]; clinicTimezone?: string };
    };
    if (!json.ok || !json.data?.slots) return empty;
    return {
      slots: json.data.slots,
      clinicTimezone: json.data.clinicTimezone ?? "UTC",
    };
  } catch {
    return empty;
  }
}

/**
 * Service-scoped availability — Phase 3 of the booking plan.
 *
 * Calls the new `/api/services/.../availability` endpoint so slot
 * duration tracks the selected service (not the doctor's recurring
 * window default). Used by the consult slot picker for both the
 * service-first and doctor-first patient entry paths.
 *
 * Returns `[]` when:
 *   - the backend is unreachable
 *   - the doctor isn't assigned to the service (404)
 *   - the service or doctor is inactive (404)
 *   - the country has no listing for either (404)
 *
 * The empty-array fallback is the same shape the existing
 * `getDoctorAvailability` callers expect, so the consult page's
 * "No open slots" banner still kicks in for any of those failure
 * cases.
 */
export async function getServiceDoctorAvailability(
  countryCode: string,
  serviceSlug: string,
  doctorSlug: string,
  days = 14,
): Promise<DoctorAvailabilityResult> {
  const empty: DoctorAvailabilityResult = { slots: [], clinicTimezone: "UTC" };
  const backend = getBackendOrigin();
  if (!backend) return empty;
  const url = `${backend}/api/services/${encodeURIComponent(
    countryCode,
  )}/${encodeURIComponent(serviceSlug)}/doctors/${encodeURIComponent(
    doctorSlug,
  )}/availability?days=${days}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return empty;
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { slots?: PublicSlot[]; clinicTimezone?: string };
    };
    if (!json.ok || !json.data?.slots) return empty;
    return {
      slots: json.data.slots,
      clinicTimezone: json.data.clinicTimezone ?? "UTC",
    };
  } catch {
    return empty;
  }
}

/**
 * Lightweight doctor lookup used alongside the slot list so the booking
 * page can render "Booking with Dr X" without re-deriving the data. We
 * already have a full doctor profile fetcher elsewhere; this one returns
 * just the bits the booking sidebar needs.
 */
export type BookingDoctorSummary = {
  slug: string;
  fullName: string;
  title: string;
  countryCode: string;
};

export async function getBookingDoctorSummary(
  countryCode: string,
  doctorSlug: string,
): Promise<BookingDoctorSummary | null> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  const url = `${backend}/api/countries/${encodeURIComponent(
    countryCode,
  )}/doctors/${encodeURIComponent(doctorSlug)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok?: boolean;
      data?: {
        doctor?: {
          slug?: string;
          fullName?: string;
          title?: string;
          countryCode?: string;
        };
      };
    };
    const d = json.data?.doctor;
    if (!json.ok || !d?.slug || !d.fullName) return null;
    return {
      slug: d.slug,
      fullName: d.fullName,
      title: d.title ?? "",
      countryCode: d.countryCode ?? countryCode,
    };
  } catch {
    return null;
  }
}
