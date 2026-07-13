/**
 * DOCTORS_INDEX page-content seed — brings the doctor-network hub to
 * admin-controlled parity with GENERAL_CONSULTATION / SPECIALIST_CONSULTATION
 * (see seed-page-content.ts, seed-specialist-page-content.ts — the latter is
 * the canonical pattern this file copies: `pick`/`pickArr` fill logic,
 * IE-wins vs fill-for-others, per-locale CountryLocale query, console.table,
 * dry-run/--apply).
 *
 * DOCTORS_INDEX rows already exist (PUBLISHED) — created by the structured
 * page-content CMS. This script only ADDS the five structured fields
 * (intro, whoFor.., whyChoose.., faq, disclaimer..) and flips the five
 * show.. toggles on; it never touches status, never touches showBody, and
 * never clobbers a field an admin already edited.
 *
 * Content is authored fresh for DOCTORS_INDEX (NOT copied from the GP seed)
 * — about the doctor directory: choosing a doctor by specialty/language,
 * checking credentials, booking follow-ups.
 *
 *   npx tsx scripts/seed-doctors-page-content.ts          # dry run
 *   npx tsx scripts/seed-doctors-page-content.ts --apply  # write
 */
import "dotenv/config";
import { LocaleCode, PublishStatus } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const PAGE_KEY = "DOCTORS_INDEX";

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
  { countryCode: "br", regulator: "Conselho Federal de Medicina (CFM) / CRM", emergency: "SAMU 192" },
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
  EN: "Choosing a doctor",
  CS: "Výběr lékaře",
  ES: "Elegir un médico",
  RO: "Alegerea unui medic",
  PT: "Escolher um médico",
  DE: "Einen Arzt auswählen",
};

const WHO_FOR_INTRO: Record<LocaleCode, string> = {
  EN: "Use our doctor directory when you want to:",
  CS: "Adresář lékařů využijte, pokud chcete:",
  ES: "Utilice nuestro directorio de médicos cuando desee:",
  RO: "Utilizați directorul nostru de medici atunci când doriți:",
  PT: "Utilize o nosso diretório de médicos quando quiser:",
  DE: "Nutzen Sie unser Ärzteverzeichnis, wenn Sie:",
};

const WHY_CHOOSE_TITLE: Record<LocaleCode, string> = {
  EN: "Why choose our doctors",
  CS: "Proč zvolit naše lékaře",
  ES: "Por qué elegir a nuestros médicos",
  RO: "De ce să alegeți medicii noștri",
  PT: "Porquê escolher os nossos médicos",
  DE: "Warum unsere Ärzte wählen",
};

