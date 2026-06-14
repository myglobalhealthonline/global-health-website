export type AutomationLang = "en" | "pt" | "ro" | "cs" | "es";
type Lang = AutomationLang;

type PortalWhatsAppAccess = {
  signInUrl: string;
  setPasswordUrl: string;
  tempPassword: string | null;
};

const LANG_BY_PREFIX: Record<string, Lang> = {
  IE: "en",
  PT: "pt",
  RO: "ro",
  CZ: "cs",
  SP: "es",
  ES: "es",
};

/** ISO country slug → notification language (matches Global Health markets). */
const LANG_BY_COUNTRY: Record<string, Lang> = {
  ie: "en",
  uk: "en",
  gb: "en",
  pt: "pt",
  br: "pt",
  ro: "ro",
  cz: "cs",
  es: "es",
  sp: "es",
  pk: "en",
};

export function detectLanguageFromServiceName(serviceName: string): Lang {
  const match = serviceName.trim().match(/^([A-Za-z]{2})\s*[-–]/);
  if (match) {
    const code = match[1]!.toUpperCase();
    return LANG_BY_PREFIX[code] ?? "en";
  }
  const prefix = serviceName.trim().slice(0, 2).toUpperCase();
  return LANG_BY_PREFIX[prefix] ?? "en";
}

/** Prefer order country; fall back to service name prefix (IE-, PT-, …). */
export function detectAutomationLanguage(input: {
  countryCode?: string | null;
  serviceName?: string | null;
}): Lang {
  const country = input.countryCode?.trim().toLowerCase();
  if (country && LANG_BY_COUNTRY[country]) {
    return LANG_BY_COUNTRY[country];
  }
  if (input.serviceName?.trim()) {
    return detectLanguageFromServiceName(input.serviceName);
  }
  return "en";
}

export type PrePaymentMessageContext = {
  patientName: string;
  patientFirstName: string;
  patientLastName: string;
  serviceName: string;
  doctorName: string;
  appointmentDate: string;
  paymentLink: string;
  deadline: string;
  orderNumber: string;
  totalLabel: string;
};

function t(lang: Lang, map: Record<Lang, string>): string {
  return map[lang] ?? map.en;
}

export function pendingAppointmentDateLabel(lang: Lang): string {
  return t(lang, {
    en: "To be confirmed",
    pt: "A confirmar",
    ro: "De confirmat",
    cs: "Bude potvrzeno",
    es: "Por confirmar",
  });
}

export function patientWhatsAppInitial(ctx: PrePaymentMessageContext, lang: Lang): string {
  return t(lang, {
    en: `Hi ${ctx.patientName},
Thank you for booking with Global Health. Your appointment has been reserved.
📌 Service: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Date & Time: ${ctx.appointmentDate}
💳 Complete Payment: ${ctx.paymentLink}
⚠️ IMPORTANT — Payment must be completed before ${ctx.deadline} or your reservation may be cancelled.
Global Health Team`,
    pt: `Olá ${ctx.patientName},
Obrigado por marcar com a Global Health. A sua consulta foi reservada.
📌 Serviço: ${ctx.serviceName}
👤 Médico: ${ctx.doctorName}
📅 Data e hora: ${ctx.appointmentDate}
💳 Pagamento: ${ctx.paymentLink}
⚠️ IMPORTANTE — pagamento até ${ctx.deadline} ou a reserva pode ser cancelada.
Equipa Global Health`,
    ro: `Bună ${ctx.patientName},
Vă mulțumim pentru programarea la Global Health. Consultația a fost rezervată.
📌 Serviciu: ${ctx.serviceName}
👤 Medic: ${ctx.doctorName}
📅 Data: ${ctx.appointmentDate}
💳 Plată: ${ctx.paymentLink}
⚠️ IMPORTANT — plata până la ${ctx.deadline}, altfel rezervarea poate fi anulată.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.patientName},
děkujeme za rezervaci u Global Health. Termín byl rezervován.
📌 Služba: ${ctx.serviceName}
👤 Lékař: ${ctx.doctorName}
📅 Datum: ${ctx.appointmentDate}
💳 Platba: ${ctx.paymentLink}
⚠️ DŮLEŽITÉ — platba do ${ctx.deadline}, jinak může být rezervace zrušena.
Tým Global Health`,
    es: `Hola ${ctx.patientName},
Gracias por reservar con Global Health. Su cita ha sido reservada.
📌 Servicio: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Fecha: ${ctx.appointmentDate}
💳 Pago: ${ctx.paymentLink}
⚠️ IMPORTANTE — pago antes de ${ctx.deadline} o la reserva puede cancelarse.
Equipo Global Health`,
  });
}

