import { timezoneLabel } from "./timezone-label.js";

export type AutomationLang = "en" | "pt" | "ro" | "cs" | "es";
type Lang = AutomationLang;

/** Same address as whatsapp-contact-footer.ts / pre-payment-email-template.ts. */
const SUPPORT_EMAIL = "globalhealth@myglobalhealth.online";

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

/** Country → service-name prefix shown in patient messages (IE-, SP-, CZ-, PT-, RO-). */
const SERVICE_PREFIX_BY_COUNTRY: Record<string, string> = {
  ie: "IE",
  es: "SP",
  sp: "SP",
  cz: "CZ",
  pt: "PT",
  ro: "RO",
  rm: "RO",
};

/**
 * Prefix a service name with its country code for patient-facing messages
 * (e.g. "General Consultation" → "IE - General Consultation"). Idempotent —
 * leaves an already-prefixed name untouched; unknown countries pass through.
 */
export function prefixServiceName(serviceName: string, countryCode?: string | null): string {
  const name = serviceName.trim();
  const prefix = SERVICE_PREFIX_BY_COUNTRY[(countryCode ?? "").trim().toLowerCase()];
  if (!prefix) return name;
  // Already carries a 2-letter prefix (any country) → don't double-prefix.
  if (/^[A-Za-z]{2}\s*[-–]\s*/.test(name)) return name;
  return `${prefix} - ${name}`;
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
📅 Data și ora: ${ctx.appointmentDate}
💳 Plată: ${ctx.paymentLink}
⚠️ IMPORTANT — plata până la ${ctx.deadline}, altfel rezervarea poate fi anulată.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.patientName},
děkujeme za rezervaci u Global Health. Termín byl rezervován.
📌 Služba: ${ctx.serviceName}
👤 Lékař: ${ctx.doctorName}
📅 Datum a čas: ${ctx.appointmentDate}
💳 Platba: ${ctx.paymentLink}
⚠️ DŮLEŽITÉ — platba do ${ctx.deadline}, jinak může být rezervace zrušena.
Tým Global Health`,
    es: `Hola ${ctx.patientName},
Gracias por reservar con Global Health. Su cita ha sido reservada.
📌 Servicio: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Fecha y hora: ${ctx.appointmentDate}
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
      en: `You can also manage your appointments by signing in to the Patient Portal: ${portal.signInUrl}`,
      pt: `Também pode gerir as suas consultas no Portal do Paciente: ${portal.signInUrl}`,
      ro: `De asemenea, puteți gestiona programările în Portalul Pacientului: ${portal.signInUrl}`,
      cs: `Své termíny můžete také spravovat v Portálu pacienta: ${portal.signInUrl}`,
      es: `También puede gestionar sus citas en el Portal del Paciente: ${portal.signInUrl}`,
    }),
  );
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
        en: `Set password here: ${portal.setPasswordUrl}`,
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
Payment deadline: ${ctx.deadline}
Global Health Team`,
    pt: `Olá ${ctx.doctorName},
Nova consulta reservada — pagamento pendente.
Paciente: ${ctx.patientName}
Serviço: ${ctx.serviceName}
Data e hora: ${ctx.appointmentDate}
Pedido: #${ctx.orderNumber}
Prazo de pagamento: ${ctx.deadline}
Equipa Global Health`,
    ro: `Bună ziua ${ctx.doctorName},
Consultație nouă — plată în așteptare.
Pacient: ${ctx.patientName}
Serviciu: ${ctx.serviceName}
Data și ora: ${ctx.appointmentDate}
Comandă: #${ctx.orderNumber}
Termen plată: ${ctx.deadline}
Echipa Global Health`,
    cs: `Dobrý den ${ctx.doctorName},
Nová konzultace — platba čeká.
Pacient: ${ctx.patientName}
Služba: ${ctx.serviceName}
Datum a čas: ${ctx.appointmentDate}
Objednávka: #${ctx.orderNumber}
Termín platby: ${ctx.deadline}
Tým Global Health`,
    es: `Hola ${ctx.doctorName},
Nueva consulta reservada — pago pendiente.
Paciente: ${ctx.patientName}
Servicio: ${ctx.serviceName}
Fecha y hora: ${ctx.appointmentDate}
Pedido: #${ctx.orderNumber}
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


