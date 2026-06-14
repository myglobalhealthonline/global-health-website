import type { PostPaymentMessageContext } from "./post-payment-messages.js";
import { serviceNameForDoctorReminder } from "./post-payment-messages.js";
import {
  buildPortalBlock,
  buildPortalTextBlock,
  type PrePaymentEmailPortalAccess,
} from "./pre-payment-email-template.js";

type Lang = "en" | "pt" | "ro" | "cs" | "es";
export type PostPaymentEmailVariant =
  | "payment_confirmed"
  | "meeting_link"
  | "one_hour"
  | "session_start";

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

function buildMeetLinkRow(lang: Lang, ctx: PostPaymentMessageContext): string {
  const L = labels(lang);
  return `<tr>
            <td><b>${L.meetingLink}:</b></td>
            <td><a href="${esc(ctx.meetingLink)}" style="color:#2d4f3d;word-break:break-all;">${esc(ctx.meetingLinkDisplay)}</a></td>
          </tr>`;
}

function buildJoinButton(lang: Lang, ctx: PostPaymentMessageContext): string {
  const L = labels(lang);
  return `<p style="margin:28px 0;text-align:center;">
         <a href="${esc(ctx.meetingLink)}"
            style="background-color:#2d4f3d;color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">
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
  const showMeetLink = variant === "meeting_link" || variant === "one_hour" || variant === "session_start";
  const showDoctor = variant !== "session_start";
  const showService = variant === "payment_confirmed" || variant === "meeting_link";
  const dateValue =
    variant === "payment_confirmed" || variant === "meeting_link"
      ? ctx.appointmentDateTime
      : ctx.appointmentDate;

  const rows = [
    `<tr><td style="width:38%;vertical-align:top;"><b>${L.orderNo}:</b></td><td>#${esc(ctx.orderNumber)}</td></tr>`,
    `<tr><td><b>${L.dateTime}:</b></td><td>${esc(dateValue)}</td></tr>`,
  ];
  if (showDoctor) {
    rows.push(`<tr><td><b>${L.doctor}:</b></td><td>${esc(ctx.doctorName)}</td></tr>`);
  }
  if (showService) {
    rows.push(`<tr><td><b>${L.service}:</b></td><td>${esc(ctx.serviceName)}</td></tr>`);
  }
  if (showPrice) {
    rows.push(`<tr><td><b>${L.price}:</b></td><td>${esc(ctx.totalLabel)}</td></tr>`);
  }
  if (showMeetLink && ctx.meetingLink) {
    rows.push(buildMeetLinkRow(lang, ctx));
  }

  const actionBlock =
    (variant === "session_start" || variant === "one_hour") && ctx.meetingLink
      ? buildJoinButton(lang, ctx)
      : "";

  const portalBlock = portal ? buildPortalBlock(lang, portal) : "";

  return `<div style="background-color:#f4f1ea;padding:20px;font-family:Georgia,'Times New Roman',serif;color:#333;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.1);max-width:100%;">
    <tr>
      <td align="center" style="background-color:#2d4f3d;padding:30px;">
        <img src="${esc(logoSrc)}" alt="Global Health" width="180" style="display:block;max-width:180px;height:auto;" />
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:25px 20px;border-bottom:1px solid #eeeeee;">
        <h2 style="color:#2d4f3d;letter-spacing:2px;margin:0;font-size:22px;font-weight:700;">
          #${esc(ctx.orderNumber)} &nbsp;·&nbsp; ${statusHeading(lang, variant)}
        </h2>
      </td>
    </tr>
    <tr>
      <td style="padding:40px;line-height:1.6;font-size:15px;">
        <p style="margin:0 0 16px;">${greeting},</p>
        <p style="margin:0 0 20px;">${intro}</p>
        <table width="100%" cellpadding="8" cellspacing="0" style="background-color:#fafaf8;border-radius:5px;font-size:14px;">
          ${rows.join("\n          ")}
        </table>
        ${actionBlock}
        ${portalBlock}
        <p style="font-size:14px;color:#444;margin:24px 0 0;">
          ${L.contactLead}
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d4f3d;">${SUPPORT_EMAIL}</a>
          ${L.whatsappLead}
          <a href="${WHATSAPP_URL}" style="color:#2d4f3d;font-weight:bold;">${WHATSAPP_DISPLAY}</a>.
        </p>
        <p style="margin:28px 0 0;font-size:14px;">
          ${L.signOff}<br/>
          <b>${L.team}</b>
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:24px;background-color:#fafaf8;border-top:1px solid #eeeeee;font-size:12px;color:#777;">
        <a href="https://www.myglobalhealth.online" style="color:#2d4f3d;text-decoration:none;font-weight:bold;">www.myglobalhealth.online</a>
      </td>
    </tr>
  </table>
</div>`;
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
  if (variant === "payment_confirmed" || variant === "meeting_link") {
    lines.push(
      `${L.orderNo}: #${ctx.orderNumber}`,
      `${L.dateTime}: ${ctx.appointmentDateTime}`,
      `${L.doctor}: ${ctx.doctorName}`,
      `${L.service}: ${ctx.serviceName}`,
      `${L.price}: ${ctx.totalLabel}`,
    );
    if (variant === "meeting_link" && ctx.meetingLink) {
      lines.push(`${L.meetingLink}: ${ctx.meetingLink}`);
    }
  } else if (variant === "one_hour") {
    lines.push(
      `${L.doctor}: ${ctx.doctorName}`,
      `${L.dateTime}: ${ctx.appointmentDate}`,
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
  variant: "meeting_link" | "one_hour" | "session_start",
): string {
  const L = labels(lang);
  const service =
    variant === "one_hour"
      ? serviceNameForDoctorReminder(ctx.serviceName)
      : ctx.serviceName;

  const rows: string[] = [
    `<tr><td style="width:38%;"><b>${L.patient}:</b></td><td>${esc(ctx.patientName)}</td></tr>`,
  ];
  if (variant === "meeting_link") {
    rows.push(
      `<tr><td><b>Email:</b></td><td>${esc(ctx.patientEmail)}</td></tr>`,
      `<tr><td><b>Phone:</b></td><td>${esc(ctx.patientPhone || "—")}</td></tr>`,
      `<tr><td><b>${L.service}:</b></td><td>${esc(service)}</td></tr>`,
      `<tr><td><b>${L.dateTime}:</b></td><td>${esc(ctx.appointmentDateTime)}</td></tr>`,
    );
  } else if (variant === "one_hour") {
    rows.push(
      `<tr><td><b>${L.service}:</b></td><td>${esc(service)}</td></tr>`,
      `<tr><td><b>${L.startTime}:</b></td><td>${esc(ctx.appointmentDate)}</td></tr>`,
    );
  }
  if (ctx.meetingLink) {
    rows.push(
      `<tr><td><b>${L.meetingLink}:</b></td><td><a href="${esc(ctx.meetingLink)}" style="color:#2d4f3d;">${esc(ctx.meetingLinkDisplay)}</a></td></tr>`,
    );
  }
  if (variant === "session_start") {
    rows.push(
      `<tr><td colspan="2" style="padding-top:12px;">${t(lang, {
        en: "Your consultation starts in 5 minutes.",
        pt: "A sua consulta começa dentro de 5 minutos.",
        ro: "Consultația începe peste 5 minute.",
        cs: "Konzultace začíná za 5 minut.",
        es: "Su consulta comienza en 5 minutos.",
      })}</td></tr>`,
    );
  }

  return `<div style="font-family:Georgia,serif;color:#333;line-height:1.6;font-size:15px;">
  <table width="100%" cellpadding="8" cellspacing="0" style="background:#fafaf8;border-radius:5px;">
    ${rows.join("\n    ")}
  </table>
</div>`;
}

export function buildPostPaymentDoctorEmailText(
  ctx: PostPaymentMessageContext,
  lang: Lang,
  variant: "meeting_link" | "one_hour" | "session_start",
): string {
  const L = labels(lang);
  const service =
    variant === "one_hour"
      ? serviceNameForDoctorReminder(ctx.serviceName)
      : ctx.serviceName;
  const lines: string[] = [`${L.patient}: ${ctx.patientName}`];
  if (variant === "meeting_link") {
    lines.push(
      `Email: ${ctx.patientEmail}`,
      `Phone: ${ctx.patientPhone || "—"}`,
      `${L.service}: ${service}`,
      `${L.dateTime}: ${ctx.appointmentDateTime}`,
    );
  } else if (variant === "one_hour") {
    lines.push(`${L.service}: ${service}`, `${L.startTime}: ${ctx.appointmentDate}`);
  }
  if (ctx.meetingLink) {
    lines.push(`${L.meetingLink}: ${ctx.meetingLink}`);
  }
  if (variant === "session_start") {
    lines.push("Consultation starts in 5 minutes.");
  }
  return lines.join("\n");
}
