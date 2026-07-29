/**
 * Which PatientProfile identity fields the treating doctor may see and fill.
 *
 * These columns are PHI-encrypted and stay admin-only on the patient chart
 * (`stripIdentityFields` in doctor-patient-profile.route.ts). The appointment
 * workspace is the deliberate carve-out: the doctor treating this patient sees
 * them, and every disclosure is logged as a SENSITIVE_PROFILE read in
 * MedicalAccessLog (see consultations.route.ts).
 *
 * The list is NOT per-market. It used to be — PT got Número de Utente + NIF +
 * Cartão de Cidadão + pharmacy, BR got CPF, everyone else got nothing — but a
 * blank row in an unlisted market is indistinguishable from "the patient never
 * gave us one", and it left doctors outside PT/BR unable to record an
 * identifier the patient handed them mid-consult. Every field the booking and
 * manual-booking forms can collect is now offered everywhere; what differs per
 * market is only the LABEL (PT's NIF is BR's CPF), which the portal resolves.
 *
 * Keys match the PATCH body of /api/doctor/patients/:email/profile one-for-one,
 * and the list is handed to the portal so the editable rows and the disclosed
 * values can never disagree.
 */

/** Render order in the patient-context card. */
export const DOCTOR_IDENTITY_FIELDS = [
  "utenteNumber",
  "taxIdNumber",
  "nationalIdNumber",
  "passportNumber",
  "preferredPharmacy",
] as const;

export type PatientIdentityField = (typeof DOCTOR_IDENTITY_FIELDS)[number];

/**
 * Every identity field, for every market.
 *
 * Kept as a function returning a fresh Set so callers can't mutate a shared
 * one, and so the market-specific policy has a single place to come back to
 * if a jurisdiction ever demands one.
 */
export function doctorVisibleIdentityFields(): ReadonlySet<PatientIdentityField> {
  return new Set(DOCTOR_IDENTITY_FIELDS);
}