/** Append patient portal sign-in / set-password lines to WhatsApp bodies. */
export function appendPatientPortalWhatsApp(
  body: string,
  portal: PortalWhatsAppAccess | null | undefined,
  lang: Lang,
): string {
  if (!portal) return body;

  const lines = [body, ""];
  lines.push(
    t(lang, {
      en: `Sign in: ${portal.signInUrl}`,
      pt: `Iniciar sessão: ${portal.signInUrl}`,
      ro: `Conectare: ${portal.signInUrl}`,
      cs: `Přihlášení: ${portal.signInUrl}`,
      es: `Iniciar sesión: ${portal.signInUrl}`,
    }),
  );
  if (portal.setPasswordUrl && portal.setPasswordUrl !== portal.signInUrl) {
    lines.push(
      t(lang, {
        en: `Set password: ${portal.setPasswordUrl}`,
        pt: `Definir palavra-passe: ${portal.setPasswordUrl}`,
        ro: `Setați parola: ${portal.setPasswordUrl}`,
        cs: `Nastavit heslo: ${portal.setPasswordUrl}`,
        es: `Establecer contraseña: ${portal.setPasswordUrl}`,
      }),
    );
  }
  if (portal.tempPassword) {
    lines.push(
      t(lang, {
        en: `Temporary password: ${portal.tempPassword}`,
        pt: `Palavra-passe temporária: ${portal.tempPassword}`,
        ro: `Parolă temporară: ${portal.tempPassword}`,
        cs: `Dočasné heslo: ${portal.tempPassword}`,
        es: `Contraseña temporal: ${portal.tempPassword}`,
      }),
    );
  }
  return lines.join("\n");
}

export function doctorWhatsAppBookingReceived(ctx: PrePaymentMessageContext, lang: Lang): string {
  return t(lang, {
    en: `Hello ${ctx.doctorName},
New consultation booked — payment pending.
Patient: ${ctx.patientName}
Service: ${ctx.serviceName}
Date & time: ${ctx.appointmentDate}
Order: #${ctx.orderNumber}
Amount: ${ctx.totalLabel}
Payment deadline: ${ctx.deadline}
Global Health Team`,
    pt: `Olá ${ctx.doctorName},
Nova consulta reservada — pagamento pendente.
Paciente: ${ctx.patientName}
Serviço: ${ctx.serviceName}
Data e hora: ${ctx.appointmentDate}
Pedido: #${ctx.orderNumber}
Valor: ${ctx.totalLabel}
Prazo de pagamento: ${ctx.deadline}
Equipa Global Health`,
    ro: `Bună ziua ${ctx.doctorName},
Consultație nouă — plată în așteptare.
Pacient: ${ctx.patientName}
Serviciu: ${ctx.serviceName}
Data și ora: ${ctx.appointmentDate}
Comandă: #${ctx.orderNumber}
Sumă: ${ctx.totalLabel}
Termen plată: ${ctx.deadline}
Echipa Global Health`,
    cs: `Dobrý den ${ctx.doctorName},
Nová konzultace — platba čeká.
Pacient: ${ctx.patientName}
Služba: ${ctx.serviceName}
Datum a čas: ${ctx.appointmentDate}
Objednávka: #${ctx.orderNumber}
Částka: ${ctx.totalLabel}
Termín platby: ${ctx.deadline}
Tým Global Health`,
    es: `Hola ${ctx.doctorName},
Nueva consulta reservada — pago pendiente.
Paciente: ${ctx.patientName}
Servicio: ${ctx.serviceName}
Fecha y hora: ${ctx.appointmentDate}
Pedido: #${ctx.orderNumber}
Importe: ${ctx.totalLabel}
Fecha límite de pago: ${ctx.deadline}
Equipo Global Health`,
  });
}

