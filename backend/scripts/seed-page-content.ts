/**
 * Phase 5 seed script — GENERAL_CONSULTATION page content.
 *
 * 1. Ireland: upserts the clinic-approved IE_GP_HUB copy VERBATIM into
 *    PageContent + PUBLISHED EN translation. Idempotent — merges into an
 *    existing row (e.g. one created by the ContentPage migration script)
 *    without clobbering non-null hero/body/seo values UNLESS ours (the
 *    authored IE ones) should win, which for IE they do.
 * 2. CZ/PT/ES/RO/BR: agent-drafted adaptations, status DRAFT, never
 *    auto-published, never downgraded from PUBLISHED if the owner already
 *    published a market.
 *
 * Dry-run by default — prints the plan, writes nothing. Pass --apply to
 * write. The PageContent/PageContentTranslation tables come from a Phase-1
 * migration that has NOT been applied to this DB yet — dry-run tolerates
 * that (catches the "table missing" error and prints the in-memory plan
 * instead of querying it). --apply requires the tables to exist.
 *
 *   npx tsx scripts/seed-page-content.ts          # dry run
 *   npx tsx scripts/seed-page-content.ts --apply  # write
 */
import "dotenv/config";
import { LocaleCode, PublishStatus, ServiceVisibility } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

type FaqItem = { question: string; answer: string };

type TranslationDraft = {
  locale: LocaleCode;
  heroTitle?: string;
  heroTitleLead?: string;
  heroTitleAccent?: string;
  intro: string;
  whoForTitle: string;
  whoForIntro: string;
  whoForItems: string[];
  whyChooseTitle: string;
  whyChooseItems: string[];
  faq: FaqItem[];
  disclaimerParagraphs: string[];
  disclaimerShort: string;
  seoTitle?: string;
  seoDescription?: string;
};

type MarketDraft = {
  countryCode: string;
  status: PublishStatus;
  /** Skip the DB price lookup and use a hardcoded pricing FAQ (IE only). */
  pricingFaqOverride?: FaqItem;
  translations: TranslationDraft[];
};

// ── 1. Ireland — verbatim from frontend/lib/content/ireland-service-content.ts (IE_GP_HUB) ──

const IE: MarketDraft = {
  countryCode: "ie",
  status: PublishStatus.PUBLISHED,
  translations: [
    {
      locale: LocaleCode.EN,
      heroTitle: "Online GP Consultation in Ireland",
      heroTitleLead: "Online GP Consultation in",
      heroTitleAccent: "Ireland",
      intro:
        "Global Health connects you with doctors registered with the Irish Medical Council for online GP consultations across Ireland. Clinicians review your symptoms, history, and current concern through secure online appointments. Consultations are available in English, Portuguese, Spanish, Arabic, Urdu and more, subject to clinician availability.",
      whoForTitle: "Who this service is for",
      whoForIntro: "This consultation is suitable for assessment and management of:",
      whoForItems: [
        "Respiratory infections including cold, flu, sinusitis, bronchitis and persistent cough",
        "Sore throat, tonsillitis and ear infections",
        "Fever in adults and children",
        "Urinary tract infections and urinary symptoms",
        "Gastrointestinal symptoms including nausea, vomiting, diarrhoea and abdominal pain",
        "Headaches and migraine",
        "Skin conditions including rashes, eczema flare-ups and allergic reactions",
        "Eye infections including conjunctivitis",
        "Back pain, muscle pain and minor musculoskeletal concerns",
        "Fatigue, sleep difficulties and general health concerns",
        "Acute worsening of ongoing conditions such as hypertension, diabetes and asthma",
        "Medical certificates and sick notes when clinically appropriate",
        "Referrals for blood tests, imaging or specialist review where clinically indicated",
      ],
      whyChooseTitle: "Why choose Global Health",
      whyChooseItems: [
        "Doctors registered with the Irish Medical Council — registration numbers displayed on every profile",
        "Secure video consultations conducted to Irish telemedicine standards",
        "Open appointment slots shown during booking, subject to clinician availability",
        "Consultations available in English, Portuguese, Spanish, Arabic, Urdu, Punjabi and more — the only multilingual online clinic in Ireland",
        "Clinical documentation and follow-up guidance provided by email after every consultation",
        "Transparent pricing — no hidden fees, no membership required",
      ],
      faq: [
        {
          question: "Can I get an online GP consultation in Ireland?",
          answer:
            "Yes. Global Health provides online GP consultations in Ireland with doctors registered with the Irish Medical Council. Available appointment times are shown during booking.",
        },
        {
          question: "How much does an online GP consultation cost in Ireland?",
          answer:
            "Online GP consultations at Global Health cost from €39 for a 25-minute video consultation with an IMC-registered doctor. There are no hidden fees and no membership required.",
        },
        {
          question: "Is an online GP consultation as valid as an in-person one in Ireland?",
          answer:
            "Yes. All doctors at Global Health are registered with the Irish Medical Council. Online consultations are conducted under the same clinical standards as in-person consultations and are explicitly permitted under Irish Medical Council guidelines on telemedicine.",
        },
        {
          question: "Can I see a doctor online in a language other than English in Ireland?",
          answer:
            "Yes. Global Health is the only online clinic in Ireland offering consultations in English, Portuguese, Spanish, Arabic, Urdu, Punjabi, Czech and French. You can select a doctor by language when booking.",
        },
        {
          question: "How quickly can I see a doctor online in Ireland?",
          answer:
            "Open slots are shown during booking and depend on the selected service and clinician schedule. You will receive confirmation after completing your booking.",
        },
        {
          question: "What happens after my online GP consultation?",
          answer:
            "Following your consultation your doctor will send clinical notes and follow-up guidance to your email. Referrals for blood tests, imaging or specialist review will be arranged where clinically indicated.",
        },
        {
          question: "Can an online GP in Ireland provide referrals?",
          answer:
            "Yes. Our IMC-registered GPs can provide referrals to hospital consultants and arrange referrals for blood tests, scans including X-ray, ultrasound and MRI, and specialist review where clinically appropriate.",
        },
        {
          question: "Do I need to register or create an account to book?",
          answer:
            "You can book a consultation without a full account. Creating an account allows you to access your consultation history and clinical notes after your appointment.",
        },
      ],
      disclaimerParagraphs: [
        "All GP services provided through Global Health in Ireland are delivered at GP level in accordance with Irish telehealth and medical practice standards, by doctors registered with the Irish Medical Council.",
        "Our online doctors conduct remote clinical assessments and may provide treatment recommendations, referrals, or medical certificates only where clinically appropriate and at the treating doctor's professional discretion. Clinical decisions remain entirely at the doctor's discretion following assessment.",
        "Our doctors do not routinely prescribe controlled substances through online consultations.",
        "Regarding sick notes and medical certificates: employers may require a medical certificate from a GP during sick leave. Whether a certificate is issued depends on the nature of your condition and the outcome of the clinical assessment — the doctor may or may not issue a certificate following consultation. Electronic sick leave certificates issued through our platform are not accepted by the Department of Social Protection in Ireland. Patients requiring documentation for Department of Social Protection purposes should attend an in-person GP consultation. Our doctors do not routinely issue backdated sick notes due to the absence of direct clinical assessment at the time of illness.",
        "Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, please contact emergency services immediately by calling 112 or attend your nearest emergency department.",
      ],
      disclaimerShort:
        "All services in Ireland are provided at GP level by IMC-registered doctors. Treatment recommendations, referrals and medical certificates may be issued only when clinically appropriate and at the doctor's discretion. Our doctors do not routinely prescribe controlled substances through online consultations. Electronic sick leave certificates are not accepted by the Department of Social Protection in Ireland. Backdated sick notes are not routinely issued. In a medical emergency call 112.",
      seoTitle: "Online GP Consultation in Ireland | Global Health",
      seoDescription:
        "Online GP consultations with IMC-registered doctors in Ireland. Choose from open appointment slots where available.",
    },
  ],
};