export function checkoutAbandonedMessage(
  ctx: PrePaymentMessageContext,
  lang: Lang,
): { subject: string; text: string; whatsapp: string } {
  const body = t(lang, {
    en: `Hi ${ctx.patientName},
We noticed you left the checkout page without completing payment for your consultation.
📌 Service: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Date & Time: ${ctx.appointmentDate}
💳 Complete payment: ${ctx.paymentLink}
⚠️ Your reserved slot will be released at ${ctx.deadline} if payment is not completed.
Did you run into a problem during checkout? Contact us at ${SUPPORT_EMAIL} and we will help.
Global Health Team`,
    pt: `Olá ${ctx.patientName},
Reparámos que saiu da página de pagamento sem concluir o pagamento da sua consulta.
📌 Serviço: ${ctx.serviceName}
👤 Médico: ${ctx.doctorName}
📅 Data e hora: ${ctx.appointmentDate}
💳 Concluir pagamento: ${ctx.paymentLink}
⚠️ A sua reserva será libertada às ${ctx.deadline} se o pagamento não for concluído.
Teve algum problema durante o pagamento? Contacte-nos através de ${SUPPORT_EMAIL} e ajudamos.
Equipa Global Health`,
    ro: `Bună ${ctx.patientName},
Am observat că ați părăsit pagina de plată fără a finaliza plata consultației.
📌 Serviciu: ${ctx.serviceName}
👤 Medic: ${ctx.doctorName}
📅 Data și ora: ${ctx.appointmentDate}
💳 Finalizați plata: ${ctx.paymentLink}
⚠️ Intervalul rezervat va fi eliberat la ${ctx.deadline} dacă plata nu este finalizată.
Ați întâmpinat o problemă la plată? Scrieți-ne la ${SUPPORT_EMAIL} și vă ajutăm.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.patientName},
všimli jsme si, že jste opustil(a) platební stránku, aniž byste dokončil(a) platbu za konzultaci.
📌 Služba: ${ctx.serviceName}
👤 Lékař: ${ctx.doctorName}
📅 Datum a čas: ${ctx.appointmentDate}
💳 Dokončit platbu: ${ctx.paymentLink}
⚠️ Rezervovaný termín bude uvolněn v ${ctx.deadline}, pokud platba nebude dokončena.
Narazili jste při platbě na problém? Napište nám na ${SUPPORT_EMAIL} a pomůžeme vám.
Tým Global Health`,
    es: `Hola ${ctx.patientName},
Hemos visto que salió de la página de pago sin completar el pago de su consulta.
📌 Servicio: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Fecha y hora: ${ctx.appointmentDate}
💳 Completar el pago: ${ctx.paymentLink}
⚠️ Su reserva se liberará a las ${ctx.deadline} si no se completa el pago.
¿Tuvo algún problema durante el pago? Escríbanos a ${SUPPORT_EMAIL} y le ayudamos.
Equipo Global Health`,
  });
  return {
    subject: t(lang, {
      en: `Order #${ctx.orderNumber} - Did something go wrong at checkout?`,
      pt: `Pedido #${ctx.orderNumber} - Algo correu mal no pagamento?`,
      ro: `Comandă #${ctx.orderNumber} - A apărut o problemă la plată?`,
      cs: `Objednávka #${ctx.orderNumber} - Nastal problém při platbě?`,
      es: `Pedido #${ctx.orderNumber} - ¿Algo salió mal en el pago?`,
    }),
    text: body,
    whatsapp: body,
  };
}

