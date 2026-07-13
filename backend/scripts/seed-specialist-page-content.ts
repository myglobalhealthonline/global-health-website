/**
 * SPECIALIST_CONSULTATION page-content seed — brings the specialist hub to
 * admin-controlled parity with GENERAL_CONSULTATION (seed-page-content.ts).
 *
 * SPECIALIST_CONSULTATION rows already exist (created hero/SEO-only by the
 * Phase-1 ContentPage migration for ie/pt; other countries may or may not
 * have a row yet) and are PUBLISHED for markets the owner has activated —
 * see the admin grid. This script only ADDS the missing structured fields
 * (intro, whoFor.., whyChoose.., faq, disclaimer..) and flips the five
 * show.. toggles on; it never touches status, never touches showBody, and
 * never clobbers a field an admin already edited.
 *
 * Content is authored fresh for SPECIALIST_CONSULTATION (NOT copied from the
 * GP seed) — an in-depth review by a clinician in a specific medical area,
 * via secure video, with referrals/investigations where appropriate.
 *
 * For every one of the 6 markets (ie, cz, pt, es, ro, br), writes one
 * translation row per locale the country actually supports (CountryLocale
 * table, queried at runtime — mirrors seed-page-content-translations.ts) so
 * every supported locale gets a row, not just default+EN.
 *
 * Upsert rules (mirrors seed-page-content.ts):
 * - PageContent: create missing rows PUBLISHED for ie, DRAFT for others;
 *   never change status on an existing row; always set the 5 show* toggles
 *   true (showBody untouched).
 * - PageContentTranslation: for ie, our authored values WIN. For every
 *   other country, only fields that are currently NULL get filled — an
 *   existing admin edit is never overwritten.
 *
 *   npx tsx scripts/seed-specialist-page-content.ts          # dry run
 *   npx tsx scripts/seed-specialist-page-content.ts --apply  # write
 */
import "dotenv/config";
import { LocaleCode, PublishStatus, ServiceVisibility } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const PAGE_KEY = "SPECIALIST_CONSULTATION";

type FaqItem = { question: string; answer: string };

type TranslationDraft = {
  locale: LocaleCode;
  heroTitleLead: string;
  heroTitleAccent: string;
  intro: string;
  whoForTitle: string;
  whoForIntro: string;
  whoForItems: string[];
  whyChooseTitle: string;
  whyChooseItems: string[];
  faq: FaqItem[];
  disclaimerParagraphs: string[];
  disclaimerShort: string;
};

type MarketConfig = {
  countryCode: string;
  regulator: string;
  emergency: string;
  countryName: Record<LocaleCode, string>;
};

// ── regulator/emergency map — EXACT strings from seed-page-content.ts ──
const MARKETS: MarketConfig[] = [
  {
    countryCode: "ie",
    regulator: "Irish Medical Council",
    emergency: "112",
    countryName: { EN: "Ireland", PT: "Irlanda", ES: "Irlanda", CS: "Irsku", RO: "Irlanda", DE: "Irland" },
  },
  {
    countryCode: "cz",
    regulator: "Česká lékařská komora (ČLK)",
    emergency: "112",
    countryName: { EN: "Czechia", PT: "Chéquia", ES: "República Checa", CS: "Česku", RO: "Cehia", DE: "Tschechien" },
  },
  {
    countryCode: "pt",
    regulator: "Ordem dos Médicos",
    emergency: "112",
    countryName: { EN: "Portugal", PT: "Portugal", ES: "Portugal", CS: "Portugalsku", RO: "Portugalia", DE: "Portugal" },
  },
  {
    countryCode: "es",
    regulator: "Organización Médica Colegial (colegios de médicos)",
    emergency: "112",
    countryName: { EN: "Spain", PT: "Espanha", ES: "España", CS: "Španělsku", RO: "Spania", DE: "Spanien" },
  },
  {
    countryCode: "ro",
    regulator: "Colegiul Medicilor din România",
    emergency: "112",
    countryName: { EN: "Romania", PT: "Roménia", ES: "Rumanía", CS: "Rumunsku", RO: "România", DE: "Rumänien" },
  },
  {
    countryCode: "br",
    regulator: "Conselho Federal de Medicina (CFM) / CRM",
    emergency: "SAMU 192",
    countryName: { EN: "Brazil", PT: "Brasil", ES: "Brasil", CS: "Brazílii", RO: "Brazilia", DE: "Brasilien" },
  },
];

// ── locale connector phrase, matching the convention in
// seed-page-content-translations.ts (regulator names stay untranslated) ──
const CONNECTOR: Record<LocaleCode, (reg: string) => string> = {
  EN: (reg) => `registered with ${reg}`,
  CS: (reg) => `registrovaní u ${reg}`,
  ES: (reg) => `colegiados a través de ${reg}`,
  RO: (reg) => `înregistrați la ${reg}`,
  PT: (reg) => `inscritos em ${reg}`,
  DE: (reg) => `bei ${reg} registriert`,
};

// Singular-agreement form of CONNECTOR, for phrases like "a doctor
// registered with X" (EN/DE are number-invariant so reuse CONNECTOR).
const CONNECTOR_SINGULAR: Record<LocaleCode, (reg: string) => string> = {
  EN: (reg) => CONNECTOR.EN(reg),
  CS: (reg) => `registrovaným u ${reg}`,
  ES: (reg) => `colegiado a través de ${reg}`,
  RO: (reg) => `înregistrat la ${reg}`,
  PT: (reg) => `inscrito em ${reg}`,
  DE: (reg) => CONNECTOR.DE(reg),
};

