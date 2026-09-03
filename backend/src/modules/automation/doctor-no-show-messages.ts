import { wrapHtml } from "../../lib/email/templates.js";

export type DoctorNoShowLang = "en" | "pt" | "ro" | "cs" | "es";
type Lang = DoctorNoShowLang;

export type DoctorNoShowMessageContext = {
  doctorName: string;
  serviceName: string;
  meetingUrl: string;
};

function t(lang: Lang, map: Record<Lang, string>): string {
  return map[lang] ?? map.en;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function doctorNoShowEmailSubject(lang: Lang): string {
  return t(lang, {
    en: "Your patient is waiting — join your Global Health consultation",
    pt: "O seu paciente está à espera — aceda à sua consulta Global Health",
    ro: "Pacientul dumneavoastră așteaptă — accesați consultația Global Health",
    cs: "Váš pacient čeká — připojte se ke konzultaci Global Health",
    es: "Su paciente está esperando — acceda a su consulta Global Health",
  });
}

function bodyLead(ctx: DoctorNoShowMessageContext, lang: Lang): string {
  return t(lang, {
    en: `Your ${ctx.serviceName} consultation has started and your patient is waiting, but we haven't detected you in the Google Meet yet. Please join now.`,
    pt: `A sua consulta de ${ctx.serviceName} já começou e o paciente está à espera, mas ainda não o detetámos no Google Meet. Por favor, junte-se agora.`,
    ro: `Consultația dumneavoastră de ${ctx.serviceName} a început, iar pacientul așteaptă, dar nu v-am detectat încă în Google Meet. Vă rugăm să intrați acum.`,
    cs: `Vaše konzultace ${ctx.serviceName} již začala a pacient čeká, ale zatím jsme vás nezaznamenali v Google Meet. Připojte se prosím nyní.`,
    es: `Su consulta de ${ctx.serviceName} ya ha comenzado y el paciente está esperando, pero aún no le hemos detectado en Google Meet. Únase ahora, por favor.`,
  });
}

export function doctorNoShowWhatsAppMessage(ctx: DoctorNoShowMessageContext, lang: Lang): string {
  const greeting = t(lang, {
    en: `Hi ${ctx.doctorName},`,
    pt: `Olá ${ctx.doctorName},`,
    ro: `Bună ${ctx.doctorName},`,
    cs: `Dobrý den ${ctx.doctorName},`,
    es: `Hola ${ctx.doctorName},`,
  });
  const joinLabel = t(lang, {
    en: "Join now",
    pt: "Aceder agora",
    ro: "Intrați acum",
    cs: "Připojit se nyní",
    es: "Acceder ahora",
  });
  const sign = t(lang, {
    en: "Global Health Team",
    pt: "Equipa Global Health",
    ro: "Echipa Global Health",
    cs: "Tým Global Health",
    es: "Equipo Global Health",
  });
  return `${greeting}\n${bodyLead(ctx, lang)}\n🔗 ${joinLabel}: ${ctx.meetingUrl}\n${sign}`;
}

export function doctorNoShowEmailText(ctx: DoctorNoShowMessageContext, lang: Lang): string {
  const greeting = t(lang, {
    en: `Hi ${ctx.doctorName},`,
    pt: `Olá ${ctx.doctorName},`,
    ro: `Bună ${ctx.doctorName},`,
    cs: `Dobrý den ${ctx.doctorName},`,
    es: `Hola ${ctx.doctorName},`,
  });
  const joinLabel = t(lang, {
    en: "Join your consultation",
    pt: "Aceder à consulta",
    ro: "Accesați consultația",
    cs: "Připojit se ke konzultaci",
    es: "Acceder a la consulta",
  });
  const sign = t(lang, {
    en: "— Global Health",
    pt: "— Global Health",
    ro: "— Global Health",
    cs: "— Global Health",
    es: "— Global Health",
  });
  return `${greeting}\n\n${bodyLead(ctx, lang)}\n\n${joinLabel}:\n${ctx.meetingUrl}\n\n${sign}`;
}

export function doctorNoShowEmailHtml(ctx: DoctorNoShowMessageContext, lang: Lang): string {
  const greeting = t(lang, {
    en: `Hi ${ctx.doctorName},`,
    pt: `Olá ${ctx.doctorName},`,
    ro: `Bună ${ctx.doctorName},`,
    cs: `Dobrý den ${ctx.doctorName},`,
    es: `Hola ${ctx.doctorName},`,
  });
  const joinLabel = t(lang, {
    en: "Join consultation",
    pt: "Aceder à consulta",
    ro: "Accesați consultația",
    cs: "Připojit se ke konzultaci",
    es: "Acceder a la consulta",
  });
  const title = t(lang, {
    en: "Your patient is waiting",
    pt: "O seu paciente está à espera",
    ro: "Pacientul dumneavoastră așteaptă",
    cs: "Váš pacient čeká",
    es: "Su paciente está esperando",
  });
  return wrapHtml(
    title,
    `<p>${esc(greeting)}</p>
     <p>${esc(bodyLead(ctx, lang))}</p>
     <p style="margin:24px 0;text-align:center;"><a href="${esc(ctx.meetingUrl)}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">${esc(joinLabel)}</a></p>`,
  );
}