const WHO_FOR_ITEMS: Record<LocaleCode, string[]> = {
  EN: [
    "See a specific doctor again for continuity of care",
    "Choose a doctor who speaks your preferred language",
    "Find a doctor in a particular specialty such as cardiology, dermatology or paediatrics",
    "Check a doctor's registration, qualifications and areas of practice before booking",
    "Compare available appointment times across doctors",
    "Book a follow-up with the same doctor who saw you previously",
  ],
  CS: [
    "Znovu navštívit konkrétního lékaře kvůli návaznosti péče",
    "Vybrat lékaře, který mluví vaším preferovaným jazykem",
    "Najít lékaře v konkrétním oboru, jako je kardiologie, dermatologie nebo pediatrie",
    "Před rezervací si ověřit registraci, kvalifikaci a obor praxe lékaře",
    "Porovnat dostupné termíny u jednotlivých lékařů",
    "Rezervovat kontrolu u stejného lékaře, který vás již dříve vyšetřil",
  ],
  ES: [
    "Volver a ver a un médico concreto para dar continuidad a su atención",
    "Elegir un médico que hable su idioma preferido",
    "Encontrar un médico en una especialidad concreta como cardiología, dermatología o pediatría",
    "Comprobar la colegiación, cualificaciones y áreas de práctica de un médico antes de reservar",
    "Comparar los horarios disponibles entre distintos médicos",
    "Reservar un seguimiento con el mismo médico que le atendió anteriormente",
  ],
  RO: [
    "Reveniți la un anumit medic pentru continuitatea îngrijirii",
    "Alegeți un medic care vorbește limba preferată de dumneavoastră",
    "Găsiți un medic într-o anumită specialitate precum cardiologie, dermatologie sau pediatrie",
    "Verificați înregistrarea, calificările și domeniile de practică ale unui medic înainte de rezervare",
    "Comparați orele disponibile între diferiți medici",
    "Programați o consultație de urmărire cu același medic care v-a consultat anterior",
  ],
  PT: [
    "Voltar a consultar um médico específico para dar continuidade aos cuidados",
    "Escolher um médico que fale o seu idioma preferido",
    "Encontrar um médico numa especialidade específica, como cardiologia, dermatologia ou pediatria",
    "Verificar a inscrição, qualificações e áreas de prática de um médico antes de marcar",
    "Comparar horários disponíveis entre médicos",
    "Marcar uma consulta de seguimento com o mesmo médico que o atendeu anteriormente",
  ],
  DE: [
    "Einen bestimmten Arzt erneut aufsuchen, um die Behandlungskontinuität zu wahren",
    "Einen Arzt wählen, der Ihre bevorzugte Sprache spricht",
    "Einen Arzt in einem bestimmten Fachgebiet wie Kardiologie, Dermatologie oder Pädiatrie finden",
    "Registrierung, Qualifikationen und Tätigkeitsbereiche eines Arztes vor der Buchung prüfen",
    "Verfügbare Termine verschiedener Ärzte vergleichen",
    "Einen Nachsorgetermin bei demselben Arzt buchen, der Sie zuvor behandelt hat",
  ],
};

function whyChooseItems(locale: LocaleCode, reg: string): string[] {
  const c = CONNECTOR[locale](reg);
  switch (locale) {
    case "EN":
      return [
        "Registration numbers and credentials shown on every doctor profile",
        `Doctors ${c}`,
        "Secure video consultations conducted to national telemedicine standards",
        "Consultations available in multiple languages, subject to clinician availability",
        "Transparent pricing — no hidden fees, no membership required",
      ];
    case "CS":
      return [
        "Registrační čísla a kvalifikace uvedené na profilu každého lékaře",
        `Lékaři ${c}`,
        "Zabezpečené video konzultace v souladu s národními standardy telemedicíny",
        "Konzultace dostupné ve více jazycích podle dostupnosti lékaře",
        "Transparentní ceny — žádné skryté poplatky, žádné povinné členství",
      ];
    case "ES":
      return [
        "Números de colegiación y credenciales mostrados en cada perfil de médico",
        `Médicos ${c}`,
        "Videoconsultas seguras conforme a los estándares nacionales de telemedicina",
        "Consultas disponibles en varios idiomas, según disponibilidad del médico",
        "Precios transparentes — sin costes ocultos, sin suscripción obligatoria",
      ];
    case "RO":
      return [
        "Numere de înregistrare și calificări afișate pe profilul fiecărui medic",
        `Medici ${c}`,
        "Consultații video securizate, conforme standardelor naționale de telemedicină",
        "Consultații disponibile în mai multe limbi, în funcție de disponibilitatea medicului",
        "Prețuri transparente — fără costuri ascunse, fără abonament obligatoriu",
      ];
    case "PT":
      return [
        "Números de inscrição e credenciais apresentados em cada perfil de médico",
        `Médicos ${c}`,
        "Consultas por vídeo seguras, realizadas de acordo com as normas nacionais de telemedicina",
        "Consultas disponíveis em vários idiomas, consoante a disponibilidade do médico",
        "Preços transparentes — sem custos ocultos, sem subscrição obrigatória",
      ];
    case "DE":
      return [
        "Registrierungsnummern und Qualifikationen auf jedem Arztprofil angezeigt",
        `Ärzte, ${c}`,
        "Sichere Videokonsultationen nach nationalen Telemedizin-Standards",
        "Konsultationen in mehreren Sprachen verfügbar, je nach Verfügbarkeit des Arztes",
        "Transparente Preise — keine versteckten Gebühren, keine Mitgliedschaft erforderlich",
      ];
  }
}

