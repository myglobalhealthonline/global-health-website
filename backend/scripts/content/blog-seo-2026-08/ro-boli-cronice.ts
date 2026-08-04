/**
 * Romania — article 2 of 2.
 *
 * TARGET CHANGED by the ro/2642 expansion (2026-08-04), same way the CZ and PT
 * expansions changed theirs.
 *
 * Original pick: "boli cronice" — 880/mo, KD 0. The expansion showed that the
 * volume sitting under that head is almost entirely *pension* demand:
 * vechime minima pentru pensie de boala 3,600 · pensie de invaliditate gradul 3
 * suma forum 3,600 · cat este pensia pe caz de boala 2,900 · pensie de
 * invaliditate gradul 2 suma forum 1,900 · boli pentru pensionare pe caz de
 * boala 1,300 · tabel cu boli pentru pensionare pe caz de boala 1,000 ·
 * calculator pensie invaliditate 1,000. That is pension law, not medicine, it
 * is answered with statutory amounts this batch refuses to publish, and it
 * converts to nothing we sell.
 *
 * New target: "boli incluse in programul national de sanatate" — 1,000/mo,
 * KD 1 — with "boli cronice" (880, KD 0) kept as co-head. In-scope cluster:
 * care sunt boli cronice 390 · tabel boli cronice 390 · programe nationale de
 * sanatate 2025 320 · boli cronice lista 260 · lista bolilor cronice in romania
 * 260 · anexa 13 boli cronice 210 · ce inseamna asigurat pns 210 KD 1 ·
 * lista boli cronice cnas 170 KD 8 · adeverinta de includere in programul
 * national de sanatate 170 KD 8 (transactional) · lista boli cronice pentru
 * pensionare 140 · cnas programe nationale de sanatate 110.
 *
 * The pension queries are deliberately not targeted and not answered here. The
 * article says once, plainly, that pension on medical grounds is decided by
 * the pension system and points there — and does not print amounts.
 *
 * SERP read (get_serp_results, ro/2642, 2026-08-04): CNAS's own
 * programe-nationale-de-sanatate-curative page, the Ministry of Health page,
 * a Government HG PDF, hospital programme lists, lege5.ro and Facebook posts
 * from MS and DSP. Everything on page one is written for administrators. No
 * page explains to a patient how inclusion actually happens.
 *
 * Facts anchored to verified sources, 2026-08-04:
 *  - CNAS lists the curative national programmes (cardiovascular disease,
 *    endocrine disease, diabetes, oncology, orthopaedics, rare diseases,
 *    transplant among them) at cnas.ro/programe-nationale-de-sanatate-curative/.
 *  - The Ministry of Health lists the programmes it runs at ms.ro.
 *
 * HONESTY CONSTRAINT. Inclusion in a national programme, the adeverință de
 * includere, the rețetă compensată and the bilet de trimitere all belong to
 * doctors in a contractual relationship with a casă de asigurări. Global Health
 * Romania is private. The article states this in its own section.
 *
 * No figures: eligibility criteria, the disease lists and the categories of
 * beneficiary are set by norms that are revised, and pension amounts are not
 * this article's business at all. Every one of them points at CNAS, the
 * Ministry of Health or the pension system.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const CNAS = "https://cnas.ro/";
const CNAS_PNS = "https://cnas.ro/programe-nationale-de-sanatate-curative/";
const MS_PNS = "https://ms.ro/ro/minister/organizare/programe-na%C8%9Bionale-de-s%C4%83n%C4%83tate/";
const MS = "https://www.ms.ro/";
const CMR = "https://www.cmr.ro/";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/romania/${lang}${path}`;

const ro: LocalePost = {
  locale: "RO",
  slug: "boli-cronice-programe-nationale-de-sanatate",
  title: "Boli cronice și programele naționale de sănătate: cum funcționează",
  excerpt:
    "Programele naționale de sănătate curative acoperă tratamentul unor boli cronice grave — diabet, oncologie, boli cardiovasculare, boli endocrine, boli rare. Explicăm cum se ajunge inclus, ce documente sunt necesare și ce se poate monitoriza online.",
  seoTitle: "Boli cronice și programele naționale de sănătate",
  seoDescription:
    "Boli incluse în programele naționale de sănătate: ce acoperă, cum se ajunge inclus și cum se monitorizează o boală cronică între controale.",
  category: "Boli cronice",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Boli cronice",
    categoryHref: href("ro", "/blog"),
    eyebrow: "România · Ghid pentru pacienți",
    h1: "Boli cronice și programele naționale de sănătate",
    deck: "Diagnosticul este doar începutul. Partea care decide cum trăiți în următorii ani este monitorizarea — și circuitul prin care ajungeți la tratament.",
    intro:
      "O <strong>boală cronică</strong> este o afecțiune de durată, care se controlează în timp și rareori se vindecă: diabet zaharat, hipertensiune arterială, boli cardiovasculare, astm și BPOC, boli endocrine, boli reumatismale, boli neurologice, boli renale cronice, boli oncologice. Pentru o parte dintre ele — cele grave și costisitoare — România are <strong>programe naționale de sănătate</strong> derulate de CNAS și de Ministerul Sănătății, prin care tratamentul este asigurat din fondurile publice. Includerea nu se cere la ghișeu: pornește de la un <strong>diagnostic stabilit de medicul de specialitate</strong>, care evaluează dacă îndepliniți criteriile de eligibilitate ale programului respectiv.",
    facts: [
      "Programe derulate de CNAS și Ministerul Sănătății",
      "Includerea pornește de la medicul specialist",
      "Criteriile se stabilesc prin norme",
    ],
    primaryCta: { label: "Managementul bolilor cronice", href: href("ro", "/services/boli-cronice-online") },
    secondaryCta: { label: "Programele naționale — CNAS", href: CNAS_PNS },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "Ce sunt programele naționale de sănătate curative și ce tip de afecțiuni acoperă.",
      "Cum se ajunge inclus într-un program și ce documente intervin pe traseu.",
      "Ce se poate monitoriza online între controalele de specialitate și ce nu.",
      "Criteriile de eligibilitate, listele de boli și categoriile de beneficiari se stabilesc prin norme care se revizuiesc. Aici nu apar liste închise și nu apar sume: fiecare punct trimite la CNAS sau la Ministerul Sănătății.",
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
        id: "ce-inseamna",
        nav: "Ce înseamnă",
        eyebrow: "Punctul de plecare",
        h2: "Ce înseamnă, în practică, o boală cronică",
        blocks: [
          lead("Definiția din manual spune „de lungă durată”. Definiția utilă spune: nu se rezolvă cu o rețetă, ci cu o relație."),
          p("O boală cronică se comportă altfel decât o infecție. Nu are un final, are o traiectorie. Rezultatul peste zece ani depinde mai puțin de momentul diagnosticului și mult mai mult de ce se întâmplă între controale: dacă tratamentul este luat corect, dacă valorile sunt urmărite, dacă apar complicații și cât de repede sunt prinse."),
          ul([
            "<strong>Boli cardiovasculare</strong> — hipertensiune, cardiopatie ischemică, insuficiență cardiacă.",
            "<strong>Boli metabolice și endocrine</strong> — diabet zaharat, boli tiroidiene, alte boli endocrine.",
            "<strong>Boli respiratorii</strong> — astm, BPOC.",
            "<strong>Boli neurologice</strong> — epilepsie, scleroză multiplă, boala Parkinson.",
            "<strong>Boli oncologice</strong>, boli renale cronice, boli reumatismale și boli rare.",
          ]),
          p("Cele mai multe dintre ele au un numitor comun: perioade lungi în care vă simțiți bine. Acolo se pierd pacienții — nu la diagnostic, ci în lunile în care nimic nu doare și tratamentul pare inutil."),
        ],
      },
      {
        id: "programe",
        nav: "Programele",
        eyebrow: "Cadrul",
        h2: "Ce sunt programele naționale de sănătate",
        blocks: [
          lead("Sunt mecanisme prin care statul finanțează tratamentul unor afecțiuni grave, dincolo de pachetul obișnuit de servicii."),
          p("<strong>CNAS</strong> derulează programele naționale de sănătate <em>curative</em> — tratamentul propriu-zis al bolnavilor — iar <strong>Ministerul Sănătății</strong> derulează programe de sănătate publică, orientate spre prevenție, screening și profilaxie. Lista programelor este publicată de fiecare instituție și se actualizează, așa că reperul rămâne pagina oficială, nu un articol."),
          ul([
            "Programul național de <strong>boli cardiovasculare</strong>.",
            "Programul național de <strong>diabet zaharat</strong>.",
            "Programul național de <strong>oncologie</strong>.",
            "Programul național de <strong>boli endocrine</strong>.",
            "Programul național de <strong>ortopedie</strong>.",
            "Programul național de tratament pentru <strong>boli rare</strong>.",
            "Programul național de <strong>transplant</strong> de organe, țesuturi și celule.",
          ]),
          p("Fiecare program are propriile <strong>criterii de eligibilitate</strong>, propriile protocoale terapeutice și propria listă de unități care îl derulează. Faptul că aveți diagnosticul nu înseamnă automat că îndepliniți criteriile programului: acestea sunt definite clinic, prin norme."),
          cite(`Listele oficiale: <a href="${CNAS_PNS}" rel="nofollow noopener" target="_blank">CNAS — programe curative</a> · <a href="${MS_PNS}" rel="nofollow noopener" target="_blank">Ministerul Sănătății — programe naționale</a>.`),
        ],
      },
      {
        id: "cum-intri",
        nav: "Cum se intră",
        eyebrow: "Traseul",
        h2: "Cum se ajunge inclus într-un program",
        blocks: [
          lead("Traseul este întotdeauna clinic mai întâi și administrativ după aceea, niciodată invers."),
          ul([
            "<strong>Evaluarea la medicul de specialitate</strong>, cu investigațiile pe care le cere protocolul afecțiunii.",
            "<strong>Diagnosticul cert</strong>, documentat — nu o suspiciune, ci un diagnostic susținut de rezultate.",
            "<strong>Verificarea criteriilor de eligibilitate</strong> ale programului, făcută de medicul curant.",
            "<strong>Documentele</strong> care atestă includerea și pe baza cărora se eliberează tratamentul.",
            "<strong>Reevaluarea periodică</strong>: menținerea în program depinde de continuarea criteriilor și de monitorizare.",
          ]),
          p("Medicul curant din unitatea care derulează programul este persoana care conduce acest proces. Medicul de familie are un rol esențial, dar diferit: vă urmărește între controale, continuă prescrierea acolo unde legea îi permite pe baza scrisorii medicale și observă primul semnele de agravare."),
          warn("Un lucru care nu se rezolvă cu o programare", "Pensionarea pe caz de boală este o procedură complet separată, decisă de sistemul de pensii pe baza expertizei capacității de muncă. Nu se obține prin includerea într-un program național de sănătate și nu depinde de medicul dumneavoastră curant. Dacă acesta este obiectivul, informați-vă direct de la casa de pensii — sumele și condițiile se modifică și nu au ce căuta într-un articol medical."),
        ],
      },
      {
        id: "medicamente",
        nav: "Medicamente",
        eyebrow: "Un mecanism diferit",
        h2: "Medicamentele compensate nu sunt același lucru",
        blocks: [
          lead("Confuzia dintre „program național” și „medicamente compensate” trimite oameni la ghișeul greșit în fiecare săptămână."),
          p("Sunt două mecanisme distincte. <strong>Programele naționale</strong> finanțează tratamentul unor afecțiuni grave, de regulă prin unități care derulează programul. Separat de acestea, există <strong>lista bolilor pentru care asigurații beneficiază în tratamentul ambulatoriu de medicamente compensate sau gratuite</strong>, eliberate pe rețetă de medicul de familie sau de specialist, în condițiile stabilite prin norme."),
          ul([
            "Nu presupuneți din diagnostic ce mecanism vi se aplică — <strong>întrebați medicul curant</strong>, el știe protocolul afecțiunii.",
            "Listele și procentele de compensare se stabilesc prin acte normative și <strong>se modifică</strong>.",
            "Rețeta compensată se eliberează de medici aflați în <strong>relație contractuală</strong> cu casa de asigurări.",
          ]),
          cite(`Listele și condițiile în vigoare: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "monitorizare",
        nav: "Monitorizare",
        eyebrow: "Între controale",
        h2: "Ce se întâmplă între controale",
        blocks: [
          lead("Aici se câștigă sau se pierde o boală cronică, iar aici sistemul este cel mai subțire."),
          p("Controlul de specialitate are loc rar. Boala, în schimb, evoluează zilnic. Diferența dintre un pacient care ajunge la complicații și unul care nu ajunge este aproape întotdeauna ce s-a întâmplat în lunile dintre programări: dacă tratamentul a fost luat, dacă valorile au fost măsurate și notate, dacă un simptom nou a fost semnalat la timp sau ignorat."),
          ul([
            "<strong>Măsurați și notați</strong> ce vă cere afecțiunea — tensiune, glicemie, greutate, puls, simptome.",
            "<strong>Aduceți datele</strong> la control, nu doar impresia generală. Un caiet sau o aplicație valorează cât o consultație.",
            "<strong>Semnalați efectele adverse</strong> în loc să întrerupeți tratamentul de unul singur — întreruperea tăcută este cea mai frecventă cauză de decompensare.",
            "<strong>Vaccinările</strong> recomandate în bolile cronice se discută cu medicul curant.",
            "<strong>Stilul de viață</strong> — somn, mișcare, alimentație, fumat, alcool — modifică traiectoria mai mult decât își imaginează majoritatea pacienților.",
          ]),
        ],
      },
      {
        id: "online",
        nav: "Consultație online",
        eyebrow: "Transparență",
        h2: "Ce poate face o consultație online și ce nu",
        blocks: [
          lead("O spunem direct, pentru că economisește un drum inutil."),
          p("Un furnizor privat <strong>nu include pacienți în programele naționale de sănătate</strong> și <strong>nu emite documente decontate</strong> din fondul de asigurări — rețetă compensată sau bilet de trimitere. Acestea aparțin medicilor aflați în relație contractuală cu casa de asigurări de sănătate."),
          p("Ceea ce poate face o consultație online este exact partea care lipsește cel mai des din îngrijirea cronică:"),
          ul([
            "<strong>Monitorizare regulată</strong> între controalele de specialitate, cu valorile pe care le măsurați acasă.",
            "<strong>Explicarea rezultatelor</strong> și a tratamentului — de ce fiecare medicament, ce urmăriți, ce semnalați.",
            "<strong>Evaluarea unui simptom nou</strong> fără să așteptați următoarea programare.",
            "<strong>A doua opinie</strong> înaintea unei decizii importante.",
            "<strong>Pregătirea dosarului</strong>: ce documente vă lipsesc și de la cine se obțin.",
            "<strong>Sprijin pentru schimbările de stil de viață</strong>, urmărite în timp și nu discutate o singură dată.",
          ]),
          p(`Puteți verifica înscrierea oricărui medic la <a href="${CMR}" rel="nofollow noopener" target="_blank">Colegiul Medicilor din România</a>, la noi ca oriunde altundeva.`),
        ],
      },
      {
        id: "alarma",
        nav: "Semne de alarmă",
        eyebrow: "Siguranță",
        h2: "Când nu se așteaptă următoarea programare",
        blocks: [
          lead("O boală cronică bine controlată poate deveni acută în câteva ore."),
          ul([
            "Durere sau apăsare în piept, mai ales cu transpirații, lipsă de aer sau durere care iradiază în braț ori în mandibulă.",
            "Slăbiciune bruscă pe o parte a corpului, gură strâmbă, tulburare de vorbire sau cefalee bruscă și intensă.",
            "Lipsă de aer în repaus, sau buze și față vinete.",
            "Glicemie foarte mare sau foarte mică, cu confuzie, vărsături sau somnolență.",
            "Umflarea rapidă a picioarelor cu creștere bruscă în greutate, la un pacient cardiac.",
            "Febră cu frisoane la un pacient imunosupresat sau aflat în tratament oncologic.",
          ]),
          p("În oricare dintre aceste situații sunați la <strong>112</strong>. Documentele, programele și dosarele se rezolvă după — și se rezolvă întotdeauna."),
        ],
      },
    ],
    linksEyebrow: "Global Health România",
    linksH2: "Pașii următori",
    linksLead:
      "Medicii noștri din România vă urmăresc între controalele de specialitate și vă spun clar ce se rezolvă privat și ce rămâne în circuitul casei de asigurări.",
    links: [
      { label: "Managementul bolilor cronice online", href: href("ro", "/services/boli-cronice-online") },
      { label: "Medicii noștri din România", href: href("ro", "/doctors") },
      { label: "Contactați Global Health România", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Aveți o boală cronică și vă vedeți medicul rar?",
      text: "O consultație de monitorizare verifică valorile pe care le măsurați acasă, aderența la tratament și simptomele noi — și vă pregătește pentru următorul control de specialitate.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/boli-cronice-online") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "Unde verificați regulile",
    sourcesLead:
      "Listele de programe, criteriile de eligibilitate și condițiile de compensare se stabilesc prin norme și se modifică. Verificați întotdeauna la sursă.",
    sources: [
      { label: "CNAS — programe naționale curative", href: CNAS_PNS },
      { label: "Casa Națională de Asigurări de Sănătate", href: CNAS },
      { label: "Ministerul Sănătății — programe naționale", href: MS_PNS },
      { label: "Ministerul Sănătății", href: MS },
      { label: "Colegiul Medicilor din România", href: CMR },
    ],
    sourcesNote:
      "Linkurile deschid site-urile instituțiilor competente. Global Health este furnizor privat, nu include pacienți în programele naționale de sănătate și nu emite documente decontate din fondul de asigurări sociale de sănătate.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Ce boli sunt incluse în programele naționale de sănătate?",
        a: "CNAS derulează programe curative pentru afecțiuni grave — între ele boli cardiovasculare, diabet zaharat, oncologie, boli endocrine, ortopedie, boli rare și transplant — iar Ministerul Sănătății derulează programe de sănătate publică. Lista se actualizează prin norme, așa că reperul este pagina oficială CNAS, nu un articol.",
      },
      {
        q: "Cum ajung inclus într-un program național de sănătate?",
        a: "Prin evaluare la medicul de specialitate, cu investigațiile cerute de protocol, diagnostic cert documentat și verificarea criteriilor de eligibilitate ale programului de către medicul curant din unitatea care îl derulează. Menținerea în program depinde de reevaluarea periodică.",
      },
      {
        q: "Care este diferența dintre program național și medicamente compensate?",
        a: "Sunt mecanisme diferite. Programele naționale finanțează tratamentul unor afecțiuni grave, de regulă prin unități care derulează programul. Separat există lista bolilor pentru care asigurații primesc în ambulatoriu medicamente compensate sau gratuite, pe rețetă eliberată în condițiile stabilite prin norme.",
      },
      {
        q: "Ce înseamnă boală cronică?",
        a: "O afecțiune de lungă durată, care se controlează în timp și rareori se vindecă: diabet, hipertensiune, astm și BPOC, boli endocrine, boli neurologice, boli renale cronice, boli oncologice și altele. Ceea ce decide evoluția nu este momentul diagnosticului, ci monitorizarea dintre controale.",
      },
      {
        q: "Bolile cronice dau dreptul la pensionare pe caz de boală?",
        a: "Este o procedură separată, decisă de sistemul de pensii pe baza expertizei capacității de muncă, nu de includerea într-un program național de sănătate și nu de medicul curant. Condițiile se modifică, așa că informațiile se cer direct de la casa de pensii.",
      },
      {
        q: "Pot fi monitorizat online pentru o boală cronică?",
        a: "Da, pentru monitorizare, explicarea tratamentului, evaluarea unui simptom nou, a doua opinie și pregătirea dosarului. Includerea în programe și documentele decontate — rețeta compensată, biletul de trimitere — rămân la medicii aflați în relație contractuală cu casa de asigurări.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Articol scris de Dr Robert Gabriel Brindus, medic de familie și director medical al Global Health România, și revizuit clinic de Dr Andreea Lorena Bica, medic specialist neurolog. Conține informații generale despre bolile cronice și despre programele naționale de sănătate și nu constituie sfat medical personalizat. Includerea într-un program, criteriile de eligibilitate și compensarea medicamentelor se stabilesc prin norme și sunt decise de casa de asigurări de sănătate. Global Health este furnizor privat. În caz de urgență medicală, sunați imediat la 112.",
  } satisfies Article,
};

export const RO_BOLI_CRONICE: PostSet = {
  key: "ro-boli-cronice",
  countryCode: "ro",
  targetKeyword: "boli incluse in programul national de sanatate",
  searchVolume: 1000,
  keywordDifficulty: 1,
  evidence:
    "ro/2642 expansion 2026-08-04. TARGET CHANGED from 'boli cronice' (880, KD 0), because the volume under that head is pension demand: vechime minima pentru pensie de boala 3,600, pensie de invaliditate gradul 3 suma forum 3,600, cat este pensia pe caz de boala 2,900, boli pentru pensionare pe caz de boala 1,300, tabel cu boli pentru pensionare 1,000, calculator pensie invaliditate 1,000 — pension law, answered with statutory amounts this batch will not publish, converting to nothing we sell. New head 'boli incluse in programul national de sanatate' 1,000 KD 1, with 'boli cronice' kept as co-head. In-scope cluster: care sunt boli cronice 390, tabel boli cronice 390, programe nationale de sanatate 2025 320, boli cronice lista 260, lista bolilor cronice in romania 260, anexa 13 boli cronice 210, ce inseamna asigurat pns 210 KD 1, lista boli cronice cnas 170 KD 8, adeverinta de includere in programul national de sanatate 170 KD 8. SERP 2026-08-04: CNAS's own curative-programmes page, the Ministry of Health page, a Government HG PDF, hospital programme lists, lege5.ro and MS/DSP Facebook posts — everything written for administrators, nothing explaining inclusion to a patient.",
  serviceSlug: "boli-cronice-online",
  authorDoctorId: "cmrc4axni00rn01p2n3r2bopf",
  authorDisplayName: "Dr Robert Gabriel Brindus",
  reviewerDoctorId: "cmrc4j7oc00se01p2gf7y9ldw",
  reviewerDisplayName: "Dr Andreea Lorena Bica",
  posts: [ro],
};
