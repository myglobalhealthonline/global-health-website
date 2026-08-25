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
const MS_PROTOCOL =
  "https://oldsite.ms.ro/wp-content/uploads/2021/04/ANEXA-22_Hipertensiunea-arteriala.docx";
const EMERGENCY_112 = "https://www.112.ro/";

const roHref = (path: string) => `https://www.myglobalhealth.online/romania/ro${path}`;
const enHref = (path: string) => `https://www.myglobalhealth.online/romania/en${path}`;
const ptHref = (path: string) => `https://www.myglobalhealth.online/romania/pt${path}`;
const esHref = (path: string) => `https://www.myglobalhealth.online/romania/es${path}`;
const csHref = (path: string) => `https://www.myglobalhealth.online/romania/cs${path}`;
const deHref = (path: string) => `https://www.myglobalhealth.online/romania/de${path}`;

const ro: LocalePost = {
  locale: "RO",
  slug: "ce-scade-tensiunea-arteriala-rapid-sigur",
  title: "Ce scade tensiunea arterială rapid? Pași siguri și semne de alarmă",
  excerpt:
    "Ce puteți face în siguranță după o valoare mare, când sunați la 112 și de ce captoprilul, pastilele suplimentare și leacurile rapide nu se iau fără un plan medical.",
  seoTitle: "Ce scade tensiunea rapid: pași siguri",
  seoDescription:
    "Valoare mare la tensiometru? Aflați cum repetați corect măsurarea, când sunați la 112 și de ce nu luați captopril sau doze suplimentare singur.",
  category: "Boli cronice",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Boli cronice",
    categoryHref: roHref("/blog"),
    eyebrow: "România · Ghid de siguranță",
    h1: "Ce scade tensiunea arterială rapid — și ce este sigur să faceți",
    deck:
      "O valoare mare cere o măsurare corectă și o decizie calmă. Nu cere automat o pastilă luată după ureche.",
    intro:
      "Nu există un truc sigur care să scadă tensiunea instantaneu acasă. Dacă apar <strong>durere în piept, lipsă severă de aer, slăbiciune sau amorțeală pe o parte, confuzie, leșin, tulburări de vorbire ori vedere sau o durere de cap bruscă și neobișnuită</strong>, sunați la <strong>112</strong>. Fără astfel de semne, așezați-vă, odihniți-vă câteva minute, repetați măsurarea corect și notați rezultatele. Nu luați captopril, o pastilă de la altcineva, o doză suplimentară sau medicamente rămase de la un episod vechi decât dacă aveți un plan explicit, personal, dat de medic pentru exact această situație.",
    facts: [
      "Semne neurologice, durere toracică sau lipsă de aer: 112",
      "Repetați corect înainte să interpretați cifra",
      "Nu luați medicamente suplimentare fără plan medical",
    ],
    primaryCta: { label: "Consultație boli cronice", href: roHref("/services/boli-cronice-online") },
    secondaryCta: { label: "Deschideți jurnalul de tensiune", href: roHref("/tools/blood-pressure-chart") },
    panelChip: "Mai întâi: siguranța",
    panelParas: [
      "Articolul vă ajută să separați o cifră izolată, măsurată greșit, de o situație care cere evaluare medicală.",
      "Explică de ce o scădere forțată poate fi periculoasă și de ce medicamentele prescrise nu sunt remedii universale.",
      "Nu înlocuiește serviciul 112, camera de gardă sau planul individual primit de la medicul care vă cunoaște istoricul.",
    ],
    author: {
      initials: "RB",
      name: "Dr Robert Gabriel Brindus",
      line: "Medic de Familie · Director medical, Global Health România",
    },
    reviewLine:
      "Revizuit clinic de Dr Andreea Lorena Bica, medic specialist neurolog, Global Health România.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "acum",
        nav: "Ce faceți acum",
        eyebrow: "Primii pași",
        h2: "Ce puteți face imediat, fără să vă puneți în pericol",
        blocks: [
          lead(
            "Opriți efortul, așezați-vă într-un loc liniștit și verificați mai întâi dacă există un simptom de alarmă. Apoi măsurați din nou corect.",
          ),
          ul([
            "Stați cu spatele sprijinit, tălpile pe podea și picioarele neîncrucișate; nu vorbiți în timpul măsurării.",
            "Sprijiniți brațul la nivelul inimii și folosiți o manșetă de braț potrivită ca mărime.",
            "Faceți încă două citiri la scurt interval și notați ora, valorile, pulsul și orice simptom.",
            "Dacă aveți simptome de alarmă, nu continuați să repetați măsurarea în loc să cereți ajutor: sunați la 112.",
            "Dacă vă simțiți stabil, dar valorile rămân mult peste cele obișnuite, contactați în aceeași zi un medic sau serviciul recomandat în planul dumneavoastră.",
          ]),
          p(
            "Aceste gesturi nu sunt o metodă de tratament și nu promit o scădere rapidă. Ele reduc erorile de măsurare și vă ajută să transmiteți informații utile medicului. O valoare poate crește temporar după efort, durere, anxietate, cafea, nicotină sau dacă manșeta este nepotrivită. Totuși, nu presupuneți că este «doar stres» dacă apar simptome noi ori severe.",
          ),
          warn(
            "Nu conduceți singur dacă vă simțiți rău",
            "În caz de durere toracică, deficit neurologic, confuzie, leșin sau lipsă severă de aer, sunați la 112 și urmați instrucțiunile dispecerului.",
          ),
        ],
      },
      {
        id: "urgenta",
        nav: "Când sunați 112",
        eyebrow: "Semne de alarmă",
        h2: "Cifra mare devine urgență când există afectare acută",
        blocks: [
          lead(
            "O citire în jurul sau peste 180/120 mmHg este foarte mare și cere evaluare promptă; asocierea cu simptome de afectare acută este motiv de apel la 112.",
          ),
          p(
            "Nu așteptați ca un ceai, un duș sau o pastilă improvizată să «își facă efectul» dacă aveți semne care pot indica accident vascular cerebral, infarct, edem pulmonar sau altă urgență. Minutele contează. Spuneți dispecerului valoarea măsurată, simptomele, ora debutului, medicamentele prescrise și bolile cunoscute.",
          ),
          ul([
            "Durere sau presiune în piept, mai ales cu transpirații, greață ori stare de rău.",
            "Respirație foarte grea, senzație de sufocare sau agravare rapidă a lipsei de aer.",
            "Față căzută, slăbiciune ori amorțeală pe o parte, vorbire neclară sau imposibilitatea de a înțelege.",
            "Confuzie nouă, leșin, convulsii sau pierderea stării de conștiență.",
            "Pierderea bruscă a vederii ori durere de cap explozivă, diferită de durerile obișnuite.",
          ]),
          p(
            "Și contextul schimbă prioritatea. Sarcina sau perioada de după naștere, boala renală, un accident vascular anterior și boala cardiacă necesită o marjă mai mică de așteptare. Dacă nu sunteți sigur ce înseamnă simptomele, cereți evaluare, nu încercați să puneți singur diagnosticul.",
          ),
          cite(
            `Pentru o urgență reală din România, serviciul corect este <a href="${EMERGENCY_112}" rel="nofollow noopener" target="_blank">112</a>. Recomandările europene diferențiază valorile foarte mari fără afectare acută de urgența hipertensivă cu afectare de organ.`,
          ),
        ],
      },
      {
        id: "captopril",
        nav: "Captopril",
        eyebrow: "Întrebarea despre pastilă",
        h2: "De la ce tensiune se ia captopril? Nu există un răspuns universal",
        blocks: [
          lead(
            "Captoprilul este un medicament eliberat pe bază de prescripție, nu o soluție de prim ajutor potrivită automat după atingerea unei anumite cifre.",
          ),
          p(
            "Decizia depinde de diagnosticul dumneavoastră, funcția renală, potasiu, sarcină, celelalte medicamente și schema stabilită de clinician. Aceeași valoare poate necesita acțiuni diferite la două persoane. În plus, o scădere prea rapidă poate reduce alimentarea cu sânge a creierului, inimii sau rinichilor.",
          ),
          warn(
            "Nu luați captopril în plus și nu luați captopril neprescris",
            "Nu folosiți medicamentul altcuiva, nu dublați tratamentul și nu repetați o tabletă deoarece cifra nu s-a schimbat imediat. Dacă medicul v-a oferit deja un plan scris pentru valori crescute, urmați exact acel plan și cereți ajutor dacă situația iese din limitele lui.",
          ),
          p(
            "O doză uitată, o schimbare recentă de tratament sau reacțiile adverse trebuie discutate cu medicul ori farmacistul. Articolul nu poate stabili dacă trebuie recuperată o doză și nici nu poate transforma un medicament prescris într-un protocol universal. Într-o urgență cu simptome, apelul la 112 are prioritate față de căutarea unei pastile care să scadă numărul.",
          ),
        ],
      },
      {
        id: "mituri",
        nav: "Mituri și remedii",
        eyebrow: "Ce nu rezolvă episodul",
        h2: "Ceaiul, lămâia, usturoiul și respirația lentă nu tratează o urgență",
        blocks: [
          lead(
            "Unele obiceiuri pot face parte din sănătatea cardiovasculară pe termen lung. Niciunul nu înlocuiește evaluarea unei valori foarte mari sau a simptomelor de alarmă.",
          ),
          p(
            "O infuzie fără cofeină sau câteva minute de respirație lentă vă pot ajuta să vă liniștiți, dar o eventuală schimbare mică a citirii nu dovedește că riscul a trecut. Lămâia, usturoiul, oțetul și apa rece nu «desfundă» vasele pe loc. Unele plante interacționează cu anticoagulantele, diureticele ori alte tratamente și nu sunt automat inofensive.",
          ),
          ul([
            "Nu întârziați apelul la 112 pentru a încerca o infuzie sau un remediu de pe internet.",
            "Nu combinați suplimente și medicamente pentru a forța o scădere.",
            "Nu opriți tratamentul zilnic deoarece o valoare a ieșit bună după odihnă.",
            "Nu luați medicamentul prescris al unei rude, chiar dacă are același diagnostic.",
            "Discutați separat cu medicul despre sare, somn, mișcare, alcool și greutate: acestea sunt intervenții de fond, nu soluții instantanee.",
          ]),
          p(
            "Întrebarea utilă nu este «ce scade tensiunea în cinci minute?», ci «există o urgență, măsurarea este corectă și ce plan am primit pentru astfel de valori?». Această ordine reduce atât panica inutilă, cât și întârzierea periculoasă.",
          ),
        ],
      },
      {
        id: "dupa",
        nav: "După episod",
        eyebrow: "Planul de urmărire",
        h2: "Ce notați și ce discutați cu medicul după o valoare mare",
        blocks: [
          lead(
            "Un jurnal scurt și exact valorează mai mult decât zece măsurători făcute în panică, una după alta.",
          ),
          p(
            `Folosiți <a href="${roHref("/tools/blood-pressure-chart")}">jurnalul de tensiune arterială Global Health</a> pentru a nota valorile în context. Includeți ora, poziția corpului, brațul folosit, pulsul, simptomele, tratamentul luat în mod obișnuit și orice factor neobișnuit, precum durere, febră, lipsă de somn sau efort.`,
          ),
          ul([
            "Notați toate citirile, nu doar cea mai mare sau cea mai bună.",
            "Menționați dacă aparatul sau manșeta sunt noi și dacă le-a verificat cineva.",
            "Pregătiți lista completă a medicamentelor, inclusiv decongestionante, antiinflamatoare și suplimente.",
            "Spuneți medicului dacă ați omis tratamentul, dar nu încercați să compensați singur.",
            "Întrebați ce interval cere contact în aceeași zi și ce simptome cer 112 în planul dumneavoastră personal.",
          ]),
          p(
            "Medicul poate decide dacă este nevoie de monitorizare la domiciliu, analize de sânge și urină, ECG, evaluarea rinichilor sau trimitere la cardiologie. O consultație online poate ordona informațiile și stabili următorul pas, dar nu poate face examinarea sau investigațiile care necesită prezență fizică.",
          ),
        ],
      },
      {
        id: "consultatie",
        nav: "Consultația online",
        eyebrow: "Un traseu realist",
        h2: "Când ajută medicina de familie și când este nevoie de cardiologie",
        blocks: [
          lead(
            "Pentru valori crescute repetat, fără semne de urgență, medicul de familie este de obicei punctul potrivit de coordonare.",
          ),
          p(
            `Într-o <a href="${roHref("/services/boli-cronice-online")}">consultație online pentru boli cronice</a>, medicul poate revizui jurnalul, tratamentul deja prescris, alte boli și factorii de risc. Poate explica dacă trebuie continuată monitorizarea, dacă sunt necesare analize sau dacă evaluarea fizică nu trebuie amânată.`,
          ),
          p(
            "Cardiologia devine importantă când tensiunea rămâne necontrolată în ciuda tratamentului, există suspiciune de cauză secundară, apar simptome cardiace sau sunt necesare investigații specializate. Urgența rămâne însă în afara acestui traseu programat: durerea toracică, deficitul neurologic, confuzia sau lipsa severă de aer cer 112.",
          ),
          p(
            `Puteți verifica profilurile în pagina <a href="${roHref("/doctors")}">Medicii noștri</a> și puteți folosi <a href="${roHref("/contact")}">pagina de contact</a> dacă aveți nevoie de ajutor pentru programare. Aceste rute sunt pentru îngrijire planificată, nu pentru răspuns la urgențe.`,
          ),
        ],
      },
    ],
    linksEyebrow: "Global Health România",
    linksH2: "Continuați cu un pas potrivit situației",
    linksLead:
      "Dacă nu există semne de urgență, organizați valorile și discutați modelul cu un medic. Dacă există semne de alarmă, sunați la 112.",
    links: [
      { label: "Consultație online pentru boli cronice", href: roHref("/services/boli-cronice-online") },
      { label: "Calculator și jurnal de tensiune", href: roHref("/tools/blood-pressure-chart") },
      { label: "Medicii Global Health România", href: roHref("/doctors") },
      { label: "Contact Global Health România", href: roHref("/contact") },
    ],
    ctaBox: {
      h3: "Aveți valori crescute repetat, dar fără semne de alarmă?",
      text: "Programați o evaluare cu jurnalul, lista tratamentelor și simptomele. Medicul poate separa o problemă de tehnică, o creștere temporară și hipertensiunea care necesită investigații sau ajustarea planului.",
      primary: { label: "Programați consultația", href: roHref("/services/boli-cronice-online") },
      secondary: { label: "Vedeți medicii", href: roHref("/doctors") },
    },
    sourcesEyebrow: "Surse clinice",
    sourcesH2: "Repere folosite pentru acest ghid",
    sourcesLead:
      "Am separat îndrumarea pentru urgență de monitorizarea hipertensiunii pe termen lung și am evitat un protocol medicamentos universal.",
    sources: [
      { label: "ESC — Elevated blood pressure and hypertension", href: ESC_GUIDELINE },
      { label: "Ministerul Sănătății — protocol hipertensiune arterială", href: MS_PROTOCOL },
      { label: "Serviciul de Telecomunicații Speciale — 112 România", href: EMERGENCY_112 },
    ],
    sourcesNote:
      "Sursele externe descriu cadrul clinic și accesul la urgență. Recomandarea individuală depinde de istoricul, examinarea și tratamentul fiecărei persoane.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări despre scăderea rapidă a tensiunii",
    faqs: [
      {
        q: "Ce scade tensiunea imediat acasă?",
        a: "Nu există un remediu casnic sigur care tratează imediat o valoare mare. Așezați-vă, verificați simptomele, repetați corect măsurarea și urmați planul personal primit de la medic. Dacă apar durere toracică, lipsă severă de aer, deficit neurologic, confuzie sau leșin, sunați la 112.",
      },
      {
        q: "De la ce tensiune se ia captopril?",
        a: "Nu există o cifră universală la care orice persoană ar trebui să ia captopril. Este un medicament pe bază de prescripție, iar decizia depinde de istoricul, schema și contraindicațiile dumneavoastră. Nu luați captopril suplimentar sau neprescris.",
      },
      {
        q: "Pot lua încă o pastilă dacă tensiunea nu scade?",
        a: "Nu fără instrucțiuni explicite pentru situația dumneavoastră. Dublarea ori combinarea tratamentelor poate provoca o scădere periculoasă și reacții adverse. Cereți sfatul medicului; dacă există simptome de alarmă, sunați la 112.",
      },
      {
        q: "Lămâia sau un ceai scad tensiunea repede?",
        a: "Nu tratează o urgență hipertensivă. O băutură sau respirația lentă poate coincide cu o citire mai mică după odihnă, dar nu dovedește că riscul a trecut. Unele plante interacționează cu medicamentele.",
      },
      {
        q: "Când pot programa o consultație în loc să sun la 112?",
        a: "Când nu aveți semne de alarmă, vă simțiți stabil și este vorba despre valori crescute repetat care necesită evaluare și un plan. O consultație programată nu înlocuiește răspunsul de urgență.",
      },
    ],
    disclaimerTitle: "Aviz medical și de urgență",
    disclaimer:
      "Articolul oferă informații generale, nu un diagnostic și nu o schemă de tratament. Nu luați medicamente suplimentare sau neprescrise și nu modificați singur tratamentul. Pentru durere în piept, lipsă severă de aer, deficit neurologic, confuzie, leșin, tulburări bruște de vedere sau o durere de cap bruscă și severă, sunați la 112.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "how-to-lower-blood-pressure-safely-right-now",
  title: "How to lower blood pressure safely right now: what to do first",
  excerpt:
    "A practical Romania-based safety guide to repeating a high reading, recognising 112 warning signs, and avoiding unsafe extra tablets or quick-fix remedies.",
  seoTitle: "Lower blood pressure safely: first steps",
  seoDescription:
    "High blood-pressure reading? Learn how to recheck it, when to call 112, and why extra captopril, tablets or quick remedies may be unsafe.",
  category: "Chronic conditions",
  article: {
    lang: "en-RO",
    tagline: "Healthcare anytime, anywhere",
    categoryLabel: "Chronic conditions",
    categoryHref: enHref("/blog"),
    eyebrow: "Romania · Safety guide",
    h1: "How to lower blood pressure safely right now",
    deck:
      "Start by checking for an emergency and confirming the reading. Do not start with an improvised tablet.",
    intro:
      "There is no universally safe home trick that instantly lowers blood pressure. Call <strong>112</strong> if a high reading comes with <strong>chest pain, severe breathlessness, one-sided weakness or numbness, trouble speaking, confusion, fainting, a sudden vision change, or a sudden unusual severe headache</strong>. If none of these warning signs is present, sit quietly for a few minutes, repeat the measurement correctly and record the results. Do not take extra captopril, someone else’s tablet, an unprescribed medicine or leftover treatment unless your own clinician has given you a clear personal plan for this exact situation.",
    facts: [
      "Chest, breathing or neurological warning signs: call 112",
      "Confirm a reading with sound technique",
      "Never improvise an extra prescription dose",
    ],
    primaryCta: { label: "Chronic-care consultation", href: enHref("/services/boli-cronice-online") },
    secondaryCta: { label: "Open the blood-pressure log", href: enHref("/tools/blood-pressure-chart") },
    panelChip: "Safety before the number",
    panelParas: [
      "This guide separates a possibly inaccurate isolated reading from symptoms that may signal acute organ injury.",
      "It explains why forcing the pressure down can be harmful and why prescription medicine is never a universal home remedy.",
      "It does not replace 112, an emergency department or instructions from a clinician who knows your medical history.",
    ],
    author: {
      initials: "RB",
      name: "Dr Robert Gabriel Brindus",
      line: "Family physician · Medical Director, Global Health Romania",
    },
    reviewLine:
      "Clinically reviewed by Dr Andreea Lorena Bica, specialist neurologist, Global Health Romania.",
    navLabel: "In this guide",
    sections: [
      {
        id: "first",
        nav: "First steps",
        eyebrow: "What to do now",
        h2: "Safe actions after an unexpectedly high reading",
        blocks: [
          lead(
            "Stop exertion, sit somewhere safe and check for warning symptoms before focusing on repeated numbers.",
          ),
          ul([
            "Sit with your back supported, feet flat and legs uncrossed; do not talk while the monitor is running.",
            "Support your arm at heart level and use a correctly sized upper-arm cuff.",
            "Take two further readings a short time apart, then record the time, pulse, symptoms and circumstances.",
            "If a warning symptom is present, stop delaying care to repeat the reading and call 112.",
            "If you feel stable but readings remain far above your usual range, seek same-day clinical advice or follow your existing personal plan.",
          ]),
          p(
            "These steps do not treat hypertension. They reduce common measurement errors and create useful information for clinical triage. Recent exercise, pain, anxiety, caffeine, nicotine, talking and a cuff that is too small can all raise a reading temporarily. That does not justify assuming a severe symptom is anxiety or waiting for it to pass.",
          ),
          warn(
            "Do not drive yourself if you are acutely unwell",
            "For chest pain, a new neurological deficit, confusion, fainting or severe breathing difficulty, call 112 and follow the dispatcher’s instructions.",
          ),
        ],
      },
      {
        id: "emergency",
        nav: "Call 112",
        eyebrow: "Emergency signs",
        h2: "A high number is most dangerous when acute symptoms appear",
        blocks: [
          lead(
            "A reading around or above 180/120 mmHg is severely high and needs prompt assessment; acute organ-injury symptoms make it an emergency call to 112.",
          ),
          p(
            "Do not wait for tea, a cold shower or an improvised tablet to work when symptoms could represent stroke, a heart attack, fluid in the lungs or another emergency. Tell the dispatcher the reading, symptoms, time of onset, usual prescription medicines and known conditions. If another person is with you, ask them to stay and gather your medication list.",
          ),
          ul([
            "Chest pain or pressure, particularly with sweating, nausea or a feeling of impending collapse.",
            "Severe breathlessness, choking sensation or rapidly worsening breathing.",
            "A drooping face, weakness or numbness on one side, slurred speech or inability to understand speech.",
            "New confusion, a seizure, fainting or loss of consciousness.",
            "Sudden loss of vision or an explosive headache unlike your usual headaches.",
          ]),
          p(
            "Pregnancy or the period after delivery, kidney disease, previous stroke and established heart disease can increase concern. Do not try to diagnose hypertensive emergency from a number alone. Conversely, do not let a slightly lower repeat reading overrule serious new symptoms.",
          ),
          cite(
            `In Romania, the emergency route is <a href="${EMERGENCY_112}" rel="nofollow noopener" target="_blank">112</a>. European clinical guidance distinguishes severely elevated readings without acute injury from hypertensive emergency with acute organ damage.`,
          ),
        ],
      },
      {
        id: "captopril",
        nav: "Captopril",
        eyebrow: "The tablet question",
        h2: "When should captopril be taken for a high reading? There is no universal number",
        blocks: [
          lead(
            "Captopril is a prescription medicine, not an automatic first-aid response when a monitor crosses a particular threshold.",
          ),
          p(
            "Whether it is suitable depends on the diagnosis, kidney function, potassium, pregnancy, other medicines and the treatment plan set by a clinician. The same reading may require a different response in two people. Lowering pressure too abruptly may also compromise blood flow to the brain, heart or kidneys.",
          ),
          warn(
            "Do not take extra or unprescribed captopril",
            "Do not borrow it, double your usual treatment or repeat a tablet because the monitor has not changed quickly. If your clinician has already provided a written action plan for elevated readings, follow that exact plan and seek help when the situation falls outside it.",
          ),
          p(
            "A missed dose, recent medication change or suspected adverse effect needs advice from your clinician or pharmacist. A general article cannot tell you how to compensate for missed treatment. If emergency symptoms are present, contacting 112 is more important than searching for a pill that promises to reduce the number.",
          ),
        ],
      },
      {
        id: "myths",
        nav: "Quick-fix myths",
        eyebrow: "What not to rely on",
        h2: "Tea, lemon, garlic and breathing exercises do not treat an emergency",
        blocks: [
          lead(
            "Some habits support cardiovascular health over months or years. They are not rescue treatments for acute symptoms or a severely high reading.",
          ),
          p(
            "A caffeine-free infusion or slow breathing may help you feel calmer. A lower repeat reading after resting does not prove that the clinical risk has disappeared. Lemon, garlic, vinegar and cold water do not instantly clear blood vessels. Herbal products may interact with anticoagulants, diuretics and other medicines, so «natural» does not mean risk-free.",
          ),
          ul([
            "Never delay calling 112 to test an infusion or an internet remedy.",
            "Do not combine supplements and prescription medicines to force a rapid drop.",
            "Do not stop daily treatment because one reading improved after rest.",
            "Do not take a relative’s medicine, even if they also have hypertension.",
            "Discuss salt, sleep, movement, alcohol and weight as long-term measures, not instant fixes.",
          ]),
          p(
            "A safer question is not «what lowers blood pressure in five minutes?» but «is this an emergency, is the measurement reliable, and what action plan has my clinician given me?». That order helps avoid both unnecessary panic and dangerous delay.",
          ),
        ],
      },
      {
        id: "record",
        nav: "Record it",
        eyebrow: "After the reading",
        h2: "What to record and discuss after the immediate situation",
        blocks: [
          lead(
            "A short, accurate log is more useful than repeatedly checking the monitor in panic and reporting only the highest number.",
          ),
          p(
            `Use the Global Health <a href="${enHref("/tools/blood-pressure-chart")}">blood-pressure chart and log</a> to record readings in context. Include the time, arm, posture, pulse, symptoms, usual prescribed treatment and anything unusual such as pain, fever, poor sleep or exertion.`,
          ),
          ul([
            "Record all readings rather than selecting only the best or worst one.",
            "Note whether the monitor or cuff is new and whether its technique has been checked.",
            "Prepare a complete medicine list, including decongestants, anti-inflammatory medicines and supplements.",
            "Tell the clinician if routine treatment was missed, but do not compensate without advice.",
            "Ask which future readings need same-day contact and which symptoms require 112 in your personal plan.",
          ]),
          p(
            "A clinician may recommend structured home monitoring, blood and urine tests, an ECG, kidney assessment or cardiology review. An online appointment can organise the history and decide the next step, but it cannot replace examination or investigations that must happen in person.",
          ),
        ],
      },
      {
        id: "care",
        nav: "Getting care",
        eyebrow: "A realistic pathway",
        h2: "When family medicine can help and when cardiology is needed",
        blocks: [
          lead(
            "For repeated high readings without emergency symptoms, family medicine is usually a practical first point of coordination.",
          ),
          p(
            `During an <a href="${enHref("/services/boli-cronice-online")}">online chronic-care consultation</a>, a doctor can review the log, established prescriptions, other conditions and cardiovascular risks. They can clarify whether monitoring should continue, tests are needed or an in-person assessment should not wait.`,
          ),
          p(
            "Cardiology review may be appropriate when pressure remains uncontrolled despite treatment, a secondary cause is suspected, cardiac symptoms develop or specialist investigations are required. Emergency symptoms do not belong on this scheduled pathway: chest pain, a neurological deficit, confusion or severe breathlessness require 112.",
          ),
          p(
            `You can review clinicians on <a href="${enHref("/doctors")}">Our doctors</a> and use the <a href="${enHref("/contact")}">contact page</a> for booking support. These routes support planned care; neither is an emergency-response channel.`,
          ),
        ],
      },
    ],
    linksEyebrow: "Global Health Romania",
    linksH2: "Choose the next step that matches the situation",
    linksLead:
      "Without emergency signs, organise your readings and discuss the pattern with a clinician. With warning symptoms, call 112.",
    links: [
      { label: "Online chronic-care consultation", href: enHref("/services/boli-cronice-online") },
      { label: "Blood-pressure chart and log", href: enHref("/tools/blood-pressure-chart") },
      { label: "Global Health Romania doctors", href: enHref("/doctors") },
      { label: "Contact Global Health Romania", href: enHref("/contact") },
    ],
    ctaBox: {
      h3: "Repeated high readings, but no warning signs?",
      text: "Book an assessment with your log, medicine list and symptoms. A clinician can distinguish measurement problems, temporary elevation and hypertension that needs investigation or a changed plan.",
      primary: { label: "Book a consultation", href: enHref("/services/boli-cronice-online") },
      secondary: { label: "Meet the doctors", href: enHref("/doctors") },
    },
    sourcesEyebrow: "Clinical sources",
    sourcesH2: "References used for this guide",
    sourcesLead:
      "The article separates emergency triage from long-term hypertension care and deliberately avoids presenting a universal medication protocol.",
    sources: [
      { label: "ESC — Elevated blood pressure and hypertension", href: ESC_GUIDELINE },
      { label: "Romanian Ministry of Health — hypertension protocol", href: MS_PROTOCOL },
      { label: "Special Telecommunications Service — Romania 112", href: EMERGENCY_112 },
    ],
    sourcesNote:
      "External references provide the clinical and emergency-access framework. Individual decisions depend on a person’s history, examination and established treatment.",
    faqEyebrow: "FAQs",
    faqH2: "Questions about lowering blood pressure quickly",
    faqs: [
      {
        q: "What lowers blood pressure immediately at home?",
        a: "There is no home remedy that safely treats every high reading immediately. Sit down, check for warning symptoms, repeat the measurement correctly and follow your personal clinical plan. Call 112 for chest pain, severe breathlessness, neurological changes, confusion or fainting.",
      },
      {
        q: "At what blood pressure should I take captopril?",
        a: "There is no universal number at which everyone should take captopril. It is a prescription medicine and suitability depends on your history, current plan and contraindications. Never take extra or unprescribed captopril.",
      },
      {
        q: "Can I take another tablet if the reading does not fall?",
        a: "Not unless your own clinician has explicitly instructed you to do so in this situation. Doubling or combining treatment may cause a harmful drop or adverse effects. Seek advice; call 112 if warning symptoms are present.",
      },
      {
        q: "Will lemon water or herbal tea lower it quickly?",
        a: "They do not treat a hypertensive emergency. Rest may coincide with a lower repeat reading, but it does not cancel serious symptoms. Some herbal products also interact with prescription medicines.",
      },
      {
        q: "When can I book a consultation instead of calling 112?",
        a: "Scheduled care is appropriate when you are stable, have no warning symptoms and need repeated high readings assessed. It is not a substitute for emergency care when chest, breathing or neurological symptoms occur.",
      },
    ],
    disclaimerTitle: "Medical and emergency notice",
    disclaimer:
      "This article provides general information, not a diagnosis or treatment schedule. Do not take extra or unprescribed medicine and do not change treatment on your own. For chest pain, severe breathlessness, neurological deficits, confusion, fainting, sudden vision changes or a sudden severe headache, call 112.",
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
    deck: "Primeiro confirme se há uma emergência. Depois confirme a medição — sem improvisar comprimidos.",
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
    reviewLine: "Revisto clinicamente pela Dra Andreea Lorena Bica, neurologista especialista, Global Health Roménia.",
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
          p("Estes passos não tratam hipertensão. Servem para reduzir erros comuns e produzir informação útil. Esforço recente, dor, ansiedade, cafeína, nicotina, falar e uma braçadeira pequena podem elevar temporariamente a leitura. Mesmo assim, não atribua sintomas graves apenas ao stress."),
          warn("Não conduza se estiver muito mal", "Com dor torácica, défice neurológico, confusão, desmaio ou dificuldade respiratória intensa, ligue 112 e siga as instruções do operador."),
        ],
      },
      {
        id: "urgencia",
        nav: "Ligar 112",
        eyebrow: "Sinais de alarme",
        h2: "Quando uma tensão muito alta exige o 112",
        blocks: [
          lead("Uma leitura perto ou acima de 180/120 mmHg é muito elevada e precisa de avaliação rápida; com sintomas de lesão aguda, é uma emergência."),
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
          p("Este medicamento sujeito a receita depende do diagnóstico, função renal, potássio, gravidez, outros tratamentos e plano individual. A mesma leitura pode exigir decisões diferentes em duas pessoas. Uma queda forçada e demasiado rápida pode reduzir o fluxo de sangue para cérebro, coração e rins."),
          warn("DO NOT — não tome captopril extra nem não prescrito", "Não peça um comprimido emprestado, não duplique o tratamento habitual e não repita uma toma porque o monitor não mudou depressa. Siga apenas o plano escrito que o seu médico preparou para si."),
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
          p("Uma infusão sem cafeína e respirar devagar podem ajudar a acalmar, mas uma leitura menor depois do repouso não prova que o risco acabou. Limão, alho, vinagre ou água fria não desobstruem vasos instantaneamente. Plantas e suplementos podem interagir com anticoagulantes, diuréticos e outros medicamentos."),
          ul([
            "Nunca adie o 112 para experimentar uma receita da internet.",
            "Não misture suplementos e medicamentos para forçar uma descida.",
            "Não pare o tratamento diário porque uma leitura melhorou.",
            "Não use o medicamento de um familiar, mesmo com o mesmo diagnóstico.",
            "Discuta sal, sono, exercício, álcool e peso como medidas de fundo, não como socorro imediato.",
          ]),
          p("A pergunta mais segura é: há uma emergência, a medição é fiável e qual é o meu plano pessoal? Esta ordem evita tanto pânico desnecessário como atrasos perigosos."),
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
    linksH2: "Escolha um passo proporcional à situação",
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
      { label: "Ministério da Saúde da Roménia — protocolo", href: MS_PROTOCOL },
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
    author: { initials: "RB", name: "Dr Robert Gabriel Brindus", line: "Médico de familia · Director médico, Global Health Rumanía" }, reviewLine: "Revisado clínicamente por la Dra Andreea Lorena Bica, especialista en neurología, Global Health Rumanía.", navLabel: "En esta guía",
    sections: [
      { id: "ahora", nav: "Primeros pasos", eyebrow: "Qué hacer ahora", h2: "Acciones seguras tras una lectura inesperadamente alta", blocks: [
        lead("Detén el esfuerzo, siéntate en un lugar seguro y busca señales de alarma antes de seguir mirando números."),
        ul(["Apoya la espalda, deja los pies planos y no cruces las piernas ni hables al medir.", "Apoya el brazo a la altura del corazón y usa un manguito de brazo del tamaño correcto.", "Haz dos lecturas más separadas por un breve intervalo y anota hora, pulso, síntomas y contexto.", "Si aparece una señal de alarma, deja de retrasar la ayuda para medir una y otra vez: llama al 112.", "Si estás estable pero las cifras siguen muy por encima de lo habitual, pide consejo médico ese mismo día."]),
        p("Estos pasos no son un tratamiento. Reducen errores y generan datos útiles. Ejercicio, dolor, ansiedad, cafeína, nicotina, hablar o un manguito pequeño pueden elevar temporalmente la lectura. Aun así, nunca des por hecho que un síntoma grave es solo estrés."),
        warn("No conduzcas si te encuentras muy mal", "Ante dolor torácico, un déficit neurológico, confusión, desmayo o dificultad respiratoria intensa, llama al 112 y sigue las instrucciones."),
      ] },
      { id: "emergencia", nav: "Llamar al 112", eyebrow: "Señales de alarma", h2: "Cuándo una tensión muy alta exige llamar al 112", blocks: [
        lead("Una lectura cercana o superior a 180/120 mmHg es muy alta y requiere valoración rápida; si hay síntomas de daño agudo, es una emergencia."),
        p("No esperes a que funcionen un té, una ducha o una pastilla improvisada cuando podría tratarse de un ictus, un infarto o edema pulmonar. Explica al operador el valor, los síntomas, la hora de inicio, tu medicación prescrita y enfermedades conocidas."),
        ul(["Dolor o presión en el pecho, especialmente con sudor, náusea o malestar intenso.", "Falta de aire grave o que empeora rápidamente.", "Cara caída, debilidad de un lado o habla arrastrada.", "Confusión nueva, convulsión, desmayo o pérdida de conciencia.", "Pérdida brusca de visión o dolor de cabeza explosivo y distinto del habitual."]),
        p("El embarazo o posparto, la enfermedad renal, un ictus previo y la cardiopatía aumentan la preocupación. No diagnostiques una emergencia solo por la cifra, pero tampoco permitas que una segunda lectura algo menor invalide síntomas serios."),
        cite(`En Rumanía, el número de emergencias es el <a href="${EMERGENCY_112}" rel="nofollow noopener" target="_blank">112</a>. Las guías europeas distinguen cifras muy altas sin lesión aguda de la emergencia con daño orgánico.`),
      ] },
      { id: "captopril", nav: "Captopril", eyebrow: "La pregunta de la pastilla", h2: "No existe una cifra universal para tomar captopril", blocks: [
        lead("El captopril es un medicamento sujeto a prescripción, no una respuesta automática cuando el tensiómetro supera un número."),
        p("Su idoneidad depende del diagnóstico, la función renal, el potasio, el embarazo, otros fármacos y el plan clínico individual. La misma cifra puede requerir actuaciones distintas en dos personas. Bajar la presión de forma demasiado brusca puede reducir el flujo de sangre al cerebro, corazón o riñones."),
        warn("No tomes captopril extra ni no prescrito", "No uses el de otra persona, no dupliques el tratamiento habitual ni repitas una pastilla porque la cifra no cambió rápido. Sigue únicamente el plan personal escrito por tu médico."),
        p("Una dosis olvidada, un cambio reciente o una posible reacción adversa requieren consejo del médico o farmacéutico. Un artículo general no puede decir cómo compensar una omisión. Con síntomas de emergencia, llamar al 112 importa más que buscar una pastilla que prometa bajar el número."),
      ] },
      { id: "mitos", nav: "Mitos", eyebrow: "Soluciones rápidas", h2: "El té, el limón, el ajo o respirar lento no tratan una emergencia", blocks: [
        lead("Algunos hábitos ayudan a largo plazo, pero ninguno sustituye una valoración ante síntomas o una lectura muy alta."),
        p("Una infusión sin cafeína o respirar despacio puede ayudarte a calmarte. Una cifra menor tras descansar no demuestra que el riesgo haya desaparecido. Limón, ajo, vinagre o agua fría no despejan las arterias al instante. Las plantas también pueden interactuar con anticoagulantes, diuréticos y otros fármacos."),
        ul(["No retrases el 112 para probar un remedio de internet.", "No combines suplementos y medicación para forzar una bajada.", "No abandones el tratamiento diario porque una lectura mejoró.", "No tomes la medicación de un familiar aunque comparta diagnóstico.", "Habla de sal, sueño, ejercicio, alcohol y peso como medidas a largo plazo, no como rescate."]),
        p("La pregunta útil es: ¿hay una emergencia, la medición es fiable y qué plan personal tengo? Ese orden evita tanto el pánico como una demora peligrosa."),
      ] },
      { id: "seguimiento", nav: "Seguimiento", eyebrow: "Después del episodio", h2: "Registra el patrón y elige el nivel de atención adecuado", blocks: [
        lead("Un registro breve y exacto sirve más que muchas mediciones consecutivas hechas con ansiedad."),
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
    sources: [{ label: "ESC — Presión elevada e hipertensión", href: ESC_GUIDELINE }, { label: "Ministerio de Sanidad rumano — protocolo", href: MS_PROTOCOL }, { label: "Servicio 112 de Rumanía", href: EMERGENCY_112 }], sourcesNote: "Las decisiones individuales dependen de la historia clínica, exploración, pruebas y tratamiento prescrito.",
    faqEyebrow: "Preguntas frecuentes", faqH2: "Dudas sobre bajar la tensión rápidamente", faqs: [
      { q: "¿Qué baja la tensión inmediatamente en casa?", a: "No hay un remedio doméstico seguro para todos. Siéntate, revisa síntomas, repite bien la medición y sigue tu plan. Ante dolor torácico, falta de aire grave o alteraciones neurológicas, llama al 112." },
      { q: "¿A partir de qué tensión se toma captopril?", a: "No existe una cifra universal. Es un medicamento con receta y depende de tu historia y plan. Nunca tomes captopril extra o no prescrito." },
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
    author: { initials: "RB", name: "Dr Robert Gabriel Brindus", line: "Praktický lékař · Medicínský ředitel Global Health Rumunsko" }, reviewLine: "Klinicky revidovala Dr Andreea Lorena Bica, specialistka v neurologii, Global Health Rumunsko.", navLabel: "V tomto průvodci",
    sections: [
      { id: "prvni-kroky", nav: "První kroky", eyebrow: "Co udělat nyní", h2: "Bezpečný postup po nečekaně vysokém výsledku", blocks: [
        lead("Přerušte námahu, bezpečně se posaďte a ještě před dalším měřením zkontrolujte varovné příznaky."),
        ul(["Opřete záda, položte chodidla na zem, nekřižte nohy a během měření nemluvte.", "Podepřete paži ve výši srdce a použijte pažní manžetu správné velikosti.", "Proveďte další dvě měření s krátkým odstupem a zapište čas, puls, příznaky a okolnosti.", "Při varovném příznaku neodkládejte pomoc dalším opakovaným měřením — volejte 112.", "Jste-li stabilní, ale hodnoty zůstávají výrazně nad vaším obvyklým rozmezím, požádejte ještě tentýž den o lékařskou radu."]),
        p("Tyto kroky nejsou léčbou hypertenze. Omezují běžné chyby a poskytují údaje pro bezpečné rozhodnutí. Námaha, bolest, úzkost, kofein, nikotin, mluvení nebo malá manžeta mohou výsledek dočasně zvýšit. Závažné nové příznaky však nikdy automaticky nepřipisujte stresu."),
        p("Neměřte tlak desetkrát za sebou a nevybírejte jen nejnižší číslo. Opakované kontrolování zvyšuje úzkost a ztěžuje interpretaci. Důležitější je omezený počet správně provedených měření, přesný čas začátku příznaků a informace o běžně předepsané léčbě."),
        warn("Při akutních potížích sami neřiďte", "Při bolesti na hrudi, nové neurologické poruše, zmatenosti, mdlobě nebo těžké dušnosti volejte 112 a postupujte podle dispečera."),
      ] },
      { id: "pohotovost", nav: "Volat 112", eyebrow: "Varovné příznaky", h2: "Kdy je vysoký tlak důvodem k volání 112", blocks: [
        lead("Hodnota okolo nebo nad 180/120 mmHg je velmi vysoká a vyžaduje rychlé posouzení; s příznaky akutního poškození jde o pohotovost."),
        p("Nečekejte na účinek čaje, sprchy nebo improvizované tablety, pokud příznaky mohou znamenat cévní mozkovou příhodu, infarkt nebo tekutinu v plicích. Dispečerovi sdělte naměřené hodnoty, příznaky, čas jejich začátku, předepsané léky a známé diagnózy. Pokud je s vámi někdo další, ať zůstane nablízku a připraví seznam léků."),
        ul(["Bolest či tlak na hrudi, zejména s pocením, nevolností nebo pocitem na omdlení.", "Těžká dušnost, pocit dušení nebo rychlé zhoršování dechu.", "Pokles koutku, slabost jedné strany, nesrozumitelná řeč nebo porucha porozumění.", "Nová zmatenost, křeče, mdloba nebo ztráta vědomí.", "Náhlá ztráta zraku nebo explozivní bolest hlavy odlišná od obvyklých bolestí."]),
        p("Těhotenství a období po porodu, onemocnění ledvin, prodělaná cévní příhoda a srdeční onemocnění zvyšují naléhavost. Pohotovost nelze určit jen podle čísla, ale mírně nižší druhé měření také nesmí zrušit význam závažných příznaků."),
        cite(`V Rumunsku je číslem tísňového volání <a href="${EMERGENCY_112}" rel="nofollow noopener" target="_blank">112</a>. Evropská doporučení odlišují velmi vysoký tlak bez akutního poškození od hypertenzní pohotovosti s poškozením orgánu.`),
      ] },
      { id: "captopril", nav: "Captopril", eyebrow: "Otázka tablety", h2: "Pro captopril neexistuje univerzální hraniční hodnota", blocks: [
        lead("Captopril je lék na předpis, nikoli automatická první pomoc po překročení určitého čísla na tonometru."),
        p("Vhodnost závisí na diagnóze, funkci ledvin, hladině draslíku, těhotenství, dalších lécích a osobním plánu. Stejná hodnota může vyžadovat u dvou lidí rozdílný postup. Příliš rychlé snížení tlaku může omezit přívod krve do mozku, srdce či ledvin a způsobit závratě, kolaps nebo jiné komplikace."),
        warn("DO NOT — neberte další ani nepředepsaný captopril", "Nepůjčujte si jej, nezdvojujte běžnou léčbu a neopakujte tabletu jen proto, že se číslo rychle nezměnilo. Máte-li od lékaře písemný akční plán, držte se přesně jeho podmínek."),
        p("Vynechanou dávku, nedávnou změnu léčby nebo podezření na nežádoucí účinek řešte s lékařem či lékárníkem. Obecný článek nemůže určit, jak vynechání nahradit. Při akutních příznacích má volání 112 přednost před hledáním tablety, která slibuje rychlý pokles."),
      ] },
      { id: "myty", nav: "Mýty", eyebrow: "Rychlá řešení", h2: "Čaj, citron, česnek ani dýchání neléčí akutní stav", blocks: [
        lead("Některé návyky podporují kardiovaskulární zdraví dlouhodobě. Žádný z nich nenahrazuje vyšetření při varovných příznacích."),
        p("Bezkofeinový nálev nebo pomalé dýchání mohou pomoci se zklidnit, ale nižší hodnota po odpočinku nedokazuje, že riziko pominulo. Citron, česnek, ocet ani studená voda cévy okamžitě neuvolní. Byliny a doplňky mohou navíc ovlivňovat účinek antikoagulancií, diuretik a dalších léků."),
        ul(["Neodkládejte volání 112 kvůli internetovému receptu.", "Nekombinujte doplňky a léky, abyste vynutili pokles.", "Nevysazujte každodenní léčbu po jedné lepší hodnotě.", "Neužívejte lék příbuzného ani při stejné diagnóze.", "Sůl, spánek, pohyb, alkohol a hmotnost řešte jako dlouhodobá témata, ne jako okamžitou záchranu."]),
        p("Bezpečnější otázka zní: je to pohotovost, bylo měření spolehlivé a jaký osobní plán mám? Toto pořadí pomáhá zabránit zbytečné panice i nebezpečnému odkladu."),
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
    sources: [{ label: "ESC — Zvýšený tlak a hypertenze", href: ESC_GUIDELINE }, { label: "Rumunské ministerstvo zdravotnictví — protokol", href: MS_PROTOCOL }, { label: "Rumunská tísňová linka 112", href: EMERGENCY_112 }], sourcesNote: "Individuální rozhodnutí závisí na anamnéze, vyšetření, laboratorních výsledcích a předepsané léčbě.",
    faqEyebrow: "Časté otázky", faqH2: "Otázky k rychlému snížení tlaku", faqs: [
      { q: "Co doma okamžitě sníží krevní tlak?", a: "Neexistuje domácí prostředek bezpečný pro každého. Posaďte se, zkontrolujte příznaky, správně přeměřte a držte se osobního plánu. Při bolesti na hrudi, těžké dušnosti nebo neurologické změně volejte 112." },
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
    intro: "Es gibt keinen universell sicheren Hausgriff, der den Blutdruck sofort senkt. Rufen Sie <strong>112</strong>, wenn ein hoher Wert mit <strong>Brustschmerz, schwerer Atemnot, einseitiger Schwäche oder Taubheit, Sprachstörung, Verwirrtheit, Ohnmacht, plötzlicher Sehstörung oder einem plötzlich einsetzenden ungewöhnlich starken Kopfschmerz</strong> auftritt. Ohne diese Warnzeichen setzen Sie sich hin, ruhen einige Minuten und messen korrekt nach. Nehmen Sie kein zusätzliches Captopril, keine fremde Tablette, kein nicht verordnetes Medikament und keine Reste einer früheren Behandlung ohne persönlichen ärztlichen Plan.",
    facts: ["Brust-, Atem- oder neurologische Warnzeichen: 112", "Messwert mit korrekter Technik prüfen", "Keine zusätzlichen Medikamente auf eigene Faust"],
    primaryCta: { label: "Sprechstunde für chronische Erkrankungen", href: deHref("/services/boli-cronice-online") }, secondaryCta: { label: "Blutdruckprotokoll öffnen", href: deHref("/tools/blood-pressure-chart") },
    panelChip: "Sicherheit vor der Zahl", panelParas: ["Ein Einzelwert kann ungenau sein; akute Symptome dürfen dennoch nie übergangen werden.", "Ein erzwungener schneller Abfall kann Gehirn, Herz und Nieren gefährden.", "Dieser Text ersetzt weder 112 noch Notaufnahme oder persönlichen Behandlungsplan."],
    author: { initials: "RB", name: "Dr Robert Gabriel Brindus", line: "Facharzt für Allgemeinmedizin · Medizinischer Leiter, Global Health Rumänien" }, reviewLine: "Klinisch geprüft von Dr Andreea Lorena Bica, Fachärztin für Neurologie, Global Health Rumänien.", navLabel: "In diesem Leitfaden",
    sections: [
      { id: "erste-schritte", nav: "Erste Schritte", eyebrow: "Was jetzt zu tun ist", h2: "Sichere Schritte nach einem unerwartet hohen Messwert", blocks: [
        lead("Beenden Sie Anstrengung, setzen Sie sich sicher hin und achten Sie vor weiteren Messungen auf Warnsymptome."),
        ul(["Lehnen Sie den Rücken an, stellen Sie beide Füße flach auf und sprechen Sie während der Messung nicht.", "Stützen Sie den Arm auf Herzhöhe und verwenden Sie eine passende Oberarmmanschette.", "Messen Sie nach kurzer Pause zweimal und notieren Sie Uhrzeit, Puls, Beschwerden und Umstände.", "Bei Warnzeichen darf weiteres Nachmessen den Hilferuf nicht verzögern: Rufen Sie 112.", "Bleiben die Werte bei stabilem Befinden weit über Ihrem üblichen Bereich, holen Sie noch am selben Tag ärztlichen Rat ein."]),
        p("Diese Schritte behandeln keine Hypertonie. Sie vermeiden typische Messfehler und liefern verwertbare Angaben. Körperliche Belastung, Schmerzen, Angst, Koffein, Nikotin, Sprechen oder eine zu kleine Manschette können den Wert vorübergehend erhöhen. Schwere neue Symptome sollten Sie trotzdem nie vorschnell als Stress erklären."),
        p("Messen Sie nicht pausenlos weiter und wählen Sie nicht einfach den niedrigsten Wert. Das verstärkt häufig die Anspannung. Wichtiger sind wenige saubere Messungen, der genaue Beginn möglicher Beschwerden und eine vollständige Liste der regulär verordneten Medikamente."),
        warn("Bei akuten Beschwerden nicht selbst fahren", "Bei Brustschmerz, neurologischem Ausfall, Verwirrtheit, Ohnmacht oder schwerer Atemnot rufen Sie 112 und folgen der Leitstelle."),
      ] },
      { id: "notfall", nav: "112 rufen", eyebrow: "Warnzeichen", h2: "Wann sehr hoher Blutdruck ein Notfall ist", blocks: [
        lead("Ein Wert um oder über 180/120 mmHg ist sehr hoch und muss zeitnah beurteilt werden; zusammen mit akuten Organschäden-Symptomen ist er ein Notfall."),
        p("Warten Sie bei möglichen Schlaganfall-, Herzinfarkt- oder Lungenödemzeichen nicht auf Tee, Dusche oder eine improvisierte Tablette. Nennen Sie der Leitstelle Messwert, Symptome, Beginn, reguläre Medikamente und bekannte Erkrankungen. Ist jemand bei Ihnen, sollte die Person bleiben und Medikamentenliste sowie Ausweis bereithalten."),
        ul(["Brustschmerz oder Druck, besonders mit Schweiß, Übelkeit oder Kollapsgefühl.", "Schwere Atemnot, Erstickungsgefühl oder rasche Verschlechterung der Atmung.", "Hängender Mundwinkel, einseitige Schwäche oder verwaschene Sprache.", "Neue Verwirrtheit, Krampfanfall, Ohnmacht oder Bewusstlosigkeit.", "Plötzlicher Sehverlust oder explosionsartiger, ungewohnter Kopfschmerz."]),
        p("Schwangerschaft oder Wochenbett, Nierenerkrankung, früherer Schlaganfall und Herzerkrankung erhöhen die Dringlichkeit. Eine Notfallsituation wird nicht allein durch eine Zahl bestimmt. Umgekehrt darf ein etwas niedrigerer Kontrollwert ernste Symptome nicht entkräften."),
        cite(`In Rumänien gilt für akute Notfälle <a href="${EMERGENCY_112}" rel="nofollow noopener" target="_blank">112</a>. Europäische Leitlinien unterscheiden stark erhöhte Werte ohne akute Schädigung vom hypertensiven Notfall mit Organschaden.`),
      ] },
      { id: "captopril", nav: "Captopril", eyebrow: "Die Tablettenfrage", h2: "Für Captopril gibt es keinen universellen Grenzwert", blocks: [
        lead("Captopril ist verschreibungspflichtig und keine automatische Erste Hilfe, sobald das Messgerät eine bestimmte Zahl zeigt."),
        p("Ob es geeignet ist, hängt von Diagnose, Nierenfunktion, Kalium, Schwangerschaft, weiteren Arzneimitteln und persönlichem Plan ab. Derselbe Wert kann bei zwei Menschen unterschiedliche Maßnahmen erfordern. Ein zu schneller Blutdruckabfall kann die Durchblutung von Gehirn, Herz oder Nieren vermindern und Schwindel oder Kollaps auslösen."),
        warn("Kein zusätzliches oder nicht verordnetes Captopril", "Leihen Sie keine Tablette, verdoppeln Sie die übliche Behandlung nicht und wiederholen Sie nichts, nur weil sich die Anzeige nicht schnell ändert. Folgen Sie ausschließlich einem ausdrücklich für Sie erstellten Aktionsplan."),
        p("Eine vergessene Einnahme, eine kürzliche Umstellung oder eine vermutete Nebenwirkung gehört mit Arzt oder Apotheke besprochen. Ein allgemeiner Artikel kann keinen Ausgleich für eine vergessene Einnahme festlegen. Bei Notfallzeichen ist der Anruf bei 112 wichtiger als die Suche nach einer schnell wirkenden Tablette."),
      ] },
      { id: "mythen", nav: "Mythen", eyebrow: "Schnelle Hausmittel", h2: "Tee, Zitrone, Knoblauch und Atmen behandeln keinen Notfall", blocks: [
        lead("Manche Gewohnheiten fördern langfristig die Herz-Kreislauf-Gesundheit. Keine ersetzt die Akutbeurteilung bei Warnsymptomen."),
        p("Koffeinfreier Tee oder langsames Atmen können beruhigen. Ein niedrigerer Wert nach Ruhe beweist jedoch nicht, dass die Gefahr vorbei ist. Zitrone, Knoblauch, Essig und kaltes Wasser öffnen Blutgefäße nicht sofort. Pflanzliche Produkte können außerdem mit Blutverdünnern, Entwässerungsmitteln und anderen Arzneien wechselwirken."),
        ul(["Verzögern Sie 112 nie, um ein Internetrezept auszuprobieren.", "Kombinieren Sie keine Ergänzungsmittel und Medikamente, um einen Abfall zu erzwingen.", "Setzen Sie die tägliche Therapie nicht nach einem besseren Einzelwert ab.", "Nehmen Sie nie das Medikament eines Angehörigen, auch nicht bei gleicher Diagnose.", "Besprechen Sie Salz, Schlaf, Bewegung, Alkohol und Gewicht als Langzeitmaßnahmen, nicht als Soforthilfe."]),
        p("Die sichere Frage lautet: Liegt ein Notfall vor, war die Messung zuverlässig und welchen persönlichen Plan habe ich? Diese Reihenfolge verhindert sowohl unnötige Panik als auch gefährliches Warten."),
      ] },
      { id: "nachsorge", nav: "Nachsorge", eyebrow: "Nach der Situation", h2: "Verlauf dokumentieren und passende Versorgung wählen", blocks: [
        lead("Ein kurzes, genaues Protokoll ist hilfreicher als viele Messungen hintereinander in Angst."),
        p(`Im <a href="${deHref("/tools/blood-pressure-chart")}">Blutdruckprotokoll</a> notieren Sie Uhrzeit, Arm, Haltung, Puls, Beschwerden, reguläre Therapie und Umstände wie Schmerz, Fieber oder Schlafmangel. Bewahren Sie alle Werte auf, nicht nur den höchsten.`),
        p(`Ohne Warnzeichen kann eine <a href="${deHref("/services/boli-cronice-online")}">Online-Sprechstunde für chronische Erkrankungen</a> Protokoll, Medikamente und Risiken prüfen und klären, ob Labor, EKG, persönliche Untersuchung oder Kardiologie nötig sind.`),
        ul(["Bereiten Sie alle Medikamente einschließlich Abschwellern, Entzündungshemmern und Ergänzungen vor.", "Nennen Sie ausgelassene Einnahmen, gleichen Sie diese aber nicht selbst aus.", "Fragen Sie, welche künftigen Werte in Ihrem Plan Kontakt am selben Tag verlangen.", "Nutzen Sie Termine nur im stabilen Zustand; akute Warnzeichen gehören zu 112."]),
        p(`Unter <a href="${deHref("/doctors")}">Unsere Ärzte</a> finden Sie Profile; die <a href="${deHref("/contact")}">Kontaktseite</a> hilft bei der Buchung. Beide Wege sind keine Notfallkanäle.`),
      ] },
    ],
    linksEyebrow: "Global Health Rumänien", linksH2: "Den nächsten Schritt passend wählen", linksLead: "Ohne Notfallzeichen ordnen Sie die Werte und besprechen den Verlauf. Mit Warnzeichen rufen Sie 112.",
    links: [{ label: "Online-Sprechstunde chronische Erkrankungen", href: deHref("/services/boli-cronice-online") }, { label: "Blutdruckprotokoll", href: deHref("/tools/blood-pressure-chart") }, { label: "Ärzte in Rumänien", href: deHref("/doctors") }, { label: "Global Health kontaktieren", href: deHref("/contact") }],
    ctaBox: { h3: "Wiederholt hohe Werte ohne Warnzeichen?", text: "Buchen Sie mit Protokoll, Medikamentenliste und Symptomen. Der Arzt kann weitere Messungen, Untersuchungen oder eine Überweisung planen.", primary: { label: "Sprechstunde buchen", href: deHref("/services/boli-cronice-online") }, secondary: { label: "Ärzte ansehen", href: deHref("/doctors") } },
    sourcesEyebrow: "Klinische Quellen", sourcesH2: "Grundlagen dieses Leitfadens", sourcesLead: "Die Quellen trennen Notfalltriage von Langzeitbehandlung und geben kein universelles Arzneischema vor.",
    sources: [{ label: "ESC — Erhöhter Blutdruck und Hypertonie", href: ESC_GUIDELINE }, { label: "Rumänisches Gesundheitsministerium — Protokoll", href: MS_PROTOCOL }, { label: "Rumänischer Notruf 112", href: EMERGENCY_112 }], sourcesNote: "Individuelle Entscheidungen hängen von Vorgeschichte, Untersuchung, Laborwerten und verordneter Therapie ab.",
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
  authorDisplayName: "Dr Robert Gabriel Brindus",
  reviewerDoctorId: "cmrc4j7oc00se01p2gf7y9ldw",
  reviewerDisplayName: "Dr Andreea Lorena Bica",
  posts: [ro, en, pt, es, cs, de],
};

// Render during module evaluation so malformed article data fails before seeding.
for (const post of RO_SCADE_TENSIUNEA_RAPID.posts) renderArticle(post.article);