export function doctorEmailSubjectBooking(lang: Lang): string {
  return t(lang, {
    en: "New Consultation Booked — Payment Pending",
    pt: "Nova consulta reservada — pagamento pendente",
    ro: "Consultație nouă — plată în așteptare",
    cs: "Nová konzultace — čeká na platbu",
    es: "Nueva consulta reservada — pago pendiente",
  });
}

export function doctorWhatsAppPaymentConfirmed(ctx: PrePaymentMessageContext, lang: Lang): string {
  return t(lang, {
    en: `Hello ${ctx.doctorName},
Appointment confirmed — payment received.
Patient: ${ctx.patientName}
Service: ${ctx.serviceName}
Date & time: ${ctx.appointmentDate}
Order: #${ctx.orderNumber}
Amount: ${ctx.totalLabel}
The consultation is confirmed in your schedule.
Global Health Team`,
    pt: `Olá ${ctx.doctorName},
Consulta confirmada — pagamento recebido.
Paciente: ${ctx.patientName}
Serviço: ${ctx.serviceName}
Data e hora: ${ctx.appointmentDate}
Pedido: #${ctx.orderNumber}
Valor: ${ctx.totalLabel}
A consulta está confirmada na sua agenda.
Equipa Global Health`,
    ro: `Bună ziua ${ctx.doctorName},
Consultație confirmată — plată primită.
Pacient: ${ctx.patientName}
Serviciu: ${ctx.serviceName}
Data și ora: ${ctx.appointmentDate}
Comandă: #${ctx.orderNumber}
Sumă: ${ctx.totalLabel}
Consultația este confirmată în programul dumneavoastră.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.doctorName},
Konzultace potvrzena — platba přijata.
Pacient: ${ctx.patientName}
Služba: ${ctx.serviceName}
Datum a čas: ${ctx.appointmentDate}
Objednávka: #${ctx.orderNumber}
Částka: ${ctx.totalLabel}
Konzultace je potvrzena ve vašem rozvrhu.
Tým Global Health`,
    es: `Hola ${ctx.doctorName},
Consulta confirmada — pago recibido.
Paciente: ${ctx.patientName}
Servicio: ${ctx.serviceName}
Fecha y hora: ${ctx.appointmentDate}
Pedido: #${ctx.orderNumber}
Importe: ${ctx.totalLabel}
La consulta está confirmada en su agenda.
Equipo Global Health`,
  });
}

export function patientEmailSubject(ctx: PrePaymentMessageContext, lang: Lang): string {
  return t(lang, {
    en: `Order #${ctx.orderNumber} - Payment Required`,
    pt: `Pedido #${ctx.orderNumber} - Pagamento necessário`,
    ro: `Comandă #${ctx.orderNumber} - Plată necesară`,
    cs: `Objednávka #${ctx.orderNumber} - Vyžadována platba`,
    es: `Pedido #${ctx.orderNumber} - Pago requerido`,
  });
}

