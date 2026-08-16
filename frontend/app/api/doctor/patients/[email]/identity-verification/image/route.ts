import { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/proxy-forward";

export const dynamic = "force-dynamic";

/**
 * Streams the ID photo or the selfie. The `?type=` query has to be carried
 * across explicitly — forwardToBackend takes a path, not the incoming URL, so
 * dropping the search string here would silently always serve the ID document.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ email: string }> },
) {
  const { email } = await ctx.params;
  const type = request.nextUrl.searchParams.get("type") === "selfie" ? "selfie" : "id";
  return forwardToBackend(
    request,
    `/api/doctor/patients/${encodeURIComponent(email)}/identity-verification/image?type=${type}`,
    "GET",
  );
}
