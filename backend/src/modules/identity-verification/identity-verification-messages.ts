import type { AutomationLang } from "../automation/pre-payment-messages.js";

/**
 * Patient-facing copy for the identity-verification request.
 *
 * Same five languages as every other patient notification (pt serves both PT
 * and BR). This matters more here than for a booking reminder: verification
 * asks someone to photograph their face and their passport. A message in a
 * language they do not read is either ignored, or complied with without
 * understanding what was agreed to — and neither is acceptable for
 * biometric-adjacent data.
 */

export type IdentityVerificationCtx = {
  patientName: string;
  /** Named doctor when one asked; null when the booking flow raised it. */
  doctorName: string | null;
  verificationUrl: string;
};

type Copy = {
  subject: string;
  /** Opening differs depending on whether a real doctor asked. */
  openingByDoctor: (doctor: string) => string;
  openingSystem: string;
  why: string;
  steps: [string, string, string];
  cta: string;
  privacy: string;
  whatsappIntro: string;
  whatsappBody: string;
  whatsappTail: string;
};

const COPY: Record<AutomationLang, Copy> = {
  en: {
    subject: "Please confirm your identity before your consultation",
    openingByDoctor: (d) =>
      `${d} has asked you to confirm your identity before your consultation.`,
    openingSystem: "Before your consultation we need to confirm your identity.",
    why: "We have to confirm who you are before certain medications can be prescribed. It takes about two minutes:",
    steps: [
      "Sign in to your Global Health account",
      "Upload a photo of your passport or national ID card",
      "Take a photo of your face with your phone or webcam",
    ],
    cta: "Verify my identity",
    privacy:
      "Your documents are stored securely and are only visible to you and the clinicians treating you.",
    whatsappIntro: "this is Global Health.",
    whatsappBody:
      "Before your consultation we need to confirm your identity. Please sign in and upload your ID plus a photo of your face:",
    whatsappTail: "It takes about two minutes.",
  },
  pt: {
    subject: "Confirme a sua identidade antes da consulta",
    openingByDoctor: (d) =>
      `${d} pediu-lhe para confirmar a sua identidade antes da consulta.`,
    openingSystem: "Antes da sua consulta precisamos de confirmar a sua identidade.",
    why: "Temos de confirmar quem é antes de poderem ser prescritos determinados medicamentos. Demora cerca de dois minutos:",
    steps: [
      "Inicie sessão na sua conta Global Health",
      "Carregue uma fotografia do seu passaporte ou cartão de cidadão",
      "Tire uma fotografia do seu rosto com o telemóvel ou webcam",
    ],
    cta: "Confirmar a minha identidade",
    privacy:
      "Os seus documentos são guardados em segurança e apenas são visíveis para si e para os clínicos que o tratam.",
    whatsappIntro: "aqui é a Global Health.",
    whatsappBody:
      "Antes da sua consulta precisamos de confirmar a sua identidade. Inicie sessão e carregue o seu documento e uma fotografia do seu rosto:",
    whatsappTail: "Demora cerca de dois minutos.",
  },
  es: {
    subject: "Confirme su identidad antes de la consulta",
    openingByDoctor: (d) =>
      `${d} le ha pedido que confirme su identidad antes de la consulta.`,
    openingSystem: "Antes de su consulta necesitamos confirmar su identidad.",
    why: "Debemos confirmar quién es usted antes de poder recetar determinados medicamentos. Tarda unos dos minutos:",
    steps: [
      "Inicie sesión en su cuenta de Global Health",
      "Suba una foto de su pasaporte o documento nacional de identidad",
      "Hágase una foto de la cara con el móvil o la webcam",
    ],
    cta: "Verificar mi identidad",
    privacy:
      "Sus documentos se almacenan de forma segura y solo son visibles para usted y para los clínicos que le atienden.",
    whatsappIntro: "le escribimos de Global Health.",
    whatsappBody:
      "Antes de su consulta necesitamos confirmar su identidad. Inicie sesión y suba su documento y una foto de su cara:",
    whatsappTail: "Tarda unos dos minutos.",
  },
  cs: {
    subject: "Před konzultací potvrďte prosím svou totožnost",
    openingByDoctor: (d) =>
      `${d} vás požádal(a) o potvrzení totožnosti před konzultací.`,
    openingSystem: "Před konzultací potřebujeme potvrdit vaši totožnost.",
    why: "Než mohou být předepsány některé léky, musíme potvrdit, kdo jste. Zabere to asi dvě minuty:",
    steps: [
      "Přihlaste se ke svému účtu Global Health",
      "Nahrajte fotografii cestovního pasu nebo občanského průkazu",
      "Vyfoťte svůj obličej telefonem nebo webkamerou",
    ],
    cta: "Ověřit totožnost",
    privacy:
      "Vaše dokumenty jsou uloženy bezpečně a vidíte je pouze vy a lékaři, kteří vás ošetřují.",
    whatsappIntro: "tady Global Health.",
    whatsappBody:
      "Před konzultací potřebujeme potvrdit vaši totožnost. Přihlaste se prosím a nahrajte doklad a fotografii obličeje:",
    whatsappTail: "Zabere to asi dvě minuty.",
  },
  ro: {
    subject: "Vă rugăm să vă confirmați identitatea înainte de consultație",
    openingByDoctor: (d) =>
      `${d} v-a cerut să vă confirmați identitatea înainte de consultație.`,
    openingSystem: "Înainte de consultație trebuie să vă confirmăm identitatea.",
    why: "Trebuie să confirmăm cine sunteți înainte ca anumite medicamente să poată fi prescrise. Durează aproximativ două minute:",
    steps: [
      "Conectați-vă la contul dumneavoastră Global Health",
      "Încărcați o fotografie a pașaportului sau a cărții de identitate",
      "Faceți o fotografie a feței cu telefonul sau camera web",
    ],
    cta: "Verifică-mi identitatea",
    privacy:
      "Documentele dumneavoastră sunt stocate în siguranță și sunt vizibile doar pentru dumneavoastră și pentru medicii care vă tratează.",
    whatsappIntro: "vă scriem de la Global Health.",
    whatsappBody:
      "Înainte de consultație trebuie să vă confirmăm identitatea. Vă rugăm să vă conectați și să încărcați actul de identitate și o fotografie a feței:",
    whatsappTail: "Durează aproximativ două minute.",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function identityEmailSubject(lang: AutomationLang): string {
  return COPY[lang].subject;
}

export function identityEmailText(
  ctx: IdentityVerificationCtx,
  lang: AutomationLang,
): string {
  const c = COPY[lang];
  return [
    `${ctx.patientName},`,
    "",
    ctx.doctorName ? c.openingByDoctor(ctx.doctorName) : c.openingSystem,
    "",
    c.why,
    "",
    ...c.steps.map((s, i) => `  ${i + 1}. ${s}`),
    "",
    ctx.verificationUrl,
    "",
    c.privacy,
    "",
    "Global Health",
  ].join("\n");
}

export function identityEmailHtml(
  ctx: IdentityVerificationCtx,
  lang: AutomationLang,
): string {
  const c = COPY[lang];
  const opening = ctx.doctorName
    ? c.openingByDoctor(escapeHtml(ctx.doctorName))
    : c.openingSystem;
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0F2E25">
  <p>${escapeHtml(ctx.patientName)},</p>
  <p>${opening}</p>
  <p>${c.why}</p>
  <ol>${c.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
  <p><a href="${ctx.verificationUrl}" style="background:#0F2E25;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">${c.cta}</a></p>
  <p style="color:#5b6b66;font-size:13px">${c.privacy}</p>
  <p>Global Health</p>
</div>`;
}

export function identityWhatsAppMessage(
  ctx: IdentityVerificationCtx,
  lang: AutomationLang,
): string {
  const c = COPY[lang];
  return [
    `${ctx.patientName}, ${c.whatsappIntro}`,
    "",
    c.whatsappBody,
    ctx.verificationUrl,
    "",
    c.whatsappTail,
  ].join("\n");
}
