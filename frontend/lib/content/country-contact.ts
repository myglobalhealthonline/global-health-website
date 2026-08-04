import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Per-country contact-page facts and copy (SEO plan, 2026-08-04).
 *
 * WHY THIS SHAPE
 * Six markets, but only three have a registered office. Ireland, Czechia and
 * Portugal publish a postal address; Spain, Romania and Brazil deliberately do
 * NOT — inventing a locality signal for a market with no premises is the
 * doorway-page pattern, and on a medical domain the downside is site-wide. The
 * non-office markets differentiate on what is actually true of them: which
 * register their clinicians hold, and which body assesses their certificates.
 *
 * REGISTERED OFFICE, NOT A CLINIC
 * All three addresses are registered offices. Nobody can attend in person, so
 * the page says "registered office", emits no OpeningHoursSpecification, and
 * the JSON-LD is MedicalOrganization — never LocalBusiness/MedicalClinic,
 * which assert a visitable location. Revisit only when walk-in opens.
 *
 * TRANSLATION
 * `copy` carries English plus each market's own language, both hand-written.
 * A locale with no entry falls back to the market's default locale, then to
 * English — deliberately, so no machine-translated medical/regulatory copy
 * ships. The page chrome is still fully localised from the locale bundle.
 */

export type ContactOffice = {
  /** Street lines, as published. Must match the Google Business Profile. */
  streetLines: string[];
  locality: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2, for PostalAddress.addressCountry. */
  addressCountry: string;
  countryName: string;
};

export type ContactFaq = { question: string; answer: string };

export type MarketCopy = {
  /** <title>. Kept under ~60 chars — see lib/seo/page-seo.ts. */
  title: string;
  /** Meta description. Kept under ~155 chars. */
  description: string;
  h1: string;
  /** One or two sentences under the H1. */
  intro: string;
  reachHeading: string;
  reachBody: string;
  regulatoryHeading: string;
  regulatoryBody: string;
  faqHeading: string;
  faqs: ContactFaq[];
};

export type CountryContact = {
  /** Human-readable phone, as shown on the page. */
  phoneDisplay: string;
  /** E.164 — `tel:` hrefs and ContactPoint.telephone both require it. */
  phoneE164: string;
  email: string;
  /** Languages the phone line is answered in, in that market. */
  phoneLanguages: string[];
  /** null = no premises in this market; the page prints no address at all. */
  office: ContactOffice | null;
  /** Medical register the market's clinicians hold. */
  regulator: { name: string; url: string };
  /**
   * Facts injected into the per-locale templates in `contact.json`. This is
   * what gives every locale real translated copy instead of an English
   * fallback: the sentences are translated once per language, the facts that
   * differ per market are substituted in.
   */
  facts: {
    /** City for the H1/title in markets with an office; null when online-only. */
    city: string | null;
    /** Local emergency number, e.g. "112", "155", "192". */
    emergency: string;
    /** Body that decides sick-leave benefit — ČSSZ, INSS, DSP, CNAS… */
    benefitBody: string;
    /** Word for the certificate in-market: sick cert, neschopenka, atestado… */
    certificateNoun: string;
  };
  /**
   * Optional hand-written override per locale. Where present it wins over the
   * templates — used for the markets whose regulatory nuance does not survive
   * templating. Absent locales render from the templates, fully translated.
   */
  copy: Partial<Record<LocaleCode, MarketCopy>>;
};

const EMAIL = "info@myglobalhealth.online";

