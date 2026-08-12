import { wrapHtml } from "../../lib/email/templates.js";

export type DoctorReadyLang = "en" | "pt" | "ro" | "cs" | "es";
type Lang = DoctorReadyLang;

export type DoctorReadyMessageContext = {
  patientName: string;
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

export function doctorReadyEmailSubject(lang: Lang): string {
  return t(lang, {
    en: "Your doctor is ready for you — Global Health",
    pt: "O seu médico já está disponível — Global Health",
    ro: "Medicul dumneavoastră vă așteaptă — Global Health",
    cs: "Váš lékař je připraven — Global Health",
    es: "Su médico ya está disponible — Global Health",
  });
}

function bodyLead(ctx: DoctorReadyMessageContext, lang: Lang): string {
  return t(lang, {
    en: `Dr. ${ctx.doctorName} is already in the consultation room and ready for your ${ctx.serviceName} appointment. Please join whenever you're ready.`,
    pt: `O(a) Dr(a). ${ctx.doctorName} já está na sala de consulta e disponível para a sua consulta de ${ctx.serviceName}. Por favor, junte-se quando estiver pronto(a).`,
    ro: `Dr. ${ctx.doctorName} este deja în sala de consultație și vă așteaptă pentru programarea de ${ctx.serviceName}. Vă rugăm să intrați când sunteți pregătit(ă).`,
    cs: `Dr. ${ctx.doctorName} je již v konzultační místnosti a připraven na vaši konzultaci ${ctx.serviceName}. Připojte se, jakmile budete připraveni.`,
    es: `El/la Dr(a). ${ctx.doctorName} ya está en la sala de consulta y disponible para su cita de ${ctx.serviceName}. Únase cuando esté listo/a.`,
  });
}

export function doctorReadyWhatsAppMessage(ctx: DoctorReadyMessageContext, lang: Lang): string {
  const greeting = t(lang, {
    en: `Hi ${ctx.patientName},`,
    pt: `Olá ${ctx.patientName},`,
    ro: `Bună ${ctx.patientName},`,
    cs: `Dobrý den ${ctx.patientName},`,
    es: `Hola ${ctx.patientName},`,
  });
  const joinLabel = t(lang, {
    en: "Join your consultation",
    pt: "Aceder à consulta",
    ro: "Accesați consultația",
    cs: "Připojit se ke konzultaci",
    es: "Acceder a la consulta",
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

export function doctorReadyEmailText(ctx: DoctorReadyMessageContext, lang: Lang): string {
  const greeting = t(lang, {
    en: `Hi ${ctx.patientName},`,
    pt: `Olá ${ctx.patientName},`,
    ro: `Bună ${ctx.patientName},`,
    cs: `Dobrý den ${ctx.patientName},`,
    es: `Hola ${ctx.patientName},`,
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

export function doctorReadyEmailHtml(ctx: DoctorReadyMessageContext, lang: Lang): string {
  const greeting = t(lang, {
    en: `Hi ${ctx.patientName},`,
    pt: `Olá ${ctx.patientName},`,
    ro: `Bună ${ctx.patientName},`,
    cs: `Dobrý den ${ctx.patientName},`,
    es: `Hola ${ctx.patientName},`,
  });
  const joinLabel = t(lang, {
    en: "Join consultation",
    pt: "Aceder à consulta",
    ro: "Accesați consultația",
    cs: "Připojit se ke konzultaci",
    es: "Acceder a la consulta",
  });
  const title = t(lang, {
    en: "Your doctor is ready",
    pt: "O seu médico está disponível",
    ro: "Medicul dumneavoastră vă așteaptă",
    cs: "Váš lékař je připraven",
    es: "Su médico ya está disponible",
  });
  return wrapHtml(
    title,
    `<p>${esc(greeting)}</p>
     <p>${esc(bodyLead(ctx, lang))}</p>
     <p style="margin:24px 0;text-align:center;"><a href="${esc(ctx.meetingUrl)}" style="background:#B0F122;color:#0a1f14;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;">${esc(joinLabel)}</a></p>`,
  );
}