// ── 2. Draft markets — generic, verifiable-only copy per country ──

type MarketConfig = {
  countryCode: string;
  regulator: string;
  emergency: string;
  locale: LocaleCode;
  localeLabel: string; // for hero-title composition helper text only
};

const DRAFT_MARKETS: MarketConfig[] = [
  { countryCode: "cz", regulator: "Česká lékařská komora (ČLK)", emergency: "112", locale: LocaleCode.CS, localeLabel: "cs" },
  { countryCode: "pt", regulator: "Ordem dos Médicos", emergency: "112", locale: LocaleCode.PT, localeLabel: "pt" },
  { countryCode: "es", regulator: "Organización Médica Colegial (colegios de médicos)", emergency: "112", locale: LocaleCode.ES, localeLabel: "es" },
  { countryCode: "ro", regulator: "Colegiul Medicilor din România", emergency: "112", locale: LocaleCode.RO, localeLabel: "ro" },
  { countryCode: "br", regulator: "CRM (Conselho Regional de Medicina)", emergency: "SAMU 192", locale: LocaleCode.PT, localeLabel: "pt-br" },
];

/** Generic disclaimer paragraphs modelled on IE §1,2,3,5 (skips IE §4 — DSP sick-cert specifics, not verifiable elsewhere). */
function genericDisclaimerParagraphsEn(regulator: string, emergency: string): string[] {
  return [
    `All GP services provided through Global Health are delivered at GP level by doctors registered with ${regulator}.`,
    "Our online doctors conduct remote clinical assessments and may provide treatment recommendations, referrals, or medical certificates only where clinically appropriate and at the treating doctor's professional discretion. Clinical decisions remain entirely at the doctor's discretion following assessment.",
    "Our doctors do not routinely prescribe controlled substances through online consultations.",
    `Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, please contact emergency services immediately by calling ${emergency} or attend your nearest emergency department.`,
  ];
}

function genericDisclaimerShortEn(regulator: string, emergency: string): string {
  return `All services are provided at GP level by doctors registered with ${regulator}. Treatment recommendations, referrals and medical certificates may be issued only when clinically appropriate and at the doctor's discretion. Our doctors do not routinely prescribe controlled substances through online consultations. In a medical emergency call ${emergency}.`;
}

const WHO_FOR_ITEMS_EN = [
  "Respiratory infections including cold, flu, sinusitis, bronchitis and persistent cough",
  "Sore throat, tonsillitis and ear infections",
  "Fever in adults and children",
  "Urinary tract infections and urinary symptoms",
  "Gastrointestinal symptoms including nausea, vomiting, diarrhoea and abdominal pain",
  "Headaches and migraine",
  "Skin conditions including rashes, eczema flare-ups and allergic reactions",
  "Eye infections including conjunctivitis",
  "Back pain, muscle pain and minor musculoskeletal concerns",
  "Fatigue, sleep difficulties and general health concerns",
  "Acute worsening of ongoing conditions such as hypertension, diabetes and asthma",
  "Referrals for blood tests, imaging or specialist review where clinically indicated",
];

function whyChooseItemsEn(regulator: string): string[] {
  return [
    `Doctors registered with ${regulator}`,
    "Secure video consultations",
    "Transparent pricing — no hidden fees, no membership required",
    "Consultations available in multiple languages, subject to clinician availability",
    "Clinical documentation and follow-up guidance provided by email after every consultation",
  ];
}

function faqEn(regulator: string, priceLine: string | null): FaqItem[] {
  const items: FaqItem[] = [
    {
      question: "Can I get an online GP consultation?",
      answer: `Yes. Global Health provides online GP consultations with doctors registered with ${regulator}. Available appointment times are shown during booking.`,
    },
  ];
  if (priceLine) {
    items.push({
      question: "How much does an online GP consultation cost?",
      answer: `Online GP consultations at Global Health cost ${priceLine}. There are no hidden fees and no membership required.`,
    });
  }
  items.push(
    {
      question: "Is an online consultation conducted by a registered doctor?",
      answer: `Yes. All doctors offering this service through Global Health are registered with ${regulator}.`,
    },
    {
      question: "What happens after my online GP consultation?",
      answer:
        "Following your consultation your doctor will send clinical notes and follow-up guidance to your email. Referrals for blood tests, imaging or specialist review will be arranged where clinically indicated.",
    },
    {
      question: "Can an online GP provide referrals?",
      answer: `Yes. Our doctors, registered with ${regulator}, can provide referrals for further tests or specialist review where clinically appropriate.`,
    },
    {
      question: "Do I need to register or create an account to book?",
      answer:
        "You can book a consultation without a full account. Creating an account allows you to access your consultation history and clinical notes after your appointment.",
    },
  );
  return items;
}