function faq(locale: LocaleCode, reg: string): FaqItem[] {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, FaqItem[]> = {
    EN: [
      { question: "How do I choose the right doctor?", answer: "Browse doctor profiles by specialty, language and available appointment times to find the best match for your needs, or book directly with the next available doctor." },
      { question: "How do I know a doctor is properly qualified?", answer: `Each profile shows the doctor's registration details. All doctors on Global Health are ${c}.` },
      { question: "Can I choose a doctor by language?", answer: "Yes. Consultations are available in multiple languages, subject to clinician availability, and you can filter or select a doctor by language when booking." },
      { question: "How do I book with a specific doctor?", answer: "Open the doctor's profile and select an available appointment time to book directly with them." },
      { question: "Can I see the same doctor for a follow-up?", answer: "Yes. You can book a follow-up appointment with the same doctor, subject to their availability." },
    ],
    CS: [
      { question: "Jak vyberu vhodného lékaře?", answer: "Procházejte profily lékařů podle specializace, jazyka a dostupných termínů, abyste našli tu nejlepší volbu pro vaše potřeby, nebo si rezervujte termín u nejbližšího dostupného lékaře." },
      { question: "Jak poznám, že je lékař řádně kvalifikovaný?", answer: `Na každém profilu jsou uvedeny registrační údaje lékaře. Všichni lékaři na Global Health jsou ${c}.` },
      { question: "Mohu si vybrat lékaře podle jazyka?", answer: "Ano. Konzultace jsou dostupné ve více jazycích podle dostupnosti lékaře a při rezervaci si můžete lékaře filtrovat nebo vybrat podle jazyka." },
      { question: "Jak si rezervuji termín u konkrétního lékaře?", answer: "Otevřete profil lékaře a vyberte dostupný termín pro přímou rezervaci." },
      { question: "Mohu jít na kontrolu ke stejnému lékaři?", answer: "Ano. Kontrolní termín si můžete rezervovat u stejného lékaře, dle jeho dostupnosti." },
    ],
    ES: [
      { question: "¿Cómo elijo al médico adecuado?", answer: "Explore los perfiles de los médicos por especialidad, idioma y horarios disponibles para encontrar la mejor opción para sus necesidades, o reserve directamente con el próximo médico disponible." },
      { question: "¿Cómo sé que un médico está debidamente cualificado?", answer: `Cada perfil muestra los datos de colegiación del médico. Todos los médicos de Global Health son ${c}.` },
      { question: "¿Puedo elegir médico por idioma?", answer: "Sí. Las consultas están disponibles en varios idiomas, según disponibilidad del médico, y puede filtrar o elegir médico por idioma al reservar." },
      { question: "¿Cómo reservo con un médico concreto?", answer: "Abra el perfil del médico y seleccione un horario disponible para reservar directamente con él." },
      { question: "¿Puedo ver al mismo médico para un seguimiento?", answer: "Sí. Puede reservar una cita de seguimiento con el mismo médico, según su disponibilidad." },
    ],
    RO: [
      { question: "Cum aleg medicul potrivit?", answer: "Răsfoiți profilurile medicilor după specialitate, limbă și ore disponibile pentru a găsi cea mai bună potrivire pentru nevoile dumneavoastră, sau rezervați direct cu următorul medic disponibil." },
      { question: "Cum știu că un medic este calificat corespunzător?", answer: `Fiecare profil afișează detaliile de înregistrare ale medicului. Toți medicii de pe Global Health sunt ${c}.` },
      { question: "Pot alege un medic în funcție de limbă?", answer: "Da. Consultațiile sunt disponibile în mai multe limbi, în funcție de disponibilitatea medicului, iar la rezervare puteți filtra sau alege medicul după limbă." },
      { question: "Cum rezerv o programare la un anumit medic?", answer: "Deschideți profilul medicului și selectați o oră disponibilă pentru a rezerva direct cu acesta." },
      { question: "Pot merge la același medic pentru o consultație de urmărire?", answer: "Da. Puteți rezerva o programare de urmărire cu același medic, în funcție de disponibilitatea acestuia." },
    ],
    PT: [
      { question: "Como escolho o médico certo?", answer: "Consulte os perfis dos médicos por especialidade, idioma e horários disponíveis para encontrar a melhor opção para as suas necessidades, ou marque diretamente com o próximo médico disponível." },
      { question: "Como sei que um médico está devidamente qualificado?", answer: `Cada perfil apresenta os dados de inscrição do médico. Todos os médicos da Global Health estão ${c}.` },
      { question: "Posso escolher um médico por idioma?", answer: "Sim. As consultas estão disponíveis em vários idiomas, consoante a disponibilidade do médico, e pode filtrar ou escolher o médico por idioma ao marcar." },
      { question: "Como marco consulta com um médico específico?", answer: "Abra o perfil do médico e selecione um horário disponível para marcar diretamente com ele." },
      { question: "Posso ser atendido pelo mesmo médico numa consulta de seguimento?", answer: "Sim. Pode marcar uma consulta de seguimento com o mesmo médico, consoante a disponibilidade dele." },
    ],
    DE: [
      { question: "Wie wähle ich den richtigen Arzt aus?", answer: "Durchsuchen Sie die Arztprofile nach Fachgebiet, Sprache und verfügbaren Terminen, um die beste Wahl für Ihre Bedürfnisse zu finden, oder buchen Sie direkt beim nächsten verfügbaren Arzt." },
      { question: "Woher weiß ich, dass ein Arzt ordnungsgemäß qualifiziert ist?", answer: `Jedes Profil zeigt die Registrierungsdaten des Arztes. Alle Ärzte bei Global Health sind ${c}.` },
      { question: "Kann ich einen Arzt nach Sprache auswählen?", answer: "Ja. Konsultationen sind je nach Verfügbarkeit des Arztes in mehreren Sprachen verfügbar, und Sie können bei der Buchung nach Sprache filtern oder einen Arzt auswählen." },
      { question: "Wie buche ich bei einem bestimmten Arzt?", answer: "Öffnen Sie das Profil des Arztes und wählen Sie einen verfügbaren Termin, um direkt bei ihm zu buchen." },
      { question: "Kann ich für eine Nachsorge denselben Arzt sehen?", answer: "Ja. Sie können einen Nachsorgetermin bei demselben Arzt buchen, je nach dessen Verfügbarkeit." },
    ],
  };
  return byLocale[locale];
}

