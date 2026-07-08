"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * S-002 break-glass: store the admin's stated reason for accessing patient
 * PHI in a short-TTL httpOnly cookie. `adminRequest` forwards all cookies to
 * the backend, where `guardMedicalRead` reads `gh_phi_reason` and writes it
 * to MedicalAccessLog.accessReason — so one cookie covers every admin PHI
 * fetch (including plain <a href> document downloads) for the next 15 min.
 */
export async function setPhiAccessReason(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  const next = String(formData.get("next") ?? "/admin/patients");
  // Only allow same-site admin paths as the return target.
  const safeNext = next.startsWith("/admin") ? next : "/admin/patients";
  if (reason.length < 5 || reason.length > 300) {
    redirect(`${safeNext}?reasonError=1`);
  }
  (await cookies()).set("gh_phi_reason", reason, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60, // 15-minute access window, then re-prompt
  });
  redirect(safeNext);
}
