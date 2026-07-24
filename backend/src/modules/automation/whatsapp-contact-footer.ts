import type { AutomationLang } from "./pre-payment-messages.js";

const SUPPORT_EMAIL = "globalhealth@myglobalhealth.online";

/**
 * Trailing contact line appended to every automation WhatsApp message.
 * Localised per market — the line used to be hard-coded English even on the
 * Portuguese / Romanian / Czech / Spanish messages.
 */
const CONTACT_LINE: Record<AutomationLang, string> = {
  en: `Reply here or reach us out at ${SUPPORT_EMAIL}`,
  pt: `Responda aqui ou contacte-nos através de ${SUPPORT_EMAIL}`,
  ro: `Răspundeți aici sau contactați-ne la ${SUPPORT_EMAIL}`,
  cs: `Odpovězte zde nebo nás kontaktujte na ${SUPPORT_EMAIL}`,
  es: `Responda aquí o escríbanos a ${SUPPORT_EMAIL}`,
};

export function whatsappContactFooter(lang: AutomationLang): string {
  return `\n\n${CONTACT_LINE[lang] ?? CONTACT_LINE.en}`;
}