/** Native-language copy per market. English strings above are the EN row; this map holds the default-locale row. */
const NATIVE_COPY: Record<
  string,
  {
    heroTitleLead: string;
    heroTitleAccent: string;
    intro: string;
    whoForTitle: string;
    whoForIntro: string;
    whoForItems: string[];
    whyChooseTitle: string;
    whyChooseItems: (regulator: string) => string[];
    faq: (regulator: string, priceLine: string | null) => FaqItem[];
    disclaimerParagraphs: (regulator: string, emergency: string) => string[];
    disclaimerShort: (regulator: string, emergency: string) => string;
    seoTitle: string;
    seoDescription: string;
  }
> = {
  cz: {
    heroTitleLead: "Online konzultace s praktickým lékařem v",
    heroTitleAccent: "Česku",
    intro:
      "Global Health vás spojí s lékaři registrovanými u České lékařské komory (ČLK) pro online konzultace s praktickým lékařem. Lékaři posoudí vaše příznaky, anamnézu a aktuální potíže během bezpečné online konzultace.",
    whoForTitle: "Pro koho je tato služba určena",
    whoForIntro: "Tato konzultace je vhodná pro posouzení a řešení těchto obtíží:",
    whoForItems: [
      "Respirační infekce včetně nachlazení, chřipky, zánětu vedlejších nosních dutin, bronchitidy a přetrvávajícího kašle",
      "Bolest v krku, angína a zánět uší",
      "Horečka u dospělých i dětí",
      "Infekce močových cest a potíže s močením",
      "Gastrointestinální potíže včetně nevolnosti, zvracení, průjmu a bolesti břicha",
      "Bolesti hlavy a migréna",
      "Kožní potíže včetně vyrážek, ekzémů a alergických reakcí",
      "Oční infekce včetně zánětu spojivek",
      "Bolesti zad, svalů a drobné potíže pohybového aparátu",
      "Únava, potíže se spánkem a obecné zdravotní potíže",
      "Akutní zhoršení chronických onemocnění, jako je hypertenze, diabetes a astma",
      "Doporučení k dalším vyšetřením nebo specialistovi, je-li to klinicky indikováno",
    ],
    whyChooseTitle: "Proč zvolit Global Health",
    whyChooseItems: (_regulator) => [
      `Lékaři registrovaní u České lékařské komory (ČLK)`,
      "Zabezpečené video konzultace",
      "Transparentní ceny — žádné skryté poplatky, žádné povinné členství",
      "Konzultace dostupné ve více jazycích podle dostupnosti lékaře",
      "Lékařská dokumentace a doporučení k dalšímu postupu zaslané e-mailem po každé konzultaci",
    ],
    faq: (_regulator, priceLine) => {
      const items: FaqItem[] = [
        {
          question: "Mohu absolvovat online konzultaci s praktickým lékařem?",
          answer: `Ano. Global Health poskytuje online konzultace s praktickým lékařem s lékaři registrovanými u České lékařské komory (ČLK). Dostupné termíny se zobrazují při rezervaci.`,
        },
      ];
      if (priceLine) {
        items.push({
          question: "Kolik stojí online konzultace s praktickým lékařem?",
          answer: `Online konzultace u Global Health stojí ${priceLine}. Žádné skryté poplatky, žádné povinné členství.`,
        });
      }
      items.push(
        {
          question: "Provádí konzultaci registrovaný lékař?",
          answer: `Ano. Všichni lékaři poskytující tuto službu prostřednictvím Global Health jsou registrováni u České lékařské komory (ČLK).`,
        },
        {
          question: "Co se děje po online konzultaci?",
          answer:
            "Po konzultaci vám lékař zašle e-mailem klinické poznámky a doporučení k dalšímu postupu. Doporučení k dalším vyšetřením nebo specialistovi bude zajištěno, je-li to klinicky indikováno.",
        },
        {
          question: "Může online lékař vystavit doporučení?",
          answer: `Ano. Naši lékaři, registrovaní u České lékařské komory (ČLK), mohou vystavit doporučení k dalším vyšetřením nebo ke specialistovi, je-li to klinicky vhodné.`,
        },
        {
          question: "Musím se registrovat nebo založit účet pro rezervaci?",
          answer:
            "Konzultaci si můžete rezervovat i bez založení účtu. Založení účtu vám umožní přístup k historii konzultací a klinickým poznámkám po vaší návštěvě.",
        },
      );
      return items;
    },
    disclaimerParagraphs: (_regulator, emergency) => [
      `Veškeré služby praktického lékaře poskytované prostřednictvím Global Health jsou poskytovány na úrovni praktického lékaře lékaři registrovanými u České lékařské komory (ČLK).`,
      "Naši online lékaři provádějí vzdálené klinické posouzení a mohou poskytnout doporučení k léčbě, doporučení k dalšímu vyšetření nebo lékařská potvrzení pouze tam, kde je to klinicky vhodné, a to výhradně na základě odborného uvážení ošetřujícího lékaře. Klinická rozhodnutí zůstávají zcela v pravomoci lékaře po provedeném posouzení.",
      "Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací.",
      `Online konzultace nejsou vhodné pro řešení zdravotních pohotovostních stavů. Pokud se nacházíte v život ohrožující situaci, neprodleně kontaktujte záchrannou službu na čísle ${emergency} nebo vyhledejte nejbližší pohotovost.`,
    ],
    disclaimerShort: (_regulator, emergency) =>
      `Veškeré služby jsou poskytovány na úrovni praktického lékaře lékaři registrovanými u České lékařské komory (ČLK). Doporučení k léčbě, další vyšetření a lékařská potvrzení mohou být vydána pouze tam, kde je to klinicky vhodné a na základě uvážení lékaře. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací. V případě zdravotní pohotovosti volejte ${emergency}.`,
    seoTitle: "Online konzultace s praktickým lékařem v Česku | Global Health",
    seoDescription:
      "Online konzultace s praktickým lékařem s lékaři registrovanými u České lékařské komory (ČLK).",
  },
  pt: {
    heroTitleLead: "Consulta Médica Online em",
    heroTitleAccent: "Portugal",
    intro:
      "A Global Health liga-o a médicos inscritos na Ordem dos Médicos para consultas médicas online em Portugal. Os médicos avaliam os seus sintomas, historial clínico e situação atual através de uma consulta online segura.",
    whoForTitle: "Para quem é este serviço",
    whoForIntro: "Esta consulta é adequada para avaliação e gestão de:",
    whoForItems: [
      "Infeções respiratórias, incluindo constipação, gripe, sinusite, bronquite e tosse persistente",
      "Dor de garganta, amigdalite e infeções de ouvido",
      "Febre em adultos e crianças",
      "Infeções urinárias e sintomas urinários",
      "Sintomas gastrointestinais, incluindo náuseas, vómitos, diarreia e dor abdominal",
      "Dores de cabeça e enxaqueca",
      "Problemas de pele, incluindo erupções cutâneas, eczema e reações alérgicas",
      "Infeções oculares, incluindo conjuntivite",
      "Dor nas costas, dor muscular e queixas musculoesqueléticas ligeiras",
      "Fadiga, dificuldades de sono e questões gerais de saúde",
      "Agravamento agudo de condições crónicas como hipertensão, diabetes e asma",
      "Referenciação para análises, exames de imagem ou avaliação por especialista quando clinicamente indicado",
    ],
    whyChooseTitle: "Porquê escolher a Global Health",
    whyChooseItems: (regulator) => [
      `Médicos inscritos na ${regulator}`,
      "Consultas por vídeo seguras",
      "Preços transparentes — sem custos ocultos, sem subscrição obrigatória",
      "Consultas disponíveis em vários idiomas, consoante a disponibilidade do médico",
      "Documentação clínica e orientação de seguimento enviadas por email após cada consulta",
    ],
    faq: (regulator, priceLine) => {
      const items: FaqItem[] = [
        {
          question: "Posso ter uma consulta médica online?",
          answer: `Sim. A Global Health disponibiliza consultas médicas online com médicos inscritos na ${regulator}. Os horários disponíveis são apresentados durante a marcação.`,
        },
      ];
      if (priceLine) {
        items.push({
          question: "Quanto custa uma consulta médica online?",
          answer: `As consultas médicas online na Global Health custam ${priceLine}. Sem custos ocultos, sem subscrição obrigatória.`,
        });
      }
      items.push(
        {
          question: "A consulta é realizada por um médico inscrito na ordem profissional?",
          answer: `Sim. Todos os médicos que prestam este serviço através da Global Health estão inscritos na ${regulator}.`,
        },
        {
          question: "O que acontece depois da minha consulta online?",
          answer:
            "Após a consulta, o seu médico enviará por email as notas clínicas e orientações de seguimento. Serão organizadas referenciações para análises, exames de imagem ou avaliação por especialista quando clinicamente indicado.",
        },
        {
          question: "Um médico online pode fazer referenciações?",
          answer: `Sim. Os nossos médicos, inscritos na ${regulator}, podem referenciar para exames adicionais ou avaliação por especialista quando clinicamente apropriado.`,
        },
        {
          question: "Preciso de criar conta para marcar consulta?",
          answer:
            "Pode marcar uma consulta sem criar uma conta completa. Criar uma conta permite aceder ao histórico de consultas e notas clínicas após a marcação.",
        },
      );
      return items;
    },
    disclaimerParagraphs: (regulator, emergency) => [
      `Todos os serviços médicos prestados através da Global Health são realizados ao nível de clínica geral por médicos inscritos na ${regulator}.`,
      "Os nossos médicos online realizam avaliações clínicas remotas e podem fornecer recomendações de tratamento, referenciações ou atestados médicos apenas quando clinicamente apropriado, ao critério profissional do médico assistente. As decisões clínicas permanecem inteiramente ao critério do médico após a avaliação.",
      "Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.",
      `As consultas online não são adequadas para emergências médicas. Em caso de emergência médica, contacte imediatamente os serviços de emergência através do número ${emergency} ou dirija-se ao serviço de urgência mais próximo.`,
    ],
    disclaimerShort: (regulator, emergency) =>
      `Todos os serviços são prestados ao nível de clínica geral por médicos inscritos na ${regulator}. Recomendações de tratamento, referenciações e atestados médicos só são emitidos quando clinicamente apropriado e ao critério do médico. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online. Em caso de emergência médica ligue ${emergency}.`,
    seoTitle: "Consulta Médica Online em Portugal | Global Health",
    seoDescription: "Consultas médicas online com médicos inscritos na Ordem dos Médicos em Portugal.",
  },
  es: {
    heroTitleLead: "Consulta Médica Online en",
    heroTitleAccent: "España",
    intro:
      "Global Health le conecta con médicos colegiados a través de la Organización Médica Colegial para consultas médicas online en España. Los médicos evalúan sus síntomas, historial y situación actual mediante una consulta online segura.",
    whoForTitle: "Para quién es este servicio",
    whoForIntro: "Esta consulta es adecuada para la evaluación y el manejo de:",
    whoForItems: [
      "Infecciones respiratorias, incluyendo resfriado, gripe, sinusitis, bronquitis y tos persistente",
      "Dolor de garganta, amigdalitis e infecciones de oído",
      "Fiebre en adultos y niños",
      "Infecciones urinarias y síntomas urinarios",
      "Síntomas gastrointestinales, incluyendo náuseas, vómitos, diarrea y dolor abdominal",
      "Dolores de cabeza y migraña",
      "Afecciones cutáneas, incluyendo erupciones, brotes de eczema y reacciones alérgicas",
      "Infecciones oculares, incluyendo conjuntivitis",
      "Dolor de espalda, dolor muscular y molestias musculoesqueléticas leves",
      "Fatiga, dificultades para dormir y preocupaciones generales de salud",
      "Empeoramiento agudo de afecciones crónicas como hipertensión, diabetes y asma",
      "Derivaciones para análisis, pruebas de imagen o valoración por especialista cuando esté clínicamente indicado",
    ],
    whyChooseTitle: "Por qué elegir Global Health",
    whyChooseItems: (regulator) => [
      `Médicos colegiados a través de la ${regulator}`,
      "Videoconsultas seguras",
      "Precios transparentes — sin costes ocultos, sin suscripción obligatoria",
      "Consultas disponibles en varios idiomas, según disponibilidad del médico",
      "Documentación clínica y orientación de seguimiento enviada por correo electrónico tras cada consulta",
    ],
    faq: (regulator, priceLine) => {
      const items: FaqItem[] = [
        {
          question: "¿Puedo tener una consulta médica online?",
          answer: `Sí. Global Health ofrece consultas médicas online con médicos colegiados a través de la ${regulator}. Los horarios disponibles se muestran durante la reserva.`,
        },
      ];
      if (priceLine) {
        items.push({
          question: "¿Cuánto cuesta una consulta médica online?",
          answer: `Las consultas médicas online en Global Health cuestan ${priceLine}. Sin costes ocultos ni suscripción obligatoria.`,
        });
      }
      items.push(
        {
          question: "¿La consulta la realiza un médico colegiado?",
          answer: `Sí. Todos los médicos que prestan este servicio a través de Global Health están colegiados a través de la ${regulator}.`,
        },
        {
          question: "¿Qué ocurre después de mi consulta online?",
          answer:
            "Tras la consulta, su médico enviará por correo electrónico las notas clínicas y la orientación de seguimiento. Se gestionarán derivaciones para análisis, pruebas de imagen o valoración por especialista cuando esté clínicamente indicado.",
        },
        {
          question: "¿Puede un médico online realizar derivaciones?",
          answer: `Sí. Nuestros médicos, colegiados a través de la ${regulator}, pueden derivar a pruebas adicionales o valoración por especialista cuando sea clínicamente apropiado.`,
        },
        {
          question: "¿Necesito registrarme o crear una cuenta para reservar?",
          answer:
            "Puede reservar una consulta sin crear una cuenta completa. Crear una cuenta le permite acceder a su historial de consultas y notas clínicas tras la cita.",
        },
      );
      return items;
    },
    disclaimerParagraphs: (regulator, emergency) => [
      `Todos los servicios médicos prestados a través de Global Health se realizan a nivel de medicina general por médicos colegiados a través de la ${regulator}.`,
      "Nuestros médicos online realizan evaluaciones clínicas remotas y pueden proporcionar recomendaciones de tratamiento, derivaciones o certificados médicos únicamente cuando sea clínicamente apropiado, a criterio profesional del médico tratante. Las decisiones clínicas permanecen enteramente a criterio del médico tras la evaluación.",
      "Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online.",
      `Las consultas online no son adecuadas para emergencias médicas. Si tiene una emergencia médica, contacte inmediatamente con los servicios de emergencia llamando al ${emergency} o acuda a su servicio de urgencias más cercano.`,
    ],
    disclaimerShort: (regulator, emergency) =>
      `Todos los servicios se prestan a nivel de medicina general por médicos colegiados a través de la ${regulator}. Las recomendaciones de tratamiento, derivaciones y certificados médicos solo se emiten cuando es clínicamente apropiado y a criterio del médico. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online. En caso de emergencia médica llame al ${emergency}.`,
    seoTitle: "Consulta Médica Online en España | Global Health",
    seoDescription: "Consultas médicas online con médicos colegiados a través de la Organización Médica Colegial en España.",
  },
  ro: {
    heroTitleLead: "Consultație Medicală Online în",
    heroTitleAccent: "România",
    intro:
      "Global Health vă conectează cu medici înregistrați la Colegiul Medicilor din România pentru consultații medicale online. Medicii evaluează simptomele, istoricul medical și problema actuală printr-o consultație online securizată.",
    whoForTitle: "Pentru cine este acest serviciu",
    whoForIntro: "Această consultație este potrivită pentru evaluarea și gestionarea:",
    whoForItems: [
      "Infecții respiratorii, inclusiv răceală, gripă, sinuzită, bronșită și tuse persistentă",
      "Durere în gât, amigdalită și infecții ale urechii",
      "Febră la adulți și copii",
      "Infecții urinare și simptome urinare",
      "Simptome gastrointestinale, inclusiv greață, vărsături, diaree și dureri abdominale",
      "Dureri de cap și migrenă",
      "Afecțiuni ale pielii, inclusiv erupții cutanate, eczeme și reacții alergice",
      "Infecții oculare, inclusiv conjunctivită",
      "Dureri de spate, dureri musculare și afecțiuni musculo-scheletice minore",
      "Oboseală, dificultăți de somn și probleme generale de sănătate",
      "Agravarea acută a afecțiunilor cronice precum hipertensiunea, diabetul și astmul",
      "Trimiteri pentru analize, imagistică sau evaluare de specialitate atunci când este indicat clinic",
    ],
    whyChooseTitle: "De ce să alegeți Global Health",
    whyChooseItems: (regulator) => [
      `Medici înregistrați la ${regulator}`,
      "Consultații video securizate",
      "Prețuri transparente — fără costuri ascunse, fără abonament obligatoriu",
      "Consultații disponibile în mai multe limbi, în funcție de disponibilitatea medicului",
      "Documentație clinică și recomandări de urmărire trimise prin email după fiecare consultație",
    ],
    faq: (regulator, priceLine) => {
      const items: FaqItem[] = [
        {
          question: "Pot avea o consultație medicală online?",
          answer: `Da. Global Health oferă consultații medicale online cu medici înregistrați la ${regulator}. Orele disponibile sunt afișate în timpul rezervării.`,
        },
      ];
      if (priceLine) {
        items.push({
          question: "Cât costă o consultație medicală online?",
          answer: `Consultațiile medicale online la Global Health costă ${priceLine}. Fără costuri ascunse, fără abonament obligatoriu.`,
        });
      }
      items.push(
        {
          question: "Consultația este realizată de un medic înregistrat?",
          answer: `Da. Toți medicii care oferă acest serviciu prin Global Health sunt înregistrați la ${regulator}.`,
        },
        {
          question: "Ce se întâmplă după consultația mea online?",
          answer:
            "După consultație, medicul dumneavoastră va trimite prin email notele clinice și recomandările de urmărire. Trimiterile pentru analize, imagistică sau evaluare de specialitate vor fi organizate atunci când este indicat clinic.",
        },
        {
          question: "Poate un medic online să facă trimiteri?",
          answer: `Da. Medicii noștri, înregistrați la ${regulator}, pot face trimiteri pentru analize suplimentare sau evaluare de specialitate atunci când este clinic adecvat.`,
        },
        {
          question: "Trebuie să mă înregistrez sau să îmi creez un cont pentru rezervare?",
          answer:
            "Puteți rezerva o consultație fără un cont complet. Crearea unui cont vă permite accesul la istoricul consultațiilor și notele clinice după programare.",
        },
      );
      return items;
    },
    disclaimerParagraphs: (regulator, emergency) => [
      `Toate serviciile medicale oferite prin Global Health sunt furnizate la nivel de medicină de familie de către medici înregistrați la ${regulator}.`,
      "Medicii noștri online efectuează evaluări clinice la distanță și pot oferi recomandări de tratament, trimiteri sau certificate medicale doar atunci când este clinic adecvat, la discreția profesională a medicului curant. Deciziile clinice rămân în întregime la discreția medicului în urma evaluării.",
      "Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online.",
      `Consultațiile online nu sunt potrivite pentru urgențe medicale. Dacă vă confruntați cu o urgență medicală, contactați imediat serviciile de urgență la numărul ${emergency} sau mergeți la cea mai apropiată unitate de primiri urgențe.`,
    ],
    disclaimerShort: (regulator, emergency) =>
      `Toate serviciile sunt furnizate la nivel de medicină de familie de către medici înregistrați la ${regulator}. Recomandările de tratament, trimiterile și certificatele medicale sunt emise doar atunci când este clinic adecvat și la discreția medicului. Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online. În caz de urgență medicală sunați la ${emergency}.`,
    seoTitle: "Consultație Medicală Online în România | Global Health",
    seoDescription: "Consultații medicale online cu medici înregistrați la Colegiul Medicilor din România.",
  },
  br: {
    heroTitleLead: "Consulta Médica Online no",
    heroTitleAccent: "Brasil",
    intro:
      "A Global Health conecta você a médicos inscritos no CRM (Conselho Regional de Medicina) para consultas médicas online. Os médicos avaliam seus sintomas, histórico e queixa atual por meio de uma consulta online segura.",
    whoForTitle: "Para quem é este serviço",
    whoForIntro: "Esta consulta é indicada para avaliação e manejo de:",
    whoForItems: [
      "Infecções respiratórias, incluindo resfriado, gripe, sinusite, bronquite e tosse persistente",
      "Dor de garganta, amigdalite e infecções de ouvido",
      "Febre em adultos e crianças",
      "Infecções urinárias e sintomas urinários",
      "Sintomas gastrointestinais, incluindo náusea, vômito, diarreia e dor abdominal",
      "Dores de cabeça e enxaqueca",
      "Problemas de pele, incluindo erupções, crises de eczema e reações alérgicas",
      "Infecções oculares, incluindo conjuntivite",
      "Dor nas costas, dor muscular e queixas musculoesqueléticas leves",
      "Fadiga, dificuldades para dormir e questões gerais de saúde",
      "Piora aguda de condições crônicas como hipertensão, diabetes e asma",
      "Encaminhamento para exames laboratoriais, de imagem ou avaliação especializada quando clinicamente indicado",
    ],
    whyChooseTitle: "Por que escolher a Global Health",
    whyChooseItems: (regulator) => [
      `Médicos inscritos no ${regulator}`,
      "Videoconsultas seguras",
      "Preços transparentes — sem taxas ocultas, sem assinatura obrigatória",
      "Consultas disponíveis em vários idiomas, conforme disponibilidade do médico",
      "Documentação clínica e orientações de acompanhamento enviadas por e-mail após cada consulta",
    ],
    faq: (regulator, priceLine) => {
      const items: FaqItem[] = [
        {
          question: "Posso fazer uma consulta médica online?",
          answer: `Sim. A Global Health oferece consultas médicas online com médicos inscritos no ${regulator}. Os horários disponíveis são exibidos durante o agendamento.`,
        },
      ];
      if (priceLine) {
        items.push({
          question: "Quanto custa uma consulta médica online?",
          answer: `As consultas médicas online na Global Health custam ${priceLine}. Sem taxas ocultas, sem assinatura obrigatória.`,
        });
      }
      items.push(
        {
          question: "A consulta é realizada por um médico inscrito no conselho profissional?",
          answer: `Sim. Todos os médicos que prestam este serviço pela Global Health são inscritos no ${regulator}.`,
        },
        {
          question: "O que acontece depois da minha consulta online?",
          answer:
            "Após a consulta, seu médico enviará por e-mail as notas clínicas e orientações de acompanhamento. Encaminhamentos para exames laboratoriais, de imagem ou avaliação especializada serão organizados quando clinicamente indicado.",
        },
        {
          question: "Um médico online pode fazer encaminhamentos?",
          answer: `Sim. Nossos médicos, inscritos no ${regulator}, podem encaminhar para exames adicionais ou avaliação especializada quando clinicamente apropriado.`,
        },
        {
          question: "Preciso me cadastrar ou criar uma conta para agendar?",
          answer:
            "Você pode agendar uma consulta sem criar uma conta completa. Criar uma conta permite acessar o histórico de consultas e notas clínicas após o atendimento.",
        },
      );
      return items;
    },
    disclaimerParagraphs: (regulator, emergency) => [
      `Todos os serviços médicos prestados pela Global Health são realizados no nível de clínica geral por médicos inscritos no ${regulator}.`,
      "Nossos médicos online realizam avaliações clínicas remotas e podem fornecer recomendações de tratamento, encaminhamentos ou atestados médicos apenas quando clinicamente apropriado, a critério profissional do médico responsável. As decisões clínicas permanecem inteiramente a critério do médico após a avaliação.",
      "Nossos médicos não prescrevem rotineiramente substâncias controladas por meio de consultas online.",
      `Consultas online não são adequadas para emergências médicas. Em caso de emergência médica, contate imediatamente o serviço de emergência pelo número ${emergency} ou dirija-se ao pronto-socorro mais próximo.`,
    ],
    disclaimerShort: (regulator, emergency) =>
      `Todos os serviços são prestados no nível de clínica geral por médicos inscritos no ${regulator}. Recomendações de tratamento, encaminhamentos e atestados médicos só são emitidos quando clinicamente apropriado e a critério do médico. Nossos médicos não prescrevem rotineiramente substâncias controladas por meio de consultas online. Em emergência médica ligue para ${emergency}.`,
    seoTitle: "Consulta Médica Online no Brasil | Global Health",
    seoDescription: "Consultas médicas online com médicos inscritos no CRM (Conselho Regional de Medicina).",
  },
};

