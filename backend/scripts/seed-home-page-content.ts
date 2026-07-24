/**
 * HOME page-content seed — brings the country home hub to admin-controlled
 * parity with GENERAL_CONSULTATION / SPECIALIST_CONSULTATION (see
 * seed-page-content.ts, seed-specialist-page-content.ts — the latter is the
 * canonical pattern this file copies: `pick`/`pickArr` fill logic, IE-wins
 * vs fill-for-others, per-locale CountryLocale query, console.table,
 * dry-run/--apply).
 *
 * HOME rows already exist (PUBLISHED) — created by the structured
 * page-content CMS. This script only ADDS the five structured fields
 * (intro, whoFor.., whyChoose.., faq, disclaimer..) and flips the five
 * show.. toggles on; it never touches status, never touches showBody, and
 * never clobbers a field an admin already edited.
 *
 * Content is authored fresh for HOME (NOT copied from the GP seed) — general
 * welcome/positioning copy for the country clinic covering the full breadth
 * of services (GP + specialist + tests), not GP-specific.
 *
 *   npx tsx scripts/seed-home-page-content.ts          # dry run
 *   npx tsx scripts/seed-home-page-content.ts --apply  # write
 */
import "dotenv/config";
import { LocaleCode, PublishStatus, ServiceVisibility } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const PAGE_KEY = "HOME";

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
  countryName: Record<LocaleCode, string>;
};

// ── regulator/emergency map — EXACT strings from seed-page-content.ts /
// seed-specialist-page-content.ts ──
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
    regulator: "CRM (Conselho Regional de Medicina)",
    emergency: "SAMU 192",
    countryName: { EN: "Brazil", PT: "Brasil", ES: "Brasil", CS: "Brazílii", RO: "Brazilia", DE: "Brasilien" },
  },
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
  EN: "Who we help",
  CS: "Komu pomáháme",
  ES: "A quién ayudamos",
  RO: "Pe cine ajutăm",
  PT: "A quem ajudamos",
  DE: "Wem wir helfen",
};

