/**
 * Romania — Week 1 editorial plan article.
 *
 * Target keyword: "cat este tensiunea normala in functie de varsta" — 6,600/mo,
 * KD 0 (editorial plan 2026-08-19; follow-up batch 2026-08-19).
 * Supporting: "tabel cu valori tensiune arteriala" 2,900 ·
 * "calculator tensiune arteriala" 1,900 · GSC 21 impressions @ pos 12.
 *
 * Lead constraint:
 * the editorial plan originally pointed this cluster at cardiology, but the
 * live Romania cardiology service (`consultatie-cardiologie`) is inactive as
 * of 2026-08-23. The honest conversion path right now is the active chronic
 * disease follow-up service plus the blood-pressure tool.
 *
 * Honesty constraint:
 * there is no reliable adult "normal by age and sex" table that makes a high
 * pressure reading normal because someone is older. The article answers the
 * query by giving a practical adult interpretation and explaining what age
 * really changes: risk, review frequency, and treatment context.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const ESC_2024 =
  "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/elevated-blood-pressure-and-hypertension/";
const CARDIOPORTAL_HTA =
  "https://www.cardioportal.ro/pacienti/factori-de-risc-cardiovascular/hipertensiunea-arteriala-2/";
const CARDIOPORTAL_CE =
  "https://www.cardioportal.ro/pacienti/factori-de-risc-cardiovascular/hipertensiunea-arteriala-2/ce-inseamna-hipertensiune-arteriala/";
const CARDIOPORTAL_MASURARE =
  "https://www.cardioportal.ro/pacienti/factori-de-risc-cardiovascular/hipertensiunea-arteriala-2/cum-masuram-tensiunea-arteriala/";

const href = (path: string) => `https://www.myglobalhealth.online/romania/ro${path}`;
const toolHref = href("/tools/blood-pressure-chart");

const ro: LocalePost = {
  locale: "RO",
  slug: "tensiune-arteriala-normala-varsta-adulti",
  title: "Tensiunea arterială normală: ghid util după vârstă, fără tabele false",
  excerpt:
    "Ce valori sunt normală de fapt la adulți, de ce nu există o altă „normă” doar pentru că înaintezi în vârstă și când o tensiune repetat crescută trebuie discutată cu medicul.",
  seoTitle: "Tensiunea arterială normală după vârstă",
  seoDescription:
    "Ce tensiune arterială se consideră normală la adulți, ce se schimbă cu vârsta și când valorile repetat crescute trebuie discutate cu medicul.",
  category: "Boli cronice",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Boli cronice",
    categoryHref: href("/blog"),
    eyebrow: "România · Ghid practic",
    h1: "Tensiunea arterială normală",
    deck: "Vârsta schimbă riscul și planul de urmărire. Nu schimbă faptul că o valoare prea mare rămâne prea mare.",
    intro:
      "La adultul obișnuit, o tensiune <strong>clar normală</strong> este sub <strong>120/80 mmHg</strong>. Dacă valorile urcă repetat în zona <strong>120-139</strong> pentru sistolică sau <strong>70-89</strong> pentru diastolică, nu mai vorbim despre o tensiune ideală și merită urmărite cu metodă. <strong>Hipertensiunea</strong> se confirmă din măsurători repetate, ideal și în afara cabinetului, iar în practică o valoare de <strong>140/90 mmHg sau mai mare</strong> în cabinet, confirmată, intră deja în această zonă. Asta este partea importantă pentru căutarea „în funcție de vârstă”: nu există o valoare care devine brusc normală doar pentru că aveți 65 sau 75 de ani.",
    facts: [
      "Sub 120/80 este o valoare clar normală",
      "140/90 repetat în cabinet cere confirmare și evaluare",
      "Vârsta schimbă contextul, nu legile tensiunii arteriale",
    ],
    primaryCta: { label: "Consultație pentru boli cronice", href: href("/services/boli-cronice-online") },
    secondaryCta: { label: "Calculator tensiune arterială", href: toolHref },
    panelChip: "Ce clarifică acest ghid",
    panelParas: [
      "Ce cifre vă orientează cu adevărat la vârsta adultă și de ce multe tabele circulă fără context.",
      "Ce se schimbă odată cu vârsta și ce nu se schimbă, chiar dacă internetul promite o „normă” mai largă.",
      "Cum să măsurați acasă fără să vă speriați de o cifră izolată și fără să vă liniștiți fals.",
      "Când este suficientă o programare și când apar semne care cer evaluare urgentă.",
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
        id: "valori",
        nav: "Valorile",
        eyebrow: "Răspunsul scurt",
        h2: "Tabel rapid: ce tensiune se consideră normală la adult",
        blocks: [
          lead("Reperul practic nu se schimbă la fiecare vârstă: sub 120/80 mmHg este clar normal, iar 140/90 mmHg repetat în cabinet intră deja în zona hipertensiunii."),
          p("Zona care creează cele mai multe confuzii este cea intermediară. O persoană cu 132/84 poate să audă „nu e chiar rău” și să creadă că nu mai contează. Contează. Poate să nu fie încă hipertensiune confirmată, dar nu mai este nici lectura ideală și trebuie urmărită dacă se repetă."),
          ul([
            "<strong>Sub 120/80</strong>: valoare clar normală.",
            "<strong>120-139 sistolică sau 70-89 diastolică</strong>: nu mai este zona ideală; repetați măsurarea corect și urmăriți tendința.",
            "<strong>140/90 sau peste, repetat</strong>: compatibil cu hipertensiune și cere confirmare.",
            "<strong>O singură valoare</strong> nu pune singură diagnosticul dacă măsurarea a fost făcută prost sau într-un context nefavorabil.",
          ]),
          cite(`Explicații pentru public și materiale ale Societății Române de Cardiologie: <a href="${CARDIOPORTAL_HTA}" rel="nofollow noopener" target="_blank">Cardioportal</a>. Ghidul european actual rămâne reperul clinic principal: <a href="${ESC_2024}" rel="nofollow noopener" target="_blank">ESC 2024</a>.`),
        ],
      },
      {
        id: "varsta",
        nav: "Vârsta",
        eyebrow: "Unde apare capcana",
        h2: "Ce se schimbă cu vârsta și ce nu se schimbă",
        blocks: [
          lead("Internetul caută o tabelă separată pentru 30, 50 sau 70 de ani. Medicina caută altceva: cât de constantă este tensiunea, ce risc global aveți și ce alte boli se adaugă."),
          p("La 28 de ani, o tensiune repetat crescută contează pentru că are timp să producă efecte zeci de ani. La 68 de ani, aceeași cifră contează pentru că se poate asocia cu boală renală, diabet, fibrilație atrială, accidente vasculare sau insuficiență cardiacă. Nici într-un caz, nici în altul nu devine „normală”."),
          ul([
            "<strong>Adult tânăr</strong>: hipertensiunea poate trece neobservată tocmai pentru că rareori doare.",
            "<strong>Vârsta mijlocie</strong>: greutatea, fumatul, colesterolul și glicemia schimbă cât de agresiv trebuie urmărită.",
            "<strong>Persoană în vârstă</strong>: ținta de tratament poate fi individualizată pentru a evita amețeala sau căderile, dar asta nu înseamnă că o valoare mare devine bună.",
            "<strong>Sarcina</strong>: este un capitol separat și nu trebuie amestecată cu tabelele generale pentru adulți.",
          ]),
          warn(
            "„La vârsta dumneavoastră e normal” este, de multe ori, o formulare greșită",
            "Ce poate fi diferit la o persoană în vârstă este felul în care tratăm și monitorizăm. Nu definiția unei valori prea mari.",
          ),
        ],
      },
      {
        id: "citire",
        nav: "Cum se citește",
        eyebrow: "Două numere",
        h2: "Ce înseamnă sistolica și diastolica",
        blocks: [
          lead("Sistolica este presiunea maximă, când inima pompează sângele. Diastolica este presiunea minimă, între două bătăi."),
          p("Regula practică este simplă: dacă una dintre ele este anormală, lectura merită atenție. Un 152/78 nu este liniștitor doar pentru că „a doua valoare e bună”. Un 126/94 nu este bun doar pentru că prima nu a trecut de 14."),
          ul([
            "<strong>Sistolică mare cu diastolică mai bună</strong>: frecventă mai ales la vârste mai mari și nu trebuie banalizată.",
            "<strong>Diastolică mare</strong>: contează și ea, mai ales când se repetă.",
            "<strong>Simptomele, pulsul și analizele</strong> ajută la interpretare, dar nu anulează o serie de valori mari.",
            "<strong>Tendința</strong> este mai utilă decât cifra unică văzută într-o dimineață proastă.",
          ]),
          p(`Dacă vreți să urmăriți tendința și nu doar o cifră izolată, folosiți <a href="${toolHref}">calculatorul și jurnalul de tensiune arterială</a> în loc să interpretați fiecare măsurătoare ca verdict final.`),
        ],
      },
      {
        id: "masurare",
        nav: "Cum se măsoară",
        eyebrow: "Tehnica",
        h2: "Cum vă măsurați corect acasă",
        blocks: [
          lead("Multe „valori rele” nu sunt rele, ci măsurate prost. Asta se corectează mai repede decât o schemă de tratament schimbată inutil."),
          ul([
            "Stați așezat cinci minute înainte, cu spatele sprijinit și picioarele neîncrucișate.",
            "Nu măsurați imediat după cafea, țigară, efort sau după ce ați urcat scări.",
            "Folosiți un tensiometru de braț cu manșetă potrivită; la încheietură erorile sunt mai frecvente.",
            "Țineți brațul la nivelul inimii și nu vorbiți în timpul măsurării.",
            "Faceți două măsurători și notați ora, contextul și eventual simptomele.",
            "Repetați mai multe zile, nu doar când ați avut o zi stresantă sau, dimpotrivă, o zi foarte liniștită.",
          ]),
          p("Cu un astfel de jurnal, consultația devine utilă. Medicul vede un model, nu o fotografie de moment. Și pe un model se pot lua decizii bune: urmărire simplă, analize, ECG, schimbare de obiceiuri sau ajustare de tratament."),
          cite(`Măsurarea corectă la domiciliu este explicată și pentru public de <a href="${CARDIOPORTAL_MASURARE}" rel="nofollow noopener" target="_blank">Cardioportal</a>.`),
        ],
      },
      {
        id: "cand",
        nav: "Când cereți ajutor",
        eyebrow: "Decizia practică",
        h2: "Când este suficientă o programare și când trebuie mers urgent",
        blocks: [
          lead("Cele mai multe valori mari nu înseamnă urgență. Urgența apare când cifra mare vine împreună cu simptome care sugerează afectare acută."),
          ul([
            "<strong>Programați-vă</strong> dacă aveți mai multe zile cu valori crescute, chiar dacă vă simțiți bine.",
            "<strong>Nu amânați</strong> dacă aveți și diabet, boală renală, sarcină, boală cardiacă sau antecedente de AVC.",
            "<strong>Căutați ajutor urgent</strong> dacă apar durere în piept, lipsă de aer, slăbiciune pe o parte, leșin, confuzie sau o durere de cap bruscă și violentă.",
            "<strong>Nu luați singur</strong> medicamente „de urgență” rămase de la alt episod fără plan făcut cu medicul.",
          ]),
          warn(
            "Numărul singur nu spune toată povestea",
            "O persoană cu 180/110 fără simptome și una cu 170/100 plus durere toracică nu au aceeași prioritate. Simptomul schimbă tot.",
          ),
        ],
      },
      {
        id: "online",
        nav: "Lead util",
        eyebrow: "Ce poate face consultația",
        h2: "Ce rezolvă o consultație online pentru boli cronice",
        blocks: [
          lead("Mai mult decât o „reînnoire de rețetă”: poate transforma un teanc de valori notate haotic într-un plan clar de urmărire."),
          p(`Pentru hipertensiunea stabilă, <strong>medicul de familie poate coordona</strong> monitorizarea, tratamentul curent și controlul factorilor de risc. În <a href="${href("/services/boli-cronice-online")}">consultația online pentru boli cronice</a> se pot revizui valorile măsurate acasă, simptomele, medicația deja prescrisă, analizele și riscul cardiovascular.`),
          p("Dacă valorile rămân necontrolate, apar simptome, există suspiciune de afectare a organelor sau este nevoie de investigații de specialitate, medicul de familie poate recomanda cardiologie ori evaluare fizică. Dosarul deja ordonat face această trecere mai clară și mai rapidă."),
          ul([
            "Interpretarea unui jurnal de tensiune arterială făcut corect.",
            "Revizuirea tratamentului antihipertensiv deja prescris și a toleranței lui.",
            "Corelarea tensiunii cu alte probleme cronice: diabet, boală renală, dislipidemie.",
            "Stabilirea clară a momentului în care trebuie mers spre evaluare cardiologică sau urgentă.",
          ]),
          p("Asta este diferența dintre un articol care doar aduce trafic și unul care chiar poate genera un pas clinic real."),
        ],
      },
    ],
    linksEyebrow: "Global Health România",
    linksH2: "Pașii următori",
    linksLead:
      "Dacă aveți deja mai multe valori ieșite din interval, pasul util nu este încă o căutare. Este să revizuiți modelul complet și să decideți dacă cere doar monitorizare, investigații sau schimbări de tratament.",
    links: [
      { label: "Managementul bolilor cronice online", href: href("/services/boli-cronice-online") },
      { label: "Calculator și jurnal de tensiune arterială", href: toolHref },
      { label: "Medicii noștri din România", href: href("/doctors") },
      { label: "Contactați Global Health România", href: href("/contact") },
    ],
    ctaBox: {
      h3: "Aveți valori repetat crescute sau oscilante?",
      text: "Veniți la consultație cu măsurătorile notate. Scopul nu este să etichetăm o cifră izolată, ci să înțelegem dacă există un model care cere urmărire, analize sau ajustarea planului.",
      primary: { label: "Programați consultația", href: href("/services/boli-cronice-online") },
      secondary: { label: "Deschideți calculatorul", href: toolHref },
    },
    sourcesEyebrow: "Surse",
    sourcesH2: "Unde merită verificat",
    sourcesLead:
      "Pentru intervale și confirmare diagnosticului, ghidul european rămâne reperul; materialele pentru public ajută la traducerea lui într-un limbaj mai simplu.",
    sources: [
      { label: "ESC 2024 — Elevated blood pressure and hypertension", href: ESC_2024 },
      { label: "Cardioportal — Hipertensiunea arterială", href: CARDIOPORTAL_HTA },
      { label: "Cardioportal — Ce înseamnă hipertensiune arterială", href: CARDIOPORTAL_CE },
      { label: "Cardioportal — Cum măsurăm tensiunea arterială", href: CARDIOPORTAL_MASURARE },
    ],
    sourcesNote:
      "Linkurile deschid resurse externe. Acest articol explică praguri și pași practici; diagnosticul și ținta de tratament se individualizează în consultație.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Tensiunea normală este diferită la bărbați și femei?",
        a: "Nu în sensul practic pe care îl caută majoritatea adulților. La adultul neînsărcinat nu folosiți o tabelă diferită doar pentru sex. Se schimbă riscul global și contextul clinic, nu definiția unei valori clar bune sau clar prea mari.",
      },
      {
        q: "De la ce valoare se consideră hipertensiune?",
        a: "O valoare repetată de 140/90 mmHg sau peste, în cabinet, intră deja în zona hipertensiunii și cere confirmare. Și valorile crescute acasă, repetate mai multe zile, merită discutate chiar dacă un singur număr nu pune diagnosticul singur.",
      },
      {
        q: "13 cu 8 este bine?",
        a: "Nu este o valoare catastrofală, dar nici cea ideală. Este peste o citire clar normală și merită repetată corect, în mai multe zile, ca să vedeți dacă este tendință sau excepție.",
      },
      {
        q: "Vârsta face normală o tensiune mai mare?",
        a: "Nu. Vârsta poate schimba cât de atent tratăm și ce țintă alegem la o persoană fragilă, dar nu transformă o tensiune persistent crescută într-o valoare normală.",
      },
      {
        q: "Când trebuie să merg urgent la medic pentru tensiune?",
        a: "Când cifra mare vine cu simptome de alarmă: durere toracică, lipsă de aer, slăbiciune pe o parte, leșin, confuzie sau durere de cap bruscă și severă. Urgența o decide combinația dintre valoare și simptome.",
      },
      {
        q: "O consultație online chiar mă poate ajuta?",
        a: "Da, mai ales pentru interpretarea valorilor repetate, revizuirea tratamentului și decizia dacă este nevoie de investigații sau cardiologie. Nu înlocuiește o urgență și nici investigațiile care se fac doar fizic.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Articol scris de Dr Robert Gabriel Brindus, medic de familie și director medical la Global Health România, și revizuit clinic de Dr Andreea Lorena Bica, medic specialist neurolog. Informațiile sunt generale și nu înlocuiesc consultația medicală individuală. Dacă apar simptome de alarmă sau o suspiciune de urgență hipertensivă, sunați la 112 sau prezentați-vă la camera de gardă.",
  } satisfies Article,
};

export const RO_TENSIUNE_ARTERIALA_NORMALA: PostSet = {
  key: "ro-tensiune-arteriala-normala",
  countryCode: "ro",
  targetKeyword: "cat este tensiunea normala in functie de varsta",
  searchVolume: 6600,
  keywordDifficulty: 0,
  evidence:
    "Editorial plan 2026-08-19 and follow-up batch 2026-08-19: cat este tensiunea normala in functie de varsta 6,600 / KD 0; tabel cu valori tensiune arteriala 2,900; calculator tensiune arteriala 1,900; GSC 21 impressions at position 12. Romania cardiology service is inactive as of 2026-08-23, so the honest live lead path is the active chronic-disease follow-up service plus the blood-pressure tool.",
  serviceSlug: "boli-cronice-online",
  authorDoctorId: "cmrc4axni00rn01p2n3r2bopf",
  authorDisplayName: "Dr Robert Gabriel Brindus",
  reviewerDoctorId: "cmrc4j7oc00se01p2gf7y9ldw",
  reviewerDisplayName: "Dr Andreea Lorena Bica",
  posts: [ro],
};
