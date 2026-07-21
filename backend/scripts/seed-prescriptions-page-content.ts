/**
 * PRESCRIPTIONS page-content seed — COMPLIANCE-SENSITIVE.
 *
 * The public site is deliberately GP-level / prescription-scrubbed pending
 * LegitScript accreditation (see project_prescription_scrub memory note).
 * This script authors CAUTIOUS, GP-level copy: no claim of prescribing
 * controlled substances, no "we prescribe X" guarantees. Every FAQ/
 * disclaimer phrases prescribing as "issued only where clinically
 * appropriate and at the doctor's discretion" — never a promise.
 *
 * Unlike HOME/DOCTORS_INDEX/HEALTH_TESTS/GP/SPECIALIST, this script forces
 * status to DRAFT for EVERY market, including ie, on every run — this page
 * needs compliance/legal review before it can ever go live. It still
 * follows the specialist seed's pick/pickArr fill pattern for content (IE
 * copy wins, others fill only null/empty fields) — but status itself is
 * always overwritten to DRAFT, never left as an existing PUBLISHED value.
 *
 *   npx tsx scripts/seed-prescriptions-page-content.ts          # dry run
 *   npx tsx scripts/seed-prescriptions-page-content.ts --apply  # write
 */
import "dotenv/config";
import { LocaleCode, PublishStatus } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const PAGE_KEY = "PRESCRIPTIONS";

type FaqItem = { question: string; answer: string };

type TranslationDraft = {
  locale: LocaleCode;
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
};

// ── regulator/emergency map — EXACT strings from seed-page-content.ts /
// seed-specialist-page-content.ts ──
const MARKETS: MarketConfig[] = [
  { countryCode: "ie", regulator: "Irish Medical Council", emergency: "112" },
  { countryCode: "cz", regulator: "Česká lékařská komora (ČLK)", emergency: "112" },
  { countryCode: "pt", regulator: "Ordem dos Médicos", emergency: "112" },
  { countryCode: "es", regulator: "Organización Médica Colegial (colegios de médicos)", emergency: "112" },
  { countryCode: "ro", regulator: "Colegiul Medicilor din România", emergency: "112" },
  { countryCode: "br", regulator: "CRM (Conselho Regional de Medicina)", emergency: "SAMU 192" },
];

// ── locale connector phrase — identical convention to
// seed-specialist-page-content.ts (regulator names stay untranslated) ──
const CONNECTOR: Record<LocaleCode, (reg: string) => string> = {
  EN: (reg) => `registered with ${reg}`,
  CS: (reg) => `registrovaní u ${reg}`,
  ES: (reg) => `colegiados a través de ${reg}`,
  RO: (reg) => `înregistrați la ${reg}`,
  PT: (reg) => `inscritos em ${reg}`,
  DE: (reg) => `bei ${reg} registriert`,
};

const WHO_FOR_TITLE: Record<LocaleCode, string> = {
  EN: "Who this service is for",
  CS: "Pro koho je tato služba určena",
  ES: "Para quién es este servicio",
  RO: "Pentru cine este acest serviciu",
  PT: "Para quem é este serviço",
  DE: "Für wen dieser Dienst gedacht ist",
};

const WHO_FOR_INTRO: Record<LocaleCode, string> = {
  EN: "An online GP consultation relating to your medication may be a suitable option for:",
  CS: "Online konzultace s praktickým lékařem ohledně vaší medikace může být vhodnou volbou pro:",
  ES: "Una consulta online con médico de familia relacionada con su medicación puede ser una opción adecuada para:",
  RO: "O consultație online cu medicul de familie privind medicația dumneavoastră poate fi o opțiune potrivită pentru:",
  PT: "Uma consulta online com médico de clínica geral relacionada com a sua medicação pode ser uma opção adequada para:",
  DE: "Eine Online-Konsultation mit einem Hausarzt zu Ihrer Medikation kann eine geeignete Option sein für:",
};

const WHY_CHOOSE_TITLE: Record<LocaleCode, string> = {
  EN: "Why choose Global Health",
  CS: "Proč zvolit Global Health",
  ES: "Por qué elegir Global Health",
  RO: "De ce să alegeți Global Health",
  PT: "Porquê escolher a Global Health",
  DE: "Warum Global Health wählen",
};

