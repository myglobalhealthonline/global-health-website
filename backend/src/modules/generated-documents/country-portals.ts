export type HealthPortalConfig = {
  label: string;
  url: string;
};

const PORTALS: Record<string, HealthPortalConfig> = {
  ie: {
    label: "Healthmail",
    url: "https://www.healthmail.ie/",
  },
  pt: {
    label: "PEM Min-Saúde",
    url: "https://www.pems.min-saude.pt/",
  },
  sp: {
    label: "REMPE",
    url: "https://rempe.sanidad.gob.es/",
  },
  cz: {
    label: "eRecept",
    url: "https://erecept.sukl.cz/",
  },
  rm: {
    label: "National prescription system",
    url: "https://www.ms.ro/",
  },
  br: {
    label: "National health portal",
    url: "https://www.gov.br/saude/",
  },
};

export function getHealthPortalForCountry(countryCode: string): HealthPortalConfig | null {
  const key = countryCode.toLowerCase().trim();
  return PORTALS[key] ?? null;
}
