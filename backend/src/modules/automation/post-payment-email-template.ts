import type { PostPaymentMessageContext } from "./post-payment-messages.js";
import { serviceNameForDoctorReminder } from "./post-payment-messages.js";
import {
  buildPortalBlock,
  buildPortalTextBlock,
  type PrePaymentEmailPortalAccess,
} from "./pre-payment-email-template.js";
import { wrapHtml } from "../../lib/email/templates.js";

type Lang = "en" | "pt" | "ro" | "cs" | "es";
export type PostPaymentEmailVariant =
  | "payment_confirmed"
  | "meeting_link"
  | "one_hour"
  | "session_start"
  | "appointment_updated";

const WHATSAPP_URL = "https://wa.me/353894715849";
const WHATSAPP_DISPLAY = "+353 89 471 5849";
const SUPPORT_EMAIL = "globalhealth@myglobalhealth.online";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function t(lang: Lang, map: Record<Lang, string>): string {
  return map[lang] ?? map.en;
}

function labels(lang: Lang) {
  return {
    dateTime: t(lang, {
      en: "Date and Time",
      pt: "Data e Hora",
      ro: "Data și ora",
      cs: "Datum a čas",
      es: "Fecha y hora",
    }),
    doctor: t(lang, {
      en: "Doctor",
      pt: "Médico",
      ro: "Doctor",
      cs: "Lékař",
      es: "Médico",
    }),
    service: t(lang, {
      en: "Service",
      pt: "Serviço",
      ro: "Serviciu",
      cs: "Služba",
      es: "Servicio",
    }),
    price: t(lang, {
      en: "Price",
      pt: "Preço",
      ro: "Preț",
      cs: "Cena",
      es: "Precio",
    }),
    meetingLink: t(lang, {
      en: "Meeting Link",
      pt: "Link da reunião",
      ro: "Link meeting",
      cs: "Odkaz na setkání",
      es: "Enlace de reunión",
    }),
    orderNo: t(lang, {
      en: "Order",
      pt: "Pedido",
      ro: "Comandă",
      cs: "Objednávka",
      es: "Pedido",
    }),
    contactLead: t(lang, {
      en: "If you have any questions, feel free to contact us at",
      pt: "Se tiver alguma dúvida, contacte-nos em",
      ro: "Dacă aveți întrebări, contactați-ne la",
      cs: "Máte-li dotazy, kontaktujte nás na",
      es: "Si tiene alguna pregunta, contáctenos en",
    }),
    reasonForChange: t(lang, {
      en: "Reason for change",
      pt: "Motivo da alteração",
      ro: "Motivul modificării",
      cs: "Důvod změny",
      es: "Motivo del cambio",
    }),
    whatsappLead: t(lang, {
      en: "or message us on WhatsApp",
      pt: "ou envie uma mensagem pelo WhatsApp",
      ro: "sau trimiteți-ne un mesaj pe WhatsApp",
      cs: "nebo nám napište na WhatsApp",
      es: "o envíenos un mensaje por WhatsApp",
    }),
    signOff: t(lang, {
      en: "Warm regards,",
      pt: "Atenciosamente,",
      ro: "Cu stimă,",
      cs: "S pozdravem,",
      es: "Saludos cordiales,",
    }),
    team: t(lang, {
      en: "The Global Health Team",
      pt: "A Equipa Global Health",
      ro: "Echipa Global Health",
      cs: "Tým Global Health",
      es: "El equipo de Global Health",
    }),
    dear: t(lang, {
      en: "Dear",
      pt: "Prezado(a)",
      ro: "Stimate",
      cs: "Vážený/á",
      es: "Estimado(a)",
    }),
    joinNow: t(lang, {
      en: "Join consultation",
      pt: "Entrar na consulta",
      ro: "Intră în consultație",
      cs: "Připojit se ke konzultaci",
      es: "Unirse a la consulta",
    }),
    patient: t(lang, {
      en: "Patient",
      pt: "Paciente",
      ro: "Pacient",
      cs: "Pacient",
      es: "Paciente",
    }),
    startTime: t(lang, {
      en: "Start Time",
      pt: "Hora de início",
      ro: "Ora de începere",
      cs: "Začátek",
      es: "Hora de inicio",
    }),
  };
}

