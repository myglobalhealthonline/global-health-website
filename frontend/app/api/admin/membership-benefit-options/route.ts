import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * Benefit picker for the manual-booking form (§11.7). Keyed on the patient's
 * email, like the `by-email` typeahead beside it, because a manual booking may
 * be for someone who has no account yet.
 *
 * Forwards the admin's cookies so the lookup runs under their own session —
 * which is also what decides whether the SUPER_ADMIN override candidates come
 * back in the response at all.
 */
export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  for (const key of ["email", "serviceId", "doctorId", "timeSlotId", "locale"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }
  return forwardToBackend(
    request,
    `/api/admin/membership-benefit-options?${params.toString()}`,
    "GET",
  );
}