async function cheapestGeneralPriceLine(countryCode: string, locale: LocaleCode): Promise<string | null> {
  try {
    const country = await prisma.country.findUnique({ where: { code: countryCode }, select: { id: true } });
    if (!country) return null;
    const service = await prisma.service.findFirst({
      where: {
        countryId: country.id,
        kind: "GENERAL",
        isActive: true,
        visibility: ServiceVisibility.PUBLIC,
        basePriceCents: { not: null },
        currencyCode: { not: null },
      },
      orderBy: { basePriceCents: "asc" },
      select: { basePriceCents: true, currencyCode: true },
    });
    if (!service?.basePriceCents || !service.currencyCode) return null;
    const localeTag = { CS: "cs-CZ", PT: "pt-PT", ES: "es-ES", RO: "ro-RO", EN: "en-IE", DE: "de-DE" }[locale] ?? "en-IE";
    const formatted = new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: service.currencyCode,
    }).format(service.basePriceCents / 100);
    return formatted;
  } catch {
    // ponytail: table-not-migrated / no-DB-access in dry-run context — pricing FAQ is simply omitted per spec
    return null;
  }
}

function fromLine(formatted: string, locale: LocaleCode): string {
  const prefix: Record<string, string> = {
    CS: "od",
    PT: "a partir de",
    ES: "desde",
    RO: "de la",
    EN: "from",
  };
  return `${prefix[locale] ?? "from"} ${formatted}`;
}