function statusHeading(lang: Lang, variant: PostPaymentEmailVariant): string {
  if (variant === "appointment_updated") {
    return t(lang, {
      en: "UPDATED",
      pt: "ATUALIZADO",
      ro: "ACTUALIZAT",
      cs: "AKTUALIZOVÁNO",
      es: "ACTUALIZADO",
    });
  }
  if (variant === "one_hour" || variant === "session_start") {
    return t(lang, {
      en: "REMINDER",
      pt: "LEMBRETE",
      ro: "MEMENTO",
      cs: "PŘIPOMÍNKA",
      es: "RECORDATORIO",
    });
  }
  return t(lang, {
    en: "CONFIRMED",
    pt: "CONFIRMADO",
    ro: "CONFIRMAT",
    cs: "POTVRZENO",
    es: "CONFIRMADO",
  });
}

function introCopy(lang: Lang, variant: PostPaymentEmailVariant): string {
  if (variant === "appointment_updated") {
    return t(lang, {
      en: "Your appointment details have been updated. Please review the new date, doctor, and meeting link below.",
      pt: "Os detalhes da sua consulta foram atualizados. Reveja a nova data, médico e link abaixo.",
      ro: "Detaliile programării au fost actualizate. Verificați noua dată, medicul și linkul de mai jos.",
      cs: "Detaily vaší konzultace byly aktualizovány. Zkontrolujte nové datum, lékaře a odkaz níže.",
      es: "Los detalles de su cita han sido actualizados. Revise la nueva fecha, doctor y enlace a continuación.",
    });
  }
  if (variant === "payment_confirmed") {
    return t(lang, {
      en: "Payment received successfully. Your consultation has been confirmed. Meeting link will be sent shortly.",
      pt: "Pagamento recebido com sucesso. A sua consulta foi confirmada. O link da reunião será enviado em breve.",
      ro: "Plata a fost primită cu succes. Consultația a fost confirmată. Linkul de meeting va fi trimis în curând.",
      cs: "Platba byla úspěšně přijata. Vaše konzultace byla potvrzena. Odkaz na setkání bude brzy zaslán.",
      es: "Pago recibido correctamente. Su consulta ha sido confirmada. El enlace de la reunión se enviará en breve.",
    });
  }
  if (variant === "meeting_link") {
    return t(lang, {
      en: "Thank you for your payment. Your booking has now been confirmed. Please use the meeting link below to join your session.",
      pt: "Obrigado pelo seu pagamento. A sua marcação foi confirmada. Utilize o link abaixo para entrar na sessão.",
      ro: "Vă mulțumim pentru plată. Programarea dumneavoastră a fost confirmată. Folosiți linkul de mai jos pentru a intra.",
      cs: "Děkujeme za platbu. Vaše rezervace byla potvrzena. Pro připojení použijte odkaz níže.",
      es: "Gracias por su pago. Su reserva ha sido confirmada. Utilice el enlace siguiente para unirse.",
    });
  }
  if (variant === "one_hour") {
    return t(lang, {
      en: "Your appointment begins in one hour.",
      pt: "A sua consulta começa dentro de uma hora.",
      ro: "Programarea dumneavoastră începe peste o oră.",
      cs: "Vaše konzultace začíná za hodinu.",
      es: "Su cita comienza en una hora.",
    });
  }
  return t(lang, {
    en: "Your appointment begins in five minutes.",
    pt: "A sua consulta começa dentro de cinco minutos.",
    ro: "Programarea dumneavoastră începe peste cinci minute.",
    cs: "Vaše konzultace začíná za pět minut.",
    es: "Su cita comienza en cinco minutos.",
  });
}

function buildMeetLinkRow(lang: Lang, ctx: PostPaymentMessageContext): [string, string] {
  const L = labels(lang);
  return [
    L.meetingLink,
    `<a href="${esc(ctx.meetingLink)}" style="color:#1D4B36;word-break:break-all;">${esc(ctx.meetingLinkDisplay)}</a>`,
  ];
}

function buildJoinButton(lang: Lang, ctx: PostPaymentMessageContext): string {
  const L = labels(lang);
  return `<p style="margin:28px 0;text-align:center;">
         <a href="${esc(ctx.meetingLink)}"
            style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
           ${L.joinNow}
         </a>
       </p>`;
}

