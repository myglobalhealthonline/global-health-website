type Lang = "en" | "pt" | "ro" | "cs" | "es";

function t(lang: Lang, map: Record<Lang, string>): string {
  return map[lang] ?? map.en;
}

/**
 * How the patient attends: a video call, or a physical address.
 *
 * This is the ONLY thing that differs between a doctor consultation and a test
 * booking in every patient-facing message. Everything else — the payment
 * confirmation, the reminder ladder, the timing — is shared, so the divergence
 * is modelled as two lines of copy rather than two sets of message builders.
 */
export type Attendance =
  | { kind: "MEET"; display: string }
  | { kind: "VENUE"; display: string; venueName: string };

/**
 * Who or what the patient is seeing: "👤 Doctor: Dr Silva" for a consultation,
 * "🏥 Test centre: Synlab Lisboa" for a test booking.
 *
 * Pre-rendered into the message context by the flow services, because the
 * message builders hold one literal block per language and threading a label
 * table through all of them would mean touching every block for every change.
 */
export function attendeeLine(
  attendance: Attendance,
  doctorName: string,
  lang: Lang,
): string {
  if (attendance.kind === "VENUE") {
    const label = t(lang, {
      en: "Test centre",
      pt: "Centro de exames",
      ro: "Centru de analize",
      cs: "Odběrové centrum",
      es: "Centro de pruebas",
    });
    return `🏥 ${label}: ${attendance.venueName}`;
  }
  const label = t(lang, {
    en: "Doctor",
    pt: "Médico",
    ro: "Medic",
    cs: "Lékař",
    es: "Doctor",
  });
  return `👤 ${label}: ${doctorName}`;
}

/**
 * Where to go: the meeting link, or the centre's address.
 *
 * Falls back to an em dash rather than rendering an empty line — an update
 * notification can legitimately go out before a meeting link exists, and a
 * bare "Meeting Link:" with nothing after it reads as a broken message.
 */
export function attendanceLine(attendance: Attendance, lang: Lang): string {
  const value = attendance.display.trim() || "—";
  if (attendance.kind === "VENUE") {
    const label = t(lang, {
      en: "Address",
      pt: "Morada",
      ro: "Adresă",
      cs: "Adresa",
      es: "Dirección",
    });
    return `📍 ${label}: ${value}`;
  }
  const label = t(lang, {
    en: "Meeting Link",
    pt: "Link da reunião",
    ro: "Link meeting",
    cs: "Odkaz na setkání",
    es: "Enlace de reunión",
  });
  return `💻 ${label}: ${value}`;
}

/**
 * Closing instruction. A video consultation says "join early"; an in-person
 * exam says "arrive early", which is the same intent and a different action.
 */
export function attendanceAdviceLine(attendance: Attendance, lang: Lang): string {
  if (attendance.kind === "VENUE") {
    return t(lang, {
      en: "Please arrive 5–10 minutes before your appointment.",
      pt: "Por favor chegue 5–10 minutos antes da sua marcação.",
      ro: "Vă rugăm să ajungeți cu 5–10 minute înainte de programare.",
      cs: "Dostavte se prosím 5–10 minut před termínem.",
      es: "Por favor llegue 5–10 minutos antes de su cita.",
    });
  }
  return t(lang, {
    en: "Please join a few minutes before your appointment.",
    pt: "Por favor entre alguns minutos antes da consulta.",
    ro: "Vă rugăm să intrați cu câteva minute înainte de consultație.",
    cs: "Připojte se prosím několik minut před konzultací.",
    es: "Por favor conéctese unos minutos antes de la consulta.",
  });
}