const WHO_FOR_ITEMS: Record<LocaleCode, string[]> = {
  EN: [
    "Review of an existing, stable, non-controlled medication",
    "Common short-term conditions where medication may be clinically appropriate, such as infections or allergies",
    "General health concerns where a doctor's assessment will determine whether medication is appropriate",
    "Review of an existing prescription or treatment plan",
    "Discussion of treatment options with a GP before any prescribing decision",
    "Follow-up consultations relating to a previously assessed condition",
  ],
  CS: [
    "Kontrolu stávající, stabilní medikace, která nespadá mezi návykové látky",
    "Běžná krátkodobá onemocnění, u kterých může být medikace klinicky vhodná, jako jsou infekce nebo alergie",
    "Obecné zdravotní potíže, u nichž posouzení lékařem určí, zda je medikace vhodná",
    "Kontrolu stávajícího předpisu nebo léčebného plánu",
    "Konzultaci možností léčby s praktickým lékařem před jakýmkoli rozhodnutím o předpisu",
    "Návazné konzultace týkající se dříve posouzeného onemocnění",
  ],
  ES: [
    "Revisión de una medicación existente, estable y no controlada",
    "Afecciones comunes de corta duración en las que la medicación puede ser clínicamente apropiada, como infecciones o alergias",
    "Preocupaciones generales de salud en las que la valoración del médico determinará si la medicación es adecuada",
    "Revisión de una receta o plan de tratamiento existente",
    "Comentar opciones de tratamiento con un médico de familia antes de cualquier decisión de prescripción",
    "Consultas de seguimiento relacionadas con una afección valorada anteriormente",
  ],
  RO: [
    "Revizuirea unei medicații existente, stabile și necontrolate",
    "Afecțiuni comune, pe termen scurt, pentru care medicația poate fi clinic adecvată, precum infecțiile sau alergiile",
    "Probleme generale de sănătate în care evaluarea medicului va stabili dacă medicația este adecvată",
    "Revizuirea unei rețete sau a unui plan de tratament existent",
    "Discutarea opțiunilor de tratament cu medicul de familie înainte de orice decizie de prescriere",
    "Consultații de urmărire legate de o afecțiune evaluată anterior",
  ],
  PT: [
    "Revisão de uma medicação existente, estável e não controlada",
    "Condições comuns de curta duração em que a medicação pode ser clinicamente apropriada, como infeções ou alergias",
    "Questões gerais de saúde em que a avaliação do médico determinará se a medicação é adequada",
    "Revisão de uma receita ou plano de tratamento existente",
    "Discussão de opções de tratamento com um médico de clínica geral antes de qualquer decisão de prescrição",
    "Consultas de seguimento relacionadas com uma condição previamente avaliada",
  ],
  DE: [
    "Überprüfung einer bestehenden, stabilen, nicht kontrollierten Medikation",
    "Häufige kurzfristige Erkrankungen, bei denen eine Medikation klinisch angemessen sein kann, wie Infektionen oder Allergien",
    "Allgemeine gesundheitliche Anliegen, bei denen die ärztliche Beurteilung entscheidet, ob eine Medikation angemessen ist",
    "Überprüfung eines bestehenden Rezepts oder Behandlungsplans",
    "Besprechung von Behandlungsoptionen mit einem Hausarzt vor jeder Verschreibungsentscheidung",
    "Folgekonsultationen zu einer bereits beurteilten Erkrankung",
  ],
};

