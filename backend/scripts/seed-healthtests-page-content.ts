/**
 * HEALTH_TESTS page-content seed — brings the guided health-tests hub to
 * admin-controlled parity with SPECIALIST_CONSULTATION
 * (see seed-specialist-page-content.ts — the canonical pattern this file
 * copies: `pick`/`pickArr` fill logic, IE-wins vs fill-for-others,
 * per-locale CountryLocale query, console.table, dry-run/--apply).
 *
 * HEALTH_TESTS rows may NOT exist yet for every market (mirrors the
 * specialist seed's rule, not the HOME/DOCTORS_INDEX rule): create as
 * PUBLISHED for ie, DRAFT for others; never change status on an existing
 * row; always set the five show* toggles true (showBody untouched).
 *
 * Content is authored fresh for HEALTH_TESTS (NOT copied from the GP seed)
 * — guided health tests / lab referrals reviewed by a clinician. NO
 * diagnostic-guarantee claims: a test result does not itself constitute a
 * diagnosis, and referral requirements are phrased cautiously ("not always").
 *
 *   npx tsx scripts/seed-healthtests-page-content.ts          # dry run
 *   npx tsx scripts/seed-healthtests-page-content.ts --apply  # write
 */
import "dotenv/config";
import { LocaleCode, PublishStatus, ServiceVisibility } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const PAGE_KEY = "HEALTH_TESTS";

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
  EN: "Who health tests are for",
  CS: "Pro koho jsou zdravotní testy určeny",
  ES: "Para quién son las pruebas de salud",
  RO: "Pentru cine sunt testele de sănătate",
  PT: "Para quem são os testes de saúde",
  DE: "Für wen Gesundheitstests gedacht sind",
};

const WHO_FOR_INTRO: Record<LocaleCode, string> = {
  EN: "Guided health tests may be a suitable option for:",
  CS: "Řízené zdravotní testy mohou být vhodnou volbou pro:",
  ES: "Las pruebas de salud guiadas pueden ser una opción adecuada para:",
  RO: "Testele de sănătate ghidate pot fi o opțiune potrivită pentru:",
  PT: "Os testes de saúde orientados podem ser uma opção adequada para:",
  DE: "Begleitete Gesundheitstests können eine geeignete Option sein für:",
};

const WHY_CHOOSE_TITLE: Record<LocaleCode, string> = {
  EN: "Why choose Global Health for testing",
  CS: "Proč zvolit Global Health pro testování",
  ES: "Por qué elegir Global Health para sus pruebas",
  RO: "De ce să alegeți Global Health pentru testare",
  PT: "Porquê escolher a Global Health para os seus testes",
  DE: "Warum Global Health für Gesundheitstests wählen",
};