const HERO_LEAD: Record<LocaleCode, string> = {
  EN: "Online Specialist Consultations in",
  CS: "Online konzultace se specialistou v",
  ES: "Consultas con Especialista Online en",
  RO: "Consultații de Specialitate Online în",
  PT: "Consultas com Especialista Online em",
  DE: "Online-Facharztkonsultationen in",
};

const WHO_FOR_TITLE: Record<LocaleCode, string> = {
  EN: "Who this service is for",
  CS: "Pro koho je tato služba určena",
  ES: "Para quién es este servicio",
  RO: "Pentru cine este acest serviciu",
  PT: "Para quem é este serviço",
  DE: "Für wen ist dieser Dienst gedacht",
};

const WHO_FOR_INTRO: Record<LocaleCode, string> = {
  EN: "A specialist consultation may be a suitable next step for:",
  CS: "Konzultace se specialistou může být vhodným dalším krokem u:",
  ES: "Una consulta con especialista puede ser un paso adecuado para:",
  RO: "O consultație de specialitate poate fi un pas potrivit pentru:",
  PT: "Uma consulta com especialista pode ser um passo adequado para:",
  DE: "Eine Facharztkonsultation kann ein geeigneter nächster Schritt sein bei:",
};

const WHY_CHOOSE_TITLE: Record<LocaleCode, string> = {
  EN: "Why choose Global Health",
  CS: "Proč zvolit Global Health",
  ES: "Por qué elegir Global Health",
  RO: "De ce să alegeți Global Health",
  PT: "Porquê escolher a Global Health",
  DE: "Warum Global Health wählen",
};

// ── who-for items — clinically generic, country-agnostic (10 items) ──
const WHO_FOR_ITEMS: Record<LocaleCode, string[]> = {
  EN: [
    "Complex or chronic conditions that benefit from ongoing specialist input",
    "A second opinion on an existing diagnosis or treatment plan",
    "Ongoing management of a condition under specialist care",
    "Review of investigations, blood tests or imaging already carried out",
    "Follow-up review following a referral from your regular doctor",
    "Cardiology concerns such as blood pressure, palpitations or cholesterol management",
    "Dermatology concerns including skin lesions, acne and chronic skin conditions",
    "Endocrinology concerns such as thyroid or diabetes management",
    "Gastroenterology concerns including ongoing digestive symptoms",
    "Neurology concerns such as recurrent headaches or migraine management",
    "Gynaecology concerns and women's health review",
    "Paediatric specialist review for children, where appropriate",
    "Mental health review with a specialist clinician",
  ],
  CS: [
    "Komplexní nebo chronická onemocnění, u kterých je přínosné pokračující posouzení specialistou",
    "Druhý názor na stávající diagnózu nebo léčebný plán",
    "Průběžná péče o onemocnění pod vedením specialisty",
    "Posouzení již provedených vyšetření, krevních testů nebo zobrazovacích metod",
    "Kontrolní vyšetření po doporučení od vašeho praktického lékaře",
    "Kardiologické potíže, jako je krevní tlak, palpitace nebo management cholesterolu",
    "Dermatologické potíže včetně kožních lézí, akné a chronických kožních onemocnění",
    "Endokrinologické potíže, jako je léčba štítné žlázy nebo diabetu",
    "Gastroenterologické potíže včetně přetrvávajících trávicích obtíží",
    "Neurologické potíže, jako jsou opakující se bolesti hlavy nebo migréna",
    "Gynekologické potíže a posouzení ženského zdraví",
    "Pediatrické specializované posouzení pro děti, je-li to vhodné",
    "Posouzení duševního zdraví specializovaným lékařem",
  ],
  ES: [
    "Afecciones complejas o crónicas que se benefician de la valoración continuada por un especialista",
    "Una segunda opinión sobre un diagnóstico o plan de tratamiento existente",
    "Manejo continuado de una afección bajo seguimiento especializado",
    "Valoración de análisis, pruebas de sangre o pruebas de imagen ya realizadas",
    "Revisión de seguimiento tras una derivación de su médico habitual",
    "Problemas de cardiología como tensión arterial, palpitaciones o control del colesterol",
    "Problemas de dermatología, incluyendo lesiones cutáneas, acné y afecciones cutáneas crónicas",
    "Problemas de endocrinología como manejo de tiroides o diabetes",
    "Problemas de gastroenterología, incluyendo síntomas digestivos persistentes",
    "Problemas de neurología como dolores de cabeza recurrentes o manejo de migraña",
    "Problemas de ginecología y revisión de salud de la mujer",
    "Valoración pediátrica especializada para niños, cuando sea apropiado",
    "Valoración de salud mental con un médico especialista",
  ],
  RO: [
    "Afecțiuni complexe sau cronice care beneficiază de evaluare continuă de specialitate",
    "O a doua opinie privind un diagnostic sau un plan de tratament existent",
    "Gestionarea continuă a unei afecțiuni sub îngrijire de specialitate",
    "Analiza investigațiilor, analizelor de sânge sau imagisticii deja efectuate",
    "Consultație de urmărire în urma unei trimiteri de la medicul dumneavoastră curant",
    "Probleme de cardiologie precum tensiunea arterială, palpitațiile sau gestionarea colesterolului",
    "Probleme de dermatologie, inclusiv leziuni cutanate, acnee și afecțiuni cutanate cronice",
    "Probleme de endocrinologie precum gestionarea tiroidei sau a diabetului",
    "Probleme de gastroenterologie, inclusiv simptome digestive persistente",
    "Probleme de neurologie precum dureri de cap recurente sau gestionarea migrenei",
    "Probleme de ginecologie și evaluarea sănătății femeii",
    "Evaluare pediatrică de specialitate pentru copii, atunci când este cazul",
    "Evaluarea sănătății mintale de către un medic specialist",
  ],
  PT: [
    "Condições complexas ou crónicas que beneficiam de acompanhamento especializado contínuo",
    "Uma segunda opinião sobre um diagnóstico ou plano de tratamento existente",
    "Gestão contínua de uma condição sob acompanhamento especializado",
    "Revisão de exames, análises ao sangue ou exames de imagem já realizados",
    "Consulta de seguimento após uma referenciação do seu médico habitual",
    "Questões de cardiologia como tensão arterial, palpitações ou controlo do colesterol",
    "Questões de dermatologia, incluindo lesões cutâneas, acne e condições cutâneas crónicas",
    "Questões de endocrinologia como gestão da tiroide ou diabetes",
    "Questões de gastroenterologia, incluindo sintomas digestivos persistentes",
    "Questões de neurologia como dores de cabeça recorrentes ou gestão de enxaqueca",
    "Questões de ginecologia e revisão de saúde da mulher",
    "Avaliação pediátrica especializada para crianças, quando apropriado",
    "Avaliação de saúde mental com um médico especialista",
  ],
  DE: [
    "Komplexe oder chronische Erkrankungen, die von einer fortlaufenden fachärztlichen Einschätzung profitieren",
    "Eine zweite Meinung zu einer bestehenden Diagnose oder einem Behandlungsplan",
    "Fortlaufende Betreuung einer Erkrankung in fachärztlicher Versorgung",
    "Beurteilung bereits durchgeführter Untersuchungen, Bluttests oder Bildgebung",
    "Nachsorgetermin nach einer Überweisung durch Ihren Hausarzt",
    "Kardiologische Anliegen wie Blutdruck, Herzklopfen oder Cholesterinmanagement",
    "Dermatologische Anliegen einschließlich Hautveränderungen, Akne und chronischer Hauterkrankungen",
    "Endokrinologische Anliegen wie Schilddrüsen- oder Diabetesmanagement",
    "Gastroenterologische Anliegen einschließlich anhaltender Verdauungsbeschwerden",
    "Neurologische Anliegen wie wiederkehrende Kopfschmerzen oder Migränemanagement",
    "Gynäkologische Anliegen und Beurteilung der Frauengesundheit",
    "Fachärztliche pädiatrische Beurteilung für Kinder, sofern angemessen",
    "Beurteilung der psychischen Gesundheit durch einen Facharzt",
  ],
};