function disclaimerParagraphs(locale: LocaleCode, reg: string, emergency: string): string[] {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string[]> = {
    EN: [
      `All medical services provided through Global Health are delivered by doctors ${c}.`,
      "Our online doctors conduct remote clinical assessments and may provide treatment recommendations, referrals, or medical certificates only where clinically appropriate and at the treating doctor's professional discretion. Clinical decisions remain entirely at the doctor's discretion following assessment.",
      "Our doctors do not routinely prescribe controlled substances through online consultations.",
      `Online consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, please contact emergency services immediately by calling ${emergency} or attend your nearest emergency department.`,
    ],
    CS: [
      `Veškeré zdravotní služby poskytované prostřednictvím Global Health poskytují lékaři ${c}.`,
      "Naši online lékaři provádějí vzdálené klinické posouzení a mohou poskytnout doporučení k léčbě, doporučení k dalšímu vyšetření nebo lékařská potvrzení pouze tam, kde je to klinicky vhodné, a to výhradně na základě odborného uvážení ošetřujícího lékaře. Klinická rozhodnutí zůstávají zcela v pravomoci lékaře po provedeném posouzení.",
      "Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací.",
      `Online konzultace nejsou vhodné pro řešení zdravotních pohotovostních stavů. Pokud se nacházíte v život ohrožující situaci, neprodleně kontaktujte záchrannou službu na čísle ${emergency} nebo vyhledejte nejbližší pohotovost.`,
    ],
    ES: [
      `Todos los servicios médicos prestados a través de Global Health son proporcionados por médicos ${c}.`,
      "Nuestros médicos online realizan evaluaciones clínicas remotas y pueden proporcionar recomendaciones de tratamiento, derivaciones o certificados médicos únicamente cuando sea clínicamente apropiado, a criterio profesional del médico tratante. Las decisiones clínicas permanecen enteramente a criterio del médico tras la evaluación.",
      "Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online.",
      `Las consultas online no son adecuadas para emergencias médicas. Si tiene una emergencia médica, contacte inmediatamente con los servicios de emergencia llamando al ${emergency} o acuda a su servicio de urgencias más cercano.`,
    ],
    RO: [
      `Toate serviciile medicale oferite prin Global Health sunt furnizate de medici ${c}.`,
      "Medicii noștri online efectuează evaluări clinice la distanță și pot oferi recomandări de tratament, trimiteri sau certificate medicale doar atunci când este clinic adecvat, la discreția profesională a medicului curant. Deciziile clinice rămân în întregime la discreția medicului în urma evaluării.",
      "Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online.",
      `Consultațiile online nu sunt potrivite pentru urgențe medicale. Dacă vă confruntați cu o urgență medicală, contactați imediat serviciile de urgență la numărul ${emergency} sau mergeți la cea mai apropiată unitate de primiri urgențe.`,
    ],
    PT: [
      `Todos os serviços médicos prestados através da Global Health são prestados por médicos ${c}.`,
      "Os nossos médicos online realizam avaliações clínicas remotas e podem fornecer recomendações de tratamento, referenciações ou atestados médicos apenas quando clinicamente apropriado, ao critério profissional do médico assistente. As decisões clínicas permanecem inteiramente ao critério do médico após a avaliação.",
      "Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.",
      `As consultas online não são adequadas para emergências médicas. Em caso de emergência médica, contacte imediatamente os serviços de emergência através do número ${emergency} ou dirija-se ao serviço de urgência mais próximo.`,
    ],
    DE: [
      `Alle über Global Health angebotenen medizinischen Leistungen werden von Ärzten erbracht, die ${c} sind.`,
      "Unsere Online-Ärzte führen aus der Ferne klinische Beurteilungen durch und können Behandlungsempfehlungen, Überweisungen oder ärztliche Atteste nur ausstellen, wenn dies klinisch angemessen ist und nach professionellem Ermessen des behandelnden Arztes. Klinische Entscheidungen liegen nach der Beurteilung ausschließlich im Ermessen des Arztes.",
      "Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen.",
      `Online-Konsultationen eignen sich nicht für medizinische Notfälle. Wenn Sie einen medizinischen Notfall haben, kontaktieren Sie bitte umgehend den Rettungsdienst unter ${emergency} oder suchen Sie die nächstgelegene Notaufnahme auf.`,
    ],
  };
  return byLocale[locale];
}

