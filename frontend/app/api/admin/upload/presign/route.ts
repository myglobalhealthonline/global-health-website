import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth/server-session";
import { getBackendOrigin } from "@/lib/server/backend-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

const presignSchema = z.object({
  kind: z.enum(["doctor", "service", "country", "category"]),
  filename: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  size: z.number().int().positive().max(5 * 1024 * 1024),
});

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }
  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const backendOrigin = getBackendOrigin();
    if (!backendOrigin) {
      return NextResponse.json(
        { ok: false, message: "Backend API is not configured." },
        { status: 503 },
      );
    }

    const upstream = await fetch(`${backendOrigin}/api/admin/media/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
    const result = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
    if (!upstream.ok) {
      return NextResponse.json(
        result ?? { ok: false, message: "Presign failed" },
        { status: upstream.status },
      );
    }
    return NextResponse.json({ ok: true, ...(result ?? {}), expiresIn: 300 });
  } catch (err) {
    console.error("[presign] failed", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Presign failed" },
      { status: 500 },
    );
  }
}
