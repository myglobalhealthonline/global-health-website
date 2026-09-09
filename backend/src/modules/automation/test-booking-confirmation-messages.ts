import {
  attendanceAdviceLine,
  attendanceLine,
  attendeeLine,
  type Attendance,
} from "./attendance-line.js";
import type { AutomationLang } from "./pre-payment-messages.js";
import { whatsappContactFooter } from "./whatsapp-contact-footer.js";

/**
 * The confirmation an admin sends by hand once a test-centre booking has been
 * replicated in the laboratory's own system.
 *
 * Deliberately NOT a second copy of `patientWhatsAppMeetingLink`: it reuses the
 * same `attendeeLine` / `attendanceLine` / `attendanceAdviceLine` helpers the
 * automatic post-payment confirmation uses, so the centre name, the address and
 * the "arrive early" wording can never drift between the two messages. What it
 * adds is the lab's own reference (when the provider gave one) and the short
 * what-to-bring block, neither of which exists at payment time.
 */

type Lang = AutomationLang;

function t(lang: Lang, map: Record<Lang, string>): string {
  return map[lang] ?? map.en;
}

export type TestBookingConfirmationContext = {
  patientName: string;
  /** The exam booked, e.g. "Full Blood Count". */
  examName: string;
  /** Already-formatted, timezone-aware slot label. */
  appointmentDateTime: string;
  /** Centre + branch and its address, as the shared helpers render them. */
  attendance: Attendance;
  /** The laboratory's own booking code. Null when they gave none. */
  labReference: string | null;
};

const REFERENCE_LABEL: Record<Lang, string> = {
  en: "Booking reference",
  pt: "Referência da marcação",
  ro: "Referință programare",
  cs: "Referenční číslo rezervace",
  es: "Referencia de la reserva",
};

/**
 * What to bring. Short on purpose — a confirmation people read on a phone,
 * not a policy document.
 */
const BRING_LINE: Record<Lang, string> = {
  en: "Please bring photo ID, and your prescription or referral if you have one.",
  pt: "Traga um documento de identificação com fotografia e, caso tenha, a sua prescrição ou credencial.",
  ro: "Vă rugăm să aduceți un act de identitate cu fotografie și, dacă aveți, rețeta sau biletul de trimitere.",
  cs: "Vezměte si prosím doklad totožnosti s fotografií a případně také žádanku či doporučení.",
  es: "Traiga un documento de identidad con fotografía y, si la tiene, su receta o volante.",
};

/** The reference line, or nothing when the lab gave no code. */
function referenceLine(ctx: TestBookingConfirmationContext, lang: Lang): string {
  const value = ctx.labReference?.trim();
  if (!value) return "";
  return `\n🔖 ${REFERENCE_LABEL[lang] ?? REFERENCE_LABEL.en}: ${value}`;
}

export function patientWhatsAppTestBookingConfirmation(
  ctx: TestBookingConfirmationContext,
  lang: Lang,
): string {
  const attendee = attendeeLine(ctx.attendance, "", lang);
  const where = attendanceLine(ctx.attendance, lang);
  const advice = attendanceAdviceLine(ctx.attendance, lang);
  const reference = referenceLine(ctx, lang);
  const bring = BRING_LINE[lang] ?? BRING_LINE.en;

  const body = t(lang, {
    en: `Hi ${ctx.patientName},
Your test appointment is confirmed.
Appointment Details:
📌 Test: ${ctx.examName}
${attendee}
📅 Date & Time: ${ctx.appointmentDateTime}
${where}${reference}
${advice}
${bring}
Global Health Team`,
    pt: `Olá ${ctx.patientName},
A sua marcação para análises está confirmada.
Detalhes da marcação:
📌 Exame: ${ctx.examName}
${attendee}
📅 Data e hora: ${ctx.appointmentDateTime}
${where}${reference}
${advice}
${bring}
Equipa Global Health`,
    ro: `Bună ${ctx.patientName},
Programarea dumneavoastră pentru analize este confirmată.
Detalii programare:
📌 Analiză: ${ctx.examName}
${attendee}
📅 Data și ora: ${ctx.appointmentDateTime}
${where}${reference}
${advice}
${bring}
Echipa Global Health`,
    cs: `Dobrý den ${ctx.patientName},
váš termín odběru je potvrzen.
Detaily rezervace:
📌 Vyšetření: ${ctx.examName}
${attendee}
📅 Datum a čas: ${ctx.appointmentDateTime}
${where}${reference}
${advice}
${bring}
Tým Global Health`,
    es: `Hola ${ctx.patientName},
Su cita para análisis está confirmada.
Detalles de la cita:
📌 Prueba: ${ctx.examName}
${attendee}
📅 Fecha y hora: ${ctx.appointmentDateTime}
${where}${reference}
${advice}
${bring}
Equipo Global Health`,
  });
  return body + whatsappContactFooter(lang);
}

export function patientEmailSubjectTestBookingConfirmation(
  ctx: TestBookingConfirmationContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Your test appointment is confirmed — ${ctx.appointmentDateTime}`,
    pt: `A sua marcação para análises está confirmada — ${ctx.appointmentDateTime}`,
    ro: `Programarea dumneavoastră pentru analize este confirmată — ${ctx.appointmentDateTime}`,
    cs: `Váš termín odběru je potvrzen — ${ctx.appointmentDateTime}`,
    es: `Su cita para análisis está confirmada — ${ctx.appointmentDateTime}`,
  });
}
