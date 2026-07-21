import { getDoctorRegistrationByCountryCode } from "../modules/doctor-registrations/doctor-registrations.service.js";

export type RegistrationRow = {
  chamberEntity: string | null;
  registrationNumber: string | null;
  isVerified: boolean;
  countryCode: string;
};

const CHAMBER_BY_COUNTRY: Record<string, string> = {
  IE: "IMC",
  PT: "OM",
  ES: "OMC",
  CZ: "ČLK",
  RO: "CMR",
  BR: "CRM",
};

export function defaultChamberEntityForCountry(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  return CHAMBER_BY_COUNTRY[code] ?? code;
}

/**
 * Render the registration value a document prints. The templates already emit a
 * localized "Medical registration" label before this, so the returned string is
 * the value only — passing `notOnFileLabel` keeps the missing case in the
 * document's own language instead of stacking English after a localized label.
 */
export function formatRegistrationLine(
  registration: Pick<RegistrationRow, "chamberEntity" | "registrationNumber" | "isVerified"> | null,
  countryCode: string,
  notOnFileLabel = "not on file",
): { line: string; verified: boolean; missing: boolean } {
  const number = registration?.registrationNumber?.trim();
  if (!number) {
    return {
      line: notOnFileLabel,
      verified: false,
      missing: true,
    };
  }

  const chamber =
    registration?.chamberEntity?.trim() ||
    defaultChamberEntityForCountry(countryCode);
  const verified = Boolean(registration?.isVerified);
  const line = verified
    ? `${chamber}: ${number}`
    : `${chamber}: ${number} (unverified)`;

  return { line, verified, missing: false };
}

/**
 * Resolve the registration a document must print, for the country that document
 * is being issued in.
 *
 * Strictly scoped to `appointmentCountryCode`: a doctor licensed in several
 * markets holds one registration row per country, and a document may only ever
 * carry the number for its own market — an Irish IMC number on a Portuguese
 * prescription is a regulatory defect, not a helpful fallback. So when the
 * doctor has no registration on file for this country we return null and let
 * `formatRegistrationLine` print "not on file"; the caller logs the gap so an
 * admin can add the missing registration and regenerate.
 */
export async function resolveDoctorRegistrationForAppointment(
  doctorId: string,
  appointmentCountryCode: string,
): Promise<RegistrationRow | null> {
  const apptCode = appointmentCountryCode.trim().toUpperCase();

  const byAppointmentCountry = await getDoctorRegistrationByCountryCode(
    doctorId,
    apptCode,
  );
  if (!byAppointmentCountry?.registrationNumber?.trim()) return null;

  return {
    chamberEntity: byAppointmentCountry.chamberEntity,
    registrationNumber: byAppointmentCountry.registrationNumber,
    isVerified: byAppointmentCountry.isVerified,
    countryCode: byAppointmentCountry.countryCode,
  };
}