const WHO_FOR_ITEMS: Record<LocaleCode, string[]> = {
  EN: [
    "Routine health screening and general wellbeing checks",
    "Ongoing monitoring of a known condition such as diabetes, thyroid disorders or high cholesterol",
    "Investigation of specific symptoms alongside a consultation",
    "Pre-travel health checks",
    "Baseline testing before starting a new treatment or medication",
    "Follow-up testing after a previous result or referral",
    "General blood tests requested as part of routine care",
  ],
  CS: [
    "Běžný zdravotní screening a kontroly celkového zdravotního stavu",
    "Průběžné sledování známého onemocnění, jako je diabetes, poruchy štítné žlázy nebo vysoký cholesterol",
    "Vyšetření konkrétních příznaků společně s konzultací",
    "Zdravotní kontroly před cestou",
    "Vstupní vyšetření před zahájením nové léčby nebo medikace",
    "Kontrolní testy po předchozím výsledku nebo doporučení",
    "Obecné krevní testy vyžádané v rámci běžné péče",
  ],
  ES: [
    "Cribado de salud rutinario y controles generales de bienestar",
    "Seguimiento continuado de una afección conocida como diabetes, trastornos tiroideos o colesterol alto",
    "Investigación de síntomas concretos junto con una consulta",
    "Revisiones de salud antes de un viaje",
    "Pruebas iniciales antes de comenzar un nuevo tratamiento o medicación",
    "Pruebas de seguimiento tras un resultado o derivación previos",
    "Análisis de sangre generales solicitados como parte de la atención rutinaria",
  ],
  RO: [
    "Screening de sănătate de rutină și verificări generale ale stării de bine",
    "Monitorizarea continuă a unei afecțiuni cunoscute precum diabetul, afecțiunile tiroidiene sau colesterolul ridicat",
    "Investigarea unor simptome specifice alături de o consultație",
    "Verificări de sănătate înainte de călătorie",
    "Testare inițială înainte de începerea unui nou tratament sau medicament",
    "Testare de urmărire după un rezultat sau o trimitere anterioară",
    "Analize de sânge generale solicitate ca parte a îngrijirii de rutină",
  ],
  PT: [
    "Rastreio de saúde de rotina e verificações gerais de bem-estar",
    "Monitorização contínua de uma condição conhecida como diabetes, distúrbios da tiroide ou colesterol elevado",
    "Investigação de sintomas específicos em conjunto com uma consulta",
    "Verificações de saúde antes de viajar",
    "Análises de referência antes de iniciar um novo tratamento ou medicação",
    "Exames de seguimento após um resultado ou referenciação anterior",
    "Análises ao sangue gerais solicitadas como parte dos cuidados de rotina",
  ],
  DE: [
    "Routinemäßiges Gesundheits-Screening und allgemeine Wohlbefindenskontrollen",
    "Fortlaufende Überwachung einer bekannten Erkrankung wie Diabetes, Schilddrüsenstörungen oder hohem Cholesterin",
    "Abklärung bestimmter Symptome im Rahmen einer Konsultation",
    "Gesundheitschecks vor einer Reise",
    "Ausgangsuntersuchungen vor Beginn einer neuen Behandlung oder Medikation",
    "Nachuntersuchungen nach einem vorherigen Ergebnis oder einer Überweisung",
    "Allgemeine Bluttests im Rahmen der Routineversorgung",
  ],
};

function whyChooseItems(locale: LocaleCode, reg: string): string[] {
  const c = CONNECTOR[locale](reg);
  switch (locale) {
    case "EN":
      return [
        `Results reviewed by doctors ${c}`,
        "Clear explanation of your results and any recommended next steps",
        "Secure, confidential handling of your results",
        "Consultations available in multiple languages, subject to clinician availability",
        "Transparent pricing — no hidden fees, no membership required",
      ];
    case "CS":
      return [
        `Výsledky posuzují lékaři ${c}`,
        "Srozumitelné vysvětlení vašich výsledků a případných doporučených dalších kroků",
        "Bezpečné a důvěrné zacházení s vašimi výsledky",
        "Konzultace dostupné ve více jazycích podle dostupnosti lékaře",
        "Transparentní ceny — žádné skryté poplatky, žádné povinné členství",
      ];
    case "ES":
      return [
        `Resultados revisados por médicos ${c}`,
        "Explicación clara de sus resultados y de los siguientes pasos recomendados",
        "Tratamiento seguro y confidencial de sus resultados",
        "Consultas disponibles en varios idiomas, según disponibilidad del médico",
        "Precios transparentes — sin costes ocultos, sin suscripción obligatoria",
      ];
    case "RO":
      return [
        `Rezultate analizate de medici ${c}`,
        "Explicație clară a rezultatelor și a oricăror pași următori recomandați",
        "Gestionare sigură și confidențială a rezultatelor dumneavoastră",
        "Consultații disponibile în mai multe limbi, în funcție de disponibilitatea medicului",
        "Prețuri transparente — fără costuri ascunse, fără abonament obligatoriu",
      ];
    case "PT":
      return [
        `Resultados analisados por médicos ${c}`,
        "Explicação clara dos seus resultados e de quaisquer próximos passos recomendados",
        "Tratamento seguro e confidencial dos seus resultados",
        "Consultas disponíveis em vários idiomas, consoante a disponibilidade do médico",
        "Preços transparentes — sem custos ocultos, sem subscrição obrigatória",
      ];
    case "DE":
      return [
        `Ergebnisse werden von Ärzten überprüft, die ${c} sind`,
        "Klare Erklärung Ihrer Ergebnisse und etwaiger empfohlener nächster Schritte",
        "Sichere, vertrauliche Handhabung Ihrer Ergebnisse",
        "Konsultationen in mehreren Sprachen verfügbar, je nach Verfügbarkeit des Arztes",
        "Transparente Preise — keine versteckten Gebühren, keine Mitgliedschaft erforderlich",
      ];
  }
}

