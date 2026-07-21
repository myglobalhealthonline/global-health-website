import type { PrePaymentMessageContext } from "./pre-payment-messages.js";

type Lang = "en" | "pt" | "ro" | "cs" | "es";
export type PrePaymentEmailVariant = "initial" | "reminder" | "final" | "cancelled";

export type PrePaymentEmailPortalAccess = {
  setPasswordUrl: string;
  tempPassword: string | null;
  signInUrl: string;
};

/**
 * The credit note attached to a "cancelled" email. Only manual/AI bookings carry
 * an invoice before payment, so only they get one — see generateCreditNoteForOrder.
 */
export type CancellationCreditNoteRef = {
  /** The credit note's own number (CN-IE-00007). */
  creditNoteNumber: string;
  /** The invoice number it voids (IE-00042). */
  invoiceNumber: string;
};

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


function statusHeading(lang: Lang): string {
  return t(lang, {
    en: "RESERVED",
    pt: "RESERVADO",
    ro: "REZERVAT",
    cs: "REZERVOVÁNO",
    es: "RESERVADO",
  });
}

function creditNoteCopy(lang: Lang, cn: CancellationCreditNoteRef): string {
  return t(lang, {
    en: `Invoice ${cn.invoiceNumber} has been cancelled. Credit note ${cn.creditNoteNumber} is attached to this email. No payment was taken.`,
    pt: `A fatura ${cn.invoiceNumber} foi anulada. A nota de crédito ${cn.creditNoteNumber} está anexada a este e-mail. Não foi efetuado qualquer pagamento.`,
    ro: `Factura ${cn.invoiceNumber} a fost anulată. Nota de credit ${cn.creditNoteNumber} este atașată acestui e-mail. Nu a fost efectuată nicio plată.`,
    cs: `Faktura ${cn.invoiceNumber} byla stornována. Dobropis ${cn.creditNoteNumber} je přiložen k tomuto e-mailu. Žádná platba nebyla stržena.`,
    es: `La factura ${cn.invoiceNumber} ha sido anulada. La nota de crédito ${cn.creditNoteNumber} está adjunta a este correo. No se realizó ningún cobro.`,
  });
}

