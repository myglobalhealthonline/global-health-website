export type CountryCertificationLogo = {
  name: string;
  alt: string;
  src: string;
  href: string;
  width: number;
  height: number;
  kind: "authority" | "partner";
  tone?: "light" | "dark" | "blue" | "rose";
};

const EU_PRIVACY: CountryCertificationLogo = {
  name: "EU GDPR",
  alt: "European Union GDPR data protection badge",
  src: "/logos/partners/gdpr-green-gold.webp",
  href: "https://commission.europa.eu/law/law-topic/data-protection_en",
  width: 240,
  height: 240,
  kind: "authority",
  tone: "light",
};

const EU_FLAG: CountryCertificationLogo = {
  name: "European Union",
  alt: "European Union flag",
  src: "/logos/partners/eu-flag.svg",
  href: "https://european-union.europa.eu/",
  width: 220,
  height: 148,
  kind: "authority",
  tone: "blue",
};

const LOGOS_BY_COUNTRY: Record<string, CountryCertificationLogo[]> = {
  ie: [
    {
      name: "Medical Council",
      alt: "Medical Council Ireland",
      src: "/logos/partners/medical-council-ie.png",
      href: "https://www.medicalcouncil.ie/",
      width: 260,
      height: 90,
      kind: "authority",
      tone: "dark",
    },
    {
      name: "HIQA",
      alt: "Health Information and Quality Authority",
      src: "/logos/hiqa.svg",
      href: "https://www.hiqa.ie/",
      width: 220,
      height: 80,
      kind: "authority",
      tone: "light",
    },
    {
      name: "Level Health",
      alt: "Level Health",
      src: "/logos/partners/level-health.svg",
      href: "https://www.levelhealth.ie/",
      width: 220,
      height: 72,
      kind: "partner",
      tone: "dark",
    },
    {
      name: "Coombe Community Pharmacy",
      alt: "Coombe Community Pharmacy",
      src: "/logos/partners/coombe-community-pharmacy.png",
      href: "https://www.coombecommunitypharmacy.ie/",
      width: 180,
      height: 180,
      kind: "partner",
      tone: "light",
    },
    {
      name: "Innovative Cardiac Diagnostics",
      alt: "Innovative Cardiac Diagnostics",
      src: "/logos/partners/innovative-cardiac-diagnostics.png",
      href: "https://icdcardiac.com/",
      width: 180,
      height: 78,
      kind: "partner",
      tone: "dark",
    },
    EU_PRIVACY,
    EU_FLAG,
  ],
  pt: [
    {
      name: "Ordem dos Medicos",
      alt: "Ordem dos Medicos",
      src: "/logos/partners/ordem-dos-medicos.png",
      href: "https://ordemdosmedicos.pt/",
      width: 160,
      height: 160,
      kind: "authority",
      tone: "light",
    },
    {
      name: "Entidade Reguladora da Saude",
      alt: "Entidade Reguladora da Saude",
      src: "/logos/partners/entidade-reguladora-saude.svg",
      href: "https://www.ers.pt/",
      width: 260,
      height: 80,
      kind: "authority",
      tone: "light",
    },
    {
      name: "Livro de Reclamacoes",
      alt: "Livro de Reclamacoes Eletronico",
      // "-red" suffix = cache-busted rename after tinting the original
      // white-on-transparent asset red (#E30513).
      src: "/logos/partners/livro-de-reclamacoes-red.png",
      href: "https://www.livroreclamacoes.pt/",
      width: 1106,
      height: 202,
      kind: "authority",
      tone: "light",
    },
    {
      name: "Medicare",
      alt: "Medicare Portugal",
      src: "/logos/partners/medicare-pt.svg",
      href: "https://www.medicare.pt/",
      width: 220,
      height: 72,
      kind: "partner",
      tone: "light",
    },
    {
      name: "SYNLAB",
      alt: "SYNLAB Portugal",
      src: "/logos/partners/synlab.svg",
      href: "https://www.synlab.pt/",
      width: 220,
      height: 72,
      kind: "partner",
      tone: "light",
    },
    EU_PRIVACY,
    EU_FLAG,
  ],
  cz: [
    {
      name: "Czech Medical Chamber",
      alt: "Czech Medical Chamber",
      src: "/logos/partners/czech-medical.png",
      href: "https://www.lkcr.cz/",
      width: 112,
      height: 112,
      kind: "authority",
      tone: "light",
    },
    {
      name: "SUKL",
      alt: "State Institute for Drug Control",
      src: "/logos/partners/sukl-logo.png",
      href: "https://sukl.gov.cz/en/",
      width: 220,
      height: 72,
      kind: "authority",
      tone: "light",
    },
    EU_PRIVACY,
    EU_FLAG,
  ],
  es: [
    {
      name: "OMC",
      alt: "Organizacion Medica Colegial",
      src: "/logos/partners/omc.svg",
      href: "https://www.cgcom.es/",
      width: 260,
      height: 96,
      kind: "authority",
      tone: "light",
    },
    EU_PRIVACY,
    EU_FLAG,
  ],
  ro: [
    {
      name: "CMR",
      alt: "Colegiul Medicilor din Romania",
      src: "/logos/partners/cmr.png",
      href: "https://www.cmr.ro/",
      width: 260,
      height: 92,
      kind: "authority",
      tone: "light",
    },
    EU_PRIVACY,
    EU_FLAG,
  ],
  br: [
    {
      name: "CFM",
      alt: "Conselho Federal de Medicina",
      src: "/logos/partners/cfm.webp",
      href: "https://portal.cfm.org.br/",
      width: 260,
      height: 92,
      kind: "authority",
      tone: "light",
    },
    {
      name: "LGPD",
      alt: "Lei Geral de Protecao de Dados",
      src: "/logos/partners/lgpd-logo.webp",
      href: "https://www.gov.br/anpd/pt-br",
      width: 220,
      height: 138,
      kind: "authority",
      tone: "blue",
    },
  ],
};

export function getCountryCertificationLogos(countryCode: string): CountryCertificationLogo[] {
  return LOGOS_BY_COUNTRY[countryCode.trim().toLowerCase()] ?? [];
}

export function getCountryAuthorityLogos(countryCode: string): CountryCertificationLogo[] {
  return getCountryCertificationLogos(countryCode).filter((logo) => logo.kind === "authority");
}

export function getCountryPartnerLogos(countryCode: string): CountryCertificationLogo[] {
  return getCountryCertificationLogos(countryCode).filter((logo) => logo.kind === "partner");
}