function whyChooseItems(locale: LocaleCode, reg: string): string[] {
  const c = CONNECTOR[locale](reg);
  switch (locale) {
    case "EN":
      return [
        `Specialists ${c}`,
        "Secure video consultations conducted to national telemedicine standards",
        "Open appointment slots shown during booking, subject to clinician availability",
        "Consultations available in multiple languages, subject to clinician availability",
        "Clinical documentation and follow-up guidance provided by email after every consultation",
        "Transparent pricing — no hidden fees, no membership required",
      ];
    case "CS":
      return [
        `Specialisté ${c}`,
        "Zabezpečené video konzultace v souladu s národními standardy telemedicíny",
        "Otevřené termíny zobrazené při rezervaci, dle dostupnosti lékaře",
        "Konzultace dostupné ve více jazycích podle dostupnosti lékaře",
        "Lékařská dokumentace a doporučení k dalšímu postupu zaslané e-mailem po každé konzultaci",
        "Transparentní ceny — žádné skryté poplatky, žádné povinné členství",
      ];
    case "ES":
      return [
        `Especialistas ${c}`,
        "Videoconsultas seguras conforme a los estándares nacionales de telemedicina",
        "Horarios disponibles mostrados durante la reserva, según disponibilidad del médico",
        "Consultas disponibles en varios idiomas, según disponibilidad del médico",
        "Documentación clínica y orientación de seguimiento enviada por correo electrónico tras cada consulta",
        "Precios transparentes — sin costes ocultos, sin suscripción obligatoria",
      ];
    case "RO":
      return [
        `Specialiști ${c}`,
        "Consultații video securizate, conforme standardelor naționale de telemedicină",
        "Ore disponibile afișate în timpul rezervării, în funcție de disponibilitatea medicului",
        "Consultații disponibile în mai multe limbi, în funcție de disponibilitatea medicului",
        "Documentație clinică și recomandări de urmărire trimise prin email după fiecare consultație",
        "Prețuri transparente — fără costuri ascunse, fără abonament obligatoriu",
      ];
    case "PT":
      return [
        `Especialistas ${c}`,
        "Consultas por vídeo seguras, realizadas de acordo com as normas nacionais de telemedicina",
        "Horários disponíveis apresentados durante a marcação, consoante a disponibilidade do médico",
        "Consultas disponíveis em vários idiomas, consoante a disponibilidade do médico",
        "Documentação clínica e orientação de seguimento enviadas por email após cada consulta",
        "Preços transparentes — sem custos ocultos, sem subscrição obrigatória",
      ];
    case "DE":
      return [
        `Fachärzte, ${c}`,
        "Sichere Videokonsultationen nach nationalen Telemedizin-Standards",
        "Verfügbare Termine werden bei der Buchung angezeigt, je nach Verfügbarkeit des Arztes",
        "Konsultationen in mehreren Sprachen verfügbar, je nach Verfügbarkeit des Arztes",
        "Klinische Dokumentation und Nachsorgehinweise werden nach jeder Konsultation per E-Mail bereitgestellt",
        "Transparente Preise — keine versteckten Gebühren, keine Mitgliedschaft erforderlich",
      ];
  }
}