async function buildDraftMarket(cfg: MarketConfig): Promise<MarketDraft> {
  const native = NATIVE_COPY[cfg.countryCode];
  const priceFormatted = await cheapestGeneralPriceLine(cfg.countryCode, cfg.locale);
  const priceLineNative = priceFormatted ? fromLine(priceFormatted, cfg.locale) : null;
  const priceLineEn = priceFormatted ? `from ${priceFormatted}` : null;

  const nativeTranslation: TranslationDraft = {
    locale: cfg.locale,
    heroTitle: `${native.heroTitleLead} ${native.heroTitleAccent}`,
    heroTitleLead: native.heroTitleLead,
    heroTitleAccent: native.heroTitleAccent,
    intro: native.intro,
    whoForTitle: native.whoForTitle,
    whoForIntro: native.whoForIntro,
    whoForItems: native.whoForItems,
    whyChooseTitle: native.whyChooseTitle,
    whyChooseItems: native.whyChooseItems(cfg.regulator),
    faq: native.faq(cfg.regulator, priceLineNative),
    disclaimerParagraphs: native.disclaimerParagraphs(cfg.regulator, cfg.emergency),
    disclaimerShort: native.disclaimerShort(cfg.regulator, cfg.emergency),
    seoTitle: native.seoTitle,
    seoDescription: native.seoDescription,
  };

  const enTranslation: TranslationDraft = {
    locale: LocaleCode.EN,
    heroTitle: `Online GP Consultation in ${native.heroTitleAccent}`,
    heroTitleLead: "Online GP Consultation in",
    heroTitleAccent: native.heroTitleAccent,
    intro: `Global Health connects you with doctors registered with ${cfg.regulator} for online GP consultations. Clinicians review your symptoms, history, and current concern through a secure online appointment.`,
    whoForTitle: "Who this service is for",
    whoForIntro: "This consultation is suitable for assessment and management of:",
    whoForItems: WHO_FOR_ITEMS_EN,
    whyChooseTitle: "Why choose Global Health",
    whyChooseItems: whyChooseItemsEn(cfg.regulator),
    faq: faqEn(cfg.regulator, priceLineEn),
    disclaimerParagraphs: genericDisclaimerParagraphsEn(cfg.regulator, cfg.emergency),
    disclaimerShort: genericDisclaimerShortEn(cfg.regulator, cfg.emergency),
    seoTitle: `Online GP Consultation in ${native.heroTitleAccent} | Global Health`,
    seoDescription: `Online GP consultations with doctors registered with ${cfg.regulator}.`,
  };

  return {
    countryCode: cfg.countryCode,
    status: PublishStatus.DRAFT,
    translations: [nativeTranslation, enTranslation],
  };
}

