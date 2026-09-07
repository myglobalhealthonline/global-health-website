import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * The guarded per-patient read behind the booking forms' identity prefill.
 *
 * The `by-email` typeahead deliberately returns no identity documents — it
 * fires per keystroke over many patients — so the manual-booking form asks for
 * them here, once, for the single patient the admin actually selected. The
 * backend runs `guardMedicalRead` on this route: it writes one
 * `MedicalAccessLog` row and refuses a patient outside the admin's country
 * folders.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ email: string }> },
) {
  const { email } = await ctx.params;
  return forwardToBackend(
    request,
    `/api/admin/patients/${encodeURIComponent(email)}/profile`,
    "GET",
  );
}