function faq(locale: LocaleCode, reg: string, priceLine: string | null): FaqItem[] {
  const c = CONNECTOR[locale](reg);
  const cs = CONNECTOR_SINGULAR[locale](reg);
  const byLocale: Record<LocaleCode, FaqItem[]> = {
    EN: [
      { question: "What is an online specialist consultation?", answer: `An online specialist consultation is an in-depth video review of your condition by a clinician ${cs} who works in a specific medical area. The specialist reviews your history, symptoms and any existing investigations before advising on next steps.` },
      ...(priceLine ? [{ question: "How much does it cost?", answer: `Online specialist consultations at Global Health cost ${priceLine}. There are no hidden fees and no membership required.` }] : []),
      { question: "Do I need a referral?", answer: "A referral is not always required to book, but some specialties may request your GP notes or existing investigation results ahead of the appointment so the specialist can review your case fully." },
      { question: "Are online specialist consultations valid?", answer: `Yes. Consultations are conducted by doctors ${c} using secure video to national telemedicine standards.` },
      { question: "What happens after my consultation?", answer: "Following your consultation the specialist will send clinical notes and follow-up guidance to your email. Further investigations or a referral will be arranged where clinically indicated." },
      { question: "Which languages are available?", answer: "Consultations are available in multiple languages, subject to clinician availability. You can select a specialist by language when booking." },
    ],
    CS: [
      { question: "Co je online konzultace se specialistou?", answer: `Online konzultace se specialistou je podrobné video posouzení vašeho stavu lékařem ${cs}, který se specializuje na konkrétní medicínský obor. Specialista posoudí vaši anamnézu, příznaky a případná dosavadní vyšetření, než doporučí další postup.` },
      ...(priceLine ? [{ question: "Kolik to stojí?", answer: `Online konzultace se specialistou u Global Health stojí ${priceLine}. Žádné skryté poplatky, žádné povinné členství.` }] : []),
      { question: "Potřebuji doporučení?", answer: "Doporučení není vždy vyžadováno k rezervaci, ale u některých specializací může specialista požádat o zprávu od praktického lékaře nebo výsledky dosavadních vyšetření před termínem, aby mohl váš případ plně posoudit." },
      { question: "Jsou online konzultace se specialistou platné?", answer: `Ano. Konzultace provádějí lékaři ${c} prostřednictvím zabezpečeného videa v souladu s národními standardy telemedicíny.` },
      { question: "Co se děje po konzultaci?", answer: "Po konzultaci vám specialista zašle e-mailem klinické poznámky a doporučení k dalšímu postupu. Další vyšetření nebo doporučení bude zajištěno, je-li to klinicky indikováno." },
      { question: "Jaké jazyky jsou k dispozici?", answer: "Konzultace jsou dostupné ve více jazycích podle dostupnosti lékaře. Specialistu podle jazyka si můžete vybrat při rezervaci." },
    ],
    ES: [
      { question: "¿Qué es una consulta con especialista online?", answer: `Una consulta con especialista online es una valoración detallada por vídeo de su afección por un médico ${cs} especializado en un área médica concreta. El especialista revisa su historial, síntomas y cualquier prueba ya realizada antes de aconsejar los siguientes pasos.` },
      ...(priceLine ? [{ question: "¿Cuánto cuesta?", answer: `Las consultas con especialista online en Global Health cuestan ${priceLine}. Sin costes ocultos ni suscripción obligatoria.` }] : []),
      { question: "¿Necesito una derivación?", answer: "No siempre es necesaria una derivación para reservar, pero algunas especialidades pueden solicitar el informe de su médico de cabecera o los resultados de pruebas ya realizadas antes de la cita para que el especialista pueda valorar su caso por completo." },
      { question: "¿Son válidas las consultas con especialista online?", answer: `Sí. Las consultas las realizan médicos ${c} mediante vídeo seguro conforme a los estándares nacionales de telemedicina.` },
      { question: "¿Qué ocurre después de mi consulta?", answer: "Tras la consulta, el especialista enviará por correo electrónico las notas clínicas y la orientación de seguimiento. Se gestionarán más pruebas o una derivación cuando esté clínicamente indicado." },
      { question: "¿Qué idiomas están disponibles?", answer: "Las consultas están disponibles en varios idiomas, según disponibilidad del médico. Puede elegir especialista por idioma al reservar." },
    ],
    RO: [
      { question: "Ce este o consultație de specialitate online?", answer: `O consultație de specialitate online este o evaluare video detaliată a afecțiunii dumneavoastră de către un medic ${cs}, specializat într-un domeniu medical specific. Specialistul evaluează istoricul, simptomele și orice investigații deja efectuate înainte de a recomanda pașii următori.` },
      ...(priceLine ? [{ question: "Cât costă?", answer: `Consultațiile de specialitate online la Global Health costă ${priceLine}. Fără costuri ascunse, fără abonament obligatoriu.` }] : []),
      { question: "Am nevoie de o trimitere?", answer: "O trimitere nu este întotdeauna necesară pentru rezervare, dar unele specialități pot solicita notele medicului dumneavoastră de familie sau rezultatele investigațiilor deja efectuate înainte de programare, astfel încât specialistul să poată evalua complet cazul dumneavoastră." },
      { question: "Sunt valabile consultațiile de specialitate online?", answer: `Da. Consultațiile sunt realizate de medici ${c}, prin video securizat, conform standardelor naționale de telemedicină.` },
      { question: "Ce se întâmplă după consultație?", answer: "După consultație, specialistul va trimite prin email notele clinice și recomandările de urmărire. Investigații suplimentare sau o trimitere vor fi organizate atunci când este indicat clinic." },
      { question: "Ce limbi sunt disponibile?", answer: "Consultațiile sunt disponibile în mai multe limbi, în funcție de disponibilitatea medicului. Puteți alege specialistul în funcție de limbă la rezervare." },
    ],
    PT: [
      { question: "O que é uma consulta com especialista online?", answer: `Uma consulta com especialista online é uma avaliação detalhada por vídeo da sua condição por um médico ${cs} especializado numa área médica específica. O especialista analisa o seu historial, sintomas e quaisquer exames já realizados antes de aconselhar os próximos passos.` },
      ...(priceLine ? [{ question: "Quanto custa?", answer: `As consultas com especialista online na Global Health custam ${priceLine}. Sem custos ocultos, sem subscrição obrigatória.` }] : []),
      { question: "Preciso de referenciação?", answer: "Nem sempre é necessária uma referenciação para marcar, mas algumas especialidades podem solicitar as notas do seu médico habitual ou os resultados de exames já realizados antes da consulta, para que o especialista possa avaliar o seu caso na íntegra." },
      { question: "As consultas com especialista online são válidas?", answer: `Sim. As consultas são realizadas por médicos ${c}, através de vídeo seguro, de acordo com as normas nacionais de telemedicina.` },
      { question: "O que acontece depois da minha consulta?", answer: "Após a consulta, o especialista enviará por email as notas clínicas e orientações de seguimento. Serão organizados exames adicionais ou uma referenciação quando clinicamente indicado." },
      { question: "Que idiomas estão disponíveis?", answer: "As consultas estão disponíveis em vários idiomas, consoante a disponibilidade do médico. Pode escolher o especialista por idioma ao marcar." },
    ],
    DE: [
      { question: "Was ist eine Online-Facharztkonsultation?", answer: `Eine Online-Facharztkonsultation ist eine ausführliche Videobeurteilung Ihres Zustands durch einen Arzt, der ${c} ist und in einem bestimmten medizinischen Fachbereich tätig ist. Der Facharzt prüft Ihre Vorgeschichte, Symptome und bereits vorliegende Untersuchungen, bevor er die nächsten Schritte empfiehlt.` },
      ...(priceLine ? [{ question: "Was kostet es?", answer: `Online-Facharztkonsultationen bei Global Health kosten ${priceLine}. Keine versteckten Gebühren, keine Mitgliedschaft erforderlich.` }] : []),
      { question: "Benötige ich eine Überweisung?", answer: "Für die Buchung ist nicht immer eine Überweisung erforderlich, aber einige Fachbereiche können vorab die Unterlagen Ihres Hausarztes oder Ergebnisse bereits durchgeführter Untersuchungen anfordern, damit der Facharzt Ihren Fall vollständig beurteilen kann." },
      { question: "Sind Online-Facharztkonsultationen gültig?", answer: `Ja. Die Konsultationen werden von Ärzten durchgeführt, die ${c} sind, per sicherem Video nach nationalen Telemedizin-Standards.` },
      { question: "Was passiert nach meiner Konsultation?", answer: "Nach der Konsultation sendet Ihnen der Facharzt klinische Notizen und Nachsorgehinweise per E-Mail. Weitere Untersuchungen oder eine Überweisung werden veranlasst, sofern klinisch indiziert." },
      { question: "Welche Sprachen sind verfügbar?", answer: "Konsultationen sind je nach Verfügbarkeit des Arztes in mehreren Sprachen verfügbar. Sie können bei der Buchung einen Facharzt nach Sprache auswählen." },
    ],
  };
  return byLocale[locale];
}