const WHO_FOR_INTRO: Record<LocaleCode, string> = {
  EN: "Global Health supports patients with a broad range of everyday and ongoing health needs, including:",
  CS: "Global Health podporuje pacienty s širokou škálou běžných i dlouhodobých zdravotních potřeb, včetně:",
  ES: "Global Health atiende a pacientes con una amplia variedad de necesidades de salud cotidianas y continuadas, entre ellas:",
  RO: "Global Health sprijină pacienții cu o gamă largă de nevoi de sănătate curente și continue, printre care:",
  PT: "A Global Health apoia doentes com uma ampla gama de necessidades de saúde do dia a dia e contínuas, incluindo:",
  DE: "Global Health unterstützt Patienten bei einer Vielzahl alltäglicher und fortlaufender Gesundheitsbedürfnisse, darunter:",
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
    "Everyday illnesses such as infections, fevers and minor injuries",
    "Ongoing management of chronic conditions such as diabetes, hypertension and asthma",
    "Specialist review across cardiology, dermatology, endocrinology, gastroenterology, neurology, gynaecology and more",
    "Medical certificates and sick notes when clinically appropriate",
    "Referrals for blood tests, imaging or specialist review where clinically indicated",
    "Health screening and monitoring through guided health tests",
    "Follow-up care and second opinions on an existing diagnosis or treatment plan",
    "Family healthcare across multiple languages, for both adults and children",
  ],
  CS: [
    "Běžná onemocnění, jako jsou infekce, horečky a drobná zranění",
    "Průběžnou péči o chronická onemocnění, jako je diabetes, hypertenze a astma",
    "Specializované posouzení v oborech kardiologie, dermatologie, endokrinologie, gastroenterologie, neurologie, gynekologie a dalších",
    "Lékařská potvrzení a neschopenky, je-li to klinicky vhodné",
    "Doporučení ke krevním testům, zobrazovacím vyšetřením nebo specialistovi, je-li to klinicky indikováno",
    "Zdravotní screening a monitorování prostřednictvím řízených zdravotních testů",
    "Následnou péči a druhý názor na stávající diagnózu nebo léčebný plán",
    "Zdravotní péči pro celou rodinu ve více jazycích, pro dospělé i děti",
  ],
  ES: [
    "Enfermedades cotidianas como infecciones, fiebre y lesiones leves",
    "Manejo continuado de afecciones crónicas como diabetes, hipertensión y asma",
    "Valoración especializada en cardiología, dermatología, endocrinología, gastroenterología, neurología, ginecología y más",
    "Certificados médicos y bajas laborales cuando sea clínicamente apropiado",
    "Derivaciones para análisis de sangre, pruebas de imagen o valoración especializada cuando esté clínicamente indicado",
    "Cribado y seguimiento de salud mediante pruebas de salud guiadas",
    "Seguimiento y segundas opiniones sobre un diagnóstico o plan de tratamiento existente",
    "Atención sanitaria familiar en varios idiomas, para adultos y niños",
  ],
  RO: [
    "Afecțiuni curente precum infecții, febră și accidentări minore",
    "Gestionarea continuă a afecțiunilor cronice precum diabetul, hipertensiunea și astmul",
    "Evaluare de specialitate în cardiologie, dermatologie, endocrinologie, gastroenterologie, neurologie, ginecologie și altele",
    "Certificate medicale și concedii medicale atunci când este clinic adecvat",
    "Trimiteri pentru analize de sânge, imagistică sau evaluare de specialitate atunci când este indicat clinic",
    "Screening și monitorizare a sănătății prin teste de sănătate ghidate",
    "Îngrijire de urmărire și a doua opinie privind un diagnostic sau plan de tratament existent",
    "Îngrijire medicală pentru familie în mai multe limbi, pentru adulți și copii",
  ],
  PT: [
    "Doenças do dia a dia como infeções, febre e pequenas lesões",
    "Gestão contínua de condições crónicas como diabetes, hipertensão e asma",
    "Avaliação especializada em cardiologia, dermatologia, endocrinologia, gastroenterologia, neurologia, ginecologia e mais",
    "Atestados médicos e baixas quando clinicamente apropriado",
    "Referenciações para análises ao sangue, exames de imagem ou avaliação especializada quando clinicamente indicado",
    "Rastreio e monitorização da saúde através de testes de saúde orientados",
    "Cuidados de seguimento e segunda opinião sobre um diagnóstico ou plano de tratamento existente",
    "Cuidados de saúde para a família em vários idiomas, para adultos e crianças",
  ],
  DE: [
    "Alltägliche Erkrankungen wie Infektionen, Fieber und leichte Verletzungen",
    "Fortlaufende Betreuung chronischer Erkrankungen wie Diabetes, Bluthochdruck und Asthma",
    "Fachärztliche Beurteilung in Kardiologie, Dermatologie, Endokrinologie, Gastroenterologie, Neurologie, Gynäkologie und weiteren Bereichen",
    "Ärztliche Atteste und Krankschreibungen, sofern klinisch angemessen",
    "Überweisungen für Bluttests, Bildgebung oder fachärztliche Beurteilung, sofern klinisch angezeigt",
    "Gesundheits-Screening und -Überwachung durch begleitete Gesundheitstests",
    "Nachsorge und Zweitmeinungen zu einer bestehenden Diagnose oder einem Behandlungsplan",
    "Familiengesundheitsversorgung in mehreren Sprachen, für Erwachsene und Kinder",
  ],
};

