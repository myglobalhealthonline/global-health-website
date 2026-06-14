const HONORIFIC_PREFIX =
  /^(?:Dr\.?|Dra\.?|Prof\.?|Professor|Mr\.?|Mrs\.?|Ms\.?|Miss)\s+/i;

export function stripDoctorHonorific(name: string): string {
  return name.trim().replace(HONORIFIC_PREFIX, "").trim();
}

/** Patient notifications already label the role ("Doctor:", "Médico:", …). */
export function formatDoctorForPatientNotification(
  fullName: string,
  _title?: string | null,
): string {
  return stripDoctorHonorific(fullName) || fullName.trim();
}

/** Doctor-facing WhatsApp greetings — first name only, no honorific or title. */
export function formatDoctorForDoctorGreeting(fullName: string): string {
  return stripDoctorHonorific(fullName) || fullName.trim();
}

/** Generated documents — template label already says "Doctor:" / "Médico:". */
export function formatDoctorForDocument(fullName: string): string {
  return stripDoctorHonorific(fullName) || fullName.trim();
}
