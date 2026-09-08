import { resolveLocale } from "./resolve-locale";

type ReviewMessages = { patientReviews: string; doctifyReviews: string; body: string; blockedTitle: string; blockedBody: string; load: string; settings: string };

// Deliberately narrow client dictionary for consent-gated Doctify widgets.
// Keep values in sync with common.json; importing that full bundle here would
// put every common locale into the lazy reviews chunk.
const messages: Record<string, ReviewMessages> = {
  en: { patientReviews: "Patient reviews", doctifyReviews: "Doctify patient reviews", body: "Independent, verified reviews collected by Doctify from patients treated by our clinicians.", blockedTitle: "Patient reviews are blocked", blockedBody: "Reviews are loaded from Doctify, which sets its own cookies.", load: "Load reviews", settings: "Cookie settings" },
  pt: { patientReviews: "Avaliações de pacientes", doctifyReviews: "Avaliações de pacientes Doctify", body: "Avaliações independentes e verificadas, recolhidas pela Doctify junto de pacientes tratados pelos nossos clínicos.", blockedTitle: "As avaliações estão bloqueadas", blockedBody: "As avaliações são carregadas do Doctify, que define os seus próprios cookies.", load: "Carregar avaliações", settings: "Definições de cookies" },
  es: { patientReviews: "Opiniones de pacientes", doctifyReviews: "Opiniones de pacientes en Doctify", body: "Opiniones independientes y verificadas, recogidas por Doctify de pacientes atendidos por nuestros médicos.", blockedTitle: "Las reseñas están bloqueadas", blockedBody: "Las reseñas se cargan desde Doctify, que instala sus propias cookies.", load: "Cargar reseñas", settings: "Ajustes de cookies" },
  cs: { patientReviews: "Hodnocení pacientů", doctifyReviews: "Hodnocení pacientů Doctify", body: "Nezávislá ověřená hodnocení, která Doctify sbírá od pacientů ošetřených našimi lékaři.", blockedTitle: "Hodnocení pacientů jsou blokována", blockedBody: "Hodnocení se načítají z Doctify, které nastavuje vlastní cookies.", load: "Načíst hodnocení", settings: "Nastavení cookies" },
  ro: { patientReviews: "Recenzii ale pacienților", doctifyReviews: "Recenzii ale pacienților pe Doctify", body: "Recenzii independente și verificate, colectate de Doctify de la pacienți tratați de medicii noștri.", blockedTitle: "Recenziile pacienților sunt blocate", blockedBody: "Recenziile sunt încărcate de la Doctify, care își setează propriile cookie-uri.", load: "Încarcă recenziile", settings: "Setări cookie" },
  de: { patientReviews: "Patientenbewertungen", doctifyReviews: "Doctify-Patientenbewertungen", body: "Unabhängige, verifizierte Bewertungen, die Doctify bei Patientinnen und Patienten unserer Ärzte erhebt.", blockedTitle: "Patientenbewertungen sind blockiert", blockedBody: "Die Bewertungen werden von Doctify geladen, das eigene Cookies setzt.", load: "Bewertungen laden", settings: "Cookie-Einstellungen" },
};

export function getReviewMessages(language: string): ReviewMessages {
  return messages[resolveLocale({ explicitLocale: language })] ?? messages.en;
}