function whyChooseItems(locale: LocaleCode, reg: string): string[] {
  const c = CONNECTOR[locale](reg);
  switch (locale) {
    case "EN":
      return [
        `Doctors ${c}`,
        "Secure video consultations conducted to national telemedicine standards",
        "Consultations available in multiple languages, subject to clinician availability",
        "Clinical documentation provided by email after every consultation",
        "Transparent pricing — no hidden fees, no membership required",
      ];
    case "CS":
      return [
        `Lékaři ${c}`,
        "Zabezpečené video konzultace v souladu s národními standardy telemedicíny",
        "Konzultace dostupné ve více jazycích podle dostupnosti lékaře",
        "Lékařská dokumentace zaslaná e-mailem po každé konzultaci",
        "Transparentní ceny — žádné skryté poplatky, žádné povinné členství",
      ];
    case "ES":
      return [
        `Médicos ${c}`,
        "Videoconsultas seguras conforme a los estándares nacionales de telemedicina",
        "Consultas disponibles en varios idiomas, según disponibilidad del médico",
        "Documentación clínica enviada por correo electrónico tras cada consulta",
        "Precios transparentes — sin costes ocultos, sin suscripción obligatoria",
      ];
    case "RO":
      return [
        `Medici ${c}`,
        "Consultații video securizate, conforme standardelor naționale de telemedicină",
        "Consultații disponibile în mai multe limbi, în funcție de disponibilitatea medicului",
        "Documentație clinică trimisă prin email după fiecare consultație",
        "Prețuri transparente — fără costuri ascunse, fără abonament obligatoriu",
      ];
    case "PT":
      return [
        `Médicos ${c}`,
        "Consultas por vídeo seguras, realizadas de acordo com as normas nacionais de telemedicina",
        "Consultas disponíveis em vários idiomas, consoante a disponibilidade do médico",
        "Documentação clínica enviada por email após cada consulta",
        "Preços transparentes — sem custos ocultos, sem subscrição obrigatória",
      ];
    case "DE":
      return [
        `Ärzte, ${c}`,
        "Sichere Videokonsultationen nach nationalen Telemedizin-Standards",
        "Konsultationen in mehreren Sprachen verfügbar, je nach Verfügbarkeit des Arztes",
        "Klinische Dokumentation wird nach jeder Konsultation per E-Mail bereitgestellt",
        "Transparente Preise — keine versteckten Gebühren, keine Mitgliedschaft erforderlich",
      ];
  }
}