export const COUNTRY_CONTACT: Record<string, CountryContact> = {
  ie: {
    phoneDisplay: "+353 89 471 5849",
    phoneE164: "+353894715849",
    email: EMAIL,
    phoneLanguages: ["English"],
    office: {
      streetLines: ["6–9 Trinity Street"],
      locality: "Dublin 2",
      postalCode: "D02 EY47",
      addressCountry: "IE",
      countryName: "Ireland",
    },
    regulator: { name: "Irish Medical Council", url: "https://www.medicalcouncil.ie/" },
    facts: {
      city: "Dublin",
      emergency: "112 / 999",
      benefitBody: "Department of Social Protection",
      certificateNoun: "sick certificate",
    },
    copy: {
      en: {
        title: "Contact Global Health Dublin | Online GP Ireland",
        description:
          "Contact Global Health Ireland: +353 89 471 5849, info@myglobalhealth.online. Online consultations with IMC-registered GPs, registered office in Dublin 2.",
        h1: "Contact Global Health Ireland",
        intro:
          "Global Health is an online clinic. Consultations happen by secure video with doctors registered with the Irish Medical Council, and our registered office is in Dublin 2.",
        reachHeading: "How to reach a doctor",
        reachBody:
          "The fastest route to a doctor is booking a consultation directly — the phone line is for account, billing and booking questions rather than clinical advice. Same-day appointments are usually available in Ireland. If you need urgent care, contact your GP, call 112 or 999, or attend your nearest emergency department.",
        regulatoryHeading: "Registration and certificates",
        regulatoryBody:
          "Every doctor consulting through Global Health Ireland holds registration with the Irish Medical Council. Medical certificates are issued by the assessing doctor following the consultation. Employers set their own requirements for sick leave, and statutory entitlements — including Illness Benefit — are assessed by the Department of Social Protection, not by us.",
        faqHeading: "Frequently asked questions",
        faqs: [
          {
            question: "Can I visit your Dublin office in person?",
            answer:
              "No. The Trinity Street address is our registered office, not a walk-in clinic. All consultations take place by secure video call.",
          },
          {
            question: "Will my employer accept a sick certificate from an online consultation?",
            answer:
              "A certificate from Global Health is issued by an Irish Medical Council-registered doctor after assessing you, and carries the same standing as one issued in person. Individual employers set their own sick-leave policies, so check yours if you are unsure.",
          },
          {
            question: "Can you help with an Illness Benefit claim?",
            answer:
              "Illness Benefit is administered by the Department of Social Protection, which assesses claims against its own criteria and requires its own certification. Our doctors can assess you and issue a medical certificate, but we cannot submit or decide a claim on your behalf.",
          },
          {
            question: "What if I need care urgently?",
            answer:
              "Global Health is not an emergency service and the phone line is not monitored for clinical emergencies. For urgent symptoms contact your GP, call 112 or 999, or attend your nearest emergency department.",
          },
        ],
      },
    },
  },

  cz: {
    phoneDisplay: "+420 608 353 716",
    phoneE164: "+420608353716",
    email: EMAIL,
    phoneLanguages: ["Czech", "English"],
    office: {
      streetLines: ["Rybná 24"],
      locality: "Praha 1",
      postalCode: "110 00",
      addressCountry: "CZ",
      countryName: "Czechia",
    },
    regulator: { name: "Česká lékařská komora", url: "https://www.lkcr.cz/" },
    facts: {
      city: "Praha",
      emergency: "155",
      benefitBody: "ČSSZ",
      certificateNoun: "neschopenka",
    },
    copy: {
      cs: {
        title: "Kontakt | Online lékař Praha | Global Health",
        description:
          "Kontaktujte Global Health: +420 608 353 716, info@myglobalhealth.online. Online konzultace s registrovanými lékaři, sídlo v Praze 1.",
        h1: "Kontakt — Global Health Česko",
        intro:
          "Global Health je online klinika. Konzultace probíhají zabezpečeným videohovorem s lékaři registrovanými u České lékařské komory. Naše sídlo je v Praze 1.",
        reachHeading: "Jak se spojit s lékařem",
        reachBody:
          "Nejrychlejší cestou k lékaři je objednání konzultace. Telefonní linka slouží k dotazům ohledně objednávek, plateb a účtu, nikoli k lékařskému poradenství. Linku obsluhujeme česky i anglicky. V naléhavých případech volejte 155 nebo 112.",
        regulatoryHeading: "Registrace a potvrzení",
        regulatoryBody:
          "Lékaři konzultující přes Global Health jsou registrováni u České lékařské komory. Potvrzení vystavuje lékař, který vás vyšetřil. O nároku na nemocenskou rozhoduje Česká správa sociálního zabezpečení podle vlastních pravidel — my o dávce nerozhodujeme.",
        faqHeading: "Časté dotazy",
        faqs: [
          {
            question: "Mohu vaši pražskou adresu navštívit osobně?",
            answer:
              "Ne. Adresa v Rybné je naše sídlo, nikoli ordinace pro osobní návštěvy. Všechny konzultace probíhají videohovorem.",
          },
          {
            question: "Uzná zaměstnavatel neschopenku z online konzultace?",
            answer:
              "Potvrzení vystavuje lékař registrovaný u České lékařské komory po vyšetření pacienta. O samotné dávce nemocenského rozhoduje ČSSZ podle svých pravidel, proto si podmínky ověřte u zaměstnavatele i u ČSSZ.",
          },
          {
            question: "V jakém jazyce probíhá konzultace?",
            answer:
              "Konzultace nabízíme v češtině i angličtině. Jazyk každého lékaře najdete na jeho profilu.",
          },
          {
            question: "Co když potřebuji pomoc okamžitě?",
            answer:
              "Global Health není záchranná služba a telefonní linka není určena pro naléhavé stavy. Při náhlých potížích volejte 155 nebo 112.",
          },
        ],
      },
      en: {
        title: "Contact Global Health Czechia | Online Doctor Prague",
        description:
          "Contact Global Health Czechia: +420 608 353 716, info@myglobalhealth.online. Online consultations in Czech and English, registered office in Prague 1.",
        h1: "Contact Global Health Czechia",
        intro:
          "Global Health is an online clinic. Consultations take place by secure video with doctors registered with the Czech Medical Chamber, and our registered office is in Prague 1.",
        reachHeading: "How to reach a doctor",
        reachBody:
          "Booking a consultation is the fastest route to a doctor; the phone line handles booking, billing and account questions rather than clinical advice, and is answered in Czech and English. For emergencies call 155 or 112.",
        regulatoryHeading: "Registration and certificates",
        regulatoryBody:
          "Doctors consulting through Global Health Czechia are registered with the Czech Medical Chamber (Česká lékařská komora). Sickness certification is issued by the assessing doctor. Entitlement to sickness benefit is decided by the Czech Social Security Administration (ČSSZ) under its own rules.",
        faqHeading: "Frequently asked questions",
        faqs: [
          {
            question: "Can I visit your Prague office in person?",
            answer:
              "No. The Rybná address is a registered office rather than a walk-in surgery. All consultations happen by video call.",
          },
          {
            question: "Is a neschopenka from an online consultation valid?",
            answer:
              "The certificate is issued by a doctor registered with the Czech Medical Chamber after assessing you. Sickness benefit itself is decided by ČSSZ against its own criteria, so confirm requirements with both your employer and ČSSZ.",
          },
          {
            question: "Which languages do you consult in?",
            answer:
              "Czech and English. Each doctor's profile lists the languages they consult in.",
          },
          {
            question: "What if I need urgent care?",
            answer:
              "Global Health is not an emergency service and the phone line is not monitored for emergencies. Call 155 or 112 for urgent medical help.",
          },
        ],
      },
    },
  },

  pt: {
    phoneDisplay: "+351 919 990 810",
    phoneE164: "+351919990810",
    email: EMAIL,
    phoneLanguages: ["Portuguese", "English"],
    office: {
      streetLines: ["Rua Brincos de Princesa nº 13", "Albarraque"],
      locality: "Sintra",
      postalCode: "2710-683",
      addressCountry: "PT",
      countryName: "Portugal",
    },
    regulator: { name: "Ordem dos Médicos", url: "https://ordemdosmedicos.pt/" },
    facts: {
      city: "Sintra",
      emergency: "112",
      benefitBody: "Segurança Social",
      certificateNoun: "atestado médico",
    },
    copy: {
      pt: {
        title: "Contactos | Médico Online Sintra | Global Health",
        description:
          "Contacte a Global Health: +351 919 990 810, info@myglobalhealth.online. Consultas online com médicos inscritos na Ordem dos Médicos. Sede em Sintra.",
        h1: "Contactos — Global Health Portugal",
        intro:
          "A Global Health é uma clínica online. As consultas decorrem por videochamada segura com médicos inscritos na Ordem dos Médicos e a nossa sede social fica em Sintra.",
        reachHeading: "Como falar com um médico",
        reachBody:
          "A forma mais rápida de falar com um médico é marcar uma consulta. A linha telefónica destina-se a questões de marcações, pagamentos e conta, não a aconselhamento clínico, e é atendida em português e inglês. Em caso de emergência, ligue 112.",
        regulatoryHeading: "Inscrição e atestados",
        regulatoryBody:
          "Os médicos que consultam através da Global Health Portugal estão inscritos na Ordem dos Médicos. O atestado é emitido pelo médico que realizou a avaliação. A atribuição de subsídio de doença é decidida pela Segurança Social segundo as suas próprias regras, e os atestados para carta de condução seguem os requisitos do IMT.",
        faqHeading: "Perguntas frequentes",
        faqs: [
          {
            question: "Posso deslocar-me à vossa morada em Sintra?",
            answer:
              "Não. A morada de Albarraque é a sede social e não um consultório de atendimento presencial. Todas as consultas são feitas por videochamada.",
          },
          {
            question: "O atestado médico online é aceite pela entidade patronal?",
            answer:
              "O atestado é emitido por um médico inscrito na Ordem dos Médicos após avaliação. Cada entidade patronal define as suas exigências e o subsídio de doença é decidido pela Segurança Social, pelo que deve confirmar ambos.",
          },
          {
            question: "Emitem atestado para a carta de condução?",
            answer:
              "Os atestados para carta de condução obedecem aos requisitos do IMT, que definem o que pode ser avaliado remotamente. Consulte a página do serviço para as condições aplicáveis antes de marcar.",
          },
          {
            question: "E se precisar de ajuda urgente?",
            answer:
              "A Global Health não é um serviço de urgência e a linha telefónica não está preparada para emergências. Ligue 112 ou dirija-se ao serviço de urgência mais próximo.",
          },
        ],
      },
      en: {
        title: "Contact Global Health Portugal | Online Doctor",
        description:
          "Contact Global Health Portugal: +351 919 990 810, info@myglobalhealth.online. Online consultations with doctors registered with the Ordem dos Médicos.",
        h1: "Contact Global Health Portugal",
        intro:
          "Global Health is an online clinic. Consultations take place by secure video with doctors registered with the Ordem dos Médicos, and our registered office is in Sintra.",
        reachHeading: "How to reach a doctor",
        reachBody:
          "Booking a consultation is the fastest route to a doctor; the phone line covers bookings, billing and account questions rather than clinical advice, and is answered in Portuguese and English. For emergencies call 112.",
        regulatoryHeading: "Registration and certificates",
        regulatoryBody:
          "Doctors consulting through Global Health Portugal are registered with the Ordem dos Médicos. Certificates are issued by the assessing doctor. Sickness benefit is decided by Segurança Social under its own rules, and driving-licence certificates follow IMT requirements.",
        faqHeading: "Frequently asked questions",
        faqs: [
          {
            question: "Can I visit your Sintra address?",
            answer:
              "No. The Albarraque address is a registered office, not a walk-in practice. All consultations happen by video call.",
          },
          {
            question: "Is an atestado from an online consultation accepted?",
            answer:
              "It is issued by a doctor registered with the Ordem dos Médicos following an assessment. Employers set their own requirements and Segurança Social decides benefit entitlement separately.",
          },
          {
            question: "Do you issue driving-licence certificates?",
            answer:
              "Driving-licence certificates follow IMT requirements, which govern what may be assessed remotely. Check the service page for the conditions that apply before booking.",
          },
          {
            question: "What if I need urgent care?",
            answer:
              "Global Health is not an emergency service. Call 112 or attend your nearest emergency department.",
          },
        ],
      },
    },
  },

  es: {
    phoneDisplay: "+353 89 471 5849",
    phoneE164: "+353894715849",
    email: EMAIL,
    phoneLanguages: ["Spanish", "English"],
    office: null,
    regulator: {
      name: "Colegio Oficial de Médicos",
      url: "https://www.cgcom.es/",
    },
    facts: {
      city: null,
      emergency: "112",
      benefitBody: "INSS",
      certificateNoun: "justificante médico",
    },
    copy: {
      es: {
        title: "Contacto | Médico Online España | Global Health",
        description:
          "Contacta con Global Health España: info@myglobalhealth.online. Consultas online por videollamada con médicos colegiados. Atención en español e inglés.",
        h1: "Contacto — Global Health España",
        intro:
          "Global Health atiende España como clínica exclusivamente online: las consultas se realizan por videollamada segura con médicos colegiados. No disponemos de consulta física en España.",
        reachHeading: "Cómo contactar con un médico",
        reachBody:
          "Reservar una consulta es la vía más rápida para hablar con un médico. Atendemos consultas administrativas por correo electrónico, en español e inglés. Para urgencias, llame al 112.",
        regulatoryHeading: "Colegiación y certificados",
        regulatoryBody:
          "Los médicos que atienden a pacientes en España están colegiados en su Colegio Oficial de Médicos correspondiente. El certificado lo emite el médico que realiza la valoración. La baja laboral y sus prestaciones las gestionan el INSS y los servicios de salud autonómicos conforme a sus propios criterios.",
        faqHeading: "Preguntas frecuentes",
        faqs: [
          {
            question: "¿Tienen consulta física en España?",
            answer:
              "No. Operamos en España únicamente como clínica online. Nuestra sede social está en Irlanda y las consultas se realizan por videollamada.",
          },
          {
            question: "¿Los médicos están colegiados en España?",
            answer:
              "Los médicos que atienden a pacientes en España están colegiados en el Colegio Oficial de Médicos que corresponde. Cada perfil de médico indica su registro.",
          },
          {
            question: "¿Sirve su certificado para una baja laboral?",
            answer:
              "El certificado acredita la valoración médica realizada. La baja laboral oficial y su prestación las tramitan el INSS y el servicio de salud de su comunidad autónoma según sus propios requisitos.",
          },
          {
            question: "¿Qué hago en una urgencia?",
            answer:
              "Global Health no es un servicio de urgencias. Llame al 112 o acuda al servicio de urgencias más cercano.",
          },
        ],
      },
      en: {
        title: "Contact Global Health Spain | Online Doctor",
        description:
          "Contact Global Health Spain: info@myglobalhealth.online. Online video consultations with registered doctors, in Spanish and English.",
        h1: "Contact Global Health Spain",
        intro:
          "Global Health serves Spain as an online-only clinic: consultations happen by secure video with registered doctors. We do not hold premises in Spain.",
        reachHeading: "How to reach a doctor",
        reachBody:
          "Booking a consultation is the fastest route to a doctor. Administrative questions are handled by email, in Spanish and English. For emergencies call 112.",
        regulatoryHeading: "Registration and certificates",
        regulatoryBody:
          "Doctors seeing patients in Spain are registered with their relevant Colegio Oficial de Médicos. Certificates are issued by the assessing doctor. Statutory sick leave and its benefits are administered by the INSS and regional health services under their own criteria.",
        faqHeading: "Frequently asked questions",
        faqs: [
          {
            question: "Do you have a clinic in Spain?",
            answer:
              "No. We operate in Spain as an online-only clinic. Our registered office is in Ireland and consultations take place by video call.",
          },
          {
            question: "Are your doctors registered in Spain?",
            answer:
              "Doctors seeing patients in Spain hold registration with the relevant Colegio Oficial de Médicos. Each doctor's profile states their registration.",
          },
          {
            question: "Can I use your certificate for statutory sick leave?",
            answer:
              "The certificate records the medical assessment carried out. Statutory sick leave and benefit are processed by the INSS and your regional health service under their own requirements.",
          },
          {
            question: "What should I do in an emergency?",
            answer: "Global Health is not an emergency service. Call 112 or attend your nearest emergency department.",
          },
        ],
      },
    },
  },

  ro: {
    phoneDisplay: "+353 89 471 5849",
    phoneE164: "+353894715849",
    email: EMAIL,
    phoneLanguages: ["Romanian", "English"],
    office: null,
    regulator: { name: "Colegiul Medicilor din România", url: "https://www.cmr.ro/" },
    facts: {
      city: null,
      emergency: "112",
      benefitBody: "CNAS",
      certificateNoun: "adeverință medicală",
    },
    copy: {
      ro: {
        title: "Contact | Medic Online România | Global Health",
        description:
          "Contactați Global Health România: info@myglobalhealth.online. Consultații online prin apel video cu medici înregistrați. Asistență în română și engleză.",
        h1: "Contact — Global Health România",
        intro:
          "Global Health funcționează în România exclusiv ca o clinică online: consultațiile au loc prin apel video securizat cu medici înregistrați. Nu avem cabinet fizic în România.",
        reachHeading: "Cum ajungeți la un medic",
        reachBody:
          "Cea mai rapidă cale către un medic este programarea unei consultații. Întrebările administrative sunt tratate prin e-mail, în română și engleză. Pentru urgențe sunați la 112.",
        regulatoryHeading: "Înregistrare și adeverințe",
        regulatoryBody:
          "Medicii care consultă pacienți din România sunt înregistrați la Colegiul Medicilor din România. Adeverința este emisă de medicul care a efectuat evaluarea. Concediul medical și indemnizația aferentă sunt stabilite de CNAS și de angajator conform propriilor reguli.",
        faqHeading: "Întrebări frecvente",
        faqs: [
          {
            question: "Aveți cabinet în România?",
            answer:
              "Nu. În România funcționăm exclusiv online. Sediul social este în Irlanda, iar consultațiile se desfășoară prin apel video.",
          },
          {
            question: "Medicii sunt înregistrați în România?",
            answer:
              "Medicii care consultă pacienți din România sunt înregistrați la Colegiul Medicilor din România. Profilul fiecărui medic indică înregistrarea.",
          },
          {
            question: "Adeverința este valabilă pentru concediu medical?",
            answer:
              "Adeverința atestă evaluarea medicală efectuată. Concediul medical și indemnizația se stabilesc de CNAS și de angajator, potrivit cerințelor proprii.",
          },
          {
            question: "Ce fac într-o urgență?",
            answer:
              "Global Health nu este un serviciu de urgență. Sunați la 112 sau mergeți la cea mai apropiată unitate de primiri urgențe.",
          },
        ],
      },
      en: {
        title: "Contact Global Health Romania | Online Doctor",
        description:
          "Contact Global Health Romania: info@myglobalhealth.online. Online video consultations with registered doctors, in Romanian and English.",
        h1: "Contact Global Health Romania",
        intro:
          "Global Health serves Romania as an online-only clinic: consultations take place by secure video with registered doctors. We hold no premises in Romania.",
        reachHeading: "How to reach a doctor",
        reachBody:
          "Booking a consultation is the fastest route to a doctor. Administrative questions are handled by email, in Romanian and English. For emergencies call 112.",
        regulatoryHeading: "Registration and certificates",
        regulatoryBody:
          "Doctors seeing patients in Romania are registered with the Colegiul Medicilor din România. Certificates are issued by the assessing doctor. Medical leave and its allowance are determined by CNAS and your employer under their own rules.",
        faqHeading: "Frequently asked questions",
        faqs: [
          {
            question: "Do you have a clinic in Romania?",
            answer:
              "No. We operate online only in Romania. Our registered office is in Ireland and consultations happen by video call.",
          },
          {
            question: "Are your doctors registered in Romania?",
            answer:
              "Doctors seeing Romanian patients hold registration with the Colegiul Medicilor din România, stated on each doctor's profile.",
          },
          {
            question: "Is the certificate valid for medical leave?",
            answer:
              "It records the medical assessment carried out. Medical leave and allowance are decided by CNAS and your employer against their own requirements.",
          },
          {
            question: "What should I do in an emergency?",
            answer: "Global Health is not an emergency service. Call 112 or attend the nearest emergency unit.",
          },
        ],
      },
    },
  },

  br: {
    phoneDisplay: "+353 89 471 5849",
    phoneE164: "+353894715849",
    email: EMAIL,
    phoneLanguages: ["Portuguese", "English"],
    office: null,
    regulator: { name: "Conselho Federal de Medicina", url: "https://portal.cfm.org.br/" },
    facts: {
      city: null,
      emergency: "192",
      benefitBody: "INSS",
      certificateNoun: "atestado médico",
    },
    copy: {
      pt: {
        title: "Contato | Médico Online Brasil | Global Health",
        description:
          "Fale com a Global Health Brasil: info@myglobalhealth.online. Consultas online por videochamada com médicos registrados. Atendimento em português e inglês.",
        h1: "Contato — Global Health Brasil",
        intro:
          "A Global Health atende o Brasil exclusivamente como clínica online: as consultas acontecem por videochamada segura com médicos registrados. Não temos consultório físico no Brasil.",
        reachHeading: "Como falar com um médico",
        reachBody:
          "Agendar uma consulta é o caminho mais rápido para falar com um médico. Dúvidas administrativas são respondidas por e-mail, em português e inglês. Em emergências, ligue 192.",
        regulatoryHeading: "Registro e atestados",
        regulatoryBody:
          "Os médicos que atendem pacientes no Brasil possuem registro no Conselho Regional de Medicina do seu estado. O atestado é emitido pelo médico que realizou a avaliação. O afastamento e o benefício previdenciário são decididos pelo INSS e pelo empregador conforme regras próprias.",
        faqHeading: "Perguntas frequentes",
        faqs: [
          {
            question: "Vocês têm consultório no Brasil?",
            answer:
              "Não. No Brasil atuamos apenas online. Nossa sede fica na Irlanda e as consultas são feitas por videochamada.",
          },
          {
            question: "Os médicos têm CRM?",
            answer:
              "Os médicos que atendem pacientes no Brasil possuem registro no Conselho Regional de Medicina do respectivo estado. O perfil de cada médico informa o registro.",
          },
          {
            question: "O atestado emitido online é aceito?",
            answer:
              "O atestado é emitido pelo médico após a avaliação, conforme as normas do Conselho Federal de Medicina para telemedicina. O empregador e o INSS avaliam o afastamento segundo seus próprios critérios.",
          },
          {
            question: "E em caso de emergência?",
            answer:
              "A Global Health não é um serviço de emergência. Ligue 192 (SAMU) ou procure o pronto-socorro mais próximo.",
          },
        ],
      },
      en: {
        title: "Contact Global Health Brazil | Online Doctor",
        description:
          "Contact Global Health Brazil: info@myglobalhealth.online. Online video consultations with registered doctors, in Portuguese and English.",
        h1: "Contact Global Health Brazil",
        intro:
          "Global Health serves Brazil as an online-only clinic: consultations take place by secure video with registered doctors. We hold no premises in Brazil.",
        reachHeading: "How to reach a doctor",
        reachBody:
          "Booking a consultation is the fastest route to a doctor. Administrative questions are handled by email, in Portuguese and English. For emergencies call 192.",
        regulatoryHeading: "Registration and certificates",
        regulatoryBody:
          "Doctors seeing patients in Brazil hold registration with their state Conselho Regional de Medicina. Certificates are issued by the assessing doctor under the Conselho Federal de Medicina's telemedicine rules. Leave and benefit are decided by your employer and the INSS.",
        faqHeading: "Frequently asked questions",
        faqs: [
          {
            question: "Do you have a clinic in Brazil?",
            answer:
              "No. We operate online only in Brazil. Our registered office is in Ireland and consultations happen by video call.",
          },
          {
            question: "Do your doctors hold a CRM registration?",
            answer:
              "Doctors seeing Brazilian patients are registered with their state Conselho Regional de Medicina, stated on each doctor's profile.",
          },
          {
            question: "Is an online certificate accepted?",
            answer:
              "It is issued by the assessing doctor under the Conselho Federal de Medicina's telemedicine rules. Your employer and the INSS assess leave against their own criteria.",
          },
          {
            question: "What about emergencies?",
            answer: "Global Health is not an emergency service. Call 192 (SAMU) or go to the nearest emergency department.",
          },
        ],
      },
    },
  },
};

