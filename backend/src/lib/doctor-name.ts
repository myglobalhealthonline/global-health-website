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

/**
 * Generated documents — the prescriber's name always carries an honorific.
 *
 * The honorific is per-market (`doctorHonorific` on TemplateLabels: "Dr" in IE,
 * "Dr." in PT/ES/RO, "MUDr." in CZ), so callers pass the one matching the
 * document's country. Any honorific already typed into `fullName` is stripped
 * first, so a doctor stored as "Dra. Anna Garcia" renders "Dr. Anna Garcia" on
 * a PT document rather than "Dr. Dra. Anna Garcia".
 */
export function formatDoctorForDocument(fullName: string, honorific: string): string {
  const bareName = stripDoctorHonorific(fullName) || fullName.trim();
  if (!bareName) return "";
  const title = honorific.trim();
  return title ? `${title} ${bareName}` : bareName;
}