function faq(locale: LocaleCode, reg: string): FaqItem[] {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, FaqItem[]> = {
    EN: [
      { question: "Will I definitely receive a prescription?", answer: "No. A prescription is issued only where clinically appropriate, following the doctor's full assessment, and entirely at the doctor's professional discretion. Not every consultation results in a prescription." },
      { question: "Can I get a prescription for controlled substances online?", answer: "No. Our doctors do not routinely prescribe controlled substances through online consultations." },
      { question: "How does an online GP consultation work?", answer: `Book an appointment, join your consultation by secure video, and discuss your symptoms and current medication with a doctor ${c}. The doctor will advise on appropriate next steps.` },
      { question: "Which languages are available?", answer: "Consultations are available in multiple languages, subject to clinician availability." },
      { question: "What happens after my consultation?", answer: "Following your consultation your doctor will send clinical notes by email. Where a prescription has been issued, details of how to collect it will also be provided." },
    ],
    CS: [
      { question: "Dostanu určitě předpis?", answer: "Ne. Předpis je vystaven pouze tam, kde je to klinicky vhodné, po úplném posouzení lékařem, a to zcela na základě jeho odborného uvážení. Ne každá konzultace vede k vystavení předpisu." },
      { question: "Mohu online získat předpis na návykové látky?", answer: "Ne. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací." },
      { question: "Jak probíhá online konzultace s praktickým lékařem?", answer: `Rezervujte si termín, připojte se ke konzultaci prostřednictvím zabezpečeného videa a proberte své příznaky a aktuální medikaci s lékařem ${c}. Lékař doporučí vhodný další postup.` },
      { question: "Jaké jazyky jsou k dispozici?", answer: "Konzultace jsou dostupné ve více jazycích podle dostupnosti lékaře." },
      { question: "Co se děje po konzultaci?", answer: "Po konzultaci vám lékař zašle klinické poznámky e-mailem. Pokud byl vystaven předpis, obdržíte také informace, jak si jej vyzvednout." },
    ],
    ES: [
      { question: "¿Recibiré con seguridad una receta?", answer: "No. Una receta se emite únicamente cuando es clínicamente apropiado, tras la valoración completa del médico, y enteramente a criterio profesional del médico. No todas las consultas dan lugar a una receta." },
      { question: "¿Puedo obtener online una receta de sustancias controladas?", answer: "No. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online." },
      { question: "¿Cómo funciona una consulta online con médico de familia?", answer: `Reserve una cita, únase a su consulta por videollamada segura y comente sus síntomas y medicación actual con un médico ${c}. El médico le aconsejará los siguientes pasos adecuados.` },
      { question: "¿Qué idiomas están disponibles?", answer: "Las consultas están disponibles en varios idiomas, según disponibilidad del médico." },
      { question: "¿Qué ocurre después de mi consulta?", answer: "Tras la consulta, su médico le enviará las notas clínicas por correo electrónico. Si se ha emitido una receta, también recibirá información sobre cómo recogerla." },
    ],
    RO: [
      { question: "Voi primi sigur o rețetă?", answer: "Nu. O rețetă este eliberată doar atunci când este clinic adecvat, în urma unei evaluări complete a medicului, și în întregime la discreția profesională a acestuia. Nu fiecare consultație are ca rezultat o rețetă." },
      { question: "Pot obține online o rețetă pentru substanțe controlate?", answer: "Nu. Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online." },
      { question: "Cum funcționează o consultație online cu medicul de familie?", answer: `Rezervați o programare, alăturați-vă consultației prin video securizat și discutați simptomele și medicația actuală cu un medic ${c}. Medicul vă va recomanda pașii următori potriviți.` },
      { question: "Ce limbi sunt disponibile?", answer: "Consultațiile sunt disponibile în mai multe limbi, în funcție de disponibilitatea medicului." },
      { question: "Ce se întâmplă după consultație?", answer: "După consultație, medicul dumneavoastră vă va trimite notele clinice prin email. Dacă a fost eliberată o rețetă, veți primi și detalii despre cum să o ridicați." },
    ],
    PT: [
      { question: "Vou receber certamente uma receita?", answer: "Não. Uma receita só é emitida quando clinicamente apropriado, após a avaliação completa do médico, e inteiramente ao critério profissional do médico. Nem todas as consultas resultam numa receita." },
      { question: "Posso obter online uma receita para substâncias controladas?", answer: "Não. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online." },
      { question: "Como funciona uma consulta online com médico de clínica geral?", answer: `Marque uma consulta, junte-se à consulta por vídeo seguro e discuta os seus sintomas e medicação atual com um médico ${c}. O médico irá aconselhar os próximos passos adequados.` },
      { question: "Que idiomas estão disponíveis?", answer: "As consultas estão disponíveis em vários idiomas, consoante a disponibilidade do médico." },
      { question: "O que acontece depois da minha consulta?", answer: "Após a consulta, o seu médico enviará as notas clínicas por email. Caso tenha sido emitida uma receita, também receberá informações sobre como a levantar." },
    ],
    DE: [
      { question: "Erhalte ich sicher ein Rezept?", answer: "Nein. Ein Rezept wird nur ausgestellt, wenn dies klinisch angemessen ist, nach vollständiger Beurteilung durch den Arzt, und ausschließlich nach dessen professionellem Ermessen. Nicht jede Konsultation führt zu einem Rezept." },
      { question: "Kann ich online ein Rezept für kontrollierte Substanzen erhalten?", answer: "Nein. Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen." },
      { question: "Wie läuft eine Online-Konsultation mit einem Hausarzt ab?", answer: `Buchen Sie einen Termin, nehmen Sie per sicherem Video an Ihrer Konsultation teil und besprechen Sie Ihre Symptome und aktuelle Medikation mit einem Arzt, der ${c} ist. Der Arzt berät Sie zu den passenden nächsten Schritten.` },
      { question: "Welche Sprachen sind verfügbar?", answer: "Konsultationen sind je nach Verfügbarkeit des Arztes in mehreren Sprachen verfügbar." },
      { question: "Was passiert nach meiner Konsultation?", answer: "Nach der Konsultation sendet Ihnen Ihr Arzt die klinischen Notizen per E-Mail. Wurde ein Rezept ausgestellt, erhalten Sie zudem Informationen dazu, wie Sie es abholen können." },
    ],
  };
  return byLocale[locale];
}

