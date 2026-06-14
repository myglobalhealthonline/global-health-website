import { formatDeadline } from "./pre-payment-messages.js";

type Lang = "en" | "pt" | "ro" | "cs" | "es";

function t(lang: Lang, map: Record<Lang, string>): string {
  return map[lang] ?? map.en;
}

export type PostPaymentMessageContext = {
  patientName: string;
  patientFirstName: string;
  patientLastName: string;
  patientEmail: string;
  patientPhone: string;
  serviceName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentDateTime: string;
  meetingLink: string;
  meetingLinkDisplay: string;
  orderNumber: string;
  totalLabel: string;
};

export function formatMeetingLinkDisplay(url: string): string {
  return url.trim().replace(/^https?:\/\//i, "");
}

export function formatAppointmentDateOnly(
  date: Date,
  timeZone?: string | null,
  lang?: Lang,
): string {
  const locale =
    lang === "pt"
      ? "pt-PT"
      : lang === "cs"
        ? "cs-CZ"
        : lang === "ro"
          ? "ro-RO"
          : lang === "es"
            ? "es-ES"
            : "en-GB";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: timeZone ?? "UTC",
    }).format(date);
  } catch {
    return date.toUTCString();
  }
}

export function serviceNameForDoctorReminder(serviceName: string): string {
  const stripped = serviceName.replace(/^[A-Za-z]{2}\s*[-–]\s*/, "").trim();
  return stripped || serviceName;
}

/** Flow 1 — patient WhatsApp payment confirmation. */
export function patientWhatsAppPaymentConfirmation(
  ctx: PostPaymentMessageContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Hi ${ctx.patientName},
Thank you for your payment.
Your booking has now been confirmed.
Appointment Details:
📌 Service: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Date: ${ctx.appointmentDate}
We will send your meeting link shortly.
Global Health Team`,
    pt: `Olá ${ctx.patientName},
Obrigado pelo seu pagamento.
A sua marcação foi confirmada.
Detalhes da consulta:
📌 Serviço: ${ctx.serviceName}
👤 Médico: ${ctx.doctorName}
📅 Data: ${ctx.appointmentDate}
Enviaremos o link da reunião em breve.
Equipa Global Health`,
    ro: `Bună ${ctx.patientName},
Vă mulțumim pentru plată.
Programarea dumneavoastră a fost confirmată.
Detalii consultație:
📌 Serviciu: ${ctx.serviceName}
👤 Medic: ${ctx.doctorName}
📅 Data: ${ctx.appointmentDate}
Linkul de meeting va fi trimis în curând.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.patientName},
děkujeme za platbu.
Vaše rezervace byla potvrzena.
Detaily konzultace:
📌 Služba: ${ctx.serviceName}
👤 Lékař: ${ctx.doctorName}
📅 Datum: ${ctx.appointmentDate}
Odkaz na setkání vám brzy zašleme.
Tým Global Health`,
    es: `Hola ${ctx.patientName},
Gracias por su pago.
Su reserva ha sido confirmada.
Detalles de la cita:
📌 Servicio: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Fecha: ${ctx.appointmentDate}
Enviaremos el enlace de la reunión en breve.
Equipo Global Health`,
  });
}

/** Flow 1 — doctor WhatsApp payment confirmation. */
export function doctorWhatsAppPaymentConfirmation(
  ctx: PostPaymentMessageContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Hello ${ctx.doctorName},
Payment has been received.
Booking is now fully confirmed.
Patient: ${ctx.patientName}
Service: ${ctx.serviceName}
Date: ${ctx.appointmentDate}
Meeting link generation in progress.
Global Health Team`,
    pt: `Olá ${ctx.doctorName},
Pagamento recebido.
Marcação totalmente confirmada.
Paciente: ${ctx.patientName}
Serviço: ${ctx.serviceName}
Data: ${ctx.appointmentDate}
Geração do link de reunião em curso.
Equipa Global Health`,
    ro: `Bună ziua ${ctx.doctorName},
Plata a fost primită.
Programarea este acum confirmată.
Pacient: ${ctx.patientName}
Serviciu: ${ctx.serviceName}
Data: ${ctx.appointmentDate}
Generarea linkului de meeting este în curs.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.doctorName},
Platba byla přijata.
Rezervace je nyní plně potvrzena.
Pacient: ${ctx.patientName}
Služba: ${ctx.serviceName}
Datum: ${ctx.appointmentDate}
Generování odkazu na setkání probíhá.
Tým Global Health`,
    es: `Hola ${ctx.doctorName},
Pago recibido.
Reserva confirmada.
Paciente: ${ctx.patientName}
Servicio: ${ctx.serviceName}
Fecha: ${ctx.appointmentDate}
Generación del enlace de reunión en curso.
Equipo Global Health`,
  });
}