function faq(locale: LocaleCode, reg: string, priceLine: string | null): FaqItem[] {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, FaqItem[]> = {
    EN: [
      { question: "What health tests are available?", answer: "Available tests vary by market and may include general blood tests, screening panels and condition-specific monitoring tests. Available options are shown when you book." },
      { question: "How are my results delivered?", answer: `Results are reviewed by a doctor ${c} and explained to you, with any recommended next steps, through your secure account or a follow-up consultation.` },
      { question: "Do I need a referral for a health test?", answer: "Not always. Some tests can be booked directly, while others may require a consultation with one of our doctors first so the most appropriate test can be selected." },
      { question: "Which languages are available?", answer: "Consultations relating to your test results are available in multiple languages, subject to clinician availability." },
      { question: "What happens if my results need follow-up?", answer: "If your results indicate that further review, testing or a referral is needed, your doctor will advise on appropriate next steps." },
      ...(priceLine ? [{ question: "How much does a health test cost?", answer: `Health tests at Global Health cost ${priceLine}. There are no hidden fees and no membership required.` }] : []),
    ],
    CS: [
      { question: "Jaké zdravotní testy jsou k dispozici?", answer: "Dostupné testy se liší podle trhu a mohou zahrnovat obecné krevní testy, screeningové panely a testy zaměřené na sledování konkrétních onemocnění. Dostupné možnosti se zobrazí při rezervaci." },
      { question: "Jak mi budou doručeny výsledky?", answer: `Výsledky posoudí lékař ${c} a vysvětlí vám je, včetně případných doporučených dalších kroků, prostřednictvím vašeho zabezpečeného účtu nebo návazné konzultace.` },
      { question: "Potřebuji pro zdravotní test doporučení?", answer: "Ne vždy. Některé testy lze rezervovat přímo, u jiných může být nejprve nutná konzultace s naším lékařem, aby mohl být vybrán nejvhodnější test." },
      { question: "Jaké jazyky jsou k dispozici?", answer: "Konzultace týkající se výsledků vašich testů jsou dostupné ve více jazycích podle dostupnosti lékaře." },
      { question: "Co se stane, když budou moje výsledky vyžadovat další postup?", answer: "Pokud výsledky ukáží potřebu dalšího posouzení, testování nebo doporučení, lékař vám doporučí vhodný další postup." },
      ...(priceLine ? [{ question: "Kolik stojí zdravotní test?", answer: `Zdravotní testy u Global Health stojí ${priceLine}. Žádné skryté poplatky, žádné povinné členství.` }] : []),
    ],
    ES: [
      { question: "¿Qué pruebas de salud están disponibles?", answer: "Las pruebas disponibles varían según el mercado y pueden incluir análisis de sangre generales, paneles de cribado y pruebas de seguimiento de afecciones específicas. Las opciones disponibles se muestran al reservar." },
      { question: "¿Cómo recibo mis resultados?", answer: `Los resultados son revisados por un médico ${c} y se le explican, junto con los siguientes pasos recomendados, a través de su cuenta segura o de una consulta de seguimiento.` },
      { question: "¿Necesito una derivación para una prueba de salud?", answer: "No siempre. Algunas pruebas pueden reservarse directamente, mientras que otras pueden requerir antes una consulta con uno de nuestros médicos para seleccionar la prueba más adecuada." },
      { question: "¿Qué idiomas están disponibles?", answer: "Las consultas relacionadas con los resultados de sus pruebas están disponibles en varios idiomas, según disponibilidad del médico." },
      { question: "¿Qué ocurre si mis resultados requieren seguimiento?", answer: "Si sus resultados indican que se necesita una valoración adicional, más pruebas o una derivación, su médico le aconsejará los siguientes pasos adecuados." },
      ...(priceLine ? [{ question: "¿Cuánto cuesta una prueba de salud?", answer: `Las pruebas de salud en Global Health cuestan ${priceLine}. Sin costes ocultos ni suscripción obligatoria.` }] : []),
    ],
    RO: [
      { question: "Ce teste de sănătate sunt disponibile?", answer: "Testele disponibile variază în funcție de piață și pot include analize de sânge generale, panouri de screening și teste de monitorizare specifice unei afecțiuni. Opțiunile disponibile sunt afișate la rezervare." },
      { question: "Cum îmi sunt livrate rezultatele?", answer: `Rezultatele sunt analizate de un medic ${c} și vă sunt explicate, împreună cu orice pași următori recomandați, prin contul dumneavoastră securizat sau printr-o consultație de urmărire.` },
      { question: "Am nevoie de o trimitere pentru un test de sănătate?", answer: "Nu întotdeauna. Unele teste pot fi rezervate direct, în timp ce altele pot necesita mai întâi o consultație cu unul dintre medicii noștri, astfel încât să poată fi selectat cel mai potrivit test." },
      { question: "Ce limbi sunt disponibile?", answer: "Consultațiile legate de rezultatele testelor dumneavoastră sunt disponibile în mai multe limbi, în funcție de disponibilitatea medicului." },
      { question: "Ce se întâmplă dacă rezultatele mele necesită urmărire?", answer: "Dacă rezultatele indică necesitatea unei evaluări suplimentare, a unor teste suplimentare sau a unei trimiteri, medicul dumneavoastră vă va recomanda pașii următori potriviți." },
      ...(priceLine ? [{ question: "Cât costă un test de sănătate?", answer: `Testele de sănătate la Global Health costă ${priceLine}. Fără costuri ascunse, fără abonament obligatoriu.` }] : []),
    ],
    PT: [
      { question: "Que testes de saúde estão disponíveis?", answer: "Os testes disponíveis variam consoante o mercado e podem incluir análises ao sangue gerais, painéis de rastreio e testes de monitorização específicos de determinadas condições. As opções disponíveis são apresentadas ao marcar." },
      { question: "Como recebo os meus resultados?", answer: `Os resultados são analisados por um médico ${c} e explicados, juntamente com quaisquer próximos passos recomendados, através da sua conta segura ou de uma consulta de seguimento.` },
      { question: "Preciso de uma referenciação para um teste de saúde?", answer: "Nem sempre. Alguns testes podem ser marcados diretamente, enquanto outros podem exigir primeiro uma consulta com um dos nossos médicos para que possa ser selecionado o teste mais adequado." },
      { question: "Que idiomas estão disponíveis?", answer: "As consultas relacionadas com os resultados dos seus testes estão disponíveis em vários idiomas, consoante a disponibilidade do médico." },
      { question: "O que acontece se os meus resultados precisarem de seguimento?", answer: "Se os seus resultados indicarem que é necessária uma avaliação adicional, mais exames ou uma referenciação, o seu médico irá aconselhar os próximos passos adequados." },
      ...(priceLine ? [{ question: "Quanto custa um teste de saúde?", answer: `Os testes de saúde na Global Health custam ${priceLine}. Sem custos ocultos, sem subscrição obrigatória.` }] : []),
    ],
    DE: [
      { question: "Welche Gesundheitstests sind verfügbar?", answer: "Die verfügbaren Tests variieren je nach Markt und können allgemeine Bluttests, Screening-Panels und krankheitsspezifische Überwachungstests umfassen. Die verfügbaren Optionen werden bei der Buchung angezeigt." },
      { question: "Wie erhalte ich meine Ergebnisse?", answer: `Die Ergebnisse werden von einem Arzt überprüft, der ${c} ist, und Ihnen zusammen mit etwaigen empfohlenen nächsten Schritten über Ihr sicheres Konto oder eine Nachsorgekonsultation erklärt.` },
      { question: "Benötige ich eine Überweisung für einen Gesundheitstest?", answer: "Nicht immer. Einige Tests können direkt gebucht werden, während andere zunächst eine Konsultation mit einem unserer Ärzte erfordern können, damit der passendste Test ausgewählt werden kann." },
      { question: "Welche Sprachen sind verfügbar?", answer: "Konsultationen zu Ihren Testergebnissen sind je nach Verfügbarkeit des Arztes in mehreren Sprachen verfügbar." },
      { question: "Was passiert, wenn meine Ergebnisse eine Nachverfolgung erfordern?", answer: "Wenn Ihre Ergebnisse zeigen, dass eine weitere Beurteilung, weitere Tests oder eine Überweisung erforderlich sind, berät Sie Ihr Arzt zu den passenden nächsten Schritten." },
      ...(priceLine ? [{ question: "Was kostet ein Gesundheitstest?", answer: `Gesundheitstests bei Global Health kosten ${priceLine}. Keine versteckten Gebühren, keine Mitgliedschaft erforderlich.` }] : []),
    ],
  };
  return byLocale[locale];
}