function disclaimerParagraphs(locale: LocaleCode, reg: string, emergency: string): string[] {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string[]> = {
    EN: [
      `All specialist consultations provided through Global Health are delivered at specialist level by doctors ${c}.`,
      "Our online specialists conduct remote clinical assessments and may provide treatment recommendations, referrals for further investigations, or medical certificates only where clinically appropriate and at the treating doctor's professional discretion. Clinical decisions remain entirely at the doctor's discretion following assessment.",
      "Our doctors do not routinely prescribe controlled substances through online consultations.",
      `Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, please contact emergency services immediately by calling ${emergency} or attend your nearest emergency department.`,
    ],
    CS: [
      `Veškeré konzultace se specialistou poskytované prostřednictvím Global Health jsou poskytovány na úrovni specialisty lékaři ${c}.`,
      "Naši online specialisté provádějí vzdálené klinické posouzení a mohou poskytnout doporučení k léčbě, doporučení k dalším vyšetřením nebo lékařská potvrzení pouze tam, kde je to klinicky vhodné, a to výhradně na základě odborného uvážení ošetřujícího lékaře. Klinická rozhodnutí zůstávají zcela v pravomoci lékaře po provedeném posouzení.",
      "Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací.",
      `Online konzultace nejsou vhodné pro řešení zdravotních pohotovostních stavů. Pokud se nacházíte v život ohrožující situaci, neprodleně kontaktujte záchrannou službu na čísle ${emergency} nebo vyhledejte nejbližší pohotovost.`,
    ],
    ES: [
      `Todas las consultas con especialista prestadas a través de Global Health se realizan a nivel de especialista por médicos ${c}.`,
      "Nuestros especialistas online realizan evaluaciones clínicas remotas y pueden proporcionar recomendaciones de tratamiento, derivaciones para más pruebas o certificados médicos únicamente cuando sea clínicamente apropiado, a criterio profesional del médico tratante. Las decisiones clínicas permanecen enteramente a criterio del médico tras la evaluación.",
      "Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online.",
      `Las consultas online no son adecuadas para emergencias médicas. Si tiene una emergencia médica, contacte inmediatamente con los servicios de emergencia llamando al ${emergency} o acuda a su servicio de urgencias más cercano.`,
    ],
    RO: [
      `Toate consultațiile de specialitate oferite prin Global Health sunt furnizate la nivel de specialitate de către medici ${c}.`,
      "Specialiștii noștri online efectuează evaluări clinice la distanță și pot oferi recomandări de tratament, trimiteri pentru investigații suplimentare sau certificate medicale doar atunci când este clinic adecvat, la discreția profesională a medicului curant. Deciziile clinice rămân în întregime la discreția medicului în urma evaluării.",
      "Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online.",
      `Consultațiile online nu sunt potrivite pentru urgențe medicale. Dacă vă confruntați cu o urgență medicală, contactați imediat serviciile de urgență la numărul ${emergency} sau mergeți la cea mai apropiată unitate de primiri urgențe.`,
    ],
    PT: [
      `Todas as consultas com especialista prestadas através da Global Health são realizadas ao nível de especialista por médicos ${c}.`,
      "Os nossos especialistas online realizam avaliações clínicas remotas e podem fornecer recomendações de tratamento, referenciações para exames adicionais ou atestados médicos apenas quando clinicamente apropriado, ao critério profissional do médico assistente. As decisões clínicas permanecem inteiramente ao critério do médico após a avaliação.",
      "Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.",
      `As consultas online não são adequadas para emergências médicas. Em caso de emergência médica, contacte imediatamente os serviços de emergência através do número ${emergency} ou dirija-se ao serviço de urgência mais próximo.`,
    ],
    DE: [
      `Alle über Global Health angebotenen Facharztkonsultationen werden auf fachärztlicher Ebene von Ärzten erbracht, die ${c} sind.`,
      "Unsere Online-Fachärzte führen aus der Ferne klinische Beurteilungen durch und können Behandlungsempfehlungen, Überweisungen für weitere Untersuchungen oder ärztliche Atteste nur ausstellen, wenn dies klinisch angemessen ist und nach professionellem Ermessen des behandelnden Arztes. Klinische Entscheidungen liegen nach der Beurteilung ausschließlich im Ermessen des Arztes.",
      "Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen.",
      `Online-Konsultationen eignen sich nicht für medizinische Notfälle. Wenn Sie einen medizinischen Notfall haben, kontaktieren Sie bitte umgehend den Rettungsdienst unter ${emergency} oder suchen Sie die nächstgelegene Notaufnahme auf.`,
    ],
  };
  return byLocale[locale];
}