function disclaimerShort(locale: LocaleCode, reg: string, emergency: string): string {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string> = {
    EN: `All medical services at Global Health are provided by doctors ${c}. Treatment recommendations, referrals and medical certificates may be issued only when clinically appropriate and at the doctor's discretion. Our doctors do not routinely prescribe controlled substances through online consultations. In a medical emergency call ${emergency}.`,
    CS: `Veškeré zdravotní služby na Global Health poskytují lékaři ${c}. Doporučení k léčbě, další vyšetření a lékařská potvrzení mohou být vydána pouze tam, kde je to klinicky vhodné a na základě uvážení lékaře. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací. V případě zdravotní pohotovosti volejte ${emergency}.`,
    ES: `Todos los servicios médicos en Global Health son proporcionados por médicos ${c}. Las recomendaciones de tratamiento, derivaciones y certificados médicos solo se emiten cuando es clínicamente apropiado y a criterio del médico. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online. En caso de emergencia médica llame al ${emergency}.`,
    RO: `Toate serviciile medicale la Global Health sunt furnizate de medici ${c}. Recomandările de tratament, trimiterile și certificatele medicale sunt emise doar atunci când este clinic adecvat și la discreția medicului. Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online. În caz de urgență medicală sunați la ${emergency}.`,
    PT: `Todos os serviços médicos na Global Health são prestados por médicos ${c}. Recomendações de tratamento, referenciações e atestados médicos só são emitidos quando clinicamente apropriado e ao critério do médico. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online. Em caso de emergência médica ligue ${emergency}.`,
    DE: `Alle medizinischen Leistungen bei Global Health werden von Ärzten erbracht, die ${c} sind. Behandlungsempfehlungen, Überweisungen und ärztliche Atteste werden nur ausgestellt, wenn dies klinisch angemessen ist und nach Ermessen des Arztes. Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen. Rufen Sie im medizinischen Notfall ${emergency} an.`,
  };
  return byLocale[locale];
}