export function doctorWhatsAppCancelled(ctx: PrePaymentMessageContext, lang: Lang): string {
  return t(lang, {
    en: `Hello ${ctx.doctorName},
The reservation for the following consultation has been cancelled due to non-payment.
Patient: ${ctx.patientName}
Service: ${ctx.serviceName}
Date & time: ${ctx.appointmentDate}
Order: #${ctx.orderNumber}
The time slot has been released.
Global Health Team`,
    pt: `Olá ${ctx.doctorName},
A reserva da seguinte consulta foi cancelada por falta de pagamento.
Paciente: ${ctx.patientName}
Serviço: ${ctx.serviceName}
Data e hora: ${ctx.appointmentDate}
Pedido: #${ctx.orderNumber}
O horário foi libertado.
Equipa Global Health`,
    ro: `Bună ziua ${ctx.doctorName},
Rezervarea pentru consultația de mai jos a fost anulată din cauza neplății.
Pacient: ${ctx.patientName}
Serviciu: ${ctx.serviceName}
Data și ora: ${ctx.appointmentDate}
Comandă: #${ctx.orderNumber}
Intervalul orar a fost eliberat.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.doctorName},
Rezervace následující konzultace byla zrušena z důvodu neuhrazení platby.
Pacient: ${ctx.patientName}
Služba: ${ctx.serviceName}
Datum a čas: ${ctx.appointmentDate}
Objednávka: #${ctx.orderNumber}
Časový slot byl uvolněn.
Tým Global Health`,
    es: `Hola ${ctx.doctorName},
La reserva de la siguiente consulta ha sido cancelada por falta de pago.
Paciente: ${ctx.patientName}
Servicio: ${ctx.serviceName}
Fecha y hora: ${ctx.appointmentDate}
Pedido: #${ctx.orderNumber}
El horario ha sido liberado.
Equipo Global Health`,
  });
}

export function doctorEmailSubjectCancelled(lang: Lang): string {
  return t(lang, {
    en: "Consultation Cancelled — Non-payment",
    pt: "Consulta cancelada — falta de pagamento",
    ro: "Consultație anulată — neplată",
    cs: "Konzultace zrušena — nezaplacení",
    es: "Consulta cancelada — falta de pago",
  });
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
    // Explicit components (not dateStyle/timeStyle) so the timezone is named by
    // its country instead of Intl's "GMT+1" — patients don't read offsets.
    const formatted = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timeZone ?? "UTC",
    }).format(date);
    return `${formatted} (${timezoneLabel(timeZone, locale)})`;
  } catch {
    return `${date.toISOString().slice(0, 16).replace("T", " ")} (UTC)`;
  }
}

/**
 * Multibanco (and any other delayed-notification method) issues a voucher at
 * checkout time and settles hours or days later, via SIBS. The patient must be
 * told the reference exists and that NOTHING is confirmed until the bank
 * reports the payment — the booking confirmation is sent only on
 * `checkout.session.async_payment_succeeded`.
 */
export type MultibancoPendingContext = PrePaymentMessageContext & {
  /** Entidade — 5 digits. */
  entity: string;
  /** Referência — 9 digits. */
  reference: string;
  /** Amount to pay, already currency-formatted. */
  amountLabel: string;
  /**
   * The deadline the patient is actually held to, already localised: our
   * ordinary `paymentDueAt`, NOT Stripe's ~7-day voucher lifetime. The two
   * differ, and quoting Stripe's would invite the patient to pay a reference we
   * have already voided — see voidOrderCheckoutPayment.
   */
  payBy: string;
};

