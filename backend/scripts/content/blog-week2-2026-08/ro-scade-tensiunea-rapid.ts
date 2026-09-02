/**
 * Romania — Week 2 rapid blood-pressure safety article.
 *
 * Search evidence (OpenSEO, 2026-08-24):
 * - "ce scade tensiunea arteriala rapid" — 9,900/mo, KD 0, CPC 0.24
 * - "pastila care scade tensiunea imediat" — 4,400/mo, KD 0, CPC 0.16
 * - "de la ce tensiune se ia captopril" — 4,400/mo, KD 0
 * - "ce scade tensiunea imediat" — 3,600/mo, KD 0, CPC 0.59
 *
 * Clinical constraint: this is a safety and myth-correction article, not a
 * treatment protocol. It never gives a prescription-drug dose or tells a
 * reader to self-medicate. Emergency symptoms point directly to 112.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const ESC_GUIDELINE =
  "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/elevated-blood-pressure-and-hypertension/";
const CARDIOPORTAL_HTA =
  "https://www.cardioportal.ro/pacienti/factori-de-risc-cardiovascular/hipertensiunea-arteriala-2/";
const CARDIOPORTAL_MASURARE =
  "https://www.cardioportal.ro/pacienti/factori-de-risc-cardiovascular/hipertensiunea-arteriala-2/cum-masuram-tensiunea-arteriala/";
const NHS_PREECLAMPSIA = "https://www.nhs.uk/conditions/pre-eclampsia/";
const EMERGENCY_112 = "https://www.112.ro/";
const EMERGENCY_112_LAW = "https://legislatie.just.ro/Public/DetaliiDocumentAfis/267768";

const roHref = (path: string) => `https://www.myglobalhealth.online/romania/ro${path}`;
const enHref = (path: string) => `https://www.myglobalhealth.online/romania/en${path}`;
const ptHref = (path: string) => `https://www.myglobalhealth.online/romania/pt${path}`;
const esHref = (path: string) => `https://www.myglobalhealth.online/romania/es${path}`;
const csHref = (path: string) => `https://www.myglobalhealth.online/romania/cs${path}`;
const deHref = (path: string) => `https://www.myglobalhealth.online/romania/de${path}`;

const ro: LocalePost = {
  locale: "RO",
  slug: "ce-scade-tensiunea-arteriala-rapid-sigur",
  title: "Ce scade tensiunea rapid? Pași siguri și când sunați la 112",
  excerpt:
    "Nu există un truc sigur pentru toată lumea. Aflați cum verificați valoarea, când sunați la 112 și de ce nu luați captopril sau doze suplimentare fără un plan personal.",
  seoTitle: "Ce scade tensiunea rapid: pași siguri",
  seoDescription:
    "Ce faceți după o valoare mare, când sunați la 112 și de ce nu luați captopril, doze suplimentare ori remedii improvizate.",
  category: "Boli cronice",
  article: {
    lang: "ro-RO",
    tagline: "Medicină oricând, oriunde",
    categoryLabel: "Boli cronice",
    categoryHref: roHref("/blog"),
    eyebrow: "România · Ghid de siguranță",
    h1: "Ce scade tensiunea rapid, în siguranță?",
    deck: "Verificați urgența, apoi măsurarea. Nu începeți cu o pastilă improvizată.",
    intro:
      "Nu există un aliment, ceai sau comprimat care să scadă <strong>rapid și sigur tensiunea pentru orice persoană</strong>. Sunați la <strong>112</strong> dacă o valoare mare apare împreună cu durere sau apăsare în piept, lipsă severă de aer, slăbiciune ori amorțeală pe o parte, vorbire dificilă, confuzie, leșin, pierderea bruscă a vederii sau o durere de cap bruscă și neobișnuit de puternică. Nu așteptați să treacă și nu conduceți. Fără aceste semne, opriți efortul, stați liniștit câteva minute, apoi faceți două citiri corecte la scurt interval. Nu luați captopril suplimentar, medicamentul altcuiva sau o doză veche fără o indicație personală clară.",
    facts: [
      "Semne acute în piept, respirație sau sistem nervos: 112",
      "Repetați corect măsurarea dacă sunteți stabil",
      "Nu improvizați medicamente sau doze",
    ],
    primaryCta: { label: "Consultație pentru boli cronice", href: roHref("/services/boli-cronice-online") },
    secondaryCta: { label: "Deschideți jurnalul de tensiune", href: roHref("/tools/blood-pressure-chart") },
    panelChip: "Ordinea corectă",
    panelParas: [
      "Simptomele de alarmă au prioritate față de o nouă măsurare.",
      "Durerea, efortul, anxietatea sau tehnica pot influența o valoare.",
      "Scăderea forțată poate fi periculoasă; tratamentul se ajustează individual.",
    ],
    author: {
      initials: "RB",
      name: "Dr Robert Gabriel Brindus",
      line: "Medic specialist medicină de familie · Director medical, Global Health România",
    },
    navLabel: "În acest ghid",
    sections: [
      {
        id: "primii-pasi",
        nav: "Primii pași",
        eyebrow: "După o valoare mare",
        h2: "Ce puteți face imediat, fără să vă puneți în pericol",
        blocks: [
          lead("Opriți efortul, așezați-vă și verificați simptomele înainte de a repeta măsurarea."),
          ul([
            "Sprijiniți spatele, țineți tălpile pe podea și brațul la nivelul inimii.",
            "Folosiți o manșetă potrivită pe brațul gol și nu vorbiți în timpul măsurării.",
            "După câteva minute de repaus, faceți două citiri la scurt interval și notați-le.",
            "Notați pulsul, simptomele, ora, medicamentele obișnuite și contextul: durere, febră, efort sau lipsă de somn.",
          ]),
          p("Acești pași nu tratează hipertensiunea. Reduc erorile și ajută medicul. Nu măsurați continuu până obțineți cifra dorită și nu păstrați doar valoarea cea mai mică."),
          p("Dacă valoarea rămâne în jurul sau peste 180/110 mmHg, cereți evaluare în aceeași zi pentru a exclude o urgență hipertensivă: medic de familie, centru de permanență sau UPU. Dacă vă agravați ori apare un semn de alarmă, sunați la 112."),
        ],
      },
      {
        id: "urgenta",
        nav: "Sunați la 112",
        eyebrow: "Semne de alarmă",
        h2: "Când tensiunea mare poate însoți o urgență",
        blocks: [
          lead("O urgență hipertensivă gravă înseamnă valori foarte mari împreună cu afectare acută de organ. Acasă puteți recunoaște semnele, nu confirma diagnosticul."),
          ul([
            "Durere sau apăsare în piept, mai ales cu transpirații, greață ori stare de leșin.",
            "Lipsă severă de aer sau agravare rapidă a respirației.",
            "Față asimetrică, slăbiciune ori amorțeală pe o parte, vorbire neclară.",
            "Confuzie nouă, convulsie, leșin sau pierderea stării de conștiență.",
            "Pierderea bruscă a vederii sau o durere de cap explozivă, diferită de cele obișnuite.",
          ]),
          p("Sunați la 112, nu conduceți singur și notați ora debutului. Pregătiți lista medicamentelor și urmați instrucțiunile dispecerului. O a doua valoare mai mică nu anulează un simptom compatibil cu accident vascular cerebral sau infarct."),
          warn("Sarcină și după naștere", "Tensiunea mare cu cefalee severă, modificări de vedere, durere sub coaste, vărsături, lipsă de aer sau umflare bruscă necesită evaluare obstetricală urgentă. Preeclampsia poate apărea și după naștere."),
          cite(`Cadrul legal oficial pentru <a href="${EMERGENCY_112_LAW}" rel="nofollow noopener" target="_blank">Sistemul național unic pentru apeluri de urgență</a> definește 112 ca serviciul care preia apelurile și alertează intervenția specializată.`),
        ],
      },
      {
        id: "medicamente",
        nav: "Medicamente",
        eyebrow: "Fără automedicație",
        h2: "Nu există o cifră universală pentru captopril sau o doză suplimentară",
        blocks: [
          lead("Captoprilul și celelalte antihipertensive se folosesc după istoricul, analizele, bolile asociate și schema fiecărei persoane."),
          p("Același rezultat pe tensiometru poate necesita decizii diferite. Funcția renală, potasiul, sarcina, deshidratarea și alte medicamente pot schimba riscul. O scădere prea rapidă poate reduce circulația către creier, inimă sau rinichi și poate provoca amețeală, cădere sau leșin."),
          warn("Nu luați o doză improvizată", "Nu dublați tratamentul, nu luați captopril neprescris și nu folosiți medicamentul unei rude. Urmați numai un plan de acțiune scris pentru dumneavoastră; cu semne de alarmă, sunați la 112."),
          p("Lămâia, usturoiul, oțetul, apa rece și ceaiurile nu tratează un infarct, un accident vascular cerebral sau o altă urgență. Respirația lentă poate reduce anxietatea, dar o cifră mai mică după repaus nu demonstrează că pericolul a trecut. Unele plante și suplimente pot interacționa cu medicamentele; întrebați medicul sau farmacistul."),
        ],
      },
      {
        id: "urmarire",
        nav: "Îngrijire stabilă",
        eyebrow: "După episod",
        h2: "Valorile repetat mari se gestionează prin medicină de familie",
        blocks: [
          lead("Când sunteți stabil și nu aveți semne de alarmă, medicina de familie este punctul obișnuit de pornire."),
          p('Într-o <a href="' + roHref("/services/boli-cronice-online") + '">consultație pentru boli cronice</a>, medicul poate verifica tehnica, <a href="' + roHref("/tools/blood-pressure-chart") + '">jurnalul tensiunii</a>, tratamentul prescris, dozele omise și factorii de risc. Poate recomanda analize, ECG, consult fizic sau monitorizare ambulatorie.'),
          p("Cardiologia este o etapă de escaladare când există boală cardiacă, teste anormale, simptome cardiovasculare, hipertensiune rezistentă sau recomandarea medicului de familie. Nu este un înlocuitor pentru 112 și nici prima oprire obligatorie pentru orice valoare izolată."),
          p('Pentru programare, vedeți <a href="' + roHref("/doctors") + '">medicii din România</a> sau <a href="' + roHref("/contact") + '">contactați Global Health</a>. Aceste canale nu sunt servicii de urgență.'),
        ],
      },
      {
        id: "pregatire",
        nav: "Pregătirea consultației",
        eyebrow: "Ce ajută",
        h2: "Ce să aveți pregătit pentru consultația programată",
        blocks: [
          lead("Luați jurnalul tensiunii, lista completă a medicamentelor și rapoartele deja existente."),
          p("Acestea ajută medicul să decidă rapid dacă este suficientă urmărirea prin medicină de familie sau dacă sunt necesare analize, consult fizic ori cardiologie."),
        ],
      },
    ],
    linksEyebrow: "Global Health România",
    linksH2: "Alegeți pasul potrivit",
    linksLead:
      "Fără semne de alarmă, organizați valorile și discutați cu un medic. Cu simptome acute, sunați la 112.",
    links: [
      { label: "Consultație pentru boli cronice", href: roHref("/services/boli-cronice-online") },
      { label: "Jurnal de tensiune arterială", href: roHref("/tools/blood-pressure-chart") },
      { label: "Medici în România", href: roHref("/doctors") },
      { label: "Contact Global Health", href: roHref("/contact") },
    ],
    ctaBox: {
      h3: "Aveți valori repetat mari, dar sunteți stabil?",
      text: "Programați o consultație cu jurnalul, lista medicamentelor și simptomele. Medicul de familie poate decide investigațiile și dacă este necesară cardiologia.",
      primary: { label: "Programați consultația", href: roHref("/services/boli-cronice-online") },
      secondary: { label: "Vedeți medicii", href: roHref("/doctors") },
    },
    sourcesEyebrow: "Surse medicale",
    sourcesH2: "Sursele acestui ghid",
    sourcesLead:
      "Sursele separă evaluarea de urgență de tratamentul pe termen lung și nu oferă o doză universală.",
    sources: [
      { label: "ESC — tensiune arterială crescută și hipertensiune", href: ESC_GUIDELINE },
      { label: "Societatea Română de Cardiologie — hipertensiunea arterială", href: CARDIOPORTAL_HTA },
      { label: "Societatea Română de Cardiologie — măsurarea tensiunii", href: CARDIOPORTAL_MASURARE },
      { label: "Portalul Legislativ — sistemul național 112", href: EMERGENCY_112_LAW },
      { label: "NHS — preeclampsia în sarcină și după naștere", href: NHS_PREECLAMPSIA },
    ],
    sourcesNote:
      "Decizia individuală depinde de istoricul medical, examinare, analize și tratamentul prescris.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări despre scăderea rapidă a tensiunii",
    faqs: [
      {
        q: "Ce scade tensiunea imediat acasă?",
        a: "Nu există un remediu sigur pentru orice situație. Verificați simptomele și, dacă sunteți stabil, faceți două citiri corecte la scurt interval. Cu durere în piept, lipsă severă de aer sau semne neurologice, sunați la 112.",
      },
      {
        q: "De la ce tensiune se ia captopril?",
        a: "Nu există o cifră universală. Captoprilul se ia numai dacă a fost prescris și conform planului personal. Nu luați o doză suplimentară sau un medicament neprescris.",
      },
      {
        q: "Lămâia, usturoiul sau ceaiul scad tensiunea repede?",
        a: "Nu tratează o urgență. Repausul poate coincide cu o valoare mai mică, dar nu anulează simptomele grave, iar unele plante pot interacționa cu medicamentele.",
      },
      {
        q: "Când este suficientă o consultație programată?",
        a: "Când sunteți stabil, fără semne de alarmă, și doriți evaluarea unor valori crescute repetat. Pentru o valoare care rămâne în jurul sau peste 180/110 mmHg, cereți evaluare în aceeași zi prin medicul de familie, un centru de permanență sau UPU; cardiologia se adaugă dacă există motive clinice.",
      },
    ],
    disclaimerTitle: "Aviz medical și de urgență",
    disclaimer:
      "Informații generale, nu diagnostic sau schemă de tratament. Nu modificați dozele și nu luați medicamente neprescrise. Pentru durere în piept, lipsă severă de aer, deficit neurologic, confuzie, leșin sau tulburări bruște de vedere, sunați la 112.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "how-to-lower-blood-pressure-quickly-and-safely",
  title: "How to lower blood pressure quickly: safe steps and when to call 112",
  excerpt:
    "There is no quick fix that is safe for everyone. Learn how to check a high reading, when to call 112 and why not to take extra captopril or another dose without a personal plan.",
  seoTitle: "Lower blood pressure quickly: safe first steps",
  seoDescription:
    "What to do after a high reading, when to call 112 and why extra captopril, additional doses and improvised remedies may be unsafe.",
  category: "Chronic conditions",
  article: {
    lang: "en-RO",
    tagline: "Healthcare anytime, anywhere",
    categoryLabel: "Chronic conditions",
    categoryHref: enHref("/blog"),
    eyebrow: "Romania · Safety guide",
    h1: "How can you lower blood pressure quickly and safely?",
    deck: "Check for an emergency first, then check the measurement. Do not start with an improvised tablet.",
    intro:
      "No food, tea or tablet lowers blood pressure <strong>quickly and safely for everyone</strong>. Call <strong>112</strong> if a high reading occurs with chest pain, severe breathlessness, one-sided weakness or numbness, speech difficulty, confusion, fainting, sudden vision loss or a sudden, unusually severe headache. Do not wait or drive. Without these signs, stop exertion, sit quietly and take two careful readings a short time apart. Do not take extra captopril, someone else’s medicine or a leftover dose without personal instructions.",
    facts: [
      "Acute chest, breathing or neurological signs: call 112",
      "Repeat the measurement correctly if you are stable",
      "Do not improvise medicines or doses",
    ],
    primaryCta: { label: "Chronic-care consultation", href: enHref("/services/boli-cronice-online") },
    secondaryCta: { label: "Open the blood pressure log", href: enHref("/tools/blood-pressure-chart") },
    panelChip: "The right order",
    panelParas: [
      "Warning symptoms take priority over another measurement.",
      "Pain, exertion, anxiety or technique can alter a reading.",
      "A forced rapid fall can be dangerous; treatment is individual.",
    ],
    author: {
      initials: "RB",
      name: "Dr Robert Gabriel Brindus",
      line: "Family medicine specialist · Medical Director, Global Health Romania",
    },
    navLabel: "In this guide",
    sections: [
      {
        id: "first-steps",
        nav: "First steps",
        eyebrow: "After a high reading",
        h2: "What you can do straight away without putting yourself at risk",
        blocks: [
          lead("Stop exerting yourself, sit down and check for symptoms before you repeat the measurement."),
          ul([
            "Support your back, keep both feet on the floor and rest your arm at heart level.",
            "Use a correctly sized cuff on your bare upper arm and do not talk while the monitor is running.",
            "After a few minutes of rest, take two readings a short time apart and write them down.",
            "Record your pulse, symptoms, the time, usual medicines and relevant context such as pain, fever or exertion.",
          ]),
          p("These steps do not treat hypertension. They reduce errors and give a clinician useful information. Do not keep measuring until you see the number you want or record only the lowest result."),
          p("If the reading stays around 180/110 mmHg or higher, seek assessment that day to exclude a hypertensive emergency through family medicine, an out-of-hours centre or an emergency department. If you become worse or a warning sign appears, call 112."),
        ],
      },
      {
        id: "emergency",
        nav: "Call 112",
        eyebrow: "Warning signs",
        h2: "When high blood pressure may accompany an emergency",
        blocks: [
          lead("A hypertensive emergency combines very high blood pressure with acute organ injury. At home, you can recognise warning signs but not confirm the diagnosis."),
          ul([
            "Chest pain or pressure, especially with sweating, nausea or a feeling that you may faint.",
            "Severe breathlessness or rapidly worsening breathing.",
            "A drooping face, weakness or numbness on one side, or slurred speech.",
            "New confusion, a seizure, fainting or loss of consciousness.",
            "Sudden loss of vision or an explosive headache unlike your usual headaches.",
          ]),
          p("Call 112, do not drive and note when symptoms began. Have your medication list ready and follow the dispatcher. A lower second reading does not cancel a possible stroke or heart-attack symptom."),
          warn("Pregnancy and after birth", "A high reading with severe headache, visual changes, pain below the ribs, vomiting, breathlessness or sudden swelling needs urgent obstetric assessment. Pre-eclampsia can also develop after delivery."),
          cite(`Romania’s legal framework for the <a href="${EMERGENCY_112_LAW}" rel="nofollow noopener" target="_blank">national emergency-call system</a> defines 112 as the service that receives calls and alerts the appropriate response.`),
        ],
      },
      {
        id: "medicines",
        nav: "Medicines",
        eyebrow: "No self-medication",
        h2: "There is no universal reading for taking captopril or an extra dose",
        blocks: [
          lead("Captopril and other blood pressure medicines are used according to each person’s history, test results, other conditions and prescribed treatment."),
          p("The same reading can require different decisions in different people. Kidney function, potassium, pregnancy, dehydration and other medicines change the risk. Lowering pressure too quickly may reduce blood flow to the brain, heart or kidneys and cause dizziness or fainting."),
          warn("Do not take an improvised dose", "Do not double your treatment, take unprescribed captopril or use a relative’s medicine. Follow only an action plan written for you; if warning signs are present, call 112."),
          p("Lemon, garlic, vinegar, cold water and herbal teas do not treat a heart attack, stroke or other emergency. Slow breathing may ease anxiety, but a lower reading after rest does not prove the danger has passed. Some herbs interact with medicines."),
        ],
      },
      {
        id: "follow-up",
        nav: "Stable care",
        eyebrow: "After the episode",
        h2: "Repeated high readings are usually managed through family medicine",
        blocks: [
          lead("When you are stable and have no warning signs, family medicine is the usual place to start."),
          p('During a <a href="' + enHref("/services/boli-cronice-online") + '">chronic-care consultation</a>, a doctor can review your technique, <a href="' + enHref("/tools/blood-pressure-chart") + '">blood pressure log</a>, treatment, missed doses and risks. They may recommend blood tests, an ECG, an in-person examination or ambulatory monitoring.'),
          p("Cardiology is a later step for known heart disease, abnormal tests, cardiovascular symptoms, resistant hypertension or a family-medicine referral. It does not replace 112 or need to be the first stop for every isolated high reading."),
          p('For planned care, view the <a href="' + enHref("/doctors") + '">doctors in Romania</a> or <a href="' + enHref("/contact") + '">contact Global Health</a>. These are not emergency services.'),
        ],
      },
      {
        id: "prepare",
        nav: "Prepare for the appointment",
        eyebrow: "What helps",
        h2: "What to have ready for a scheduled consultation",
        blocks: [
          lead("Bring your blood pressure log, a complete medication list and any reports you already have."),
          p("This information helps the doctor decide whether follow-up in family medicine is enough or whether you need tests, an in-person examination or cardiology."),
        ],
      },
    ],
    linksEyebrow: "Global Health Romania",
    linksH2: "Choose the right next step",
    linksLead: "Without warning signs, organise your readings and speak to a doctor. With acute symptoms, call 112.",
    links: [
      { label: "Chronic-care consultation", href: enHref("/services/boli-cronice-online") },
      { label: "Blood pressure log", href: enHref("/tools/blood-pressure-chart") },
      { label: "Doctors in Romania", href: enHref("/doctors") },
      { label: "Contact Global Health", href: enHref("/contact") },
    ],
    ctaBox: {
      h3: "Are your readings repeatedly high, but you feel stable?",
      text: "Book with your log, medicines and symptoms. A family doctor can decide on tests and cardiology involvement.",
      primary: { label: "Book a consultation", href: enHref("/services/boli-cronice-online") },
      secondary: { label: "View doctors", href: enHref("/doctors") },
    },
    sourcesEyebrow: "Medical sources",
    sourcesH2: "Sources for this guide",
    sourcesLead: "These sources separate emergency assessment from long-term treatment and provide no universal dose.",
    sources: [
      { label: "ESC — elevated blood pressure and hypertension", href: ESC_GUIDELINE },
      { label: "Romanian Society of Cardiology — hypertension", href: CARDIOPORTAL_HTA },
      { label: "Romanian Society of Cardiology — measuring blood pressure", href: CARDIOPORTAL_MASURARE },
      { label: "Romanian Legislative Portal — national 112 system", href: EMERGENCY_112_LAW },
      { label: "NHS — pre-eclampsia during pregnancy and after birth", href: NHS_PREECLAMPSIA },
    ],
    sourcesNote: "Individual decisions depend on history, examination, test results and prescribed treatment.",
    faqEyebrow: "Frequently asked questions",
    faqH2: "Questions about lowering blood pressure quickly",
    faqs: [
      { q: "What lowers blood pressure immediately at home?", a: "No remedy is safe for every situation. Check symptoms and, if stable, take two careful readings. Call 112 for chest pain, severe breathlessness or neurological signs." },
      { q: "At what blood pressure should I take captopril?", a: "There is no universal number. Take it only if prescribed and according to your personal plan. Never take an extra dose or unprescribed medicine." },
      { q: "Will lemon, garlic or tea lower blood pressure quickly?", a: "They do not treat an emergency. Rest may coincide with a lower reading but does not cancel serious symptoms; some herbal products interact with medicines." },
      { q: "When is a scheduled consultation enough?", a: "When stable, without warning signs, and repeated high readings need assessment. If a reading remains around 180/110 mmHg or higher, seek same-day assessment through family medicine, an out-of-hours centre or an emergency department; add cardiology for a clinical reason." },
    ],
    disclaimerTitle: "Medical and emergency notice",
    disclaimer:
      "General information, not a diagnosis or treatment schedule. Do not change doses or take unprescribed medicines. Call 112 for chest pain, severe breathlessness, neurological deficits, confusion, fainting or sudden visual changes.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "como-baixar-tensao-alta-seguranca-romenia",
  title: "Como baixar a tensão alta com segurança: o que fazer na Roménia",
  excerpt:
    "Um guia para confirmar uma medição alta, reconhecer sinais que exigem o 112 e evitar captopril extra, comprimidos emprestados e remédios caseiros.",
  seoTitle: "Tensão alta: o que fazer com segurança",
  seoDescription:
    "Saiba repetir uma medição alta, quando ligar 112 na Roménia e porque não deve tomar captopril extra ou remédios caseiros para baixar a tensão.",
  category: "Doenças crónicas",
  article: {
    lang: "pt-RO",
    tagline: "Cuidados de saúde quando e onde precisar",
    categoryLabel: "Doenças crónicas",
    categoryHref: ptHref("/blog"),
    eyebrow: "Roménia · Guia de segurança",
    h1: "Como baixar a tensão alta com segurança",
    deck: "Primeiro confirme se há uma emergência. Depois confirme a medição, sem improvisar comprimidos.",
    intro:
      "Não existe um método caseiro universal e seguro para baixar a tensão arterial imediatamente. Ligue <strong>112</strong> se a medição alta vier acompanhada de <strong>dor no peito, falta de ar intensa, fraqueza ou dormência de um lado, dificuldade em falar, confusão, desmaio, alteração súbita da visão ou dor de cabeça súbita e invulgarmente forte</strong>. Sem estes sinais, sente-se, descanse alguns minutos e repita a medição corretamente. Não tome captopril extra, medicamentos de outra pessoa, comprimidos não prescritos ou sobras de um tratamento antigo sem um plano pessoal dado pelo seu médico.",
    facts: ["Dor no peito ou sinais neurológicos: 112", "Confirme a medição com boa técnica", "Não tome doses extra por iniciativa própria"],
    primaryCta: { label: "Consulta de doenças crónicas", href: ptHref("/services/boli-cronice-online") },
    secondaryCta: { label: "Abrir diário da tensão", href: ptHref("/tools/blood-pressure-chart") },
    panelChip: "A segurança vem primeiro",
    panelParas: [
      "Uma leitura isolada pode estar errada; sintomas agudos nunca devem ser ignorados por causa disso.",
      "Baixar a pressão depressa demais também pode prejudicar o cérebro, o coração e os rins.",
      "Este guia não substitui o 112, a urgência hospitalar nem o plano do médico que conhece o seu historial.",
    ],
    author: { initials: "RB", name: "Dr Robert Gabriel Brindus", line: "Médico de família · Diretor médico, Global Health Roménia" },
    navLabel: "Neste guia",
    sections: [
      {
        id: "primeiros-passos",
        nav: "Primeiros passos",
        eyebrow: "O que fazer agora",
        h2: "Ações seguras depois de uma leitura inesperadamente alta",
        blocks: [
          lead("Pare o esforço, sente-se num local seguro e procure sinais de alarme antes de se concentrar em repetir números."),
          ul([
            "Sente-se com as costas apoiadas, pés no chão e pernas descruzadas; não fale durante a medição.",
            "Apoie o braço à altura do coração e use uma braçadeira de braço com o tamanho adequado.",
            "Faça mais duas leituras com um pequeno intervalo e anote hora, pulso, sintomas e contexto.",
            "Se houver um sinal de alarme, não adie o pedido de ajuda para continuar a medir: ligue 112.",
            "Se estiver estável mas os valores continuarem muito acima do habitual, procure aconselhamento médico no próprio dia.",
          ]),
          p("Estes passos não tratam a hipertensão. Reduzem erros comuns e produzem informação útil. Esforço recente, dor, ansiedade, cafeína, nicotina, falar e uma braçadeira pequena podem elevar temporariamente a leitura. Mesmo assim, não atribua sintomas graves apenas ao stress."),
          warn("Não conduza se estiver muito mal", "Com dor torácica, défice neurológico, confusão, desmaio ou dificuldade respiratória intensa, ligue 112 e siga as instruções do operador."),
        ],
      },
      {
        id: "urgencia",
        nav: "Ligar 112",
        eyebrow: "Sinais de alarme",
        h2: "Quando uma tensão muito alta exige o 112",
        blocks: [
          lead("Uma leitura perto ou acima de 180/110 mmHg é muito elevada e precisa de avaliação para excluir uma emergência hipertensiva; com sintomas de lesão aguda, ligue 112."),
          p("Não espere que um chá, um duche ou um comprimido improvisado faça efeito quando os sintomas podem indicar AVC, enfarte ou líquido nos pulmões. Diga ao operador o valor, os sintomas, a hora de início, os medicamentos prescritos e as doenças conhecidas."),
          ul([
            "Dor ou pressão no peito, sobretudo com suor, náusea ou mal-estar intenso.",
            "Falta de ar grave ou respiração que piora rapidamente.",
            "Face descaída, fraqueza de um lado ou fala arrastada.",
            "Confusão nova, convulsão, desmaio ou perda de consciência.",
            "Perda súbita de visão ou dor de cabeça explosiva e diferente do habitual.",
          ]),
          p("Gravidez ou pós-parto, doença renal, AVC anterior e doença cardíaca aumentam a preocupação. Não tente diagnosticar uma emergência só pelo número, mas também não deixe uma segunda leitura ligeiramente menor anular sintomas sérios."),
          cite(`Na Roménia, o contacto de emergência é o <a href="${EMERGENCY_112}" rel="nofollow noopener" target="_blank">112</a>. As orientações europeias distinguem pressão muito elevada sem lesão aguda da emergência com lesão de órgão.`),
        ],
      },
      {
        id: "medicamentos",
        nav: "Captopril",
        eyebrow: "A pergunta do comprimido",
        h2: "Captopril não é uma resposta automática a um número",
        blocks: [
          lead("Não há um valor universal a partir do qual todas as pessoas devam tomar captopril."),
          p("A decisão de tomar este medicamento sujeito a receita depende do diagnóstico, função renal, potássio, gravidez, outros tratamentos e plano individual. A mesma leitura pode exigir decisões diferentes em duas pessoas. Uma queda forçada e demasiado rápida pode reduzir o fluxo de sangue para cérebro, coração e rins."),
          warn("Não tome captopril extra nem captopril que não lhe foi prescrito", "Não peça um comprimido emprestado, não duplique o tratamento habitual e não repita uma toma porque o monitor não mudou depressa. Siga apenas o plano escrito que o seu médico preparou para si."),
          p("Uma toma esquecida, uma alteração recente ou um possível efeito adverso exigem aconselhamento do médico ou farmacêutico. Um artigo geral não pode dizer como compensar uma omissão. Se houver sinais de emergência, ligar 112 tem prioridade sobre procurar uma pastilha que prometa baixar o valor."),
        ],
      },
      {
        id: "mitos",
        nav: "Mitos",
        eyebrow: "Soluções rápidas",
        h2: "Chá, limão, alho e respiração não tratam uma emergência",
        blocks: [
          lead("Alguns hábitos ajudam a saúde cardiovascular a longo prazo. Nenhum substitui avaliação quando há sintomas ou uma leitura muito elevada."),
          p("Uma infusão sem cafeína e respirar devagar podem ajudar a acalmar, mas uma leitura menor depois do repouso não prova que o risco acabou. Limão, alho, vinagre ou água fria não dilatam os vasos de imediato. Algumas plantas e suplementos podem interagir com medicamentos; pergunte ao médico ou farmacêutico."),
          ul([
            "Nunca adie o 112 para experimentar uma receita da internet.",
            "Não misture suplementos e medicamentos para forçar uma descida.",
            "Não pare o tratamento diário porque uma leitura melhorou.",
            "Não use o medicamento de um familiar, mesmo com o mesmo diagnóstico.",
            "Discuta sal, sono, exercício, álcool e peso como medidas de fundo, não como socorro imediato.",
          ]),
          p("Siga esta ordem: verifique se há uma emergência, confirme se a medição é fiável e consulte o seu plano pessoal. Assim evita pânico desnecessário e atrasos perigosos."),
        ],
      },
      {
        id: "seguimento",
        nav: "Seguimento",
        eyebrow: "Depois do episódio",
        h2: "Registe o padrão e escolha o nível certo de cuidados",
        blocks: [
          lead("Um diário curto e exato vale mais do que muitas medições seguidas em pânico."),
          p(`Use o <a href="${ptHref("/tools/blood-pressure-chart")}">diário da tensão arterial</a> para guardar hora, braço, postura, pulso, sintomas, tratamento prescrito e fatores como dor, febre ou falta de sono. Registe todas as leituras, não apenas a mais alta.`),
          p(`Sem sinais de alarme, uma <a href="${ptHref("/services/boli-cronice-online")}">consulta online de doenças crónicas</a> pode rever o diário e a medicação, decidir se são necessárias análises, ECG ou avaliação presencial e indicar quando a cardiologia é apropriada.`),
          ul([
            "Prepare a lista de todos os medicamentos, descongestionantes, anti-inflamatórios e suplementos.",
            "Diga se falhou o tratamento, mas não tente compensar sem aconselhamento.",
            "Pergunte que valores exigem contacto no próprio dia no seu plano pessoal.",
            "Use a consulta programada apenas quando está estável; sinais agudos continuam a exigir 112.",
          ]),
          p(`Consulte os <a href="${ptHref("/doctors")}">médicos da Global Health Roménia</a> ou use a <a href="${ptHref("/contact")}">página de contacto</a> para ajuda com a marcação. Estes canais não respondem a emergências.`),
        ],
      },
    ],
    linksEyebrow: "Global Health Roménia",
    linksH2: "Escolha o passo certo para a situação",
    linksLead: "Sem sinais de emergência, organize as leituras e discuta o padrão. Com sinais de alarme, ligue 112.",
    links: [
      { label: "Consulta online de doenças crónicas", href: ptHref("/services/boli-cronice-online") },
      { label: "Diário da tensão arterial", href: ptHref("/tools/blood-pressure-chart") },
      { label: "Médicos na Roménia", href: ptHref("/doctors") },
      { label: "Contactar Global Health", href: ptHref("/contact") },
    ],
    ctaBox: { h3: "Leituras altas repetidas, sem sinais de alarme?", text: "Marque uma avaliação com o diário, a lista de medicamentos e os sintomas. O médico pode definir monitorização, análises ou encaminhamento.", primary: { label: "Marcar consulta", href: ptHref("/services/boli-cronice-online") }, secondary: { label: "Ver médicos", href: ptHref("/doctors") } },
    sourcesEyebrow: "Fontes clínicas",
    sourcesH2: "Referências deste guia",
    sourcesLead: "As fontes separam triagem de emergência do controlo de hipertensão a longo prazo.",
    sources: [
      { label: "ESC — Pressão elevada e hipertensão", href: ESC_GUIDELINE },
      { label: "Sociedade Romena de Cardiologia — hipertensão", href: CARDIOPORTAL_HTA },
      { label: "Serviço 112 da Roménia", href: EMERGENCY_112 },
    ],
    sourcesNote: "As decisões individuais dependem do historial, exame, análises e tratamento prescrito de cada pessoa.",
    faqEyebrow: "Perguntas frequentes",
    faqH2: "Dúvidas sobre baixar rapidamente a tensão",
    faqs: [
      { q: "O que baixa a tensão imediatamente em casa?", a: "Não existe um remédio caseiro seguro para todas as situações. Sente-se, procure sinais de alarme, repita corretamente a medição e siga o seu plano. Com dor no peito, falta de ar intensa ou alterações neurológicas, ligue 112." },
      { q: "A partir de que tensão devo tomar captopril?", a: "Não existe um número universal. Captopril é sujeito a receita e depende do seu historial e plano. Nunca tome captopril extra ou não prescrito." },
      { q: "Posso tomar outro comprimido se não baixar?", a: "Não sem instruções explícitas do seu médico. Duplicar ou combinar tratamentos pode causar uma descida perigosa. Procure aconselhamento; com sinais de alarme, ligue 112." },
      { q: "Limão ou chá baixam a tensão depressa?", a: "Não tratam uma emergência. O repouso pode coincidir com uma leitura menor, mas não elimina sintomas graves. Algumas plantas também interagem com medicamentos." },
      { q: "Quando posso marcar consulta em vez de ligar 112?", a: "Quando está estável, sem sinais de alarme, e precisa de avaliar leituras repetidamente altas. Uma consulta marcada nunca substitui cuidados de emergência." },
    ],
    disclaimerTitle: "Aviso médico e de emergência",
    disclaimer: "Informação geral, não diagnóstico ou esquema terapêutico. Não tome medicamentos extra ou não prescritos. Perante dor no peito, falta de ar grave, défice neurológico, confusão, desmaio, alteração súbita da visão ou dor de cabeça súbita e intensa, ligue 112.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "como-bajar-tension-alta-seguridad-rumania",
  title: "Cómo bajar la tensión alta con seguridad: qué hacer en Rumanía",
  excerpt: "Cómo repetir una lectura alta, reconocer síntomas para llamar al 112 y evitar captopril extra, pastillas prestadas y remedios rápidos inseguros.",
  seoTitle: "Tensión alta: qué hacer con seguridad",
  seoDescription: "Aprende a repetir una lectura alta, cuándo llamar al 112 en Rumanía y por qué no debes tomar captopril extra ni remedios caseros.",
  category: "Enfermedades crónicas",
  article: {
    lang: "es-RO", tagline: "Atención médica cuando y donde la necesites", categoryLabel: "Enfermedades crónicas", categoryHref: esHref("/blog"),
    eyebrow: "Rumanía · Guía de seguridad", h1: "Cómo bajar la tensión alta con seguridad", deck: "Comprueba primero si hay una emergencia y después confirma la medición. No improvises medicación.",
    intro: "No hay un truco casero universal y seguro que baje la tensión de inmediato. Llama al <strong>112</strong> si la lectura alta aparece con <strong>dolor en el pecho, falta de aire intensa, debilidad o entumecimiento de un lado, dificultad para hablar, confusión, desmayo, cambio brusco de visión o dolor de cabeza repentino e inusual</strong>. Sin estas señales, siéntate, descansa unos minutos y repite bien la medición. No tomes captopril extra, pastillas de otra persona, medicación no prescrita ni restos de tratamientos antiguos sin un plan personal indicado por tu médico.",
    facts: ["Dolor torácico o síntomas neurológicos: 112", "Repite la lectura con técnica correcta", "No improvises una dosis adicional"],
    primaryCta: { label: "Consulta de crónicos", href: esHref("/services/boli-cronice-online") }, secondaryCta: { label: "Abrir registro de tensión", href: esHref("/tools/blood-pressure-chart") },
    panelChip: "Primero, seguridad", panelParas: ["Una lectura aislada puede ser inexacta; los síntomas agudos nunca deben ignorarse.", "Forzar una bajada rápida también puede dañar cerebro, corazón y riñones.", "Esta guía no sustituye al 112, urgencias ni el plan de quien conoce tu historia clínica."],
    author: { initials: "RB", name: "Dr Robert Gabriel Brindus", line: "Médico de familia · Director médico, Global Health Rumanía" }, navLabel: "En esta guía",
    sections: [
      { id: "ahora", nav: "Primeros pasos", eyebrow: "Qué hacer ahora", h2: "Acciones seguras tras una lectura inesperadamente alta", blocks: [
        lead("Detén el esfuerzo, siéntate en un lugar seguro y busca señales de alarma antes de seguir mirando números."),
        ul(["Apoya la espalda, deja los pies planos y no cruces las piernas ni hables al medir.", "Apoya el brazo a la altura del corazón y usa un manguito de brazo del tamaño correcto.", "Haz dos lecturas más separadas por un breve intervalo y anota hora, pulso, síntomas y contexto.", "Si aparece una señal de alarma, no retrases la llamada por seguir midiendo: llama al 112.", "Si estás estable pero las cifras siguen muy por encima de lo habitual, pide consejo médico ese mismo día."]),
        p("Estos pasos no son un tratamiento. Reducen errores y generan datos útiles. Ejercicio, dolor, ansiedad, cafeína, nicotina, hablar o un manguito pequeño pueden elevar temporalmente la lectura. Aun así, nunca des por hecho que un síntoma grave es solo estrés."),
        warn("No conduzcas si te encuentras muy mal", "Ante dolor torácico, un déficit neurológico, confusión, desmayo o dificultad respiratoria intensa, llama al 112 y sigue las instrucciones."),
      ] },
      { id: "emergencia", nav: "Llamar al 112", eyebrow: "Señales de alarma", h2: "Cuándo una tensión muy alta exige llamar al 112", blocks: [
        lead("Una lectura cercana o superior a 180/110 mmHg es muy alta y requiere valoración para descartar una emergencia hipertensiva; si hay síntomas de daño agudo, llame al 112."),
        p("No esperes a que funcionen un té, una ducha o una pastilla improvisada cuando podría tratarse de un ictus, un infarto o edema pulmonar. Explica al operador el valor, los síntomas, la hora de inicio, tu medicación prescrita y enfermedades conocidas."),
        ul(["Dolor o presión en el pecho, especialmente con sudor, náusea o malestar intenso.", "Falta de aire grave o que empeora rápidamente.", "Cara caída, debilidad de un lado o habla arrastrada.", "Confusión nueva, convulsión, desmayo o pérdida de conciencia.", "Pérdida brusca de visión o dolor de cabeza explosivo y distinto del habitual."]),
        p("El embarazo o posparto, la enfermedad renal, un ictus previo y la cardiopatía aumentan la preocupación. No diagnostiques una emergencia solo por la cifra, pero tampoco permitas que una segunda lectura algo menor invalide síntomas serios."),
        cite(`En Rumanía, el número de emergencias es el <a href="${EMERGENCY_112}" rel="nofollow noopener" target="_blank">112</a>. Las guías europeas distinguen cifras muy altas sin lesión aguda de la emergencia con daño orgánico.`),
      ] },
      { id: "captopril", nav: "Captopril", eyebrow: "La pregunta de la pastilla", h2: "No existe una cifra universal para tomar captopril", blocks: [
        lead("El captopril es un medicamento sujeto a prescripción, no una respuesta automática cuando el tensiómetro supera un número."),
        p("Su idoneidad depende del diagnóstico, la función renal, el potasio, el embarazo, otros fármacos y el plan clínico individual. La misma cifra puede requerir actuaciones distintas en dos personas. Bajar la presión de forma demasiado brusca puede reducir el flujo de sangre al cerebro, corazón o riñones."),
        warn("No tomes captopril extra ni captopril que no te hayan recetado", "No uses el de otra persona, no dupliques el tratamiento habitual ni repitas una pastilla porque la cifra no cambió rápido. Sigue únicamente el plan personal escrito por tu médico."),
        p("Una dosis olvidada, un cambio reciente o una posible reacción adversa requieren consejo del médico o farmacéutico. Un artículo general no puede decir cómo compensar una omisión. Con síntomas de emergencia, llamar al 112 importa más que buscar una pastilla que prometa bajar el número."),
      ] },
      { id: "mitos", nav: "Mitos", eyebrow: "Soluciones rápidas", h2: "El té, el limón, el ajo o respirar lento no tratan una emergencia", blocks: [
        lead("Algunos hábitos ayudan a largo plazo, pero ninguno sustituye una valoración ante síntomas o una lectura muy alta."),
        p("Una infusión sin cafeína o respirar despacio puede ayudarte a calmarte. Una cifra menor tras descansar no demuestra que el riesgo haya desaparecido. Limón, ajo, vinagre o agua fría no dilatan los vasos de inmediato. Algunas plantas y suplementos pueden interactuar con medicamentos; consulte al médico o farmacéutico."),
        ul(["No retrases el 112 para probar un remedio de internet.", "No combines suplementos y medicación para forzar una bajada.", "No abandones el tratamiento diario porque una lectura mejoró.", "No tomes la medicación de un familiar aunque comparta diagnóstico.", "Habla de sal, sueño, ejercicio, alcohol y peso como medidas a largo plazo, no como rescate."]),
        p("Sigue este orden: comprueba si hay una emergencia, confirma que la medición sea fiable y consulta tu plan personal. Así evitas el pánico y una demora peligrosa."),
      ] },
      { id: "seguimiento", nav: "Seguimiento", eyebrow: "Después del episodio", h2: "Registra el patrón y elige el nivel de atención adecuado", blocks: [
        lead("Un registro breve y exacto aporta más información que muchas mediciones consecutivas hechas con ansiedad."),
        p(`Utiliza el <a href="${esHref("/tools/blood-pressure-chart")}">registro de tensión arterial</a> para guardar hora, brazo, postura, pulso, síntomas, tratamiento habitual y factores como dolor, fiebre o mal sueño. Conserva todas las lecturas.`),
        p(`Sin señales de alarma, una <a href="${esHref("/services/boli-cronice-online")}">consulta online de enfermedades crónicas</a> puede revisar el registro y la medicación y decidir si necesitas análisis, ECG, valoración presencial o cardiología.`),
        ul(["Prepara la lista completa de medicación, descongestionantes, antiinflamatorios y suplementos.", "Cuenta si olvidaste el tratamiento, pero no lo compenses por tu cuenta.", "Pregunta qué cifras requieren contacto ese mismo día en tu plan personal.", "Usa la consulta programada solo si estás estable; los síntomas agudos exigen 112."]),
        p(`Consulta <a href="${esHref("/doctors")}">nuestros médicos en Rumanía</a> o la <a href="${esHref("/contact")}">página de contacto</a> para ayuda con la reserva. No son canales de emergencias.`),
      ] },
    ],
    linksEyebrow: "Global Health Rumanía", linksH2: "Elige un siguiente paso adecuado", linksLead: "Sin síntomas de emergencia, organiza las lecturas y consulta el patrón. Con señales de alarma, llama al 112.",
    links: [{ label: "Consulta online de crónicos", href: esHref("/services/boli-cronice-online") }, { label: "Registro de tensión arterial", href: esHref("/tools/blood-pressure-chart") }, { label: "Médicos en Rumanía", href: esHref("/doctors") }, { label: "Contacto Global Health", href: esHref("/contact") }],
    ctaBox: { h3: "¿Lecturas altas repetidas sin señales de alarma?", text: "Reserva una valoración con el registro, los síntomas y la lista de medicación. El médico puede indicar monitorización, pruebas o derivación.", primary: { label: "Reservar consulta", href: esHref("/services/boli-cronice-online") }, secondary: { label: "Ver médicos", href: esHref("/doctors") } },
    sourcesEyebrow: "Fuentes clínicas", sourcesH2: "Referencias utilizadas", sourcesLead: "Estas fuentes separan la emergencia de la atención crónica y no establecen una pauta farmacológica universal.",
    sources: [{ label: "ESC — Presión elevada e hipertensión", href: ESC_GUIDELINE }, { label: "Sociedad Rumana de Cardiología — hipertensión", href: CARDIOPORTAL_HTA }, { label: "Servicio 112 de Rumanía", href: EMERGENCY_112 }], sourcesNote: "Las decisiones individuales dependen de la historia clínica, exploración, pruebas y tratamiento prescrito.",
    faqEyebrow: "Preguntas frecuentes", faqH2: "Dudas sobre bajar la tensión rápidamente", faqs: [
      { q: "¿Qué baja la tensión inmediatamente en casa?", a: "No hay un remedio doméstico seguro para todos. Siéntate, revisa síntomas, repite bien la medición y sigue tu plan. Ante dolor torácico, falta de aire grave o alteraciones neurológicas, llama al 112." },
      { q: "¿A partir de qué tensión se toma captopril?", a: "No existe una cifra universal. Es un medicamento con receta y depende de tu historia y plan. Nunca tomes captopril extra ni captopril que no te hayan recetado." },
      { q: "¿Puedo tomar otra pastilla si no baja?", a: "No sin instrucciones explícitas de tu médico. Duplicar o combinar tratamientos puede provocar una bajada peligrosa. Busca consejo; con señales de alarma, llama al 112." },
      { q: "¿El limón o una infusión la bajan rápido?", a: "No tratan una emergencia. Descansar puede coincidir con una lectura menor, pero no anula síntomas graves. Algunas plantas interactúan con medicamentos." },
      { q: "¿Cuándo puedo reservar consulta en vez de llamar al 112?", a: "Cuando estés estable, sin señales de alarma, y necesites evaluar lecturas altas repetidas. La consulta programada nunca sustituye urgencias." },
    ],
    disclaimerTitle: "Aviso médico y de emergencias", disclaimer: "Información general, no diagnóstico ni pauta. No tomes medicación extra o no prescrita. Ante dolor torácico, falta de aire grave, déficit neurológico, confusión, desmayo, cambio brusco de visión o cefalea súbita intensa, llama al 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "jak-bezpecne-snizit-vysoky-tlak-rumunsko",
  title: "Jak bezpečně snížit vysoký tlak: co dělat v Rumunsku",
  excerpt: "Jak ověřit vysokou hodnotu, kdy v Rumunsku volat 112 a proč bez pokynu lékaře neužívat další captopril, cizí tablety ani domácí prostředky.",
  seoTitle: "Vysoký tlak: bezpečný postup v Rumunsku",
  seoDescription: "Zjistěte, jak správně přeměřit vysoký tlak, kdy volat 112 a proč neužívat další captopril ani domácí prostředky bez pokynu lékaře.",
  category: "Chronická onemocnění",
  article: {
    lang: "cs-RO", tagline: "Zdravotní péče kdykoli a kdekoli", categoryLabel: "Chronická onemocnění", categoryHref: csHref("/blog"),
    eyebrow: "Rumunsko · Bezpečnostní průvodce", h1: "Jak bezpečně snížit vysoký krevní tlak", deck: "Nejprve rozhodněte, zda jde o akutní stav. Potom ověřte měření — bez improvizace s léky.",
    intro: "Neexistuje univerzální bezpečný domácí trik, který okamžitě sníží krevní tlak. Volejte <strong>112</strong>, pokud se k vysoké hodnotě přidá <strong>bolest na hrudi, těžká dušnost, slabost nebo necitlivost jedné strany, porucha řeči, zmatenost, mdloba, náhlá změna vidění nebo náhlá neobvykle silná bolest hlavy</strong>. Bez těchto příznaků se posaďte, několik minut odpočívejte a tlak správně přeměřte. Neberte další captopril, cizí tabletu, nepředepsaný přípravek ani zbytek staré léčby, pokud pro tuto situaci nemáte osobní plán od svého lékaře.",
    facts: ["Bolest na hrudi či neurologické příznaky: 112", "Hodnotu ověřte správnou technikou", "Bez pokynu nepřidávejte léky"],
    primaryCta: { label: "Konzultace chronických potíží", href: csHref("/services/boli-cronice-online") }, secondaryCta: { label: "Otevřít deník tlaku", href: csHref("/tools/blood-pressure-chart") },
    panelChip: "Nejdříve bezpečnost", panelParas: ["Jediná hodnota může být nepřesná, akutní příznaky však nelze přehlížet.", "Příliš prudký pokles může omezit prokrvení mozku, srdce a ledvin.", "Text nenahrazuje linku 112, urgentní příjem ani osobní plán vašeho lékaře."],
    author: { initials: "RB", name: "Dr Robert Gabriel Brindus", line: "Praktický lékař · Medicínský ředitel Global Health Rumunsko" }, navLabel: "V tomto průvodci",
    sections: [
      { id: "prvni-kroky", nav: "První kroky", eyebrow: "Co udělat nyní", h2: "Bezpečný postup po nečekaně vysokém výsledku", blocks: [
        lead("Přerušte námahu, bezpečně se posaďte a ještě před dalším měřením zkontrolujte varovné příznaky."),
        ul(["Opřete záda, položte chodidla na zem, nekřižte nohy a během měření nemluvte.", "Podepřete paži ve výši srdce a použijte pažní manžetu správné velikosti.", "Proveďte další dvě měření s krátkým odstupem a zapište čas, puls, příznaky a okolnosti.", "Při varovném příznaku neodkládejte pomoc dalším opakovaným měřením. Volejte 112.", "Jste-li stabilní, ale hodnoty zůstávají výrazně nad vaším obvyklým rozmezím, požádejte ještě tentýž den o lékařskou radu."]),
        p("Tyto kroky nejsou léčbou hypertenze. Omezují běžné chyby a poskytují údaje pro bezpečné rozhodnutí. Námaha, bolest, úzkost, kofein, nikotin, mluvení nebo malá manžeta mohou výsledek dočasně zvýšit. Závažné nové příznaky však nikdy automaticky nepřipisujte stresu."),
        p("Neměřte tlak desetkrát za sebou a nevybírejte jen nejnižší číslo. Opakované kontrolování zvyšuje úzkost a ztěžuje interpretaci. Důležitější je omezený počet správně provedených měření, přesný čas začátku příznaků a informace o běžně předepsané léčbě."),
        warn("Při akutních potížích sami neřiďte", "Při bolesti na hrudi, nové neurologické poruše, zmatenosti, mdlobě nebo těžké dušnosti volejte 112 a postupujte podle pokynů dispečera."),
      ] },
      { id: "pohotovost", nav: "Volat 112", eyebrow: "Varovné příznaky", h2: "Kdy je vysoký tlak důvodem k volání 112", blocks: [
        lead("Hodnota okolo nebo nad 180/110 mmHg je velmi vysoká a vyžaduje posouzení k vyloučení hypertenzní emergentní situace; při příznacích akutního orgánového poškození volejte 112."),
        p("Nečekejte na účinek čaje, sprchy nebo improvizované tablety, pokud příznaky mohou znamenat cévní mozkovou příhodu, infarkt nebo tekutinu v plicích. Dispečerovi sdělte naměřené hodnoty, příznaky, čas jejich začátku, předepsané léky a známé diagnózy. Pokud je s vámi někdo další, ať zůstane nablízku a připraví seznam léků."),
        ul(["Bolest či tlak na hrudi, zejména s pocením, nevolností nebo pocitem na omdlení.", "Těžká dušnost, pocit dušení nebo rychlé zhoršování dechu.", "Pokles koutku, slabost jedné strany, nesrozumitelná řeč nebo porucha porozumění.", "Nová zmatenost, křeče, mdloba nebo ztráta vědomí.", "Náhlá ztráta zraku nebo explozivní bolest hlavy odlišná od obvyklých bolestí."]),
        p("Těhotenství a období po porodu, onemocnění ledvin, prodělaná cévní příhoda a srdeční onemocnění zvyšují naléhavost. Emergentní stav nelze určit jen podle čísla, ale mírně nižší druhé měření také nesmí vést k přehlédnutí závažných příznaků."),
        cite(`V Rumunsku je číslem tísňového volání <a href="${EMERGENCY_112}" rel="nofollow noopener" target="_blank">112</a>. Evropská doporučení odlišují velmi vysoký tlak bez akutního poškození od hypertenzního emergentního stavu s orgánovým poškozením.`),
      ] },
      { id: "captopril", nav: "Captopril", eyebrow: "Otázka tablety", h2: "Pro captopril neexistuje univerzální hraniční hodnota", blocks: [
        lead("Captopril je lék na předpis, nikoli automatická první pomoc po překročení určitého čísla na tonometru."),
        p("Vhodnost závisí na diagnóze, funkci ledvin, hladině draslíku, těhotenství, dalších lécích a osobním plánu. Stejná hodnota může vyžadovat u dvou lidí rozdílný postup. Příliš rychlé snížení tlaku může omezit přívod krve do mozku, srdce či ledvin a způsobit závratě, kolaps nebo jiné komplikace."),
        warn("Neberte další ani nepředepsaný captopril", "Nepůjčujte si jej, nezdvojujte běžnou léčbu a neopakujte tabletu jen proto, že se číslo rychle nezměnilo. Máte-li od lékaře písemný akční plán, držte se přesně jeho podmínek."),
        p("Vynechanou dávku, nedávnou změnu léčby nebo podezření na nežádoucí účinek řešte s lékařem či lékárníkem. Obecný článek nemůže určit, jak vynechání nahradit. Při akutních příznacích má volání 112 přednost před hledáním tablety, která slibuje rychlý pokles."),
      ] },
      { id: "myty", nav: "Mýty", eyebrow: "Rychlá řešení", h2: "Čaj, citron, česnek ani dýchání neléčí akutní stav", blocks: [
        lead("Některé návyky podporují kardiovaskulární zdraví dlouhodobě. Žádný z nich nenahrazuje vyšetření při varovných příznacích."),
        p("Bezkofeinový nálev nebo pomalé dýchání mohou pomoci se zklidnit, ale nižší hodnota po odpočinku nedokazuje, že riziko pominulo. Citron, česnek, ocet ani studená voda cévy okamžitě neuvolní. Některé byliny a doplňky mohou ovlivňovat léky; poraďte se s lékařem nebo lékárníkem."),
        ul(["Neodkládejte volání 112 kvůli internetovému receptu.", "Nekombinujte doplňky a léky, abyste vynutili pokles.", "Nevysazujte každodenní léčbu po jedné lepší hodnotě.", "Neužívejte lék příbuzného ani při stejné diagnóze.", "Sůl, spánek, pohyb, alkohol a hmotnost řešte jako dlouhodobá témata, ne jako okamžitou záchranu."]),
        p("Postupujte v tomto pořadí: zkontrolujte, zda nejde o emergentní stav, ověřte spolehlivost měření a podívejte se do svého osobního plánu. Tím omezíte zbytečnou paniku i nebezpečný odklad."),
      ] },
      { id: "sledovani", nav: "Další péče", eyebrow: "Po epizodě", h2: "Zapište průběh a zvolte správnou úroveň péče", blocks: [
        lead("Krátký a přesný záznam je užitečnější než řada měření provedených v panice."),
        p(`Do <a href="${csHref("/tools/blood-pressure-chart")}">deníku krevního tlaku</a> uložte čas, paži, polohu, puls, příznaky, běžnou léčbu a okolnosti jako bolest, horečka nebo nedostatek spánku. Zapište všechny výsledky, nejen nejvyšší.`),
        p(`Bez varovných příznaků lze při <a href="${csHref("/services/boli-cronice-online")}">online konzultaci chronických onemocnění</a> zhodnotit deník, předepsané léky a rizika a rozhodnout o laboratorních testech, EKG, osobním vyšetření nebo kardiologii.`),
        ul(["Připravte úplný seznam léků včetně dekongestiv, protizánětlivých přípravků a doplňků.", "Uveďte vynechanou léčbu, ale sami ji nenahrazujte.", "Zeptejte se, které budoucí hodnoty vyžadují kontakt tentýž den.", "Plánovanou konzultaci použijte jen ve stabilním stavu; akutní příznaky patří na 112."]),
        p(`Profily najdete na stránce <a href="${csHref("/doctors")}">Naši lékaři</a>; s objednáním pomůže <a href="${csHref("/contact")}">kontakt Global Health Rumunsko</a>. Tyto kanály nejsou tísňovou službou.`),
      ] },
    ],
    linksEyebrow: "Global Health Rumunsko", linksH2: "Zvolte další krok podle situace", linksLead: "Bez akutních příznaků uspořádejte záznamy a poraďte se s lékařem. S varovnými příznaky volejte 112.",
    links: [{ label: "Online péče o chronické potíže", href: csHref("/services/boli-cronice-online") }, { label: "Deník krevního tlaku", href: csHref("/tools/blood-pressure-chart") }, { label: "Lékaři v Rumunsku", href: csHref("/doctors") }, { label: "Kontakt Global Health", href: csHref("/contact") }],
    ctaBox: { h3: "Opakovaně vysoké hodnoty bez varovných příznaků?", text: "Objednejte se se záznamem, seznamem léků a popisem příznaků. Lékař určí další měření, vyšetření či doporučení.", primary: { label: "Objednat konzultaci", href: csHref("/services/boli-cronice-online") }, secondary: { label: "Zobrazit lékaře", href: csHref("/doctors") } },
    sourcesEyebrow: "Klinické zdroje", sourcesH2: "Podklady tohoto průvodce", sourcesLead: "Zdroje oddělují akutní třídění od dlouhodobé léčby a nepředkládají univerzální lékový postup.",
    sources: [{ label: "ESC — Zvýšený tlak a hypertenze", href: ESC_GUIDELINE }, { label: "Rumunská kardiologická společnost — hypertenze", href: CARDIOPORTAL_HTA }, { label: "Rumunská tísňová linka 112", href: EMERGENCY_112 }], sourcesNote: "Individuální rozhodnutí závisí na anamnéze, vyšetření, laboratorních výsledcích a předepsané léčbě.",
    faqEyebrow: "Časté otázky", faqH2: "Otázky k rychlému snížení tlaku", faqs: [
      { q: "Co doma okamžitě sníží krevní tlak?", a: "Neexistuje domácí prostředek bezpečný pro každého. Posaďte se, zkontrolujte příznaky, správně přeměřte a držte se osobního plánu. Při bolesti na hrudi, těžké dušnosti nebo neurologických příznacích volejte 112." },
      { q: "Od jakého tlaku se bere captopril?", a: "Univerzální číslo neexistuje. Jde o lék na předpis a rozhoduje váš stav a plán. Nikdy neberte další ani nepředepsaný captopril." },
      { q: "Mohu si vzít další tabletu, když tlak neklesá?", a: "Ne bez výslovného pokynu vlastního lékaře. Zdvojení nebo kombinace může způsobit nebezpečný pokles. Vyžádejte si radu; při varovných příznacích volejte 112." },
      { q: "Sníží tlak rychle citron nebo bylinný čaj?", a: "Neléčí akutní stav. Odpočinek může doprovázet nižší druhé měření, ale neruší závažné příznaky. Některé byliny také interagují s léky." },
      { q: "Kdy stačí objednaná konzultace?", a: "Když jste stabilní, bez varovných příznaků a potřebujete zhodnotit opakovaně vysoké hodnoty. Plánovaná péče nikdy nenahrazuje pohotovost." },
    ],
    disclaimerTitle: "Zdravotní a tísňové upozornění", disclaimer: "Jde o obecné informace, nikoli diagnózu či léčebné schéma. Neupravujte si léky a neberte nepředepsané přípravky. Při bolesti na hrudi, těžké dušnosti, neurologické poruše, zmatenosti, mdlobě, náhlé změně zraku nebo náhlé silné bolesti hlavy volejte 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "blutdruck-sicher-senken-rumaenien",
  title: "Hohen Blutdruck sicher senken: Was Sie in Rumänien tun sollten",
  excerpt: "So prüfen Sie einen hohen Messwert, erkennen 112-Warnzeichen und vermeiden zusätzliches Captopril, fremde Tabletten und ungeeignete Hausmittel.",
  seoTitle: "Hoher Blutdruck: sicher handeln in Rumänien",
  seoDescription: "Erfahren Sie, wie Sie hohen Blutdruck nachmessen, wann Sie in Rumänien 112 rufen und warum zusätzliches Captopril oder Hausmittel riskant sind.",
  category: "Chronische Erkrankungen",
  article: {
    lang: "de-RO", tagline: "Medizinische Versorgung jederzeit und überall", categoryLabel: "Chronische Erkrankungen", categoryHref: deHref("/blog"), eyebrow: "Rumänien · Sicherheitsleitfaden",
    h1: "Hohen Blutdruck jetzt sicher einordnen", deck: "Prüfen Sie zuerst auf einen Notfall und danach die Messung. Beginnen Sie nicht mit einer improvisierten Tablette.",
    intro: "Es gibt kein universell sicheres Hausmittel, das den Blutdruck sofort senkt. Rufen Sie <strong>112</strong>, wenn ein hoher Wert mit <strong>Brustschmerz, schwerer Atemnot, einseitiger Schwäche oder Taubheit, Sprachstörung, Verwirrtheit, Ohnmacht, plötzlicher Sehstörung oder einem plötzlich einsetzenden ungewöhnlich starken Kopfschmerz</strong> auftritt. Ohne diese Warnzeichen setzen Sie sich hin, ruhen einige Minuten und messen korrekt nach. Nehmen Sie kein zusätzliches Captopril, keine fremde Tablette, kein nicht verordnetes Medikament und keine Reste einer früheren Behandlung ohne persönlichen ärztlichen Plan.",
    facts: ["Brust-, Atem- oder neurologische Warnzeichen: 112", "Messwert mit korrekter Technik prüfen", "Keine zusätzlichen Medikamente auf eigene Faust"],
    primaryCta: { label: "Sprechstunde für chronische Erkrankungen", href: deHref("/services/boli-cronice-online") }, secondaryCta: { label: "Blutdruckprotokoll öffnen", href: deHref("/tools/blood-pressure-chart") },
    panelChip: "Sicherheit vor der Zahl", panelParas: ["Ein Einzelwert kann ungenau sein; akute Symptome dürfen dennoch nie übergangen werden.", "Ein zu schneller, erzwungener Blutdruckabfall kann Gehirn, Herz und Nieren gefährden.", "Dieser Text ersetzt weder 112 noch Notaufnahme oder persönlichen Behandlungsplan."],
    author: { initials: "RB", name: "Dr Robert Gabriel Brindus", line: "Facharzt für Allgemeinmedizin · Medizinischer Leiter, Global Health Rumänien" }, navLabel: "In diesem Leitfaden",
    sections: [
      { id: "erste-schritte", nav: "Erste Schritte", eyebrow: "Was jetzt zu tun ist", h2: "Sichere Schritte nach einem unerwartet hohen Messwert", blocks: [
        lead("Beenden Sie Anstrengung, setzen Sie sich sicher hin und achten Sie vor weiteren Messungen auf Warnsymptome."),
        ul(["Lehnen Sie den Rücken an, stellen Sie beide Füße flach auf den Boden und sprechen Sie während der Messung nicht.", "Stützen Sie den Arm auf Herzhöhe und verwenden Sie eine passende Oberarmmanschette.", "Messen Sie nach kurzer Pause zweimal und notieren Sie Uhrzeit, Puls, Beschwerden und Umstände.", "Bei Warnzeichen darf weiteres Nachmessen den Hilferuf nicht verzögern: Rufen Sie 112.", "Bleiben die Werte bei stabilem Befinden weit über Ihrem üblichen Bereich, holen Sie noch am selben Tag ärztlichen Rat ein."]),
        p("Diese Schritte behandeln keine Hypertonie. Sie vermeiden typische Messfehler und liefern verwertbare Angaben. Körperliche Belastung, Schmerzen, Angst, Koffein, Nikotin, Sprechen oder eine zu kleine Manschette können den Wert vorübergehend erhöhen. Schwere neue Symptome sollten Sie trotzdem nie vorschnell als Stress erklären."),
        p("Messen Sie nicht pausenlos weiter und wählen Sie nicht einfach den niedrigsten Wert. Das verstärkt häufig die Anspannung. Wichtiger sind wenige saubere Messungen, der genaue Beginn möglicher Beschwerden und eine vollständige Liste der regulär verordneten Medikamente."),
        warn("Bei akuten Beschwerden nicht selbst fahren", "Bei Brustschmerz, neurologischem Ausfall, Verwirrtheit, Ohnmacht oder schwerer Atemnot rufen Sie 112 und folgen der Leitstelle."),
      ] },
      { id: "notfall", nav: "112 rufen", eyebrow: "Warnzeichen", h2: "Wann sehr hoher Blutdruck ein Notfall ist", blocks: [
        lead("Ein Wert um oder über 180/110 mmHg ist sehr hoch und muss zur Abklärung eines hypertensiven Notfalls beurteilt werden; bei Zeichen einer akuten Organschädigung wählen Sie 112."),
        p("Warten Sie bei möglichen Schlaganfall-, Herzinfarkt- oder Lungenödemzeichen nicht auf Tee, Dusche oder eine improvisierte Tablette. Nennen Sie der Leitstelle den Messwert, die Symptome, deren Beginn, Ihre regulären Medikamente und bekannte Erkrankungen. Ist jemand bei Ihnen, sollte die Person bleiben und Medikamentenliste sowie Ausweis bereithalten."),
        ul(["Brustschmerz oder Druck, besonders mit Schweiß, Übelkeit oder Kollapsgefühl.", "Schwere Atemnot, Erstickungsgefühl oder rasche Verschlechterung der Atmung.", "Hängender Mundwinkel, einseitige Schwäche oder verwaschene Sprache.", "Neue Verwirrtheit, Krampfanfall, Ohnmacht oder Bewusstlosigkeit.", "Plötzlicher Sehverlust oder explosionsartiger, ungewohnter Kopfschmerz."]),
        p("Schwangerschaft oder Wochenbett, Nierenerkrankung, früherer Schlaganfall und Herzerkrankung erhöhen die Dringlichkeit. Eine Notfallsituation wird nicht allein durch eine Zahl bestimmt. Umgekehrt darf ein etwas niedrigerer Kontrollwert ernste Symptome nicht entkräften."),
        cite(`In Rumänien gilt für akute Notfälle <a href="${EMERGENCY_112}" rel="nofollow noopener" target="_blank">112</a>. Europäische Leitlinien unterscheiden stark erhöhte Werte ohne akute Schädigung vom hypertensiven Notfall mit Organschaden.`),
      ] },
      { id: "captopril", nav: "Captopril", eyebrow: "Die Tablettenfrage", h2: "Für Captopril gibt es keinen universellen Grenzwert", blocks: [
        lead("Captopril ist verschreibungspflichtig und keine automatische Erste Hilfe, sobald das Messgerät eine bestimmte Zahl zeigt."),
        p("Ob es geeignet ist, hängt von Diagnose, Nierenfunktion, Kalium, Schwangerschaft, weiteren Arzneimitteln und persönlichem Plan ab. Derselbe Wert kann bei zwei Menschen unterschiedliche Maßnahmen erfordern. Ein zu schneller Blutdruckabfall kann die Durchblutung von Gehirn, Herz oder Nieren vermindern und Schwindel oder Kollaps auslösen."),
        warn("Kein zusätzliches oder nicht verordnetes Captopril", "Leihen Sie keine Tablette, verdoppeln Sie die übliche Behandlung nicht und wiederholen Sie nichts, nur weil sich die Anzeige nicht schnell ändert. Folgen Sie ausschließlich einem ausdrücklich für Sie erstellten Aktionsplan."),
        p("Eine vergessene Einnahme, eine kürzliche Umstellung oder eine vermutete Nebenwirkung sollten Sie mit Ihrem Arzt oder Apotheker besprechen. Ein allgemeiner Artikel kann keinen Ausgleich für eine vergessene Einnahme festlegen. Bei Notfallzeichen ist der Anruf bei 112 wichtiger als die Suche nach einer schnell wirkenden Tablette."),
      ] },
      { id: "mythen", nav: "Mythen", eyebrow: "Schnelle Hausmittel", h2: "Tee, Zitrone, Knoblauch und Atmen behandeln keinen Notfall", blocks: [
        lead("Manche Gewohnheiten fördern langfristig die Herz-Kreislauf-Gesundheit. Keine ersetzt die Akutbeurteilung bei Warnsymptomen."),
        p("Koffeinfreier Tee oder langsames Atmen können beruhigen. Ein niedrigerer Wert nach Ruhe beweist jedoch nicht, dass die Gefahr vorbei ist. Zitrone, Knoblauch, Essig und kaltes Wasser öffnen Blutgefäße nicht sofort. Manche Pflanzen und Ergänzungsmittel können mit Arzneien wechselwirken; fragen Sie Arzt oder Apotheker."),
        ul(["Verzögern Sie 112 nie, um ein Internetrezept auszuprobieren.", "Kombinieren Sie keine Ergänzungsmittel und Medikamente, um einen Abfall zu erzwingen.", "Setzen Sie die tägliche Therapie nicht nach einem besseren Einzelwert ab.", "Nehmen Sie nie das Medikament eines Angehörigen, auch nicht bei gleicher Diagnose.", "Besprechen Sie Salz, Schlaf, Bewegung, Alkohol und Gewicht als Langzeitmaßnahmen, nicht als Soforthilfe."]),
        p("Gehen Sie in dieser Reihenfolge vor: Prüfen Sie auf einen Notfall, kontrollieren Sie die Messung und halten Sie sich an Ihren persönlichen Plan. So vermeiden Sie unnötige Panik und gefährliches Warten."),
      ] },
      { id: "nachsorge", nav: "Nachsorge", eyebrow: "Nach der Situation", h2: "Verlauf dokumentieren und passende Versorgung wählen", blocks: [
        lead("Ein kurzes, genaues Protokoll ist hilfreicher als viele Messungen hintereinander unter Anspannung."),
        p(`Im <a href="${deHref("/tools/blood-pressure-chart")}">Blutdruckprotokoll</a> notieren Sie Uhrzeit, Arm, Haltung, Puls, Beschwerden, reguläre Therapie und Umstände wie Schmerz, Fieber oder Schlafmangel. Bewahren Sie alle Werte auf, nicht nur den höchsten.`),
        p(`Ohne Warnzeichen kann eine <a href="${deHref("/services/boli-cronice-online")}">Online-Sprechstunde für chronische Erkrankungen</a> Protokoll, Medikamente und Risiken prüfen und klären, ob Labor, EKG, persönliche Untersuchung oder Kardiologie nötig sind.`),
        ul(["Bereiten Sie alle Medikamente einschließlich abschwellender Mittel, Entzündungshemmer und Nahrungsergänzungsmittel vor.", "Nennen Sie ausgelassene Einnahmen, gleichen Sie diese aber nicht selbst aus.", "Fragen Sie, welche künftigen Werte in Ihrem Plan Kontakt am selben Tag verlangen.", "Nutzen Sie Termine nur im stabilen Zustand; akute Warnzeichen gehören zu 112."]),
        p(`Unter <a href="${deHref("/doctors")}">Unsere Ärzte</a> finden Sie Profile; die <a href="${deHref("/contact")}">Kontaktseite</a> hilft bei der Buchung. Beide Wege sind keine Notfallkanäle.`),
      ] },
    ],
    linksEyebrow: "Global Health Rumänien", linksH2: "Den nächsten Schritt passend wählen", linksLead: "Ohne Notfallzeichen ordnen Sie die Werte und besprechen den Verlauf. Mit Warnzeichen rufen Sie 112.",
    links: [{ label: "Online-Sprechstunde chronische Erkrankungen", href: deHref("/services/boli-cronice-online") }, { label: "Blutdruckprotokoll", href: deHref("/tools/blood-pressure-chart") }, { label: "Ärzte in Rumänien", href: deHref("/doctors") }, { label: "Global Health kontaktieren", href: deHref("/contact") }],
    ctaBox: { h3: "Wiederholt hohe Werte ohne Warnzeichen?", text: "Buchen Sie mit Protokoll, Medikamentenliste und Symptomen. Der Arzt kann weitere Messungen, Untersuchungen oder eine Überweisung planen.", primary: { label: "Sprechstunde buchen", href: deHref("/services/boli-cronice-online") }, secondary: { label: "Ärzte ansehen", href: deHref("/doctors") } },
    sourcesEyebrow: "Klinische Quellen", sourcesH2: "Grundlagen dieses Leitfadens", sourcesLead: "Die Quellen trennen Notfalltriage von Langzeitbehandlung und geben kein universelles Arzneischema vor.",
    sources: [{ label: "ESC — Erhöhter Blutdruck und Hypertonie", href: ESC_GUIDELINE }, { label: "Rumänische Gesellschaft für Kardiologie — Hypertonie", href: CARDIOPORTAL_HTA }, { label: "Rumänischer Notruf 112", href: EMERGENCY_112 }], sourcesNote: "Individuelle Entscheidungen hängen von Vorgeschichte, Untersuchung, Laborwerten und verordneter Therapie ab.",
    faqEyebrow: "Häufige Fragen", faqH2: "Fragen zum schnellen Blutdrucksenken", faqs: [
      { q: "Was senkt den Blutdruck zu Hause sofort?", a: "Kein Hausmittel ist für jede Situation sicher. Setzen Sie sich, prüfen Sie Symptome, messen Sie korrekt nach und folgen Sie Ihrem Plan. Bei Brustschmerz, schwerer Atemnot oder neurologischen Veränderungen rufen Sie 112." },
      { q: "Ab welchem Blutdruck soll man Captopril nehmen?", a: "Es gibt keine universelle Zahl. Das verschreibungspflichtige Medikament hängt von Vorgeschichte und Plan ab. Nehmen Sie niemals zusätzliches oder nicht verordnetes Captopril." },
      { q: "Darf ich eine weitere Tablette nehmen, wenn der Wert nicht fällt?", a: "Nicht ohne ausdrückliche persönliche Anweisung. Verdoppeln oder Kombinieren kann einen gefährlichen Abfall verursachen. Holen Sie Rat ein; bei Warnzeichen rufen Sie 112." },
      { q: "Senken Zitrone oder Kräutertee den Druck schnell?", a: "Sie behandeln keinen Notfall. Ruhe kann mit einem niedrigeren Kontrollwert zusammenfallen, hebt ernste Symptome aber nicht auf. Manche Pflanzen wechselwirken mit Medikamenten." },
      { q: "Wann reicht ein gebuchter Termin statt 112?", a: "Wenn Sie stabil sind, keine Warnzeichen haben und wiederholt hohe Werte beurteilen lassen möchten. Geplante Versorgung ersetzt nie den Notruf bei akuten Symptomen." },
    ],
    disclaimerTitle: "Medizinischer und Notfallhinweis", disclaimer: "Allgemeine Information, keine Diagnose oder Dosierungsanweisung. Nehmen Sie keine zusätzlichen oder nicht verordneten Medikamente. Bei Brustschmerz, schwerer Atemnot, neurologischem Ausfall, Verwirrtheit, Ohnmacht, plötzlicher Sehstörung oder plötzlichem starkem Kopfschmerz rufen Sie 112.",
  } satisfies Article,
};

export const RO_SCADE_TENSIUNEA_RAPID: PostSet = {
  key: "ro-scade-tensiunea-rapid",
  countryCode: "ro",
  targetKeyword: "trucuri care scade tensiunea pe loc",
  searchVolume: 9900,
  keywordDifficulty: 0,
  evidence:
    "OpenSEO research 2026-08-24: ce scade tensiunea arteriala rapid 9,900 / KD 0 / CPC 0.24; pastila care scade tensiunea imediat 4,400 / KD 0 / CPC 0.16; de la ce tensiune se ia captopril 4,400 / KD 0; ce scade tensiunea imediat 3,600 / KD 0 / CPC 0.59. SERP review exposed a safety gap: much of the ranking content foregrounds remedies rather than symptom-led emergency triage.",
  serviceSlug: "boli-cronice-online",
  authorDoctorId: "cmrc4axni00rn01p2n3r2bopf",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmrc4j7oc00se01p2gf7y9ldw",
  reviewerDisplayName: "Dr Andreea Lorena Bica",
  posts: [ro, en, pt, es, cs, de],
};

// Render during module evaluation so malformed article data fails before seeding.
for (const post of RO_SCADE_TENSIUNEA_RAPID.posts) renderArticle(post.article);
