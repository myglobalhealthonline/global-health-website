import "server-only";
import { serverReadAuthHeaders } from "@/lib/api/client";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/**
 * Aggregated availability for a service across all its assigned doctors —
 * backs the service-first booking flow's TIME step (service → time → doctor).
 * Returns the de-duplicated open times plus which doctors (+ their concrete
 * slot) can take each time. Degrades to an empty shape on any failure.
 */

export type ServiceAggSlot = {
  startAt: string;
  endAt: string;
  priceCents: number;
  pricingType: "STANDARD" | "PEAK" | "OFF_PEAK";
  currencyCode: string;
};

export type ServiceAggDoctorRef = {
  doctorId: string;
  doctorSlug: string;
  slotId: string;
};

export type ServiceAggregatedAvailability = {
  found: boolean;
  clinicTimezone: string;
  slots: ServiceAggSlot[];
  doctorsByStart: Record<string, ServiceAggDoctorRef[]>;
};

export async function getServiceAggregatedAvailability(
  countryCode: string,
  serviceSlug: string,
  days = 14,
  /** Restrict to this insurer's in-network doctors for the service. */
  insuranceCompanyId?: string | null,
): Promise<ServiceAggregatedAvailability> {
  const empty: ServiceAggregatedAvailability = {
    found: false,
    clinicTimezone: "UTC",
    slots: [],
    doctorsByStart: {},
  };
  const backend = getBackendOrigin();
  if (!backend) return empty;
  const insuranceParam = insuranceCompanyId
    ? `&insurance=${encodeURIComponent(insuranceCompanyId)}`
    : "";
  const url = `${backend}/api/services/${encodeURIComponent(countryCode)}/${encodeURIComponent(
    serviceSlug,
  )}/aggregated-availability?days=${days}${insuranceParam}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: serverReadAuthHeaders(url.slice(backend.length), "GET"),
    });
    if (!res.ok) return empty;
    const json = (await res.json()) as { ok?: boolean; data?: ServiceAggregatedAvailability };
    if (!json.ok || !json.data) return empty;
    return {
      found: Boolean(json.data.found),
      clinicTimezone: json.data.clinicTimezone ?? "UTC",
      slots: Array.isArray(json.data.slots) ? json.data.slots : [],
      doctorsByStart: json.data.doctorsByStart ?? {},
    };
  } catch {
    return empty;
  }
}
