import "server-only";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Server-side fetcher for the public doctor availability endpoint.
 * Used by the booking page when the visitor arrives with `?doctor=<slug>`
 * so we can render the slot picker before they fill the form.
 */

export type PublicSlot = {
  id: string;
  startAt: string;
  endAt: string;
};

export async function getDoctorAvailability(
  countryCode: string,
  doctorSlug: string,
  days = 14,
): Promise<PublicSlot[]> {
  const backend = getBackendOrigin();
  if (!backend) return [];
  const url = `${backend}/api/doctors/${encodeURIComponent(countryCode)}/${encodeURIComponent(
    doctorSlug,
  )}/availability?days=${days}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { slots?: PublicSlot[] };
    };
    if (!json.ok || !json.data?.slots) return [];
    return json.data.slots;
  } catch {
    return [];
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
