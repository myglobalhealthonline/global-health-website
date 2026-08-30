import type { NotificationLang } from "../automation/notification-language.js";

/**
 * Patient-facing copy for "the clinic added a document to your medical files",
 * sent when an admin uploads a record on the patient's behalf.
 *
 * Deliberately names no diagnosis, result, or document content beyond the
 * label the operator typed — email and WhatsApp are unencrypted channels, so
 * the message is a pointer to the portal, never the record itself.
 *
 * Same language rule as every other patient notification: the booking's own
 * `notificationLocale`, else the locale of the country it was booked in.
 * German is absent on purpose, matching `NOTIFICATION_LANGS` — a DE booking
 * gets the English copy rather than a half-translated one.
 */

type Copy = {
  emailSubject: string;
  emailHeading: string;
  /** `{name}` substituted with the patient's name. */
  emailGreeting: string;
  /** `{document}` substituted with the document label. */
  emailBody: string;
  emailCta: string;
  /** `{document}` and `{link}` substituted. */
  whatsapp: string;
};

const COPY: Record<NotificationLang, Copy> = {
  en: {
    emailSubject: "A new document in your medical files — Global Health",
    emailHeading: "New document from your clinic",
    emailGreeting: "Hi {name},",
    emailBody:
      "Your clinic has added a document to your medical files: {document}. You can view and download it in your Global Health account.",
    emailCta: "View my medical files",
    whatsapp:
      "Your clinic added a document to your Global Health medical files: {document}\nView it here:\n{link}",
  },
  pt: {
    emailSubject: "Um novo documento nos seus ficheiros médicos — Global Health",
    emailHeading: "Novo documento da sua clínica",
    emailGreeting: "Olá {name},",
    emailBody:
      "A sua clínica adicionou um documento aos seus ficheiros médicos: {document}. Pode consultá-lo e transferi-lo na sua conta Global Health.",
    emailCta: "Ver os meus ficheiros médicos",
    whatsapp:
      "A sua clínica adicionou um documento aos seus ficheiros médicos Global Health: {document}\nConsulte aqui:\n{link}",
  },
  es: {
    emailSubject: "Un nuevo documento en sus archivos médicos — Global Health",
    emailHeading: "Nuevo documento de su clínica",
    emailGreeting: "Hola {name}:",
    emailBody:
      "Su clínica ha añadido un documento a sus archivos médicos: {document}. Puede verlo y descargarlo en su cuenta de Global Health.",
    emailCta: "Ver mis archivos médicos",
    whatsapp:
      "Su clínica añadió un documento a sus archivos médicos de Global Health: {document}\nVéalo aquí:\n{link}",
  },
  cs: {
    emailSubject: "Nový dokument ve vaší zdravotní dokumentaci — Global Health",
    emailHeading: "Nový dokument od vaší kliniky",
    emailGreeting: "Dobrý den, {name},",
    emailBody:
      "Vaše klinika přidala do vaší zdravotní dokumentace dokument: {document}. Můžete si jej zobrazit a stáhnout ve svém účtu Global Health.",
    emailCta: "Zobrazit mou zdravotní dokumentaci",
    whatsapp:
      "Vaše klinika přidala dokument do vaší zdravotní dokumentace Global Health: {document}\nZobrazit zde:\n{link}",
  },
  ro: {
    emailSubject: "Un document nou în dosarul dumneavoastră medical — Global Health",
    emailHeading: "Document nou de la clinica dumneavoastră",
    emailGreeting: "Bună ziua, {name},",
    emailBody:
      "Clinica dumneavoastră a adăugat un document în dosarul dumneavoastră medical: {document}. Îl puteți vizualiza și descărca în contul dumneavoastră Global Health.",
    emailCta: "Vezi dosarul meu medical",
    whatsapp:
      "Clinica dumneavoastră a adăugat un document în dosarul medical Global Health: {document}\nVizualizați aici:\n{link}",
  },
};

export function clinicDocumentCopy(lang: NotificationLang): Copy {
  return COPY[lang] ?? COPY.en;
}

export function clinicDocumentWhatsApp(
  lang: NotificationLang,
  documentName: string,
  link: string,
): string {
  return clinicDocumentCopy(lang)
    .whatsapp.replace("{document}", documentName)
    .replace("{link}", link);
}
