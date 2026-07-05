import { NextResponse } from "next/server";

// Railway healthcheck target (SF11, code review 2026-07-05). Deliberately
// dependency-free — must return 200 even if the backend is unreachable, or
// a backend blip would flap this service's own health status.
export async function GET() {
  return NextResponse.json({ ok: true });
}
