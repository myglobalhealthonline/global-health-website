/**
 * Which PatientProfile identity fields a doctor may see and fill, per market.
 *
 * These columns are PHI-encrypted and admin-only by default (see
 * `stripIdentityFields` in doctor-patient-profile.route.ts). A market opens one
 * up only where the clinician genuinely needs it to practise there — the
 * identifier a prescription in that country has to carry, or the number that
 * reaches the national records system. Everything else stays closed.
 *
 *  - PT — Número de Utente reaches the SNS electronic prescription system; NIF
 *    and Cartão de Cidadão are printed on prescriptions and certificates by
 *    `buildPatientIdLine`; the pharmacy is where the script is sent.
 *  - BR — CPF, which `buildPatientIdLine` already prints on Brazilian
 *    documents. It lives in the same `taxIdNumber` column as PT's NIF; only the
 *    label differs, so nothing new is stored.
 *
 * Keys match the PATCH body of /api/doctor/patients/:email/profile one-for-one,
 * and the list is handed to the portal so the editable rows and the disclosed
 * values can never disagree.
 */
export type PatientIdentityField =
  | "utenteNumber"
  | "taxIdNumber"
  | "nationalIdNumber"
  | "preferredPharmacy";

const BY_MARKET: Record<string, readonly PatientIdentityField[]> = {
  pt: ["utenteNumber", "taxIdNumber", "nationalIdNumber", "preferredPharmacy"],
  br: ["taxIdNumber"],
};

/**
 * Country codes are stored lowercase, but callers pass them straight off an
 * appointment, so normalise rather than trust. An unlisted market discloses
 * nothing — adding one is a deliberate edit here, not an accident elsewhere.
 */
export function doctorVisibleIdentityFields(
  countryCode: string | null | undefined,
): ReadonlySet<PatientIdentityField> {
  const code = (countryCode ?? "").trim().toLowerCase();
  return new Set(BY_MARKET[code] ?? []);
}
