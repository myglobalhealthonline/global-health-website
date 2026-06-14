import { prisma } from "../db/prisma.js";
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

export function formatRegistrationLine(
  registration: Pick<RegistrationRow, "chamberEntity" | "registrationNumber" | "isVerified"> | null,
  countryCode: string,
): { line: string; verified: boolean; missing: boolean } {
  const number = registration?.registrationNumber?.trim();
  if (!number) {
    return {
      line: `Registration (${countryCode.toUpperCase()}): not on file`,
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

export async function resolveDoctorRegistrationForAppointment(
  doctorId: string,
  appointmentCountryCode: string,
): Promise<RegistrationRow | null> {
  const apptCode = appointmentCountryCode.trim().toUpperCase();

  const byAppointmentCountry = await getDoctorRegistrationByCountryCode(
    doctorId,
    apptCode,
  );
  if (byAppointmentCountry?.registrationNumber?.trim()) {
    return {
      chamberEntity: byAppointmentCountry.chamberEntity,
      registrationNumber: byAppointmentCountry.registrationNumber,
      isVerified: byAppointmentCountry.isVerified,
      countryCode: byAppointmentCountry.countryCode,
    };
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { countryId: true, country: { select: { code: true } } },
  });
  if (!doctor) return null;

  const primaryRow = await prisma.doctorCountry.findFirst({
    where: { doctorId, countryId: doctor.countryId },
    select: {
      chamberEntity: true,
      registrationNumber: true,
      isVerified: true,
      country: { select: { code: true } },
    },
  });
  if (primaryRow?.registrationNumber?.trim()) {
    return {
      chamberEntity: primaryRow.chamberEntity,
      registrationNumber: primaryRow.registrationNumber,
      isVerified: primaryRow.isVerified,
      countryCode: primaryRow.country.code.toUpperCase(),
    };
  }

  const anyWithNumber = await prisma.doctorCountry.findFirst({
    where: { doctorId, registrationNumber: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      chamberEntity: true,
      registrationNumber: true,
      isVerified: true,
      country: { select: { code: true } },
    },
  });
  if (anyWithNumber?.registrationNumber?.trim()) {
    return {
      chamberEntity: anyWithNumber.chamberEntity,
      registrationNumber: anyWithNumber.registrationNumber,
      isVerified: anyWithNumber.isVerified,
      countryCode: anyWithNumber.country.code.toUpperCase(),
    };
  }

  return null;
}
