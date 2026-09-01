/**
 * Per-service SEO overrides (meta title + description).
 *
 * Source of truth: the marketing "Meta Tags" sheet — the columns
 * "Suggested Meta Title" / "Suggested Meta Description" approved for the
 * migration from the legacy Wix site. Keyed by `${countryCode}:${slug}`
 * so the same service slug can carry a different, locale-correct meta per
 * market (e.g. `ie:medical-consultation` in English vs
 * `pt:medical-consultation` in Portuguese).
 *
 * The per-service consult page (`/[country]/[lang]/consult/[serviceSlug]`)
 * reads this via `getServiceSeo`; when no override exists it falls back to
 * the generic generated title/description.
 *
 * To add a market/service: drop a new `${code}:${slug}` entry below using
 * the exact slug the backend serves for that service.
 */
export type ServiceSeo = {
  title: string;
  description: string;
};

const SERVICE_SEO: Record<string, ServiceSeo> = {
  // ── Ireland (English) ──────────────────────────────────────────────
  "ie:sick-leave": {
    title: "Sick Leave Certificate Online Ireland | IMC-Registered GP | Global Health",
    description:
      "Speak to an IMC-registered GP online about your symptoms and, where clinically appropriate, receive a sick leave certificate for work — often the same day. Available in English, Portuguese, Spanish, Arabic and Urdu. From €45.",
  },
  "ie:medical-consultation": {
    title: "Online GP Consultation Ireland | IMC-Registered Doctors",
    description:
      "Book an online GP consultation in Ireland with IMC-registered doctors. Video consultations often available the same day, with medical certificates and referrals where clinically appropriate.",
  },
  "ie:weight-loss-consultation": {
    title: "Medical Weight Loss Online Ireland | Physician Supervised Program",
    description:
      "Join an online medical weight loss program with physician supervised weight loss. Get personalised plans and guidance from qualified doctors online in Ireland.",
  },

  // ── Portugal (Portuguese) ──────────────────────────────────────────
  "pt:medical-consultation": {
    title: "Consulta Médica Online em Portugal | Consulta de Saúde Segura",
    description:
      "Marque a sua consulta médica online em Portugal por videochamada. Disponibilidade conforme a agenda e avaliação por médico registado em Portugal.",
  },
  "pt:medical-exam": {
    title: "Atestado Médico Portugal | Atestado Médico para Trabalho Online",
    description:
      "Consulta online para avaliação médica em Portugal, quando precisa de atestado médico para trabalho. Qualquer documento depende da decisão clínica.",
  },
  "pt:travelers-consultation": {
    title: "Consulta de Saúde Internacional | Consulta Viagem Online",
    description:
      "Marque a sua consulta do viajante online com aconselhamento médico para viajar de forma rápida, segura e adaptada ao seu destino.",
  },
  // Localized-slug aliases (2026-07 rename) — same overrides, new slugs.
  "pt:consulta-medica": {
    title: "Consulta Médica Online em Portugal | Consulta de Saúde Segura",
    description:
      "Marque a sua consulta médica online em Portugal por videochamada. Disponibilidade conforme a agenda e avaliação por médico registado em Portugal.",
  },
  "pt:consulta-do-viajante": {
    title: "Consulta de Saúde Internacional | Consulta Viagem Online",
    description:
      "Marque a sua consulta do viajante online com aconselhamento médico para viajar de forma rápida, segura e adaptada ao seu destino.",
  },
};

/** Normalize a slug for matching: lowercase, drop apostrophes/curly quotes
 *  so legacy slugs like `traveler's-consultation` resolve to the stored
 *  `travelers-consultation` key. */
function normalizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/['’]/g, "");
}

/**
 * Resolve the approved SEO override for a `(country, service)` pair, or
 * `null` when no override is defined. Matching is apostrophe-insensitive.
 */
export function getServiceSeo(
  countryCode: string,
  serviceSlug: string,
): ServiceSeo | null {
  const code = countryCode.toLowerCase();
  const direct = SERVICE_SEO[`${code}:${serviceSlug.toLowerCase()}`];
  if (direct) return direct;
  const target = normalizeSlug(serviceSlug);
  for (const [key, value] of Object.entries(SERVICE_SEO)) {
    const [keyCode, keySlug] = key.split(":");
    if (keyCode === code && normalizeSlug(keySlug) === target) return value;
  }
  return null;
}