function disclaimerParagraphs(locale: LocaleCode, reg: string, emergency: string): string[] {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string[]> = {
    EN: [
      `Online GP consultations relating to prescriptions through Global Health are delivered at GP level by doctors ${c}.`,
      "A prescription is issued only where clinically appropriate, following a full clinical assessment, and entirely at the treating doctor's professional discretion. Requesting a consultation does not guarantee that a prescription will be issued.",
      "Our doctors do not routinely prescribe controlled substances through online consultations.",
      `Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, please contact emergency services immediately by calling ${emergency} or attend your nearest emergency department.`,
    ],
    CS: [
      `Online konzultace s praktickým lékařem týkající se předpisů prostřednictvím Global Health jsou poskytovány na úrovni praktického lékaře lékaři ${c}.`,
      "Předpis je vystaven pouze tam, kde je to klinicky vhodné, po úplném klinickém posouzení, a to zcela na základě odborného uvážení ošetřujícího lékaře. Vyžádání konzultace nezaručuje, že bude předpis vystaven.",
      "Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací.",
      `Online konzultace nejsou vhodné pro řešení zdravotních pohotovostních stavů. Pokud se nacházíte v život ohrožující situaci, neprodleně kontaktujte záchrannou službu na čísle ${emergency} nebo vyhledejte nejbližší pohotovost.`,
    ],
    ES: [
      `Las consultas online con médico de familia relacionadas con recetas a través de Global Health se prestan a nivel de medicina general por médicos ${c}.`,
      "Una receta se emite únicamente cuando es clínicamente apropiado, tras una valoración clínica completa, y enteramente a criterio profesional del médico tratante. Solicitar una consulta no garantiza que se vaya a emitir una receta.",
      "Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online.",
      `Las consultas online no son adecuadas para emergencias médicas. Si tiene una emergencia médica, contacte inmediatamente con los servicios de emergencia llamando al ${emergency} o acuda a su servicio de urgencias más cercano.`,
    ],
    RO: [
      `Consultațiile online cu medicul de familie legate de rețete prin Global Health sunt furnizate la nivel de medicină de familie de către medici ${c}.`,
      "O rețetă este eliberată doar atunci când este clinic adecvat, în urma unei evaluări clinice complete, și în întregime la discreția profesională a medicului curant. Solicitarea unei consultații nu garantează eliberarea unei rețete.",
      "Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online.",
      `Consultațiile online nu sunt potrivite pentru urgențe medicale. Dacă vă confruntați cu o urgență medicală, contactați imediat serviciile de urgență la numărul ${emergency} sau mergeți la cea mai apropiată unitate de primiri urgențe.`,
    ],
    PT: [
      `As consultas online com médico de clínica geral relacionadas com receitas através da Global Health são prestadas ao nível de clínica geral por médicos ${c}.`,
      "Uma receita só é emitida quando clinicamente apropriado, após uma avaliação clínica completa, e inteiramente ao critério profissional do médico assistente. Solicitar uma consulta não garante que será emitida uma receita.",
      "Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.",
      `As consultas online não são adequadas para emergências médicas. Em caso de emergência médica, contacte imediatamente os serviços de emergência através do número ${emergency} ou dirija-se ao serviço de urgência mais próximo.`,
    ],
    DE: [
      `Online-Hausarztkonsultationen im Zusammenhang mit Rezepten über Global Health werden auf hausärztlicher Ebene von Ärzten erbracht, die ${c} sind.`,
      "Ein Rezept wird nur ausgestellt, wenn dies klinisch angemessen ist, nach einer vollständigen klinischen Beurteilung und ausschließlich nach professionellem Ermessen des behandelnden Arztes. Die Anfrage einer Konsultation garantiert nicht, dass ein Rezept ausgestellt wird.",
      "Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen.",
      `Online-Konsultationen eignen sich nicht für medizinische Notfälle. Wenn Sie einen medizinischen Notfall haben, kontaktieren Sie bitte umgehend den Rettungsdienst unter ${emergency} oder suchen Sie die nächstgelegene Notaufnahme auf.`,
    ],
  };
  return byLocale[locale];
}