function disclaimerParagraphs(locale: LocaleCode, reg: string, emergency: string): string[] {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string[]> = {
    EN: [
      `Health tests offered through Global Health are reviewed by doctors ${c}.`,
      "Test results are explained by a clinician, and any recommended next steps, referrals or further investigations are provided only where clinically appropriate and at the reviewing doctor's professional discretion. A test result does not by itself constitute a diagnosis.",
      "Our doctors do not routinely prescribe controlled substances through online consultations.",
      `Health tests and related consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, please contact emergency services immediately by calling ${emergency} or attend your nearest emergency department.`,
    ],
    CS: [
      `Zdravotní testy nabízené prostřednictvím Global Health posuzují lékaři ${c}.`,
      "Výsledky testů vysvětluje lékař a případná doporučená další opatření, doporučení k dalším vyšetřením nebo specialistovi jsou poskytována pouze tam, kde je to klinicky vhodné, a to na základě odborného uvážení posuzujícího lékaře. Výsledek testu sám o sobě nepředstavuje diagnózu.",
      "Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací.",
      `Zdravotní testy a související konzultace nejsou vhodné pro řešení zdravotních pohotovostních stavů. Pokud se nacházíte v život ohrožující situaci, neprodleně kontaktujte záchrannou službu na čísle ${emergency} nebo vyhledejte nejbližší pohotovost.`,
    ],
    ES: [
      `Las pruebas de salud ofrecidas a través de Global Health son revisadas por médicos ${c}.`,
      "Los resultados de las pruebas son explicados por un médico, y cualquier paso siguiente recomendado, derivación o investigación adicional se proporciona únicamente cuando sea clínicamente apropiado y a criterio profesional del médico que revisa el caso. Un resultado de prueba no constituye por sí mismo un diagnóstico.",
      "Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online.",
      `Las pruebas de salud y las consultas relacionadas no son adecuadas para emergencias médicas. Si tiene una emergencia médica, contacte inmediatamente con los servicios de emergencia llamando al ${emergency} o acuda a su servicio de urgencias más cercano.`,
    ],
    RO: [
      `Testele de sănătate oferite prin Global Health sunt analizate de medici ${c}.`,
      "Rezultatele testelor sunt explicate de un medic, iar orice pași următori recomandați, trimiteri sau investigații suplimentare sunt oferite doar atunci când este clinic adecvat și la discreția profesională a medicului care analizează cazul. Un rezultat al testului nu constituie prin el însuși un diagnostic.",
      "Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online.",
      `Testele de sănătate și consultațiile aferente nu sunt potrivite pentru urgențe medicale. Dacă vă confruntați cu o urgență medicală, contactați imediat serviciile de urgență la numărul ${emergency} sau mergeți la cea mai apropiată unitate de primiri urgențe.`,
    ],
    PT: [
      `Os testes de saúde oferecidos através da Global Health são analisados por médicos ${c}.`,
      "Os resultados dos testes são explicados por um médico, e quaisquer próximos passos recomendados, referenciações ou exames adicionais são fornecidos apenas quando clinicamente apropriado e ao critério profissional do médico responsável pela análise. Um resultado de teste não constitui, por si só, um diagnóstico.",
      "Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online.",
      `Os testes de saúde e as consultas relacionadas não são adequados para emergências médicas. Em caso de emergência médica, contacte imediatamente os serviços de emergência através do número ${emergency} ou dirija-se ao serviço de urgência mais próximo.`,
    ],
    DE: [
      `Über Global Health angebotene Gesundheitstests werden von Ärzten überprüft, die ${c} sind.`,
      "Die Testergebnisse werden von einem Arzt erklärt, und etwaige empfohlene nächste Schritte, Überweisungen oder weitere Untersuchungen werden nur bereitgestellt, wenn dies klinisch angemessen ist und nach professionellem Ermessen des beurteilenden Arztes. Ein Testergebnis stellt für sich genommen keine Diagnose dar.",
      "Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen.",
      `Gesundheitstests und damit verbundene Konsultationen eignen sich nicht für medizinische Notfälle. Wenn Sie einen medizinischen Notfall haben, kontaktieren Sie bitte umgehend den Rettungsdienst unter ${emergency} oder suchen Sie die nächstgelegene Notaufnahme auf.`,
    ],
  };
  return byLocale[locale];
}

