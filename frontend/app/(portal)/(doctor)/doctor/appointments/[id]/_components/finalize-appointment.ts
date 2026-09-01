/**
 * Single place that calls the finalize endpoint, shared by the finalize
 * checklist and the prompt the consultation form raises right after a note is
 * signed. Finalizing is what sets `Appointment.finalized` — the flag the payout
 * statement pays on — so both entry points must send the same attestation.
 */
export async function finalizeAppointment(
  appointmentId: string,
): Promise<{ ok: true } | { ok: false; message?: string }> {
  const res = await fetch(`/api/doctor/appointments/${appointmentId}/finalize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ notesUploaded: true, filesUploaded: true }),
  });
  const json = (await res.json()) as { ok?: boolean; message?: string };
  if (!res.ok || !json.ok) return { ok: false, message: json.message };
  return { ok: true };
}