function disclaimerShort(locale: LocaleCode, reg: string, emergency: string): string {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string> = {
    EN: `Online GP consultations relating to prescriptions are delivered at GP level by doctors ${c}. A prescription is issued only where clinically appropriate, following assessment, and entirely at the doctor's discretion — requesting a consultation does not guarantee a prescription. Our doctors do not routinely prescribe controlled substances through online consultations. In a medical emergency call ${emergency}.`,
    CS: `Online konzultace s praktickým lékařem týkající se předpisů jsou poskytovány na úrovni praktického lékaře lékaři ${c}. Předpis je vystaven pouze tam, kde je to klinicky vhodné, po posouzení, a zcela na základě uvážení lékaře — vyžádání konzultace nezaručuje vystavení předpisu. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací. V případě zdravotní pohotovosti volejte ${emergency}.`,
    ES: `Las consultas online con médico de familia relacionadas con recetas se prestan a nivel de medicina general por médicos ${c}. Una receta se emite únicamente cuando es clínicamente apropiado, tras la valoración, y enteramente a criterio del médico — solicitar una consulta no garantiza una receta. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online. En caso de emergencia médica llame al ${emergency}.`,
    RO: `Consultațiile online cu medicul de familie legate de rețete sunt furnizate la nivel de medicină de familie de către medici ${c}. O rețetă este eliberată doar atunci când este clinic adecvat, în urma evaluării, și în întregime la discreția medicului — solicitarea unei consultații nu garantează eliberarea unei rețete. Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online. În caz de urgență medicală sunați la ${emergency}.`,
    PT: `As consultas online com médico de clínica geral relacionadas com receitas são prestadas ao nível de clínica geral por médicos ${c}. Uma receita só é emitida quando clinicamente apropriado, após avaliação, e inteiramente ao critério do médico — solicitar uma consulta não garante uma receita. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online. Em caso de emergência médica ligue ${emergency}.`,
    DE: `Online-Hausarztkonsultationen im Zusammenhang mit Rezepten werden auf hausärztlicher Ebene von Ärzten erbracht, die ${c} sind. Ein Rezept wird nur ausgestellt, wenn dies klinisch angemessen ist, nach Beurteilung, und ausschließlich nach Ermessen des Arztes — die Anfrage einer Konsultation garantiert kein Rezept. Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen. Rufen Sie im medizinischen Notfall ${emergency} an.`,
  };
  return byLocale[locale];
}

function intro(locale: LocaleCode, reg: string): string {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string> = {
    EN: `Global Health offers online GP consultations with doctors ${c}. Where clinically appropriate, and entirely at the treating doctor's discretion, a prescription may be issued following your consultation. Our doctors do not routinely prescribe controlled substances through online consultations.`,
    CS: `Global Health nabízí online konzultace s praktickým lékařem s lékaři ${c}. Tam, kde je to klinicky vhodné, a zcela na základě uvážení ošetřujícího lékaře, může být po konzultaci vystaven předpis. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací.`,
    ES: `Global Health ofrece consultas online con médico de familia con médicos ${c}. Cuando sea clínicamente apropiado, y enteramente a criterio del médico tratante, se puede emitir una receta tras su consulta. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online.`,
    RO: `Global Health oferă consultații online cu medicul de familie cu medici ${c}. Atunci când este clinic adecvat și în întregime la discreția medicului curant, poate fi eliberată o rețetă în urma consultației dumneavoastră. Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online.`,
    PT: `A Global Health oferece consultas online com médico de clínica geral com médicos ${c}. Quando clinicamente apropriado, e inteiramente ao critério do médico assistente, pode ser emitida uma receita após a sua consulta. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.`,
    DE: `Global Health bietet Online-Hausarztkonsultationen mit Ärzten an, die ${c} sind. Sofern klinisch angemessen und ausschließlich nach Ermessen des behandelnden Arztes, kann nach Ihrer Konsultation ein Rezept ausgestellt werden. Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen.`,
  };
  return byLocale[locale];
}

function buildTranslation(market: MarketConfig, locale: LocaleCode): TranslationDraft {
  return {
    locale,
    intro: intro(locale, market.regulator),
    whoForTitle: WHO_FOR_TITLE[locale],
    whoForIntro: WHO_FOR_INTRO[locale],
    whoForItems: WHO_FOR_ITEMS[locale],
    whyChooseTitle: WHY_CHOOSE_TITLE[locale],
    whyChooseItems: whyChooseItems(locale, market.regulator),
    faq: faq(locale, market.regulator),
    disclaimerParagraphs: disclaimerParagraphs(locale, market.regulator, market.emergency),
    disclaimerShort: disclaimerShort(locale, market.regulator, market.emergency),
  };
}

// ── writer ──

type UpsertResult = { countryId: string; willCreatePageContent: boolean; locales: string[] };