/** Locale-bundle shape the templates arrive in (contact.json → `country`). */
export type ContactCopyTemplates = {
  titleTemplate: string;
  descriptionTemplate: string;
  h1Template: string;
  introOffice: string;
  introOnline: string;
  reachHeading: string;
  reachBodyTemplate: string;
  regulatoryHeading: string;
  regulatoryBodyTemplate: string;
  faqHeading: string;
  faq1Q: string;
  faq1AOffice: string;
  faq1AOnline: string;
  faq2Q: string;
  faq2A: string;
  faq3Q: string;
  faq3A: string;
  faq4Q: string;
  faq4A: string;
  faq5Q: string;
  faq5A: string;
};

/** `{placeholder}` substitution. Unknown keys are left as-is, deliberately —
 *  a visible `{foo}` in a preview is easier to spot than a silent blank.
 *  Shared with the country About pages. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/gu, (match, key: string) => vars[key] ?? match);
}

const fill = fillTemplate;

/**
 * Builds a market's copy from the active locale's templates. This is what
 * gives all six locales real translated prose: the sentences are translated
 * once per language and the per-market facts are substituted in, rather than
 * every locale falling back to English.
 *
 * A hand-written `copy[locale]` override still wins — see `resolveContactCopy`.
 */
export function buildContactCopyFromTemplates(
  contact: CountryContact,
  countryName: string,
  t: ContactCopyTemplates,
): MarketCopy {
  const { facts, office } = contact;
  const vars: Record<string, string> = {
    country: countryName,
    // Markets with premises lead with the city (it is what people search);
    // online-only markets lead with the country and claim no locality.
    place: facts.city ?? countryName,
    city: facts.city ?? countryName,
    regulator: contact.regulator.name,
    phone: contact.phoneDisplay,
    email: contact.email,
    languages: contact.phoneLanguages.join(" / "),
    emergency: facts.emergency,
    benefitBody: facts.benefitBody,
    certificate: facts.certificateNoun,
  };

  return {
    title: fill(t.titleTemplate, vars),
    description: fill(t.descriptionTemplate, vars),
    h1: fill(t.h1Template, vars),
    intro: fill(office ? t.introOffice : t.introOnline, vars),
    reachHeading: t.reachHeading,
    reachBody: fill(t.reachBodyTemplate, vars),
    regulatoryHeading: t.regulatoryHeading,
    regulatoryBody: fill(t.regulatoryBodyTemplate, vars),
    faqHeading: t.faqHeading,
    faqs: [
      {
        question: fill(t.faq1Q, vars),
        answer: fill(office ? t.faq1AOffice : t.faq1AOnline, vars),
      },
      { question: fill(t.faq2Q, vars), answer: fill(t.faq2A, vars) },
      { question: fill(t.faq3Q, vars), answer: fill(t.faq3A, vars) },
      { question: fill(t.faq4Q, vars), answer: fill(t.faq4A, vars) },
      { question: fill(t.faq5Q, vars), answer: fill(t.faq5A, vars) },
    ],
  };
}

/**
 * Hand-written copy for this exact locale wins; otherwise the locale's own
 * templates are filled with this market's facts. Nothing is machine
 * translated and no locale falls back to another language.
 */
export function resolveContactCopy(
  contact: CountryContact,
  lang: LocaleCode,
  countryName: string,
  templates: ContactCopyTemplates,
): MarketCopy {
  return contact.copy[lang] ?? buildContactCopyFromTemplates(contact, countryName, templates);
}

export function getCountryContact(code: string): CountryContact | null {
  return COUNTRY_CONTACT[code.toLowerCase()] ?? null;
}

/** Single-line address for display and for NAP consistency checks. */
export function formatOffice(office: ContactOffice): string {
  return [...office.streetLines, office.locality, office.postalCode, office.countryName].join(", ");
}
