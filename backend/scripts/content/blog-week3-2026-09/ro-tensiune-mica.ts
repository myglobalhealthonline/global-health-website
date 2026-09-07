/**
 * Romania — Week 3 editorial article.
 *
 * Primary keyword: "tensiune mica" — 4,400/mo, KD 0, informational.
 * Secondary: "ce sa faci cand ai tensiune mica" — 2,900/mo, KD 0;
 *            "ce ridica tensiunea mica" — 2,900/mo, KD 0.
 * Myth queries corrected: "tensiune mica apa cu zahar" 1,000, "vitamine
 * pentru tensiune mica" 1,000, "ceaiuri pentru tensiune mica" 140.
 * OpenSEO research 2026-09-07 (location 2642, ro). SERP: private clinic
 * chains and pharmacy blogs; AI Overview present. Angle: the ESC syncope
 * guideline's actual counter-measures, in plain Romanian, with a firm
 * emergency list.
 *
 * Facts anchored to the ESC 2018 syncope guideline, ESC 2024 hypertension
 * guideline, NHS and NHLBI/MedlinePlus pages, the 2021 caffeine systematic
 * review and the Gov.ro 112 page, read 2026-09-07. Separate from the
 * existing high-blood-pressure posts.
 */
import { cite, lead, p, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const ESC_SYNCOPE = "https://academic.oup.com/eurheartj/article/39/21/1883/4939241";
const ESC_2024 = "https://academic.oup.com/eurheartj/article/45/38/3912/7741010";
const NHS_LOW_BP = "https://www.nhs.uk/conditions/low-blood-pressure-hypotension/";
const NHS_FAINT = "https://www.nhs.uk/conditions/fainting/";
const NHLBI = "https://www.nhlbi.nih.gov/health/low-blood-pressure";
const MEDLINE = "https://medlineplus.gov/ency/article/007278.htm";
const CAFFEINE_SR = "https://pubmed.ncbi.nlm.nih.gov/34143333/";
const GOV_112 = "https://serviciipublice.gov.ro/serviciu/serviciul-de-urgenta-112-asigurat-cetatenilor";

const base = "https://www.myglobalhealth.online/romania/ro";
const links = {
  blog: `${base}/blog`,
  doctors: `${base}/doctors`,
  contact: `${base}/contact`,
  service: `${base}/services/medic-online-romania`,
  analize: `${base}/services/trimiteri-si-investigatii`,
  valori: `${base}/blog/tensiune-arteriala-normala-varsta-adulti`,
};
const AUTHOR = { initials: "GH", name: "Global Health Medical Team", line: "Global Health" } as const;

const ro: LocalePost = {
  locale: "RO",
  slug: "tensiune-mica-cauze-ce-sa-faci-cand-mergi-la-medic",
  title: "Tensiune mică: de ce apare, ce faci pe loc și când nu mai aștepți",
  excerpt:
    "Sub 90/60 fără simptome nu e boală. Cu amețeli și leșin este. Cauzele frecvente, manevrele care chiar ridică tensiunea în câteva minute, ce nu ajută și lista scurtă pentru 112.",
  seoTitle: "Tensiune mică: cauze, ce să faci și când suni la 112",
  seoDescription:
    "Ce înseamnă tensiune mică, cauzele frecvente, manevrele recomandate de ghidul european când amețești, de ce apa cu zahăr nu ajută și când e urgență.",
  category: "Medicină generală",
  article: {
    lang: "ro-RO",
    tagline: "Medicină oricând, oriunde",
    categoryLabel: "Medicină generală",
    categoryHref: links.blog,
    eyebrow: "România · Ghid de hipotensiune",
    h1: "Tensiune mică: cauze, ce să faci pe loc și când mergi la medic",
    deck: "O tensiune de 9 cu 6 la cineva care se simte bine nu se tratează. Aceeași tensiune cu amețeli, vedere încețoșată sau leșin are cauze care se pot găsi.",
    intro:
      "<strong>Tensiunea mică</strong>, adică sub 90/60 mmHg, nu este o boală în sine. Dacă nu aveți simptome, ghidurile spun clar că nu are nevoie de tratament. Problema apare când tensiunea scade cu 20 mmHg sau mai mult la ridicarea în picioare și aduce amețeală, vedere neagră sau leșin. Atunci soluția pe loc este să vă așezați sau să vă întindeți cu picioarele ridicate, să beți apă și să încrucișați picioarele strângând mușchii. Apa cu zahăr, vitaminele și ceaiurile nu apar în niciun ghid. Leșinul cu durere în piept, respirație grea sau confuzie înseamnă 112.",
    facts: [
      "Sub 90/60 mmHg fără simptome: de obicei nu necesită tratament",
      "Scădere de 20/10 mmHg la ridicare, în 3 minute: hipotensiune ortostatică",
      "Pe loc: așezat sau întins, picioare ridicate, apă, mușchi încordați",
    ],
    primaryCta: { label: "Ghidul ESC pentru sincopă", href: ESC_SYNCOPE },
    secondaryCta: { label: "Valori normale ale tensiunii pe vârste", href: links.valori },
    panelChip: "Ordinea corectă",
    panelParas: [
      "Măsurați corect, șapte zile, înainte să vă declarați hipotensiv.",
      "Căutați cauza înainte de remediu: deshidratare, căldură, un medicament nou, o masă mare.",
      "Un leșin repetat se investighează, nu se tratează cu cafea.",
    ],
    author: AUTHOR,
    reviewLine: "Revizuit de echipa medicală Global Health.",
    navLabel: "În acest ghid",
    sections: [
      {
        id: "ce-inseamna",
        nav: "Ce înseamnă",
        eyebrow: "Definiții",
        h2: "Ce înseamnă tensiune mică și când contează",
        blocks: [
          lead("Sub același nume se ascund două situații diferite, iar doar una dintre ele are nevoie de tratament."),
          p("Prima este tensiunea constant scăzută, sub 90/60 mmHg, la cineva care se simte bine. NHS și NHLBI spun același lucru: fără simptome, de obicei nu se tratează. A doua este hipotensiunea ortostatică: ghidul european o definește ca o scădere a sistolicei cu cel puțin 20 mmHg sau a diastolicei cu 10 mmHg în primele 3 minute după ridicare. Aceasta dă amețeala de la ridicarea din pat și negrul în fața ochilor, iar aici merită căutată cauza."),
          cite("<a href=\"" + ESC_SYNCOPE + "\" rel=\"nofollow noopener\" target=\"_blank\">Ghidul ESC 2018 pentru sincopă</a>, <a href=\"" + NHS_LOW_BP + "\" rel=\"nofollow noopener\" target=\"_blank\">NHS — tensiune arterială mică</a>, <a href=\"" + NHLBI + "\" rel=\"nofollow noopener\" target=\"_blank\">NHLBI</a>. Consultate la 7 septembrie 2026."),
        ],
      },
      {
        id: "cauze",
        nav: "Cauze",
        eyebrow: "De unde vine",
        h2: "Cauzele frecvente ale tensiunii mici",
        blocks: [
          lead("Cele mai multe cauze sunt banale și reversibile. Câteva nu sunt, de aceea merită parcursă lista."),
          ul([
            "<strong>Lichide puține:</strong> deshidratare, căldură, diaree, vărsături. Cea mai frecventă cauză vara.",
            "<strong>Medicamente:</strong> diuretice, vasodilatatoare, unele antidepresive, medicamente pentru inimă și tensiune, unele calmante. Verificați ce ați început recent.",
            "<strong>După masă:</strong> hipotensiunea postprandială, mai ales la vârstnici și după mese mari.",
            "<strong>Stat mult în picioare, repaus prelungit la pat, alcool.</strong>",
            "<strong>Sarcina</strong>, în special în primele două trimestre.",
            "<strong>Inima:</strong> insuficiență cardiacă, aritmii, infarct.",
            "<strong>Sistemul nervos:</strong> diabetul cu afectare a nervilor, boala Parkinson.",
            "<strong>Boala Addison</strong> (insuficiența suprarenală), în care tensiunea scade mai ales la schimbarea poziției.",
            "<strong>Sângerare sau infecție severă:</strong> tensiune mică cu puls rapid, piele rece și transpirată. Urgență.",
          ]),
          cite("<a href=\"" + ESC_SYNCOPE + "\" rel=\"nofollow noopener\" target=\"_blank\">ESC 2018, tabelul cauzelor</a> și <a href=\"" + MEDLINE + "\" rel=\"nofollow noopener\" target=\"_blank\">MedlinePlus — hipotensiune</a>."),
        ],
      },
      {
        id: "pe-loc",
        nav: "Ce faci pe loc",
        eyebrow: "Ghidul european",
        h2: "Ce să faci când ai tensiune mică și amețești",
        blocks: [
          lead("Manevrele de mai jos sunt cele din ghidul ESC și din recomandările NHS. Funcționează în minute și nu costă nimic."),
          ul([
            "<strong>Așezați-vă sau întindeți-vă imediat</strong>, cu picioarele ridicate deasupra nivelului inimii. Dacă nu puteți, stați jos cu capul între genunchi.",
            "<strong>Manevre de contrapresiune:</strong> încrucișați picioarele și încordați coapsele și fesele, strângeți pumnii, ridicați-vă pe vârfuri. Ghidul le clasifică IIa, adică recomandate.",
            "<strong>Beți apă.</strong> Ghidul menționează ingestia rapidă de apă; hidratarea adecvată este în aceeași clasă de recomandare.",
            "<strong>Ridicați-vă încet</strong>, în etape: pe marginea patului, apoi în picioare, cu sprijin.",
          ]),
          p("Pe termen lung, la hipotensiune ortostatică confirmată, ghidul recomandă 2–3 litri de lichide pe zi, sare în plus doar la indicația medicului, ciorapi compresivi, dormitul cu capul patului ridicat și reducerea medicamentelor care scad tensiunea. Midodrina și fludrocortizonul există, dar sunt decizia unui specialist, cu rețetă."),
          cite("<a href=\"" + ESC_SYNCOPE + "\" rel=\"nofollow noopener\" target=\"_blank\">ESC 2018, secțiunea 5.3</a> și <a href=\"" + NHS_FAINT + "\" rel=\"nofollow noopener\" target=\"_blank\">NHS — leșin</a>."),
        ],
      },
      {
        id: "ce-nu-ajuta",
        nav: "Ce nu ajută",
        eyebrow: "Apă cu zahăr, vitamine, ceaiuri",
        h2: "Ce ridică tensiunea mică și ce doar pare că o ridică",
        blocks: [
          lead("Remediile pe care le caută cei mai mulți oameni nu apar în niciun ghid european. Nu sunt periculoase, dar nici nu fac ce se crede despre ele."),
          ul([
            "<strong>Apa cu zahăr:</strong> ghidurile recomandă apa; zahărul nu apare nicăieri. Apa simplă face același lucru.",
            "<strong>Cafeaua:</strong> o analiză sistematică din 2021 a găsit doar studii foarte mici, cu rezultate inconsecvente, și recomandă cafeina doar după epuizarea tratamentelor cu dovezi. Nu este tratament.",
            "<strong>Vitaminele:</strong> nicio vitamină nu apare în ghiduri ca tratament al tensiunii mici. Dacă hipotensiunea vine dintr-o anemie sau o boală endocrină, se tratează cauza, după analize.",
            "<strong>Ceaiurile, ciocolata, sarea în plus:</strong> fără dovezi. Ghidul ESC prevede creșterea aportului de sare doar ca măsură indicată de medic, la pacienți selectați.",
          ]),
          warn("Pentru ce suni la 112", "Leșin cu durere în piept, respirație grea, bătăi rapide sau neregulate ale inimii, confuzie, slăbiciune pe o parte a corpului sau vorbire încurcată. Leșin în timpul efortului sau întins în pat. Scaune negre, vărsături cu sânge, febră mare cu tensiune mică, piele rece și transpirată. Persoana nu își revine complet într-un minut. Apelul la 112 este gratuit, din orice rețea."),
          cite("<a href=\"" + CAFFEINE_SR + "\" rel=\"nofollow noopener\" target=\"_blank\">Clinical Autonomic Research 2021, cafeina în hipotensiunea ortostatică</a>; <a href=\"" + GOV_112 + "\" rel=\"nofollow noopener\" target=\"_blank\">Gov.ro — serviciul 112</a>."),
        ],
      },
      {
        id: "cand-la-medic",
        nav: "Când la medic",
        eyebrow: "Fără urgență, dar cu programare",
        h2: "Când mergi la medic pentru tensiune mică",
        blocks: [
          lead("Când amețelile se repetă, când ați leșinat o dată fără explicație, sau când tensiunea mică a apărut odată cu un medicament nou."),
          p("Un medic de familie sau un medic generalist poate face cele trei lucruri care contează: măsurarea tensiunii culcat și în picioare, revizuirea listei de medicamente și un set de analize de bază, hemoleucogramă, glicemie, funcție tiroidiană, electroliți, plus o electrocardiogramă. Într-o <a href=\"" + links.service + "\">consultație cu un medic online</a> la Global Health puteți parcurge istoricul și lista de medicamente și puteți primi <a href=\"" + links.analize + "\">trimiteri pentru analize</a>. Măsurarea ortostatică și EKG-ul rămân de făcut fizic."),
          p("Înainte, măsurați șapte zile, dimineața și seara, două citiri la un minut distanță, așezat, după cinci minute de repaus, cu tensiometru de braț validat. O singură valoare mică într-o zi caldă nu înseamnă nimic; o medie mică, însoțită de simptome, contează."),
          cite("Protocol de măsurare din <a href=\"" + ESC_2024 + "\" rel=\"nofollow noopener\" target=\"_blank\">ghidul ESC 2024</a>."),
        ],
      },
    ],
    linksEyebrow: "Global Health România",
    linksH2: "Următorul pas",
    linksLead: "Manevrele de moment le puteți face singur. Cauza o stabilește medicul.",
    links: [
      { label: "Consultație medic online", href: links.service },
      { label: "Trimiteri și investigații", href: links.analize },
      { label: "Tensiune arterială normală pe vârste", href: links.valori },
      { label: "Medici în România", href: links.doctors },
      { label: "Contactați Global Health", href: links.contact },
    ],
    ctaBox: {
      h3: "Amețeli repetate sau un leșin neexplicat?",
      text: "Un medic revizuiește simptomele și medicamentele și indică analizele potrivite. Nu înlocuiește 112 în urgență.",
      primary: { label: "Programează o consultație", href: links.service },
      secondary: { label: "Vezi medicii", href: links.doctors },
    },
    sourcesEyebrow: "Surse medicale",
    sourcesH2: "Sursele acestui ghid",
    sourcesLead: "Ghiduri europene și surse instituționale, consultate la 7 septembrie 2026.",
    sources: [
      { label: "ESC 2018 — Guidelines for the diagnosis and management of syncope", href: ESC_SYNCOPE },
      { label: "ESC 2024 — Guidelines for elevated blood pressure and hypertension", href: ESC_2024 },
      { label: "NHS — Low blood pressure (hypotension)", href: NHS_LOW_BP },
      { label: "NHS — Fainting", href: NHS_FAINT },
      { label: "NHLBI — Low blood pressure", href: NHLBI },
      { label: "MedlinePlus — Low blood pressure", href: MEDLINE },
      { label: "Clinical Autonomic Research 2021 — caffeine for orthostatic hypotension", href: CAFFEINE_SR },
      { label: "Gov.ro — Serviciul de urgență 112", href: GOV_112 },
    ],
    sourcesNote: "Valorile-prag sunt cele din ghiduri; medicul le interpretează în funcție de vârstă, sarcină și boli asociate.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări despre tensiunea mică",
    faqs: [
      { q: "Tensiune 9 cu 6 este periculoasă?", a: "Fără simptome, de obicei nu, și nu se tratează. Cu amețeli, leșin sau dacă a apărut odată cu un medicament nou, merită o consultație." },
      { q: "Ce să beau când am tensiunea mică?", a: "Apă, băută repede. Zahărul nu aduce nimic în plus. Pentru cafea, dovezile sunt foarte slabe." },
      { q: "Ce ridică tensiunea mică repede?", a: "Să vă așezați sau întindeți cu picioarele ridicate, să încrucișați picioarele și să încordați mușchii, și apa. Sunt manevrele din ghidul european. Medicamentele care cresc tensiunea sunt doar cu rețetă." },
      { q: "Când este tensiunea mică o urgență?", a: "Când vine cu leșin și durere în piept, respirație grea, confuzie, sângerare, febră mare sau piele rece și umedă. Sunați la 112." },
    ],
    disclaimerTitle: "Aviz medical și de urgență",
    disclaimer:
      "Informații generale valabile în septembrie 2026; nu înlocuiesc consultul medical și nu constituie indicație de tratament. În urgență sunați la 112.",
  } satisfies Article,
};

export const RO_TENSIUNE_MICA: PostSet = {
  key: "ro-tensiune-mica",
  countryCode: "ro",
  targetKeyword: "tensiune mica",
  searchVolume: 4400,
  keywordDifficulty: 0,
  evidence:
    "OpenSEO 2026-09-07 (2642/ro): 'tensiune mica' 4,400/KD0; 'ce sa faci cand ai tensiune mica' 2,900/KD0; 'ce ridica tensiunea mica' 2,900/KD0; 'tensiune mica 9 cu 6' 1,600/KD0. Myth cluster corrected: 'tensiune mica apa cu zahar' 1,000, 'vitamine pentru tensiune mica' 1,000. Listed as Romania topic 4 in the 2026-08-19 research; no existing post covers low blood pressure in any market.",
  serviceSlug: "medic-online-romania",
  authorDoctorId: "cmrc4axni00rn01p2n3r2bopf",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmrc4j7oc00se01p2gf7y9ldw",
  reviewerDisplayName: "Dr Andreea Lorena Bica",
  posts: [ro],
};