export function buildPostPaymentPatientEmailHtml(
  ctx: PostPaymentMessageContext,
  lang: Lang,
  variant: PostPaymentEmailVariant,
  logoSrc: string,
  portal?: PrePaymentEmailPortalAccess | null,
): string {
  const L = labels(lang);
  const greeting = `${L.dear} ${esc(ctx.patientName)}`;
  const intro = introCopy(lang, variant);
  const showPrice = variant === "payment_confirmed" || variant === "meeting_link";
  const showMeetLink =
    variant === "meeting_link" ||
    variant === "one_hour" ||
    variant === "session_start" ||
    variant === "appointment_updated";
  const showDoctor = variant !== "session_start";
  const showService =
    variant === "payment_confirmed" ||
    variant === "meeting_link" ||
    variant === "appointment_updated";
  const dateValue = ctx.appointmentDateTime;

  const rows: Array<[string, string]> = [
    [L.orderNo, `#${esc(ctx.orderNumber)}`],
    [L.dateTime, esc(dateValue)],
  ];
  if (showDoctor) {
    rows.push([L.doctor, esc(ctx.doctorName)]);
  }
  if (showService) {
    rows.push([L.service, esc(ctx.serviceName)]);
  }
  if (showPrice) {
    rows.push([L.price, esc(ctx.totalLabel)]);
  }
  if (showMeetLink && ctx.meetingLink) {
    rows.push(buildMeetLinkRow(lang, ctx));
  }
  if (variant === "appointment_updated" && ctx.changeReason?.trim()) {
    rows.push([L.reasonForChange, esc(ctx.changeReason.trim())]);
  }
  const detailTable = rows
    .map(
      ([label, value], i) => `<tr>
            <td style="padding:9px 2px;${i === 0 ? "" : "border-top:1px solid rgba(29,75,54,0.16);"}color:#6D6D6D;width:40%;font-weight:400;">${label}</td>
            <td style="padding:9px 2px;${i === 0 ? "" : "border-top:1px solid rgba(29,75,54,0.16);"}font-weight:600;color:#1D4B36;">${value}</td>
          </tr>`,
    )
    .join("\n          ");

  const actionBlock =
    (variant === "session_start" || variant === "one_hour") && ctx.meetingLink
      ? buildJoinButton(lang, ctx)
      : "";

  const portalBlock = portal ? buildPortalBlock(lang, portal) : "";

  const title = `#${esc(ctx.orderNumber)} · ${statusHeading(lang, variant)}`;

  return `<!doctype html><html><body style="margin:0;padding:0;background-color:#F6F8F1;">
<div style="background-color:#F6F8F1;padding:28px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2D3B36;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:100%;background-color:#ffffff;border:1px solid #E4E7DD;border-radius:20px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#15382A;background:linear-gradient(172deg,#1D4B36 0%,#15382A 55%,#0F2E25 100%);padding:34px 40px 30px;text-align:center;">
        <img src="${esc(logoSrc)}" alt="Global Health" width="160" style="display:block;max-width:160px;height:auto;margin:0 auto;" />
        <div style="margin-top:26px;font-family:'Cascadia Code',Consolas,Menlo,monospace;font-size:11px;letter-spacing:0.14em;color:#B0F122;text-transform:uppercase;">Global Health</div>
        <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;font-weight:700;color:rgba(255,255,255,0.95);letter-spacing:-0.01em;">${title}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 40px;line-height:1.65;font-size:15px;color:#2D3B36;">
        <p style="margin:0 0 16px;">${greeting},</p>
        <p style="margin:0 0 20px;">${intro}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
          ${detailTable}
        </table>
        ${actionBlock}
        ${portalBlock}
        <p style="font-size:14px;color:#2D3B36;margin:24px 0 0;">
          ${L.contactLead}
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#1D4B36;">${SUPPORT_EMAIL}</a>
          ${L.whatsappLead}
          <a href="${WHATSAPP_URL}" style="color:#1D4B36;font-weight:bold;">${WHATSAPP_DISPLAY}</a>.
        </p>
        <p style="margin:28px 0 0;font-size:14px;">
          ${L.signOff}<br/>
          <b>${L.team}</b>
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:22px 40px;background-color:#0B241C;font-size:12px;color:rgba(255,255,255,0.5);text-align:center;">
        <span style="color:rgba(255,255,255,0.5);">Medicine anytime, anywhere · </span>
        <a href="https://www.myglobalhealth.online" style="color:#B0F122;text-decoration:none;font-weight:600;">myglobalhealth.online</a>
      </td>
    </tr>
  </table>
</div>
</body></html>`;
}