/** Flow 2 — patient WhatsApp + email with payment confirmation and meeting link. */
export function patientWhatsAppMeetingLink(
  ctx: PostPaymentMessageContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Hi ${ctx.patientName},
Thank you for your payment.
Your booking has now been confirmed.
Appointment Details:
📌 Service: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Date: ${ctx.appointmentDate}
💻 Meeting Link: ${ctx.meetingLinkDisplay}
Please join a few minutes before your appointment.
Global Health Team`,
    pt: `Olá ${ctx.patientName},
Obrigado pelo seu pagamento.
A sua marcação foi confirmada.
Detalhes da consulta:
📌 Serviço: ${ctx.serviceName}
👤 Médico: ${ctx.doctorName}
📅 Data: ${ctx.appointmentDate}
💻 Link da reunião: ${ctx.meetingLinkDisplay}
Por favor entre alguns minutos antes da consulta.
Equipa Global Health`,
    ro: `Bună ${ctx.patientName},
Vă mulțumim pentru plată.
Programarea dumneavoastră a fost confirmată.
Detalii consultație:
📌 Serviciu: ${ctx.serviceName}
👤 Medic: ${ctx.doctorName}
📅 Data: ${ctx.appointmentDate}
💻 Link meeting: ${ctx.meetingLinkDisplay}
Vă rugăm să intrați cu câteva minute înainte.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.patientName},
děkujeme za platbu.
Vaše rezervace byla potvrzena.
Detaily konzultace:
📌 Služba: ${ctx.serviceName}
👤 Lékař: ${ctx.doctorName}
📅 Datum: ${ctx.appointmentDate}
💻 Odkaz na setkání: ${ctx.meetingLinkDisplay}
Připojte se prosím několik minut předem.
Tým Global Health`,
    es: `Hola ${ctx.patientName},
Gracias por su pago.
Su reserva ha sido confirmada.
Detalles de la cita:
📌 Servicio: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Fecha: ${ctx.appointmentDate}
💻 Enlace de reunión: ${ctx.meetingLinkDisplay}
Únase unos minutos antes de su cita.
Equipo Global Health`,
  });
}

/** Flow 2 — doctor WhatsApp meeting link. */
export function doctorWhatsAppMeetingLink(
  ctx: PostPaymentMessageContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Hello ${ctx.doctorName},
You have a confirmed consultation.
Patient: ${ctx.patientName}
Service: ${ctx.serviceName}
Date: ${ctx.appointmentDate}
Meeting Link: ${ctx.meetingLinkDisplay}
Please be available 5 minutes before start time.
Global Health Team`,
    pt: `Olá ${ctx.doctorName},
Tem uma consulta confirmada.
Paciente: ${ctx.patientName}
Serviço: ${ctx.serviceName}
Data: ${ctx.appointmentDate}
Link da reunião: ${ctx.meetingLinkDisplay}
Esteja disponível 5 minutos antes do início.
Equipa Global Health`,
    ro: `Bună ziua ${ctx.doctorName},
Aveți o consultație confirmată.
Pacient: ${ctx.patientName}
Serviciu: ${ctx.serviceName}
Data: ${ctx.appointmentDate}
Link meeting: ${ctx.meetingLinkDisplay}
Vă rugăm să fiți disponibil cu 5 minute înainte.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.doctorName},
máte potvrzenou konzultaci.
Pacient: ${ctx.patientName}
Služba: ${ctx.serviceName}
Datum: ${ctx.appointmentDate}
Odkaz na setkání: ${ctx.meetingLinkDisplay}
Buďte prosím k dispozici 5 minut před začátkem.
Tým Global Health`,
    es: `Hola ${ctx.doctorName},
Tiene una consulta confirmada.
Paciente: ${ctx.patientName}
Servicio: ${ctx.serviceName}
Fecha: ${ctx.appointmentDate}
Enlace de reunión: ${ctx.meetingLinkDisplay}
Esté disponible 5 minutos antes del inicio.
Equipo Global Health`,
  });
}