function disclaimerShort(locale: LocaleCode, reg: string, emergency: string): string {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string> = {
    EN: `Health tests offered through Global Health are reviewed by doctors ${c}. Results are explained by a clinician; further steps, referrals or investigations are provided only when clinically appropriate and a test result does not itself constitute a diagnosis. Our doctors do not routinely prescribe controlled substances through online consultations. In a medical emergency call ${emergency}.`,
    CS: `Zdravotní testy nabízené prostřednictvím Global Health posuzují lékaři ${c}. Výsledky vysvětluje lékař; další kroky, doporučení nebo vyšetření jsou poskytovány pouze tam, kde je to klinicky vhodné, a výsledek testu sám o sobě nepředstavuje diagnózu. Naši lékaři běžně nepředepisují návykové látky prostřednictvím online konzultací. V případě zdravotní pohotovosti volejte ${emergency}.`,
    ES: `Las pruebas de salud ofrecidas a través de Global Health son revisadas por médicos ${c}. Los resultados son explicados por un médico; los siguientes pasos, derivaciones o investigaciones se proporcionan solo cuando es clínicamente apropiado, y un resultado de prueba no constituye por sí mismo un diagnóstico. Nuestros médicos no prescriben de forma rutinaria sustancias controladas a través de consultas online. En caso de emergencia médica llame al ${emergency}.`,
    RO: `Testele de sănătate oferite prin Global Health sunt analizate de medici ${c}. Rezultatele sunt explicate de un medic; pașii următori, trimiterile sau investigațiile sunt oferite doar atunci când este clinic adecvat, iar un rezultat al testului nu constituie prin el însuși un diagnostic. Medicii noștri nu prescriu în mod obișnuit substanțe controlate prin consultații online. În caz de urgență medicală sunați la ${emergency}.`,
    PT: `Os testes de saúde oferecidos através da Global Health são analisados por médicos ${c}. Os resultados são explicados por um médico; os próximos passos, referenciações ou exames são fornecidos apenas quando clinicamente apropriado, e um resultado de teste não constitui, por si só, um diagnóstico. Os nossos médicos não prescrevem rotineiramente substâncias controladas através de consultas online. Em caso de emergência médica ligue ${emergency}.`,
    DE: `Über Global Health angebotene Gesundheitstests werden von Ärzten überprüft, die ${c} sind. Die Ergebnisse werden von einem Arzt erklärt; weitere Schritte, Überweisungen oder Untersuchungen werden nur bereitgestellt, wenn dies klinisch angemessen ist, und ein Testergebnis stellt für sich genommen keine Diagnose dar. Unsere Ärzte verschreiben im Rahmen von Online-Konsultationen grundsätzlich keine kontrollierten Substanzen. Rufen Sie im medizinischen Notfall ${emergency} an.`,
  };
  return byLocale[locale];
}