// ── Writers ──

async function upsertMarket(draft: MarketDraft, opts: { neverDowngradeToDraft: boolean }) {
  const country = await prisma.country.findUnique({
    where: { code: draft.countryCode },
    select: { id: true },
  });
  if (!country) throw new Error(`Country not found: ${draft.countryCode}`);

  const existing = await prisma.pageContent.findUnique({
    where: { countryId_pageKey: { countryId: country.id, pageKey: "GENERAL_CONSULTATION" } },
  });

  // Status resolution: IE always wins with our authored PUBLISHED status.
  // Drafts: never downgrade an already-published row; never auto-upgrade
  // to PUBLISHED — only set DRAFT if there's no existing row, or the
  // existing row is itself still DRAFT.
  let status = draft.status;
  if (opts.neverDowngradeToDraft && existing && existing.status === PublishStatus.PUBLISHED) {
    status = PublishStatus.PUBLISHED; // leave owner's publish decision alone
  }

  if (!APPLY) return { countryId: country.id, willCreate: !existing, status };

  await prisma.pageContent.upsert({
    where: { countryId_pageKey: { countryId: country.id, pageKey: "GENERAL_CONSULTATION" } },
    create: {
      countryId: country.id,
      pageKey: "GENERAL_CONSULTATION",
      status,
      isActive: true,
      showIntro: true,
      showWhoFor: true,
      showWhyChoose: true,
      showFaq: true,
      showDisclaimer: true,
      showBody: false,
    },
    update:
      // Draft markets updating an already-PUBLISHED row (e.g. a row migrated
      // from the old ContentPage CMS): write NOTHING to status or toggles —
      // flipping toggles on a live row would publish unreviewed drafted copy.
      // The drafted translations below still land (null-fill only), hidden
      // until the owner enables the sections in /admin/page-content.
      opts.neverDowngradeToDraft && existing?.status === PublishStatus.PUBLISHED
        ? {}
        : {
            status,
            showIntro: true,
            showWhoFor: true,
            showWhyChoose: true,
            showFaq: true,
            showDisclaimer: true,
            // showBody intentionally left untouched on update — don't clobber an
            // admin's independent rich-body toggle.
          },
  });

  const base = await prisma.pageContent.findUniqueOrThrow({
    where: { countryId_pageKey: { countryId: country.id, pageKey: "GENERAL_CONSULTATION" } },
  });

  for (const t of draft.translations) {
    const existingTranslation = await prisma.pageContentTranslation.findUnique({
      where: { pageContentId_locale: { pageContentId: base.id, locale: t.locale } },
    });

    // For IE, our authored values win outright (spec: "for IE, our authored
    // seoTitle/heroTitle values WIN"). For drafts, only fill fields that are
    // currently null so we never clobber owner edits on a re-run.
    const isIe = draft.countryCode === "ie";
    const pick = <V>(ours: V | undefined, current: V | null | undefined): V | null => {
      if (isIe) return ours ?? null;
      if (!existingTranslation) return ours ?? null;
      return (current ?? ours ?? null) as V | null;
    };

    await prisma.pageContentTranslation.upsert({
      where: { pageContentId_locale: { pageContentId: base.id, locale: t.locale } },
      create: {
        pageContentId: base.id,
        locale: t.locale,
        heroTitle: t.heroTitle ?? null,
        heroTitleLead: t.heroTitleLead ?? null,
        heroTitleAccent: t.heroTitleAccent ?? null,
        intro: t.intro,
        whoForTitle: t.whoForTitle,
        whoForIntro: t.whoForIntro,
        whoForItems: t.whoForItems,
        whyChooseTitle: t.whyChooseTitle,
        whyChooseItems: t.whyChooseItems,
        faq: t.faq,
        disclaimerParagraphs: t.disclaimerParagraphs,
        disclaimerShort: t.disclaimerShort,
        seoTitle: t.seoTitle ?? null,
        seoDescription: t.seoDescription ?? null,
      },
      update: {
        heroTitle: pick(t.heroTitle, existingTranslation?.heroTitle),
        heroTitleLead: pick(t.heroTitleLead, existingTranslation?.heroTitleLead),
        heroTitleAccent: pick(t.heroTitleAccent, existingTranslation?.heroTitleAccent),
        intro: pick(t.intro, existingTranslation?.intro),
        whoForTitle: pick(t.whoForTitle, existingTranslation?.whoForTitle),
        whoForIntro: pick(t.whoForIntro, existingTranslation?.whoForIntro),
        whoForItems: isIe || !existingTranslation ? t.whoForItems : (existingTranslation.whoForItems ?? t.whoForItems),
        whyChooseTitle: pick(t.whyChooseTitle, existingTranslation?.whyChooseTitle),
        whyChooseItems: isIe || !existingTranslation ? t.whyChooseItems : (existingTranslation.whyChooseItems ?? t.whyChooseItems),
        faq: isIe || !existingTranslation ? t.faq : (existingTranslation.faq ?? t.faq),
        disclaimerParagraphs:
          isIe || !existingTranslation ? t.disclaimerParagraphs : (existingTranslation.disclaimerParagraphs ?? t.disclaimerParagraphs),
        disclaimerShort: pick(t.disclaimerShort, existingTranslation?.disclaimerShort),
        seoTitle: pick(t.seoTitle, existingTranslation?.seoTitle),
        seoDescription: pick(t.seoDescription, existingTranslation?.seoDescription),
      },
    });
  }

  return { countryId: country.id, willCreate: !existing, status };
}