async function upsertMarket(market: MarketConfig): Promise<UpsertResult> {
  const country = await prisma.country.findUnique({ where: { code: market.countryCode }, select: { id: true } });
  if (!country) throw new Error(`Country not found: ${market.countryCode}`);

  const isIe = market.countryCode === "ie";

  const existing = await prisma.pageContent.findUnique({
    where: { countryId_pageKey: { countryId: country.id, pageKey: PAGE_KEY } },
    include: { translations: true },
  });

  const countryLocales = await prisma.countryLocale.findMany({ where: { countryId: country.id }, select: { locale: true } });
  const countryRow = await prisma.country.findUnique({ where: { id: country.id }, select: { defaultLocale: true } });
  const localeSet = new Set<LocaleCode>(countryLocales.map((cl) => cl.locale));
  if (countryRow?.defaultLocale) localeSet.add(countryRow.defaultLocale);
  if (localeSet.size === 0) localeSet.add(LocaleCode.EN);

  const locales = [...localeSet];

  if (!APPLY) {
    return { countryId: country.id, willCreatePageContent: !existing, locales: locales.map(String) };
  }

  // Status is ALWAYS forced to DRAFT — this page is compliance-sensitive
  // and must never go live without legal review, IE included. Unlike every
  // other page-content seed in this family, this intentionally overwrites
  // status on both create AND update.
  await prisma.pageContent.upsert({
    where: { countryId_pageKey: { countryId: country.id, pageKey: PAGE_KEY } },
    create: {
      countryId: country.id,
      pageKey: PAGE_KEY,
      status: PublishStatus.DRAFT,
      isActive: true,
      showIntro: true,
      showWhoFor: true,
      showWhyChoose: true,
      showFaq: true,
      showDisclaimer: true,
      showBody: false,
    },
    update: {
      status: PublishStatus.DRAFT,
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
    const t = buildTranslation(market, locale);
    const existingTranslation = await prisma.pageContentTranslation.findUnique({
      where: { pageContentId_locale: { pageContentId: base.id, locale } },
    });

    // IE: our authored values win outright (content only — status above is
    // always DRAFT regardless). Others: only fill fields that are
    // currently null — never clobber an admin edit.
    const pick = <V>(ours: V, current: V | null | undefined): V => {
      if (isIe) return ours;
      if (!existingTranslation) return ours;
      return (current ?? ours) as V;
    };
    const pickArr = <V>(ours: V[], current: unknown): V[] => {
      if (isIe || !existingTranslation) return ours;
      return Array.isArray(current) && current.length > 0 ? (current as V[]) : ours;
    };

    await prisma.pageContentTranslation.upsert({
      where: { pageContentId_locale: { pageContentId: base.id, locale } },
      create: {
        pageContentId: base.id,
        locale,
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

  return { countryId: country.id, willCreatePageContent: !existing, locales: locales.map(String) };
}

async function main(): Promise<void> {
  const summary: Array<{ country: string; pageKey: string; locales: string; status: string; action: string }> = [];

  let tablesAvailable = true;
  if (!APPLY) {
    try {
      await prisma.pageContent.count();
    } catch {
      tablesAvailable = false;
      console.log("[seed-prescriptions-page-content] NOTE: PageContent tables not found — cannot introspect. Aborting dry run.");
    }
  }

  for (const market of MARKETS) {
    if (!APPLY && !tablesAvailable) {
      summary.push({
        country: market.countryCode,
        pageKey: PAGE_KEY,
        locales: "n/a (tables missing)",
        status: "DRAFT",
        action: "would create (no DB check — tables not migrated)",
      });
      continue;
    }
    const result = await upsertMarket(market);
    summary.push({
      country: market.countryCode,
      pageKey: PAGE_KEY,
      locales: result.locales.join(","),
      status: "DRAFT",
      action: APPLY ? (result.willCreatePageContent ? "created" : "updated") : result.willCreatePageContent ? "would create" : "would update",
    });
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — plan:`);
  console.table(summary);

  console.log(
    "\nCOMPLIANCE NOTE: PRESCRIPTIONS is forced to DRAFT for every market, including ie, on every run — " +
      "this page requires legal/compliance review (LegitScript) before any market can publish it.",
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
