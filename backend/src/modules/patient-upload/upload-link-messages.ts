import type { NotificationLang } from "../automation/notification-language.js";

/**
 * Patient-facing copy for every "here is a link to upload your files" message,
 * in the languages the notification templates are written in.
 *
 * The link is sent by an admin or a doctor, but it is READ by the patient, so
 * it follows the same language rule as the automated notifications: the
 * booking's own `notificationLocale` if it has one, otherwise the locale of the
 * country the consultation was booked in. The sender can override the pick per
 * send — see `sendAppointmentUploadLink`.
 *
 * German is deliberately absent, matching `NOTIFICATION_LANGS`: a DE booking
 * receives the English copy rather than a half-translated message.
 */

type Copy = {
  emailSubject: string;
  emailHeading: string;
  /** `{name}` is substituted with the patient's name. */
  emailGreeting: string;
  emailBody: string;
  emailCta: string;
  /** `{link}` substituted. General appointment-scoped upload. */
  whatsappGeneral: string;
  /** `{link}` and `{number}` substituted — `{number}` may be an empty string. */
  whatsappPrescription: string;
};

const COPY: Record<NotificationLang, Copy> = {
  en: {
    emailSubject: "Upload your medical files — Global Health",
    emailHeading: "Upload your files",
    emailGreeting: "Hi {name},",
    emailBody: "Use this secure link to upload your exam results for your doctor.",
    emailCta: "Upload files",
    whatsappGeneral:
      "Upload your medical files securely for your Global Health appointment:\n{link}",
    whatsappPrescription:
      "Upload your exam results for prescription{number} securely:\n{link}",
  },
  pt: {
    emailSubject: "Carregue os seus documentos médicos — Global Health",
    emailHeading: "Carregue os seus ficheiros",
    emailGreeting: "Olá {name},",
    emailBody:
      "Utilize este link seguro para carregar os resultados dos seus exames para o seu médico.",
    emailCta: "Carregar ficheiros",
    whatsappGeneral:
      "Carregue os seus documentos médicos em segurança para a sua consulta Global Health:\n{link}",
    whatsappPrescription:
      "Carregue em segurança os resultados dos exames da prescrição{number}:\n{link}",
  },
  es: {
    emailSubject: "Suba sus documentos médicos — Global Health",
    emailHeading: "Suba sus archivos",
    emailGreeting: "Hola {name}:",
    emailBody:
      "Utilice este enlace seguro para subir los resultados de sus pruebas para su médico.",
    emailCta: "Subir archivos",
    whatsappGeneral:
      "Suba sus documentos médicos de forma segura para su cita de Global Health:\n{link}",
    whatsappPrescription:
      "Suba de forma segura los resultados de las pruebas de la receta{number}:\n{link}",
  },
  cs: {
    emailSubject: "Nahrajte své lékařské dokumenty — Global Health",
    emailHeading: "Nahrajte své soubory",
    emailGreeting: "Dobrý den, {name},",
    emailBody:
      "Pomocí tohoto zabezpečeného odkazu nahrajte výsledky svých vyšetření pro svého lékaře.",
    emailCta: "Nahrát soubory",
    whatsappGeneral:
      "Bezpečně nahrajte své lékařské dokumenty ke své konzultaci Global Health:\n{link}",
    whatsappPrescription:
      "Bezpečně nahrajte výsledky vyšetření k žádance{number}:\n{link}",
  },
  ro: {
    emailSubject: "Încărcați documentele dumneavoastră medicale — Global Health",
    emailHeading: "Încărcați fișierele dumneavoastră",
    emailGreeting: "Bună ziua, {name},",
    emailBody:
      "Folosiți acest link securizat pentru a încărca rezultatele analizelor pentru medicul dumneavoastră.",
    emailCta: "Încărcați fișiere",
    whatsappGeneral:
      "Încărcați în siguranță documentele medicale pentru consultația dumneavoastră Global Health:\n{link}",
    whatsappPrescription:
      "Încărcați în siguranță rezultatele analizelor pentru trimiterea{number}:\n{link}",
  },
};

export function uploadLinkCopy(lang: NotificationLang): Copy {
  return COPY[lang] ?? COPY.en;
}

export function uploadLinkEmailGreeting(lang: NotificationLang, name: string): string {
  return uploadLinkCopy(lang).emailGreeting.replace("{name}", name);
}

export function uploadLinkWhatsAppGeneral(lang: NotificationLang, link: string): string {
  return uploadLinkCopy(lang).whatsappGeneral.replace("{link}", link);
}

export function uploadLinkWhatsAppPrescription(
  lang: NotificationLang,
  link: string,
  numberLabel: string,
): string {
  return uploadLinkCopy(lang)
    .whatsappPrescription.replace("{number}", numberLabel)
    .replace("{link}", link);
}
