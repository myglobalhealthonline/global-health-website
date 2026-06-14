import { prisma } from "../../db/prisma.js";
import {
  isPlaceholderWhatsAppNumber,
  normalizeDoctorWhatsApp,
  type PhoneNormalizeHints,
} from "./normalize-phone.js";

export type DoctorContact = {
  fullName: string;
  title: string;
  /** Normalized E.164 for WaSender, or null when missing / invalid / placeholder. */
  whatsappNumber: string | null;
  whatsappRaw: string | null;
  whatsappHints: PhoneNormalizeHints;
  loginEmail: string | null;
};

export async function resolveDoctorContact(
  doctorId: string | null | undefined,
): Promise<DoctorContact | null> {
  if (!doctorId) return null;

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      fullName: true,
      title: true,
      whatsappNumber: true,
      country: { select: { code: true } },
      loginUser: { select: { email: true } },
    },
  });
  if (!doctor) return null;

  const countryCode = doctor.country.code.trim().toLowerCase();
  const whatsappRaw = doctor.whatsappNumber?.trim() || null;
  const hints: PhoneNormalizeHints = { orderCountryCode: countryCode };

  if (!whatsappRaw) {
    return {
      fullName: doctor.fullName,
      title: doctor.title,
      whatsappNumber: null,
      whatsappRaw: null,
      whatsappHints: hints,
      loginEmail: doctor.loginUser?.email?.trim() || null,
    };
  }

  const normalized = normalizeDoctorWhatsApp(whatsappRaw, countryCode);
  const usable =
    normalized.e164 &&
    normalized.digits &&
    !isPlaceholderWhatsAppNumber(normalized);

  return {
    fullName: doctor.fullName,
    title: doctor.title,
    whatsappNumber: usable ? normalized.e164 : null,
    whatsappRaw,
    whatsappHints: hints,
    loginEmail: doctor.loginUser?.email?.trim() || null,
  };
}

import {
  formatDoctorForDoctorGreeting,
  formatDoctorForPatientNotification,
} from "../doctor-name.js";

/** Patient-facing automation lines ("Doctor: …"). */
export function formatDoctorDisplayName(contact: DoctorContact): string {
  return formatDoctorForPatientNotification(contact.fullName, contact.title);
}

/** Doctor-facing WhatsApp greetings ("Hello …"). */
export function formatDoctorGreetingName(contact: DoctorContact): string {
  return formatDoctorForDoctorGreeting(contact.fullName);
}

/** Persistable E.164 for admin create/update — null when empty or unparseable. */
export function normalizeDoctorWhatsAppForStorage(
  raw: string | null | undefined,
  doctorCountryCode: string | null | undefined,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const normalized = normalizeDoctorWhatsApp(trimmed, doctorCountryCode);
  return normalized.e164;
}
