"use client";

import { useSearchParams } from "next/navigation";
import { buildDoctorDirectoryView, type DoctorDirectoryContext } from "@/lib/content/doctor-directory";
import { DoctorDirectoryView } from "./DoctorDirectoryView";

/**
 * Client-side filter layer for the /doctors directory (P-001). Reads the
 * `lang`/`type` filter chips from the URL via `useSearchParams` (client-only,
 * hence the Suspense boundary in the server page) and applies the exact same
 * filter predicate that used to run server-side, so every `?lang=`/`?type=`
 * combination renders identically to before — just off a statically
 * generated shell instead of a per-request dynamic render.
 */
export function DoctorsDirectoryClient({ ctx }: { ctx: DoctorDirectoryContext }) {
  const searchParams = useSearchParams();
  const view = buildDoctorDirectoryView(
    ctx,
    searchParams.getAll("lang"),
    searchParams.getAll("type"),
  );
  return <DoctorDirectoryView view={view} />;
}
