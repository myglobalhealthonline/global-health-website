export type CzechiaStaticPageSeo = {
  title: string;
  description: string;
  h1?: string;
};

const COPY: Record<string, CzechiaStaticPageSeo> = {
  about: {
    title: "O Global Health Česko | Online lékařská péče",
    description:
      "Global Health Česko nabízí videokonzultace s lékaři registrovanými u České lékařské komory. Zjistěte, kdo jsme a jak služba funguje.",
  },
  blog: {
    title: "Zdravotní články od registrovaných lékařů | Česko",
    description:
      "Zdravotní články pro Česko od registrovaných lékařů. Praktické informace, zdroje a jasné upozornění, kdy je potřeba osobní péče.",
    h1: "Zdravotní články od registrovaných lékařů",
  },
  book: {
    title: "Objednat online konzultaci | Global Health Česko",
    description:
      "Objednejte online konzultaci v Česku. Vyberte službu, lékaře a dostupný termín a poté bezpečně doplňte údaje pacienta.",
    h1: "Objednejte si online konzultaci",
  },
  careers: {
    title: "Kariéra v Global Health Česko",
    description:
      "Připojte se ke Global Health v Česku. Spolupracujeme s registrovanými lékaři, klinickou podporou a technologickými týmy v Evropě a Brazílii.",
  },
  contact: {
    title: "Kontakt | Global Health Česko",
    description:
      "Kontaktujte Global Health Česko telefonicky na +420 608 353 716 nebo e-mailem na info@myglobalhealth.online. Provozní údaje a sídlo najdete na stránce.",
    h1: "Kontakt | Global Health Česko",
  },
  faq: {
    title: "Časté otázky | Global Health Česko",
    description:
      "Odpovědi na časté otázky o rezervaci, platbě, videokonzultaci, soukromí a situacích, kdy online péče není vhodná.",
    h1: "Časté otázky k online péči",
  },
  legal: {
    title: "Právní informace | Global Health Česko",
    description:
      "Právní dokumenty, údaje o provozovateli a regulační informace pro služby Global Health v Česku. Vyberte příslušný dokument.",
    h1: "Právní informace",
  },
  "legal/complaints-procedure": {
    title: "Postup při stížnostech | Global Health Česko",
    description:
      "Postup pro podání a vyřízení stížnosti týkající se služeb Global Health v Česku, včetně kontaktních a regulačních údajů.",
  },
  "legal/medical-disclaimer": {
    title: "Zdravotní prohlášení | Global Health Česko",
    description:
      "Zdravotní prohlášení k online péči Global Health v Česku, včetně omezení služby a pokynů pro naléhavé zdravotní situace.",
  },
  "legal/privacy-policy": {
    title: "Ochrana osobních údajů | Global Health Česko",
    description:
      "Zásady zpracování osobních a zdravotních údajů ve službách Global Health v Česku, včetně kontaktů a práv uživatelů.",
  },
  "legal/refund-policy": {
    title: "Vrácení peněz | Global Health Česko",
    description:
      "Podmínky vrácení peněz za služby Global Health v Česku, včetně postupu, kontaktních údajů a případných omezení.",
  },
  "legal/terms-of-service": {
    title: "Obchodní podmínky | Global Health Česko",
    description:
      "Obchodní podmínky používání služeb Global Health v Česku, včetně práv, povinností, plateb a omezení online péče.",
  },
  press: {
    title: "Pro média | Global Health Česko",
    description:
      "Informace pro média o Global Health v Česku: provozovatel, regulace, působnost a kontakt na tiskové oddělení pro ověření údajů.",
  },
  pricing: {
    title: "Měsíční plány online péče | Global Health Česko",
    description:
      "Porovnejte měsíční plány online péče v Česku, kredity na konzultace a další výhody. Aktuální ceny a podmínky jsou uvedeny u každého plánu.",
    h1: "Měsíční plány online péče",
  },
};

export function czechiaStaticPageSeo(
  countryCode: string | null,
  locale: string,
  path: string,
): CzechiaStaticPageSeo | null {
  return countryCode === "cz" && locale === "cs" ? COPY[path] ?? null : null;
}