function intro(locale: LocaleCode, reg: string): string {
  const c = CONNECTOR[locale](reg);
  const byLocale: Record<LocaleCode, string> = {
    EN: `Global Health offers guided health tests reviewed by doctors ${c}. Tests can support screening, ongoing monitoring or investigation of specific symptoms, with results explained by a clinician and appropriate next steps advised where needed.`,
    CS: `Global Health nabízí řízené zdravotní testy posuzované lékaři ${c}. Testy mohou podpořit screening, průběžné sledování nebo vyšetření konkrétních příznaků, přičemž výsledky vám vysvětlí lékař a v případě potřeby doporučí vhodný další postup.`,
    ES: `Global Health ofrece pruebas de salud guiadas revisadas por médicos ${c}. Las pruebas pueden ayudar en el cribado, el seguimiento continuado o la investigación de síntomas concretos, con resultados explicados por un médico y los siguientes pasos adecuados aconsejados cuando sea necesario.`,
    RO: `Global Health oferă teste de sănătate ghidate, analizate de medici ${c}. Testele pot sprijini screeningul, monitorizarea continuă sau investigarea unor simptome specifice, rezultatele fiind explicate de un medic, iar pașii următori adecvați fiind recomandați atunci când este necesar.`,
    PT: `A Global Health oferece testes de saúde orientados, analisados por médicos ${c}. Os testes podem apoiar o rastreio, a monitorização contínua ou a investigação de sintomas específicos, com os resultados explicados por um médico e os próximos passos adequados aconselhados quando necessário.`,
    DE: `Global Health bietet begleitete Gesundheitstests an, die von Ärzten überprüft werden, die ${c} sind. Die Tests können Screening, fortlaufende Überwachung oder die Abklärung bestimmter Symptome unterstützen, wobei die Ergebnisse von einem Arzt erklärt werden und bei Bedarf geeignete nächste Schritte empfohlen werden.`,
  };
  return byLocale[locale];
}

async function cheapestHealthTestPriceLine(countryCode: string, locale: LocaleCode): Promise<string | null> {
  try {
    const country = await prisma.country.findUnique({ where: { code: countryCode }, select: { id: true } });
    if (!country) return null;
    const service = await prisma.service.findFirst({
      where: {
        countryId: country.id,
        kind: "HEALTH_TEST",
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
  const priceFormatted = await cheapestHealthTestPriceLine(market.countryCode, locale);
  const priceLine = priceFormatted ? fromLine(priceFormatted, locale) : null;

  return {
    locale,
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

  // Status: rows may not exist yet — create PUBLISHED for ie, DRAFT for
  // others (mirrors the specialist seed); never change status on an
  // existing row.
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
      // status intentionally omitted — never changed on an existing row.
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
    const t = await buildTranslation(market, locale);
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
      console.log("[seed-healthtests-page-content] NOTE: PageContent tables not found — cannot introspect. Aborting dry run.");
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