export function buildPostPaymentPatientEmailText(
  ctx: PostPaymentMessageContext,
  lang: Lang,
  variant: PostPaymentEmailVariant,
  portal?: PrePaymentEmailPortalAccess | null,
): string {
  const L = labels(lang);
  const intro = introCopy(lang, variant);
  const lines = [`${ctx.patientName},`, "", intro, ""];
  if (
    variant === "payment_confirmed" ||
    variant === "meeting_link" ||
    variant === "appointment_updated"
  ) {
    lines.push(
      `${L.orderNo}: #${ctx.orderNumber}`,
      `${L.dateTime}: ${ctx.appointmentDateTime}`,
      `${L.doctor}: ${ctx.doctorName}`,
      `${L.service}: ${ctx.serviceName}`,
    );
    if (variant !== "appointment_updated") {
      lines.push(`${L.price}: ${ctx.totalLabel}`);
    }
    if (
      (variant === "meeting_link" || variant === "appointment_updated") &&
      ctx.meetingLink
    ) {
      lines.push(`${L.meetingLink}: ${ctx.meetingLink}`);
    }
    if (variant === "appointment_updated" && ctx.changeReason?.trim()) {
      lines.push(`${L.reasonForChange}: ${ctx.changeReason.trim()}`);
    }
  } else if (variant === "one_hour") {
    lines.push(
      `${L.doctor}: ${ctx.doctorName}`,
      `${L.dateTime}: ${ctx.appointmentDateTime}`,
      `${L.meetingLink}: ${ctx.meetingLink}`,
    );
  } else {
    lines.push(`${L.meetingLink}: ${ctx.meetingLink}`);
  }
  if (portal) {
    lines.push(buildPortalTextBlock(lang, portal));
  }
  lines.push("", "— Global Health");
  return lines.join("\n");
}

