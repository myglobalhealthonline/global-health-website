/**
 * Fill-the-gap translations for PageContent rows already seeded by
 * seed-page-content.ts and the ContentPage migration (HOME /
 * SPECIALIST_CONSULTATION / DOCTORS_INDEX for ie + pt).
 *
 * For every PageContent row, and for every locale the row's country
 * actually supports (CountryLocale table), adds a PageContentTranslation
 * IF ONE DOESN'T ALREADY EXIST. Never edits an existing translation row,
 * never touches PageContent.status or show* toggles.
 *
 * Source of truth per row = its default-locale translation (falls back to
 * EN). Copy below is machine-drafted by the agent, professional medical
 * register, no new claims; regulator names / emergency numbers / prices are
 * carried through unchanged from the source row.
 *
 * IMPORTANT: rows for ie/pt are PUBLISHED — translations added here go
 * live immediately once written and should be reviewed by the owner before
 * being trusted for legal/medical accuracy in each market.
 *
 *   npx tsx scripts/seed-page-content-translations.ts          # dry run
 *   npx tsx scripts/seed-page-content-translations.ts --apply  # write
 */
import "dotenv/config";
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

type FaqItem = { question: string; answer: string };

type GcFields = {
  heroTitle?: string | null;
  heroTitleLead?: string | null;
  heroTitleAccent?: string | null;
  heroSubtitle?: string | null;
  ctaLabel?: string | null;
  intro?: string | null;
  whoForTitle?: string | null;
  whoForIntro?: string | null;
  whoForItems?: string[] | null;
  whyChooseTitle?: string | null;
  whyChooseItems?: string[] | null;
  faq?: FaqItem[] | null;
  disclaimerParagraphs?: string[] | null;
  disclaimerShort?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

type HeroOnlyFields = {
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  ctaLabel?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

// ── locale connector phrases (regulator names stay untranslated — proper nouns,
// matching the convention already used in the seeded EN/native rows) ──

const CONNECTOR: Record<string, (reg: string) => string> = {
  EN: (reg) => `registered with ${reg}`,
  CS: (reg) => `registrovaní u ${reg}`,
  ES: (reg) => `colegiados a través de ${reg}`,
  RO: (reg) => `înregistrați la ${reg}`,
  PT: (reg) => `inscritos em ${reg}`,
  DE: (reg) => `bei ${reg} registriert`,
};

// ── generic "hub" body text, one array/object per locale, shared across
// CZ/ES/RO/BR/PT/IE wherever the target locale is missing. Parameterized by
// {reg} (regulator, untranslated proper noun), {price} (formatted price
// string incl. currency, unchanged from source), {emergency} (emergency
// number, unchanged from source), {country} (localized country name). ──

const WHO_FOR_12: Record<string, string[]> = {
  CS: [
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
  ES: [
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
  RO: [
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
  PT: [
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
  DE: [
    "Atemwegsinfektionen, einschließlich Erkältung, Grippe, Sinusitis, Bronchitis und anhaltendem Husten",
    "Halsschmerzen, Mandelentzündung und Ohrenentzündungen",
    "Fieber bei Erwachsenen und Kindern",
    "Harnwegsinfektionen und Symptome im Harntrakt",
    "Magen-Darm-Beschwerden, einschließlich Übelkeit, Erbrechen, Durchfall und Bauchschmerzen",
    "Kopfschmerzen und Migräne",
    "Hautprobleme, einschließlich Hautausschlägen, Ekzemschüben und allergischen Reaktionen",
    "Augeninfektionen, einschließlich Bindehautentzündung",
    "Rückenschmerzen, Muskelschmerzen und leichte muskuloskelettale Beschwerden",
    "Müdigkeit, Schlafstörungen und allgemeine gesundheitliche Anliegen",
    "Akute Verschlechterung bestehender Erkrankungen wie Bluthochdruck, Diabetes und Asthma",
    "Überweisungen für Blutuntersuchungen, Bildgebung oder fachärztliche Beurteilung, sofern klinisch indiziert",
  ],
};

const CERTS_ITEM: Record<string, string> = {
  CS: "Lékařská potvrzení a neschopenky, je-li to klinicky vhodné",
  ES: "Certificados médicos y bajas laborales cuando sea clínicamente apropiado",
  RO: "Certificate medicale și concedii medicale atunci când este clinic adecvat",
  PT: "Atestados médicos e certificados de baixa quando clinicamente apropriado",
  DE: "Ärztliche Atteste und Krankschreibungen, sofern klinisch angemessen",
};

function whyChooseGeneric(locale: string, reg: string): string[] {
  const c = CONNECTOR[locale](reg);
  switch (locale) {
    case "CS":
      return [
        `Lékaři ${c}`,
        "Zabezpečené video konzultace",
        "Transparentní ceny — žádné skryté poplatky, žádné povinné členství",
        "Konzultace dostupné ve více jazycích podle dostupnosti lékaře",
        "Lékařská dokumentace a doporučení k dalšímu postupu zaslané e-mailem po každé konzultaci",
      ];
    case "ES":
      return [
        `Médicos ${c}`,
        "Videoconsultas seguras",
        "Precios transparentes — sin costes ocultos, sin suscripción obligatoria",
        "Consultas disponibles en varios idiomas, según disponibilidad del médico",
        "Documentación clínica y orientación de seguimiento enviada por correo electrónico tras cada consulta",
      ];
    case "RO":
      return [
        `Medici ${c}`,
        "Consultații video securizate",
        "Prețuri transparente — fără costuri ascunse, fără abonament obligatoriu",
        "Consultații disponibile în mai multe limbi, în funcție de disponibilitatea medicului",
        "Documentație clinică și recomandări de urmărire trimise prin email după fiecare consultație",
      ];
    case "PT":
      return [
        `Médicos ${c}`,
        "Consultas por vídeo seguras",
        "Preços transparentes — sem custos ocultos, sem subscrição obrigatória",
        "Consultas disponíveis em vários idiomas, consoante a disponibilidade do médico",
        "Documentação clínica e orientação de seguimento enviadas por email após cada consulta",
      ];
    case "DE":
      return [
        `Ärzte, ${c}`,
        "Sichere Videokonsultationen",
        "Transparente Preise — keine versteckten Gebühren, keine Mitgliedschaft erforderlich",
        "Konsultationen in mehreren Sprachen verfügbar, je nach Verfügbarkeit des Arztes",
        "Klinische Dokumentation und Nachsorgehinweise werden nach jeder Konsultation per E-Mail bereitgestellt",
      ];
    default:
      throw new Error(`no whyChoose template for ${locale}`);
  }
}

function faqGeneric(locale: string, reg: string, priceLine?: string): FaqItem[] {
  const c = CONNECTOR[locale](reg);
  const items: Record<string, FaqItem[]> = {
    CS: [
      { question: "Mohu absolvovat online konzultaci s praktickým lékařem?", answer: `Ano. Global Health poskytuje online konzultace s praktickým lékařem s lékaři ${c}. Dostupné termíny se zobrazují při rezervaci.` },
      ...(priceLine ? [{ question: "Kolik stojí online konzultace s praktickým lékařem?", answer: `Online konzultace u Global Health stojí ${priceLine}. Žádné skryté poplatky, žádné povinné členství.` }] : []),
      { question: "Provádí konzultaci registrovaný lékař?", answer: `Ano. Všichni lékaři poskytující tuto službu prostřednictvím Global Health jsou ${c}.` },
      { question: "Co se děje po online konzultaci?", answer: "Po konzultaci vám lékař zašle e-mailem klinické poznámky a doporučení k dalšímu postupu. Doporučení k dalším vyšetřením nebo specialistovi bude zajištěno, je-li to klinicky indikováno." },
      { question: "Může online lékař vystavit doporučení?", answer: `Ano. Naši lékaři, ${c}, mohou vystavit doporučení k dalším vyšetřením nebo ke specialistovi, je-li to klinicky vhodné.` },
      { question: "Musím se registrovat nebo založit účet pro rezervaci?", answer: "Konzultaci si můžete rezervovat i bez založení účtu. Založení účtu vám umožní přístup k historii konzultací a klinickým poznámkám po vaší návštěvě." },
    ],
    ES: [
      { question: "¿Puedo tener una consulta médica online?", answer: `Sí. Global Health ofrece consultas médicas online con médicos ${c}. Los horarios disponibles se muestran durante la reserva.` },
      ...(priceLine ? [{ question: "¿Cuánto cuesta una consulta médica online?", answer: `Las consultas médicas online en Global Health cuestan ${priceLine}. Sin costes ocultos ni suscripción obligatoria.` }] : []),
      { question: "¿La consulta la realiza un médico colegiado?", answer: `Sí. Todos los médicos que prestan este servicio a través de Global Health están ${c}.` },
      { question: "¿Qué ocurre después de mi consulta online?", answer: "Tras la consulta, su médico enviará por correo electrónico las notas clínicas y la orientación de seguimiento. Se gestionarán derivaciones para análisis, pruebas de imagen o valoración por especialista cuando esté clínicamente indicado." },
      { question: "¿Puede un médico online realizar derivaciones?", answer: `Sí. Nuestros médicos, ${c}, pueden derivar a pruebas adicionales o valoración por especialista cuando sea clínicamente apropiado.` },
      { question: "¿Necesito registrarme o crear una cuenta para reservar?", answer: "Puede reservar una consulta sin crear una cuenta completa. Crear una cuenta le permite acceder a su historial de consultas y notas clínicas tras la cita." },
    ],
    RO: [
      { question: "Pot avea o consultație medicală online?", answer: `Da. Global Health oferă consultații medicale online cu medici ${c}. Orele disponibile sunt afișate în timpul rezervării.` },
      ...(priceLine ? [{ question: "Cât costă o consultație medicală online?", answer: `Consultațiile medicale online la Global Health costă ${priceLine}. Fără costuri ascunse, fără abonament obligatoriu.` }] : []),
      { question: "Consultația este realizată de un medic înregistrat?", answer: `Da. Toți medicii care oferă acest serviciu prin Global Health sunt ${c}.` },
      { question: "Ce se întâmplă după consultația mea online?", answer: "După consultație, medicul dumneavoastră va trimite prin email notele clinice și recomandările de urmărire. Trimiterile pentru analize, imagistică sau evaluare de specialitate vor fi organizate atunci când este indicat clinic." },
      { question: "Poate un medic online să facă trimiteri?", answer: `Da. Medicii noștri, ${c}, pot face trimiteri pentru analize suplimentare sau evaluare de specialitate atunci când este clinic adecvat.` },
      { question: "Trebuie să mă înregistrez sau să îmi creez un cont pentru rezervare?", answer: "Puteți rezerva o consultație fără un cont complet. Crearea unui cont vă permite accesul la istoricul consultațiilor și notele clinice după programare." },
    ],
    PT: [
      { question: "Posso ter uma consulta médica online?", answer: `Sim. A Global Health disponibiliza consultas médicas online com médicos ${c}. Os horários disponíveis são apresentados durante a marcação.` },
      ...(priceLine ? [{ question: "Quanto custa uma consulta médica online?", answer: `As consultas médicas online na Global Health custam ${priceLine}. Sem custos ocultos, sem subscrição obrigatória.` }] : []),
      { question: "A consulta é realizada por um médico inscrito na ordem profissional?", answer: `Sim. Todos os médicos que prestam este serviço através da Global Health estão ${c}.` },
      { question: "O que acontece depois da minha consulta online?", answer: "Após a consulta, o seu médico enviará por email as notas clínicas e orientações de seguimento. Serão organizadas referenciações para análises, exames de imagem ou avaliação por especialista quando clinicamente indicado." },
      { question: "Um médico online pode fazer referenciações?", answer: `Sim. Os nossos médicos, ${c}, podem referenciar para exames adicionais ou avaliação por especialista quando clinicamente apropriado.` },
      { question: "Preciso de criar conta para marcar consulta?", answer: "Pode marcar uma consulta sem criar uma conta completa. Criar uma conta permite aceder ao histórico de consultas e notas clínicas após a marcação." },
    ],
    DE: [
      { question: "Kann ich eine Online-Hausarztkonsultation erhalten?", answer: `Ja. Global Health bietet Online-Hausarztkonsultationen mit Ärzten an, die ${c} sind. Verfügbare Termine werden bei der Buchung angezeigt.` },
      ...(priceLine ? [{ question: "Was kostet eine Online-Hausarztkonsultation?", answer: `Online-Hausarztkonsultationen bei Global Health kosten ${priceLine}. Keine versteckten Gebühren, keine Mitgliedschaft erforderlich.` }] : []),
      { question: "Wird die Konsultation von einem registrierten Arzt durchgeführt?", answer: `Ja. Alle Ärzte, die diesen Dienst über Global Health anbieten, sind ${c}.` },
      { question: "Was passiert nach meiner Online-Konsultation?", answer: "Nach der Konsultation sendet Ihnen Ihr Arzt klinische Notizen und Nachsorgehinweise per E-Mail. Überweisungen für Blutuntersuchungen, Bildgebung oder fachärztliche Beurteilung werden veranlasst, sofern klinisch indiziert." },
      { question: "Kann ein Online-Arzt Überweisungen ausstellen?", answer: `Ja. Unsere Ärzte, ${c}, können Überweisungen für weitere Untersuchungen oder eine fachärztliche Beurteilung ausstellen, sofern klinisch angemessen.` },
      { question: "Muss ich mich registrieren oder ein Konto erstellen, um zu buchen?", answer: "Sie können eine Konsultation ohne vollständiges Konto buchen. Mit einem Konto können Sie nach Ihrem Termin auf Ihre Konsultationshistorie und klinischen Notizen zugreifen." },
    ],
  };
  return items[locale];
}

function disclaimerParagraphsGeneric(locale: string, reg: string, emergency: string): string[] {
  const c = CONNECTOR[locale](reg);
  const map: Record<string, string[]> = {
    CS: [
      `Veškeré služby praktického lékaře poskytované prostřednictvím Global Health jsou poskytovány na úrovni praktického lékaře lékaři ${c}.`,
      "Naši online lékaři provádějí vzdálené klinické posouzení a mohou poskytnout doporučení k léčbě, doporučení k dalšímu vyšetření nebo lékařská potvrzení pouze tam, kde je to klinicky vhodné, a to výhradně na základě odborného uvážení ošetřujícího lékaře. Klinická rozhodnutí zůstávají zcela v pravomoci lékaře po provedeném posouzení.",
      "Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací.",
      `Online konzultace nejsou vhodné pro řešení zdravotních pohotovostních stavů. Pokud se nacházíte v život ohrožující situaci, neprodleně kontaktujte záchrannou službu na čísle ${emergency} nebo vyhledejte nejbližší pohotovost.`,
    ],
    ES: [
      `Todos los servicios médicos prestados a través de Global Health se realizan a nivel de medicina general por médicos ${c}.`,
      "Nuestros médicos online realizan evaluaciones clínicas remotas y pueden proporcionar recomendaciones de tratamiento, derivaciones o certificados médicos únicamente cuando sea clínicamente apropiado, a criterio profesional del médico tratante. Las decisiones clínicas permanecen enteramente a criterio del médico tras la evaluación.",
      "Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online.",
      `Las consultas online no son adecuadas para emergencias médicas. Si tiene una emergencia médica, contacte inmediatamente con los servicios de emergencia llamando al ${emergency} o acuda a su servicio de urgencias más cercano.`,
    ],
    RO: [
      `Toate serviciile medicale oferite prin Global Health sunt furnizate la nivel de medicină de familie de către medici ${c}.`,
      "Medicii noștri online efectuează evaluări clinice la distanță și pot oferi recomandări de tratament, trimiteri sau certificate medicale doar atunci când este clinic adecvat, la discreția profesională a medicului curant. Deciziile clinice rămân în întregime la discreția medicului în urma evaluării.",
      "Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online.",
      `Consultațiile online nu sunt potrivite pentru urgențe medicale. Dacă vă confruntați cu o urgență medicală, contactați imediat serviciile de urgență la numărul ${emergency} sau mergeți la cea mai apropiată unitate de primiri urgențe.`,
    ],
    PT: [
      `Todos os serviços médicos prestados através da Global Health são realizados ao nível de clínica geral por médicos ${c}.`,
      "Os nossos médicos online realizam avaliações clínicas remotas e podem fornecer recomendações de tratamento, referenciações ou atestados médicos apenas quando clinicamente apropriado, ao critério profissional do médico assistente. As decisões clínicas permanecem inteiramente ao critério do médico após a avaliação.",
      "Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.",
      `As consultas online não são adequadas para emergências médicas. Em caso de emergência médica, contacte imediatamente os serviços de emergência através do número ${emergency} ou dirija-se ao serviço de urgência mais próximo.`,
    ],
    DE: [
      `Alle über Global Health angebotenen hausärztlichen Leistungen werden auf hausärztlicher Ebene von Ärzten erbracht, die ${c} sind.`,
      "Unsere Online-Ärzte führen aus der Ferne klinische Beurteilungen durch und können Behandlungsempfehlungen, Überweisungen oder ärztliche Atteste nur ausstellen, wenn dies klinisch angemessen ist und nach professionellem Ermessen des behandelnden Arztes. Klinische Entscheidungen liegen nach der Beurteilung ausschließlich im Ermessen des Arztes.",
      "Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen.",
      `Online-Konsultationen eignen sich nicht für medizinische Notfälle. Wenn Sie einen medizinischen Notfall haben, kontaktieren Sie bitte umgehend den Rettungsdienst unter ${emergency} oder suchen Sie die nächstgelegene Notaufnahme auf.`,
    ],
  };
  return map[locale];
}

function disclaimerShortGeneric(locale: string, reg: string, emergency: string): string {
  const c = CONNECTOR[locale](reg);
  const map: Record<string, string> = {
    CS: `Veškeré služby jsou poskytovány na úrovni praktického lékaře lékaři ${c}. Doporučení k léčbě, další vyšetření a lékařská potvrzení mohou být vydána pouze tam, kde je to klinicky vhodné a na základě uvážení lékaře. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací. V případě zdravotní pohotovosti volejte ${emergency}.`,
    ES: `Todos los servicios se prestan a nivel de medicina general por médicos ${c}. Las recomendaciones de tratamiento, derivaciones y certificados médicos solo se emiten cuando es clínicamente apropiado y a criterio del médico. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online. En caso de emergencia médica llame al ${emergency}.`,
    RO: `Toate serviciile sunt furnizate la nivel de medicină de familie de către medici ${c}. Recomandările de tratament, trimiterile și certificatele medicale sunt emise doar atunci când este clinic adecvat și la discreția medicului. Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online. În caz de urgență medicală sunați la ${emergency}.`,
    PT: `Todos os serviços são prestados ao nível de clínica geral por médicos ${c}. Recomendações de tratamento, referenciações e atestados médicos só são emitidos quando clinicamente apropriado e ao critério do médico. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online. Em caso de emergência médica ligue ${emergency}.`,
    DE: `Alle Leistungen werden auf hausärztlicher Ebene von Ärzten erbracht, die ${c} sind. Behandlungsempfehlungen, Überweisungen und ärztliche Atteste werden nur ausgestellt, wenn dies klinisch angemessen ist und nach Ermessen des Arztes. Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen. Rufen Sie im medizinischen Notfall ${emergency} an.`,
  };
  return map[locale];
}

function introGeneric(locale: string, reg: string): string {
  const c = CONNECTOR[locale](reg);
  const map: Record<string, string> = {
    CS: `Global Health vás spojí s lékaři ${c} pro online konzultace s praktickým lékařem. Lékaři posoudí vaše příznaky, anamnézu a aktuální potíže během bezpečné online konzultace.`,
    ES: `Global Health le conecta con médicos ${c} para consultas médicas online. Los médicos evalúan sus síntomas, historial y situación actual mediante una consulta online segura.`,
    RO: `Global Health vă conectează cu medici ${c} pentru consultații medicale online. Medicii evaluează simptomele, istoricul medical și problema actuală printr-o consultație online securizată.`,
    PT: `A Global Health liga-o a médicos ${c} para consultas médicas online. Os médicos avaliam os seus sintomas, historial clínico e situação atual através de uma consulta online segura.`,
    DE: `Global Health verbindet Sie mit Ärzten, die ${c} sind, für Online-Hausarztkonsultationen. Ärzte beurteilen Ihre Symptome, Ihre Vorgeschichte und Ihr aktuelles Anliegen im Rahmen einer sicheren Online-Konsultation.`,
  };
  return map[locale];
}

const WHO_FOR_TITLE: Record<string, string> = {
  CS: "Pro koho je tato služba určena",
  ES: "Para quién es este servicio",
  RO: "Pentru cine este acest serviciu",
  PT: "Para quem é este serviço",
  DE: "Für wen ist dieser Dienst gedacht",
};
const WHO_FOR_INTRO: Record<string, string> = {
  CS: "Tato konzultace je vhodná pro posouzení a řešení těchto obtíží:",
  ES: "Esta consulta es adecuada para la evaluación y el manejo de:",
  RO: "Această consultație este potrivită pentru evaluarea și gestionarea:",
  PT: "Esta consulta é adequada para avaliação e gestão de:",
  DE: "Diese Konsultation eignet sich zur Beurteilung und Behandlung von:",
};
const WHY_CHOOSE_TITLE: Record<string, string> = {
  CS: "Proč zvolit Global Health",
  ES: "Por qué elegir Global Health",
  RO: "De ce să alegeți Global Health",
  PT: "Porquê escolher a Global Health",
  DE: "Warum Global Health wählen",
};
const HERO_LEAD: Record<string, string> = {
  CS: "Online konzultace s praktickým lékařem v",
  ES: "Consulta Médica Online en",
  RO: "Consultație Medicală Online în",
  PT: "Consulta Médica Online em",
  DE: "Online-Hausarztkonsultation in",
};
const SEO_TITLE_TMPL: Record<string, (accent: string) => string> = {
  CS: (a) => `Online konzultace s praktickým lékařem v ${a} | Global Health`,
  ES: (a) => `Consulta Médica Online en ${a} | Global Health`,
  RO: (a) => `Consultație Medicală Online în ${a} | Global Health`,
  PT: (a) => `Consulta Médica Online em ${a} | Global Health`,
  DE: (a) => `Online-Hausarztkonsultation in ${a} | Global Health`,
};
const SEO_DESC_TMPL: Record<string, (reg: string) => string> = {
  CS: (reg) => `Online konzultace s praktickým lékařem s lékaři ${CONNECTOR.CS(reg)}.`,
  ES: (reg) => `Consultas médicas online con médicos ${CONNECTOR.ES(reg)}.`,
  RO: (reg) => `Consultații medicale online cu medici ${CONNECTOR.RO(reg)}.`,
  PT: (reg) => `Consultas médicas online com médicos ${CONNECTOR.PT(reg)}.`,
  DE: (reg) => `Online-Hausarztkonsultationen mit Ärzten, die ${CONNECTOR.DE(reg)} sind.`,
};

/** Builds the generic-pattern GENERAL_CONSULTATION translation for a locale. */
function buildGenericGc(
  locale: string,
  opts: { reg: string; accent: string; priceLine?: string; emergency: string; includeCerts?: boolean },
): GcFields {
  const whoFor = [...WHO_FOR_12[locale]];
  if (opts.includeCerts) whoFor.splice(11, 0, CERTS_ITEM[locale]);
  return {
    heroTitle: `${HERO_LEAD[locale]} ${opts.accent}`,
    heroTitleLead: HERO_LEAD[locale],
    heroTitleAccent: opts.accent,
    intro: introGeneric(locale, opts.reg),
    whoForTitle: WHO_FOR_TITLE[locale],
    whoForIntro: WHO_FOR_INTRO[locale],
    whoForItems: whoFor,
    whyChooseTitle: WHY_CHOOSE_TITLE[locale],
    whyChooseItems: whyChooseGeneric(locale, opts.reg),
    faq: faqGeneric(locale, opts.reg, opts.priceLine),
    disclaimerParagraphs: disclaimerParagraphsGeneric(locale, opts.reg, opts.emergency),
    disclaimerShort: disclaimerShortGeneric(locale, opts.reg, opts.emergency),
    seoTitle: SEO_TITLE_TMPL[locale](opts.accent),
    seoDescription: SEO_DESC_TMPL[locale](opts.reg),
  };
}

// Shared hero override strings used by IE + PT (both published, both have
// the same English source: "Speak to a licensed doctor about everyday
// health concerns." / "Book general consultation").
const HERO_SUBTITLE_COMMON: Record<string, string> = {
  CS: "Promluvte si s licencovaným lékařem o běžných zdravotních potížích.",
  ES: "Hable con un médico colegiado sobre problemas de salud habituales.",
  RO: "Discutați cu un medic autorizat despre probleme de sănătate curente.",
  PT: "Fale com um médico licenciado sobre problemas de saúde do dia a dia.",
  DE: "Sprechen Sie mit einem approbierten Arzt über alltägliche gesundheitliche Anliegen.",
};
const CTA_LABEL_COMMON: Record<string, string> = {
  CS: "Rezervovat obecnou konzultaci",
  ES: "Reservar consulta general",
  RO: "Rezervați o consultație generală",
  PT: "Marcar consulta geral",
  DE: "Allgemeine Konsultation buchen",
};

// ── IE — rich published content, translated field-by-field (not the
// generic pattern) since it carries Ireland-specific claims (multilingual
// clinic, IMC registration numbers, sick-note/Dept. of Social Protection
// guidance) that the generic template above deliberately doesn't cover. ──

const IE_WHY_CHOOSE: Record<string, string[]> = {
  CS: [
    "Lékaři registrovaní u Irish Medical Council — registrační číslo je uvedeno na každém profilu",
    "Zabezpečené video konzultace v souladu s irskými standardy telemedicíny",
    "Otevřené termíny zobrazené při rezervaci, dle dostupnosti lékaře",
    "Konzultace dostupné v angličtině, portugalštině, španělštině, arabštině, urdštině, paňdžábštině a dalších jazycích — jediná mnohojazyčná online klinika v Irsku",
    "Lékařská dokumentace a doporučení k dalšímu postupu zaslané e-mailem po každé konzultaci",
    "Transparentní ceny — žádné skryté poplatky, žádné povinné členství",
  ],
  ES: [
    "Médicos colegiados a través del Irish Medical Council — número de colegiado visible en cada perfil",
    "Videoconsultas seguras conforme a los estándares irlandeses de telemedicina",
    "Horarios disponibles mostrados durante la reserva, según disponibilidad del médico",
    "Consultas disponibles en inglés, portugués, español, árabe, urdu, panyabí y más — la única clínica online multilingüe de Irlanda",
    "Documentación clínica y orientación de seguimiento enviada por correo electrónico tras cada consulta",
    "Precios transparentes — sin costes ocultos, sin suscripción obligatoria",
  ],
  RO: [
    "Medici înregistrați la Irish Medical Council — numărul de înregistrare afișat pe fiecare profil",
    "Consultații video securizate, conforme standardelor irlandeze de telemedicină",
    "Ore disponibile afișate în timpul rezervării, în funcție de disponibilitatea medicului",
    "Consultații disponibile în engleză, portugheză, spaniolă, arabă, urdu, punjabi și altele — singura clinică online multilingvă din Irlanda",
    "Documentație clinică și recomandări de urmărire trimise prin email după fiecare consultație",
    "Prețuri transparente — fără costuri ascunse, fără abonament obligatoriu",
  ],
  PT: [
    "Médicos inscritos no Irish Medical Council — número de registo apresentado em cada perfil",
    "Consultas por vídeo seguras, realizadas de acordo com as normas irlandesas de telemedicina",
    "Horários disponíveis apresentados durante a marcação, consoante a disponibilidade do médico",
    "Consultas disponíveis em inglês, português, espanhol, árabe, urdu, punjabi e mais idiomas — a única clínica online multilingue da Irlanda",
    "Documentação clínica e orientação de seguimento enviadas por email após cada consulta",
    "Preços transparentes — sem custos ocultos, sem subscrição obrigatória",
  ],
  DE: [
    "Beim Irish Medical Council registrierte Ärzte — Registrierungsnummer auf jedem Profil sichtbar",
    "Sichere Videokonsultationen nach irischen Telemedizin-Standards",
    "Verfügbare Termine werden bei der Buchung angezeigt, je nach Verfügbarkeit des Arztes",
    "Konsultationen verfügbar auf Englisch, Portugiesisch, Spanisch, Arabisch, Urdu, Punjabi und mehr — die einzige mehrsprachige Online-Klinik Irlands",
    "Klinische Dokumentation und Nachsorgehinweise werden nach jeder Konsultation per E-Mail bereitgestellt",
    "Transparente Preise — keine versteckten Gebühren, keine Mitgliedschaft erforderlich",
  ],
};

const IE_FAQ: Record<string, FaqItem[]> = {
  CS: [
    { question: "Mohu v Irsku absolvovat online konzultaci s praktickým lékařem?", answer: "Ano. Global Health poskytuje online konzultace s praktickým lékařem v Irsku s lékaři registrovanými u Irish Medical Council. Dostupné termíny se zobrazují při rezervaci." },
    { question: "Kolik stojí online konzultace s praktickým lékařem v Irsku?", answer: "Online konzultace u Global Health stojí od 39 € za 25minutovou video konzultaci s lékařem registrovaným u IMC. Žádné skryté poplatky, žádné povinné členství." },
    { question: "Je online konzultace s praktickým lékařem v Irsku stejně platná jako osobní návštěva?", answer: "Ano. Všichni lékaři Global Health jsou registrováni u Irish Medical Council. Online konzultace probíhají podle stejných klinických standardů jako osobní konzultace a jsou výslovně povoleny dle pokynů Irish Medical Council pro telemedicínu." },
    { question: "Mohu v Irsku vidět lékaře online v jiném jazyce než v angličtině?", answer: "Ano. Global Health je jediná online klinika v Irsku nabízející konzultace v angličtině, portugalštině, španělštině, arabštině, urdštině, paňdžábštině, češtině a francouzštině. Lékaře podle jazyka si můžete vybrat při rezervaci." },
    { question: "Jak rychle mohu v Irsku vidět lékaře online?", answer: "Otevřené termíny se zobrazují při rezervaci a závisí na zvolené službě a rozvrhu lékaře. Potvrzení obdržíte po dokončení rezervace." },
    { question: "Co se děje po online konzultaci s praktickým lékařem?", answer: "Po konzultaci vám lékař zašle e-mailem klinické poznámky a doporučení k dalšímu postupu. Doporučení k dalším vyšetřením nebo specialistovi bude zajištěno, je-li to klinicky indikováno." },
    { question: "Může online lékař v Irsku vystavit doporučení?", answer: "Ano. Naši lékaři registrovaní u IMC mohou vystavit doporučení ke specialistům v nemocnici a zajistit doporučení na krevní testy, zobrazovací vyšetření včetně rentgenu, ultrazvuku a MRI a specializované posouzení, je-li to klinicky vhodné." },
    { question: "Musím se registrovat nebo založit účet pro rezervaci?", answer: "Konzultaci si můžete rezervovat i bez založení účtu. Založení účtu vám umožní přístup k historii konzultací a klinickým poznámkám po vaší návštěvě." },
  ],
  ES: [
    { question: "¿Puedo tener una consulta médica online en Irlanda?", answer: "Sí. Global Health ofrece consultas médicas online en Irlanda con médicos colegiados a través del Irish Medical Council. Los horarios disponibles se muestran durante la reserva." },
    { question: "¿Cuánto cuesta una consulta médica online en Irlanda?", answer: "Las consultas médicas online en Global Health cuestan desde 39 € por una videoconsulta de 25 minutos con un médico registrado en el IMC. Sin costes ocultos ni suscripción obligatoria." },
    { question: "¿Es una consulta médica online tan válida como una presencial en Irlanda?", answer: "Sí. Todos los médicos de Global Health están colegiados a través del Irish Medical Council. Las consultas online se realizan bajo los mismos estándares clínicos que las presenciales y están explícitamente permitidas por las directrices del Irish Medical Council sobre telemedicina." },
    { question: "¿Puedo ver a un médico online en un idioma distinto del inglés en Irlanda?", answer: "Sí. Global Health es la única clínica online en Irlanda que ofrece consultas en inglés, portugués, español, árabe, urdu, panyabí, checo y francés. Puede elegir médico por idioma al reservar." },
    { question: "¿Con qué rapidez puedo ver a un médico online en Irlanda?", answer: "Los horarios disponibles se muestran durante la reserva y dependen del servicio elegido y de la agenda del médico. Recibirá confirmación al completar la reserva." },
    { question: "¿Qué ocurre después de mi consulta médica online?", answer: "Tras la consulta, su médico enviará por correo electrónico las notas clínicas y la orientación de seguimiento. Se gestionarán derivaciones para análisis, pruebas de imagen o valoración por especialista cuando esté clínicamente indicado." },
    { question: "¿Puede un médico online en Irlanda realizar derivaciones?", answer: "Sí. Nuestros médicos, registrados en el IMC, pueden derivar a especialistas hospitalarios y gestionar análisis de sangre, pruebas de imagen incluyendo radiografía, ecografía y resonancia magnética, y valoración por especialista cuando sea clínicamente apropiado." },
    { question: "¿Necesito registrarme o crear una cuenta para reservar?", answer: "Puede reservar una consulta sin crear una cuenta completa. Crear una cuenta le permite acceder a su historial de consultas y notas clínicas tras la cita." },
  ],
  RO: [
    { question: "Pot avea o consultație medicală online în Irlanda?", answer: "Da. Global Health oferă consultații medicale online în Irlanda cu medici înregistrați la Irish Medical Council. Orele disponibile sunt afișate în timpul rezervării." },
    { question: "Cât costă o consultație medicală online în Irlanda?", answer: "Consultațiile medicale online la Global Health costă de la 39 € pentru o videoconsultație de 25 de minute cu un medic înregistrat la IMC. Fără costuri ascunse, fără abonament obligatoriu." },
    { question: "O consultație medicală online este la fel de valabilă ca una față în față în Irlanda?", answer: "Da. Toți medicii Global Health sunt înregistrați la Irish Medical Council. Consultațiile online se desfășoară conform acelorași standarde clinice ca cele față în față și sunt permise explicit conform ghidurilor Irish Medical Council privind telemedicina." },
    { question: "Pot vedea un medic online într-o altă limbă decât engleza în Irlanda?", answer: "Da. Global Health este singura clinică online din Irlanda care oferă consultații în engleză, portugheză, spaniolă, arabă, urdu, punjabi, cehă și franceză. Puteți alege medicul în funcție de limbă la rezervare." },
    { question: "Cât de repede pot vedea un medic online în Irlanda?", answer: "Orele disponibile sunt afișate în timpul rezervării și depind de serviciul ales și de programul medicului. Veți primi o confirmare după finalizarea rezervării." },
    { question: "Ce se întâmplă după consultația mea medicală online?", answer: "După consultație, medicul dumneavoastră va trimite prin email notele clinice și recomandările de urmărire. Trimiterile pentru analize, imagistică sau evaluare de specialitate vor fi organizate atunci când este indicat clinic." },
    { question: "Poate un medic online din Irlanda să facă trimiteri?", answer: "Da. Medicii noștri, înregistrați la IMC, pot oferi trimiteri către consultanți din spital și pot organiza analize de sânge, investigații imagistice inclusiv radiografie, ecografie și RMN, precum și evaluare de specialitate atunci când este indicat clinic." },
    { question: "Trebuie să mă înregistrez sau să îmi creez un cont pentru rezervare?", answer: "Puteți rezerva o consultație fără un cont complet. Crearea unui cont vă permite accesul la istoricul consultațiilor și notele clinice după programare." },
  ],
  PT: [
    { question: "Posso ter uma consulta médica online na Irlanda?", answer: "Sim. A Global Health disponibiliza consultas médicas online na Irlanda com médicos inscritos no Irish Medical Council. Os horários disponíveis são apresentados durante a marcação." },
    { question: "Quanto custa uma consulta médica online na Irlanda?", answer: "As consultas médicas online na Global Health custam a partir de 39 € por uma videoconsulta de 25 minutos com um médico registado no IMC. Sem custos ocultos, sem subscrição obrigatória." },
    { question: "Uma consulta médica online é tão válida como uma consulta presencial na Irlanda?", answer: "Sim. Todos os médicos da Global Health estão inscritos no Irish Medical Council. As consultas online são realizadas segundo os mesmos padrões clínicos que as presenciais e são expressamente permitidas pelas diretrizes do Irish Medical Council sobre telemedicina." },
    { question: "Posso consultar um médico online noutro idioma além do inglês na Irlanda?", answer: "Sim. A Global Health é a única clínica online na Irlanda a oferecer consultas em inglês, português, espanhol, árabe, urdu, punjabi, checo e francês. Pode escolher o médico por idioma ao marcar." },
    { question: "Com que rapidez posso consultar um médico online na Irlanda?", answer: "Os horários disponíveis são apresentados durante a marcação e dependem do serviço escolhido e da agenda do médico. Receberá confirmação após concluir a marcação." },
    { question: "O que acontece depois da minha consulta médica online?", answer: "Após a consulta, o seu médico enviará por email as notas clínicas e orientações de seguimento. Serão organizadas referenciações para análises, exames de imagem ou avaliação por especialista quando clinicamente indicado." },
    { question: "Um médico online na Irlanda pode fazer referenciações?", answer: "Sim. Os nossos médicos, registados no IMC, podem referenciar para especialistas hospitalares e organizar análises ao sangue, exames de imagem incluindo radiografia, ecografia e ressonância magnética, e avaliação por especialista quando clinicamente apropriado." },
    { question: "Preciso de criar conta para marcar consulta?", answer: "Pode marcar uma consulta sem criar uma conta completa. Criar uma conta permite aceder ao histórico de consultas e notas clínicas após a marcação." },
  ],
  DE: [
    { question: "Kann ich in Irland eine Online-Hausarztkonsultation erhalten?", answer: "Ja. Global Health bietet Online-Hausarztkonsultationen in Irland mit Ärzten an, die beim Irish Medical Council registriert sind. Verfügbare Termine werden bei der Buchung angezeigt." },
    { question: "Was kostet eine Online-Hausarztkonsultation in Irland?", answer: "Online-Hausarztkonsultationen bei Global Health kosten ab 39 € für eine 25-minütige Videokonsultation mit einem beim IMC registrierten Arzt. Keine versteckten Gebühren, keine Mitgliedschaft erforderlich." },
    { question: "Ist eine Online-Hausarztkonsultation in Irland genauso gültig wie eine persönliche?", answer: "Ja. Alle Ärzte von Global Health sind beim Irish Medical Council registriert. Online-Konsultationen erfolgen nach denselben klinischen Standards wie persönliche Konsultationen und sind gemäß den Telemedizin-Richtlinien des Irish Medical Council ausdrücklich zulässig." },
    { question: "Kann ich in Irland einen Online-Arzt in einer anderen Sprache als Englisch sehen?", answer: "Ja. Global Health ist die einzige Online-Klinik in Irland, die Konsultationen auf Englisch, Portugiesisch, Spanisch, Arabisch, Urdu, Punjabi, Tschechisch und Französisch anbietet. Sie können bei der Buchung einen Arzt nach Sprache auswählen." },
    { question: "Wie schnell kann ich in Irland einen Arzt online sehen?", answer: "Verfügbare Termine werden bei der Buchung angezeigt und hängen vom gewählten Dienst und dem Terminplan des Arztes ab. Sie erhalten nach Abschluss der Buchung eine Bestätigung." },
    { question: "Was passiert nach meiner Online-Hausarztkonsultation?", answer: "Nach der Konsultation sendet Ihnen Ihr Arzt klinische Notizen und Nachsorgehinweise per E-Mail. Überweisungen für Blutuntersuchungen, Bildgebung oder fachärztliche Beurteilung werden veranlasst, sofern klinisch indiziert." },
    { question: "Kann ein Online-Hausarzt in Irland Überweisungen ausstellen?", answer: "Ja. Unsere beim IMC registrierten Ärzte können Überweisungen an Krankenhausfachärzte ausstellen und Blutuntersuchungen, Bildgebung einschließlich Röntgen, Ultraschall und MRT sowie fachärztliche Beurteilungen veranlassen, sofern klinisch angemessen." },
    { question: "Muss ich mich registrieren oder ein Konto erstellen, um zu buchen?", answer: "Sie können eine Konsultation ohne vollständiges Konto buchen. Mit einem Konto können Sie nach Ihrem Termin auf Ihre Konsultationshistorie und klinischen Notizen zugreifen." },
  ],
};

const IE_DISCLAIMER_PARAGRAPHS: Record<string, string[]> = {
  CS: [
    "Veškeré služby praktického lékaře poskytované prostřednictvím Global Health v Irsku jsou poskytovány na úrovni praktického lékaře v souladu s irskými standardy telezdravotní péče a lékařské praxe, lékaři registrovanými u Irish Medical Council.",
    "Naši online lékaři provádějí vzdálené klinické posouzení a mohou poskytnout doporučení k léčbě, doporučení k dalšímu vyšetření nebo lékařská potvrzení pouze tam, kde je to klinicky vhodné, a to výhradně na základě odborného uvážení ošetřujícího lékaře. Klinická rozhodnutí zůstávají zcela v pravomoci lékaře po provedeném posouzení.",
    "Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací.",
    "Ohledně neschopenek a lékařských potvrzení: zaměstnavatelé mohou během pracovní neschopnosti vyžadovat lékařské potvrzení od praktického lékaře. Zda bude potvrzení vystaveno, závisí na povaze vašeho zdravotního stavu a na výsledku klinického posouzení — lékař potvrzení po konzultaci vystavit může, ale nemusí. Elektronické potvrzení o pracovní neschopnosti vydané prostřednictvím naší platformy není akceptováno Department of Social Protection v Irsku. Pacienti, kteří potřebují dokumentaci pro účely Department of Social Protection, by měli absolvovat osobní konzultaci u praktického lékaře. Naši lékaři běžně nevystavují zpětně datované neschopenky vzhledem k absenci přímého klinického posouzení v době onemocnění.",
    "Online konzultace nejsou vhodné pro řešení zdravotních pohotovostních stavů. Pokud se nacházíte v život ohrožující situaci, neprodleně kontaktujte záchrannou službu na čísle 112 nebo vyhledejte nejbližší pohotovost.",
  ],
  ES: [
    "Todos los servicios de medicina general prestados a través de Global Health en Irlanda se realizan a nivel de medicina general conforme a los estándares irlandeses de telemedicina y práctica médica, por médicos colegiados a través del Irish Medical Council.",
    "Nuestros médicos online realizan evaluaciones clínicas remotas y pueden proporcionar recomendaciones de tratamiento, derivaciones o certificados médicos únicamente cuando sea clínicamente apropiado, a criterio profesional del médico tratante. Las decisiones clínicas permanecen enteramente a criterio del médico tras la evaluación.",
    "Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online.",
    "En cuanto a los partes de baja y certificados médicos: los empleadores pueden exigir un certificado médico de un médico de cabecera durante una baja por enfermedad. Que se emita o no un certificado depende de la naturaleza de su afección y del resultado de la evaluación clínica; el médico puede o no emitir un certificado tras la consulta. Los certificados electrónicos de baja emitidos a través de nuestra plataforma no son aceptados por el Department of Social Protection de Irlanda. Los pacientes que necesiten documentación para dicho organismo deben acudir a una consulta presencial con un médico de cabecera. Nuestros médicos no emiten habitualmente partes de baja con fecha retroactiva debido a la ausencia de una evaluación clínica directa en el momento de la enfermedad.",
    "Las consultas online no son adecuadas para emergencias médicas. Si tiene una emergencia médica, contacte inmediatamente con los servicios de emergencia llamando al 112 o acuda a su servicio de urgencias más cercano.",
  ],
  RO: [
    "Toate serviciile de medicină de familie oferite prin Global Health în Irlanda sunt furnizate la nivel de medicină de familie, în conformitate cu standardele irlandeze de telemedicină și practică medicală, de către medici înregistrați la Irish Medical Council.",
    "Medicii noștri online efectuează evaluări clinice la distanță și pot oferi recomandări de tratament, trimiteri sau certificate medicale doar atunci când este clinic adecvat, la discreția profesională a medicului curant. Deciziile clinice rămân în întregime la discreția medicului în urma evaluării.",
    "Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online.",
    "Referitor la certificatele de concediu medical: angajatorii pot solicita un certificat medical de la un medic de familie în timpul concediului medical. Emiterea unui certificat depinde de natura afecțiunii dumneavoastră și de rezultatul evaluării clinice — medicul poate sau nu poate elibera un certificat în urma consultației. Certificatele electronice de concediu medical emise prin platforma noastră nu sunt acceptate de Department of Social Protection din Irlanda. Pacienții care au nevoie de documente în scopuri legate de Department of Social Protection ar trebui să efectueze o consultație față în față cu un medic de familie. Medicii noștri nu emit de obicei certificate medicale retroactive din cauza lipsei unei evaluări clinice directe la momentul îmbolnăvirii.",
    "Consultațiile online nu sunt potrivite pentru urgențe medicale. Dacă vă confruntați cu o urgență medicală, contactați imediat serviciile de urgență la numărul 112 sau mergeți la cea mai apropiată unitate de primiri urgențe.",
  ],
  PT: [
    "Todos os serviços de clínica geral prestados através da Global Health na Irlanda são realizados ao nível de clínica geral, em conformidade com as normas irlandesas de telemedicina e prática médica, por médicos inscritos no Irish Medical Council.",
    "Os nossos médicos online realizam avaliações clínicas remotas e podem fornecer recomendações de tratamento, referenciações ou atestados médicos apenas quando clinicamente apropriado, ao critério profissional do médico assistente. As decisões clínicas permanecem inteiramente ao critério do médico após a avaliação.",
    "Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.",
    "Relativamente a certificados de baixa: os empregadores podem exigir um atestado médico de um clínico geral durante a baixa médica. A emissão do atestado depende da natureza da condição e do resultado da avaliação clínica — o médico pode ou não emitir um atestado após a consulta. Os certificados eletrónicos de baixa emitidos através da nossa plataforma não são aceites pelo Department of Social Protection da Irlanda. Os pacientes que necessitem de documentação para efeitos do Department of Social Protection devem realizar uma consulta presencial com um clínico geral. Os nossos médicos não emitem rotineiramente atestados retroativos devido à ausência de avaliação clínica direta no momento da doença.",
    "As consultas online não são adequadas para emergências médicas. Em caso de emergência médica, contacte imediatamente os serviços de emergência através do número 112 ou dirija-se ao serviço de urgência mais próximo.",
  ],
  DE: [
    "Alle über Global Health in Irland angebotenen hausärztlichen Leistungen werden auf hausärztlicher Ebene gemäß den irischen Standards für Telemedizin und ärztliche Praxis von Ärzten erbracht, die beim Irish Medical Council registriert sind.",
    "Unsere Online-Ärzte führen aus der Ferne klinische Beurteilungen durch und können Behandlungsempfehlungen, Überweisungen oder ärztliche Atteste nur ausstellen, wenn dies klinisch angemessen ist und nach professionellem Ermessen des behandelnden Arztes. Klinische Entscheidungen liegen nach der Beurteilung ausschließlich im Ermessen des Arztes.",
    "Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen.",
    "Zu Krankschreibungen und ärztlichen Attesten: Arbeitgeber können während einer Krankschreibung ein ärztliches Attest von einem Hausarzt verlangen. Ob ein Attest ausgestellt wird, hängt von der Art Ihrer Erkrankung und dem Ergebnis der klinischen Beurteilung ab — der Arzt kann nach der Konsultation ein Attest ausstellen, muss dies aber nicht. Elektronische Krankschreibungen, die über unsere Plattform ausgestellt werden, werden vom Department of Social Protection in Irland nicht anerkannt. Patienten, die eine Dokumentation für das Department of Social Protection benötigen, sollten eine persönliche hausärztliche Konsultation wahrnehmen. Unsere Ärzte stellen aufgrund der fehlenden direkten klinischen Beurteilung zum Zeitpunkt der Erkrankung grundsätzlich keine rückwirkenden Krankschreibungen aus.",
    "Online-Konsultationen eignen sich nicht für medizinische Notfälle. Wenn Sie einen medizinischen Notfall haben, kontaktieren Sie bitte umgehend den Rettungsdienst unter 112 oder suchen Sie die nächstgelegene Notaufnahme auf.",
  ],
};

const IE_DISCLAIMER_SHORT: Record<string, string> = {
  CS: "Veškeré služby v Irsku jsou poskytovány na úrovni praktického lékaře lékaři registrovanými u IMC. Doporučení k léčbě, další vyšetření a lékařská potvrzení mohou být vydána pouze tam, kde je to klinicky vhodné a na základě uvážení lékaře. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací. Elektronická potvrzení o pracovní neschopnosti nejsou akceptována Department of Social Protection v Irsku. Zpětně datované neschopenky se běžně nevystavují. V případě zdravotní pohotovosti volejte 112.",
  ES: "Todos los servicios en Irlanda se prestan a nivel de medicina general por médicos colegiados a través del IMC. Las recomendaciones de tratamiento, derivaciones y certificados médicos solo se emiten cuando es clínicamente apropiado y a criterio del médico. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online. Los certificados electrónicos de baja no son aceptados por el Department of Social Protection de Irlanda. No se emiten habitualmente partes de baja con fecha retroactiva. En caso de emergencia médica llame al 112.",
  RO: "Toate serviciile din Irlanda sunt furnizate la nivel de medicină de familie de către medici înregistrați la IMC. Recomandările de tratament, trimiterile și certificatele medicale sunt emise doar atunci când este clinic adecvat și la discreția medicului. Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online. Certificatele electronice de concediu medical nu sunt acceptate de Department of Social Protection din Irlanda. Certificatele retroactive nu sunt emise de obicei. În caz de urgență medicală sunați la 112.",
  PT: "Todos os serviços na Irlanda são prestados ao nível de clínica geral por médicos inscritos no IMC. Recomendações de tratamento, referenciações e atestados médicos só são emitidos quando clinicamente apropriado e ao critério do médico. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online. Os certificados eletrónicos de baixa não são aceites pelo Department of Social Protection da Irlanda. Atestados retroativos não são habitualmente emitidos. Em caso de emergência médica ligue 112.",
  DE: "Alle Leistungen in Irland werden auf hausärztlicher Ebene von beim IMC registrierten Ärzten erbracht. Behandlungsempfehlungen, Überweisungen und ärztliche Atteste werden nur ausgestellt, wenn dies klinisch angemessen ist und nach Ermessen des Arztes. Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen. Elektronische Krankschreibungen werden vom Department of Social Protection in Irland nicht anerkannt. Rückwirkende Krankschreibungen werden grundsätzlich nicht ausgestellt. Rufen Sie im medizinischen Notfall 112 an.",
};

const IE_INTRO: Record<string, string> = {
  CS: "Global Health vás spojí s lékaři registrovanými u Irish Medical Council pro online konzultace s praktickým lékařem po celém Irsku. Lékaři posoudí vaše příznaky, anamnézu a aktuální potíže během bezpečné online konzultace. Konzultace jsou dostupné v angličtině, portugalštině, španělštině, arabštině, urdštině a dalších jazycích, dle dostupnosti lékaře.",
  ES: "Global Health le conecta con médicos colegiados a través del Irish Medical Council para consultas médicas online en toda Irlanda. Los médicos evalúan sus síntomas, historial y situación actual mediante citas online seguras. Las consultas están disponibles en inglés, portugués, español, árabe, urdu y más idiomas, según disponibilidad del médico.",
  RO: "Global Health vă conectează cu medici înregistrați la Irish Medical Council pentru consultații medicale online în toată Irlanda. Medicii evaluează simptomele, istoricul medical și problema actuală prin programări online securizate. Consultațiile sunt disponibile în engleză, portugheză, spaniolă, arabă, urdu și alte limbi, în funcție de disponibilitatea medicului.",
  PT: "A Global Health liga-o a médicos inscritos no Irish Medical Council para consultas médicas online em toda a Irlanda. Os médicos avaliam os seus sintomas, historial e situação atual através de consultas online seguras. As consultas estão disponíveis em inglês, português, espanhol, árabe, urdu e outros idiomas, consoante a disponibilidade do médico.",
  DE: "Global Health verbindet Sie mit Ärzten, die beim Irish Medical Council registriert sind, für Online-Hausarztkonsultationen in ganz Irland. Ärzte beurteilen Ihre Symptome, Ihre Vorgeschichte und Ihr aktuelles Anliegen im Rahmen sicherer Online-Termine. Konsultationen sind je nach Verfügbarkeit des Arztes auf Englisch, Portugiesisch, Spanisch, Arabisch, Urdu und weiteren Sprachen verfügbar.",
};

const IE_SEO_TITLE: Record<string, string> = {
  CS: "Online konzultace s praktickým lékařem v Irsku | Global Health",
  ES: "Consulta Médica Online en Irlanda | Global Health",
  RO: "Consultație Medicală Online în Irlanda | Global Health",
  PT: "Consulta Médica Online na Irlanda | Global Health",
  DE: "Online-Hausarztkonsultation in Irland | Global Health",
};
const IE_SEO_DESC: Record<string, string> = {
  CS: "Online konzultace s praktickým lékařem s lékaři registrovanými u IMC v Irsku. Vyberte si z otevřených termínů, jsou-li dostupné.",
  ES: "Consultas médicas online con médicos colegiados a través del IMC en Irlanda. Elija entre los horarios disponibles.",
  RO: "Consultații medicale online cu medici înregistrați la IMC în Irlanda. Alegeți dintre orele disponibile.",
  PT: "Consultas médicas online com médicos inscritos no IMC na Irlanda. Escolha entre os horários disponíveis.",
  DE: "Online-Hausarztkonsultationen mit beim IMC registrierten Ärzten in Irland. Wählen Sie aus den verfügbaren Terminen.",
};

function buildIeGc(locale: string): GcFields {
  const whoFor = [...WHO_FOR_12[locale]];
  whoFor.splice(11, 0, CERTS_ITEM[locale]);
  return {
    heroTitle: `${HERO_LEAD[locale]} Irsko`,
    heroTitleLead: HERO_LEAD[locale],
    heroTitleAccent: "Irsko",
    heroSubtitle: HERO_SUBTITLE_COMMON[locale],
    ctaLabel: CTA_LABEL_COMMON[locale],
    intro: IE_INTRO[locale],
    whoForTitle: WHO_FOR_TITLE[locale],
    whoForIntro: WHO_FOR_INTRO[locale],
    whoForItems: whoFor,
    whyChooseTitle: WHY_CHOOSE_TITLE[locale],
    whyChooseItems: IE_WHY_CHOOSE[locale],
    faq: IE_FAQ[locale],
    disclaimerParagraphs: IE_DISCLAIMER_PARAGRAPHS[locale],
    disclaimerShort: IE_DISCLAIMER_SHORT[locale],
    seoTitle: IE_SEO_TITLE[locale],
    seoDescription: IE_SEO_DESC[locale],
  };
}
// heroTitleAccent should read as the country name in that locale — fix per locale.
const IE_ACCENT: Record<string, string> = { CS: "Irsku", ES: "Irlanda", RO: "Irlanda", PT: "Irlanda", DE: "Irland" };

function ieGc(locale: string): GcFields {
  const base = buildIeGc(locale);
  base.heroTitleAccent = IE_ACCENT[locale];
  base.heroTitle = `${HERO_LEAD[locale]} ${IE_ACCENT[locale]}`;
  return base;
}

// ── PT hub (published) — generic base (Ordem dos Médicos / 29,00 € / 112)
// plus PT's own hero/CTA/SEO overrides, translated. ──

const PT_SEO_TITLE: Record<string, string> = {
  ES: "Consulta General en Portugal | Global Health",
  CS: "Obecná konzultace v Portugalsku | Global Health",
  RO: "Consultație Generală în Portugalia | Global Health",
  DE: "Allgemeine Konsultation in Portugal | Global Health",
};
const PT_SEO_DESC: Record<string, string> = {
  ES: "Consulta general online con un médico colegiado en Portugal. Reservas para el mismo día disponibles.",
  CS: "Online obecná konzultace s licencovaným lékařem v Portugalsku. K dispozici jsou rezervace na stejný den.",
  RO: "Consultație generală online cu un medic autorizat în Portugalia. Disponibile programări în aceeași zi.",
  DE: "Online-Allgemeinkonsultation mit einem approbierten Arzt in Portugal. Terminbuchung am selben Tag verfügbar.",
};

function ptGc(locale: string): GcFields {
  const base = buildGenericGc(locale, {
    reg: "Ordem dos Médicos",
    accent: "Portugalsko",
    priceLine: locale === "CS" ? "od 650,00 Kč" : locale === "RO" ? "de la 29,00 €" : locale === "ES" ? "desde 29,00 €" : "ab 29,00 €",
    emergency: "112",
  });
  const accentMap: Record<string, string> = { ES: "Portugal", CS: "Portugalsku", RO: "Portugalia", DE: "Portugal" };
  base.heroTitleAccent = accentMap[locale];
  base.heroTitle = `${HERO_LEAD[locale]} ${accentMap[locale]}`;
  base.heroSubtitle = HERO_SUBTITLE_COMMON[locale];
  base.ctaLabel = CTA_LABEL_COMMON[locale];
  base.seoTitle = PT_SEO_TITLE[locale];
  base.seoDescription = PT_SEO_DESC[locale];
  return base;
}

// ── CZ / ES / RO / BR (drafts) — pure generic pattern, no hero overrides,
// matching how these rows are already seeded (heroSubtitle/ctaLabel null). ──

function czGc(locale: string): GcFields {
  const priceLine: Record<string, string> = { PT: "a partir de 650,00 Kč", ES: "desde 650,00 Kč", RO: "de la 650,00 Kč", DE: "ab 650,00 Kč" };
  const accent: Record<string, string> = { PT: "Chéquia", ES: "República Checa", RO: "Cehia", DE: "Tschechien" };
  return { ...buildGenericGc(locale, { reg: "Česká lékařská komora (ČLK)", accent: accent[locale], priceLine: priceLine[locale], emergency: "112" }) };
}
function esGc(locale: string): GcFields {
  const priceLine: Record<string, string> = { PT: "a partir de 29,00 €", CS: "od 29,00 €", RO: "de la 29,00 €", DE: "ab 29,00 €" };
  const accent: Record<string, string> = { PT: "Espanha", CS: "Španělsku", RO: "Spania", DE: "Spanien" };
  return { ...buildGenericGc(locale, { reg: "Organización Médica Colegial (colegios de médicos)", accent: accent[locale], priceLine: priceLine[locale], emergency: "112" }) };
}
function roGc(locale: string): GcFields {
  const priceLine: Record<string, string> = { PT: "a partir de 65,00 RON", ES: "desde 65,00 RON", CS: "od 65,00 RON", DE: "ab 65,00 RON" };
  const accent: Record<string, string> = { PT: "Roménia", ES: "Rumanía", CS: "Rumunsku", DE: "Rumänien" };
  return { ...buildGenericGc(locale, { reg: "Colegiul Medicilor din România", accent: accent[locale], priceLine: priceLine[locale], emergency: "112" }) };
}
function brGc(locale: string): GcFields {
  // BR's own drafts omit the price FAQ entirely — match that (no priceLine).
  const accent: Record<string, string> = { ES: "Brasil" };
  return { ...buildGenericGc(locale, { reg: "CRM (Conselho Regional de Medicina)", accent: accent[locale], emergency: "SAMU 192" }) };
}

// ── HOME / SPECIALIST_CONSULTATION / DOCTORS_INDEX — hero/SEO only, body is
// null on these rows so nothing else to translate. ──

const HOME_HERO_TITLE: Record<string, (country: string) => string> = {
  CS: (c) => `Online lékařská péče v ${c}`,
  ES: (c) => `Atención médica online en ${c}`,
  RO: (c) => `Îngrijire medicală online în ${c}`,
  PT: (c) => `Cuidados médicos online em ${c}`,
  DE: (c) => `Online-medizinische Versorgung in ${c}`,
  EN: (c) => `Online medical care in ${c}`,
};
const HOME_HERO_SUBTITLE: Record<string, string> = {
  CS: "Licencovaní lékaři, žádné čekárny, dostupné po celé zemi.",
  ES: "Médicos colegiados, sin salas de espera, disponibles en todo el país.",
  RO: "Medici autorizați, fără săli de așteptare, disponibili în toată țara.",
  PT: "Médicos licenciados, sem salas de espera, disponíveis em todo o país.",
  DE: "Approbierte Ärzte, keine Wartezimmer, landesweit verfügbar.",
  EN: "Licensed doctors, no waiting rooms, available nationwide.",
};
const HOME_CTA: Record<string, string> = {
  CS: "Rezervovat konzultaci",
  ES: "Reservar una consulta",
  RO: "Rezervați o consultație",
  PT: "Marcar uma consulta",
  DE: "Konsultation buchen",
  EN: "Book a consultation",
};
const HOME_SEO_TITLE: Record<string, (country: string) => string> = {
  CS: (c) => `Online klinika ${c} | Global Health`,
  ES: (c) => `Clínica Online en ${c} | Global Health`,
  RO: (c) => `Clinică Online ${c} | Global Health`,
  PT: (c) => `Clínica Online em ${c} | Global Health`,
  DE: (c) => `Online-Klinik ${c} | Global Health`,
  EN: (c) => `${c} Online Clinic | Global Health`,
};
const HOME_SEO_DESC: Record<string, (country: string) => string> = {
  CS: (c) => `Rezervujte si licencovanou online konzultaci s lékařem v ${c}. Důvěryhodná evropská telemedicína, chráněná GDPR.`,
  ES: (c) => `Reserve una consulta médica online colegiada en ${c}. Telemedicina europea de confianza, protegida por RGPD.`,
  RO: (c) => `Programați o consultație medicală online autorizată în ${c}. Telemedicină europeană de încredere, protejată prin GDPR.`,
  PT: (c) => `Marque uma consulta médica online licenciada em ${c}. Telemedicina europeia de confiança, protegida pelo RGPD.`,
  DE: (c) => `Buchen Sie eine approbierte Online-Arztkonsultation in ${c}. Vertrauenswürdige europäische Telemedizin, DSGVO-konform.`,
  EN: (c) => `Book a licensed online doctor consultation in ${c}. Trusted European telemedicine, GDPR-protected.`,
};

const COUNTRY_NAME_LOCATIVE: Record<string, Record<string, string>> = {
  ie: { EN: "Ireland", ES: "Irlanda", CS: "Irsku", RO: "Irlanda", PT: "Irlanda", DE: "Irland" },
  pt: { EN: "Portugal", ES: "Portugal", CS: "Portugalsku", RO: "Portugalia", DE: "Portugal" },
};

function homeHero(locale: string, country: "ie" | "pt"): HeroOnlyFields {
  const name = COUNTRY_NAME_LOCATIVE[country][locale];
  return {
    heroTitle: HOME_HERO_TITLE[locale](name),
    heroSubtitle: HOME_HERO_SUBTITLE[locale],
    ctaLabel: HOME_CTA[locale],
    seoTitle: HOME_SEO_TITLE[locale](name),
    seoDescription: HOME_SEO_DESC[locale](name),
  };
}

const SPECIALIST_HERO_TITLE: Record<string, string> = {
  ES: "Consulta con especialista", CS: "Konzultace se specialistou", RO: "Consultație de specialitate", PT: "Consulta com especialista", DE: "Facharztkonsultation", EN: "Specialist consultation",
};
const SPECIALIST_HERO_SUBTITLE: Record<string, string> = {
  ES: "Conecte con especialistas en cardiología, dermatología, nutrición y más.",
  CS: "Spojte se se specialisty v oborech kardiologie, dermatologie, výživy a dalších.",
  RO: "Conectați-vă cu specialiști în cardiologie, dermatologie, nutriție și altele.",
  PT: "Ligue-se a especialistas em cardiologia, dermatologia, nutrição e muito mais.",
  DE: "Verbinden Sie sich mit Fachärzten aus Kardiologie, Dermatologie, Ernährungsmedizin und mehr.",
  EN: "Connect with specialists across cardiology, dermatology, nutrition and more.",
};
const SPECIALIST_CTA: Record<string, string> = {
  ES: "Reservar consulta con especialista", CS: "Rezervovat konzultaci se specialistou", RO: "Rezervați o consultație de specialitate", PT: "Marcar consulta com especialista", DE: "Facharztkonsultation buchen", EN: "Book specialist consultation",
};
const SPECIALIST_SEO_TITLE: Record<string, (c: string) => string> = {
  ES: (c) => `Consulta con Especialista en ${c} | Global Health`,
  CS: (c) => `Konzultace se specialistou v ${c} | Global Health`,
  RO: (c) => `Consultație de Specialitate în ${c} | Global Health`,
  PT: (c) => `Consulta com Especialista em ${c} | Global Health`,
  DE: (c) => `Facharztkonsultation in ${c} | Global Health`,
  EN: (c) => `Specialist Consultation in ${c} | Global Health`,
};
const SPECIALIST_SEO_DESC: Record<string, (c: string) => string> = {
  ES: (c) => `Consulta online con especialista en ${c}. Cardiología, dermatología, nutrición y más.`,
  CS: (c) => `Online konzultace se specialistou v ${c}. Kardiologie, dermatologie, výživa a další.`,
  RO: (c) => `Consultație online de specialitate în ${c}. Cardiologie, dermatologie, nutriție și altele.`,
  PT: (c) => `Consulta online com especialista em ${c}. Cardiologia, dermatologia, nutrição e mais.`,
  DE: (c) => `Online-Facharztkonsultation in ${c}. Kardiologie, Dermatologie, Ernährungsmedizin und mehr.`,
  EN: (c) => `Online specialist consultation in ${c}. Cardiology, dermatology, nutrition, and more.`,
};

function specialistHero(locale: string, country: "ie" | "pt"): HeroOnlyFields {
  const name = COUNTRY_NAME_LOCATIVE[country][locale];
  return {
    heroTitle: SPECIALIST_HERO_TITLE[locale],
    heroSubtitle: SPECIALIST_HERO_SUBTITLE[locale],
    ctaLabel: SPECIALIST_CTA[locale],
    seoTitle: SPECIALIST_SEO_TITLE[locale](name),
    seoDescription: SPECIALIST_SEO_DESC[locale](name),
  };
}

const DOCTORS_HERO_TITLE: Record<string, (c: string) => string> = {
  ES: (c) => `Conozca a nuestros médicos de ${c}`,
  CS: (c) => `Poznejte naše lékaře v ${c}`,
  RO: (c) => `Cunoașteți medicii noștri din ${c}`,
  PT: (c) => `Conheça os nossos médicos em ${c}`,
  DE: (c) => `Lernen Sie unsere Ärzte in ${c} kennen`,
  EN: (c) => `Meet our ${c} doctors`,
};
const DOCTORS_HERO_SUBTITLE: Record<string, string> = {
  ES: "Todos los profesionales están colegiados y verificados.",
  CS: "Všichni lékaři jsou licencovaní a ověření.",
  RO: "Toți practicienii sunt autorizați și verificați.",
  PT: "Todos os profissionais são licenciados e verificados.",
  DE: "Alle Ärzte sind approbiert und verifiziert.",
  EN: "All practitioners are licensed and verified.",
};
const DOCTORS_CTA: Record<string, string> = HOME_CTA;
const DOCTORS_SEO_TITLE: Record<string, (c: string) => string> = {
  ES: (c) => `Médicos en ${c} | Global Health`,
  CS: (c) => `Lékaři v ${c} | Global Health`,
  RO: (c) => `Medici în ${c} | Global Health`,
  PT: (c) => `Médicos em ${c} | Global Health`,
  DE: (c) => `Ärzte in ${c} | Global Health`,
  EN: (c) => `${c} Doctors | Global Health`,
};
const DOCTORS_SEO_DESC: Record<string, (c: string) => string> = {
  ES: (c) => `Médicos online colegiados que atienden a ${c}. Vea perfiles, especialidades e idiomas.`,
  CS: (c) => `Licencovaní online lékaři poskytující služby v ${c}. Prohlédněte si profily, specializace a jazyky.`,
  RO: (c) => `Medici online autorizați care deservesc ${c}. Vedeți profiluri, specializări și limbi vorbite.`,
  PT: (c) => `Médicos online licenciados a servir ${c}. Veja perfis, especialidades e idiomas.`,
  DE: (c) => `Approbierte Online-Ärzte für ${c}. Profile, Fachgebiete und Sprachen ansehen.`,
  EN: (c) => `Licensed online doctors serving ${c}. View profiles, specialties, and languages.`,
};

function doctorsHero(locale: string, country: "ie" | "pt"): HeroOnlyFields {
  const name = COUNTRY_NAME_LOCATIVE[country][locale];
  return {
    heroTitle: DOCTORS_HERO_TITLE[locale](name),
    heroSubtitle: DOCTORS_HERO_SUBTITLE[locale],
    ctaLabel: DOCTORS_CTA[locale],
    seoTitle: DOCTORS_SEO_TITLE[locale](name),
    seoDescription: DOCTORS_SEO_DESC[locale](name),
  };
}

// ── driver ──

type Summary = { pageKey: string; country: string; locale: string; action: string };

async function main(): Promise<void> {
  const summary: Summary[] = [];

  let tablesAvailable = true;
  if (!APPLY) {
    try {
      await prisma.pageContent.count();
    } catch {
      tablesAvailable = false;
      console.log("[seed-page-content-translations] PageContent tables not found — cannot introspect. Aborting dry run.");
      console.table(summary);
      return;
    }
  }
  if (!tablesAvailable && !APPLY) return;

  const pageContents = await prisma.pageContent.findMany({
    include: { country: { select: { code: true }, }, translations: { select: { locale: true } } },
  });

  const countryLocales = await prisma.countryLocale.findMany({ select: { countryId: true, locale: true } });
  const localesByCountryId = new Map<string, Set<LocaleCode>>();
  for (const cl of countryLocales) {
    if (!localesByCountryId.has(cl.countryId)) localesByCountryId.set(cl.countryId, new Set());
    localesByCountryId.get(cl.countryId)!.add(cl.locale);
  }

  for (const pc of pageContents) {
    const existingLocales = new Set(pc.translations.map((t) => t.locale));
    const targetLocales = localesByCountryId.get(pc.countryId) ?? new Set();
    const missing = [...targetLocales].filter((l) => !existingLocales.has(l));
    if (missing.length === 0) continue;

    for (const locale of missing) {
      let data: GcFields | HeroOnlyFields | null = null;

      if (pc.pageKey === "GENERAL_CONSULTATION") {
        const l = locale as string;
        if (!(l in WHO_FOR_12) && pc.country.code !== "ie") continue; // no template for this locale (shouldn't happen — enum is closed)
        switch (pc.country.code) {
          case "ie":
            data = ieGc(l);
            break;
          case "pt":
            data = ptGc(l);
            break;
          case "cz":
            data = czGc(l);
            break;
          case "es":
            data = esGc(l);
            break;
          case "ro":
            data = roGc(l);
            break;
          case "br":
            if (l !== "ES") continue; // br only supports EN/PT/ES — others aren't a real gap
            data = brGc(l);
            break;
          default:
            continue;
        }
      } else if (pc.pageKey === "HOME" && (pc.country.code === "ie" || pc.country.code === "pt")) {
        data = homeHero(locale as string, pc.country.code as "ie" | "pt");
      } else if (pc.pageKey === "SPECIALIST_CONSULTATION" && (pc.country.code === "ie" || pc.country.code === "pt")) {
        data = specialistHero(locale as string, pc.country.code as "ie" | "pt");
      } else if (pc.pageKey === "DOCTORS_INDEX" && (pc.country.code === "ie" || pc.country.code === "pt")) {
        data = doctorsHero(locale as string, pc.country.code as "ie" | "pt");
      }

      if (!data) continue;

      summary.push({
        pageKey: pc.pageKey,
        country: pc.country.code,
        locale,
        action: APPLY ? "created" : "would create",
      });

      if (APPLY) {
        await prisma.pageContentTranslation.create({
          data: { pageContentId: pc.id, locale, ...data },
        });
      }
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — plan (${summary.length} translation rows):`);
  console.table(summary);

  const publishedTouched = summary.filter((s) => (s.pageKey && ["ie", "pt"].includes(s.country)));
  if (publishedTouched.length > 0) {
    console.log(
      `\nNOTE: ${publishedTouched.length} rows are on PUBLISHED PageContent (ie/pt) — these machine-drafted ` +
        "translations go live immediately and should be reviewed by the owner for legal/medical accuracy before being trusted.",
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
