/**
 * Romania — article 1 of 2.
 *
 * Target keyword: "scrisoare medicala" — 1,000/mo, KD 0 (OpenSEO /
 * DataForSEO, location 2642, language ro, expansion run 2026-08-04).
 * Cluster, all KD 0 unless noted: scrisoare medicala model 260 · model
 * scrisoare medicala pdf 170 · scrisoare medicala anexa 5 110 · cat are
 * valabilitate o scrisoare medicala 90 · scrisoare medicala anexa 43 model nou
 * 90 · model scrisoare medicala handicap 90 · eliberare scrisoare medicala 70 ·
 * model scrisoare medicala medic de familie 70 · legislatie scrisoare medicala
 * 50 · scrisoare medicala completata 50 · cine elibereaza scrisoarea medicala
 * 30 · ce este scrisoarea medicala 30 · scrisoare medicala medic privat 30
 * (navigational) · rolul scrisorii medicale 10.
 *
 * Target unchanged by the expansion. The tail is almost entirely "give me the
 * form" plus three real questions nobody answers in prose: who issues it, how
 * long it is valid, and what it is actually for. The article answers those.
 *
 * SERP read (get_serp_results, ro/2642, 2026-08-04): rank 1 is the CNAS PDF of
 * the form itself, then a wall of county DGASPC and hospital PDFs of the same
 * form (dgaspcsj.ro, asistentasociala6.ro, primariasandra.ro, cmdhr.ro,
 * dgaspcbv.ro, dgaspcdolj.ro, dgaspccs.ro, spitalspiridon.ro), plus lege5.ro
 * and one family-doctor blog. Page one is documents, not explanations. There
 * is no doctor-authored page that tells a patient what to do when the letter
 * they were given is incomplete, expired, or the wrong one.
 *
 * Facts anchored to verified sources, 2026-08-04:
 *  - CNAS publishes the single standard form (model unic, tipizat) used in the
 *    health-insurance system: cnas.ro/wp-content/uploads/2024/12/
 *    SCRISOARE-MEDICALA-2024.pdf, addressed "Stimate(ă) coleg(ă)".
 *  - The anexa 43 model carries the note that the letter is drawn up in two
 *    copies, one of which stays with the issuing doctor.
 *  - The handicap-evaluation commission uses its own annex of the same
 *    document (the county DGASPC forms above).
 *
 * HONESTY CONSTRAINT. Documents settled by the health-insurance house — the
 * bilet de trimitere, the rețetă compensată and the standard insurance-system
 * scrisoare medicală — can only be issued by a doctor in a contractual
 * relationship with a casă de asigurări de sănătate. Global Health Romania is
 * private: our doctors issue a clinical letter or report for private use, and
 * coordinate investigations. The article says that in its own section rather
 * than implying we can produce a CNAS form.
 *
 * No figures: validity periods follow the therapeutic protocol and the annual
 * norms, both of which move. Every validity question points at CNAS.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const CNAS = "https://cnas.ro/";
const CNAS_FORM = "https://cnas.ro/wp-content/uploads/2024/12/SCRISOARE-MEDICALA-2024.pdf";
const MS = "https://www.ms.ro/";
const CMR = "https://www.cmr.ro/";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/romania/${lang}${path}`;

const ro: LocalePost = {
  locale: "RO",
  slug: "scrisoare-medicala-cine-o-elibereaza",
  title: "Scrisoarea medicală: cine o eliberează, ce conține și la ce folosește",
  excerpt:
    "Scrisoarea medicală este documentul prin care medicul specialist comunică medicului de familie diagnosticul și recomandările. Explicăm cine o eliberează, ce trebuie să conțină, cât este valabilă și ce faceți când primiți una incompletă.",
  seoTitle: "Scrisoare medicală: cine o eliberează și la ce folosește",
  seoDescription:
    "Scrisoarea medicală în România: cine o eliberează, ce trebuie să conțină, la ce folosește, cât este valabilă și ce faceți dacă este incompletă.",
  category: "Ghiduri pentru pacienți",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Ghiduri pentru pacienți",
    categoryHref: href("ro", "/blog"),
    eyebrow: "România · Ghid pentru pacienți",
    h1: "Scrisoarea medicală",
    deck: "Este scrisă de un medic pentru alt medic, dar cel care suportă consecințele când lipsește ceva din ea sunteți dumneavoastră.",
    intro:
      "<strong>Scrisoarea medicală</strong> este documentul prin care medicul specialist sau spitalul comunică <strong>medicului de familie</strong> diagnosticul, investigațiile efectuate și recomandările de tratament. În sistemul de asigurări sociale de sănătate are un <strong>model unic, tipizat</strong>, publicat de CNAS, iar formularul începe cu formula „Stimate(ă) coleg(ă)” tocmai pentru că este o comunicare între medici. Pe baza ei, medicul de familie poate continua prescrierea tratamentului cronic. Tot o scrisoare medicală vi se cere și la dosarul pentru comisia de evaluare a persoanelor cu handicap, la înscrierea copilului în colectivitate sau pentru anumite dosare de asigurări — cu conținut adaptat scopului.",
    facts: [
      "Model unic, tipizat, publicat de CNAS",
      "Se întocmește în două exemplare",
      "Stă la baza rețetei cronice",
    ],
    primaryCta: { label: "Consultație și coordonare medicală", href: href("ro", "/services/trimiteri-si-investigatii") },
    secondaryCta: { label: "Formularul CNAS", href: CNAS_FORM },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "Cine are dreptul să elibereze o scrisoare medicală și în ce situații.",
      "Ce trebuie să conțină ca să fie acceptată, și cele mai frecvente motive pentru care nu este.",
      "Ce poate face o consultație online privată și ce documente rămân în sarcina medicilor aflați în contract cu casa de asigurări.",
      "Valabilitatea depinde de protocolul terapeutic și de normele în vigoare, care se modifică. Aici nu apar termene: fiecare întrebare de acest fel trimite la CNAS.",
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
        id: "ce-este",
        nav: "Ce este",
        eyebrow: "Punctul de plecare",
        h2: "Ce este, de fapt, scrisoarea medicală",
        blocks: [
          lead("Nu este o adeverință și nu este un certificat. Este o scrisoare de la un medic către alt medic, cu dumneavoastră ca subiect."),
          p("Rolul ei este continuitatea îngrijirii. Medicul de familie vă urmărește în timp, dar nu este prezent la consultația de specialitate și nu are acces automat la ce s-a discutat acolo. Scrisoarea medicală transportă acea informație înapoi: ce s-a constatat, ce s-a exclus, ce tratament s-a stabilit și ce urmează."),
          p("În sistemul de asigurări sociale de sănătate formularul este <strong>tipizat</strong>, cu un model unic aprobat, iar modelul din anexă precizează că documentul <strong>se întocmește în două exemplare</strong>, unul rămânând la medicul care îl eliberează. Este un detaliu util: dacă pierdeți exemplarul dumneavoastră, cabinetul sau spitalul care l-a emis are, în principiu, evidența lui."),
          ul([
            "Este un document <strong>medical</strong>, nu administrativ — conținutul îl decide medicul, nu pacientul.",
            "Circulă <strong>între medici</strong>, dar vă este înmânat dumneavoastră.",
            "Stă la baza <strong>continuării tratamentului</strong> de către medicul de familie.",
            "Un document similar, cu alt conținut, este cerut de <strong>comisia de evaluare</strong> a persoanelor adulte cu handicap.",
          ]),
          cite(`Model unic publicat de <a href="${CNAS_FORM}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "cine-elibereaza",
        nav: "Cine o eliberează",
        eyebrow: "Circuitul",
        h2: "Cine eliberează scrisoarea medicală",
        blocks: [
          lead("Răspunsul scurt: medicul care v-a evaluat. Răspunsul util depinde de motivul pentru care aveți nevoie de ea."),
          ul([
            "<strong>Medicul specialist din ambulatoriu</strong> — după consultația de specialitate, pentru medicul de familie.",
            "<strong>Spitalul, la externare</strong> — împreună cu biletul de externare, pentru continuarea tratamentului.",
            "<strong>Medicul de familie</strong> — când documentul este cerut de o comisie, de o unitate de învățământ sau de un angajator, în forma potrivită acelui scop.",
            "<strong>Medicul din sistemul privat</strong> — poate emite o scrisoare medicală sau un raport medical pentru uz privat; documentele decontate din fondul de asigurări sunt însă rezervate medicilor aflați în relație contractuală cu casa de asigurări.",
          ]),
          p("Distincția din ultimul punct explică majoritatea drumurilor pierdute. Un medic privat vă poate evalua, vă poate scrie concluziile și recomandările și vă poate îndruma, dar <strong>biletul de trimitere</strong> și <strong>rețeta compensată</strong> aparțin circuitului asigurărilor de sănătate. Dacă aveți nevoie de un document decontat, întrebați din start dacă medicul este în contract cu casa de asigurări."),
          warn("Nu porniți la drum fără să întrebați ce formular vi se cere", "Instituția care vă cere documentul — comisie, școală, angajator, asigurator — are aproape întotdeauna un model propriu. Cereți-l în scris înainte de programare și duceți-l cu dumneavoastră la consultație. Este cea mai simplă metodă de a evita o a doua deplasare."),
        ],
      },
      {
        id: "ce-contine",
        nav: "Ce conține",
        eyebrow: "Conținut",
        h2: "Ce trebuie să conțină ca să fie acceptată",
        blocks: [
          lead("Cele mai multe scrisori respinse nu sunt greșite. Sunt incomplete."),
          p("Indiferent de model, o scrisoare medicală utilă conține datele de identificare ale pacientului, data emiterii, unitatea și medicul emitent cu parafă și semnătură, motivul evaluării, istoricul relevant, diagnosticul, investigațiile efectuate cu rezultatele lor și recomandările — tratament, doze, durată și data controlului următor."),
          ul([
            "<strong>Diagnosticul complet</strong>, nu doar o abreviere sau un cod.",
            "<strong>Investigațiile</strong> pe care se bazează diagnosticul, cu date și rezultate.",
            "<strong>Tratamentul recomandat</strong>, cu denumire, doză și durată — fără acestea, medicul de familie nu are pe ce continua prescrierea.",
            "<strong>Data controlului</strong> sau intervalul de reevaluare.",
            "<strong>Parafa, semnătura și ștampila</strong> unității emitente.",
            "Pentru dosarele de comisie, exact <strong>rubricile din anexa cerută</strong>, completate integral.",
          ]),
          p("Verificați documentul <strong>înainte de a pleca din cabinet</strong>. Este mult mai simplu să se completeze o rubrică pe loc decât să reveniți peste o săptămână, iar dacă un rezultat lipsește, medicul îl poate anexa imediat."),
        ],
      },
      {
        id: "valabilitate",
        nav: "Valabilitate",
        eyebrow: "Întrebarea frecventă",
        h2: "Cât este valabilă o scrisoare medicală",
        blocks: [
          lead("Aceasta este întrebarea la care internetul dă cele mai multe răspunsuri contradictorii, și motivul este simplu: răspunsul depinde."),
          p("Valabilitatea nu este o proprietate a hârtiei, ci a scopului. Pentru continuarea tratamentului cronic, ea se raportează la <strong>protocolul terapeutic</strong> al afecțiunii și la normele în vigoare. Pentru un dosar de comisie sau pentru o instituție, termenul îl stabilește instituția care cere documentul. Pentru că ambele se modifică, în acest articol nu găsiți un număr de zile sau de luni: îl confirmați la CNAS, respectiv la instituția solicitantă."),
          ul([
            "Valabilitatea curge de la <strong>data eliberării</strong> — verificați ca data să fie completată.",
            "Pentru tratamentul cronic, reperul este <strong>protocolul terapeutic</strong>, nu o regulă generală.",
            "Pentru dosare, reperul este <strong>cerința instituției</strong>, care poate fi mai strictă.",
            "Dacă starea dumneavoastră s-a schimbat între timp, documentul vechi nu mai descrie realitatea, indiferent de termen.",
          ]),
          cite(`Normele în vigoare și protocoalele terapeutice: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a> · <a href="${MS}" rel="nofollow noopener" target="_blank">Ministerul Sănătății</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Consultație online",
        eyebrow: "Transparență",
        h2: "Ce poate și ce nu poate o consultație online privată",
        blocks: [
          lead("Spunem asta la început, pentru că este prima întrebare și pentru că răspunsul onest economisește timp."),
          p("O consultație online privată <strong>nu emite documente decontate din fondul de asigurări</strong> — bilet de trimitere sau rețetă compensată. Acestea aparțin medicilor aflați în relație contractuală cu casa de asigurări de sănătate. Orice serviciu privat care promite altceva promite ceva ce nu poate livra."),
          p("În schimb, o consultație online rezolvă bine partea care se blochează cel mai des:"),
          ul([
            "<strong>Evaluare clinică</strong> fără listă de așteptare și un document scris care descrie ce s-a constatat.",
            "<strong>Interpretarea rezultatelor</strong> pe care le aveți deja și clarificarea a ceea ce înseamnă.",
            "<strong>Ordonarea dosarului</strong>: ce documente vă lipsesc, în ce ordine se obțin și de la cine.",
            "<strong>Recomandarea investigațiilor</strong> potrivite, ca să nu faceți analize care nu vă schimbă conduita.",
            "<strong>A doua opinie</strong> înainte de o decizie importantă.",
            "<strong>Monitorizarea</strong> între controalele de specialitate.",
          ]),
          p(`Puteți verifica înscrierea oricărui medic la <a href="${CMR}" rel="nofollow noopener" target="_blank">Colegiul Medicilor din România</a>, la noi ca oriunde altundeva.`),
        ],
      },
      {
        id: "probleme",
        nav: "Probleme frecvente",
        eyebrow: "Practic",
        h2: "Ce faceți când scrisoarea nu este bună",
        blocks: [
          lead("Trei situații acoperă aproape toate cazurile în care documentul este refuzat."),
          ul([
            "<strong>Lipsește o rubrică</strong> — reveniți la medicul emitent pentru completare. Un alt medic nu poate completa documentul altcuiva.",
            "<strong>Este pe modelul greșit</strong> — cereți instituției modelul exact, în scris, și mergeți cu el la consultație.",
            "<strong>A expirat pentru scopul respectiv</strong> — este nevoie de o reevaluare, nu de o simplă redatare. Dacă un medic vă redatează un document fără să vă vadă, aceea nu este o favoare.",
          ]),
          p("Și o situație care nu ține de hârtii: dacă starea dumneavoastră s-a agravat de la ultima evaluare, prioritatea este consultația, nu documentul. Semne precum durere în piept, lipsă de aer în repaus, slăbiciune bruscă pe o parte a corpului, tulburări de vorbire, febră cu redoare de ceafă sau confuzie înseamnă <strong>112</strong>, nu o programare."),
        ],
      },
    ],
    linksEyebrow: "Global Health România",
    linksH2: "Pașii următori",
    linksLead:
      "Medicii noștri din România evaluează online, redactează concluziile în scris și vă spun clar ce se rezolvă privat și ce rămâne în circuitul casei de asigurări.",
    links: [
      { label: "Scrisori medicale, trimiteri și investigații", href: href("ro", "/services/trimiteri-si-investigatii") },
      { label: "Medicii noștri din România", href: href("ro", "/doctors") },
      { label: "Contactați Global Health România", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Nu știți ce document vă trebuie?",
      text: "O consultație scurtă lămurește ce vi se cere, ce se poate emite privat și ce trebuie obținut de la un medic aflat în contract cu casa de asigurări — înainte să pierdeți o zi pe drumuri.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/trimiteri-si-investigatii") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "Unde verificați regulile",
    sourcesLead:
      "Modelul formularului, valabilitatea și normele se modifică. Verificați întotdeauna la sursă.",
    sources: [
      { label: "CNAS — model scrisoare medicală", href: CNAS_FORM },
      { label: "Casa Națională de Asigurări de Sănătate", href: CNAS },
      { label: "Ministerul Sănătății", href: MS },
      { label: "Colegiul Medicilor din România", href: CMR },
    ],
    sourcesNote:
      "Linkurile deschid site-urile instituțiilor competente. Global Health este un furnizor privat și nu emite documente decontate din Fondul național unic de asigurări sociale de sănătate.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Ce este scrisoarea medicală?",
        a: "Este documentul prin care medicul specialist sau spitalul comunică medicului de familie diagnosticul, investigațiile efectuate și recomandările de tratament. În sistemul de asigurări are un model unic, tipizat, publicat de CNAS, și se întocmește în două exemplare, dintre care unul rămâne la medicul emitent.",
      },
      {
        q: "Cine eliberează scrisoarea medicală?",
        a: "Medicul care v-a evaluat: medicul specialist din ambulatoriu, spitalul la externare sau medicul de familie, în funcție de scop. Un medic din sistemul privat poate emite o scrisoare medicală pentru uz privat, dar documentele decontate din fondul de asigurări aparțin medicilor aflați în relație contractuală cu casa de asigurări.",
      },
      {
        q: "Cât este valabilă o scrisoare medicală?",
        a: "Depinde de scop. Pentru continuarea tratamentului cronic, reperul este protocolul terapeutic al afecțiunii și normele în vigoare; pentru un dosar, termenul îl stabilește instituția care solicită documentul. Ambele se modifică, așa că verificați la CNAS și la instituția solicitantă.",
      },
      {
        q: "Ce trebuie să conțină ca să fie acceptată?",
        a: "Datele pacientului, data emiterii, unitatea și medicul emitent cu parafă și semnătură, diagnosticul complet, investigațiile cu rezultatele lor, tratamentul recomandat cu doză și durată și data controlului. Verificați documentul înainte de a pleca din cabinet — o rubrică se completează pe loc mult mai ușor decât peste o săptămână.",
      },
      {
        q: "Am nevoie de scrisoare medicală pentru comisia de handicap. Este același document?",
        a: "Este același tip de document, dar comisia folosește propriul model, cu rubrici specifice. Cereți instituției modelul exact, în scris, și mergeți cu el la consultație, altfel documentul riscă să fie refuzat pentru formă, nu pentru conținut.",
      },
      {
        q: "Pot obține o scrisoare medicală online?",
        a: "O consultație online privată poate emite o scrisoare medicală sau un raport pentru uz privat, poate interpreta rezultatele pe care le aveți și poate ordona dosarul. Biletul de trimitere și rețeta compensată rămân însă în circuitul casei de asigurări de sănătate.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Articol scris de Dr Robert Gabriel Brindus, medic de familie și director medical al Global Health România, și revizuit clinic de Dr Andreea Lorena Bica, medic specialist neurolog. Conține informații generale despre documentele medicale din România și nu constituie sfat medical personalizat. Conținutul unui document medical este stabilit de medicul care efectuează evaluarea. Global Health este furnizor privat și nu emite documente decontate din fondul de asigurări sociale de sănătate. În caz de urgență medicală, sunați imediat la 112.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "medical-letter-romania",
  title: "The medical letter in Romania: who issues it, what it contains and what it is for",
  excerpt:
    "The scrisoare medicală is how a specialist tells your family doctor the diagnosis and the plan. Who may issue it, what it must contain, how long it stays valid and what to do when the one you were handed is incomplete.",
  seoTitle: "Medical letter in Romania: who issues it",
  seoDescription:
    "The medical letter in Romania: who issues it, what it must contain, what it is used for, how long it is valid and what to do if it is incomplete.",
  category: "Patient guides",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "Patient guides",
    categoryHref: href("en", "/blog"),
    eyebrow: "Romania · Patient guide",
    h1: "The medical letter",
    deck: "It is written by one doctor for another, but the person who pays for anything missing from it is you.",
    intro:
      "The <strong>scrisoare medicală</strong> — the medical letter — is the document through which a specialist or a hospital tells your <strong>family doctor</strong> the diagnosis, the investigations done and the treatment recommendations. Within the social health insurance system it has a <strong>single standard form</strong> published by CNAS, and that form opens with «Stimate(ă) coleg(ă)» precisely because it is a communication between doctors. On the strength of it, your family doctor can carry on prescribing chronic treatment. A medical letter is also asked for in the file for the disability assessment commission, when enrolling a child in a school or nursery, and for certain insurance files — with content adapted to the purpose.",
    facts: [
      "A single standard CNAS form",
      "Drawn up in two copies",
      "The basis of the chronic prescription",
    ],
    primaryCta: { label: "Consultation and medical coordination", href: href("en", "/services/trimiteri-si-investigatii") },
    secondaryCta: { label: "The CNAS form", href: CNAS_FORM },
    panelChip: "What this guide covers",
    panelParas: [
      "Who is entitled to issue a medical letter, and in which situations.",
      "What it must contain to be accepted, and the commonest reasons it is not.",
      "What a private online consultation can do, and which documents remain with doctors contracted to the health insurance house.",
      "Validity follows the therapeutic protocol and the norms in force, both of which change. No periods appear here: every question of that kind points at CNAS.",
    ],
    author: {
      initials: "RB",
      name: "Dr Robert Gabriel Brindus",
      line: "General Practitioner · Medical Director, Global Health Romania",
    },
    reviewLine:
      "Clinically reviewed by Dr Andreea Lorena Bica, Consultant Neurologist, Global Health Romania.",
    navLabel: "In this article",
    sections: [
      {
        id: "ce-este",
        nav: "What it is",
        eyebrow: "Starting point",
        h2: "What the medical letter actually is",
        blocks: [
          lead("It is not a certificate and it is not an attestation. It is a letter from one doctor to another, with you as its subject."),
          p("Its purpose is continuity of care. Your family doctor follows you over time but is not present at the specialist appointment and has no automatic access to what was discussed there. The medical letter carries that information back: what was found, what was ruled out, what treatment was decided and what comes next."),
          p("Within the social health insurance system the form is <strong>standardised</strong>, with a single approved model, and the annexed model states that the document is <strong>drawn up in two copies</strong>, one of which stays with the issuing doctor. That is a useful detail: if you lose your copy, the practice or hospital that issued it should, in principle, still have a record of it."),
          ul([
            "It is a <strong>medical</strong> document, not an administrative one — the doctor decides the content, not the patient.",
            "It travels <strong>between doctors</strong>, but it is handed to you.",
            "It underpins the <strong>continuation of treatment</strong> by your family doctor.",
            "A similar document with different content is required by the <strong>assessment commission</strong> for adults with disabilities.",
          ]),
          cite(`Standard model published by <a href="${CNAS_FORM}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "cine-elibereaza",
        nav: "Who issues it",
        eyebrow: "The pathway",
        h2: "Who issues the medical letter",
        blocks: [
          lead("The short answer: the doctor who assessed you. The useful answer depends on why you need it."),
          ul([
            "<strong>The outpatient specialist</strong> — after the specialist consultation, for your family doctor.",
            "<strong>The hospital, on discharge</strong> — together with the discharge note, so treatment can continue.",
            "<strong>Your family doctor</strong> — when the document is required by a commission, a school or an employer, in the form suited to that purpose.",
            "<strong>A doctor in the private system</strong> — may issue a medical letter or a medical report for private use; documents reimbursed from the insurance fund are, however, reserved for doctors in a contractual relationship with the health insurance house.",
          ]),
          p("That last distinction explains most wasted journeys. A private doctor can assess you, write up the findings and recommendations and direct you onwards, but the <strong>bilet de trimitere</strong> (referral note) and the <strong>subsidised prescription</strong> belong to the insurance pathway. If you need a reimbursed document, ask at the outset whether the doctor is contracted to the insurance house."),
          warn("Do not set off without asking which form is required", "The institution asking for the document — commission, school, employer, insurer — almost always has its own model. Ask for it in writing before you book and take it with you to the appointment. It is the simplest way to avoid a second trip."),
        ],
      },
      {
        id: "ce-contine",
        nav: "What it contains",
        eyebrow: "Content",
        h2: "What it must contain to be accepted",
        blocks: [
          lead("Most rejected letters are not wrong. They are incomplete."),
          p("Whatever the model, a useful medical letter carries the patient's identifying details, the date of issue, the issuing unit and doctor with stamp and signature, the reason for the assessment, the relevant history, the diagnosis, the investigations performed with their results, and the recommendations — treatment, doses, duration and the date of the next review."),
          ul([
            "The <strong>full diagnosis</strong>, not merely an abbreviation or a code.",
            "The <strong>investigations</strong> the diagnosis rests on, with dates and results.",
            "The <strong>recommended treatment</strong>, with name, dose and duration — without these your family doctor has nothing on which to continue prescribing.",
            "The <strong>review date</strong> or the reassessment interval.",
            "The <strong>stamp, signature and seal</strong> of the issuing unit.",
            "For commission files, exactly the <strong>fields of the annex requested</strong>, filled in completely.",
          ]),
          p("Check the document <strong>before you leave the consulting room</strong>. Filling in a field on the spot is far easier than coming back a week later, and if a result is missing the doctor can attach it immediately."),
        ],
      },
      {
        id: "valabilitate",
        nav: "Validity",
        eyebrow: "The common question",
        h2: "How long a medical letter stays valid",
        blocks: [
          lead("This is the question the internet answers most contradictorily, and the reason is simple: it depends."),
          p("Validity is not a property of the paper but of the purpose. For continuing chronic treatment it follows the <strong>therapeutic protocol</strong> for the condition and the norms in force. For a commission file or an institution, the deadline is set by whoever is asking for the document. Because both change, you will not find a number of days or months in this article: you confirm it with CNAS, or with the institution requesting it."),
          ul([
            "Validity runs from the <strong>date of issue</strong> — check that the date has been filled in.",
            "For chronic treatment the reference is the <strong>therapeutic protocol</strong>, not a general rule.",
            "For files, the reference is the <strong>institution's requirement</strong>, which may be stricter.",
            "If your condition has changed in the meantime, the old document no longer describes reality, whatever the deadline says.",
          ]),
          cite(`Norms in force and therapeutic protocols: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a> · <a href="${MS}" rel="nofollow noopener" target="_blank">Ministry of Health</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Online consultation",
        eyebrow: "Transparency",
        h2: "What a private online consultation can and cannot do",
        blocks: [
          lead("We say this at the outset, because it is the first question and because an honest answer saves time."),
          p("A private online consultation <strong>does not issue documents reimbursed from the insurance fund</strong> — no referral note, no subsidised prescription. Those belong to doctors in a contractual relationship with the health insurance house. Any private service promising otherwise is promising something it cannot deliver."),
          p("What an online consultation does handle well is the part that most often gets stuck:"),
          ul([
            "<strong>Clinical assessment</strong> without a waiting list, and a written document describing what was found.",
            "<strong>Interpreting results</strong> you already have and clarifying what they mean.",
            "<strong>Putting the file in order</strong>: which documents you are missing, in what order to obtain them and from whom.",
            "<strong>Recommending the right investigations</strong>, so you do not pay for tests that change nothing.",
            "<strong>A second opinion</strong> before an important decision.",
            "<strong>Monitoring</strong> between specialist reviews.",
          ]),
          p(`You can check any doctor's registration with the <a href="${CMR}" rel="nofollow noopener" target="_blank">Romanian College of Physicians</a> — ours as readily as anyone else's.`),
        ],
      },
      {
        id: "probleme",
        nav: "Common problems",
        eyebrow: "Practical",
        h2: "What to do when the letter is not good enough",
        blocks: [
          lead("Three situations cover almost every case in which the document is refused."),
          ul([
            "<strong>A field is missing</strong> — go back to the issuing doctor to have it completed. Another doctor cannot fill in someone else's document.",
            "<strong>It is on the wrong model</strong> — ask the institution for the exact model, in writing, and take it to the appointment.",
            "<strong>It has expired for that purpose</strong> — what is needed is a reassessment, not simply a new date. A doctor who re-dates a document without seeing you is not doing you a favour.",
          ]),
          p("And one situation that has nothing to do with paperwork: if your condition has worsened since the last assessment, the priority is the consultation, not the document. Signs such as chest pain, breathlessness at rest, sudden weakness on one side of the body, difficulty speaking, or fever with neck stiffness or confusion mean <strong>112</strong>, not an appointment."),
        ],
      },
    ],
    linksEyebrow: "Global Health Romania",
    linksH2: "Next steps",
    linksLead:
      "Our doctors in Romania assess online, write up their conclusions and tell you plainly what can be settled privately and what stays within the insurance pathway.",
    links: [
      { label: "Medical letters, referrals and investigations", href: href("en", "/services/trimiteri-si-investigatii") },
      { label: "Our doctors in Romania", href: href("en", "/doctors") },
      { label: "Contact Global Health Romania", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Not sure which document you need?",
      text: "A short consultation clarifies what is being asked of you, what can be issued privately and what must come from a doctor contracted to the insurance house — before you lose a day travelling.",
      primary: { label: "Book a consultation", href: href("en", "/services/trimiteri-si-investigatii") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to check the rules",
    sourcesLead: "The form, its validity and the norms change. Always check at source.",
    sources: [
      { label: "CNAS — medical letter form", href: CNAS_FORM },
      { label: "National Health Insurance House (CNAS)", href: CNAS },
      { label: "Ministry of Health", href: MS },
      { label: "Romanian College of Physicians", href: CMR },
    ],
    sourcesNote:
      "Links open the competent bodies' own websites. Global Health is a private provider and does not issue documents reimbursed from the national health insurance fund.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "What is the scrisoare medicală?",
        a: "It is the document through which a specialist or hospital tells your family doctor the diagnosis, the investigations performed and the treatment recommendations. Within the insurance system it has a single standard form published by CNAS and is drawn up in two copies, one of which stays with the issuing doctor.",
      },
      {
        q: "Who issues the medical letter?",
        a: "The doctor who assessed you: the outpatient specialist, the hospital on discharge, or your family doctor, depending on the purpose. A private doctor may issue a medical letter for private use, but documents reimbursed from the insurance fund belong to doctors contracted to the health insurance house.",
      },
      {
        q: "How long is a medical letter valid?",
        a: "It depends on the purpose. For continuing chronic treatment the reference is the therapeutic protocol for the condition and the norms in force; for a file, the deadline is set by the institution requesting it. Both change, so confirm with CNAS and with the requesting institution.",
      },
      {
        q: "What must it contain to be accepted?",
        a: "The patient's details, the date of issue, the issuing unit and doctor with stamp and signature, the full diagnosis, the investigations with their results, the recommended treatment with dose and duration, and the review date. Check the document before leaving the consulting room — a field is far easier to complete on the spot than a week later.",
      },
      {
        q: "I need a medical letter for the disability commission. Is it the same document?",
        a: "It is the same type of document, but the commission uses its own model with specific fields. Ask the institution for the exact model, in writing, and take it to the appointment; otherwise the document risks being refused on form rather than on content.",
      },
      {
        q: "Can I obtain a medical letter online?",
        a: "A private online consultation can issue a medical letter or report for private use, interpret the results you already have and put your file in order. The referral note and the subsidised prescription, however, remain within the health insurance pathway.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr Robert Gabriel Brindus, General Practitioner and Medical Director of Global Health Romania, and clinically reviewed by Dr Andreea Lorena Bica, Consultant Neurologist. It contains general information about medical documents in Romania and is not personalised medical advice. The content of a medical document is decided by the doctor carrying out the assessment. Global Health is a private provider and does not issue documents reimbursed from the social health insurance fund. In a medical emergency, call 112 immediately.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "carta-medica-romenia",
  title: "A carta médica na Roménia: quem a emite, o que contém e para que serve",
  excerpt:
    "A scrisoare medicală é o documento com que o especialista comunica ao médico de família o diagnóstico e o plano. Quem a pode emitir, o que tem de conter, quanto tempo é válida e o que fazer quando lhe entregam uma incompleta.",
  seoTitle: "Carta médica na Roménia: quem a emite",
  seoDescription:
    "A carta médica na Roménia: quem a emite, o que deve conter, para que serve, quanto tempo é válida e o que fazer se estiver incompleta.",
  category: "Guias para doentes",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Guias para doentes",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Roménia · Guia para doentes",
    h1: "A carta médica",
    deck: "É escrita por um médico para outro médico, mas quem sofre as consequências quando lhe falta alguma coisa é o doente.",
    intro:
      "A <strong>scrisoare medicală</strong> — a carta médica — é o documento com que o médico especialista ou o hospital comunica ao <strong>médico de família</strong> o diagnóstico, os exames realizados e as recomendações de tratamento. No sistema de seguro social de saúde tem um <strong>modelo único, normalizado</strong>, publicado pela CNAS, e o formulário abre com a fórmula «Stimate(ă) coleg(ă)» precisamente por ser uma comunicação entre médicos. Com base nela, o médico de família pode continuar a prescrever o tratamento crónico. Também lhe é pedida uma carta médica no processo para a comissão de avaliação da deficiência, na inscrição de uma criança em creche ou escola e em certos processos de seguros — com conteúdo adaptado ao fim.",
    facts: [
      "Modelo único publicado pela CNAS",
      "Emitida em dois exemplares",
      "Base da receita crónica",
    ],
    primaryCta: { label: "Consulta e coordenação médica", href: href("pt", "/services/trimiteri-si-investigatii") },
    secondaryCta: { label: "Formulário da CNAS", href: CNAS_FORM },
    panelChip: "O que este guia cobre",
    panelParas: [
      "Quem tem direito a emitir uma carta médica e em que situações.",
      "O que tem de conter para ser aceite e os motivos mais frequentes para não ser.",
      "O que pode fazer uma consulta online privada e que documentos ficam a cargo dos médicos com contrato com a caixa de seguro de saúde.",
      "A validade segue o protocolo terapêutico e as normas em vigor, que se alteram. Aqui não aparecem prazos: cada pergunta desse tipo remete para a CNAS.",
    ],
    author: {
      initials: "RB",
      name: "Dr Robert Gabriel Brindus",
      line: "Médico de Família · Diretor clínico, Global Health Roménia",
    },
    reviewLine:
      "Revisto clinicamente pela Dra. Andreea Lorena Bica, médica especialista em Neurologia, Global Health Roménia.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "ce-este",
        nav: "O que é",
        eyebrow: "Ponto de partida",
        h2: "O que é, afinal, a carta médica",
        blocks: [
          lead("Não é uma declaração nem um certificado. É uma carta de um médico para outro médico, tendo o doente como assunto."),
          p("O seu papel é a continuidade dos cuidados. O médico de família acompanha-o ao longo do tempo, mas não está presente na consulta de especialidade e não tem acesso automático ao que ali se discutiu. A carta médica devolve essa informação: o que se constatou, o que se excluiu, que tratamento se definiu e o que se segue."),
          p("No sistema de seguro social de saúde o formulário é <strong>normalizado</strong>, com um modelo único aprovado, e o modelo em anexo indica que o documento <strong>é emitido em dois exemplares</strong>, ficando um com o médico que o emite. É um pormenor útil: se perder o seu exemplar, a consulta ou o hospital que o emitiu tem, em princípio, o respetivo registo."),
          ul([
            "É um documento <strong>médico</strong>, não administrativo — o conteúdo decide-o o médico, não o doente.",
            "Circula <strong>entre médicos</strong>, mas é entregue ao doente.",
            "Está na base da <strong>continuação do tratamento</strong> pelo médico de família.",
            "Um documento semelhante, com outro conteúdo, é exigido pela <strong>comissão de avaliação</strong> das pessoas adultas com deficiência.",
          ]),
          cite(`Modelo único publicado pela <a href="${CNAS_FORM}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "cine-elibereaza",
        nav: "Quem a emite",
        eyebrow: "O circuito",
        h2: "Quem emite a carta médica",
        blocks: [
          lead("A resposta curta: o médico que o avaliou. A resposta útil depende do motivo por que precisa dela."),
          ul([
            "<strong>O médico especialista do ambulatório</strong> — após a consulta de especialidade, para o médico de família.",
            "<strong>O hospital, na alta</strong> — juntamente com a nota de alta, para continuar o tratamento.",
            "<strong>O médico de família</strong> — quando o documento é pedido por uma comissão, por uma escola ou por uma entidade patronal, na forma adequada a esse fim.",
            "<strong>O médico do sistema privado</strong> — pode emitir uma carta médica ou um relatório para uso privado; os documentos comparticipados pelo fundo do seguro ficam, porém, reservados aos médicos com relação contratual com a caixa de seguro de saúde.",
          ]),
          p("É esta última distinção que explica a maioria das deslocações perdidas. Um médico privado pode avaliá-lo, escrever as conclusões e recomendações e encaminhá-lo, mas a <strong>credencial de referenciação</strong> (bilet de trimitere) e a <strong>receita comparticipada</strong> pertencem ao circuito do seguro de saúde. Se precisa de um documento comparticipado, pergunte à partida se o médico tem contrato com a caixa."),
          warn("Não se desloque sem perguntar que formulário lhe é exigido", "A instituição que lhe pede o documento — comissão, escola, entidade patronal, seguradora — tem quase sempre um modelo próprio. Peça-o por escrito antes de marcar e leve-o consigo à consulta. É a forma mais simples de evitar uma segunda deslocação."),
        ],
      },
      {
        id: "ce-contine",
        nav: "O que contém",
        eyebrow: "Conteúdo",
        h2: "O que tem de conter para ser aceite",
        blocks: [
          lead("A maioria das cartas recusadas não está errada. Está incompleta."),
          p("Seja qual for o modelo, uma carta médica útil contém os dados de identificação do doente, a data de emissão, a unidade e o médico emissor com carimbo e assinatura, o motivo da avaliação, os antecedentes relevantes, o diagnóstico, os exames realizados com os respetivos resultados e as recomendações — tratamento, doses, duração e data da próxima reavaliação."),
          ul([
            "O <strong>diagnóstico completo</strong>, não apenas uma abreviatura ou um código.",
            "Os <strong>exames</strong> em que assenta o diagnóstico, com datas e resultados.",
            "O <strong>tratamento recomendado</strong>, com nome, dose e duração — sem isso, o médico de família não tem base para continuar a prescrever.",
            "A <strong>data do controlo</strong> ou o intervalo de reavaliação.",
            "O <strong>carimbo, a assinatura e o selo</strong> da unidade emissora.",
            "Nos processos de comissão, exatamente os <strong>campos do anexo pedido</strong>, preenchidos na íntegra.",
          ]),
          p("Verifique o documento <strong>antes de sair do consultório</strong>. Preencher um campo na hora é muito mais simples do que voltar uma semana depois e, se faltar um resultado, o médico pode anexá-lo de imediato."),
        ],
      },
      {
        id: "valabilitate",
        nav: "Validade",
        eyebrow: "A pergunta frequente",
        h2: "Quanto tempo é válida uma carta médica",
        blocks: [
          lead("É a pergunta a que a internet dá as respostas mais contraditórias, e a razão é simples: depende."),
          p("A validade não é uma propriedade do papel, mas do fim a que se destina. Para a continuação do tratamento crónico, rege-se pelo <strong>protocolo terapêutico</strong> da doença e pelas normas em vigor. Para um processo de comissão ou para uma instituição, o prazo é fixado por quem pede o documento. Como ambos se alteram, não encontra neste artigo um número de dias ou de meses: confirma-o junto da CNAS ou da instituição requerente."),
          ul([
            "A validade conta-se a partir da <strong>data de emissão</strong> — verifique se a data está preenchida.",
            "No tratamento crónico, a referência é o <strong>protocolo terapêutico</strong>, não uma regra geral.",
            "Nos processos, a referência é a <strong>exigência da instituição</strong>, que pode ser mais restritiva.",
            "Se o seu estado mudou entretanto, o documento antigo já não descreve a realidade, seja qual for o prazo.",
          ]),
          cite(`Normas em vigor e protocolos terapêuticos: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a> · <a href="${MS}" rel="nofollow noopener" target="_blank">Ministério da Saúde da Roménia</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Consulta online",
        eyebrow: "Transparência",
        h2: "O que pode e o que não pode uma consulta online privada",
        blocks: [
          lead("Dizemo-lo logo no início, porque é a primeira pergunta e porque a resposta honesta poupa tempo."),
          p("Uma consulta online privada <strong>não emite documentos comparticipados pelo fundo do seguro</strong> — nem credencial de referenciação, nem receita comparticipada. Estes pertencem aos médicos com relação contratual com a caixa de seguro de saúde. Qualquer serviço privado que prometa outra coisa promete algo que não pode entregar."),
          p("Em contrapartida, uma consulta online resolve bem a parte que mais vezes fica bloqueada:"),
          ul([
            "<strong>Avaliação clínica</strong> sem lista de espera e um documento escrito que descreve o que se constatou.",
            "<strong>Interpretação dos resultados</strong> que já tem e esclarecimento do que significam.",
            "<strong>Organização do processo</strong>: que documentos lhe faltam, por que ordem se obtêm e junto de quem.",
            "<strong>Recomendação dos exames</strong> adequados, para não fazer análises que não mudam a conduta.",
            "<strong>Segunda opinião</strong> antes de uma decisão importante.",
            "<strong>Monitorização</strong> entre as consultas de especialidade.",
          ]),
          p(`Pode confirmar a inscrição de qualquer médico junto do <a href="${CMR}" rel="nofollow noopener" target="_blank">Colégio dos Médicos da Roménia</a>, connosco tal como em qualquer outro lado.`),
        ],
      },
      {
        id: "probleme",
        nav: "Problemas frequentes",
        eyebrow: "Prático",
        h2: "O que fazer quando a carta não serve",
        blocks: [
          lead("Três situações cobrem quase todos os casos em que o documento é recusado."),
          ul([
            "<strong>Falta um campo</strong> — volte ao médico emissor para o preencher. Outro médico não pode completar o documento de terceiro.",
            "<strong>Está no modelo errado</strong> — peça à instituição o modelo exato, por escrito, e leve-o consigo à consulta.",
            "<strong>Caducou para aquele fim</strong> — é precisa uma reavaliação, não uma simples mudança de data. Um médico que altere a data de um documento sem o observar não lhe está a fazer um favor.",
          ]),
          p("E uma situação que nada tem a ver com papéis: se o seu estado se agravou desde a última avaliação, a prioridade é a consulta, não o documento. Sinais como dor no peito, falta de ar em repouso, fraqueza súbita de um lado do corpo, alterações da fala ou febre com rigidez da nuca ou confusão significam <strong>112</strong>, não uma marcação."),
        ],
      },
    ],
    linksEyebrow: "Global Health Roménia",
    linksH2: "Passos seguintes",
    linksLead:
      "Os nossos médicos na Roménia avaliam online, redigem as conclusões por escrito e dizem-lhe com clareza o que se resolve no privado e o que fica no circuito da caixa de seguro.",
    links: [
      { label: "Cartas médicas, referenciações e exames", href: href("pt", "/services/trimiteri-si-investigatii") },
      { label: "Os nossos médicos na Roménia", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Roménia", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Não sabe que documento precisa?",
      text: "Uma consulta curta esclarece o que lhe é pedido, o que pode ser emitido no privado e o que tem de vir de um médico com contrato com a caixa de seguro — antes de perder um dia em deslocações.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/trimiteri-si-investigatii") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar as regras",
    sourcesLead: "O modelo do formulário, a validade e as normas alteram-se. Confirme sempre na fonte.",
    sources: [
      { label: "CNAS — modelo de carta médica", href: CNAS_FORM },
      { label: "Caixa Nacional de Seguro de Saúde (CNAS)", href: CNAS },
      { label: "Ministério da Saúde da Roménia", href: MS },
      { label: "Colégio dos Médicos da Roménia", href: CMR },
    ],
    sourcesNote:
      "As ligações abrem os sítios das instituições competentes. A Global Health é um prestador privado e não emite documentos comparticipados pelo fundo nacional único de seguro social de saúde.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "O que é a scrisoare medicală?",
        a: "É o documento com que o médico especialista ou o hospital comunica ao médico de família o diagnóstico, os exames realizados e as recomendações de tratamento. No sistema de seguro tem um modelo único publicado pela CNAS e é emitida em dois exemplares, ficando um com o médico emissor.",
      },
      {
        q: "Quem emite a carta médica?",
        a: "O médico que o avaliou: o especialista do ambulatório, o hospital na alta ou o médico de família, consoante o fim. Um médico do privado pode emitir uma carta médica para uso privado, mas os documentos comparticipados pelo fundo do seguro pertencem aos médicos com contrato com a caixa de seguro de saúde.",
      },
      {
        q: "Quanto tempo é válida uma carta médica?",
        a: "Depende do fim. Para a continuação do tratamento crónico, a referência é o protocolo terapêutico da doença e as normas em vigor; num processo, o prazo é fixado pela instituição que pede o documento. Ambos se alteram, por isso confirme junto da CNAS e da instituição requerente.",
      },
      {
        q: "O que tem de conter para ser aceite?",
        a: "Os dados do doente, a data de emissão, a unidade e o médico emissor com carimbo e assinatura, o diagnóstico completo, os exames com os resultados, o tratamento recomendado com dose e duração e a data do controlo. Verifique o documento antes de sair do consultório — preencher um campo na hora é bem mais fácil do que uma semana depois.",
      },
      {
        q: "Preciso de carta médica para a comissão de deficiência. É o mesmo documento?",
        a: "É o mesmo tipo de documento, mas a comissão usa um modelo próprio, com campos específicos. Peça à instituição o modelo exato, por escrito, e leve-o à consulta; caso contrário, o documento arrisca ser recusado pela forma e não pelo conteúdo.",
      },
      {
        q: "Posso obter uma carta médica online?",
        a: "Uma consulta online privada pode emitir uma carta médica ou um relatório para uso privado, interpretar os resultados que já tem e organizar o processo. A credencial de referenciação e a receita comparticipada permanecem, contudo, no circuito da caixa de seguro de saúde.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Artigo escrito pelo Dr Robert Gabriel Brindus, médico de família e diretor clínico da Global Health Roménia, e revisto clinicamente pela Dra. Andreea Lorena Bica, médica especialista em Neurologia. Contém informação geral sobre os documentos médicos na Roménia e não constitui aconselhamento médico personalizado. O conteúdo de um documento médico é definido pelo médico que realiza a avaliação. A Global Health é um prestador privado e não emite documentos comparticipados pelo fundo do seguro social de saúde. Perante uma emergência médica, ligue de imediato 112.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "carta-medica-rumania",
  title: "El informe médico en Rumanía: quién lo emite, qué contiene y para qué sirve",
  excerpt:
    "La scrisoare medicală es el documento con el que el especialista comunica al médico de familia el diagnóstico y el plan. Quién puede emitirla, qué debe contener, cuánto vale y qué hacer cuando le entregan una incompleta.",
  seoTitle: "Informe médico en Rumanía: quién lo emite",
  seoDescription:
    "El informe médico en Rumanía: quién lo emite, qué debe contener, para qué sirve, cuánto tiempo es válido y qué hacer si está incompleto.",
  category: "Guías para pacientes",
  article: {
    lang: "es-ES",
    tagline: "Medicina a cualquier hora, en cualquier lugar",
    categoryLabel: "Guías para pacientes",
    categoryHref: href("es", "/blog"),
    eyebrow: "Rumanía · Guía para pacientes",
    h1: "El informe médico",
    deck: "Lo escribe un médico para otro médico, pero quien paga las consecuencias cuando le falta algo es el paciente.",
    intro:
      "La <strong>scrisoare medicală</strong> —el informe médico— es el documento con el que el médico especialista o el hospital comunican al <strong>médico de familia</strong> el diagnóstico, las pruebas realizadas y las recomendaciones de tratamiento. En el sistema del seguro social de salud tiene un <strong>modelo único, normalizado</strong>, publicado por la CNAS, y el formulario empieza con la fórmula «Stimate(ă) coleg(ă)» precisamente porque es una comunicación entre médicos. Con él, el médico de familia puede continuar la prescripción del tratamiento crónico. También se pide un informe médico para el expediente de la comisión de evaluación de la discapacidad, para escolarizar a un menor o para determinados expedientes de seguros, con el contenido adaptado a cada fin.",
    facts: [
      "Modelo único publicado por la CNAS",
      "Se emite por duplicado",
      "Base de la receta crónica",
    ],
    primaryCta: { label: "Consulta y coordinación médica", href: href("es", "/services/trimiteri-si-investigatii") },
    secondaryCta: { label: "Formulario de la CNAS", href: CNAS_FORM },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Quién puede emitir un informe médico y en qué situaciones.",
      "Qué debe contener para que lo acepten y los motivos más frecuentes por los que no lo aceptan.",
      "Qué puede hacer una consulta online privada y qué documentos quedan en manos de los médicos concertados con la caja del seguro.",
      "La validez depende del protocolo terapéutico y de la normativa vigente, que cambian. Aquí no aparecen plazos: cada pregunta de ese tipo remite a la CNAS.",
    ],
    author: {
      initials: "RB",
      name: "Dr Robert Gabriel Brindus",
      line: "Médico de Familia · Director médico, Global Health Rumanía",
    },
    reviewLine:
      "Revisado clínicamente por la Dra. Andreea Lorena Bica, médica especialista en Neurología, Global Health Rumanía.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "ce-este",
        nav: "Qué es",
        eyebrow: "Punto de partida",
        h2: "Qué es en realidad el informe médico",
        blocks: [
          lead("No es un justificante ni un certificado. Es una carta de un médico a otro médico, con el paciente como asunto."),
          p("Su función es la continuidad asistencial. El médico de familia le sigue a lo largo del tiempo, pero no está en la consulta del especialista y no accede automáticamente a lo que allí se habló. El informe médico devuelve esa información: qué se ha encontrado, qué se ha descartado, qué tratamiento se ha fijado y qué viene después."),
          p("En el sistema del seguro social de salud el formulario está <strong>normalizado</strong>, con un modelo único aprobado, y el modelo del anexo señala que el documento <strong>se emite por duplicado</strong>, quedando una copia en poder del médico que lo expide. Es un detalle útil: si pierde su ejemplar, la consulta o el hospital que lo emitió conserva, en principio, su registro."),
          ul([
            "Es un documento <strong>médico</strong>, no administrativo: el contenido lo decide el médico, no el paciente.",
            "Circula <strong>entre médicos</strong>, aunque se le entregue a usted.",
            "Sostiene la <strong>continuación del tratamiento</strong> por parte del médico de familia.",
            "Un documento parecido, con otro contenido, lo exige la <strong>comisión de evaluación</strong> de las personas adultas con discapacidad.",
          ]),
          cite(`Modelo único publicado por la <a href="${CNAS_FORM}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "cine-elibereaza",
        nav: "Quién lo emite",
        eyebrow: "El circuito",
        h2: "Quién emite el informe médico",
        blocks: [
          lead("La respuesta corta: el médico que le ha evaluado. La respuesta útil depende del motivo por el que lo necesita."),
          ul([
            "<strong>El especialista de consultas externas</strong>, tras la consulta, para el médico de familia.",
            "<strong>El hospital, al alta</strong>, junto con el informe de alta, para continuar el tratamiento.",
            "<strong>El médico de familia</strong>, cuando el documento lo pide una comisión, un centro educativo o una empresa, en la forma adecuada a ese fin.",
            "<strong>El médico del sistema privado</strong>: puede emitir un informe médico para uso privado; los documentos financiados por el fondo del seguro quedan reservados a los médicos con relación contractual con la caja del seguro de salud.",
          ]),
          p("Esa última distinción explica la mayoría de los viajes en balde. Un médico privado puede evaluarle, escribir sus conclusiones y recomendaciones y orientarle, pero el <strong>volante de derivación</strong> (bilet de trimitere) y la <strong>receta financiada</strong> pertenecen al circuito del seguro de salud. Si necesita un documento financiado, pregunte de entrada si el médico está concertado con la caja."),
          warn("No se desplace sin preguntar qué formulario le exigen", "La institución que le pide el documento —comisión, centro escolar, empresa, aseguradora— casi siempre tiene su propio modelo. Pídalo por escrito antes de reservar y llévelo consigo a la consulta. Es la manera más sencilla de evitar un segundo viaje."),
        ],
      },
      {
        id: "ce-contine",
        nav: "Qué contiene",
        eyebrow: "Contenido",
        h2: "Qué debe contener para que lo acepten",
        blocks: [
          lead("La mayoría de los informes rechazados no están mal. Están incompletos."),
          p("Sea cual sea el modelo, un informe médico útil recoge los datos identificativos del paciente, la fecha de emisión, el centro y el médico emisor con sello y firma, el motivo de la evaluación, los antecedentes relevantes, el diagnóstico, las pruebas realizadas con sus resultados y las recomendaciones: tratamiento, dosis, duración y fecha de la siguiente revisión."),
          ul([
            "El <strong>diagnóstico completo</strong>, no solo una abreviatura o un código.",
            "Las <strong>pruebas</strong> en las que se apoya el diagnóstico, con fechas y resultados.",
            "El <strong>tratamiento recomendado</strong>, con nombre, dosis y duración; sin eso el médico de familia no tiene base para seguir prescribiendo.",
            "La <strong>fecha de revisión</strong> o el intervalo de reevaluación.",
            "El <strong>sello, la firma y el cuño</strong> del centro emisor.",
            "Para los expedientes de comisión, exactamente los <strong>apartados del anexo solicitado</strong>, cumplimentados por completo.",
          ]),
          p("Revise el documento <strong>antes de salir de la consulta</strong>. Cumplimentar un apartado en el momento es mucho más sencillo que volver una semana después y, si falta un resultado, el médico puede adjuntarlo al instante."),
        ],
      },
      {
        id: "valabilitate",
        nav: "Validez",
        eyebrow: "La pregunta frecuente",
        h2: "Cuánto tiempo vale un informe médico",
        blocks: [
          lead("Es la pregunta con más respuestas contradictorias en internet, y el motivo es sencillo: depende."),
          p("La validez no es una propiedad del papel, sino de su finalidad. Para continuar el tratamiento crónico se rige por el <strong>protocolo terapéutico</strong> de la enfermedad y por la normativa vigente. Para un expediente de comisión o para una institución, el plazo lo fija quien pide el documento. Como ambos cambian, en este artículo no encontrará un número de días o de meses: lo confirma en la CNAS o en la institución solicitante."),
          ul([
            "La validez cuenta desde la <strong>fecha de emisión</strong>: compruebe que la fecha esté cumplimentada.",
            "En el tratamiento crónico, la referencia es el <strong>protocolo terapéutico</strong>, no una regla general.",
            "En los expedientes, la referencia es la <strong>exigencia de la institución</strong>, que puede ser más estricta.",
            "Si su estado ha cambiado entretanto, el documento antiguo ya no describe la realidad, diga lo que diga el plazo.",
          ]),
          cite(`Normativa vigente y protocolos terapéuticos: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a> · <a href="${MS}" rel="nofollow noopener" target="_blank">Ministerio de Sanidad de Rumanía</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Consulta online",
        eyebrow: "Transparencia",
        h2: "Qué puede y qué no puede una consulta online privada",
        blocks: [
          lead("Lo decimos al principio, porque es la primera pregunta y porque la respuesta honesta ahorra tiempo."),
          p("Una consulta online privada <strong>no emite documentos financiados por el fondo del seguro</strong>: ni volante de derivación ni receta financiada. Corresponden a los médicos con relación contractual con la caja del seguro de salud. Cualquier servicio privado que prometa otra cosa promete algo que no puede entregar."),
          p("En cambio, una consulta online resuelve bien la parte que más veces se atasca:"),
          ul([
            "<strong>Evaluación clínica</strong> sin lista de espera y un documento escrito que describe lo encontrado.",
            "<strong>Interpretación de los resultados</strong> que ya tiene y aclaración de lo que significan.",
            "<strong>Ordenar el expediente</strong>: qué documentos le faltan, en qué orden se consiguen y ante quién.",
            "<strong>Recomendación de las pruebas</strong> adecuadas, para no hacerse análisis que no cambian la conducta.",
            "<strong>Segunda opinión</strong> antes de una decisión importante.",
            "<strong>Seguimiento</strong> entre las revisiones del especialista.",
          ]),
          p(`Puede comprobar la colegiación de cualquier médico en el <a href="${CMR}" rel="nofollow noopener" target="_blank">Colegio de Médicos de Rumanía</a>, con nosotros igual que con cualquier otro.`),
        ],
      },
      {
        id: "probleme",
        nav: "Problemas frecuentes",
        eyebrow: "Práctico",
        h2: "Qué hacer cuando el informe no sirve",
        blocks: [
          lead("Tres situaciones cubren casi todos los casos en los que se rechaza el documento."),
          ul([
            "<strong>Falta un apartado</strong>: vuelva al médico emisor para que lo cumplimente. Otro médico no puede completar el documento de un tercero.",
            "<strong>Está en el modelo equivocado</strong>: pida a la institución el modelo exacto, por escrito, y llévelo a la consulta.",
            "<strong>Ha caducado para ese fin</strong>: hace falta una reevaluación, no un simple cambio de fecha. Un médico que cambie la fecha de un documento sin verle no le está haciendo un favor.",
          ]),
          p("Y una situación que nada tiene que ver con los papeles: si su estado ha empeorado desde la última evaluación, la prioridad es la consulta, no el documento. Señales como dolor en el pecho, falta de aire en reposo, debilidad brusca en un lado del cuerpo, dificultad para hablar o fiebre con rigidez de nuca o confusión significan <strong>112</strong>, no una cita."),
        ],
      },
    ],
    linksEyebrow: "Global Health Rumanía",
    linksH2: "Siguientes pasos",
    linksLead:
      "Nuestros médicos en Rumanía evalúan online, redactan sus conclusiones por escrito y le dicen con claridad qué se resuelve en privado y qué queda en el circuito de la caja del seguro.",
    links: [
      { label: "Informes médicos, derivaciones y pruebas", href: href("es", "/services/trimiteri-si-investigatii") },
      { label: "Nuestros médicos en Rumanía", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Rumanía", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿No sabe qué documento necesita?",
      text: "Una consulta breve aclara qué le están pidiendo, qué puede emitirse en privado y qué debe venir de un médico concertado con la caja del seguro, antes de perder un día en desplazamientos.",
      primary: { label: "Reservar consulta", href: href("es", "/services/trimiteri-si-investigatii") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde confirmar las reglas",
    sourcesLead: "El modelo del formulario, la validez y la normativa cambian. Confirme siempre en la fuente.",
    sources: [
      { label: "CNAS — modelo de informe médico", href: CNAS_FORM },
      { label: "Caja Nacional del Seguro de Salud (CNAS)", href: CNAS },
      { label: "Ministerio de Sanidad de Rumanía", href: MS },
      { label: "Colegio de Médicos de Rumanía", href: CMR },
    ],
    sourcesNote:
      "Los enlaces abren los sitios de los organismos competentes. Global Health es un proveedor privado y no emite documentos financiados por el fondo nacional único del seguro social de salud.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Qué es la scrisoare medicală?",
        a: "Es el documento con el que el especialista o el hospital comunican al médico de familia el diagnóstico, las pruebas realizadas y las recomendaciones de tratamiento. En el sistema del seguro tiene un modelo único publicado por la CNAS y se emite por duplicado, quedando una copia en poder del médico emisor.",
      },
      {
        q: "¿Quién emite el informe médico?",
        a: "El médico que le ha evaluado: el especialista de consultas externas, el hospital al alta o el médico de familia, según la finalidad. Un médico privado puede emitir un informe para uso privado, pero los documentos financiados por el fondo del seguro corresponden a los médicos concertados con la caja del seguro de salud.",
      },
      {
        q: "¿Cuánto tiempo es válido un informe médico?",
        a: "Depende de la finalidad. Para continuar el tratamiento crónico, la referencia es el protocolo terapéutico de la enfermedad y la normativa vigente; en un expediente, el plazo lo fija la institución que pide el documento. Ambos cambian, así que confírmelo en la CNAS y en la institución solicitante.",
      },
      {
        q: "¿Qué debe contener para que lo acepten?",
        a: "Los datos del paciente, la fecha de emisión, el centro y el médico emisor con sello y firma, el diagnóstico completo, las pruebas con sus resultados, el tratamiento recomendado con dosis y duración y la fecha de revisión. Revíselo antes de salir de la consulta: cumplimentar un apartado en el momento es mucho más fácil que una semana después.",
      },
      {
        q: "Necesito un informe para la comisión de discapacidad. ¿Es el mismo documento?",
        a: "Es el mismo tipo de documento, pero la comisión usa su propio modelo, con apartados específicos. Pida a la institución el modelo exacto, por escrito, y llévelo a la consulta; de lo contrario el documento puede rechazarse por la forma y no por el contenido.",
      },
      {
        q: "¿Puedo conseguir un informe médico online?",
        a: "Una consulta online privada puede emitir un informe médico para uso privado, interpretar los resultados que ya tiene y ordenar el expediente. El volante de derivación y la receta financiada permanecen, en cambio, en el circuito de la caja del seguro de salud.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Artículo escrito por el Dr Robert Gabriel Brindus, médico de familia y director médico de Global Health Rumanía, y revisado clínicamente por la Dra. Andreea Lorena Bica, médica especialista en Neurología. Contiene información general sobre los documentos médicos en Rumanía y no constituye asesoramiento médico personalizado. El contenido de un documento médico lo establece el médico que realiza la evaluación. Global Health es un proveedor privado y no emite documentos financiados por el fondo del seguro social de salud. Ante una emergencia médica, llame de inmediato al 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "lekarska-zprava-rumunsko",
  title: "Lékařská zpráva v Rumunsku: kdo ji vystavuje, co obsahuje a k čemu slouží",
  excerpt:
    "Scrisoare medicală je dokument, kterým specialista sděluje praktickému lékaři diagnózu a doporučení. Kdo ji smí vystavit, co musí obsahovat, jak dlouho platí a co dělat, když je neúplná.",
  seoTitle: "Lékařská zpráva v Rumunsku: kdo ji vystavuje",
  seoDescription:
    "Lékařská zpráva v Rumunsku: kdo ji vystavuje, co musí obsahovat, k čemu slouží, jak dlouho platí a co dělat, když je neúplná.",
  category: "Průvodce pro pacienty",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Průvodce pro pacienty",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Rumunsko · Průvodce pro pacienty",
    h1: "Lékařská zpráva",
    deck: "Píše ji jeden lékař druhému, ale důsledky toho, co v ní chybí, nese pacient.",
    intro:
      "<strong>Scrisoare medicală</strong> — lékařská zpráva — je dokument, kterým specialista nebo nemocnice sděluje <strong>praktickému lékaři</strong> diagnózu, provedená vyšetření a doporučení léčby. V systému veřejného zdravotního pojištění má <strong>jednotný, standardizovaný formulář</strong> vydávaný CNAS a začíná oslovením „Stimate(ă) coleg(ă)“ právě proto, že jde o sdělení mezi lékaři. Na jeho základě může praktický lékař pokračovat v předepisování chronické léčby. Lékařská zpráva se vyžaduje i do spisu pro komisi posuzující zdravotní postižení, při zápisu dítěte do kolektivu nebo u některých pojistných spisů — s obsahem přizpůsobeným účelu.",
    facts: [
      "Jednotný formulář vydaný CNAS",
      "Vyhotovuje se ve dvou stejnopisech",
      "Podklad pro chronický recept",
    ],
    primaryCta: { label: "Konzultace a koordinace péče", href: href("cs", "/services/trimiteri-si-investigatii") },
    secondaryCta: { label: "Formulář CNAS", href: CNAS_FORM },
    panelChip: "Co tento průvodce pokrývá",
    panelParas: [
      "Kdo je oprávněn lékařskou zprávu vystavit a v jakých situacích.",
      "Co musí obsahovat, aby byla přijata, a nejčastější důvody, proč přijata není.",
      "Co zvládne soukromá online konzultace a které dokumenty zůstávají lékařům se smlouvou se zdravotní pojišťovnou.",
      "Platnost se řídí terapeutickým protokolem a platnými pravidly, která se mění. Lhůty zde neuvádíme: každá taková otázka směřuje na CNAS.",
    ],
    author: {
      initials: "RB",
      name: "Dr Robert Gabriel Brindus",
      line: "Praktický lékař · Lékařský ředitel, Global Health Rumunsko",
    },
    reviewLine:
      "Klinicky revidovala Dr Andreea Lorena Bica, lékařka specialistka na neurologii, Global Health Rumunsko.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "ce-este",
        nav: "Co to je",
        eyebrow: "Východisko",
        h2: "Co lékařská zpráva vlastně je",
        blocks: [
          lead("Není to potvrzení ani osvědčení. Je to dopis od jednoho lékaře druhému, jehož předmětem jste vy."),
          p("Jejím smyslem je návaznost péče. Praktický lékař vás sleduje v čase, ale není přítomen na vyšetření u specialisty a nemá automatický přístup k tomu, co tam zaznělo. Lékařská zpráva tuto informaci přináší zpět: co bylo zjištěno, co bylo vyloučeno, jaká léčba byla stanovena a co následuje."),
          p("V systému veřejného zdravotního pojištění je formulář <strong>standardizovaný</strong>, s jednotným schváleným vzorem, a vzor v příloze uvádí, že se dokument <strong>vyhotovuje ve dvou stejnopisech</strong>, přičemž jeden zůstává vystavujícímu lékaři. To je užitečný detail: pokud svůj stejnopis ztratíte, ordinace nebo nemocnice, která jej vydala, o něm zásadně má záznam."),
          ul([
            "Jde o <strong>lékařský</strong> dokument, ne administrativní — obsah určuje lékař, ne pacient.",
            "Putuje <strong>mezi lékaři</strong>, ale předává se vám.",
            "Je podkladem pro <strong>pokračování léčby</strong> u praktického lékaře.",
            "Obdobný dokument s jiným obsahem vyžaduje <strong>posudková komise</strong> pro dospělé se zdravotním postižením.",
          ]),
          cite(`Jednotný vzor zveřejněný <a href="${CNAS_FORM}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "cine-elibereaza",
        nav: "Kdo ji vystaví",
        eyebrow: "Cesta dokumentu",
        h2: "Kdo lékařskou zprávu vystavuje",
        blocks: [
          lead("Krátká odpověď: lékař, který vás vyšetřil. Užitečná odpověď závisí na tom, proč ji potřebujete."),
          ul([
            "<strong>Ambulantní specialista</strong> — po odborném vyšetření, pro praktického lékaře.",
            "<strong>Nemocnice při propuštění</strong> — spolu s propouštěcí zprávou, aby léčba mohla pokračovat.",
            "<strong>Praktický lékař</strong> — když dokument požaduje komise, škola nebo zaměstnavatel, ve formě odpovídající tomuto účelu.",
            "<strong>Lékař v soukromém sektoru</strong> — může vystavit lékařskou zprávu nebo posudek pro soukromé účely; dokumenty hrazené z pojistného fondu jsou však vyhrazeny lékařům se smluvním vztahem se zdravotní pojišťovnou.",
          ]),
          p("Právě tento poslední rozdíl vysvětluje většinu zbytečných cest. Soukromý lékař vás může vyšetřit, sepsat závěry a doporučení a nasměrovat vás dál, ale <strong>žádanka o odborné vyšetření</strong> (bilet de trimitere) a <strong>recept s úhradou</strong> patří do pojišťovnického okruhu. Pokud potřebujete hrazený dokument, zeptejte se hned na začátku, zda má lékař smlouvu s pojišťovnou."),
          warn("Nevydávejte se na cestu, aniž byste zjistili, jaký formulář se po vás chce", "Instituce, která dokument požaduje — komise, škola, zaměstnavatel, pojišťovna — má téměř vždy vlastní vzor. Vyžádejte si jej písemně před objednáním a vezměte si jej na konzultaci s sebou. Je to nejjednodušší způsob, jak se vyhnout druhé cestě."),
        ],
      },
      {
        id: "ce-contine",
        nav: "Co obsahuje",
        eyebrow: "Obsah",
        h2: "Co musí obsahovat, aby byla přijata",
        blocks: [
          lead("Většina odmítnutých zpráv není chybná. Je neúplná."),
          p("Ať už jde o kterýkoli vzor, užitečná lékařská zpráva obsahuje identifikační údaje pacienta, datum vystavení, vystavující zařízení a lékaře s razítkem a podpisem, důvod vyšetření, relevantní anamnézu, diagnózu, provedená vyšetření s výsledky a doporučení — léčbu, dávky, délku a datum další kontroly."),
          ul([
            "<strong>Úplnou diagnózu</strong>, ne pouze zkratku nebo kód.",
            "<strong>Vyšetření</strong>, o která se diagnóza opírá, s daty a výsledky.",
            "<strong>Doporučenou léčbu</strong> s názvem, dávkou a délkou — bez toho nemá praktický lékař na čem stavět další preskripci.",
            "<strong>Datum kontroly</strong> nebo interval přehodnocení.",
            "<strong>Razítko, podpis a otisk</strong> vystavujícího zařízení.",
            "U spisů pro komisi přesně <strong>rubriky požadované přílohy</strong>, vyplněné v celém rozsahu.",
          ]),
          p("Zkontrolujte dokument <strong>ještě než odejdete z ordinace</strong>. Doplnit rubriku na místě je mnohem jednodušší než se vracet za týden, a chybí-li výsledek, lékař jej může ihned přiložit."),
        ],
      },
      {
        id: "valabilitate",
        nav: "Platnost",
        eyebrow: "Častý dotaz",
        h2: "Jak dlouho lékařská zpráva platí",
        blocks: [
          lead("Na tuto otázku dává internet nejrozpornější odpovědi, a důvod je prostý: záleží na účelu."),
          p("Platnost není vlastností papíru, nýbrž účelu. Pro pokračování chronické léčby se odvíjí od <strong>terapeutického protokolu</strong> daného onemocnění a od platných pravidel. U spisu pro komisi nebo pro instituci lhůtu stanovuje ten, kdo dokument požaduje. Protože se obojí mění, nenajdete v tomto článku počet dnů ani měsíců: ověříte si jej u CNAS, respektive u žádající instituce."),
          ul([
            "Platnost běží od <strong>data vystavení</strong> — zkontrolujte, že je datum vyplněno.",
            "U chronické léčby je vodítkem <strong>terapeutický protokol</strong>, ne obecné pravidlo.",
            "U spisů je vodítkem <strong>požadavek instituce</strong>, který může být přísnější.",
            "Pokud se váš stav mezitím změnil, starý dokument už nepopisuje skutečnost, ať lhůta říká cokoli.",
          ]),
          cite(`Platná pravidla a terapeutické protokoly: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a> · <a href="${MS}" rel="nofollow noopener" target="_blank">Rumunské ministerstvo zdravotnictví</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Online konzultace",
        eyebrow: "Otevřeně",
        h2: "Co soukromá online konzultace zvládne a co ne",
        blocks: [
          lead("Říkáme to hned na začátku, protože je to první otázka a protože poctivá odpověď šetří čas."),
          p("Soukromá online konzultace <strong>nevystavuje dokumenty hrazené z pojistného fondu</strong> — ani žádanku, ani recept s úhradou. Ty patří lékařům ve smluvním vztahu se zdravotní pojišťovnou. Každá soukromá služba, která slibuje něco jiného, slibuje to, co nemůže dodat."),
          p("Naopak dobře vyřeší tu část, která se nejčastěji zasekne:"),
          ul([
            "<strong>Klinické posouzení</strong> bez čekací listiny a písemný dokument popisující zjištěné nálezy.",
            "<strong>Výklad výsledků</strong>, které již máte, a vysvětlení, co znamenají.",
            "<strong>Uspořádání spisu</strong>: které dokumenty vám chybí, v jakém pořadí a od koho je získat.",
            "<strong>Doporučení vhodných vyšetření</strong>, abyste nepodstupovali odběry, které nic nezmění.",
            "<strong>Druhý názor</strong> před důležitým rozhodnutím.",
            "<strong>Sledování</strong> mezi kontrolami u specialisty.",
          ]),
          p(`Registraci kteréhokoli lékaře si můžete ověřit u <a href="${CMR}" rel="nofollow noopener" target="_blank">Rumunské lékařské komory</a> — u nás stejně jako kdekoli jinde.`),
        ],
      },
      {
        id: "probleme",
        nav: "Časté potíže",
        eyebrow: "Prakticky",
        h2: "Co dělat, když zpráva nestačí",
        blocks: [
          lead("Tři situace pokrývají téměř všechny případy, kdy je dokument odmítnut."),
          ul([
            "<strong>Chybí rubrika</strong> — vraťte se k vystavujícímu lékaři, aby ji doplnil. Jiný lékař cizí dokument doplnit nemůže.",
            "<strong>Je na špatném vzoru</strong> — vyžádejte si od instituce přesný vzor písemně a vezměte si jej na konzultaci.",
            "<strong>Pro daný účel pozbyla platnosti</strong> — je třeba nové posouzení, ne pouhé přepsání data. Lékař, který dokument přepíše, aniž by vás viděl, vám neprokazuje laskavost.",
          ]),
          p("A jedna situace, která s papíry nesouvisí: pokud se váš stav od posledního vyšetření zhoršil, prioritou je konzultace, ne dokument. Příznaky jako bolest na hrudi, dušnost v klidu, náhlá slabost poloviny těla, porucha řeči nebo horečka se ztuhlou šíjí či zmateností znamenají <strong>112</strong>, ne objednání."),
        ],
      },
    ],
    linksEyebrow: "Global Health Rumunsko",
    linksH2: "Kam dál",
    linksLead:
      "Naši lékaři v Rumunsku posoudí stav online, sepíší závěry a jasně řeknou, co lze vyřešit soukromě a co zůstává v okruhu zdravotní pojišťovny.",
    links: [
      { label: "Lékařské zprávy, žádanky a vyšetření", href: href("cs", "/services/trimiteri-si-investigatii") },
      { label: "Naši lékaři v Rumunsku", href: href("cs", "/doctors") },
      { label: "Kontakt na Global Health Rumunsko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Nevíte, jaký dokument potřebujete?",
      text: "Krátká konzultace vyjasní, co se po vás chce, co lze vystavit soukromě a co musí přijít od lékaře se smlouvou s pojišťovnou — dřív než strávíte den na cestách.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/trimiteri-si-investigatii") },
      secondary: { label: "Zobrazit naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Kde si pravidla ověříte",
    sourcesLead: "Vzor formuláře, platnost i pravidla se mění. Vždy ověřujte u zdroje.",
    sources: [
      { label: "CNAS — vzor lékařské zprávy", href: CNAS_FORM },
      { label: "Národní zdravotní pojišťovna (CNAS)", href: CNAS },
      { label: "Rumunské ministerstvo zdravotnictví", href: MS },
      { label: "Rumunská lékařská komora", href: CMR },
    ],
    sourcesNote:
      "Odkazy vedou na weby příslušných institucí. Global Health je soukromý poskytovatel a nevystavuje dokumenty hrazené z národního fondu veřejného zdravotního pojištění.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Co je scrisoare medicală?",
        a: "Je to dokument, kterým specialista nebo nemocnice sděluje praktickému lékaři diagnózu, provedená vyšetření a doporučení léčby. V systému pojištění má jednotný formulář vydaný CNAS a vyhotovuje se ve dvou stejnopisech, z nichž jeden zůstává vystavujícímu lékaři.",
      },
      {
        q: "Kdo lékařskou zprávu vystavuje?",
        a: "Lékař, který vás vyšetřil: ambulantní specialista, nemocnice při propuštění nebo praktický lékař, podle účelu. Soukromý lékař může vystavit lékařskou zprávu pro soukromé účely, ale dokumenty hrazené z pojistného fondu patří lékařům se smlouvou se zdravotní pojišťovnou.",
      },
      {
        q: "Jak dlouho lékařská zpráva platí?",
        a: "Podle účelu. U pokračování chronické léčby je vodítkem terapeutický protokol onemocnění a platná pravidla; u spisu lhůtu stanoví instituce, která dokument požaduje. Obojí se mění, ověřte si to proto u CNAS a u žádající instituce.",
      },
      {
        q: "Co musí obsahovat, aby byla přijata?",
        a: "Údaje pacienta, datum vystavení, zařízení a lékaře s razítkem a podpisem, úplnou diagnózu, vyšetření s výsledky, doporučenou léčbu s dávkou a délkou a datum kontroly. Zkontrolujte dokument dřív, než odejdete z ordinace — rubrika se na místě doplní mnohem snáz než za týden.",
      },
      {
        q: "Potřebuji lékařskou zprávu pro posudkovou komisi. Je to stejný dokument?",
        a: "Je to stejný typ dokumentu, ale komise používá vlastní vzor se specifickými rubrikami. Vyžádejte si od instituce přesný vzor písemně a vezměte si jej na konzultaci, jinak hrozí, že dokument odmítnou kvůli formě, ne kvůli obsahu.",
      },
      {
        q: "Mohu lékařskou zprávu získat online?",
        a: "Soukromá online konzultace může vystavit lékařskou zprávu nebo posudek pro soukromé účely, vyložit výsledky, které již máte, a uspořádat spis. Žádanka a recept s úhradou však zůstávají v okruhu zdravotní pojišťovny.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Článek napsal Dr Robert Gabriel Brindus, praktický lékař a lékařský ředitel Global Health Rumunsko, klinicky revidovala Dr Andreea Lorena Bica, lékařka specialistka na neurologii. Obsahuje obecné informace o lékařských dokumentech v Rumunsku a nepředstavuje individuální lékařskou radu. Obsah lékařského dokumentu určuje lékař, který provádí vyšetření. Global Health je soukromý poskytovatel a nevystavuje dokumenty hrazené z fondu veřejného zdravotního pojištění. V případě naléhavého ohrožení zdraví volejte ihned 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "arztbrief-rumaenien",
  title: "Der Arztbrief in Rumänien: wer ihn ausstellt, was er enthält und wozu er dient",
  excerpt:
    "Die scrisoare medicală teilt dem Hausarzt Diagnose und Behandlungsplan des Facharztes mit. Wer sie ausstellen darf, was sie enthalten muss, wie lange sie gilt und was zu tun ist, wenn sie unvollständig ist.",
  seoTitle: "Arztbrief in Rumänien: wer ihn ausstellt",
  seoDescription:
    "Der Arztbrief in Rumänien: wer ihn ausstellt, was er enthalten muss, wozu er dient, wie lange er gilt und was zu tun ist, wenn er unvollständig ist.",
  category: "Patientenratgeber",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Patientenratgeber",
    categoryHref: href("de", "/blog"),
    eyebrow: "Rumänien · Patientenratgeber",
    h1: "Der Arztbrief",
    deck: "Geschrieben von einem Arzt für einen anderen — die Folgen von allem, was darin fehlt, trägt jedoch die Patientin oder der Patient.",
    intro:
      "Die <strong>scrisoare medicală</strong> — der Arztbrief — ist das Dokument, mit dem die Fachärztin, der Facharzt oder das Krankenhaus der <strong>Hausärztin oder dem Hausarzt</strong> die Diagnose, die durchgeführten Untersuchungen und die Behandlungsempfehlungen mitteilt. In der gesetzlichen Krankenversicherung gibt es dafür ein <strong>einheitliches, standardisiertes Formular</strong> der CNAS, und es beginnt mit der Anrede «Stimate(ă) coleg(ă)» — eben weil es eine Mitteilung unter Ärzten ist. Auf dieser Grundlage kann die Hausarztpraxis die Dauermedikation weiter verordnen. Ein Arztbrief wird außerdem für die Akte der Begutachtungskommission bei Behinderung, für die Aufnahme eines Kindes in eine Einrichtung und für bestimmte Versicherungsakten verlangt — mit auf den Zweck zugeschnittenem Inhalt.",
    facts: [
      "Einheitliches CNAS-Formular",
      "Wird in zwei Ausfertigungen erstellt",
      "Grundlage des Dauerrezepts",
    ],
    primaryCta: { label: "Sprechstunde und medizinische Koordination", href: href("de", "/services/trimiteri-si-investigatii") },
    secondaryCta: { label: "Das CNAS-Formular", href: CNAS_FORM },
    panelChip: "Was dieser Ratgeber abdeckt",
    panelParas: [
      "Wer einen Arztbrief ausstellen darf und in welchen Situationen.",
      "Was er enthalten muss, damit er angenommen wird, und die häufigsten Gründe, warum das nicht geschieht.",
      "Was eine private Online-Sprechstunde leisten kann und welche Dokumente Ärztinnen und Ärzten mit Kassenvertrag vorbehalten bleiben.",
      "Die Gültigkeit richtet sich nach dem Therapieprotokoll und den geltenden Vorschriften, die sich ändern. Fristen nennen wir hier nicht: Solche Fragen verweisen auf die CNAS.",
    ],
    author: {
      initials: "RB",
      name: "Dr Robert Gabriel Brindus",
      line: "Facharzt für Allgemeinmedizin · Ärztlicher Direktor, Global Health Rumänien",
    },
    reviewLine:
      "Klinisch geprüft von Dr Andreea Lorena Bica, Fachärztin für Neurologie, Global Health Rumänien.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "ce-este",
        nav: "Was er ist",
        eyebrow: "Ausgangspunkt",
        h2: "Was der Arztbrief tatsächlich ist",
        blocks: [
          lead("Er ist keine Bescheinigung und kein Attest. Er ist ein Brief von einem Arzt an einen anderen, mit Ihnen als Gegenstand."),
          p("Sein Zweck ist die Kontinuität der Behandlung. Die Hausarztpraxis begleitet Sie über die Zeit, ist aber beim Facharzttermin nicht dabei und hat keinen automatischen Zugriff auf das dort Besprochene. Der Arztbrief trägt diese Information zurück: was festgestellt, was ausgeschlossen, welche Behandlung festgelegt wurde und was als Nächstes ansteht."),
          p("In der gesetzlichen Krankenversicherung ist das Formular <strong>standardisiert</strong>, mit einem einheitlichen genehmigten Muster, und das Muster in der Anlage hält fest, dass das Dokument <strong>in zwei Ausfertigungen</strong> erstellt wird, von denen eine beim ausstellenden Arzt verbleibt. Ein nützliches Detail: Geht Ihre Ausfertigung verloren, hat die Praxis oder Klinik, die sie ausgestellt hat, grundsätzlich einen Nachweis darüber."),
          ul([
            "Es ist ein <strong>medizinisches</strong> Dokument, kein administratives — den Inhalt bestimmt die Ärztin oder der Arzt, nicht die Patientin oder der Patient.",
            "Er wandert <strong>zwischen Ärzten</strong>, wird aber Ihnen ausgehändigt.",
            "Er ist die Grundlage für die <strong>Fortführung der Behandlung</strong> durch die Hausarztpraxis.",
            "Ein ähnliches Dokument mit anderem Inhalt verlangt die <strong>Begutachtungskommission</strong> für erwachsene Menschen mit Behinderung.",
          ]),
          cite(`Einheitliches Muster der <a href="${CNAS_FORM}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "cine-elibereaza",
        nav: "Wer ihn ausstellt",
        eyebrow: "Der Weg",
        h2: "Wer den Arztbrief ausstellt",
        blocks: [
          lead("Die kurze Antwort: die Ärztin oder der Arzt, die oder der Sie untersucht hat. Die nützliche Antwort hängt vom Anlass ab."),
          ul([
            "<strong>Die Fachärztin oder der Facharzt in der Ambulanz</strong> — nach der Untersuchung, für die Hausarztpraxis.",
            "<strong>Das Krankenhaus bei Entlassung</strong> — zusammen mit dem Entlassungsbericht, damit die Behandlung fortgeführt werden kann.",
            "<strong>Die Hausarztpraxis</strong> — wenn eine Kommission, eine Schule oder ein Arbeitgeber das Dokument verlangt, in der dafür passenden Form.",
            "<strong>Ärztinnen und Ärzte im privaten Bereich</strong> — können einen Arztbrief oder Bericht für den privaten Gebrauch ausstellen; aus dem Versicherungsfonds erstattete Dokumente bleiben jedoch Ärzten mit Vertrag zur Krankenkasse vorbehalten.",
          ]),
          p("Diese letzte Unterscheidung erklärt die meisten vergeblichen Wege. Eine private Ärztin kann Sie untersuchen, Befunde und Empfehlungen schriftlich festhalten und Sie weiterleiten, doch die <strong>Überweisung</strong> (bilet de trimitere) und das <strong>erstattungsfähige Rezept</strong> gehören in den Kassenweg. Wenn Sie ein erstattetes Dokument brauchen, fragen Sie von Anfang an, ob die Praxis einen Kassenvertrag hat."),
          warn("Machen Sie sich nicht auf den Weg, ohne nach dem verlangten Formular zu fragen", "Die Stelle, die das Dokument verlangt — Kommission, Schule, Arbeitgeber, Versicherer — hat fast immer ein eigenes Muster. Fordern Sie es vor der Terminvergabe schriftlich an und bringen Sie es zur Sprechstunde mit. Das ist der einfachste Weg, sich einen zweiten Termin zu ersparen."),
        ],
      },
      {
        id: "ce-contine",
        nav: "Was er enthält",
        eyebrow: "Inhalt",
        h2: "Was er enthalten muss, damit er angenommen wird",
        blocks: [
          lead("Die meisten abgelehnten Briefe sind nicht falsch. Sie sind unvollständig."),
          p("Unabhängig vom Muster enthält ein brauchbarer Arztbrief die Identifikationsdaten der Patientin oder des Patienten, das Ausstellungsdatum, Einrichtung und ausstellende Person mit Stempel und Unterschrift, den Anlass der Untersuchung, die relevante Vorgeschichte, die Diagnose, die durchgeführten Untersuchungen mit ihren Ergebnissen sowie die Empfehlungen — Behandlung, Dosierung, Dauer und Termin der nächsten Kontrolle."),
          ul([
            "Die <strong>vollständige Diagnose</strong>, nicht nur ein Kürzel oder ein Code.",
            "Die <strong>Untersuchungen</strong>, auf denen die Diagnose beruht, mit Datum und Ergebnis.",
            "Die <strong>empfohlene Behandlung</strong> mit Name, Dosis und Dauer — ohne sie fehlt der Hausarztpraxis die Grundlage zum Weiterverordnen.",
            "Der <strong>Kontrolltermin</strong> oder das Intervall der Neubewertung.",
            "<strong>Stempel, Unterschrift und Siegel</strong> der ausstellenden Einrichtung.",
            "Für Kommissionsakten genau die <strong>Felder der verlangten Anlage</strong>, vollständig ausgefüllt.",
          ]),
          p("Prüfen Sie das Dokument, <strong>bevor Sie die Praxis verlassen</strong>. Ein Feld an Ort und Stelle zu ergänzen ist weit einfacher, als eine Woche später wiederzukommen — und fehlt ein Befund, kann er sofort beigefügt werden."),
        ],
      },
      {
        id: "valabilitate",
        nav: "Gültigkeit",
        eyebrow: "Die häufige Frage",
        h2: "Wie lange ein Arztbrief gültig ist",
        blocks: [
          lead("Auf diese Frage gibt das Internet die widersprüchlichsten Antworten, und der Grund ist einfach: Es kommt darauf an."),
          p("Gültigkeit ist keine Eigenschaft des Papiers, sondern des Zwecks. Für die Fortführung einer Dauerbehandlung richtet sie sich nach dem <strong>Therapieprotokoll</strong> der Erkrankung und den geltenden Vorschriften. Für eine Kommissionsakte oder eine Behörde setzt die anfordernde Stelle die Frist. Weil sich beides ändert, finden Sie in diesem Artikel keine Anzahl von Tagen oder Monaten: Sie bestätigen sie bei der CNAS beziehungsweise bei der anfordernden Stelle."),
          ul([
            "Die Gültigkeit läuft ab dem <strong>Ausstellungsdatum</strong> — prüfen Sie, dass das Datum eingetragen ist.",
            "Bei Dauerbehandlung ist das <strong>Therapieprotokoll</strong> der Maßstab, keine allgemeine Regel.",
            "Bei Akten ist die <strong>Anforderung der Stelle</strong> maßgeblich, die strenger sein kann.",
            "Hat sich Ihr Zustand zwischenzeitlich geändert, beschreibt das alte Dokument die Wirklichkeit nicht mehr — unabhängig von jeder Frist.",
          ]),
          cite(`Geltende Vorschriften und Therapieprotokolle: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a> · <a href="${MS}" rel="nofollow noopener" target="_blank">Rumänisches Gesundheitsministerium</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Online-Sprechstunde",
        eyebrow: "Transparenz",
        h2: "Was eine private Online-Sprechstunde kann und was nicht",
        blocks: [
          lead("Wir sagen es gleich zu Beginn, weil es die erste Frage ist und weil eine ehrliche Antwort Zeit spart."),
          p("Eine private Online-Sprechstunde <strong>stellt keine aus dem Versicherungsfonds erstatteten Dokumente aus</strong> — weder Überweisung noch erstattungsfähiges Rezept. Diese gehören zu Ärztinnen und Ärzten mit Kassenvertrag. Jeder private Anbieter, der anderes verspricht, verspricht etwas, das er nicht liefern kann."),
          p("Gut lösen lässt sich dagegen der Teil, der am häufigsten hakt:"),
          ul([
            "<strong>Klinische Beurteilung</strong> ohne Warteliste und ein schriftliches Dokument über die Befunde.",
            "<strong>Einordnung von Ergebnissen</strong>, die Sie bereits haben, und Klärung, was sie bedeuten.",
            "<strong>Ordnung in die Akte bringen</strong>: welche Unterlagen fehlen, in welcher Reihenfolge und bei wem sie zu beschaffen sind.",
            "<strong>Empfehlung der passenden Untersuchungen</strong>, damit Sie keine Tests machen, die nichts ändern.",
            "<strong>Zweitmeinung</strong> vor einer wichtigen Entscheidung.",
            "<strong>Verlaufskontrolle</strong> zwischen den Facharztterminen.",
          ]),
          p(`Die Registrierung jeder Ärztin und jedes Arztes können Sie bei der <a href="${CMR}" rel="nofollow noopener" target="_blank">Rumänischen Ärztekammer</a> prüfen — bei uns wie überall sonst.`),
        ],
      },
      {
        id: "probleme",
        nav: "Häufige Probleme",
        eyebrow: "Praktisch",
        h2: "Was tun, wenn der Brief nicht genügt",
        blocks: [
          lead("Drei Situationen decken fast alle Fälle ab, in denen das Dokument abgelehnt wird."),
          ul([
            "<strong>Ein Feld fehlt</strong> — gehen Sie zur ausstellenden Praxis zurück, damit es ergänzt wird. Eine andere Ärztin darf das Dokument eines Kollegen nicht ausfüllen.",
            "<strong>Es ist das falsche Muster</strong> — fordern Sie bei der Stelle das exakte Muster schriftlich an und bringen Sie es zum Termin mit.",
            "<strong>Es ist für diesen Zweck abgelaufen</strong> — nötig ist eine Neubeurteilung, kein bloßes neues Datum. Wer ein Dokument umdatiert, ohne Sie zu sehen, tut Ihnen keinen Gefallen.",
          ]),
          p("Und eine Situation, die nichts mit Papieren zu tun hat: Hat sich Ihr Zustand seit der letzten Beurteilung verschlechtert, hat die Untersuchung Vorrang vor dem Dokument. Zeichen wie Brustschmerz, Luftnot in Ruhe, plötzliche Schwäche einer Körperhälfte, Sprachstörungen oder Fieber mit Nackensteife oder Verwirrtheit bedeuten <strong>112</strong>, nicht einen Termin."),
        ],
      },
    ],
    linksEyebrow: "Global Health Rumänien",
    linksH2: "Nächste Schritte",
    linksLead:
      "Unsere Ärztinnen und Ärzte in Rumänien beurteilen online, halten ihre Schlussfolgerungen schriftlich fest und sagen klar, was privat zu klären ist und was im Kassenweg bleibt.",
    links: [
      { label: "Arztbriefe, Überweisungen und Untersuchungen", href: href("de", "/services/trimiteri-si-investigatii") },
      { label: "Unsere Ärzte in Rumänien", href: href("de", "/doctors") },
      { label: "Global Health Rumänien kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Unklar, welches Dokument Sie brauchen?",
      text: "Eine kurze Sprechstunde klärt, was von Ihnen verlangt wird, was privat ausgestellt werden kann und was von einer Praxis mit Kassenvertrag kommen muss — bevor Sie einen Tag auf Wegen verlieren.",
      primary: { label: "Termin buchen", href: href("de", "/services/trimiteri-si-investigatii") },
      secondary: { label: "Unsere Ärzte ansehen", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Wo Sie die Regeln prüfen",
    sourcesLead: "Formularmuster, Gültigkeit und Vorschriften ändern sich. Prüfen Sie stets an der Quelle.",
    sources: [
      { label: "CNAS — Muster des Arztbriefs", href: CNAS_FORM },
      { label: "Nationale Krankenversicherungskasse (CNAS)", href: CNAS },
      { label: "Rumänisches Gesundheitsministerium", href: MS },
      { label: "Rumänische Ärztekammer", href: CMR },
    ],
    sourcesNote:
      "Die Links öffnen die Websites der zuständigen Stellen. Global Health ist ein privater Anbieter und stellt keine Dokumente aus, die aus dem nationalen Fonds der gesetzlichen Krankenversicherung erstattet werden.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Was ist die scrisoare medicală?",
        a: "Es ist das Dokument, mit dem Fachärztin, Facharzt oder Krankenhaus der Hausarztpraxis Diagnose, durchgeführte Untersuchungen und Behandlungsempfehlungen mitteilen. In der Krankenversicherung gibt es dafür ein einheitliches CNAS-Formular; es wird in zwei Ausfertigungen erstellt, von denen eine beim ausstellenden Arzt bleibt.",
      },
      {
        q: "Wer stellt den Arztbrief aus?",
        a: "Die Ärztin oder der Arzt, die oder der Sie untersucht hat: die Ambulanz, das Krankenhaus bei Entlassung oder die Hausarztpraxis, je nach Zweck. Eine private Praxis kann einen Arztbrief für den privaten Gebrauch ausstellen; aus dem Versicherungsfonds erstattete Dokumente gehören jedoch zu Ärzten mit Kassenvertrag.",
      },
      {
        q: "Wie lange ist ein Arztbrief gültig?",
        a: "Das hängt vom Zweck ab. Für die Fortführung einer Dauerbehandlung sind das Therapieprotokoll der Erkrankung und die geltenden Vorschriften maßgeblich; bei einer Akte setzt die anfordernde Stelle die Frist. Beides ändert sich, prüfen Sie es daher bei der CNAS und bei der anfordernden Stelle.",
      },
      {
        q: "Was muss er enthalten, damit er angenommen wird?",
        a: "Patientendaten, Ausstellungsdatum, Einrichtung und ausstellende Person mit Stempel und Unterschrift, die vollständige Diagnose, die Untersuchungen mit Ergebnissen, die empfohlene Behandlung mit Dosis und Dauer sowie den Kontrolltermin. Prüfen Sie das Dokument vor dem Verlassen der Praxis — ein Feld lässt sich dort weit leichter ergänzen als eine Woche später.",
      },
      {
        q: "Ich brauche einen Arztbrief für die Begutachtungskommission. Ist das dasselbe Dokument?",
        a: "Es ist dieselbe Art von Dokument, aber die Kommission nutzt ein eigenes Muster mit besonderen Feldern. Fordern Sie bei der Stelle das exakte Muster schriftlich an und bringen Sie es zum Termin mit, sonst droht eine Ablehnung wegen der Form statt wegen des Inhalts.",
      },
      {
        q: "Kann ich einen Arztbrief online bekommen?",
        a: "Eine private Online-Sprechstunde kann einen Arztbrief oder Bericht für den privaten Gebrauch ausstellen, vorhandene Ergebnisse einordnen und Ihre Unterlagen ordnen. Überweisung und erstattungsfähiges Rezept bleiben dagegen im Weg der Krankenkasse.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dr Robert Gabriel Brindus, Facharzt für Allgemeinmedizin und Ärztlicher Direktor von Global Health Rumänien, klinisch geprüft von Dr Andreea Lorena Bica, Fachärztin für Neurologie. Der Beitrag enthält allgemeine Informationen zu medizinischen Dokumenten in Rumänien und ist keine persönliche medizinische Beratung. Den Inhalt eines medizinischen Dokuments bestimmt die Ärztin oder der Arzt, die oder der die Beurteilung vornimmt. Global Health ist ein privater Anbieter und stellt keine aus dem Fonds der gesetzlichen Krankenversicherung erstatteten Dokumente aus. Wählen Sie im medizinischen Notfall sofort 112.",
  } satisfies Article,
};

export const RO_SCRISOARE_MEDICALA: PostSet = {
  key: "ro-scrisoare-medicala",
  countryCode: "ro",
  targetKeyword: "scrisoare medicala",
  searchVolume: 1000,
  keywordDifficulty: 0,
  evidence:
    "ro/2642 expansion 2026-08-04. Head term 1,000 KD 0, unchanged. Cluster: scrisoare medicala model 260, model scrisoare medicala pdf 170, scrisoare medicala anexa 5 110, cat are valabilitate o scrisoare medicala 90, scrisoare medicala anexa 43 model nou 90, model scrisoare medicala handicap 90, eliberare scrisoare medicala 70, model scrisoare medicala medic de familie 70, legislatie scrisoare medicala 50, cine elibereaza scrisoarea medicala 30, ce este scrisoarea medicala 30. SERP 2026-08-04: rank 1 is the CNAS PDF of the form itself, followed by county DGASPC and hospital PDFs of the same form, lege5.ro and one family-doctor blog. Page one is documents, not explanations — nothing tells a patient what to do when the letter is incomplete, expired or on the wrong model.",
  serviceSlug: "trimiteri-si-investigatii",
  authorDoctorId: "cmrc4axni00rn01p2n3r2bopf",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmrc4j7oc00se01p2gf7y9ldw",
  reviewerDisplayName: "Dr Andreea Lorena Bica",
  posts: [ro, en, pt, es, cs, de],
};