/** Flow 3 — patient WhatsApp 1-hour reminder. */
export function patientWhatsAppOneHourReminder(
  ctx: PostPaymentMessageContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Reminder
Your consultation begins in 1 hour.
Doctor: ${ctx.doctorName}
Date: ${ctx.appointmentDate}
Meeting Link: ${ctx.meetingLinkDisplay}`,
    pt: `Lembrete
A sua consulta começa dentro de 1 hora.
Médico: ${ctx.doctorName}
Data: ${ctx.appointmentDate}
Link da reunião: ${ctx.meetingLinkDisplay}`,
    ro: `Memento
Consultația începe peste 1 oră.
Medic: ${ctx.doctorName}
Data: ${ctx.appointmentDate}
Link meeting: ${ctx.meetingLinkDisplay}`,
    cs: `Připomínka
Vaše konzultace začíná za 1 hodinu.
Lékař: ${ctx.doctorName}
Datum: ${ctx.appointmentDate}
Odkaz na setkání: ${ctx.meetingLinkDisplay}`,
    es: `Recordatorio
Su consulta comienza en 1 hora.
Doctor: ${ctx.doctorName}
Fecha: ${ctx.appointmentDate}
Enlace de reunión: ${ctx.meetingLinkDisplay}`,
  });
}

/** Flow 3 — doctor WhatsApp 1-hour reminder. */
export function doctorWhatsAppOneHourReminder(
  ctx: PostPaymentMessageContext,
  lang: Lang,
): string {
  const service = serviceNameForDoctorReminder(ctx.serviceName);
  return t(lang, {
    en: `Reminder
Your consultation with ${ctx.patientName} starts in 1 hour.
Service: ${service}
Meeting Link: ${ctx.meetingLinkDisplay}`,
    pt: `Lembrete
A sua consulta com ${ctx.patientName} começa dentro de 1 hora.
Serviço: ${service}
Link da reunião: ${ctx.meetingLinkDisplay}`,
    ro: `Memento
Consultația cu ${ctx.patientName} începe peste 1 oră.
Serviciu: ${service}
Link meeting: ${ctx.meetingLinkDisplay}`,
    cs: `Připomínka
Vaše konzultace s ${ctx.patientName} začíná za 1 hodinu.
Služba: ${service}
Odkaz na setkání: ${ctx.meetingLinkDisplay}`,
    es: `Recordatorio
Su consulta con ${ctx.patientName} comienza en 1 hora.
Servicio: ${service}
Enlace de reunión: ${ctx.meetingLinkDisplay}`,
  });
}

/** Flow 4 — patient WhatsApp 5-minute reminder. */
export function patientWhatsAppSessionStart(
  ctx: PostPaymentMessageContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Your consultation starts in 5 minutes.
Doctor: ${ctx.doctorName}
Meeting Link: ${ctx.meetingLinkDisplay}
Please join shortly.`,
    pt: `A sua consulta começa dentro de 5 minutos.
Médico: ${ctx.doctorName}
Link da reunião: ${ctx.meetingLinkDisplay}
Por favor entre em breve.`,
    ro: `Consultația dumneavoastră începe peste 5 minute.
Medic: ${ctx.doctorName}
Link meeting: ${ctx.meetingLinkDisplay}
Vă rugăm să intrați în curând.`,
    cs: `Vaše konzultace začíná za 5 minut.
Lékař: ${ctx.doctorName}
Odkaz na setkání: ${ctx.meetingLinkDisplay}
Připojte se prosím brzy.`,
    es: `Su consulta comienza en 5 minutos.
Doctor: ${ctx.doctorName}
Enlace de reunión: ${ctx.meetingLinkDisplay}
Únase en breve.`,
  });
}