function disclaimerShort(locale: LocaleCode, reg: string, emergency: string): string {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string> = {
    EN: `All specialist consultations are provided at specialist level by doctors ${c}. Treatment recommendations, referrals and medical certificates may be issued only when clinically appropriate and at the doctor's discretion. Our doctors do not routinely prescribe controlled substances through online consultations. In a medical emergency call ${emergency}.`,
    CS: `Veškeré konzultace se specialistou jsou poskytovány na úrovni specialisty lékaři ${c}. Doporučení k léčbě, další vyšetření a lékařská potvrzení mohou být vydána pouze tam, kde je to klinicky vhodné a na základě uvážení lékaře. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací. V případě zdravotní pohotovosti volejte ${emergency}.`,
    ES: `Todas las consultas con especialista se prestan a nivel de especialista por médicos ${c}. Las recomendaciones de tratamiento, derivaciones y certificados médicos solo se emiten cuando es clínicamente apropiado y a criterio del médico. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online. En caso de emergencia médica llame al ${emergency}.`,
    RO: `Toate consultațiile de specialitate sunt furnizate la nivel de specialitate de către medici ${c}. Recomandările de tratament, trimiterile și certificatele medicale sunt emise doar atunci când este clinic adecvat și la discreția medicului. Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online. În caz de urgență medicală sunați la ${emergency}.`,
    PT: `Todas as consultas com especialista são prestadas ao nível de especialista por médicos ${c}. Recomendações de tratamento, referenciações e atestados médicos só são emitidos quando clinicamente apropriado e ao critério do médico. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online. Em caso de emergência médica ligue ${emergency}.`,
    DE: `Alle Facharztkonsultationen werden auf fachärztlicher Ebene von Ärzten erbracht, die ${c} sind. Behandlungsempfehlungen, Überweisungen und ärztliche Atteste werden nur ausgestellt, wenn dies klinisch angemessen ist und nach Ermessen des Arztes. Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen. Rufen Sie im medizinischen Notfall ${emergency} an.`,
  };
  return byLocale[locale];
}

