import type { AutomationLang } from "./pre-payment-messages.js";
import { whatsappContactFooter } from "./whatsapp-contact-footer.js";

/**
 * Patient-facing copy for a paid HEALTH_TEST kit order.
 *
 * Kit orders are products, not bookings: there is no slot, no doctor and no
 * meeting link, so none of the `post-payment-messages.ts` builders fit — every
 * one of them is built around an appointment. The shared shape is deliberate
 * though: same greeting, same 📌/📅 field style, same localized contact footer,
 * so a patient who has had a consultation recognises this as the same sender.
 */

type Lang = AutomationLang;

function t(lang: Lang, map: Record<Lang, string>): string {
  return map[lang] ?? map.en;
}

export type HealthTestMessageContext = {
  patientName: string;
  orderNumber: string;
  /** "1× Male Hormone Test" per line, already quantity-prefixed. */
  kits: string[];
  /** One-line delivery address, already comma-joined. Empty string = none. */
  address: string;
  totalLabel: string;
};

/** Patient WhatsApp — kit order paid, on its way. */
export function patientWhatsAppHealthTestConfirmation(
  ctx: HealthTestMessageContext,
  lang: Lang,
): string {
  const kits = ctx.kits.join("\n• ");
  const body = t(lang, {
    en: `Hi ${ctx.patientName},
Thank you for your payment.
Your test kit order is confirmed.
Order Details:
📌 Order: #${ctx.orderNumber}
🧪 Kit(s):
• ${kits}
📦 Delivery address: ${ctx.address}
💳 Total: ${ctx.totalLabel}
We are preparing your kit and will message you again with the tracking details once it ships. Your results will be shared with you as soon as the laboratory reports them.
Global Health Team`,
    pt: `Olá ${ctx.patientName},
Obrigado pelo seu pagamento.
A sua encomenda de kit de análises está confirmada.
Detalhes da encomenda:
📌 Encomenda: #${ctx.orderNumber}
🧪 Kit(s):
• ${kits}
📦 Morada de entrega: ${ctx.address}
💳 Total: ${ctx.totalLabel}
Estamos a preparar o seu kit e voltaremos a contactá-lo com os dados de seguimento assim que for expedido. Os resultados ser-lhe-ão enviados logo que o laboratório os comunique.
Equipa Global Health`,
    ro: `Bună ${ctx.patientName},
Vă mulțumim pentru plată.
Comanda dumneavoastră de kit de testare este confirmată.
Detalii comandă:
📌 Comandă: #${ctx.orderNumber}
🧪 Kit(uri):
• ${kits}
📦 Adresa de livrare: ${ctx.address}
💳 Total: ${ctx.totalLabel}
Pregătim kitul dumneavoastră și vă vom scrie din nou cu detaliile de urmărire imediat ce este expediat. Rezultatele vă vor fi transmise de îndată ce laboratorul le raportează.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.patientName},
děkujeme za platbu.
Vaše objednávka testovací sady je potvrzena.
Detaily objednávky:
📌 Objednávka: #${ctx.orderNumber}
🧪 Sada(y):
• ${kits}
📦 Doručovací adresa: ${ctx.address}
💳 Celkem: ${ctx.totalLabel}
Sadu pro vás připravujeme a jakmile ji odešleme, pošleme vám údaje pro sledování zásilky. Výsledky vám předáme, jakmile je laboratoř nahlásí.
Tým Global Health`,
    es: `Hola ${ctx.patientName},
Gracias por su pago.
Su pedido de kit de análisis está confirmado.
Detalles del pedido:
📌 Pedido: #${ctx.orderNumber}
🧪 Kit(s):
• ${kits}
📦 Dirección de entrega: ${ctx.address}
💳 Total: ${ctx.totalLabel}
Estamos preparando su kit y le escribiremos de nuevo con los datos de seguimiento en cuanto se envíe. Sus resultados se le comunicarán en cuanto el laboratorio los informe.
Equipo Global Health`,
  });
  return body + whatsappContactFooter(lang);
}

export type AdminHealthTestAlertContext = HealthTestMessageContext & {
  patientEmail: string;
  patientPhone: string;
  countryCode: string;
};

export const ADMIN_HEALTH_TEST_HEADLINE = "🧪 New health test booking — payment received";

/**
 * Staff alert body.
 *
 * Unlike the consultation alert, the patient's name and full delivery address
 * are ALWAYS included: a kit has to be physically posted to that person at that
 * address, so withholding it would make the alert useless. This is operational
 * fulfilment data going to staff numbers and the staff group, not a marketing
 * send, so it is not gated on the patient's WhatsApp preference.
 */
export function buildAdminHealthTestAlertLines(ctx: AdminHealthTestAlertContext): string[] {
  return [
    ADMIN_HEALTH_TEST_HEADLINE,
    `Order: #${ctx.orderNumber}`,
    `Patient: ${ctx.patientName}`,
    `Email: ${ctx.patientEmail}`,
    `Phone: ${ctx.patientPhone || "—"}`,
    `Kit(s): ${ctx.kits.join(", ")}`,
    `Delivery address: ${ctx.address || "— NO ADDRESS ON ORDER —"}`,
    `Country: ${ctx.countryCode.toUpperCase()}`,
    `Total: ${ctx.totalLabel}`,
  ];
}

export function buildAdminHealthTestAlertText(ctx: AdminHealthTestAlertContext): string {
  return buildAdminHealthTestAlertLines(ctx).join("\n");
}

