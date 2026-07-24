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
      { question: "Jak probíhá online konzultace?", answer: "Rezervujte si termín online, vyberte čas, který vám vyhovuje, a připojte se ke konzultaci prostřednictvím zabezpečeného videa z telefonu, tabletu nebo počítače — bez nutnosti stahovat aplikaci. Na začátku hovoru se vás lékař zeptá na vaše příznaky, zdravotní anamnézu a užívané léky a poté provede klinické posouzení na základě toho, co popíšete, případně ukážete přes video, například vyrážku nebo zranění. Na základě tohoto posouzení vám lékař může doporučit další postup léčby, vyžádat si kontrolní vyšetření, doporučit vás specialistovi nebo vystavit recept či lékařské potvrzení — vždy podle svého odborného uvážení a pouze tam, kde je to klinicky vhodné. Celý rozhovor probíhá stejně důkladně jako běžná osobní návštěva ordinace, jen z pohodlí domova. Po konzultaci obdržíte e-mailem písemné shrnutí toho, co bylo probráno, jaká doporučení byla učiněna a jaké jsou další kroky, abyste měli záznam, který si můžete uchovat nebo předat jinému lékaři, pokud to budete potřebovat." },
      { question: "Kdo jsou lékaři?", answer: `Všichni lékaři na Global Health jsou registrováni u příslušné národní lékařské komory pro danou zemi — například u Irské lékařské komory v Irsku — což znamená, že splnili požadované standardy kvalifikace, odborné přípravy a průběžné odborné praxe potřebné k léčbě pacientů v dané zemi. Registrační údaje každého lékaře jsou uvedeny přímo na jeho profilu, takže si jeho kvalifikaci můžete ověřit ještě před rezervací, místo abyste to museli brát jen na důvěru. Profily rovněž obsahují informace o specializaci lékaře, jazycích, kterými mluví, a oblastech klinického zaměření, což vám pomůže vybrat toho správného lékaře pro vaše potřeby. Lékaři na naší platformě působí v oblasti praktického lékařství i v řadě specializací, včetně kardiologie, dermatologie, endokrinologie, gastroenterologie, neurologie a gynekologie. Každou konzultaci vede zcela klinický úsudek ošetřujícího lékaře — rozhodnutí o doporučeních, odesláních, receptech nebo potvrzeních vždy činí lékař na základě svého posouzení.` },
      { question: "Jaké jazyky jsou k dispozici?", answer: "Konzultace u Global Health jsou dostupné v šesti jazycích — angličtině, portugalštině, španělštině, češtině, rumunštině a němčině — takže si můžete s lékařem promluvit v jazyce, ve kterém se cítíte nejlépe, podle dostupnosti lékaře v době rezervace. Při vyhledávání termínu můžete filtrovat seznam lékařů podle jazyka, kterým mluví, spolu s dalšími kritérii, jako je specializace a čas schůzky, takže vidíte pouze lékaře, kteří odpovídají tomu, co hledáte. Na profilu každého lékaře je také jasně uvedeno, v jakých jazycích konzultuje, takže to víte ještě před rezervací a nemusíte se ptát předem. Nejde jen o pohodlí: schopnost popsat své příznaky a porozumět doporučením lékaře ve vlastním jazyce pomáhá zajistit, že se při klinickém rozhovoru nic neztratí a že rozumíte každému doporučení. Pokud váš preferovaný jazyk není v danou chvíli dostupný, můžete zvolit jiný termín nebo to zkusit později." },
      { question: "Je online konzultace bezpečná?", answer: "Ano — každá konzultace u Global Health probíhá prostřednictvím šifrovaného, zabezpečeného videa v souladu s národními standardy telemedicíny, takže váš rozhovor s lékařem zůstává soukromý mezi vámi dvěma. Konzultace se nenahrávají a váš videohovor existuje pouze po dobu samotné schůzky. Veškeré klinické informace, které sdílíte — vaše příznaky, anamnéza a poznámky lékaře — jsou bezpečně uloženy a zpracovávány v souladu s GDPR a příslušnými národními předpisy o ochraně osobních údajů, přičemž přístup k nim mají pouze lékaři podílející se na vaší péči. Máte práva ke svým vlastním údajům, včetně práva požádat o kopii své zdravotní dokumentace nebo se zeptat, jak jsou vaše údaje používány a uchovávány. Náš rezervační a platební systém dodržuje stejné bezpečnostní standardy jako jiní regulovaní poskytovatelé zdravotní péče. Máte-li obavy ohledně soukromí, náš tým podpory vám přesně vysvětlí, jak jsou vaše údaje chráněny." },
      { question: "Jak si rezervuji termín?", answer: "Vyberte typ konzultace, kterou potřebujete — návštěvu praktického lékaře, posouzení specialistou nebo řízený zdravotní test — a zobrazí se vám nejbližší dostupné termíny na základě skutečné dostupnosti lékařů, včetně termínů ještě týž den v mnoha případech. Vyberte termín, zadejte své údaje a dokončete platbu bezpečně online; není vyžadováno žádné členství ani předplatné a platíte pouze za rezervovanou konzultaci. Jakmile je rezervace potvrzena, obdržíte ihned potvrzovací e-mail s časem schůzky, odkazem na video, přes které se připojíte, a jednoduchými pokyny, co udělat předem, například připravit si doklad totožnosti nebo seznam aktuálně užívaných léků. Celý proces rezervace zabere jen několik minut a nevyžaduje žádný telefonát ani čekání na zavolání zpět od recepce. Podrobnosti o schůzce máte kdykoli k dispozici ve svém pacientském účtu a před konzultací obdržíte připomenutí, takže vás nic nezaskočí. Před schůzkou si můžete termín kdykoli zkontrolovat nebo v případě potřeby přeplánovat." },
      ...(priceLine ? [{ question: "Kolik stojí konzultace?", answer: `Konzultace u Global Health stojí ${priceLine}. Žádné skryté poplatky, žádné povinné členství.` }] : []),
    ],
    ES: [
      { question: "¿Cómo funciona una consulta online?", answer: "Reserve una cita online, elija un horario que le convenga y únase a su consulta por videollamada segura desde su teléfono, tableta u ordenador — sin necesidad de descargar ninguna aplicación. Al inicio de la llamada, su médico le preguntará por sus síntomas, su historial médico y cualquier medicación que esté tomando, y a continuación realizará una valoración clínica basada en lo que usted describa y, si es necesario, muestre por video, como un sarpullido o una lesión. En función de esa valoración, su médico puede ofrecerle consejos para gestionar su afección, solicitar pruebas de seguimiento, derivarle a un especialista o emitir una receta o un certificado médico — siempre a su criterio profesional y solo cuando sea clínicamente apropiado. Tras la consulta, recibirá por correo electrónico un resumen escrito de lo tratado, las recomendaciones realizadas y los siguientes pasos, para que conserve un registro que pueda guardar o compartir con otro médico si lo necesita." },
      { question: "¿Quiénes son los médicos?", answer: `Todos los médicos de Global Health están colegiados en el colegio médico nacional correspondiente al país en el que reserve — por ejemplo, el Irish Medical Council en Irlanda — lo que significa que han cumplido los requisitos de cualificación, formación y práctica profesional continuada necesarios para atender a pacientes en ese país. Los datos de colegiación de cada médico se muestran directamente en su perfil, para que pueda comprobar sus credenciales antes de reservar, en lugar de darlo por hecho. Los perfiles también incluyen información sobre la especialidad del médico, los idiomas que habla y sus áreas de enfoque clínico, lo que le ayuda a elegir al médico adecuado para sus necesidades. Los médicos de nuestra plataforma ejercen tanto en medicina de familia como en diversas especialidades, incluidas cardiología, dermatología, endocrinología, gastroenterología, neurología y ginecología, entre otras. Cada consulta se rige enteramente por el criterio clínico del médico tratante — las decisiones sobre recomendaciones, derivaciones, recetas o certificados las toma siempre el médico.` },
      { question: "¿Qué idiomas están disponibles?", answer: "Las consultas de Global Health están disponibles en seis idiomas — inglés, portugués, español, checo, rumano y alemán — para que pueda hablar con un médico en el idioma con el que se sienta más cómodo, según la disponibilidad del médico en el momento de la reserva. Al buscar una cita, puede filtrar la lista de médicos por el idioma que hablan, junto con otros criterios como la especialidad y el horario, de modo que solo vea a los médicos que se ajustan a lo que busca. El perfil de cada médico también indica claramente en qué idiomas atiende, para que lo sepa antes de reservar. Esto es más que una cuestión de comodidad: poder describir sus síntomas y comprender las indicaciones de su médico en su propio idioma ayuda a que nada se pierda durante la conversación clínica. Si su idioma preferido no está disponible en un momento dado, puede elegir otro horario o volver a intentarlo más tarde." },
      { question: "¿Es segura una consulta online?", answer: "Sí — todas las consultas en Global Health se realizan mediante videollamada cifrada y segura, conforme a los estándares nacionales de telemedicina, por lo que su conversación con el médico permanece privada entre ambos. Las consultas no se graban, y su videollamada existe únicamente mientras dura la cita en sí. Toda la información clínica que comparta — sus síntomas, su historial y las notas de su médico — se almacena de forma segura y se gestiona conforme al RGPD y a la normativa nacional aplicable de protección de datos, con acceso limitado a los profesionales implicados en su atención. Usted tiene derechos sobre sus propios datos, incluido el derecho a solicitar una copia de su historial médico o a preguntar cómo se usa y almacena su información. Nuestros sistemas de reserva y pago siguen los mismos estándares de seguridad que otros proveedores sanitarios regulados. Si tiene alguna duda sobre privacidad, nuestro equipo de soporte puede explicarle exactamente cómo se protege su información." },
      { question: "¿Cómo reservo una cita?", answer: "Elija el tipo de consulta que necesita — una cita de médico de familia, una valoración especializada o una prueba de salud guiada — y verá los próximos horarios disponibles según la disponibilidad real de los médicos, incluidas citas el mismo día en muchos casos. Seleccione un horario, introduzca sus datos y complete el pago de forma segura online; no se requiere ninguna suscripción ni membresía, y solo paga por la consulta que reserve. Una vez confirmada la reserva, recibirá de inmediato un correo de confirmación con la hora de la cita, el enlace de video que usará para unirse y sencillas instrucciones sobre qué hacer previamente, como tener a mano su documento de identidad o una lista de la medicación que toma actualmente. Puede consultar los detalles de su cita en cualquier momento desde su cuenta de paciente, y recibirá un recordatorio antes de la consulta." },
      ...(priceLine ? [{ question: "¿Cuánto cuesta una consulta?", answer: `Las consultas en Global Health cuestan ${priceLine}. Sin costes ocultos ni suscripción obligatoria.` }] : []),
    ],
    RO: [
      { question: "Cum funcționează o consultație online?", answer: "Rezervați o programare online, alegeți o oră care vi se potrivește și alăturați-vă consultației prin video securizat de pe telefon, tabletă sau computer — fără a fi nevoie să descărcați o aplicație. La începutul apelului, medicul vă va întreba despre simptome, istoricul medical și medicația pe care o luați în prezent, apoi va efectua o evaluare clinică pe baza a ceea ce descrieți și, dacă este necesar, arătați prin video, cum ar fi o erupție cutanată sau o accidentare. Pe baza acestei evaluări, medicul poate oferi recomandări pentru gestionarea afecțiunii, poate solicita teste suplimentare, vă poate trimite către un specialist sau poate elibera o rețetă ori un certificat medical — întotdeauna la discreția sa profesională și doar atunci când este clinic adecvat. După consultație, veți primi prin email un rezumat scris al celor discutate, recomandările făcute și pașii următori, astfel încât să aveți o evidență pe care o puteți păstra sau o puteți transmite altui medic dacă este nevoie." },
      { question: "Cine sunt medicii?", answer: `Toți medicii de pe Global Health sunt înregistrați la colegiul medicilor național relevant pentru țara în care faceți programarea — de exemplu, Irish Medical Council în Irlanda — ceea ce înseamnă că au îndeplinit standardele necesare de calificare, formare și practică profesională continuă pentru a trata pacienți în acea țară. Detaliile de înregistrare ale fiecărui medic sunt afișate direct pe profilul acestuia, astfel încât puteți verifica acreditările înainte de a rezerva, în loc să le luați pe încredere. Profilurile includ, de asemenea, informații despre specialitatea medicului, limbile vorbite și domeniile de interes clinic, ajutându-vă să alegeți medicul potrivit nevoilor dumneavoastră. Medicii de pe platforma noastră activează atât în medicina de familie, cât și într-o gamă de specialități, inclusiv cardiologie, dermatologie, endocrinologie, gastroenterologie, neurologie și ginecologie, printre altele. Fiecare consultație este condusă în întregime de raționamentul clinic al medicului curant — deciziile privind recomandările, trimiterile, rețetele sau certificatele sunt luate întotdeauna de medic, pe baza evaluării dumneavoastră.` },
      { question: "Ce limbi sunt disponibile?", answer: "Consultațiile la Global Health sunt disponibile în șase limbi — engleză, portugheză, spaniolă, cehă, română și germană — astfel încât puteți vorbi cu un medic în limba cu care vă simțiți cel mai confortabil, în funcție de disponibilitatea medicului la momentul rezervării. Când căutați o programare, puteți filtra lista de medici după limba vorbită, alături de alte criterii precum specialitatea și ora programării, astfel încât să vedeți doar medicii care corespund a ceea ce căutați. Profilul fiecărui medic indică, de asemenea, clar în ce limbi oferă consultații, astfel încât știți acest lucru înainte de a rezerva. Acest lucru contează mai mult decât simpla comoditate: capacitatea de a vă descrie simptomele și de a înțelege recomandările medicului în propria limbă ajută la evitarea neînțelegerilor în timpul discuției clinice. Dacă limba preferată nu este disponibilă la un moment dat, puteți alege un alt interval orar sau puteți reveni mai târziu." },
      { question: "Este sigură o consultație online?", answer: "Da — fiecare consultație la Global Health se desfășoară prin video criptat și securizat, conform standardelor naționale de telemedicină, astfel încât conversația dumneavoastră cu medicul rămâne privată între voi doi. Consultațiile nu sunt înregistrate, iar apelul video există doar pe durata programării în sine. Orice informație clinică pe care o partajați — simptomele, istoricul și notițele medicului — este stocată în siguranță și gestionată în conformitate cu GDPR și legislația națională aplicabilă privind protecția datelor, accesul fiind limitat la personalul medical implicat în îngrijirea dumneavoastră. Aveți drepturi asupra propriilor date, inclusiv dreptul de a solicita o copie a dosarului medical sau de a întreba cum sunt folosite și stocate informațiile dumneavoastră. Sistemele noastre de programare și plată respectă aceleași standarde de securitate ca alți furnizori de servicii medicale reglementați. Dacă aveți vreodată nelămuriri privind confidențialitatea, echipa noastră de suport vă poate explica exact cum sunt protejate datele dumneavoastră." },
      { question: "Cum rezerv o programare?", answer: "Alegeți tipul de consultație de care aveți nevoie — o programare la medicul de familie, o evaluare de specialitate sau un test de sănătate ghidat — și veți vedea următoarele intervale orare disponibile, în funcție de disponibilitatea reală a medicilor, inclusiv programări chiar în aceeași zi în multe cazuri. Selectați un interval orar, introduceți datele dumneavoastră și finalizați plata în siguranță online; nu este necesar niciun abonament sau membru, iar dumneavoastră plătiți doar consultația pe care o rezervați. Odată ce programarea este confirmată, veți primi imediat un email de confirmare cu ora programării, linkul video pe care îl veți folosi pentru a vă alătura și instrucțiuni simple despre ce trebuie pregătit înainte, precum actul de identitate sau lista medicamentelor pe care le luați. Puteți accesa detaliile programării oricând din contul dumneavoastră de pacient și veți primi un memento înainte de consultație, astfel încât nimic să nu vă ia prin surprindere." },
      ...(priceLine ? [{ question: "Cât costă o consultație?", answer: `Consultațiile la Global Health costă ${priceLine}. Fără costuri ascunse, fără abonament obligatoriu.` }] : []),
    ],
    PT: [
      { question: "Como funciona uma consulta online?", answer: "Marque uma consulta online, escolha um horário que lhe convenha e junte-se à sua consulta por vídeo seguro a partir do telemóvel, tablet ou computador — sem necessidade de descarregar qualquer aplicação. No início da chamada, o seu médico irá perguntar-lhe sobre os seus sintomas, historial médico e qualquer medicação que esteja a tomar, e depois fará uma avaliação clínica com base no que descreve e, se necessário, mostra por vídeo, como uma erupção cutânea ou uma lesão. Com base nessa avaliação, o seu médico pode aconselhar sobre a gestão da sua condição, pedir exames de seguimento, referenciá-lo para um especialista ou emitir uma receita ou atestado médico — sempre ao seu critério profissional e apenas quando clinicamente apropriado. Após a consulta, receberá por email um resumo escrito do que foi discutido, as recomendações feitas e os próximos passos, para que tenha um registo que pode guardar ou partilhar com outro médico caso precise." },
      { question: "Quem são os médicos?", answer: `Todos os médicos da Global Health estão inscritos na ordem médica nacional relevante para o país em que está a marcar — por exemplo, a Irish Medical Council na Irlanda — o que significa que cumpriram os padrões exigidos de qualificação, formação e prática profissional contínua para tratar doentes nesse país. Os dados de inscrição de cada médico são apresentados diretamente no seu perfil, para que possa verificar as suas credenciais antes de marcar, em vez de aceitar apenas pela confiança. Os perfis também incluem informação sobre a especialidade do médico, os idiomas falados e as áreas de foco clínico, ajudando-o a escolher o médico certo para as suas necessidades. Os médicos na nossa plataforma exercem tanto em clínica geral como numa variedade de especialidades, incluindo cardiologia, dermatologia, endocrinologia, gastroenterologia, neurologia e ginecologia, entre outras. Cada consulta é conduzida inteiramente pelo critério clínico do médico assistente — as decisões sobre recomendações, referenciações, receitas ou atestados são sempre tomadas pelo médico, com base na sua avaliação.` },
      { question: "Que idiomas estão disponíveis?", answer: "As consultas na Global Health estão disponíveis em seis idiomas — inglês, português, espanhol, checo, romeno e alemão — para que possa falar com um médico no idioma com que se sente mais confortável, consoante a disponibilidade do médico no momento da marcação. Ao procurar uma consulta, pode filtrar a lista de médicos pelo idioma que falam, juntamente com outros critérios como especialidade e horário, para que veja apenas os médicos que correspondem ao que procura. O perfil de cada médico indica também claramente em que idiomas atende, para que saiba isso antes de marcar. Isto é mais do que uma questão de conveniência: poder descrever os seus sintomas e compreender as indicações do seu médico no seu próprio idioma ajuda a garantir que nada se perde durante a conversa clínica. Se o seu idioma preferido não estiver disponível num determinado momento, pode escolher outro horário ou tentar mais tarde." },
      { question: "Uma consulta online é segura?", answer: "Sim — as consultas na Global Health são realizadas por vídeo encriptado e seguro, segundo as normas nacionais de telemedicina, pelo que a conversa com o médico permanece privada entre os dois. As consultas não são gravadas, e a sua videochamada existe apenas durante a duração da própria consulta. Qualquer informação clínica que partilhe — os seus sintomas, historial e as notas do seu médico — é armazenada de forma segura e tratada em conformidade com o RGPD e a legislação nacional aplicável de proteção de dados, com acesso limitado aos profissionais de saúde envolvidos nos seus cuidados. Tem direitos sobre os seus próprios dados, incluindo o direito de solicitar uma cópia do seu processo clínico ou de perguntar como as suas informações são utilizadas e armazenadas. Os nossos sistemas de marcação e pagamento seguem as mesmas normas de segurança que outros prestadores de cuidados de saúde regulados. Em caso de dúvidas sobre privacidade, a nossa equipa de apoio explica como os seus dados são protegidos." },
      { question: "Como marco uma consulta?", answer: "Escolha o tipo de consulta de que precisa — uma consulta de clínica geral, uma avaliação especializada ou um teste de saúde orientado — e verá os próximos horários disponíveis com base na disponibilidade real dos médicos, incluindo consultas no mesmo dia em muitos casos. Selecione um horário, introduza os seus dados e conclua o pagamento de forma segura online; não é necessária qualquer subscrição ou associação, e paga apenas pela consulta que marcar. Assim que a marcação for confirmada, receberá de imediato um email de confirmação com a hora da consulta, o link de vídeo que irá usar para se juntar e instruções simples sobre o que fazer antecipadamente, como ter à mão o seu documento de identificação ou uma lista da medicação atual. Pode aceder aos detalhes da sua consulta a qualquer momento a partir da sua conta de doente, e receberá um lembrete antes da consulta." },
      ...(priceLine ? [{ question: "Quanto custa uma consulta?", answer: `As consultas na Global Health custam ${priceLine}. Sem custos ocultos, sem subscrição obrigatória.` }] : []),
    ],
    DE: [
      { question: "Wie läuft eine Online-Konsultation ab?", answer: "Buchen Sie online einen Termin, wählen Sie eine für Sie passende Zeit und nehmen Sie per sicherem Video von Ihrem Telefon, Tablet oder Computer aus an Ihrer Konsultation teil — ohne dass eine App heruntergeladen werden muss. Zu Beginn des Gesprächs fragt Sie Ihr Arzt nach Ihren Symptomen, Ihrer Krankengeschichte und aktuell eingenommenen Medikamenten und führt anschließend auf Grundlage Ihrer Beschreibung und, falls nötig, per Video gezeigter Befunde wie Hautausschlag oder Verletzung eine klinische Beurteilung durch. Basierend auf dieser Beurteilung kann Ihr Arzt Ratschläge zum Umgang mit Ihrer Erkrankung geben, Kontrolluntersuchungen anfordern, Sie an einen Facharzt überweisen oder ein Rezept beziehungsweise ärztliches Attest ausstellen — stets nach professionellem Ermessen und nur, wenn klinisch angemessen. Nach der Konsultation erhalten Sie per E-Mail eine schriftliche Zusammenfassung des Besprochenen, der ausgesprochenen Empfehlungen und der nächsten Schritte, damit Sie eine Aufzeichnung besitzen, die Sie aufbewahren oder bei Bedarf einem anderen Arzt weitergeben können." },
      { question: "Wer sind die Ärzte?", answer: `Alle Ärzte bei Global Health sind bei der zuständigen nationalen Ärztekammer des Landes registriert, in dem Sie buchen — zum Beispiel dem Irish Medical Council in Irland — was bedeutet, dass sie die erforderlichen Standards an Qualifikation, Ausbildung und fortlaufender beruflicher Praxis erfüllt haben, um Patienten in diesem Land zu behandeln. Die Registrierungsdaten jedes Arztes werden direkt auf seinem Profil angezeigt, sodass Sie seine Qualifikationen vor der Buchung überprüfen können, anstatt sie einfach zu vertrauen. Die Profile enthalten außerdem Informationen zum Fachgebiet des Arztes, den gesprochenen Sprachen und den klinischen Schwerpunkten, was Ihnen hilft, den richtigen Arzt für Ihre Bedürfnisse zu wählen. Ärzte auf unserer Plattform sind sowohl in der Allgemeinmedizin als auch in einer Reihe von Fachgebieten tätig, darunter Kardiologie, Dermatologie, Endokrinologie, Gastroenterologie, Neurologie und Gynäkologie. Jede Konsultation wird vollständig vom klinischen Urteil des behandelnden Arztes geleitet — Entscheidungen über Empfehlungen, Überweisungen, Rezepte oder Atteste trifft stets der Arzt, basierend auf seiner Beurteilung.` },
      { question: "Welche Sprachen sind verfügbar?", answer: "Konsultationen bei Global Health sind in sechs Sprachen verfügbar — Englisch, Portugiesisch, Spanisch, Tschechisch, Rumänisch und Deutsch — sodass Sie mit einem Arzt in der Sprache sprechen können, in der Sie sich am wohlsten fühlen, je nach Verfügbarkeit des Arztes zum Zeitpunkt der Buchung. Bei der Terminsuche können Sie die Liste der Ärzte nach der gesprochenen Sprache filtern, zusammen mit anderen Kriterien wie Fachgebiet und Terminzeit, sodass Sie nur Ärzte sehen, die zu Ihrer Suche passen. Das Profil jedes Arztes gibt außerdem klar an, in welchen Sprachen er konsultiert, sodass Sie dies bereits vor der Buchung wissen. Das ist mehr als eine Frage der Bequemlichkeit: Die Fähigkeit, Ihre Symptome in Ihrer eigenen Sprache zu beschreiben und die Empfehlungen des Arztes zu verstehen, hilft sicherzustellen, dass im klinischen Gespräch nichts verloren geht. Ist Ihre bevorzugte Sprache zu einem bestimmten Zeitpunkt nicht verfügbar, können Sie ein anderes Zeitfenster wählen oder es später erneut versuchen." },
      { question: "Ist eine Online-Konsultation sicher?", answer: "Ja — jede Konsultation bei Global Health findet über verschlüsseltes, sicheres Video nach nationalen Telemedizin-Standards statt, sodass Ihr Gespräch mit dem Arzt zwischen Ihnen beiden privat bleibt. Konsultationen werden nicht aufgezeichnet, und Ihr Videoanruf besteht nur für die Dauer des Termins selbst. Alle klinischen Informationen, die Sie teilen — Ihre Symptome, Vorgeschichte und die Notizen Ihres Arztes — werden sicher gespeichert und gemäß der DSGVO sowie geltendem nationalem Datenschutzrecht verarbeitet, wobei der Zugriff auf die an Ihrer Behandlung beteiligten Ärzte beschränkt ist. Sie haben Rechte an Ihren eigenen Daten, einschließlich des Rechts, eine Kopie Ihrer Krankenakte anzufordern oder zu erfragen, wie Ihre Informationen verwendet und gespeichert werden. Unsere Buchungs- und Zahlungssysteme folgen denselben Sicherheitsstandards wie andere regulierte Gesundheitsdienstleister. Sollten Sie jemals Bedenken hinsichtlich des Datenschutzes haben, kann unser Support-Team Ihnen genau erklären, wie Ihre Informationen geschützt werden." },
      { question: "Wie buche ich einen Termin?", answer: "Wählen Sie die Art der Konsultation, die Sie benötigen — einen Termin beim Hausarzt, eine fachärztliche Beurteilung oder einen begleiteten Gesundheitstest — und Sie sehen die nächsten verfügbaren Zeitfenster basierend auf der tatsächlichen Verfügbarkeit der Ärzte, in vielen Fällen einschließlich Terminen am selben Tag. Wählen Sie ein Zeitfenster, geben Sie Ihre Daten ein und schließen Sie die Zahlung sicher online ab; es ist keine Mitgliedschaft oder Abonnement erforderlich, und Sie zahlen nur für die gebuchte Konsultation. Sobald Ihre Buchung bestätigt ist, erhalten Sie umgehend eine Bestätigungs-E-Mail mit Ihrer Terminzeit, dem Video-Link, den Sie zum Beitreten verwenden, und einfachen Anweisungen dazu, was Sie vorher vorbereiten sollten, etwa Ihren Ausweis oder eine Liste Ihrer aktuellen Medikamente. Sie können Ihre Termindetails jederzeit über Ihr Patientenkonto abrufen und erhalten vor der Konsultation eine Erinnerung, damit nichts Sie überrascht." },
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