function reminderWhatsAppBody(
  ctx: PrePaymentMessageContext,
  lang: Lang,
  kind: "mid" | "final",
): string {
  const lead = t(lang, {
    en:
      kind === "final"
        ? `Hi ${ctx.patientName}, final reminder — your reservation will be cancelled unless payment is completed before ${ctx.deadline}.`
        : `Hi ${ctx.patientName}, payment is still outstanding for your reserved consultation.`,
    pt:
      kind === "final"
        ? `Olá ${ctx.patientName}, aviso final — a reserva será cancelada se o pagamento não for concluído antes de ${ctx.deadline}.`
        : `Olá ${ctx.patientName}, o pagamento da sua consulta reservada ainda está pendente.`,
    ro:
      kind === "final"
        ? `Bună ${ctx.patientName}, memento final — rezervarea va fi anulată dacă plata nu este finalizată până la ${ctx.deadline}.`
        : `Bună ${ctx.patientName}, plata pentru consultația rezervată este încă restantă.`,
    cs:
      kind === "final"
        ? `Dobrý den ${ctx.patientName}, poslední připomínka — rezervace bude zrušena, pokud platba nebude dokončena do ${ctx.deadline}.`
        : `Dobrý den ${ctx.patientName}, platba za vaši rezervovanou konzultaci stále chybí.`,
    es:
      kind === "final"
        ? `Hola ${ctx.patientName}, recordatorio final — la reserva se cancelará si no completa el pago antes de ${ctx.deadline}.`
        : `Hola ${ctx.patientName}, el pago de su consulta reservada sigue pendiente.`,
  });
  const payLabel = t(lang, {
    en: "Complete Payment",
    pt: "Pagamento",
    ro: "Plată",
    cs: "Platba",
    es: "Pago",
  });
  const deadlineLabel = t(lang, {
    en: "Payment deadline",
    pt: "Prazo de pagamento",
    ro: "Termen de plată",
    cs: "Termín platby",
    es: "Fecha límite de pago",
  });
  return `${lead}
📌 Service: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Date & Time: ${ctx.appointmentDate}
💳 ${payLabel}: ${ctx.paymentLink}
⚠️ ${deadlineLabel}: ${ctx.deadline}
Global Health Team`;
}

export function reminderMessage(
  ctx: PrePaymentMessageContext,
  lang: Lang,
  kind: "mid" | "final" | "cancelled",
): { subject: string; text: string; whatsapp: string } {
  if (kind === "cancelled") {
    const text = t(lang, {
      en: `Hi ${ctx.patientName}, your reservation for ${ctx.serviceName} on ${ctx.appointmentDate} has been cancelled because payment was not received before ${ctx.deadline}.`,
      pt: `Olá ${ctx.patientName}, a reserva para ${ctx.serviceName} foi cancelada por falta de pagamento.`,
      ro: `Rezervarea pentru ${ctx.serviceName} a fost anulată.`,
      cs: `Rezervace ${ctx.serviceName} byla zrušena.`,
      es: `Su reserva de ${ctx.serviceName} fue cancelada.`,
    });
    return {
      subject: t(lang, {
        en: `Order #${ctx.orderNumber} - Reservation cancelled`,
        pt: `Pedido #${ctx.orderNumber} - Reserva cancelada`,
        ro: `Comandă #${ctx.orderNumber} - Rezervare anulată`,
        cs: `Objednávka #${ctx.orderNumber} - Rezervace zrušena`,
        es: `Pedido #${ctx.orderNumber} - Reserva cancelada`,
      }),
      text,
      whatsapp: text,
    };
  }
  if (kind === "final") {
    const whatsapp = reminderWhatsAppBody(ctx, lang, "final");
    const text = whatsapp;
    return {
      subject: t(lang, {
        en: `Order #${ctx.orderNumber} - Final payment reminder`,
        pt: `Pedido #${ctx.orderNumber} - Último aviso de pagamento`,
        ro: `Comandă #${ctx.orderNumber} - Ultimul memento de plată`,
        cs: `Objednávka #${ctx.orderNumber} - Poslední připomínka platby`,
        es: `Pedido #${ctx.orderNumber} - Recordatorio final de pago`,
      }),
      text,
      whatsapp,
    };
  }
  const whatsapp = reminderWhatsAppBody(ctx, lang, "mid");
  const text = whatsapp;
  return {
    subject: t(lang, {
      en: `Order #${ctx.orderNumber} - Payment reminder`,
      pt: `Pedido #${ctx.orderNumber} - Lembrete de pagamento`,
      ro: `Comandă #${ctx.orderNumber} - Memento plată`,
      cs: `Objednávka #${ctx.orderNumber} - Připomínka platby`,
      es: `Pedido #${ctx.orderNumber} - Recordatorio de pago`,
    }),
    text,
    whatsapp,
  };
}

export function formatDeadline(
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
      timeStyle: "short",
      timeZone: timeZone ?? "UTC",
    }).format(date);
  } catch {
    return date.toUTCString();
  }
}