function intro(locale: LocaleCode, reg: string): string {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string> = {
    EN: `Our doctor network brings together clinicians ${c} across general practice and a wide range of specialties. Browse profiles by specialty, language and availability to find the right doctor for your consultation.`,
    CS: `Naše síť lékařů sdružuje lékaře ${c} v oboru praktického lékařství i v široké škále specializací. Procházejte profily podle specializace, jazyka a dostupnosti a najděte vhodného lékaře pro svou konzultaci.`,
    ES: `Nuestra red de médicos reúne a profesionales ${c} en medicina general y en una amplia variedad de especialidades. Explore los perfiles por especialidad, idioma y disponibilidad para encontrar el médico adecuado para su consulta.`,
    RO: `Rețeaua noastră de medici reunește clinicieni ${c} în medicina de familie și într-o gamă largă de specialități. Răsfoiți profilurile după specialitate, limbă și disponibilitate pentru a găsi medicul potrivit pentru consultația dumneavoastră.`,
    PT: `A nossa rede de médicos reúne clínicos ${c} em medicina geral e numa vasta gama de especialidades. Consulte os perfis por especialidade, idioma e disponibilidade para encontrar o médico certo para a sua consulta.`,
    DE: `Unser Ärztenetzwerk vereint Kliniker, die ${c} sind, aus der Allgemeinmedizin und einer breiten Palette von Fachgebieten. Durchsuchen Sie die Profile nach Fachgebiet, Sprache und Verfügbarkeit, um den richtigen Arzt für Ihre Konsultation zu finden.`,
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

type UpsertResult = { countryId: string; willCreatePageContent: boolean; status: PublishStatus; locales: string[] };

async function upsertMarket(market: MarketConfig): Promise<UpsertResult> {
  const country = await prisma.country.findUnique({ where: { code: market.countryCode }, select: { id: true } });
  if (!country) throw new Error(`Country not found: ${market.countryCode}`);

  const isIe = market.countryCode === "ie";

  const existing = await prisma.pageContent.findUnique({
    where: { countryId_pageKey: { countryId: country.id, pageKey: PAGE_KEY } },
    include: { translations: true },
  });

  // Status: never change an existing row's status — DOCTORS_INDEX rows
  // already exist PUBLISHED for every market. Defensive fallback mirrors
  // the specialist seed: PUBLISHED for ie, DRAFT for others.
  const status = existing ? existing.status : isIe ? PublishStatus.PUBLISHED : PublishStatus.DRAFT;

  const countryLocales = await prisma.countryLocale.findMany({ where: { countryId: country.id }, select: { locale: true } });
  const countryRow = await prisma.country.findUnique({ where: { id: country.id }, select: { defaultLocale: true } });
  const localeSet = new Set<LocaleCode>(countryLocales.map((cl) => cl.locale));
  if (countryRow?.defaultLocale) localeSet.add(countryRow.defaultLocale);
  if (localeSet.size === 0) localeSet.add(LocaleCode.EN);

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
      showIntro: true,
      showWhoFor: true,
      showWhyChoose: true,
      showFaq: true,
      showDisclaimer: true,
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
      console.log("[seed-doctors-page-content] NOTE: PageContent tables not found — cannot introspect. Aborting dry run.");
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