async function main(): Promise<void> {
  const draftMarkets: MarketDraft[] = [];
  for (const cfg of DRAFT_MARKETS) {
    draftMarkets.push(await buildDraftMarket(cfg));
  }
  const allMarkets: MarketDraft[] = [IE, ...draftMarkets];

  const summary: Array<{
    country: string;
    pageKey: string;
    locales: string;
    status: string;
    action: string;
  }> = [];

  let tablesAvailable = true;
  if (!APPLY) {
    // Existence probe only — dry-run must not require the migration to be applied.
    try {
      await prisma.pageContent.count();
    } catch {
      tablesAvailable = false;
      console.log(
        "[seed-page-content] NOTE: PageContent/PageContentTranslation tables not found — " +
          "migration not yet applied. Printing plan from in-memory drafts only (no DB existence checks).",
      );
    }
  }

  for (const market of allMarkets) {
    if (APPLY || tablesAvailable) {
      try {
        const result = await upsertMarket(market, { neverDowngradeToDraft: market.countryCode !== "ie" });
        summary.push({
          country: market.countryCode,
          pageKey: "GENERAL_CONSULTATION",
          locales: market.translations.map((t) => t.locale).join(","),
          status: result.status,
          action: APPLY ? (result.willCreate ? "created" : "updated") : result.willCreate ? "would create" : "would update",
        });
        continue;
      } catch (err) {
        if (APPLY) throw err;
        // fall through to in-memory summary if the DB probe races/tables missing mid-loop
      }
    }
    summary.push({
      country: market.countryCode,
      pageKey: "GENERAL_CONSULTATION",
      locales: market.translations.map((t) => t.locale).join(","),
      status: market.status,
      action: "would create (no DB check — tables not migrated)",
    });
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — plan:`);
  console.table(summary);

  const drafted = summary.filter((s) => s.country !== "ie").map((s) => s.country.toUpperCase());
  console.log(
    `\nDRAFTED — needs clinic legal review before publish: ${drafted.join(", ")}. ` +
      "Ireland is the only market seeded as PUBLISHED (clinic-approved copy, migrated verbatim).",
  );

  if (!APPLY) {
    console.log("\nRe-run with --apply to write these rows. NEVER run --apply automatically without owner review.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