function introCopy(lang: Lang, variant: PrePaymentEmailVariant): string {
  if (variant === "cancelled") {
    return t(lang, {
      en: "Your consultation reservation has been cancelled because payment was not received before the deadline.",
      pt: "A sua reserva de consulta foi cancelada porque o pagamento não foi recebido antes do prazo.",
      ro: "Rezervarea consultației a fost anulată deoarece plata nu a fost primită înainte de termen.",
      cs: "Vaše rezervace konzultace byla zrušena, protože platba nebyla přijata před termínem.",
      es: "Su reserva de consulta ha sido cancelada porque no se recibió el pago antes de la fecha límite.",
    });
  }
  if (variant === "final") {
    return t(lang, {
      en: "This is a final reminder. Your reservation will be cancelled unless payment is completed before the deadline below.",
      pt: "Este é um aviso final. A sua reserva será cancelada se o pagamento não for concluído antes do prazo abaixo.",
      ro: "Acesta este un memento final. Rezervarea va fi anulată dacă plata nu este finalizată înainte de termen.",
      cs: "Toto je poslední připomínka. Rezervace bude zrušena, pokud platba nebude dokončena před termínem níže.",
      es: "Este es un recordatorio final. Su reserva será cancelada si no completa el pago antes de la fecha límite.",
    });
  }
  if (variant === "reminder") {
    return t(lang, {
      en: "Payment is still outstanding for your reserved consultation. Please complete payment before the deadline below.",
      pt: "O pagamento da sua consulta reservada ainda está pendente. Conclua o pagamento antes do prazo abaixo.",
      ro: "Plata pentru consultația rezervată este încă restantă. Finalizați plata înainte de termenul de mai jos.",
      cs: "Platba za vaši rezervovanou konzultaci stále chybí. Dokončete platbu před termínem níže.",
      es: "El pago de su consulta reservada sigue pendiente. Complete el pago antes de la fecha límite.",
    });
  }
  return t(lang, {
    en: "Thank you for choosing Global Health. Your consultation has been reserved. Payment is required to confirm your appointment.",
    pt: "Obrigado por escolher a Global Health. A sua consulta foi reservada. É necessário pagamento para confirmar a marcação.",
    ro: "Vă mulțumim că ați ales Global Health. Consultația a fost rezervată. Plata este necesară pentru confirmare.",
    cs: "Děkujeme, že jste si vybrali Global Health. Vaše konzultace byla rezervována. K potvrzení je nutná platba.",
    es: "Gracias por elegir Global Health. Su consulta ha sido reservada. Se requiere pago para confirmar la cita.",
  });
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
    deadline: t(lang, {
      en: "Payment deadline",
      pt: "Prazo de pagamento",
      ro: "Termen de plată",
      cs: "Termín platby",
      es: "Fecha límite de pago",
    }),
    orderNo: t(lang, {
      en: "Order",
      pt: "Pedido",
      ro: "Comandă",
      cs: "Objednávka",
      es: "Pedido",
    }),
    payButton: t(lang, {
      en: "Complete payment",
      pt: "Concluir pagamento",
      ro: "Finalizați plata",
      cs: "Dokončit platbu",
      es: "Completar pago",
    }),
    payLink: t(lang, {
      en: "Secure payment link",
      pt: "Link de pagamento seguro",
      ro: "Link securizat de plată",
      cs: "Bezpečný platební odkaz",
      es: "Enlace de pago seguro",
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
    portalHeading: t(lang, {
      en: "Access your patient portal",
      pt: "Aceda ao portal do paciente",
      ro: "Accesați portalul pacientului",
      cs: "Přístup k portálu pacienta",
      es: "Acceda al portal del paciente",
    }),
    portalLead: t(lang, {
      en: "Sign in to view your booking and manage your care.",
      pt: "Inicie sessão para ver a marcação e gerir os seus cuidados.",
      ro: "Conectați-vă pentru a vedea programarea și a vă gestiona îngrijirea.",
      cs: "Přihlaste se pro zobrazení rezervace a správu péče.",
      es: "Inicie sesión para ver su cita y gestionar su atención.",
    }),
    setPasswordButton: t(lang, {
      en: "Set your password",
      pt: "Definir palavra-passe",
      ro: "Setați parola",
      cs: "Nastavit heslo",
      es: "Establecer contraseña",
    }),
    setPasswordHint: t(lang, {
      en: "recommended - link valid 7 days",
      pt: "recomendado - link válido 7 dias",
      ro: "recomandat - link valabil 7 zile",
      cs: "doporučeno - odkaz platí 7 dní",
      es: "recomendado - enlace válido 7 días",
    }),
    tempPasswordLead: t(lang, {
      en: "Or sign in now with this temporary password (you will be asked to change it on first login):",
      pt: "Ou inicie sessão com esta palavra-passe temporária (será pedido que a altere no primeiro acesso):",
      ro: "Sau conectați-vă cu această parolă temporară (vi se va cere să o schimbați la prima autentificare):",
      cs: "Nebo se přihlaste dočasným heslem (při prvním přihlášení budete požádáni o změnu):",
      es: "O inicie sesión con esta contraseña temporal (se le pedirá cambiarla en el primer acceso):",
    }),
    existingAccountLead: t(lang, {
      en: "If you already have an account, sign in with your existing password.",
      pt: "Se já tem conta, inicie sessão com a sua palavra-passe habitual.",
      ro: "Dacă aveți deja cont, conectați-vă cu parola existentă.",
      cs: "Pokud již máte účet, přihlaste se stávajícím heslem.",
      es: "Si ya tiene cuenta, inicie sesión con su contraseña habitual.",
    }),
    signInButton: t(lang, {
      en: "Sign in to portal",
      pt: "Iniciar sessão no portal",
      ro: "Conectare la portal",
      cs: "Přihlásit se do portálu",
      es: "Iniciar sesión en el portal",
    }),
    bookingRef: t(lang, {
      en: "Booking",
      pt: "Marcação",
      ro: "Programare",
      cs: "Rezervace",
      es: "Reserva",
    }),
  };
}

export function manualBookingPaymentDeadlineLabel(lang: Lang): string {
  return t(lang, {
    en: "Complete payment to confirm your appointment",
    pt: "Conclua o pagamento para confirmar a consulta",
    ro: "Finalizați plata pentru a confirma programarea",
    cs: "Dokončete platbu pro potvrzení termínu",
    es: "Complete el pago para confirmar su cita",
  });
}

export function buildPortalBlock(lang: Lang, portal: PrePaymentEmailPortalAccess): string {
  const L = labels(lang);
  const tempBlock = portal.tempPassword
    ? `<p style="margin:16px 0;font-size:14px;color:#2D3B36;">
         ${L.tempPasswordLead}<br/>
         <code style="display:inline-block;margin-top:8px;padding:8px 12px;background:#F6F8F1;border-radius:6px;font-size:15px;font-weight:700;letter-spacing:1px;color:#1D4B36;">${esc(portal.tempPassword)}</code>
       </p>`
    : `<p style="margin:16px 0;font-size:14px;color:#2D3B36;">${L.existingAccountLead}</p>`;

  return `<h3 style="margin:32px 0 12px;color:#1D4B36;font-size:17px;">${L.portalHeading}</h3>
        <p style="margin:0 0 16px;font-size:14px;color:#2D3B36;">${L.portalLead}</p>
        <p style="margin:16px 0;text-align:center;">
          <a href="${esc(portal.setPasswordUrl)}"
             style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
            ${L.setPasswordButton}
          </a>
        </p>
        <p style="font-size:12px;color:#6D6D6D;text-align:center;margin:0 0 20px;">${L.setPasswordHint}</p>
        ${tempBlock}
        <p style="margin:16px 0;text-align:center;">
          <a href="${esc(portal.signInUrl)}"
             style="color:#1D4B36;font-weight:700;text-decoration:underline;">
            ${L.signInButton}
          </a>
        </p>`;
}

export function buildPortalTextBlock(lang: Lang, portal: PrePaymentEmailPortalAccess): string {
  const L = labels(lang);
  const lines = [
    "",
    L.portalHeading,
    L.portalLead,
    `${L.setPasswordButton}: ${portal.setPasswordUrl}`,
    `(${L.setPasswordHint})`,
  ];
  if (portal.tempPassword) {
    lines.push(L.tempPasswordLead, portal.tempPassword);
  } else {
    lines.push(L.existingAccountLead);
  }
  lines.push(`${L.signInButton}: ${portal.signInUrl}`);
  return lines.join("\n");
}

export function splitPatientName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "there", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function resolvePatientFullName(
  orderFullName: string | null | undefined,
  itemFullName?: string | null,
): string {
  const name = orderFullName?.trim() || itemFullName?.trim();
  return name && name.length > 0 ? name : "Patient";
}

export function formatOrderTotal(cents: number, currencyCode: string): string {
  const code = currencyCode.toUpperCase();
  const amount = (cents / 100).toFixed(2);
  if (code === "EUR") return `€${amount}`;
  if (code === "CZK") return `${amount} Kč`;
  if (code === "BRL") return `R$${amount}`;
  if (code === "RON") return `${amount} lei`;
  return `${code} ${amount}`;
}

export function buildPrePaymentEmailHtml(
  ctx: PrePaymentMessageContext,
  lang: Lang,
  variant: PrePaymentEmailVariant,
  logoSrc: string,
  portal?: PrePaymentEmailPortalAccess | null,
  refLabel?: "order" | "booking",
  creditNote?: CancellationCreditNoteRef | null,
): string {
  const L = labels(lang);
  const refKey = refLabel === "booking" ? L.bookingRef : L.orderNo;
  const greeting = `${L.dear} ${esc(ctx.patientName)}`;
  const intro = introCopy(lang, variant);
  const showPayment = variant !== "cancelled" && Boolean(ctx.paymentLink?.trim());

  const creditNoteBlock =
    variant === "cancelled" && creditNote
      ? `<p style="margin:20px 0 0;font-size:14px;color:#444;">${esc(creditNoteCopy(lang, creditNote))}</p>`
      : "";

  const payBlock = showPayment
    ? `<p style="margin:28px 0;text-align:center;">
         <a href="${esc(ctx.paymentLink)}"
            style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
           ${L.payButton}
         </a>
       </p>`
    : "";

  const portalBlock =
    variant !== "cancelled" && portal ? buildPortalBlock(lang, portal) : "";

  const detailRows: Array<[string, string]> = [
    [refKey, `#${esc(ctx.orderNumber)}`],
    [L.dateTime, esc(ctx.appointmentDate)],
    [L.doctor, esc(ctx.doctorName)],
    [L.service, esc(ctx.serviceName)],
    [L.price, esc(ctx.totalLabel)],
    [L.deadline, esc(ctx.deadline)],
  ];
  const detailTable = detailRows
    .map(
      ([label, value], i) => `<tr>
            <td style="padding:9px 2px;${i === 0 ? "" : "border-top:1px solid rgba(29,75,54,0.16);"}color:#6D6D6D;width:40%;font-weight:400;">${label}</td>
            <td style="padding:9px 2px;${i === 0 ? "" : "border-top:1px solid rgba(29,75,54,0.16);"}font-weight:600;color:#1D4B36;">${value}</td>
          </tr>`,
    )
    .join("\n          ");

  const title = `#${esc(ctx.orderNumber)} · ${statusHeading(lang)}`;

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
        ${payBlock}
        ${portalBlock}
        ${creditNoteBlock}
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

export function buildPrePaymentEmailText(
  ctx: PrePaymentMessageContext,
  lang: Lang,
  variant: PrePaymentEmailVariant,
  portal?: PrePaymentEmailPortalAccess | null,
  refLabel?: "order" | "booking",
  creditNote?: CancellationCreditNoteRef | null,
): string {
  const intro = introCopy(lang, variant);
  const L = labels(lang);
  const refKey = refLabel === "booking" ? L.bookingRef : L.orderNo;
  const lines = [
    `${ctx.patientName},`,
    "",
    intro,
    "",
    `${refKey}: #${ctx.orderNumber}`,
    `${L.dateTime}: ${ctx.appointmentDate}`,
    `${L.doctor}: ${ctx.doctorName}`,
    `${L.service}: ${ctx.serviceName}`,
    `${L.price}: ${ctx.totalLabel}`,
    `${L.deadline}: ${ctx.deadline}`,
  ];
  if (variant !== "cancelled" && ctx.paymentLink?.trim()) {
    lines.push("", `${L.payButton}: ${ctx.paymentLink}`);
  }
  if (variant !== "cancelled" && portal) {
    lines.push(buildPortalTextBlock(lang, portal));
  }
  if (variant === "cancelled" && creditNote) {
    lines.push("", creditNoteCopy(lang, creditNote));
  }
  lines.push("", "— Global Health");
  return lines.join("\n");
}
