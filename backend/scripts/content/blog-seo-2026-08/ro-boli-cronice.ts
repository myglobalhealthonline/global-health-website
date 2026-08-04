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

const en: LocalePost = {
  locale: "EN",
  slug: "chronic-disease-national-health-programmes-romania",
  title: "Chronic disease and Romania's national health programmes: how it works",
  excerpt:
    "The curative national health programmes cover treatment for serious chronic conditions — diabetes, oncology, cardiovascular and endocrine disease, rare diseases. How inclusion actually happens, which documents are involved, and what can be monitored online.",
  seoTitle: "Chronic disease and Romania's health programmes",
  seoDescription:
    "Diseases covered by Romania's national health programmes: what they include, how inclusion happens and how to monitor a chronic condition between reviews.",
  category: "Chronic conditions",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "Chronic conditions",
    categoryHref: href("en", "/blog"),
    eyebrow: "Romania · Patient guide",
    h1: "Chronic disease and the national health programmes",
    deck: "The diagnosis is only the beginning. What decides how you live over the coming years is the monitoring — and the pathway that gets you to treatment.",
    intro:
      "A <strong>chronic disease</strong> is a long-lasting condition that is controlled over time and rarely cured: diabetes, high blood pressure, cardiovascular disease, asthma and COPD, endocrine disease, rheumatic disease, neurological disease, chronic kidney disease, cancer. For some of them — the serious and costly ones — Romania runs <strong>national health programmes</strong> through CNAS and the Ministry of Health, under which treatment is funded publicly. Inclusion is not requested at a counter: it starts with a <strong>diagnosis established by a specialist</strong>, who assesses whether you meet that programme's eligibility criteria.",
    facts: [
      "Run by CNAS and the Ministry of Health",
      "Inclusion starts with the specialist",
      "Criteria are set by norms",
    ],
    primaryCta: { label: "Chronic disease management", href: href("en", "/services/boli-cronice-online") },
    secondaryCta: { label: "National programmes — CNAS", href: CNAS_PNS },
    panelChip: "What this guide covers",
    panelParas: [
      "What the curative national health programmes are and what kinds of condition they cover.",
      "How inclusion in a programme happens and which documents appear along the way.",
      "What can be monitored online between specialist reviews, and what cannot.",
      "Eligibility criteria, disease lists and beneficiary categories are set by norms that get revised. No closed lists and no amounts appear here: each point refers to CNAS or the Ministry of Health.",
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
        id: "ce-inseamna",
        nav: "What it means",
        eyebrow: "Starting point",
        h2: "What a chronic disease means in practice",
        blocks: [
          lead("The textbook definition says «long-lasting». The useful definition says: it is not settled with a prescription, but with a relationship."),
          p("A chronic disease behaves differently from an infection. It has no ending, it has a trajectory. The outcome ten years from now depends far less on the moment of diagnosis than on what happens between reviews: whether treatment is actually taken, whether readings are tracked, whether complications arise and how quickly they are caught."),
          ul([
            "<strong>Cardiovascular disease</strong> — hypertension, ischaemic heart disease, heart failure.",
            "<strong>Metabolic and endocrine disease</strong> — diabetes, thyroid disease, other endocrine conditions.",
            "<strong>Respiratory disease</strong> — asthma, COPD.",
            "<strong>Neurological disease</strong> — epilepsy, multiple sclerosis, Parkinson's disease.",
            "<strong>Cancer</strong>, chronic kidney disease, rheumatic disease and rare diseases.",
          ]),
          p("Most of them share one feature: long stretches in which you feel well. That is where patients are lost — not at diagnosis, but in the months when nothing hurts and the treatment seems pointless."),
        ],
      },
      {
        id: "programe",
        nav: "The programmes",
        eyebrow: "The framework",
        h2: "What the national health programmes are",
        blocks: [
          lead("They are the mechanisms through which the state funds treatment for serious conditions, beyond the ordinary package of services."),
          p("<strong>CNAS</strong> runs the <em>curative</em> national health programmes — the treatment of patients themselves — while the <strong>Ministry of Health</strong> runs public health programmes oriented towards prevention, screening and prophylaxis. Each institution publishes its own list and updates it, so the reference stays the official page, not an article."),
          ul([
            "The national <strong>cardiovascular disease</strong> programme.",
            "The national <strong>diabetes</strong> programme.",
            "The national <strong>oncology</strong> programme.",
            "The national <strong>endocrine disease</strong> programme.",
            "The national <strong>orthopaedics</strong> programme.",
            "The national treatment programme for <strong>rare diseases</strong>.",
            "The national <strong>transplant</strong> programme for organs, tissues and cells.",
          ]),
          p("Each programme has its own <strong>eligibility criteria</strong>, its own therapeutic protocols and its own list of units that run it. Having the diagnosis does not automatically mean you meet a programme's criteria: those are defined clinically, through norms."),
          cite(`Official lists: <a href="${CNAS_PNS}" rel="nofollow noopener" target="_blank">CNAS — curative programmes</a> · <a href="${MS_PNS}" rel="nofollow noopener" target="_blank">Ministry of Health — national programmes</a>.`),
        ],
      },
      {
        id: "cum-intri",
        nav: "Getting in",
        eyebrow: "The pathway",
        h2: "How inclusion in a programme happens",
        blocks: [
          lead("The pathway is always clinical first and administrative afterwards, never the other way round."),
          ul([
            "<strong>Assessment by a specialist</strong>, with the investigations the condition's protocol requires.",
            "<strong>A definite diagnosis</strong>, documented — not a suspicion, but a diagnosis supported by results.",
            "<strong>Checking the programme's eligibility criteria</strong>, done by the treating doctor.",
            "<strong>The documents</strong> attesting inclusion, on the basis of which treatment is dispensed.",
            "<strong>Periodic reassessment</strong>: staying in the programme depends on continuing to meet the criteria and on monitoring.",
          ]),
          p("The treating doctor in the unit running the programme is the person who leads this process. Your family doctor has an essential but different role: following you between reviews, continuing prescriptions where the law allows on the basis of the medical letter, and being the first to notice signs of deterioration."),
          warn("One thing an appointment will not settle", "Retirement on medical grounds is an entirely separate procedure, decided by the pension system on the basis of a work capacity assessment. It is not obtained through inclusion in a national health programme and does not depend on your treating doctor. If that is your goal, get the information directly from the pension house — the amounts and conditions change and have no place in a medical article."),
        ],
      },
      {
        id: "medicamente",
        nav: "Medicines",
        eyebrow: "A different mechanism",
        h2: "Subsidised medicines are not the same thing",
        blocks: [
          lead("Confusing «national programme» with «subsidised medicines» sends people to the wrong counter every week."),
          p("They are two distinct mechanisms. <strong>National programmes</strong> fund treatment for serious conditions, generally through the units that run the programme. Separately, there is the <strong>list of conditions for which insured people receive subsidised or free medicines in outpatient care</strong>, dispensed on a prescription from a family doctor or specialist, under conditions set by norms."),
          ul([
            "Do not assume from the diagnosis which mechanism applies to you — <strong>ask your treating doctor</strong>, who knows the condition's protocol.",
            "The lists and the subsidy percentages are set by legislation and <strong>change</strong>.",
            "A subsidised prescription is issued by doctors in a <strong>contractual relationship</strong> with the health insurance house.",
          ]),
          cite(`Lists and conditions in force: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "monitorizare",
        nav: "Monitoring",
        eyebrow: "Between reviews",
        h2: "What happens between reviews",
        blocks: [
          lead("This is where a chronic disease is won or lost, and it is where the system is thinnest."),
          p("Specialist reviews happen rarely. The disease, by contrast, moves every day. The difference between a patient who reaches complications and one who does not is almost always what happened in the months between appointments: whether the treatment was taken, whether readings were measured and recorded, whether a new symptom was reported in time or ignored."),
          ul([
            "<strong>Measure and record</strong> what your condition calls for — blood pressure, blood sugar, weight, pulse, symptoms.",
            "<strong>Bring the data</strong> to the review, not just a general impression. A notebook or an app is worth as much as a consultation.",
            "<strong>Report side effects</strong> instead of stopping treatment on your own — silent discontinuation is the commonest cause of decompensation.",
            "<strong>Vaccinations</strong> recommended in chronic disease are a discussion for your treating doctor.",
            "<strong>Lifestyle</strong> — sleep, movement, diet, smoking, alcohol — shifts the trajectory more than most patients imagine.",
          ]),
        ],
      },
      {
        id: "online",
        nav: "Online consultation",
        eyebrow: "Transparency",
        h2: "What an online consultation can and cannot do",
        blocks: [
          lead("We say it plainly, because it saves a wasted journey."),
          p("A private provider <strong>does not include patients in the national health programmes</strong> and <strong>does not issue reimbursed documents</strong> from the insurance fund — no subsidised prescription, no referral note. Those belong to doctors in a contractual relationship with the health insurance house."),
          p("What an online consultation does cover is precisely the part most often missing from chronic care:"),
          ul([
            "<strong>Regular monitoring</strong> between specialist reviews, using the readings you take at home.",
            "<strong>Explaining results and treatment</strong> — why each medicine, what to watch, what to report.",
            "<strong>Assessing a new symptom</strong> without waiting for the next appointment.",
            "<strong>A second opinion</strong> before an important decision.",
            "<strong>Preparing the file</strong>: which documents you are missing and from whom to obtain them.",
            "<strong>Support for lifestyle change</strong>, followed over time rather than discussed once.",
          ]),
          p(`You can check any doctor's registration with the <a href="${CMR}" rel="nofollow noopener" target="_blank">Romanian College of Physicians</a> — ours as readily as anyone else's.`),
        ],
      },
      {
        id: "alarma",
        nav: "Warning signs",
        eyebrow: "Safety",
        h2: "When not to wait for the next appointment",
        blocks: [
          lead("A well-controlled chronic disease can turn acute within hours."),
          ul([
            "Chest pain or pressure, especially with sweating, breathlessness, or pain spreading to the arm or jaw.",
            "Sudden weakness on one side of the body, a drooping face, difficulty speaking, or a sudden severe headache.",
            "Breathlessness at rest, or blue lips and face.",
            "Very high or very low blood sugar with confusion, vomiting or drowsiness.",
            "Rapid swelling of the legs with a sudden gain in weight, in a patient with heart disease.",
            "Fever with chills in someone immunosuppressed or on cancer treatment.",
          ]),
          p("In any of these situations call <strong>112</strong>. Documents, programmes and files get sorted afterwards — and they always do get sorted."),
        ],
      },
    ],
    linksEyebrow: "Global Health Romania",
    linksH2: "Next steps",
    linksLead:
      "Our doctors in Romania follow you between specialist reviews and tell you plainly what can be settled privately and what stays within the insurance pathway.",
    links: [
      { label: "Online chronic disease management", href: href("en", "/services/boli-cronice-online") },
      { label: "Our doctors in Romania", href: href("en", "/doctors") },
      { label: "Contact Global Health Romania", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Living with a chronic condition and rarely seeing your doctor?",
      text: "A monitoring consultation reviews the readings you take at home, how you are getting on with treatment and any new symptoms — and prepares you for the next specialist review.",
      primary: { label: "Book a consultation", href: href("en", "/services/boli-cronice-online") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to check the rules",
    sourcesLead:
      "Programme lists, eligibility criteria and subsidy conditions are set by norms and change. Always check at source.",
    sources: [
      { label: "CNAS — curative national programmes", href: CNAS_PNS },
      { label: "National Health Insurance House (CNAS)", href: CNAS },
      { label: "Ministry of Health — national programmes", href: MS_PNS },
      { label: "Ministry of Health", href: MS },
      { label: "Romanian College of Physicians", href: CMR },
    ],
    sourcesNote:
      "Links open the competent bodies' own websites. Global Health is a private provider, does not include patients in the national health programmes and does not issue documents reimbursed from the social health insurance fund.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "Which diseases are covered by the national health programmes?",
        a: "CNAS runs curative programmes for serious conditions — among them cardiovascular disease, diabetes, oncology, endocrine disease, orthopaedics, rare diseases and transplant — while the Ministry of Health runs public health programmes. The list is updated by norms, so the reference is the official CNAS page rather than an article.",
      },
      {
        q: "How do I get included in a national health programme?",
        a: "Through assessment by a specialist with the investigations the protocol requires, a documented definite diagnosis, and verification of the programme's eligibility criteria by the treating doctor in the unit that runs it. Staying in the programme depends on periodic reassessment.",
      },
      {
        q: "What is the difference between a national programme and subsidised medicines?",
        a: "They are different mechanisms. National programmes fund treatment for serious conditions, generally through the units running the programme. Separately there is the list of conditions for which insured people receive subsidised or free medicines in outpatient care, on a prescription issued under conditions set by norms.",
      },
      {
        q: "What does chronic disease mean?",
        a: "A long-lasting condition that is controlled over time and rarely cured: diabetes, hypertension, asthma and COPD, endocrine disease, neurological disease, chronic kidney disease, cancer and others. What decides the course is not the moment of diagnosis but the monitoring between reviews.",
      },
      {
        q: "Does a chronic disease entitle me to retire on medical grounds?",
        a: "That is a separate procedure decided by the pension system on the basis of a work capacity assessment — not by inclusion in a national health programme and not by your treating doctor. The conditions change, so ask the pension house directly.",
      },
      {
        q: "Can I be monitored online for a chronic condition?",
        a: "Yes — for monitoring, explaining treatment, assessing a new symptom, a second opinion and preparing your file. Inclusion in programmes and reimbursed documents, such as the subsidised prescription and the referral note, remain with doctors contracted to the health insurance house.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by Dr Robert Gabriel Brindus, General Practitioner and Medical Director of Global Health Romania, and clinically reviewed by Dr Andreea Lorena Bica, Consultant Neurologist. It contains general information about chronic disease and the national health programmes and is not personalised medical advice. Inclusion in a programme, eligibility criteria and medicine subsidies are set by norms and decided by the health insurance house. Global Health is a private provider. In a medical emergency, call 112 immediately.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "doencas-cronicas-programas-nacionais-romenia",
  title: "Doenças crónicas e os programas nacionais de saúde na Roménia: como funcionam",
  excerpt:
    "Os programas nacionais de saúde curativos cobrem o tratamento de doenças crónicas graves — diabetes, oncologia, doenças cardiovasculares e endócrinas, doenças raras. Como se chega a ser incluído, que documentos entram no percurso e o que se pode monitorizar online.",
  seoTitle: "Doenças crónicas e programas nacionais de saúde",
  seoDescription:
    "Doenças abrangidas pelos programas nacionais de saúde na Roménia: o que cobrem, como se é incluído e como monitorizar uma doença crónica entre consultas.",
  category: "Doenças crónicas",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Doenças crónicas",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Roménia · Guia para doentes",
    h1: "Doenças crónicas e os programas nacionais de saúde",
    deck: "O diagnóstico é apenas o início. O que decide como vive nos próximos anos é a monitorização — e o circuito que o leva até ao tratamento.",
    intro:
      "Uma <strong>doença crónica</strong> é uma afeção prolongada, que se controla ao longo do tempo e raramente se cura: diabetes, hipertensão arterial, doenças cardiovasculares, asma e DPOC, doenças endócrinas, doenças reumáticas, doenças neurológicas, doença renal crónica, doenças oncológicas. Para algumas delas — as graves e dispendiosas — a Roménia tem <strong>programas nacionais de saúde</strong> conduzidos pela CNAS e pelo Ministério da Saúde, através dos quais o tratamento é financiado por fundos públicos. A inclusão não se pede ao balcão: parte de um <strong>diagnóstico estabelecido pelo médico especialista</strong>, que avalia se cumpre os critérios de elegibilidade do programa em causa.",
    facts: [
      "Programas da CNAS e do Ministério da Saúde",
      "A inclusão começa no especialista",
      "Os critérios são fixados por normas",
    ],
    primaryCta: { label: "Gestão de doenças crónicas", href: href("pt", "/services/boli-cronice-online") },
    secondaryCta: { label: "Programas nacionais — CNAS", href: CNAS_PNS },
    panelChip: "O que este guia cobre",
    panelParas: [
      "O que são os programas nacionais de saúde curativos e que tipo de afeções cobrem.",
      "Como se chega a ser incluído num programa e que documentos surgem no percurso.",
      "O que se pode monitorizar online entre as consultas de especialidade e o que não.",
      "Os critérios de elegibilidade, as listas de doenças e as categorias de beneficiários são fixados por normas que se revêem. Aqui não há listas fechadas nem montantes: cada ponto remete para a CNAS ou para o Ministério da Saúde.",
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
        id: "ce-inseamna",
        nav: "O que significa",
        eyebrow: "Ponto de partida",
        h2: "O que significa, na prática, uma doença crónica",
        blocks: [
          lead("A definição do manual diz «de longa duração». A definição útil diz: não se resolve com uma receita, resolve-se com uma relação."),
          p("Uma doença crónica comporta-se de modo diferente de uma infeção. Não tem um fim, tem uma trajetória. O resultado daqui a dez anos depende muito menos do momento do diagnóstico e muito mais do que acontece entre consultas: se o tratamento é cumprido, se os valores são vigiados, se surgem complicações e com que rapidez são apanhadas."),
          ul([
            "<strong>Doenças cardiovasculares</strong> — hipertensão, doença coronária, insuficiência cardíaca.",
            "<strong>Doenças metabólicas e endócrinas</strong> — diabetes, doenças da tiroide, outras doenças endócrinas.",
            "<strong>Doenças respiratórias</strong> — asma, DPOC.",
            "<strong>Doenças neurológicas</strong> — epilepsia, esclerose múltipla, doença de Parkinson.",
            "<strong>Doenças oncológicas</strong>, doença renal crónica, doenças reumáticas e doenças raras.",
          ]),
          p("A maioria delas tem um denominador comum: longos períodos em que a pessoa se sente bem. É aí que se perdem os doentes — não no diagnóstico, mas nos meses em que nada dói e o tratamento parece inútil."),
        ],
      },
      {
        id: "programe",
        nav: "Os programas",
        eyebrow: "O enquadramento",
        h2: "O que são os programas nacionais de saúde",
        blocks: [
          lead("São os mecanismos pelos quais o Estado financia o tratamento de afeções graves, para além do pacote habitual de serviços."),
          p("A <strong>CNAS</strong> conduz os programas nacionais de saúde <em>curativos</em> — o tratamento dos doentes propriamente dito — enquanto o <strong>Ministério da Saúde</strong> conduz programas de saúde pública orientados para a prevenção, o rastreio e a profilaxia. Cada instituição publica a sua lista e atualiza-a, pelo que a referência continua a ser a página oficial e não um artigo."),
          ul([
            "Programa nacional de <strong>doenças cardiovasculares</strong>.",
            "Programa nacional de <strong>diabetes</strong>.",
            "Programa nacional de <strong>oncologia</strong>.",
            "Programa nacional de <strong>doenças endócrinas</strong>.",
            "Programa nacional de <strong>ortopedia</strong>.",
            "Programa nacional de tratamento de <strong>doenças raras</strong>.",
            "Programa nacional de <strong>transplante</strong> de órgãos, tecidos e células.",
          ]),
          p("Cada programa tem os seus <strong>critérios de elegibilidade</strong>, os seus protocolos terapêuticos e a sua lista de unidades que o executam. Ter o diagnóstico não significa automaticamente cumprir os critérios do programa: estes são definidos clinicamente, por normas."),
          cite(`Listas oficiais: <a href="${CNAS_PNS}" rel="nofollow noopener" target="_blank">CNAS — programas curativos</a> · <a href="${MS_PNS}" rel="nofollow noopener" target="_blank">Ministério da Saúde — programas nacionais</a>.`),
        ],
      },
      {
        id: "cum-intri",
        nav: "Como se entra",
        eyebrow: "O percurso",
        h2: "Como se chega a ser incluído num programa",
        blocks: [
          lead("O percurso é sempre clínico primeiro e administrativo depois, nunca ao contrário."),
          ul([
            "<strong>Avaliação pelo médico especialista</strong>, com os exames exigidos pelo protocolo da doença.",
            "<strong>Diagnóstico certo</strong> e documentado — não uma suspeita, mas um diagnóstico sustentado em resultados.",
            "<strong>Verificação dos critérios de elegibilidade</strong> do programa, feita pelo médico assistente.",
            "<strong>Os documentos</strong> que atestam a inclusão e com base nos quais o tratamento é dispensado.",
            "<strong>Reavaliação periódica</strong>: a permanência no programa depende de continuar a cumprir os critérios e da monitorização.",
          ]),
          p("O médico assistente da unidade que executa o programa é quem conduz este processo. O médico de família tem um papel essencial, mas diferente: acompanha-o entre consultas, mantém a prescrição onde a lei o permite com base na carta médica e é o primeiro a notar sinais de agravamento."),
          warn("Uma coisa que não se resolve com uma consulta", "A reforma por motivo de doença é um procedimento completamente separado, decidido pelo sistema de pensões com base na avaliação da capacidade de trabalho. Não se obtém pela inclusão num programa nacional de saúde e não depende do seu médico assistente. Se é esse o objetivo, informe-se diretamente junto da caixa de pensões — os montantes e as condições alteram-se e não têm lugar num artigo médico."),
        ],
      },
      {
        id: "medicamente",
        nav: "Medicamentos",
        eyebrow: "Um mecanismo diferente",
        h2: "Os medicamentos comparticipados não são a mesma coisa",
        blocks: [
          lead("Confundir «programa nacional» com «medicamentos comparticipados» manda pessoas ao balcão errado todas as semanas."),
          p("São dois mecanismos distintos. Os <strong>programas nacionais</strong> financiam o tratamento de afeções graves, em regra através das unidades que executam o programa. Separadamente, existe a <strong>lista de doenças pelas quais os beneficiários recebem em ambulatório medicamentos comparticipados ou gratuitos</strong>, dispensados por receita do médico de família ou do especialista, nas condições fixadas por normas."),
          ul([
            "Não presuma pelo diagnóstico qual o mecanismo aplicável — <strong>pergunte ao médico assistente</strong>, que conhece o protocolo da doença.",
            "As listas e as percentagens de comparticipação são fixadas por diploma e <strong>alteram-se</strong>.",
            "A receita comparticipada é emitida por médicos em <strong>relação contratual</strong> com a caixa de seguro de saúde.",
          ]),
          cite(`Listas e condições em vigor: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "monitorizare",
        nav: "Monitorização",
        eyebrow: "Entre consultas",
        h2: "O que acontece entre consultas",
        blocks: [
          lead("É aqui que se ganha ou se perde uma doença crónica, e é aqui que o sistema é mais frágil."),
          p("A consulta de especialidade acontece raramente. A doença, essa, evolui todos os dias. A diferença entre um doente que chega a complicações e outro que não chega está quase sempre no que aconteceu nos meses entre marcações: se o tratamento foi cumprido, se os valores foram medidos e registados, se um sintoma novo foi comunicado a tempo ou ignorado."),
          ul([
            "<strong>Meça e registe</strong> o que a sua doença exige — tensão arterial, glicemia, peso, pulso, sintomas.",
            "<strong>Leve os dados</strong> à consulta, não apenas a impressão geral. Um caderno ou uma aplicação vale tanto como uma consulta.",
            "<strong>Comunique os efeitos adversos</strong> em vez de interromper o tratamento por sua conta — a interrupção silenciosa é a causa mais frequente de descompensação.",
            "<strong>As vacinas</strong> recomendadas nas doenças crónicas discutem-se com o médico assistente.",
            "<strong>O estilo de vida</strong> — sono, movimento, alimentação, tabaco, álcool — altera a trajetória mais do que a maioria dos doentes imagina.",
          ]),
        ],
      },
      {
        id: "online",
        nav: "Consulta online",
        eyebrow: "Transparência",
        h2: "O que pode e o que não pode uma consulta online",
        blocks: [
          lead("Dizemo-lo diretamente, porque poupa uma deslocação inútil."),
          p("Um prestador privado <strong>não inclui doentes nos programas nacionais de saúde</strong> e <strong>não emite documentos comparticipados</strong> pelo fundo do seguro — nem receita comparticipada, nem credencial de referenciação. Estes pertencem aos médicos em relação contratual com a caixa de seguro de saúde."),
          p("O que uma consulta online resolve é exatamente a parte que mais falta nos cuidados crónicos:"),
          ul([
            "<strong>Monitorização regular</strong> entre as consultas de especialidade, com os valores que mede em casa.",
            "<strong>Explicação dos resultados</strong> e do tratamento — porquê cada medicamento, o que vigiar, o que comunicar.",
            "<strong>Avaliação de um sintoma novo</strong> sem esperar pela consulta seguinte.",
            "<strong>Segunda opinião</strong> antes de uma decisão importante.",
            "<strong>Preparação do processo</strong>: que documentos lhe faltam e junto de quem se obtêm.",
            "<strong>Apoio às mudanças de estilo de vida</strong>, acompanhadas ao longo do tempo e não discutidas uma única vez.",
          ]),
          p(`Pode confirmar a inscrição de qualquer médico junto do <a href="${CMR}" rel="nofollow noopener" target="_blank">Colégio dos Médicos da Roménia</a>, connosco tal como em qualquer outro lado.`),
        ],
      },
      {
        id: "alarma",
        nav: "Sinais de alarme",
        eyebrow: "Segurança",
        h2: "Quando não se espera pela próxima consulta",
        blocks: [
          lead("Uma doença crónica bem controlada pode tornar-se aguda em poucas horas."),
          ul([
            "Dor ou aperto no peito, sobretudo com suores, falta de ar ou dor que irradia para o braço ou para a mandíbula.",
            "Fraqueza súbita de um lado do corpo, boca ao lado, alteração da fala ou dor de cabeça súbita e intensa.",
            "Falta de ar em repouso, ou lábios e face azulados.",
            "Glicemia muito alta ou muito baixa, com confusão, vómitos ou sonolência.",
            "Inchaço rápido das pernas com aumento súbito de peso, num doente cardíaco.",
            "Febre com arrepios num doente imunodeprimido ou em tratamento oncológico.",
          ]),
          p("Em qualquer destas situações ligue <strong>112</strong>. Os documentos, os programas e os processos resolvem-se depois — e resolvem-se sempre."),
        ],
      },
    ],
    linksEyebrow: "Global Health Roménia",
    linksH2: "Passos seguintes",
    linksLead:
      "Os nossos médicos na Roménia acompanham-no entre as consultas de especialidade e dizem-lhe com clareza o que se resolve no privado e o que fica no circuito da caixa de seguro.",
    links: [
      { label: "Gestão online de doenças crónicas", href: href("pt", "/services/boli-cronice-online") },
      { label: "Os nossos médicos na Roménia", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Roménia", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Tem uma doença crónica e vê o médico poucas vezes?",
      text: "Uma consulta de monitorização verifica os valores que mede em casa, o cumprimento do tratamento e os sintomas novos — e prepara-o para a próxima consulta de especialidade.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/boli-cronice-online") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar as regras",
    sourcesLead:
      "As listas de programas, os critérios de elegibilidade e as condições de comparticipação são fixados por normas e alteram-se. Confirme sempre na fonte.",
    sources: [
      { label: "CNAS — programas nacionais curativos", href: CNAS_PNS },
      { label: "Caixa Nacional de Seguro de Saúde (CNAS)", href: CNAS },
      { label: "Ministério da Saúde — programas nacionais", href: MS_PNS },
      { label: "Ministério da Saúde da Roménia", href: MS },
      { label: "Colégio dos Médicos da Roménia", href: CMR },
    ],
    sourcesNote:
      "As ligações abrem os sítios das instituições competentes. A Global Health é um prestador privado, não inclui doentes nos programas nacionais de saúde e não emite documentos comparticipados pelo fundo do seguro social de saúde.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "Que doenças estão incluídas nos programas nacionais de saúde?",
        a: "A CNAS conduz programas curativos para afeções graves — entre elas doenças cardiovasculares, diabetes, oncologia, doenças endócrinas, ortopedia, doenças raras e transplante — e o Ministério da Saúde conduz programas de saúde pública. A lista é atualizada por normas, pelo que a referência é a página oficial da CNAS e não um artigo.",
      },
      {
        q: "Como sou incluído num programa nacional de saúde?",
        a: "Através da avaliação pelo médico especialista com os exames exigidos pelo protocolo, de um diagnóstico certo documentado e da verificação dos critérios de elegibilidade pelo médico assistente da unidade que executa o programa. A permanência depende da reavaliação periódica.",
      },
      {
        q: "Qual a diferença entre programa nacional e medicamentos comparticipados?",
        a: "São mecanismos diferentes. Os programas nacionais financiam o tratamento de afeções graves, em regra através das unidades que os executam. Separadamente existe a lista de doenças pelas quais os beneficiários recebem em ambulatório medicamentos comparticipados ou gratuitos, por receita emitida nas condições fixadas por normas.",
      },
      {
        q: "O que é uma doença crónica?",
        a: "Uma afeção de longa duração, que se controla ao longo do tempo e raramente se cura: diabetes, hipertensão, asma e DPOC, doenças endócrinas, doenças neurológicas, doença renal crónica, doenças oncológicas e outras. O que decide a evolução não é o momento do diagnóstico, mas a monitorização entre consultas.",
      },
      {
        q: "As doenças crónicas dão direito a reforma por doença?",
        a: "É um procedimento separado, decidido pelo sistema de pensões com base na avaliação da capacidade de trabalho, e não pela inclusão num programa nacional de saúde nem pelo médico assistente. As condições alteram-se, por isso a informação pede-se diretamente à caixa de pensões.",
      },
      {
        q: "Posso ser monitorizado online por uma doença crónica?",
        a: "Sim, para monitorização, explicação do tratamento, avaliação de um sintoma novo, segunda opinião e preparação do processo. A inclusão em programas e os documentos comparticipados — receita comparticipada, credencial de referenciação — continuam a caber aos médicos em relação contratual com a caixa de seguro.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Artigo escrito pelo Dr Robert Gabriel Brindus, médico de família e diretor clínico da Global Health Roménia, e revisto clinicamente pela Dra. Andreea Lorena Bica, médica especialista em Neurologia. Contém informação geral sobre doenças crónicas e sobre os programas nacionais de saúde e não constitui aconselhamento médico personalizado. A inclusão num programa, os critérios de elegibilidade e a comparticipação de medicamentos são fixados por normas e decididos pela caixa de seguro de saúde. A Global Health é um prestador privado. Perante uma emergência médica, ligue de imediato 112.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "enfermedades-cronicas-programas-nacionales-rumania",
  title: "Enfermedades crónicas y los programas nacionales de salud en Rumanía: cómo funcionan",
  excerpt:
    "Los programas nacionales de salud curativos cubren el tratamiento de enfermedades crónicas graves: diabetes, oncología, enfermedades cardiovasculares y endocrinas, enfermedades raras. Cómo se llega a estar incluido, qué documentos intervienen y qué se puede seguir online.",
  seoTitle: "Enfermedades crónicas y programas nacionales",
  seoDescription:
    "Enfermedades incluidas en los programas nacionales de salud de Rumanía: qué cubren, cómo se accede y cómo seguir una enfermedad crónica entre revisiones.",
  category: "Enfermedades crónicas",
  article: {
    lang: "es-ES",
    tagline: "Medicina a cualquier hora, en cualquier lugar",
    categoryLabel: "Enfermedades crónicas",
    categoryHref: href("es", "/blog"),
    eyebrow: "Rumanía · Guía para pacientes",
    h1: "Enfermedades crónicas y los programas nacionales de salud",
    deck: "El diagnóstico es solo el principio. Lo que decide cómo vivirá los próximos años es el seguimiento, y el circuito que le lleva hasta el tratamiento.",
    intro:
      "Una <strong>enfermedad crónica</strong> es un proceso de larga duración que se controla con el tiempo y rara vez se cura: diabetes, hipertensión arterial, enfermedades cardiovasculares, asma y EPOC, enfermedades endocrinas, enfermedades reumáticas, enfermedades neurológicas, enfermedad renal crónica, enfermedades oncológicas. Para algunas de ellas —las graves y costosas— Rumanía tiene <strong>programas nacionales de salud</strong> gestionados por la CNAS y por el Ministerio de Sanidad, con los que el tratamiento se financia con fondos públicos. La inclusión no se pide en ventanilla: parte de un <strong>diagnóstico establecido por el médico especialista</strong>, que valora si cumple los criterios de elegibilidad de ese programa.",
    facts: [
      "Programas de la CNAS y del Ministerio",
      "La inclusión empieza en el especialista",
      "Los criterios se fijan por normativa",
    ],
    primaryCta: { label: "Manejo de enfermedades crónicas", href: href("es", "/services/boli-cronice-online") },
    secondaryCta: { label: "Programas nacionales — CNAS", href: CNAS_PNS },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Qué son los programas nacionales de salud curativos y qué tipo de procesos cubren.",
      "Cómo se llega a estar incluido en un programa y qué documentos aparecen por el camino.",
      "Qué se puede seguir online entre las revisiones del especialista y qué no.",
      "Los criterios de elegibilidad, las listas de enfermedades y las categorías de beneficiarios se fijan por normativa, que se revisa. Aquí no hay listas cerradas ni importes: cada punto remite a la CNAS o al Ministerio de Sanidad.",
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
        id: "ce-inseamna",
        nav: "Qué significa",
        eyebrow: "Punto de partida",
        h2: "Qué significa en la práctica una enfermedad crónica",
        blocks: [
          lead("La definición del manual dice «de larga duración». La definición útil dice: no se resuelve con una receta, sino con una relación."),
          p("Una enfermedad crónica se comporta de forma distinta a una infección. No tiene un final, tiene una trayectoria. El resultado dentro de diez años depende mucho menos del momento del diagnóstico y mucho más de lo que ocurre entre revisiones: si el tratamiento se toma bien, si se vigilan las cifras, si aparecen complicaciones y con qué rapidez se detectan."),
          ul([
            "<strong>Enfermedades cardiovasculares</strong>: hipertensión, cardiopatía isquémica, insuficiencia cardíaca.",
            "<strong>Enfermedades metabólicas y endocrinas</strong>: diabetes, enfermedades tiroideas, otras endocrinopatías.",
            "<strong>Enfermedades respiratorias</strong>: asma, EPOC.",
            "<strong>Enfermedades neurológicas</strong>: epilepsia, esclerosis múltiple, enfermedad de Parkinson.",
            "<strong>Enfermedades oncológicas</strong>, enfermedad renal crónica, enfermedades reumáticas y enfermedades raras.",
          ]),
          p("Casi todas comparten un rasgo: largos periodos en los que uno se encuentra bien. Ahí se pierden los pacientes; no en el diagnóstico, sino en los meses en los que nada duele y el tratamiento parece innecesario."),
        ],
      },
      {
        id: "programe",
        nav: "Los programas",
        eyebrow: "El marco",
        h2: "Qué son los programas nacionales de salud",
        blocks: [
          lead("Son los mecanismos con los que el Estado financia el tratamiento de procesos graves, más allá de la cartera habitual de servicios."),
          p("La <strong>CNAS</strong> gestiona los programas nacionales de salud <em>curativos</em> —el tratamiento de los pacientes propiamente dicho— mientras que el <strong>Ministerio de Sanidad</strong> gestiona programas de salud pública orientados a la prevención, el cribado y la profilaxis. Cada institución publica su lista y la actualiza, así que la referencia sigue siendo la página oficial y no un artículo."),
          ul([
            "Programa nacional de <strong>enfermedades cardiovasculares</strong>.",
            "Programa nacional de <strong>diabetes</strong>.",
            "Programa nacional de <strong>oncología</strong>.",
            "Programa nacional de <strong>enfermedades endocrinas</strong>.",
            "Programa nacional de <strong>ortopedia</strong>.",
            "Programa nacional de tratamiento de <strong>enfermedades raras</strong>.",
            "Programa nacional de <strong>trasplante</strong> de órganos, tejidos y células.",
          ]),
          p("Cada programa tiene sus propios <strong>criterios de elegibilidad</strong>, sus protocolos terapéuticos y su lista de centros que lo desarrollan. Tener el diagnóstico no significa cumplir automáticamente los criterios del programa: se definen clínicamente, por normativa."),
          cite(`Listas oficiales: <a href="${CNAS_PNS}" rel="nofollow noopener" target="_blank">CNAS — programas curativos</a> · <a href="${MS_PNS}" rel="nofollow noopener" target="_blank">Ministerio de Sanidad — programas nacionales</a>.`),
        ],
      },
      {
        id: "cum-intri",
        nav: "Cómo se entra",
        eyebrow: "El recorrido",
        h2: "Cómo se llega a estar incluido en un programa",
        blocks: [
          lead("El recorrido es siempre clínico primero y administrativo después, nunca al revés."),
          ul([
            "<strong>Valoración por el médico especialista</strong>, con las pruebas que exige el protocolo del proceso.",
            "<strong>Diagnóstico cierto</strong> y documentado: no una sospecha, sino un diagnóstico sostenido por resultados.",
            "<strong>Comprobación de los criterios de elegibilidad</strong> del programa por parte del médico responsable.",
            "<strong>Los documentos</strong> que acreditan la inclusión y con los que se dispensa el tratamiento.",
            "<strong>Reevaluación periódica</strong>: permanecer en el programa depende de seguir cumpliendo los criterios y del seguimiento.",
          ]),
          p("El médico responsable del centro que desarrolla el programa es quien dirige este proceso. El médico de familia tiene un papel esencial pero distinto: le sigue entre revisiones, mantiene la prescripción donde la ley se lo permite a partir del informe médico y es el primero en detectar los signos de empeoramiento."),
          warn("Algo que no se resuelve con una cita", "La jubilación por enfermedad es un procedimiento completamente aparte, decidido por el sistema de pensiones a partir de la valoración de la capacidad laboral. No se obtiene por estar incluido en un programa nacional de salud y no depende de su médico. Si ese es el objetivo, infórmese directamente en la caja de pensiones: los importes y las condiciones cambian y no tienen cabida en un artículo médico."),
        ],
      },
      {
        id: "medicamente",
        nav: "Medicamentos",
        eyebrow: "Otro mecanismo",
        h2: "Los medicamentos financiados no son lo mismo",
        blocks: [
          lead("Confundir «programa nacional» con «medicamentos financiados» manda a gente a la ventanilla equivocada cada semana."),
          p("Son dos mecanismos distintos. Los <strong>programas nacionales</strong> financian el tratamiento de procesos graves, por lo general a través de los centros que desarrollan el programa. Aparte existe la <strong>lista de enfermedades por las que los asegurados reciben en atención ambulatoria medicamentos financiados o gratuitos</strong>, dispensados con receta del médico de familia o del especialista, en las condiciones fijadas por normativa."),
          ul([
            "No dé por supuesto qué mecanismo le corresponde a partir del diagnóstico: <strong>pregunte a su médico responsable</strong>, que conoce el protocolo del proceso.",
            "Las listas y los porcentajes de financiación se fijan por norma y <strong>cambian</strong>.",
            "La receta financiada la emiten médicos con <strong>relación contractual</strong> con la caja del seguro de salud.",
          ]),
          cite(`Listas y condiciones vigentes: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "monitorizare",
        nav: "Seguimiento",
        eyebrow: "Entre revisiones",
        h2: "Qué ocurre entre revisiones",
        blocks: [
          lead("Aquí se gana o se pierde una enfermedad crónica, y aquí el sistema es más frágil."),
          p("La revisión del especialista ocurre pocas veces. La enfermedad, en cambio, avanza a diario. La diferencia entre un paciente que llega a complicaciones y otro que no está casi siempre en lo ocurrido en los meses entre citas: si se tomó el tratamiento, si se midieron y anotaron las cifras, si un síntoma nuevo se comunicó a tiempo o se ignoró."),
          ul([
            "<strong>Mida y anote</strong> lo que su proceso exija: tensión, glucemia, peso, pulso, síntomas.",
            "<strong>Lleve los datos</strong> a la revisión, no solo la impresión general. Un cuaderno o una aplicación vale tanto como una consulta.",
            "<strong>Comunique los efectos adversos</strong> en vez de suspender el tratamiento por su cuenta: el abandono silencioso es la causa más frecuente de descompensación.",
            "<strong>Las vacunas</strong> recomendadas en enfermedades crónicas se hablan con el médico responsable.",
            "<strong>El estilo de vida</strong> —sueño, actividad, alimentación, tabaco, alcohol— cambia la trayectoria más de lo que la mayoría imagina.",
          ]),
        ],
      },
      {
        id: "online",
        nav: "Consulta online",
        eyebrow: "Transparencia",
        h2: "Qué puede hacer una consulta online y qué no",
        blocks: [
          lead("Lo decimos directamente, porque ahorra un viaje inútil."),
          p("Un proveedor privado <strong>no incluye pacientes en los programas nacionales de salud</strong> y <strong>no emite documentos financiados</strong> por el fondo del seguro: ni receta financiada ni volante de derivación. Corresponden a los médicos con relación contractual con la caja del seguro de salud."),
          p("Lo que sí resuelve una consulta online es justamente la parte que más falta en la atención crónica:"),
          ul([
            "<strong>Seguimiento regular</strong> entre las revisiones del especialista, con las cifras que mide en casa.",
            "<strong>Explicación de los resultados</strong> y del tratamiento: por qué cada fármaco, qué vigilar, qué comunicar.",
            "<strong>Valoración de un síntoma nuevo</strong> sin esperar a la siguiente cita.",
            "<strong>Segunda opinión</strong> antes de una decisión importante.",
            "<strong>Preparación del expediente</strong>: qué documentos le faltan y ante quién se consiguen.",
            "<strong>Apoyo en los cambios de estilo de vida</strong>, seguidos en el tiempo y no hablados una sola vez.",
          ]),
          p(`Puede comprobar la colegiación de cualquier médico en el <a href="${CMR}" rel="nofollow noopener" target="_blank">Colegio de Médicos de Rumanía</a>, con nosotros igual que con cualquier otro.`),
        ],
      },
      {
        id: "alarma",
        nav: "Señales de alarma",
        eyebrow: "Seguridad",
        h2: "Cuándo no se espera a la próxima cita",
        blocks: [
          lead("Una enfermedad crónica bien controlada puede volverse aguda en pocas horas."),
          ul([
            "Dolor u opresión en el pecho, especialmente con sudoración, falta de aire o dolor que irradia al brazo o a la mandíbula.",
            "Debilidad brusca en un lado del cuerpo, boca torcida, dificultad para hablar o dolor de cabeza súbito e intenso.",
            "Falta de aire en reposo, o labios y cara azulados.",
            "Glucemia muy alta o muy baja, con confusión, vómitos o somnolencia.",
            "Hinchazón rápida de las piernas con aumento brusco de peso, en un paciente cardíaco.",
            "Fiebre con escalofríos en un paciente inmunodeprimido o en tratamiento oncológico.",
          ]),
          p("En cualquiera de estas situaciones llame al <strong>112</strong>. Los documentos, los programas y los expedientes se resuelven después, y siempre acaban resolviéndose."),
        ],
      },
    ],
    linksEyebrow: "Global Health Rumanía",
    linksH2: "Siguientes pasos",
    linksLead:
      "Nuestros médicos en Rumanía le siguen entre las revisiones del especialista y le dicen con claridad qué se resuelve en privado y qué queda en el circuito de la caja del seguro.",
    links: [
      { label: "Manejo online de enfermedades crónicas", href: href("es", "/services/boli-cronice-online") },
      { label: "Nuestros médicos en Rumanía", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Rumanía", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿Tiene una enfermedad crónica y ve poco a su médico?",
      text: "Una consulta de seguimiento revisa las cifras que mide en casa, la adherencia al tratamiento y los síntomas nuevos, y le prepara para la siguiente revisión con el especialista.",
      primary: { label: "Reservar consulta", href: href("es", "/services/boli-cronice-online") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde confirmar las reglas",
    sourcesLead:
      "Las listas de programas, los criterios de elegibilidad y las condiciones de financiación se fijan por normativa y cambian. Confirme siempre en la fuente.",
    sources: [
      { label: "CNAS — programas nacionales curativos", href: CNAS_PNS },
      { label: "Caja Nacional del Seguro de Salud (CNAS)", href: CNAS },
      { label: "Ministerio de Sanidad — programas nacionales", href: MS_PNS },
      { label: "Ministerio de Sanidad de Rumanía", href: MS },
      { label: "Colegio de Médicos de Rumanía", href: CMR },
    ],
    sourcesNote:
      "Los enlaces abren los sitios de los organismos competentes. Global Health es un proveedor privado, no incluye pacientes en los programas nacionales de salud y no emite documentos financiados por el fondo del seguro social de salud.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Qué enfermedades están incluidas en los programas nacionales de salud?",
        a: "La CNAS gestiona programas curativos para procesos graves —entre ellos enfermedades cardiovasculares, diabetes, oncología, enfermedades endocrinas, ortopedia, enfermedades raras y trasplante— y el Ministerio de Sanidad gestiona programas de salud pública. La lista se actualiza por normativa, así que la referencia es la página oficial de la CNAS y no un artículo.",
      },
      {
        q: "¿Cómo consigo entrar en un programa nacional de salud?",
        a: "Con la valoración del médico especialista y las pruebas que exige el protocolo, un diagnóstico cierto documentado y la comprobación de los criterios de elegibilidad por el médico responsable del centro que desarrolla el programa. Permanecer en él depende de la reevaluación periódica.",
      },
      {
        q: "¿Qué diferencia hay entre programa nacional y medicamentos financiados?",
        a: "Son mecanismos distintos. Los programas nacionales financian el tratamiento de procesos graves, por lo general a través de los centros que los desarrollan. Aparte existe la lista de enfermedades por las que los asegurados reciben en ambulatorio medicamentos financiados o gratuitos, con receta emitida en las condiciones fijadas por normativa.",
      },
      {
        q: "¿Qué es una enfermedad crónica?",
        a: "Un proceso de larga duración que se controla con el tiempo y rara vez se cura: diabetes, hipertensión, asma y EPOC, enfermedades endocrinas, enfermedades neurológicas, enfermedad renal crónica, enfermedades oncológicas y otras. Lo que decide la evolución no es el momento del diagnóstico, sino el seguimiento entre revisiones.",
      },
      {
        q: "¿Las enfermedades crónicas dan derecho a jubilación por enfermedad?",
        a: "Es un procedimiento aparte, decidido por el sistema de pensiones a partir de la valoración de la capacidad laboral, no por la inclusión en un programa nacional de salud ni por el médico responsable. Las condiciones cambian, así que la información se pide directamente en la caja de pensiones.",
      },
      {
        q: "¿Puedo tener seguimiento online de una enfermedad crónica?",
        a: "Sí, para seguimiento, explicación del tratamiento, valoración de un síntoma nuevo, segunda opinión y preparación del expediente. La inclusión en programas y los documentos financiados —receta financiada, volante de derivación— siguen correspondiendo a los médicos con relación contractual con la caja del seguro.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Artículo escrito por el Dr Robert Gabriel Brindus, médico de familia y director médico de Global Health Rumanía, y revisado clínicamente por la Dra. Andreea Lorena Bica, médica especialista en Neurología. Contiene información general sobre las enfermedades crónicas y los programas nacionales de salud y no constituye asesoramiento médico personalizado. La inclusión en un programa, los criterios de elegibilidad y la financiación de medicamentos se fijan por normativa y los decide la caja del seguro de salud. Global Health es un proveedor privado. Ante una emergencia médica, llame de inmediato al 112.",
  } satisfies Article,
};

const cs: LocalePost = {
  locale: "CS",
  slug: "chronicke-nemoci-narodni-programy-rumunsko",
  title: "Chronické nemoci a národní zdravotní programy v Rumunsku: jak to funguje",
  excerpt:
    "Kurativní národní zdravotní programy hradí léčbu závažných chronických nemocí — diabetu, onkologických, kardiovaskulárních a endokrinních onemocnění i vzácných nemocí. Jak zařazení probíhá, jaké dokumenty do něj vstupují a co lze sledovat online.",
  seoTitle: "Chronické nemoci a národní programy v Rumunsku",
  seoDescription:
    "Nemoci zahrnuté do rumunských národních zdravotních programů: co pokrývají, jak probíhá zařazení a jak sledovat chronickou nemoc mezi kontrolami.",
  category: "Chronické nemoci",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Chronické nemoci",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Rumunsko · Průvodce pro pacienty",
    h1: "Chronické nemoci a národní zdravotní programy",
    deck: "Diagnóza je jen začátek. O tom, jak budete žít další roky, rozhoduje sledování — a cesta, která vás dovede k léčbě.",
    intro:
      "<strong>Chronická nemoc</strong> je dlouhodobé onemocnění, které se v čase udržuje pod kontrolou a jen zřídka se vyléčí: cukrovka, vysoký krevní tlak, kardiovaskulární onemocnění, astma a CHOPN, endokrinní onemocnění, revmatická onemocnění, neurologická onemocnění, chronické onemocnění ledvin, nádorová onemocnění. Pro část z nich — pro ta závažná a nákladná — má Rumunsko <strong>národní zdravotní programy</strong> vedené CNAS a ministerstvem zdravotnictví, v jejichž rámci je léčba hrazena z veřejných prostředků. O zařazení se nežádá u přepážky: vychází z <strong>diagnózy stanovené specialistou</strong>, který posoudí, zda splňujete kritéria způsobilosti daného programu.",
    facts: [
      "Programy CNAS a ministerstva zdravotnictví",
      "Zařazení začíná u specialisty",
      "Kritéria stanovují prováděcí předpisy",
    ],
    primaryCta: { label: "Péče o chronické nemoci", href: href("cs", "/services/boli-cronice-online") },
    secondaryCta: { label: "Národní programy — CNAS", href: CNAS_PNS },
    panelChip: "Co tento průvodce pokrývá",
    panelParas: [
      "Co jsou kurativní národní zdravotní programy a jaká onemocnění pokrývají.",
      "Jak zařazení do programu probíhá a jaké dokumenty do něj po cestě vstupují.",
      "Co lze sledovat online mezi kontrolami u specialisty a co ne.",
      "Kritéria způsobilosti, seznamy nemocí a kategorie příjemců stanovují předpisy, které se revidují. Uzavřené seznamy ani částky zde neuvádíme: každý bod odkazuje na CNAS nebo na ministerstvo zdravotnictví.",
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
        id: "ce-inseamna",
        nav: "Co to znamená",
        eyebrow: "Východisko",
        h2: "Co v praxi znamená chronická nemoc",
        blocks: [
          lead("Učebnicová definice říká „dlouhodobá“. Užitečná definice říká: neřeší se receptem, ale vztahem."),
          p("Chronická nemoc se chová jinak než infekce. Nemá konec, má vývoj. Výsledek za deset let závisí mnohem méně na okamžiku diagnózy a mnohem víc na tom, co se děje mezi kontrolami: zda se léčba skutečně užívá, zda se sledují hodnoty, zda se objeví komplikace a jak rychle se zachytí."),
          ul([
            "<strong>Kardiovaskulární onemocnění</strong> — hypertenze, ischemická choroba srdeční, srdeční selhání.",
            "<strong>Metabolická a endokrinní onemocnění</strong> — cukrovka, onemocnění štítné žlázy, další endokrinopatie.",
            "<strong>Onemocnění dýchacích cest</strong> — astma, CHOPN.",
            "<strong>Neurologická onemocnění</strong> — epilepsie, roztroušená skleróza, Parkinsonova nemoc.",
            "<strong>Nádorová onemocnění</strong>, chronické onemocnění ledvin, revmatická a vzácná onemocnění.",
          ]),
          p("Většina z nich má společného jmenovatele: dlouhá období, kdy se člověk cítí dobře. Právě tam se pacienti ztrácejí — ne při diagnóze, ale v měsících, kdy nic nebolí a léčba se zdá zbytečná."),
        ],
      },
      {
        id: "programe",
        nav: "Programy",
        eyebrow: "Rámec",
        h2: "Co jsou národní zdravotní programy",
        blocks: [
          lead("Jsou to mechanismy, jimiž stát financuje léčbu závažných onemocnění nad rámec běžného balíku služeb."),
          p("<strong>CNAS</strong> vede <em>kurativní</em> národní zdravotní programy — tedy vlastní léčbu pacientů — zatímco <strong>ministerstvo zdravotnictví</strong> vede programy veřejného zdraví zaměřené na prevenci, screening a profylaxi. Seznam programů zveřejňuje a aktualizuje každá instituce sama, takže vodítkem zůstává oficiální stránka, ne článek."),
          ul([
            "Národní program <strong>kardiovaskulárních onemocnění</strong>.",
            "Národní program <strong>diabetu</strong>.",
            "Národní program <strong>onkologie</strong>.",
            "Národní program <strong>endokrinních onemocnění</strong>.",
            "Národní program <strong>ortopedie</strong>.",
            "Národní program léčby <strong>vzácných onemocnění</strong>.",
            "Národní program <strong>transplantací</strong> orgánů, tkání a buněk.",
          ]),
          p("Každý program má vlastní <strong>kritéria způsobilosti</strong>, vlastní terapeutické protokoly a vlastní seznam zařízení, která jej realizují. To, že máte diagnózu, ještě neznamená, že kritéria programu splňujete: ta jsou definována klinicky, prováděcími předpisy."),
          cite(`Oficiální seznamy: <a href="${CNAS_PNS}" rel="nofollow noopener" target="_blank">CNAS — kurativní programy</a> · <a href="${MS_PNS}" rel="nofollow noopener" target="_blank">Ministerstvo zdravotnictví — národní programy</a>.`),
        ],
      },
      {
        id: "cum-intri",
        nav: "Jak se zařadit",
        eyebrow: "Cesta",
        h2: "Jak zařazení do programu probíhá",
        blocks: [
          lead("Cesta je vždy nejprve klinická a teprve potom administrativní, nikdy naopak."),
          ul([
            "<strong>Vyšetření u specialisty</strong> s vyšetřeními, která vyžaduje protokol daného onemocnění.",
            "<strong>Jistá diagnóza</strong>, doložená — ne podezření, ale diagnóza podepřená výsledky.",
            "<strong>Ověření kritérií způsobilosti</strong> programu ošetřujícím lékařem.",
            "<strong>Dokumenty</strong> potvrzující zařazení, na jejichž základě se léčba vydává.",
            "<strong>Pravidelné přehodnocení</strong>: setrvání v programu závisí na trvání kritérií a na sledování.",
          ]),
          p("Tento proces vede ošetřující lékař zařízení, které program realizuje. Praktický lékař má zásadní, ale odlišnou roli: sleduje vás mezi kontrolami, pokračuje v preskripci tam, kde mu to zákon na základě lékařské zprávy umožňuje, a jako první si všimne známek zhoršení."),
          warn("Jedna věc, kterou objednání nevyřeší", "Odchod do důchodu ze zdravotních důvodů je zcela samostatné řízení, o němž rozhoduje důchodový systém na základě posouzení pracovní schopnosti. Nezískává se zařazením do národního zdravotního programu a nezávisí na vašem ošetřujícím lékaři. Pokud je toto cílem, informujte se přímo u důchodové správy — částky a podmínky se mění a do lékařského článku nepatří."),
        ],
      },
      {
        id: "medicamente",
        nav: "Léky",
        eyebrow: "Jiný mechanismus",
        h2: "Léky s úhradou nejsou totéž",
        blocks: [
          lead("Záměna „národního programu“ za „léky s úhradou“ posílá lidi každý týden k nesprávné přepážce."),
          p("Jde o dva odlišné mechanismy. <strong>Národní programy</strong> financují léčbu závažných onemocnění, zpravidla prostřednictvím zařízení, která program realizují. Vedle nich existuje <strong>seznam nemocí, u nichž pojištěnci dostávají v ambulantní péči léky s úhradou nebo zdarma</strong>, vydávané na recept praktického lékaře nebo specialisty za podmínek stanovených předpisy."),
          ul([
            "Nedovozujte z diagnózy, který mechanismus se na vás vztahuje — <strong>zeptejte se ošetřujícího lékaře</strong>, ten zná protokol onemocnění.",
            "Seznamy a výše úhrad stanovují právní předpisy a <strong>mění se</strong>.",
            "Recept s úhradou vydávají lékaři ve <strong>smluvním vztahu</strong> se zdravotní pojišťovnou.",
          ]),
          cite(`Platné seznamy a podmínky: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "monitorizare",
        nav: "Sledování",
        eyebrow: "Mezi kontrolami",
        h2: "Co se děje mezi kontrolami",
        blocks: [
          lead("Právě tady se chronická nemoc vyhrává, nebo prohrává — a právě tady je systém nejtenčí."),
          p("Kontrola u specialisty bývá zřídka. Nemoc se naopak vyvíjí každý den. Rozdíl mezi pacientem, který dojde ke komplikacím, a tím, který nedojde, spočívá téměř vždy v tom, co se stalo v měsících mezi termíny: zda se léčba užívala, zda se hodnoty měřily a zapisovaly, zda byl nový příznak včas ohlášen, nebo přehlédnut."),
          ul([
            "<strong>Měřte a zapisujte</strong>, co vaše onemocnění vyžaduje — tlak, glykemii, hmotnost, pulz, příznaky.",
            "<strong>Přineste data</strong> na kontrolu, ne jen celkový dojem. Sešit nebo aplikace mají cenu jedné konzultace.",
            "<strong>Hlaste nežádoucí účinky</strong> místo toho, abyste léčbu sami přerušili — tiché vysazení je nejčastější příčinou dekompenzace.",
            "<strong>Očkování</strong> doporučená u chronických nemocí proberte s ošetřujícím lékařem.",
            "<strong>Životní styl</strong> — spánek, pohyb, strava, kouření, alkohol — mění vývoj víc, než si většina pacientů představuje.",
          ]),
        ],
      },
      {
        id: "online",
        nav: "Online konzultace",
        eyebrow: "Otevřeně",
        h2: "Co online konzultace zvládne a co ne",
        blocks: [
          lead("Říkáme to přímo, protože to ušetří zbytečnou cestu."),
          p("Soukromý poskytovatel <strong>nezařazuje pacienty do národních zdravotních programů</strong> a <strong>nevystavuje hrazené dokumenty</strong> z pojistného fondu — ani recept s úhradou, ani žádanku. Ty patří lékařům ve smluvním vztahu se zdravotní pojišťovnou."),
          p("Online konzultace naopak pokryje přesně tu část, která v péči o chronické nemoci nejčastěji chybí:"),
          ul([
            "<strong>Pravidelné sledování</strong> mezi kontrolami u specialisty s hodnotami, které měříte doma.",
            "<strong>Vysvětlení výsledků</strong> a léčby — proč který lék, co sledovat, co hlásit.",
            "<strong>Posouzení nového příznaku</strong>, aniž byste čekali na další termín.",
            "<strong>Druhý názor</strong> před důležitým rozhodnutím.",
            "<strong>Příprava spisu</strong>: které dokumenty chybí a od koho je získat.",
            "<strong>Podpora při změnách životního stylu</strong>, sledovaných v čase, ne probraných jednou provždy.",
          ]),
          p(`Registraci kteréhokoli lékaře si můžete ověřit u <a href="${CMR}" rel="nofollow noopener" target="_blank">Rumunské lékařské komory</a> — u nás stejně jako kdekoli jinde.`),
        ],
      },
      {
        id: "alarma",
        nav: "Varovné příznaky",
        eyebrow: "Bezpečnost",
        h2: "Kdy nečekat na další termín",
        blocks: [
          lead("Dobře kontrolovaná chronická nemoc se může během hodin zvrhnout v akutní stav."),
          ul([
            "Bolest nebo tlak na hrudi, zvláště s pocením, dušností nebo bolestí vystřelující do paže či čelisti.",
            "Náhlá slabost poloviny těla, pokleslý koutek, porucha řeči nebo náhlá prudká bolest hlavy.",
            "Dušnost v klidu nebo promodralé rty a obličej.",
            "Velmi vysoká či velmi nízká glykemie se zmateností, zvracením nebo spavostí.",
            "Rychlé otékání nohou s náhlým vzestupem hmotnosti u kardiaka.",
            "Horečka se zimnicí u imunosuprimovaného pacienta nebo pacienta na onkologické léčbě.",
          ]),
          p("V kterékoli z těchto situací volejte <strong>112</strong>. Dokumenty, programy a spisy se vyřeší potom — a vždycky se vyřeší."),
        ],
      },
    ],
    linksEyebrow: "Global Health Rumunsko",
    linksH2: "Kam dál",
    linksLead:
      "Naši lékaři v Rumunsku vás sledují mezi kontrolami u specialisty a jasně řeknou, co lze vyřešit soukromě a co zůstává v okruhu zdravotní pojišťovny.",
    links: [
      { label: "Online péče o chronické nemoci", href: href("cs", "/services/boli-cronice-online") },
      { label: "Naši lékaři v Rumunsku", href: href("cs", "/doctors") },
      { label: "Kontakt na Global Health Rumunsko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Máte chronickou nemoc a k lékaři se dostanete zřídka?",
      text: "Kontrolní konzultace projde hodnoty, které měříte doma, dodržování léčby i nové příznaky — a připraví vás na další kontrolu u specialisty.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/boli-cronice-online") },
      secondary: { label: "Zobrazit naše lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Kde si pravidla ověříte",
    sourcesLead:
      "Seznamy programů, kritéria způsobilosti i podmínky úhrady stanovují předpisy a mění se. Vždy ověřujte u zdroje.",
    sources: [
      { label: "CNAS — kurativní národní programy", href: CNAS_PNS },
      { label: "Národní zdravotní pojišťovna (CNAS)", href: CNAS },
      { label: "Ministerstvo zdravotnictví — národní programy", href: MS_PNS },
      { label: "Rumunské ministerstvo zdravotnictví", href: MS },
      { label: "Rumunská lékařská komora", href: CMR },
    ],
    sourcesNote:
      "Odkazy vedou na weby příslušných institucí. Global Health je soukromý poskytovatel, nezařazuje pacienty do národních zdravotních programů a nevystavuje dokumenty hrazené z fondu veřejného zdravotního pojištění.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Které nemoci jsou zahrnuty do národních zdravotních programů?",
        a: "CNAS vede kurativní programy pro závažná onemocnění — mimo jiné kardiovaskulární onemocnění, diabetes, onkologii, endokrinní onemocnění, ortopedii, vzácná onemocnění a transplantace — a ministerstvo zdravotnictví vede programy veřejného zdraví. Seznam se aktualizuje předpisy, vodítkem je proto oficiální stránka CNAS, ne článek.",
      },
      {
        q: "Jak se dostanu do národního zdravotního programu?",
        a: "Vyšetřením u specialisty s vyšetřeními podle protokolu, doloženou jistou diagnózou a ověřením kritérií způsobilosti ošetřujícím lékařem zařízení, které program realizuje. Setrvání v programu závisí na pravidelném přehodnocení.",
      },
      {
        q: "Jaký je rozdíl mezi národním programem a léky s úhradou?",
        a: "Jsou to odlišné mechanismy. Národní programy financují léčbu závažných onemocnění, zpravidla přes zařízení, která program realizují. Vedle toho existuje seznam nemocí, u nichž pojištěnci dostávají v ambulantní péči léky s úhradou nebo zdarma, na recept vydaný za podmínek stanovených předpisy.",
      },
      {
        q: "Co znamená chronická nemoc?",
        a: "Dlouhodobé onemocnění, které se v čase udržuje pod kontrolou a zřídka se vyléčí: cukrovka, hypertenze, astma a CHOPN, endokrinní a neurologická onemocnění, chronické onemocnění ledvin, nádorová onemocnění a další. O vývoji nerozhoduje okamžik diagnózy, ale sledování mezi kontrolami.",
      },
      {
        q: "Zakládají chronické nemoci nárok na invalidní důchod?",
        a: "Jde o samostatné řízení, o němž rozhoduje důchodový systém na základě posouzení pracovní schopnosti, ne zařazení do národního zdravotního programu ani ošetřující lékař. Podmínky se mění, informace proto žádejte přímo u důchodové správy.",
      },
      {
        q: "Mohu být kvůli chronické nemoci sledován online?",
        a: "Ano — pro sledování, vysvětlení léčby, posouzení nového příznaku, druhý názor a přípravu spisu. Zařazení do programů a hrazené dokumenty, tedy recept s úhradou a žádanka, zůstávají lékařům ve smluvním vztahu se zdravotní pojišťovnou.",
      },
    ],
    disclaimerTitle: "Lékařské upozornění",
    disclaimer:
      "Článek napsal Dr Robert Gabriel Brindus, praktický lékař a lékařský ředitel Global Health Rumunsko, klinicky revidovala Dr Andreea Lorena Bica, lékařka specialistka na neurologii. Obsahuje obecné informace o chronických nemocech a o národních zdravotních programech a nepředstavuje individuální lékařskou radu. Zařazení do programu, kritéria způsobilosti i úhradu léků stanovují předpisy a rozhoduje o nich zdravotní pojišťovna. Global Health je soukromý poskytovatel. V případě naléhavého ohrožení zdraví volejte ihned 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "chronische-krankheiten-nationale-programme-rumaenien",
  title: "Chronische Krankheiten und die nationalen Gesundheitsprogramme Rumäniens",
  excerpt:
    "Die kurativen nationalen Gesundheitsprogramme finanzieren die Behandlung schwerer chronischer Krankheiten — Diabetes, Onkologie, Herz-Kreislauf- und Hormonerkrankungen, seltene Erkrankungen. Wie die Aufnahme abläuft, welche Dokumente dazugehören und was sich online begleiten lässt.",
  seoTitle: "Chronische Krankheiten und nationale Programme",
  seoDescription:
    "Krankheiten in Rumäniens nationalen Gesundheitsprogrammen: was sie abdecken, wie die Aufnahme abläuft und wie sich chronische Krankheit begleiten lässt.",
  category: "Chronische Krankheiten",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Chronische Krankheiten",
    categoryHref: href("de", "/blog"),
    eyebrow: "Rumänien · Patientenratgeber",
    h1: "Chronische Krankheiten und die nationalen Gesundheitsprogramme",
    deck: "Die Diagnose ist nur der Anfang. Darüber, wie Sie die kommenden Jahre leben, entscheidet die Verlaufskontrolle — und der Weg, der Sie zur Behandlung bringt.",
    intro:
      "Eine <strong>chronische Krankheit</strong> ist ein langdauerndes Leiden, das über die Zeit kontrolliert und nur selten geheilt wird: Diabetes, Bluthochdruck, Herz-Kreislauf-Erkrankungen, Asthma und COPD, Hormonerkrankungen, rheumatische Erkrankungen, neurologische Erkrankungen, chronische Nierenerkrankung, Krebs. Für einen Teil davon — die schweren und kostenintensiven — betreibt Rumänien <strong>nationale Gesundheitsprogramme</strong> über die CNAS und das Gesundheitsministerium, in deren Rahmen die Behandlung öffentlich finanziert wird. Die Aufnahme beantragt man nicht am Schalter: Sie beginnt mit einer <strong>fachärztlich gestellten Diagnose</strong>, und die Fachärztin oder der Facharzt prüft, ob Sie die Zugangskriterien des jeweiligen Programms erfüllen.",
    facts: [
      "Programme von CNAS und Ministerium",
      "Die Aufnahme beginnt beim Facharzt",
      "Die Kriterien regeln Vorschriften",
    ],
    primaryCta: { label: "Betreuung chronischer Krankheiten", href: href("de", "/services/boli-cronice-online") },
    secondaryCta: { label: "Nationale Programme — CNAS", href: CNAS_PNS },
    panelChip: "Was dieser Ratgeber abdeckt",
    panelParas: [
      "Was die kurativen nationalen Gesundheitsprogramme sind und welche Erkrankungen sie abdecken.",
      "Wie die Aufnahme in ein Programm abläuft und welche Dokumente dabei auftauchen.",
      "Was sich zwischen den Facharztterminen online begleiten lässt und was nicht.",
      "Zugangskriterien, Krankheitslisten und Begünstigtengruppen regeln Vorschriften, die überarbeitet werden. Geschlossene Listen und Beträge nennen wir hier nicht: Jeder Punkt verweist auf die CNAS oder das Gesundheitsministerium.",
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
        id: "ce-inseamna",
        nav: "Was es bedeutet",
        eyebrow: "Ausgangspunkt",
        h2: "Was eine chronische Krankheit praktisch bedeutet",
        blocks: [
          lead("Die Lehrbuchdefinition sagt «langdauernd». Die nützliche Definition sagt: Sie wird nicht mit einem Rezept gelöst, sondern mit einer Beziehung."),
          p("Eine chronische Krankheit verhält sich anders als eine Infektion. Sie hat kein Ende, sie hat einen Verlauf. Das Ergebnis in zehn Jahren hängt weit weniger vom Zeitpunkt der Diagnose ab als davon, was zwischen den Kontrollen geschieht: ob die Behandlung wirklich eingenommen wird, ob Werte verfolgt werden, ob Komplikationen auftreten und wie rasch sie erkannt werden."),
          ul([
            "<strong>Herz-Kreislauf-Erkrankungen</strong> — Bluthochdruck, koronare Herzkrankheit, Herzschwäche.",
            "<strong>Stoffwechsel- und Hormonerkrankungen</strong> — Diabetes, Schilddrüsenerkrankungen, weitere endokrine Leiden.",
            "<strong>Atemwegserkrankungen</strong> — Asthma, COPD.",
            "<strong>Neurologische Erkrankungen</strong> — Epilepsie, Multiple Sklerose, Parkinson-Krankheit.",
            "<strong>Krebserkrankungen</strong>, chronische Nierenerkrankung, rheumatische und seltene Erkrankungen.",
          ]),
          p("Die meisten haben einen gemeinsamen Nenner: lange Phasen, in denen es einem gut geht. Dort gehen Patientinnen und Patienten verloren — nicht bei der Diagnose, sondern in den Monaten, in denen nichts wehtut und die Behandlung überflüssig erscheint."),
        ],
      },
      {
        id: "programe",
        nav: "Die Programme",
        eyebrow: "Der Rahmen",
        h2: "Was die nationalen Gesundheitsprogramme sind",
        blocks: [
          lead("Es sind die Mechanismen, mit denen der Staat die Behandlung schwerer Erkrankungen über den üblichen Leistungskatalog hinaus finanziert."),
          p("Die <strong>CNAS</strong> betreibt die <em>kurativen</em> nationalen Gesundheitsprogramme — die eigentliche Behandlung der Kranken — während das <strong>Gesundheitsministerium</strong> Programme der öffentlichen Gesundheit mit Schwerpunkt auf Vorbeugung, Früherkennung und Prophylaxe betreibt. Beide Häuser veröffentlichen und aktualisieren ihre Liste selbst; maßgeblich bleibt daher die offizielle Seite und nicht ein Artikel."),
          ul([
            "Nationales Programm für <strong>Herz-Kreislauf-Erkrankungen</strong>.",
            "Nationales Programm für <strong>Diabetes</strong>.",
            "Nationales Programm für <strong>Onkologie</strong>.",
            "Nationales Programm für <strong>Hormonerkrankungen</strong>.",
            "Nationales Programm für <strong>Orthopädie</strong>.",
            "Nationales Behandlungsprogramm für <strong>seltene Erkrankungen</strong>.",
            "Nationales Programm für <strong>Transplantationen</strong> von Organen, Geweben und Zellen.",
          ]),
          p("Jedes Programm hat eigene <strong>Zugangskriterien</strong>, eigene Therapieprotokolle und eine eigene Liste der Einrichtungen, die es durchführen. Die Diagnose zu haben heißt nicht automatisch, die Kriterien zu erfüllen: Sie sind klinisch definiert, durch Vorschriften."),
          cite(`Offizielle Listen: <a href="${CNAS_PNS}" rel="nofollow noopener" target="_blank">CNAS — kurative Programme</a> · <a href="${MS_PNS}" rel="nofollow noopener" target="_blank">Gesundheitsministerium — nationale Programme</a>.`),
        ],
      },
      {
        id: "cum-intri",
        nav: "Aufnahme",
        eyebrow: "Der Weg",
        h2: "Wie die Aufnahme in ein Programm abläuft",
        blocks: [
          lead("Der Weg ist immer zuerst klinisch und erst danach administrativ, nie umgekehrt."),
          ul([
            "<strong>Fachärztliche Beurteilung</strong> mit den Untersuchungen, die das Protokoll der Erkrankung verlangt.",
            "<strong>Gesicherte Diagnose</strong>, dokumentiert — kein Verdacht, sondern eine durch Befunde gestützte Diagnose.",
            "<strong>Prüfung der Zugangskriterien</strong> des Programms durch die behandelnde Ärztin oder den behandelnden Arzt.",
            "<strong>Die Dokumente</strong>, die die Aufnahme belegen und auf deren Grundlage die Behandlung abgegeben wird.",
            "<strong>Regelmäßige Neubeurteilung</strong>: Der Verbleib im Programm hängt vom Fortbestehen der Kriterien und von der Verlaufskontrolle ab.",
          ]),
          p("Diesen Prozess führt die behandelnde Ärztin oder der behandelnde Arzt der Einrichtung, die das Programm durchführt. Die Hausarztpraxis hat eine wesentliche, aber andere Rolle: Sie begleitet Sie zwischen den Kontrollen, führt die Verordnung fort, wo das Gesetz es auf Grundlage des Arztbriefs erlaubt, und bemerkt Verschlechterungen als Erste."),
          warn("Eines lässt sich mit einem Termin nicht klären", "Die Berentung aus gesundheitlichen Gründen ist ein völlig eigenes Verfahren, über das die Rentenversicherung auf Grundlage einer Begutachtung der Erwerbsfähigkeit entscheidet. Sie ergibt sich nicht aus der Aufnahme in ein nationales Gesundheitsprogramm und hängt nicht von Ihrer behandelnden Praxis ab. Ist das Ihr Ziel, holen Sie die Auskunft direkt bei der Rentenkasse ein — Beträge und Voraussetzungen ändern sich und gehören nicht in einen medizinischen Artikel."),
        ],
      },
      {
        id: "medicamente",
        nav: "Arzneimittel",
        eyebrow: "Ein anderer Mechanismus",
        h2: "Erstattungsfähige Arzneimittel sind etwas anderes",
        blocks: [
          lead("Die Verwechslung von «nationalem Programm» und «erstattungsfähigen Arzneimitteln» schickt jede Woche Menschen an den falschen Schalter."),
          p("Es sind zwei verschiedene Mechanismen. <strong>Nationale Programme</strong> finanzieren die Behandlung schwerer Erkrankungen, in der Regel über die Einrichtungen, die das Programm durchführen. Davon getrennt gibt es die <strong>Liste der Erkrankungen, für die Versicherte in der ambulanten Versorgung erstattungsfähige oder kostenfreie Arzneimittel erhalten</strong>, abgegeben auf Rezept der Hausarztpraxis oder der Fachärztin, unter den durch Vorschriften geregelten Bedingungen."),
          ul([
            "Schließen Sie nicht von der Diagnose auf den Mechanismus — <strong>fragen Sie Ihre behandelnde Praxis</strong>, sie kennt das Protokoll der Erkrankung.",
            "Listen und Erstattungssätze werden durch Rechtsakte festgelegt und <strong>ändern sich</strong>.",
            "Ein erstattungsfähiges Rezept stellen Ärztinnen und Ärzte mit <strong>Vertrag</strong> zur Krankenkasse aus.",
          ]),
          cite(`Geltende Listen und Bedingungen: <a href="${CNAS}" rel="nofollow noopener" target="_blank">CNAS</a>.`),
        ],
      },
      {
        id: "monitorizare",
        nav: "Verlaufskontrolle",
        eyebrow: "Zwischen den Terminen",
        h2: "Was zwischen den Kontrollen geschieht",
        blocks: [
          lead("Hier wird eine chronische Krankheit gewonnen oder verloren — und hier ist das System am dünnsten."),
          p("Facharzttermine sind selten. Die Krankheit dagegen bewegt sich täglich. Der Unterschied zwischen jemandem, der Komplikationen erreicht, und jemandem, der es nicht tut, liegt fast immer in den Monaten zwischen den Terminen: ob die Behandlung eingenommen wurde, ob Werte gemessen und notiert wurden, ob ein neues Symptom rechtzeitig gemeldet oder übergangen wurde."),
          ul([
            "<strong>Messen und notieren</strong> Sie, was Ihre Erkrankung verlangt — Blutdruck, Blutzucker, Gewicht, Puls, Beschwerden.",
            "<strong>Bringen Sie die Daten</strong> zur Kontrolle mit, nicht nur den Gesamteindruck. Ein Heft oder eine App ist so viel wert wie eine Sprechstunde.",
            "<strong>Melden Sie Nebenwirkungen</strong>, statt die Behandlung eigenmächtig abzubrechen — das stille Absetzen ist die häufigste Ursache einer Entgleisung.",
            "<strong>Impfungen</strong>, die bei chronischen Krankheiten empfohlen sind, besprechen Sie mit Ihrer behandelnden Praxis.",
            "<strong>Der Lebensstil</strong> — Schlaf, Bewegung, Ernährung, Rauchen, Alkohol — verändert den Verlauf stärker, als die meisten annehmen.",
          ]),
        ],
      },
      {
        id: "online",
        nav: "Online-Sprechstunde",
        eyebrow: "Transparenz",
        h2: "Was eine Online-Sprechstunde kann und was nicht",
        blocks: [
          lead("Wir sagen es direkt, weil es einen unnötigen Weg erspart."),
          p("Ein privater Anbieter <strong>nimmt keine Patienten in die nationalen Gesundheitsprogramme auf</strong> und <strong>stellt keine aus dem Versicherungsfonds erstatteten Dokumente aus</strong> — weder erstattungsfähiges Rezept noch Überweisung. Diese gehören zu Ärztinnen und Ärzten mit Kassenvertrag."),
          p("Abdecken lässt sich dagegen genau der Teil, der in der Versorgung chronisch Kranker am häufigsten fehlt:"),
          ul([
            "<strong>Regelmäßige Verlaufskontrolle</strong> zwischen den Facharztterminen mit den Werten, die Sie zu Hause messen.",
            "<strong>Erklärung von Befunden und Behandlung</strong> — warum welches Medikament, worauf zu achten ist, was zu melden ist.",
            "<strong>Beurteilung eines neuen Symptoms</strong>, ohne den nächsten Termin abzuwarten.",
            "<strong>Zweitmeinung</strong> vor einer wichtigen Entscheidung.",
            "<strong>Vorbereitung der Unterlagen</strong>: welche Dokumente fehlen und wo sie zu bekommen sind.",
            "<strong>Begleitung bei Lebensstiländerungen</strong>, über die Zeit verfolgt und nicht einmalig besprochen.",
          ]),
          p(`Die Registrierung jeder Ärztin und jedes Arztes können Sie bei der <a href="${CMR}" rel="nofollow noopener" target="_blank">Rumänischen Ärztekammer</a> prüfen — bei uns wie überall sonst.`),
        ],
      },
      {
        id: "alarma",
        nav: "Warnzeichen",
        eyebrow: "Sicherheit",
        h2: "Wann Sie nicht auf den nächsten Termin warten",
        blocks: [
          lead("Eine gut eingestellte chronische Krankheit kann innerhalb von Stunden akut werden."),
          ul([
            "Schmerz oder Druck in der Brust, besonders mit Schwitzen, Luftnot oder Ausstrahlung in Arm oder Kiefer.",
            "Plötzliche Schwäche einer Körperhälfte, hängender Mundwinkel, Sprachstörung oder plötzlicher heftiger Kopfschmerz.",
            "Luftnot in Ruhe oder blaue Lippen und Gesichtsfarbe.",
            "Sehr hoher oder sehr niedriger Blutzucker mit Verwirrtheit, Erbrechen oder Schläfrigkeit.",
            "Rasche Schwellung der Beine mit plötzlicher Gewichtszunahme bei Herzkranken.",
            "Fieber mit Schüttelfrost bei Immunsuppression oder unter Krebstherapie.",
          ]),
          p("Rufen Sie in jeder dieser Situationen <strong>112</strong>. Dokumente, Programme und Akten regeln sich danach — und sie regeln sich immer."),
        ],
      },
    ],
    linksEyebrow: "Global Health Rumänien",
    linksH2: "Nächste Schritte",
    linksLead:
      "Unsere Ärztinnen und Ärzte in Rumänien begleiten Sie zwischen den Facharztterminen und sagen klar, was privat zu klären ist und was im Kassenweg bleibt.",
    links: [
      { label: "Chronische Krankheiten online betreuen", href: href("de", "/services/boli-cronice-online") },
      { label: "Unsere Ärzte in Rumänien", href: href("de", "/doctors") },
      { label: "Global Health Rumänien kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Chronisch krank und selten beim Arzt?",
      text: "Eine Verlaufssprechstunde prüft die Werte, die Sie zu Hause messen, die Einnahme der Behandlung und neue Beschwerden — und bereitet Sie auf den nächsten Facharzttermin vor.",
      primary: { label: "Termin buchen", href: href("de", "/services/boli-cronice-online") },
      secondary: { label: "Unsere Ärzte ansehen", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Wo Sie die Regeln prüfen",
    sourcesLead:
      "Programmlisten, Zugangskriterien und Erstattungsbedingungen werden durch Vorschriften geregelt und ändern sich. Prüfen Sie stets an der Quelle.",
    sources: [
      { label: "CNAS — kurative nationale Programme", href: CNAS_PNS },
      { label: "Nationale Krankenversicherungskasse (CNAS)", href: CNAS },
      { label: "Gesundheitsministerium — nationale Programme", href: MS_PNS },
      { label: "Rumänisches Gesundheitsministerium", href: MS },
      { label: "Rumänische Ärztekammer", href: CMR },
    ],
    sourcesNote:
      "Die Links öffnen die Websites der zuständigen Stellen. Global Health ist ein privater Anbieter, nimmt keine Patienten in die nationalen Gesundheitsprogramme auf und stellt keine aus dem Fonds der gesetzlichen Krankenversicherung erstatteten Dokumente aus.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Welche Krankheiten sind in den nationalen Gesundheitsprogrammen enthalten?",
        a: "Die CNAS betreibt kurative Programme für schwere Erkrankungen — darunter Herz-Kreislauf-Erkrankungen, Diabetes, Onkologie, Hormonerkrankungen, Orthopädie, seltene Erkrankungen und Transplantation — das Gesundheitsministerium betreibt Programme der öffentlichen Gesundheit. Die Liste wird durch Vorschriften aktualisiert; maßgeblich ist daher die offizielle CNAS-Seite, nicht ein Artikel.",
      },
      {
        q: "Wie werde ich in ein nationales Gesundheitsprogramm aufgenommen?",
        a: "Über die fachärztliche Beurteilung mit den vom Protokoll verlangten Untersuchungen, eine dokumentierte gesicherte Diagnose und die Prüfung der Zugangskriterien durch die behandelnde Praxis der durchführenden Einrichtung. Der Verbleib hängt von der regelmäßigen Neubeurteilung ab.",
      },
      {
        q: "Was ist der Unterschied zwischen nationalem Programm und erstattungsfähigen Arzneimitteln?",
        a: "Es sind unterschiedliche Mechanismen. Nationale Programme finanzieren die Behandlung schwerer Erkrankungen, in der Regel über die durchführenden Einrichtungen. Davon getrennt gibt es die Liste der Erkrankungen, für die Versicherte ambulant erstattungsfähige oder kostenfreie Arzneimittel erhalten, auf Rezept unter den durch Vorschriften geregelten Bedingungen.",
      },
      {
        q: "Was bedeutet chronische Krankheit?",
        a: "Ein langdauerndes Leiden, das über die Zeit kontrolliert und selten geheilt wird: Diabetes, Bluthochdruck, Asthma und COPD, Hormon- und neurologische Erkrankungen, chronische Nierenerkrankung, Krebs und andere. Über den Verlauf entscheidet nicht der Zeitpunkt der Diagnose, sondern die Kontrolle zwischen den Terminen.",
      },
      {
        q: "Begründen chronische Krankheiten einen Anspruch auf Erwerbsminderungsrente?",
        a: "Das ist ein eigenes Verfahren, über das die Rentenversicherung auf Grundlage einer Begutachtung der Erwerbsfähigkeit entscheidet — nicht die Aufnahme in ein nationales Gesundheitsprogramm und nicht die behandelnde Praxis. Die Voraussetzungen ändern sich, fragen Sie daher direkt bei der Rentenkasse nach.",
      },
      {
        q: "Kann ich bei einer chronischen Krankheit online betreut werden?",
        a: "Ja — für die Verlaufskontrolle, die Erklärung der Behandlung, die Beurteilung eines neuen Symptoms, eine Zweitmeinung und die Vorbereitung der Unterlagen. Die Aufnahme in Programme und erstattete Dokumente wie das erstattungsfähige Rezept und die Überweisung bleiben bei Ärzten mit Kassenvertrag.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von Dr Robert Gabriel Brindus, Facharzt für Allgemeinmedizin und Ärztlicher Direktor von Global Health Rumänien, klinisch geprüft von Dr Andreea Lorena Bica, Fachärztin für Neurologie. Der Beitrag enthält allgemeine Informationen zu chronischen Krankheiten und den nationalen Gesundheitsprogrammen und ist keine persönliche medizinische Beratung. Aufnahme in ein Programm, Zugangskriterien und Arzneimittelerstattung werden durch Vorschriften geregelt und von der Krankenkasse entschieden. Global Health ist ein privater Anbieter. Wählen Sie im medizinischen Notfall sofort 112.",
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
  posts: [ro, en, pt, es, cs, de],
};