/**
 * Dispatch details an admin hands the patient once the kit is on its way.
 *
 * Every field is optional except the order number, because couriers differ in
 * what they give you: some hand over a code and no link, some a link and no
 * code, small local couriers neither (the admin then sends a bare "it has
 * shipped", which is still worth sending). The builders below drop the lines
 * they have nothing for rather than printing an empty label.
 */
export type HealthTestTrackingContext = {
  patientName: string;
  orderNumber: string;
  kits: string[];
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
};

type TrackingLabels = {
  carrier: string;
  code: string;
  link: string;
};

const TRACKING_LABELS: Record<Lang, TrackingLabels> = {
  en: { carrier: "Carrier", code: "Tracking number", link: "Track your kit" },
  pt: { carrier: "Transportadora", code: "Número de seguimento", link: "Siga o seu kit" },
  ro: { carrier: "Curier", code: "Număr de urmărire", link: "Urmăriți kitul" },
  cs: { carrier: "Dopravce", code: "Číslo zásilky", link: "Sledovat zásilku" },
  es: { carrier: "Transportista", code: "Número de seguimiento", link: "Siga su kit" },
};

/** The carrier / code / link block, minus whatever the courier didn't give us. */
function trackingLines(ctx: HealthTestTrackingContext, lang: Lang): string[] {
  const l = TRACKING_LABELS[lang] ?? TRACKING_LABELS.en;
  const lines: string[] = [];
  if (ctx.trackingCarrier?.trim()) lines.push(`🚚 ${l.carrier}: ${ctx.trackingCarrier.trim()}`);
  if (ctx.trackingNumber?.trim()) lines.push(`🔎 ${l.code}: ${ctx.trackingNumber.trim()}`);
  if (ctx.trackingUrl?.trim()) lines.push(`🔗 ${l.link}: ${ctx.trackingUrl.trim()}`);
  return lines;
}

/** True when there is nothing to track — the message becomes a plain "shipped". */
export function hasTrackingDetails(ctx: HealthTestTrackingContext): boolean {
  return Boolean(
    ctx.trackingCarrier?.trim() || ctx.trackingNumber?.trim() || ctx.trackingUrl?.trim(),
  );
}

/** Patient WhatsApp — the kit has shipped, here is how to follow it. */
export function patientWhatsAppHealthTestTracking(
  ctx: HealthTestTrackingContext,
  lang: Lang,
): string {
  const kits = ctx.kits.join("\n• ");
  const tracking = trackingLines(ctx, lang);
  const trackingBlock = tracking.length > 0 ? `\n${tracking.join("\n")}` : "";
  const body = t(lang, {
    en: `Hi ${ctx.patientName},
Good news — your test kit is on its way.
📌 Order: #${ctx.orderNumber}
🧪 Kit(s):
• ${kits}${trackingBlock}
Follow the instructions inside the kit and return your sample in the prepaid envelope provided. We will send your results as soon as the laboratory reports them.
Global Health Team`,
    pt: `Olá ${ctx.patientName},
Boas notícias — o seu kit de análises já segue para si.
📌 Encomenda: #${ctx.orderNumber}
🧪 Kit(s):
• ${kits}${trackingBlock}
Siga as instruções incluídas no kit e devolva a sua amostra no envelope pré-pago fornecido. Enviaremos os resultados assim que o laboratório os comunicar.
Equipa Global Health`,
    ro: `Bună ${ctx.patientName},
Vești bune — kitul dumneavoastră de testare este pe drum.
📌 Comandă: #${ctx.orderNumber}
🧪 Kit(uri):
• ${kits}${trackingBlock}
Urmați instrucțiunile din kit și returnați proba în plicul preplătit furnizat. Vă vom trimite rezultatele imediat ce laboratorul le raportează.
Echipa Global Health`,
    cs: `Dobrý den ${ctx.patientName},
dobrá zpráva — vaše testovací sada je na cestě.
📌 Objednávka: #${ctx.orderNumber}
🧪 Sada(y):
• ${kits}${trackingBlock}
Postupujte podle pokynů v sadě a vzorek vraťte v přiložené předplacené obálce. Výsledky vám zašleme, jakmile je laboratoř nahlásí.
Tým Global Health`,
    es: `Hola ${ctx.patientName},
Buenas noticias: su kit de análisis ya está en camino.
📌 Pedido: #${ctx.orderNumber}
🧪 Kit(s):
• ${kits}${trackingBlock}
Siga las instrucciones incluidas en el kit y devuelva su muestra en el sobre prepagado facilitado. Le enviaremos los resultados en cuanto el laboratorio los informe.
Equipo Global Health`,
  });
  return body + whatsappContactFooter(lang);
}

/** Subject line for the same message by email. */
export function patientEmailSubjectHealthTestTracking(
  ctx: HealthTestTrackingContext,
  lang: Lang,
): string {
  return t(lang, {
    en: `Your test kit is on its way — order #${ctx.orderNumber}`,
    pt: `O seu kit de análises segue para si — encomenda #${ctx.orderNumber}`,
    ro: `Kitul dumneavoastră de testare este pe drum — comanda #${ctx.orderNumber}`,
    cs: `Vaše testovací sada je na cestě — objednávka #${ctx.orderNumber}`,
    es: `Su kit de análisis está en camino — pedido #${ctx.orderNumber}`,
  });
}