function intro(locale: LocaleCode, reg: string): string {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string> = {
    EN: `Global Health connects you with specialists ${c} for in-depth online review by a clinician trained in a specific medical area. Specialists assess your history, symptoms and any existing investigations through a secure video consultation and advise on appropriate next steps, including referrals where indicated.`,
    CS: `Global Health vás spojí se specialisty ${c} pro podrobné online posouzení lékařem se specializací na konkrétní medicínský obor. Specialisté posoudí vaši anamnézu, příznaky a případná dosavadní vyšetření prostřednictvím bezpečné video konzultace a doporučí vhodný další postup, včetně doporučení k dalšímu vyšetření, je-li to indikováno.`,
    ES: `Global Health le conecta con especialistas ${c} para una valoración online detallada por un médico especializado en un área médica concreta. Los especialistas evalúan su historial, síntomas y cualquier prueba ya realizada mediante una videoconsulta segura y aconsejan los siguientes pasos adecuados, incluidas derivaciones cuando esté indicado.`,
    RO: `Global Health vă conectează cu specialiști ${c} pentru o evaluare online detaliată de către un medic specializat într-un domeniu medical specific. Specialiștii evaluează istoricul, simptomele și orice investigații deja efectuate printr-o consultație video securizată și recomandă pașii următori potriviți, inclusiv trimiteri atunci când este indicat.`,
    PT: `A Global Health liga-o a especialistas ${c} para uma avaliação online detalhada por um médico especializado numa área médica específica. Os especialistas avaliam o seu historial, sintomas e quaisquer exames já realizados através de uma videoconsulta segura e aconselham os próximos passos adequados, incluindo referenciações quando indicado.`,
    DE: `Global Health verbindet Sie mit Fachärzten, die ${c} sind, für eine ausführliche Online-Beurteilung durch einen Arzt mit Spezialisierung auf einen bestimmten medizinischen Bereich. Die Fachärzte beurteilen Ihre Vorgeschichte, Symptome und bereits vorliegende Untersuchungen im Rahmen einer sicheren Videokonsultation und empfehlen die passenden nächsten Schritte, einschließlich Überweisungen, sofern angezeigt.`,
  };
  return byLocale[locale];
}

async function cheapestSpecialistPriceLine(countryCode: string, locale: LocaleCode): Promise<string | null> {
  try {
    const country = await prisma.country.findUnique({ where: { code: countryCode }, select: { id: true } });
    if (!country) return null;
    const service = await prisma.service.findFirst({
      where: {
        countryId: country.id,
        kind: "SPECIALIST",
        isActive: true,
        visibility: ServiceVisibility.PUBLIC,
        basePriceCents: { not: null },
        currencyCode: { not: null },
      },
      orderBy: { basePriceCents: "asc" },
      select: { basePriceCents: true, currencyCode: true },
    });
    if (!service?.basePriceCents || !service.currencyCode) return null;
    const localeTag: Record<LocaleCode, string> = { CS: "cs-CZ", PT: "pt-PT", ES: "es-ES", RO: "ro-RO", EN: "en-IE", DE: "de-DE" };
    const formatted = new Intl.NumberFormat(localeTag[locale] ?? "en-IE", {
      style: "currency",
      currency: service.currencyCode,
    }).format(service.basePriceCents / 100);
    return formatted;
  } catch {
    // ponytail: table/DB not reachable in dry-run context — pricing FAQ is simply omitted per spec
    return null;
  }
}

function fromLine(formatted: string, locale: LocaleCode): string {
  const prefix: Record<LocaleCode, string> = { CS: "od", PT: "a partir de", ES: "desde", RO: "de la", EN: "from", DE: "ab" };
  return `${prefix[locale] ?? "from"} ${formatted}`;
}

async function buildTranslation(market: MarketConfig, locale: LocaleCode): Promise<TranslationDraft> {
  const priceFormatted = await cheapestSpecialistPriceLine(market.countryCode, locale);
  const priceLine = priceFormatted ? fromLine(priceFormatted, locale) : null;
  const accent = market.countryName[locale];

  return {
    locale,
    heroTitleLead: HERO_LEAD[locale],
    heroTitleAccent: accent,
    intro: intro(locale, market.regulator),
    whoForTitle: WHO_FOR_TITLE[locale],
    whoForIntro: WHO_FOR_INTRO[locale],
    whoForItems: WHO_FOR_ITEMS[locale],
    whyChooseTitle: WHY_CHOOSE_TITLE[locale],
    whyChooseItems: whyChooseItems(locale, market.regulator),
    faq: faq(locale, market.regulator, priceLine),
    disclaimerParagraphs: disclaimerParagraphs(locale, market.regulator, market.emergency),
    disclaimerShort: disclaimerShort(locale, market.regulator, market.emergency),
  };
}

// ── writer ──

type UpsertResult = { countryId: string; willCreatePageContent: boolean; status: PublishStatus; locales: string[] };