function whyChooseItems(locale: LocaleCode, reg: string): string[] {
  const c = CONNECTOR[locale](reg);
  switch (locale) {
    case "EN":
      return [
        `Doctors ${c}`,
        "Secure video consultations conducted to national telemedicine standards",
        "Open appointment slots shown during booking, subject to clinician availability",
        "Consultations available in multiple languages, subject to clinician availability",
        "Clinical documentation and follow-up guidance provided by email after every consultation",
        "Transparent pricing — no hidden fees, no membership required",
      ];
    case "CS":
      return [
        `Lékaři ${c}`,
        "Zabezpečené video konzultace v souladu s národními standardy telemedicíny",
        "Otevřené termíny zobrazené při rezervaci, dle dostupnosti lékaře",
        "Konzultace dostupné ve více jazycích podle dostupnosti lékaře",
        "Lékařská dokumentace a doporučení k dalšímu postupu zaslané e-mailem po každé konzultaci",
        "Transparentní ceny — žádné skryté poplatky, žádné povinné členství",
      ];
    case "ES":
      return [
        `Médicos ${c}`,
        "Videoconsultas seguras conforme a los estándares nacionales de telemedicina",
        "Horarios disponibles mostrados durante la reserva, según disponibilidad del médico",
        "Consultas disponibles en varios idiomas, según disponibilidad del médico",
        "Documentación clínica y orientación de seguimiento enviada por correo electrónico tras cada consulta",
        "Precios transparentes — sin costes ocultos, sin suscripción obligatoria",
      ];
    case "RO":
      return [
        `Medici ${c}`,
        "Consultații video securizate, conforme standardelor naționale de telemedicină",
        "Ore disponibile afișate în timpul rezervării, în funcție de disponibilitatea medicului",
        "Consultații disponibile în mai multe limbi, în funcție de disponibilitatea medicului",
        "Documentație clinică și recomandări de urmărire trimise prin email după fiecare consultație",
        "Prețuri transparente — fără costuri ascunse, fără abonament obligatoriu",
      ];
    case "PT":
      return [
        `Médicos ${c}`,
        "Consultas por vídeo seguras, realizadas de acordo com as normas nacionais de telemedicina",
        "Horários disponíveis apresentados durante a marcação, consoante a disponibilidade do médico",
        "Consultas disponíveis em vários idiomas, consoante a disponibilidade do médico",
        "Documentação clínica e orientação de seguimento enviadas por email após cada consulta",
        "Preços transparentes — sem custos ocultos, sem subscrição obrigatória",
      ];
    case "DE":
      return [
        `Ärzte, ${c}`,
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
  const byLocale: Record<LocaleCode, FaqItem[]> = {
    EN: [
      { question: "How does an online consultation work?", answer: "Book an appointment online, choose a time that suits you, and join your consultation by secure video from your phone, tablet, or computer — no app download required. At the start of the call, your doctor will ask about your symptoms, medical history, and any medication you are currently taking, then carry out a clinical assessment based on what you describe and show if needed, such as a rash or injury, over video. Based on that assessment, your doctor may offer advice on managing your condition, request follow-up tests, refer you to a specialist, or issue a prescription or medical certificate — always at their professional discretion and only when clinically appropriate. After your consultation, you will receive a written summary by email covering what was discussed, any recommendations made, and clear next steps, so you have a record to keep or to share with another doctor if you ever need to." },
      { question: "Who are the doctors?", answer: `All doctors on Global Health are registered with the relevant national medical council for the country you are booking in — for example, the Irish Medical Council in Ireland — meaning they have met the required standards of qualification, training, and ongoing professional practice to treat patients there. Each doctor's registration details are shown directly on their profile, so you can verify their credentials before you book, rather than taking it on trust. Profiles also include information about a doctor's specialty, languages spoken, and areas of clinical focus, helping you choose the right doctor for your needs. Doctors on our platform work across general practice and a range of specialties, including cardiology, dermatology, endocrinology, gastroenterology, neurology, and gynaecology, among others. Every consultation is led entirely by the treating doctor's own clinical judgement — decisions about advice, referrals, prescriptions, or certificates are always made by the doctor, based on their assessment of you.` },
      { question: "Which languages are available?", answer: "Consultations at Global Health are available in six languages — English, Portuguese, Spanish, Czech, Romanian, and German — so you can speak with a doctor in the language you are most comfortable with, subject to clinician availability at the time you book. When you search for an appointment, you can filter the list of doctors by the language they speak, alongside factors like specialty and appointment time, so you only see doctors who match what you are looking for. Each doctor's profile also states clearly which languages they consult in, so you know before you book. This matters for more than convenience: being able to describe your symptoms and understand your doctor's advice in your own language helps ensure nothing is lost during a clinical conversation. If your preferred language is not available at a given time, you can choose another slot or check back later." },
      { question: "Is an online consultation secure?", answer: "Yes — every consultation at Global Health takes place over encrypted, secure video conducted to national telemedicine standards, so your conversation with your doctor stays private between the two of you. Consultations are not recorded, and your video call exists only for the duration of the appointment itself. Any clinical information you share — your symptoms, history, and the notes your doctor makes — is stored securely and handled in line with GDPR and applicable national data protection law, with access limited to the clinicians involved in your care. You have rights over your own data, including the right to request a copy of your medical records or ask how your information is used and stored. Our booking and payment systems follow the same security standards as other regulated healthcare providers. If you ever have concerns about privacy, our support team can explain exactly how your information is protected." },
      { question: "How do I book an appointment?", answer: "Choose the type of consultation you need — a GP appointment, a specialist review, or a guided health test — and you will see the next available time slots based on real doctor availability, including same-day appointments in many cases. Select a slot, enter your details, and complete payment securely online; no membership or subscription is required, and you only pay for the consultation you book. Once your booking is confirmed, you will receive a confirmation email straight away with your appointment time, the video link you will use to join, and simple instructions for what to do beforehand, such as having your ID or a list of current medications ready. You can access your appointment details at any time from your patient account, and you will receive a reminder ahead of your consultation, so nothing catches you off guard." },
      ...(priceLine ? [{ question: "How much does a consultation cost?", answer: `Consultations at Global Health cost ${priceLine}. There are no hidden fees and no membership required.` }] : []),
    ],
    CS: [
      { question: "Jak probíhá online konzultace?", answer: "Rezervujte si termín online, vyberte dostupný čas a připojte se ke konzultaci prostřednictvím zabezpečeného videa z telefonu nebo počítače. Lékař posoudí vaše příznaky a anamnézu a doporučí další postup." },
      { question: "Kdo jsou lékaři?", answer: `Všichni lékaři na Global Health jsou ${c}. Registrační údaje jsou uvedeny na profilu každého lékaře.` },
      { question: "Jaké jazyky jsou k dispozici?", answer: "Konzultace jsou dostupné ve více jazycích podle dostupnosti lékaře. Lékaře podle jazyka si můžete vybrat při rezervaci." },
      { question: "Je online konzultace bezpečná?", answer: "Ano. Všechny konzultace probíhají prostřednictvím zabezpečeného videa v souladu s národními standardy telemedicíny a vaše zdravotní údaje jsou zpracovávány důvěrně." },
      { question: "Jak si rezervuji termín?", answer: "Vyberte službu, zvolte dostupný časový termín a dokončete rezervaci online. Před termínem obdržíte potvrzení e-mailem." },
      ...(priceLine ? [{ question: "Kolik stojí konzultace?", answer: `Konzultace u Global Health stojí ${priceLine}. Žádné skryté poplatky, žádné povinné členství.` }] : []),
    ],
    ES: [
      { question: "¿Cómo funciona una consulta online?", answer: "Reserve una cita online, elija un horario disponible y únase a su consulta por videollamada segura desde su teléfono u ordenador. Su médico revisará sus síntomas e historial y le aconsejará los siguientes pasos." },
      { question: "¿Quiénes son los médicos?", answer: `Todos los médicos de Global Health son ${c}. Los datos de colegiación se muestran en el perfil de cada médico.` },
      { question: "¿Qué idiomas están disponibles?", answer: "Las consultas están disponibles en varios idiomas, según disponibilidad del médico. Puede elegir médico por idioma al reservar." },
      { question: "¿Es segura una consulta online?", answer: "Sí. Todas las consultas se realizan mediante videollamada segura conforme a los estándares nacionales de telemedicina, y su información clínica se trata de forma confidencial." },
      { question: "¿Cómo reservo una cita?", answer: "Elija un servicio, seleccione un horario disponible y complete su reserva online. Recibirá confirmación por correo electrónico antes de la cita." },
      ...(priceLine ? [{ question: "¿Cuánto cuesta una consulta?", answer: `Las consultas en Global Health cuestan ${priceLine}. Sin costes ocultos ni suscripción obligatoria.` }] : []),
    ],
    RO: [
      { question: "Cum funcționează o consultație online?", answer: "Rezervați o programare online, alegeți o oră disponibilă și alăturați-vă consultației prin video securizat de pe telefon sau computer. Medicul va evalua simptomele și istoricul dumneavoastră și va recomanda pașii următori." },
      { question: "Cine sunt medicii?", answer: `Toți medicii de pe Global Health sunt ${c}. Detaliile de înregistrare sunt afișate pe profilul fiecărui medic.` },
      { question: "Ce limbi sunt disponibile?", answer: "Consultațiile sunt disponibile în mai multe limbi, în funcție de disponibilitatea medicului. Puteți alege medicul în funcție de limbă la rezervare." },
      { question: "Este sigură o consultație online?", answer: "Da. Toate consultațiile se desfășoară prin video securizat, conform standardelor naționale de telemedicină, iar informațiile dumneavoastră clinice sunt tratate confidențial." },
      { question: "Cum rezerv o programare?", answer: "Alegeți un serviciu, selectați o oră disponibilă și finalizați rezervarea online. Veți primi o confirmare prin email înainte de programare." },
      ...(priceLine ? [{ question: "Cât costă o consultație?", answer: `Consultațiile la Global Health costă ${priceLine}. Fără costuri ascunse, fără abonament obligatoriu.` }] : []),
    ],
    PT: [
      { question: "Como funciona uma consulta online?", answer: "Marque uma consulta online, escolha um horário disponível e junte-se à sua consulta por vídeo seguro a partir do telemóvel ou computador. O seu médico irá rever os seus sintomas e historial e aconselhar os próximos passos." },
      { question: "Quem são os médicos?", answer: `Todos os médicos da Global Health estão ${c}. Os dados de inscrição são apresentados no perfil de cada médico.` },
      { question: "Que idiomas estão disponíveis?", answer: "As consultas estão disponíveis em vários idiomas, consoante a disponibilidade do médico. Pode escolher o médico por idioma ao marcar." },
      { question: "Uma consulta online é segura?", answer: "Sim. Todas as consultas são realizadas por vídeo seguro de acordo com as normas nacionais de telemedicina, e as suas informações clínicas são tratadas de forma confidencial." },
      { question: "Como marco uma consulta?", answer: "Escolha um serviço, selecione um horário disponível e conclua a marcação online. Receberá uma confirmação por email antes da consulta." },
      ...(priceLine ? [{ question: "Quanto custa uma consulta?", answer: `As consultas na Global Health custam ${priceLine}. Sem custos ocultos, sem subscrição obrigatória.` }] : []),
    ],
    DE: [
      { question: "Wie läuft eine Online-Konsultation ab?", answer: "Buchen Sie online einen Termin, wählen Sie eine verfügbare Zeit und nehmen Sie per sicherem Video von Ihrem Telefon oder Computer aus an Ihrer Konsultation teil. Ihr Arzt prüft Ihre Symptome und Vorgeschichte und berät Sie zu den nächsten Schritten." },
      { question: "Wer sind die Ärzte?", answer: `Alle Ärzte bei Global Health sind ${c}. Die Registrierungsdaten werden auf jedem Arztprofil angezeigt.` },
      { question: "Welche Sprachen sind verfügbar?", answer: "Konsultationen sind je nach Verfügbarkeit des Arztes in mehreren Sprachen verfügbar. Sie können bei der Buchung einen Arzt nach Sprache auswählen." },
      { question: "Ist eine Online-Konsultation sicher?", answer: "Ja. Alle Konsultationen finden per sicherem Video nach nationalen Telemedizin-Standards statt, und Ihre klinischen Daten werden vertraulich behandelt." },
      { question: "Wie buche ich einen Termin?", answer: "Wählen Sie einen Service, wählen Sie eine verfügbare Zeit und schließen Sie Ihre Buchung online ab. Sie erhalten vor Ihrem Termin eine Bestätigung per E-Mail." },
      ...(priceLine ? [{ question: "Was kostet eine Konsultation?", answer: `Konsultationen bei Global Health kosten ${priceLine}. Keine versteckten Gebühren, keine Mitgliedschaft erforderlich.` }] : []),
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

function intro(locale: LocaleCode, reg: string, accent: string): string {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string> = {
    EN: `Welcome to Global Health in ${accent} — online medical care from doctors ${c}. Book a consultation with a GP or specialist, access guided health tests, and manage your care securely online, in the language you're most comfortable with.`,
    CS: `Vítejte u Global Health v ${accent} — online lékařská péče od lékařů ${c}. Rezervujte si konzultaci s praktickým lékařem nebo specialistou, využijte řízené zdravotní testy a spravujte svou péči bezpečně online, v jazyce, který vám vyhovuje.`,
    ES: `Bienvenido a Global Health en ${accent} — atención médica online de médicos ${c}. Reserve una consulta con un médico de familia o especialista, acceda a pruebas de salud guiadas y gestione su atención de forma segura online, en el idioma con el que se sienta más cómodo.`,
    RO: `Bine ați venit la Global Health în ${accent} — asistență medicală online din partea unor medici ${c}. Programați o consultație cu un medic de familie sau un specialist, accesați teste de sănătate ghidate și gestionați-vă îngrijirea în siguranță online, în limba cu care vă simțiți cel mai confortabil.`,
    PT: `Bem-vindo à Global Health em ${accent} — cuidados médicos online prestados por médicos ${c}. Marque uma consulta com um médico de clínica geral ou especialista, aceda a testes de saúde orientados e gira os seus cuidados de forma segura online, no idioma com que se sente mais confortável.`,
    DE: `Willkommen bei Global Health in ${accent} — medizinische Online-Versorgung durch Ärzte, die ${c} sind. Buchen Sie eine Konsultation mit einem Hausarzt oder Facharzt, nutzen Sie begleitete Gesundheitstests und verwalten Sie Ihre Versorgung sicher online, in der Sprache, die Ihnen am angenehmsten ist.`,
  };
  return byLocale[locale];
}

async function cheapestPublicPriceLine(countryCode: string, locale: LocaleCode): Promise<string | null> {
  try {
    const country = await prisma.country.findUnique({ where: { code: countryCode }, select: { id: true } });
    if (!country) return null;
    const service = await prisma.service.findFirst({
      where: {
        countryId: country.id,
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
  const priceFormatted = await cheapestPublicPriceLine(market.countryCode, locale);
  const priceLine = priceFormatted ? fromLine(priceFormatted, locale) : null;
  const accent = market.countryName[locale];

  return {
    locale,
    intro: intro(locale, market.regulator, accent),
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

  // Status: never change an existing row's status — HOME rows already exist
  // PUBLISHED for every market. Defensive fallback for a missing row
  // mirrors the specialist seed: PUBLISHED for ie, DRAFT for others.
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
    // Arrays: treat an existing EMPTY array the same as null (fill it) —
    // only a non-empty existing array (a real admin edit) is preserved.
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
      console.log("[seed-home-page-content] NOTE: PageContent tables not found — cannot introspect. Aborting dry run.");
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
