import { prisma } from "../../db/prisma.js";
import { decryptPhiFields } from "../../lib/crypto/phi-crypto.js";
import { formatDoctorForDocument } from "../../lib/doctor-name.js";
import {
  formatRegistrationLine,
  resolveDoctorRegistrationForAppointment,
} from "../../lib/doctor-registration-display.js";
import {
  buildAddressLines,
  buildPatientIdLine,
} from "./generated-documents-fields.js";
import { formatDateDdMmYyyy } from "./document-template-utils.js";
import { labelsForPrefix } from "./docx-template-labels.js";
import {
  labelPrefixForCountry,
  templatePrefixForCountry,
} from "./docx-template-profiles.js";

function buildAddressBlock(
  appt: {
    addressLine1: string | null;
    addressLine2: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressPostalCode: string | null;
    addressCountryCode: string | null;
  },
  profile: {
    addressLine1: string | null;
    addressLine2: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressPostalCode: string | null;
    addressCountryCode: string | null;
  } | null,
): string {
  const lines =
    appt.addressLine1 || appt.addressCity
      ? buildAddressLines({
          addressLine1: appt.addressLine1,
          addressLine2: appt.addressLine2,
          addressCity: appt.addressCity,
          addressState: appt.addressState,
          addressPostalCode: appt.addressPostalCode,
          addressCountryCode: appt.addressCountryCode,
        })
      : profile
        ? buildAddressLines(profile)
        : [];
  return lines.join("\n") || "—";
}

export type AppointmentDocumentSource = {
  appointmentId: string;
  countryCode: string;
  countryLabel: string;
  hasDocxTemplate: boolean;
  patient: {
    fullName: string;
    email: string;
    birthDate: string;
    address: string;
    patientIdLine: string | null;
    consultationDate: string;
    pharmacy: string | null;
  };
  doctor: {
    name: string;
    registrationLine: string;
    registrationVerified: boolean;
    registrationMissing: boolean;
  };
};

export async function resolveAppointmentDocumentSource(
  appointmentId: string,
  doctorId: string,
): Promise<AppointmentDocumentSource | null> {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    include: {
      doctor: { select: { fullName: true } },
    },
  });
  if (!appt) return null;

  const country = await prisma.country.findUnique({
    where: { code: appt.countryCode },
    select: { name: true },
  });

  // Honorific matches the market the document is issued in ("Dr" in IE, "Dr."
  // in PT/ES/RO, "MUDr." in CZ). The Global Health fallback is the brand, not a
  // person, so it never takes one.
  // Language, not stationery: BR has no Word template but its documents are
  // still written in Portuguese. `labelPrefixForCountry` resolves the two
  // separately — conflating them is what shipped Brazilian documents in English.
  const labels = labelsForPrefix(labelPrefixForCountry(appt.countryCode));
  const doctorFullName = appt.doctor?.fullName?.trim();
  const doctorName = doctorFullName
    ? formatDoctorForDocument(doctorFullName, labels.doctorHonorific)
    : "Global Health";

  const registration = await resolveDoctorRegistrationForAppointment(doctorId, appt.countryCode);
  const formatted = formatRegistrationLine(
    registration,
    appt.countryCode,
    labels.registrationNotOnFile,
    labels.registrationUnverified,
  );
  const registrationLine = formatted.line;
  const registrationVerified = formatted.verified;
  const registrationMissing = formatted.missing;

  const patientProfileRaw = await prisma.patientProfile.findUnique({
    where: { email: appt.email.toLowerCase() },
    select: {
      nationalIdNumber: true,
      taxIdNumber: true,
      passportNumber: true,
      addressLine1: true,
      addressLine2: true,
      addressCity: true,
      addressState: true,
      addressPostalCode: true,
      addressCountryCode: true,
      dateOfBirth: true,
    },
  });
  // Decrypt the government-ID fields before they're rendered into documents
  // (passthrough on legacy plaintext / when encryption is off).
  const patientProfile = patientProfileRaw ? decryptPhiFields(patientProfileRaw) : null;

  const patientIdLine = buildPatientIdLine(appt.countryCode, patientProfile);
  const address = buildAddressBlock(appt, patientProfile);
  const birthDate = formatDateDdMmYyyy(
    appt.dateOfBirth ?? patientProfile?.dateOfBirth ?? null,
  );
  const consultationDate = appt.scheduledAt
    ? formatDateDdMmYyyy(appt.scheduledAt)
    : formatDateDdMmYyyy(new Date());

  return {
    appointmentId: appt.id,
    countryCode: appt.countryCode,
    countryLabel: country?.name ?? appt.countryCode,
    hasDocxTemplate: Boolean(templatePrefixForCountry(appt.countryCode)),
    patient: {
      fullName: appt.fullName,
      email: appt.email,
      birthDate: birthDate || "—",
      address: address || "—",
      patientIdLine,
      consultationDate,
      pharmacy: appt.pharmacy,
    },
    doctor: {
      name: doctorName,
      registrationLine,
      registrationVerified,
      registrationMissing,
    },
  };
}

export async function getAppointmentDocumentContext(
  appointmentId: string,
  doctorId: string,
): Promise<AppointmentDocumentSource | null> {
  return resolveAppointmentDocumentSource(appointmentId, doctorId);
}