async function upsertMarket(market: MarketConfig): Promise<UpsertResult> {
  const country = await prisma.country.findUnique({ where: { code: market.countryCode }, select: { id: true } });
  if (!country) throw new Error(`Country not found: ${market.countryCode}`);

  const isIe = market.countryCode === "ie";

  const existing = await prisma.pageContent.findUnique({
    where: { countryId_pageKey: { countryId: country.id, pageKey: PAGE_KEY } },
    include: { translations: true },
  });

  // Status: never change an existing row's status. New rows: PUBLISHED for
  // ie (matches the GP seed's IE-is-clinic-approved precedent extended to
  // the already-published specialist hub), DRAFT for everyone else.
  const status = existing ? existing.status : isIe ? PublishStatus.PUBLISHED : PublishStatus.DRAFT;

  // Locales to author: every CountryLocale row for this country, plus its
  // default locale (mirrors assertLocaleSupported / seed-page-content-translations.ts).
  const countryLocales = await prisma.countryLocale.findMany({ where: { countryId: country.id }, select: { locale: true } });
  const countryRow = await prisma.country.findUnique({ where: { id: country.id }, select: { defaultLocale: true } });
  const localeSet = new Set<LocaleCode>(countryLocales.map((cl) => cl.locale));
  if (countryRow?.defaultLocale) localeSet.add(countryRow.defaultLocale);
  if (localeSet.size === 0) localeSet.add(LocaleCode.EN); // fallback safety net — shouldn't happen

  const locales = [...localeSet];

  if (!APPLY) {
    return { countryId: country.id, willCreatePageContent: !existing, status, locales: locales.map(String) };
  }

  await prisma.pageContent.upsert({
    where: { countryId_pageKey: { countryId: country.id, pageKey: PAGE_KEY } },
    create: {
      countryId: country.id,
      pageKey: PAGE_KEY,
      status,
      isActive: true,
      showIntro: true,
      showWhoFor: true,
      showWhyChoose: true,
      showFaq: true,
      showDisclaimer: true,
      showBody: false,
    },
    update: {
      // status intentionally omitted — never changed on an existing row.
      showIntro: true,
      showWhoFor: true,
      showWhyChoose: true,
      showFaq: true,
      showDisclaimer: true,
      // showBody intentionally untouched.
    },
  });

  const base = await prisma.pageContent.findUniqueOrThrow({
    where: { countryId_pageKey: { countryId: country.id, pageKey: PAGE_KEY } },
  });

  for (const locale of locales) {
    const t = await buildTranslation(market, locale);
    const existingTranslation = await prisma.pageContentTranslation.findUnique({
      where: { pageContentId_locale: { pageContentId: base.id, locale } },
    });

    // IE: our authored values win outright. Others: only fill fields that
    // are currently null — never clobber an admin edit.
    const pick = <V>(ours: V, current: V | null | undefined): V => {
      if (isIe) return ours;
      if (!existingTranslation) return ours;
      return (current ?? ours) as V;
    };
    // Arrays: treat an existing EMPTY array the same as null (fill it). A row
    // that was published/saved before this seed can hold `[]` for the item
    // lists — `[] ?? ours` keeps the empty array, which is the bug that left
    // CZ/ES/RO/BR specialist items blank. Only a non-empty existing array
    // (a real admin edit) is preserved.
    const pickArr = <V>(ours: V[], current: unknown): V[] => {
      if (isIe || !existingTranslation) return ours;
      return Array.isArray(current) && current.length > 0 ? (current as V[]) : ours;
    };

    await prisma.pageContentTranslation.upsert({
      where: { pageContentId_locale: { pageContentId: base.id, locale } },
      create: {
        pageContentId: base.id,
        locale,
        heroTitleLead: t.heroTitleLead,
        heroTitleAccent: t.heroTitleAccent,
        intro: t.intro,
        whoForTitle: t.whoForTitle,
        whoForIntro: t.whoForIntro,
        whoForItems: t.whoForItems,
        whyChooseTitle: t.whyChooseTitle,
        whyChooseItems: t.whyChooseItems,
        faq: t.faq,
        disclaimerParagraphs: t.disclaimerParagraphs,
        disclaimerShort: t.disclaimerShort,
      },
      update: {
        heroTitleLead: pick(t.heroTitleLead, existingTranslation?.heroTitleLead),
        heroTitleAccent: pick(t.heroTitleAccent, existingTranslation?.heroTitleAccent),
        intro: pick(t.intro, existingTranslation?.intro),
        whoForTitle: pick(t.whoForTitle, existingTranslation?.whoForTitle),
        whoForIntro: pick(t.whoForIntro, existingTranslation?.whoForIntro),
        whoForItems: pickArr(t.whoForItems, existingTranslation?.whoForItems),
        whyChooseTitle: pick(t.whyChooseTitle, existingTranslation?.whyChooseTitle),
        whyChooseItems: pickArr(t.whyChooseItems, existingTranslation?.whyChooseItems),
        faq: pickArr(t.faq, existingTranslation?.faq),
        disclaimerParagraphs: pickArr(t.disclaimerParagraphs, existingTranslation?.disclaimerParagraphs),
        disclaimerShort: pick(t.disclaimerShort, existingTranslation?.disclaimerShort),
      },
    });
  }

  return { countryId: country.id, willCreatePageContent: !existing, status, locales: locales.map(String) };
}

async function main(): Promise<void> {
  const summary: Array<{ country: string; pageKey: string; locales: string; status: string; action: string }> = [];

  let tablesAvailable = true;
  if (!APPLY) {
    try {
      await prisma.pageContent.count();
    } catch {
      tablesAvailable = false;
      console.log("[seed-specialist-page-content] NOTE: PageContent tables not found — cannot introspect. Aborting dry run.");
    }
  }

  for (const market of MARKETS) {
    if (!APPLY && !tablesAvailable) {
      summary.push({
        country: market.countryCode,
        pageKey: PAGE_KEY,
        locales: "n/a (tables missing)",
        status: market.countryCode === "ie" ? "PUBLISHED" : "DRAFT",
        action: "would create (no DB check — tables not migrated)",
      });
      continue;
    }
    const result = await upsertMarket(market);
    summary.push({
      country: market.countryCode,
      pageKey: PAGE_KEY,
      locales: result.locales.join(","),
      status: result.status,
      action: APPLY ? (result.willCreatePageContent ? "created" : "updated") : result.willCreatePageContent ? "would create" : "would update",
    });
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — plan:`);
  console.table(summary);

  const publishedTouched = summary.filter((s) => s.status === "PUBLISHED").map((s) => s.country.toUpperCase());
  if (publishedTouched.length > 0) {
    console.log(
      `\nNOTE: these go live on PUBLISHED rows — review before trusting for legal/medical accuracy: ${publishedTouched.join(", ")}.`,
    );
  }

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