export function multibancoPendingEmailSubject(
  ctx: MultibancoPendingContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Payment pending — Multibanco reference for ${ctx.orderNumber}`,
    pt: `Pagamento pendente — referência Multibanco ${ctx.orderNumber}`,
    ro: `Plată în așteptare — referință Multibanco ${ctx.orderNumber}`,
    cs: `Platba čeká — reference Multibanco ${ctx.orderNumber}`,
    es: `Pago pendiente — referencia Multibanco ${ctx.orderNumber}`,
  });
}

export function patientMultibancoPending(
  ctx: MultibancoPendingContext,
  lang: Lang,
): string {
  const validity = t(lang, {
    en: `\n⏳ Pay by: ${ctx.payBy}`,
    pt: `\n⏳ Pagar até: ${ctx.payBy}`,
    ro: `\n⏳ Plătiți până la: ${ctx.payBy}`,
    cs: `\n⏳ Zaplaťte do: ${ctx.payBy}`,
    es: `\n⏳ Pagar antes de: ${ctx.payBy}`,
  });
  return t(lang, {
    en: `Hi ${ctx.patientName},
We generated a Multibanco reference for your booking ${ctx.orderNumber}.

⚠️ Your payment is NOT confirmed yet and your appointment is NOT booked yet.

Pay with these details at an ATM or in your homebanking:
🏦 Entity: ${ctx.entity}
🔢 Reference: ${ctx.reference}
💶 Amount: ${ctx.amountLabel}${validity}

Reserved appointment:
📌 Service: ${ctx.serviceName}
👤 Doctor: ${ctx.doctorName}
📅 Date and time: ${ctx.appointmentDate}

As soon as the bank confirms the payment we will send your booking confirmation and the meeting link.
If the payment has not reached us by then, the reference is cancelled and the slot is released — the same deadline that applies to every other payment method.`,
    pt: `Olá ${ctx.patientName},
Gerámos uma referência Multibanco para a sua marcação ${ctx.orderNumber}.

⚠️ O seu pagamento ainda NÃO está confirmado e a consulta ainda NÃO está marcada.

Pague com estes dados num ATM ou no seu homebanking:
🏦 Entidade: ${ctx.entity}
🔢 Referência: ${ctx.reference}
💶 Valor: ${ctx.amountLabel}${validity}

Consulta reservada:
📌 Serviço: ${ctx.serviceName}
👤 Médico: ${ctx.doctorName}
📅 Data e hora: ${ctx.appointmentDate}

Assim que o banco confirmar o pagamento, enviamos a confirmação da marcação e o link da reunião.
Se o pagamento não chegar até essa data, a referência é anulada e a vaga é libertada — é o mesmo prazo que se aplica a qualquer outro método de pagamento.`,
    ro: `Bună ${ctx.patientName},
Am generat o referință Multibanco pentru rezervarea ${ctx.orderNumber}.

⚠️ Plata NU este încă confirmată, iar consultația NU este încă rezervată.

Plătiți cu aceste date la ATM sau în homebanking:
🏦 Entitate: ${ctx.entity}
🔢 Referință: ${ctx.reference}
💶 Sumă: ${ctx.amountLabel}${validity}

Consultație rezervată:
📌 Serviciu: ${ctx.serviceName}
👤 Medic: ${ctx.doctorName}
📅 Data și ora: ${ctx.appointmentDate}

Imediat ce banca confirmă plata, vă trimitem confirmarea rezervării și linkul întâlnirii.
Dacă plata nu ajunge până atunci, referința este anulată și intervalul este eliberat — același termen ca pentru orice altă metodă de plată.`,
    cs: `Dobrý den ${ctx.patientName},
Vygenerovali jsme referenci Multibanco pro vaši rezervaci ${ctx.orderNumber}.

⚠️ Vaše platba zatím NENÍ potvrzena a konzultace zatím NENÍ rezervována.

Zaplaťte těmito údaji v bankomatu nebo v internetovém bankovnictví:
🏦 Entita: ${ctx.entity}
🔢 Reference: ${ctx.reference}
💶 Částka: ${ctx.amountLabel}${validity}

Rezervovaná konzultace:
📌 Služba: ${ctx.serviceName}
👤 Lékař: ${ctx.doctorName}
📅 Datum a čas: ${ctx.appointmentDate}

Jakmile banka platbu potvrdí, zašleme vám potvrzení rezervace a odkaz na schůzku.
Pokud platba do té doby nedorazí, reference se zruší a termín se uvolní — stejná lhůta jako u každé jiné platební metody.`,
    es: `Hola ${ctx.patientName},
Hemos generado una referencia Multibanco para su reserva ${ctx.orderNumber}.

⚠️ Su pago aún NO está confirmado y la consulta aún NO está reservada.

Pague con estos datos en un cajero o en su banca electrónica:
🏦 Entidad: ${ctx.entity}
🔢 Referencia: ${ctx.reference}
💶 Importe: ${ctx.amountLabel}${validity}

Consulta reservada:
📌 Servicio: ${ctx.serviceName}
👤 Médico: ${ctx.doctorName}
📅 Fecha y hora: ${ctx.appointmentDate}

En cuanto el banco confirme el pago le enviaremos la confirmación de la reserva y el enlace de la reunión.
Si el pago no llega antes de esa fecha, la referencia se anula y la cita se libera — el mismo plazo que se aplica a cualquier otro método de pago.`,
  });
}