/** Flow 4 — doctor WhatsApp 5-minute reminder. */
export function doctorWhatsAppSessionStart(
  ctx: PostPaymentMessageContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Your consultation with ${ctx.patientName} starts in 5 minutes.
Meeting Link: ${ctx.meetingLinkDisplay}`,
    pt: `A sua consulta com ${ctx.patientName} começa dentro de 5 minutos.
Link da reunião: ${ctx.meetingLinkDisplay}`,
    ro: `Consultația cu ${ctx.patientName} începe peste 5 minute.
Link meeting: ${ctx.meetingLinkDisplay}`,
    cs: `Vaše konzultace s ${ctx.patientName} začíná za 5 minut.
Odkaz na setkání: ${ctx.meetingLinkDisplay}`,
    es: `Su consulta con ${ctx.patientName} comienza en 5 minutos.
Enlace de reunión: ${ctx.meetingLinkDisplay}`,
  });
}

export function patientEmailSubjectConfirmed(ctx: PostPaymentMessageContext, lang: Lang): string {
  return t(lang, {
    en: `Order #${ctx.orderNumber} Confirmed`,
    pt: `Pedido #${ctx.orderNumber} Confirmado`,
    ro: `Comandă #${ctx.orderNumber} Confirmată`,
    cs: `Objednávka #${ctx.orderNumber} Potvrzena`,
    es: `Pedido #${ctx.orderNumber} Confirmado`,
  });
}

export function patientEmailSubjectOneHour(lang: Lang): string {
  return t(lang, {
    en: "Your Consultation Starts In 1 Hour",
    pt: "A sua consulta começa dentro de 1 hora",
    ro: "Consultația dumneavoastră începe peste 1 oră",
    cs: "Vaše konzultace začíná za 1 hodinu",
    es: "Su consulta comienza en 1 hora",
  });
}

export function patientEmailSubjectSessionStart(lang: Lang): string {
  return t(lang, {
    en: "Your Consultation Starts In 5 Minutes",
    pt: "A sua consulta começa dentro de 5 minutos",
    ro: "Consultația dumneavoastră începe peste 5 minute",
    cs: "Vaše konzultace začíná za 5 minut",
    es: "Su consulta comienza en 5 minutos",
  });
}

export function doctorEmailSubjectMeetingLink(lang: Lang): string {
  return t(lang, {
    en: "New Confirmed Consultation",
    pt: "Nova consulta confirmada",
    ro: "Consultație nouă confirmată",
    cs: "Nová potvrzená konzultace",
    es: "Nueva consulta confirmada",
  });
}

export function doctorEmailSubjectOneHour(lang: Lang): string {
  return t(lang, {
    en: "Consultation Starts In 1 Hour",
    pt: "Consulta começa dentro de 1 hora",
    ro: "Consultația începe peste 1 oră",
    cs: "Konzultace začíná za 1 hodinu",
    es: "La consulta comienza en 1 hora",
  });
}

export function doctorEmailSubjectSessionStart(lang: Lang): string {
  return t(lang, {
    en: "Consultation Starts In 5 Minutes",
    pt: "Consulta começa dentro de 5 minutos",
    ro: "Consultația începe peste 5 minute",
    cs: "Konzultace začíná za 5 minut",
    es: "La consulta comienza en 5 minutos",
  });
}

export { formatDeadline };