export function buildPostPaymentDoctorEmailHtml(
  ctx: PostPaymentMessageContext,
  lang: Lang,
  variant: "meeting_link" | "one_hour" | "session_start" | "appointment_updated" | "appointment_reassigned",
): string {
  const L = labels(lang);
  const service =
    variant === "one_hour"
      ? serviceNameForDoctorReminder(ctx.serviceName)
      : ctx.serviceName;

  const pairs: Array<[string, string]> = [[L.patient, esc(ctx.patientName)]];
  if (variant === "meeting_link" || variant === "appointment_updated") {
    pairs.push(
      ["Email", esc(ctx.patientEmail)],
      ["Phone", esc(ctx.patientPhone || "—")],
      [L.service, esc(service)],
      [L.dateTime, esc(ctx.appointmentDateTime)],
    );
  } else if (variant === "appointment_reassigned") {
    pairs.push([L.service, esc(service)], [L.dateTime, esc(ctx.appointmentDateTime)]);
  } else if (variant === "one_hour") {
    pairs.push([L.service, esc(service)], [L.startTime, esc(ctx.appointmentDateTime)]);
  }
  if (ctx.meetingLink && variant !== "appointment_reassigned") {
    pairs.push([
      L.meetingLink,
      `<a href="${esc(ctx.meetingLink)}" style="color:#1D4B36;">${esc(ctx.meetingLinkDisplay)}</a>`,
    ]);
  }
  if (
    (variant === "appointment_updated" || variant === "appointment_reassigned") &&
    ctx.changeReason?.trim()
  ) {
    pairs.push([L.reasonForChange, esc(ctx.changeReason.trim())]);
  }

  const rows: string[] = pairs.map(
    ([label, value], i) => `<tr>
    <td style="padding:9px 2px;${i === 0 ? "" : "border-top:1px solid rgba(29,75,54,0.16);"}color:#6D6D6D;width:40%;font-weight:400;">${label}</td>
    <td style="padding:9px 2px;${i === 0 ? "" : "border-top:1px solid rgba(29,75,54,0.16);"}font-weight:600;color:#1D4B36;">${value}</td>
  </tr>`,
  );

  if (variant === "appointment_reassigned") {
    rows.push(
      `<tr><td colspan="2" style="padding:9px 2px;border-top:1px solid rgba(29,75,54,0.16);">${t(lang, {
        en: "This appointment has been reassigned to another doctor.",
        pt: "Esta consulta foi reatribuída a outro médico.",
        ro: "Această programare a fost realocată altui medic.",
        cs: "Tato konzultace byla přeřazena jinému lékaři.",
        es: "Esta cita ha sido reasignada a otro doctor.",
      })}</td></tr>`,
    );
  }
  if (variant === "session_start") {
    rows.push(
      `<tr><td colspan="2" style="padding:9px 2px;border-top:1px solid rgba(29,75,54,0.16);">${t(lang, {
        en: "Your consultation starts in 5 minutes.",
        pt: "A sua consulta começa dentro de 5 minutos.",
        ro: "Consultația începe peste 5 minute.",
        cs: "Konzultace začíná za 5 minut.",
        es: "Su consulta comienza en 5 minutos.",
      })}</td></tr>`,
    );
  }

  const heading = t(lang, {
    en: {
      meeting_link: "New appointment",
      one_hour: "Appointment in 1 hour",
      session_start: "Appointment starting",
      appointment_updated: "Appointment updated",
      appointment_reassigned: "Appointment reassigned",
    }[variant],
    pt: {
      meeting_link: "Nova consulta",
      one_hour: "Consulta dentro de 1 hora",
      session_start: "Consulta a começar",
      appointment_updated: "Consulta atualizada",
      appointment_reassigned: "Consulta reatribuída",
    }[variant],
    ro: {
      meeting_link: "Programare nouă",
      one_hour: "Programare într-o oră",
      session_start: "Programarea începe",
      appointment_updated: "Programare actualizată",
      appointment_reassigned: "Programare realocată",
    }[variant],
    cs: {
      meeting_link: "Nová konzultace",
      one_hour: "Konzultace za 1 hodinu",
      session_start: "Konzultace začíná",
      appointment_updated: "Konzultace upravena",
      appointment_reassigned: "Konzultace přeřazena",
    }[variant],
    es: {
      meeting_link: "Nueva cita",
      one_hour: "Cita en 1 hora",
      session_start: "La cita comienza",
      appointment_updated: "Cita actualizada",
      appointment_reassigned: "Cita reasignada",
    }[variant],
  });

  return wrapHtml(
    heading,
    `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
    ${rows.join("\n    ")}
  </table>`,
  );
}

export function buildPostPaymentDoctorEmailText(
  ctx: PostPaymentMessageContext,
  lang: Lang,
  variant: "meeting_link" | "one_hour" | "session_start" | "appointment_updated" | "appointment_reassigned",
): string {
  const L = labels(lang);
  const service =
    variant === "one_hour"
      ? serviceNameForDoctorReminder(ctx.serviceName)
      : ctx.serviceName;
  const lines: string[] = [`${L.patient}: ${ctx.patientName}`];
  if (variant === "meeting_link" || variant === "appointment_updated") {
    lines.push(
      `Email: ${ctx.patientEmail}`,
      `Phone: ${ctx.patientPhone || "—"}`,
      `${L.service}: ${service}`,
      `${L.dateTime}: ${ctx.appointmentDateTime}`,
    );
  } else if (variant === "appointment_reassigned") {
    lines.push(`${L.service}: ${service}`, `${L.dateTime}: ${ctx.appointmentDateTime}`);
  } else if (variant === "one_hour") {
    lines.push(`${L.service}: ${service}`, `${L.startTime}: ${ctx.appointmentDateTime}`);
  }
  if (ctx.meetingLink && variant !== "appointment_reassigned") {
    lines.push(`${L.meetingLink}: ${ctx.meetingLink}`);
  }
  if (
    (variant === "appointment_updated" || variant === "appointment_reassigned") &&
    ctx.changeReason?.trim()
  ) {
    lines.push(`${L.reasonForChange}: ${ctx.changeReason.trim()}`);
  }
  if (variant === "appointment_reassigned") {
    lines.push("This appointment has been reassigned to another doctor.");
  }
  if (variant === "session_start") {
    lines.push("Consultation starts in 5 minutes.");
  }
  return lines.join("\n");
}
