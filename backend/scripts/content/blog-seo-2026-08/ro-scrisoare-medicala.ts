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
  authorDisplayName: "Dr Robert Gabriel Brindus",
  reviewerDoctorId: "cmrc4j7oc00se01p2gf7y9ldw",
  reviewerDisplayName: "Dr Andreea Lorena Bica",
  posts: [ro],
};
