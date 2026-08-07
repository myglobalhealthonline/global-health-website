/**
 * Czechia — article 2 of 2.
 *
 * Target keyword: "lékař online 24 7" — 170/mo, KD 0, plus the punctuated
 * variant "lékař online 24/7" 170/mo, KD 1 (OpenSEO / DataForSEO, location
 * 2203, language cs, expansion run 2026-08-04). Both resolve to the same
 * intent, so the effective target is ~340/mo at KD 0-1.
 *
 * This replaced the original pick "praktický lékař online" (KD 5 but no
 * volume figure returned) once the cs/2203 expansion surfaced a variant with
 * real volume at the same difficulty. Head term "online lékař" is 880/mo but
 * KD 28 — above the ceiling for a domain with 57 referring domains, so it is
 * deliberately not the target; it is the term this article grows into.
 *
 * Why it can rank: SERP page 1 is provider homepages and directories
 * (praktickylekar.online, mojeambulance.cz, euc.cz, znamylekar.cz,
 * navstevalekare.cz, zpmvcr.cz) — all selling access, none setting
 * expectations about what remote care can and cannot do at 2am. Search
 * Console already shows the cluster at position 13.4 on
 * /czechia/cs/gp-consultation-online ("praktický lékař online" 20 impr,
 * "praktik online" 13, "prakticky lekar online" 10).
 *
 * Honesty constraint carried through the whole piece: an online consultation
 * does not replace registration with a praktický lékař, and we say so
 * explicitly rather than implying it does.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const NZIP = "https://www.nzip.cz/";
const CLK_REGISTER = "https://www.lkcr.cz/seznam-lekaru";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/czechia/${lang}${path}`;

const cs: LocalePost = {
  locale: "CS",
  slug: "lekar-online-24-7-co-vyresi",
  title: "Lékař online 24/7: co konzultace na dálku vyřeší a co ne",
  excerpt:
    "Online lékař je dostupný rychle, ale ne na všechno. Přehled toho, co lze bezpečně vyřešit videokonzultací, co patří do ordinace, kdy volat 155 a proč online konzultace nenahrazuje registraci u praktického lékaře.",
  seoTitle: "Lékař online 24/7: co vyřeší a co ne (2026)",
  seoDescription:
    "Co lze bezpečně vyřešit online konzultací s lékařem, co vyžaduje vyšetření v ordinaci, kdy volat 155 a proč online lékař nenahrazuje registraci u praktika.",
  category: "Praktické lékařství",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Praktické lékařství",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Česko · Průvodce telemedicínou",
    h1: "Lékař online 24/7",
    deck: "Dostupnost je jen polovina odpovědi. Ta druhá je, které potíže lze na dálku bezpečně posoudit — a které rozhodně ne.",
    intro:
      "Online lékař je lékař, se kterým mluvíte přes video nebo telefon místo v ordinaci. Vyřeší dobře <strong>akutní běžné potíže</strong>, u kterých rozhoduje popis obtíží a anamnéza — respirační infekty, střevní potíže, kožní projevy, které lze ukázat, migréna, úzkostné stavy, opakovaná recept na dlouhodobou léčbu. Nevyřeší to, co vyžaduje <strong>ruce lékaře</strong> — poklep, vyšetření per rectum, pohmat břicha lékařem — a bez přístroje ani poslech plic a srdce. Zobrazení a laboratorní vyšetření umíme indikovat, s domácí zdravotní sadou zvládneme i měření. A nenahrazuje registraci u praktického lékaře, ke které patří preventivní prohlídky s fyzikálním vyšetřením.",
    facts: ["Rychlá dostupnost", "Vhodné pro běžné akutní potíže", "Nenahrazuje registraci u praktika"],
    primaryCta: { label: "Objednat videokonzultaci", href: href("cs", "/services/lekar-online-praha") },
    secondaryCta: { label: "Naši čeští lékaři", href: href("cs", "/doctors") },
    panelChip: "Co v článku najdete",
    panelParas: [
      "Konkrétní seznam potíží, které lze na dálku posoudit, a stejně konkrétní seznam těch, které ne.",
      "Jak videokonzultace probíhá a co si připravit, aby měla smysl.",
      "Proč online konzultace nenahrazuje praktického lékaře, u kterého jste registrováni — a v čem se doplňují.",
    ],
    author: { initials: "RP", name: "MUDr. Romana Pavlů", line: "Praktická lékařka pro dospělé · Global Health Česko" },
    reviewLine: "Odborně zkontroloval MUDr. Vojtěch Černý, praktický lékař, Global Health Česko.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "co-to-je",
        nav: "Co to znamená",
        eyebrow: "Vymezení",
        h2: "Co znamená „lékař online 24/7“",
        blocks: [
          lead("Znamená to dostupnost konzultace, ne dostupnost celé medicíny."),
          p("Lékař v online konzultaci má stejné vzdělání, stejnou odpovědnost a stejné profesní povinnosti jako lékař v ordinaci. Liší se jediné — nemá vás před sebou. To je zásadní rozdíl u všeho, co se pozná rukama a fonendoskopem, a téměř žádný rozdíl u toho, co se pozná z rozhovoru a z pohledu."),
          p("Dobře vedená telemedicína proto nezní jako „vyřešíme cokoli“. Zní jako „tohle vyřešíme hned, tohle potřebuje ordinaci a tohle je důvod jet na urgentní příjem“. Právě to třetí je největší přínos rychlé dostupnosti: někdo vám včas řekne, že čekat nemáte."),
          warn("Rychlost není totéž co urgentní péče", "Online konzultace není náhradou zdravotnické záchranné služby. Při stavech ohrožujících život volejte okamžitě 155 nebo 112, ne objednávkový formulář."),
        ],
      },
      {
        id: "co-vyresi",
        nav: "Co vyřeší",
        eyebrow: "Vhodné případy",
        h2: "Co lze na dálku bezpečně posoudit",
        blocks: [
          lead("Situace, kde rozhoduje anamnéza, popis potíží a případně to, co lze ukázat kameře."),
          ul([
            "<strong>Akutní respirační infekty</strong> bez dušnosti — rýma, kašel, bolest v krku, teploty s typickým průběhem.",
            "<strong>Střevní potíže</strong> bez známek dehydratace a bez krve ve stolici.",
            "<strong>Kožní projevy</strong>, které lze v dobrém světle ukázat — vyrážky, opary, akné, podezřelé změny k triáži.",
            "<strong>Migréna a známé bolesti hlavy</strong> u pacienta s již stanovenou diagnózou.",
            "<strong>Úzkostné a depresivní obtíže</strong> — první posouzení a rozhodnutí o dalším postupu.",
            "<strong>Pokračování zavedené léčby</strong> u stabilizovaného chronického onemocnění.",
            "<strong>Interpretace výsledků</strong>, které už máte, a rozhodnutí, co dál.",
            "<strong>Posouzení dočasné pracovní neschopnosti</strong> tam, kde je videokonzultace dostatečným vyšetřením.",
          ]),
          p(`Posouzení pracovní neschopnosti rozebíráme podrobně v samostatném článku o tom, <a href="${href("cs", "/blog/neschopenka-jak-funguje-eneschopenka")}">jak funguje eNeschopenka</a>.`),
        ],
      },
      {
        id: "co-nevyresi",
        nav: "Co nevyřeší",
        eyebrow: "Limity",
        h2: "Co online konzultace nevyřeší",
        blocks: [
          lead("Hranice nevede mezi „na dálku“ a „v ordinaci“. Vede mezi tím, co lze posoudit z anamnézy, obrazu a přístrojů, které máte doma, a tím, co vyžaduje ruce lékaře."),
          p("Řada věcí, které se za limit považují, limitem není. Pacienta lze krok za krokem navést, aby si sám prohmatal břicho nebo předvedl rozsah pohybu v kloubu, a popis bolesti spolu s tím obvykle stačí k rozhodnutí, co dál. Zobrazení i laboratorní vyšetření umíme indikovat a poslat vás na ně. A pokud máte doma <strong>domácí zdravotní sadu</strong> — tlakoměr, teploměr, oxymetr, případně otoskop nebo digitální stetoskop — dostaneme z konzultace prakticky tolik co z ordinace."),
          ul([
            "<strong>Poklep</strong> a <strong>vyšetření per rectum</strong> — na dálku je provést nelze.",
            "<strong>Pohmat břicha rukou lékaře</strong>, když nález vedený pacientem nestačí nebo je podezření na náhlou příhodu břišní.",
            "<strong>Poslech plic a srdce</strong> — pokud nemáte digitální stetoskop; s ním posloucháme.",
            "<strong>Povinná posouzení</strong>, u nichž je fyzické vyšetření ze zákona součástí výkonu.",
          ]),
          p("Na dálku proto nese <strong>anamnéza</strong> mnohem větší váhu než v ordinaci: čas, průběh, souvislosti, léky, co bolest zhoršuje a co ji tiší. Když z toho vyjde, že chybí vyšetření nebo přístroj, řekneme vám to a nasměrujeme vás do ordinace nebo na urgentní příjem. To je správný výsledek konzultace, ne její selhání."),
        ],
      },
      {
        id: "jak-probiha",
        nav: "Jak probíhá",
        eyebrow: "Praktické",
        h2: "Jak videokonzultace probíhá a co si připravit",
        blocks: [
          lead("Deset minut přípravy zvedne užitečnost konzultace víc než cokoli jiného."),
          ul([
            "<strong>Seznam léků</strong>, které užíváte, včetně doplňků stravy a jejich dávek.",
            "<strong>Časová osa potíží</strong> — kdy to začalo, co se zhoršuje, co pomáhá.",
            "<strong>Naměřené hodnoty</strong>, pokud je máte — teplota, tlak, tep, saturace.",
            "<strong>Výsledky vyšetření</strong> a propouštěcí zprávy, které se k potížím vztahují.",
            "<strong>Dobré světlo a klidné místo.</strong> U kožních projevů rozhoduje světlo víc než rozlišení kamery.",
            "<strong>Alergie</strong> a předchozí reakce na léky.",
          ]),
          p("Konzultace končí závěrem a doporučeným postupem. Pokud je namístě recept, vystaví ho lékař elektronicky; pokud je namístě vyšetření v ordinaci nebo odběry, dostanete konkrétní doporučení, kam a jak rychle."),
          cite(`Ověřené informace o zdraví a systému péče v Česku: <a href="${NZIP}" rel="nofollow noopener" target="_blank">Národní zdravotnický informační portál</a> (MZ ČR a ÚZIS).`),
        ],
      },
      {
        id: "praktik",
        nav: "Praktik vs. online",
        eyebrow: "Doplněk, ne náhrada",
        h2: "Nahradí online lékař praktického lékaře?",
        blocks: [
          lead("Ne. A služba, která tvrdí opak, vám neříká pravdu."),
          p("Registrující praktický lékař plní role, které na dálku plnit nelze: <strong>preventivní prohlídky</strong> a povinná posouzení s fyzikálním vyšetřením, očkování a vedení zdravotnické dokumentace v čase. <strong>Dispenzarizaci</strong> chronických onemocnění naopak z velké části na dálku vést lze — kontroly, titraci léčby, hodnocení hodnot z domácích měření — chybí jen ta část, kterou tvoří samotné fyzikální vyšetření. Registrace u praktika je také to, co vám dává lékaře, který zná vaši historii, nikoli jednu epizodu."),
          p("Online konzultace k tomu dobře doplňuje rychlost: večer, o víkendu, na cestách, nebo když je objednací lhůta delší než trvání potíží. Nejlepší uspořádání je obojí — registrace u praktika a online konzultace pro akutní věci mezi tím."),
          ul([
            "Ověřte si, že lékař, se kterým mluvíte, je oprávněn vykonávat povolání v Česku — členství v ČLK je veřejně dohledatelné.",
            "Zeptejte se, co konzultace zahrnuje a co ne, ještě než ji zaplatíte.",
            "Vyžádejte si písemný závěr konzultace do dokumentace.",
          ]),
          cite(`Veřejný seznam lékařů: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Česká lékařská komora</a>.`),
        ],
      },
      {
        id: "deti",
        nav: "Děti",
        eyebrow: "Zvláštní opatrnost",
        h2: "Děti a konzultace na dálku",
        blocks: [
          lead("Většinu dětských potíží na dálku posoudit lze. Posunuté je něco jiného: práh, při kterém dítě posíláme k vyšetření, je nižší než u dospělých."),
          p("Malé děti se zhoršují rychleji než dospělí a jejich stav se posuzuje z celkového dojmu — jak dýchají, jak reagují, jak pijí, jaká je barva kůže. Část toho je přes kameru vidět, část rozhodně ne. Videokonzultace u dítěte proto slouží hlavně k tomu, aby lékař rozhodl, jak rychle a kam je potřeba dojet."),
          ul([
            "<strong>Novorozenec nebo kojenec s teplotou</strong> patří k lékaři vždy, bez výjimky a bez čekání na konzultaci.",
            "<strong>Zrychlené nebo namáhavé dýchání</strong>, zatahování mezižebří, sténání při výdechu — okamžitě k lékaři.",
            "<strong>Odmítání pití, výrazně méně mokrých plen, spavost nebo nezvyklá nedráždivost</strong> — vyšetření, ne konzultace.",
            "<strong>Vyrážka, která nebledne při zatlačení</strong> — volejte 155.",
          ]),
          p("U starších dětí s běžným nachlazením, s již známou diagnózou nebo s otázkou k zavedené léčbě je konzultace na dálku smysluplná stejně jako u dospělých."),
        ],
      },
      {
        id: "urgent",
        nav: "Kdy volat 155",
        eyebrow: "Bezpečnost",
        h2: "Kdy nekonzultovat, ale volat",
        blocks: [
          lead("U těchto stavů je jakékoli čekání na konzultaci ztráta času, která může stát život."),
          ul([
            "Bolest nebo tlak na hrudi, zvlášť s dušností, pocením nebo bolestí do paže či čelisti.",
            "Náhlá slabost poloviny těla, pokleslý koutek, porucha řeči nebo náhlá krutá bolest hlavy.",
            "Dušnost v klidu, promodrávání rtů nebo obličeje.",
            "Porucha vědomí, křeče, úraz hlavy s bezvědomím.",
            "Vyrážka, která nebledne při zatlačení, s horečkou, ztuhlou šíjí nebo zmateností.",
            "Silné krvácení nebo zvracení krve.",
            "Jakákoli myšlenka na sebepoškození.",
          ]),
          p("Volejte <strong>155</strong> nebo <strong>112</strong>. Mimo ordinační hodiny méně urgentních stavů slouží lékařská pohotovostní služba ve vašem regionu."),
        ],
      },
    ],
    linksEyebrow: "Global Health Česko",
    linksH2: "Kam dál",
    linksLead: "Naši čeští lékaři konzultují online a na začátku vám řeknou, zda je vaše potíž na dálku řešitelná.",
    links: [
      { label: "Videokonzultace s českým lékařem", href: href("cs", "/services/lekar-online-praha") },
      { label: "Naši lékaři v Česku", href: href("cs", "/doctors") },
      { label: "Kontakt — Global Health Česko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Potřebujete mluvit s lékařem dnes?",
      text: "Objednejte videokonzultaci s lékařem registrovaným v Česku. Pokud vaše potíž vyžaduje ordinaci, řekneme vám to na začátku, ne na konci.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/lekar-online-praha") },
      secondary: { label: "Zobrazit lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Kde si informace ověříte",
    sourcesLead: "Informace o zdraví a o českém systému péče, a veřejný registr, ve kterém si ověříte kteréhokoli lékaře.",
    sources: [
      { label: "NZIP — Národní zdravotnický informační portál", href: NZIP },
      { label: "ČLK — seznam lékařů", href: CLK_REGISTER },
    ],
    sourcesNote: "Odkazy vedou na weby příslušných institucí. Global Health není poskytovatelem urgentní péče a online konzultace nenahrazuje zdravotnickou záchrannou službu.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Co může lékař online skutečně vyřešit?",
        a: "Běžné akutní potíže, u kterých rozhoduje anamnéza a popis obtíží: respirační infekty bez dušnosti, střevní potíže bez varovných příznaků, kožní projevy, které lze ukázat, známé bolesti hlavy, úzkostné stavy, pokračování zavedené léčby a interpretaci již hotových výsledků.",
      },
      {
        q: "Co online konzultace vyřešit nemůže?",
        a: "Poklep, vyšetření per rectum a pohmat břicha rukou lékaře. Bez digitálního stetoskopu ani poslech plic a srdce. Zbytek jde většinou vyřešit: pacienta navedeme, aby si potřebné úkony provedl sám, odběry i zobrazení indikujeme a s domácí zdravotní sadou měříme tlak, saturaci i teplotu. Fyzikální vyšetření zůstává u povinných prohlídek, kde je ze zákona součástí výkonu.",
      },
      {
        q: "Nahradí online lékař registraci u praktického lékaře?",
        a: "Nenahradí. Registrující praktický lékař zajišťuje preventivní prohlídky s fyzikálním vyšetřením, očkování a vedení dokumentace v čase. Sledování chronických onemocnění přitom z velké části na dálku vést lze. Online konzultace je doplněk, ne náhrada registrace.",
      },
      {
        q: "Co si mám na videokonzultaci připravit?",
        a: "Seznam užívaných léků včetně doplňků a dávek, časovou osu potíží, naměřené hodnoty jako teplota nebo tlak, výsledky souvisejících vyšetření, informace o alergiích, a klidné místo s dobrým světlem — zvlášť u kožních potíží.",
      },
      {
        q: "Jak si ověřím, že lékař je skutečně lékař?",
        a: "Ve veřejném seznamu lékařů České lékařské komory. Každý lékař vykonávající povolání v Česku je jejím členem, takže registraci konkrétního jména si dohledáte sami, u nás i kdekoli jinde.",
      },
      {
        q: "Kdy mám místo konzultace volat záchrannou službu?",
        a: "Při bolesti na hrudi, náhlé slabosti poloviny těla nebo poruše řeči, dušnosti v klidu, poruše vědomí či křečích, vyrážce neblednoucí při zatlačení s horečkou, silném krvácení, nebo při myšlenkách na sebepoškození. Volejte 155 nebo 112 a nečekejte na konzultaci.",
      },
    ],
    disclaimerTitle: "Zdravotní upozornění",
    disclaimer:
      "Napsala MUDr. Romana Pavlů, praktická lékařka pro dospělé Global Health Česko, odborně zkontroloval MUDr. Vojtěch Černý, praktický lékař. Článek obsahuje obecné informace o možnostech a mezích konzultace na dálku. Nejde o individuální lékařskou radu a nenahrazuje vyšetření lékařem, který zná vaši zdravotní historii. Global Health neposkytuje urgentní péči. Při stavech ohrožujících život volejte okamžitě 155 nebo 112.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "online-doctor-czechia-what-it-solves",
  title: "Online doctor 24/7 in Czechia: what a remote consultation solves and what it does not",
  excerpt:
    "An online doctor is quick to reach but not right for everything. What can be assessed safely by video, what belongs in a surgery, when to call 155, and why a remote consultation does not replace registration with a GP.",
  seoTitle: "Online doctor 24/7 in Czechia: what it solves",
  seoDescription:
    "What an online consultation with a doctor in Czechia can safely solve, what needs an in-person examination, when to call 155, and what a GP still does.",
  category: "General Practice",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "General Practice",
    categoryHref: href("en", "/blog"),
    eyebrow: "Czechia · Telemedicine guide",
    h1: "Online doctor 24/7",
    deck: "Availability is only half the answer. The other half is which problems can be assessed safely at a distance — and which certainly cannot.",
    intro:
      "An online doctor is a doctor you speak to by video or phone instead of in a surgery. It works well for <strong>common acute problems</strong> where the history and your description carry the decision — respiratory infections, gastrointestinal upsets, skin problems that can be shown, migraine, anxiety, repeat prescriptions for long-term treatment. What it cannot do is what needs <strong>a doctor's hands</strong> — percussion, rectal examination, the doctor's own palpation of an abdomen — and, without a device, listening to the chest and heart. Imaging and laboratory tests we can request, and with a home health kit the measurements come too. It does not replace registration with a GP, which covers preventive check-ups with a physical examination.",
    facts: ["Fast to reach", "Suited to common acute problems", "Not a substitute for a registered GP"],
    primaryCta: { label: "Book a video consultation", href: href("en", "/services/lekar-online-praha") },
    secondaryCta: { label: "Our Czech doctors", href: href("en", "/doctors") },
    panelChip: "What this guide covers",
    panelParas: [
      "A concrete list of problems that can be assessed remotely, and an equally concrete list of those that cannot.",
      "How a video consultation runs and what to prepare so that it is worth having.",
      "Why an online consultation does not replace the GP you are registered with — and how the two complement each other.",
    ],
    author: { initials: "RP", name: "MUDr. Romana Pavlů", line: "General Practitioner for adults · Global Health Czechia" },
    reviewLine: "Clinically reviewed by MUDr. Vojtěch Černý, General Practitioner, Global Health Czechia.",
    navLabel: "In this article",
    sections: [
      {
        id: "co-to-je",
        nav: "What it means",
        eyebrow: "Definition",
        h2: "What “online doctor 24/7” actually means",
        blocks: [
          lead("It means a consultation is available around the clock, not that all of medicine is."),
          p("A doctor consulting online has the same training, the same responsibility and the same professional duties as one in a surgery. Exactly one thing differs — you are not in front of them. That is decisive for everything recognised with hands and a stethoscope, and almost irrelevant for what is recognised from a conversation and a look."),
          p("Well-run telemedicine therefore does not sound like “we can handle anything”. It sounds like “this we can settle now, this needs a surgery, and this is a reason to go to the emergency department”. That third category is the real benefit of fast availability: someone tells you in time that you should not wait."),
          warn("Speed is not emergency care", "An online consultation does not replace the ambulance service. In life-threatening situations call 155 or 112 immediately, not a booking form."),
        ],
      },
      {
        id: "co-vyresi",
        nav: "What it solves",
        eyebrow: "Suitable cases",
        h2: "What can be assessed safely at a distance",
        blocks: [
          lead("Situations where the history, your description and sometimes what you can show the camera carry the decision."),
          ul([
            "<strong>Acute respiratory infections</strong> without breathlessness — runny nose, cough, sore throat, fever with a typical course.",
            "<strong>Gastrointestinal upsets</strong> without signs of dehydration and without blood in the stool.",
            "<strong>Skin problems</strong> that can be shown in good light — rashes, cold sores, acne, suspicious changes for triage.",
            "<strong>Migraine and known headaches</strong> in a patient with an established diagnosis.",
            "<strong>Anxiety and low mood</strong> — a first assessment and a decision on what happens next.",
            "<strong>Continuation of established treatment</strong> in stable chronic disease.",
            "<strong>Interpretation of results</strong> you already have, and the decision on what to do with them.",
            "<strong>Assessment of temporary incapacity for work</strong> where a video consultation is an adequate examination.",
          ]),
          p(`Incapacity for work is covered in detail in a separate article on <a href="${href("en", "/blog/neschopenka-czech-sick-note-explained")}">how the eNeschopenka works</a>.`),
        ],
      },
      {
        id: "co-nevyresi",
        nav: "What it cannot",
        eyebrow: "Limits",
        h2: "What an online consultation cannot solve",
        blocks: [
          lead("The line does not run between «remote» and «in the surgery». It runs between what can be judged from the history, the camera and the devices you have at home, and what needs a doctor's hands."),
          p("A good deal of what gets treated as a limit is not one. A patient can be talked step by step through pressing on their own abdomen or showing the range of movement in a joint, and that, with a description of the pain, is usually enough to decide what comes next. Imaging and laboratory tests we can request and send you for. And if you have a <strong>home health kit</strong> — blood pressure monitor, thermometer, oximeter, sometimes an otoscope or a digital stethoscope — a consultation gets close to what a room would give."),
          ul([
            "<strong>Percussion</strong> and <strong>rectal examination</strong> — neither can be done at a distance.",
            "<strong>Abdominal palpation by the doctor's own hand</strong>, where patient-guided findings are not enough or an acute abdomen is suspected.",
            "<strong>Listening to the chest and heart</strong> — unless you have a digital stethoscope, in which case we listen.",
            "<strong>Statutory assessments</strong> where the physical examination is legally part of the act.",
          ]),
          p("Remotely, then, the <strong>history</strong> carries far more weight than it does in a room: timing, course, context, medication, what makes the pain worse and what settles it. Where that shows an examination or a device is missing, we say so and direct you to a surgery or to emergency care. That is a correct outcome of the consultation, not a failure of it."),
        ],
      },
      {
        id: "jak-probiha",
        nav: "How it runs",
        eyebrow: "Practical",
        h2: "How a video consultation runs and what to prepare",
        blocks: [
          lead("Ten minutes of preparation raise the usefulness of a consultation more than anything else."),
          ul([
            "<strong>A list of your medicines</strong>, including supplements and their doses.",
            "<strong>A timeline of the problem</strong> — when it started, what is getting worse, what helps.",
            "<strong>Any measurements</strong> you have — temperature, blood pressure, pulse, oxygen saturation.",
            "<strong>Results and discharge letters</strong> relevant to the complaint.",
            "<strong>Good light and a quiet place.</strong> With skin problems, light matters more than camera resolution.",
            "<strong>Allergies</strong> and previous reactions to medicines.",
          ]),
          p("The consultation ends with a conclusion and a recommended course of action. Where a prescription is appropriate, the doctor issues it electronically; where an in-person examination or bloods are appropriate, you get a specific recommendation on where to go and how quickly."),
          cite(`Verified information on health and the Czech care system: <a href="${NZIP}" rel="nofollow noopener" target="_blank">National Health Information Portal</a> (Ministry of Health and ÚZIS).`),
        ],
      },
      {
        id: "praktik",
        nav: "GP vs online",
        eyebrow: "Complement, not replacement",
        h2: "Does an online doctor replace a GP?",
        blocks: [
          lead("No. And a service claiming otherwise is not telling you the truth."),
          p("A registering GP fills roles that cannot be filled remotely: <strong>preventive check-ups</strong> and statutory assessments with a physical examination, vaccination, and keeping medical records over time. <strong>Structured follow-up</strong> of chronic disease, by contrast, largely can run remotely — reviews, adjusting treatment, reading the numbers you measure at home — what is missing is only the physical examination itself. Registration is also what gives you a doctor who knows your history rather than a single episode."),
          p("An online consultation complements that with speed: in the evening, at the weekend, while travelling, or when the waiting time is longer than the illness. The best arrangement is both — registered with a GP, and an online consultation for acute matters in between."),
          ul([
            "Check that the doctor you are speaking to is licensed to practise in Czechia — Chamber membership is publicly searchable.",
            "Ask what the consultation includes and what it does not, before you pay for it.",
            "Ask for the written conclusion of the consultation for your records.",
          ]),
          cite(`Public register of doctors: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Czech Medical Chamber</a>.`),
        ],
      },
      {
        id: "deti",
        nav: "Children",
        eyebrow: "Extra caution",
        h2: "Children and remote consultations",
        blocks: [
          lead("Most children's problems can be handled remotely. What is different is the threshold: with a child we send for an examination sooner than we would with an adult."),
          p("Small children deteriorate faster than adults, and their state is judged from an overall impression — how they breathe, how they respond, how they drink, the colour of their skin. Part of that is visible through a camera; part of it certainly is not. A video consultation for a child therefore mainly serves to decide how quickly and where you need to go."),
          ul([
            "<strong>A newborn or infant with a fever</strong> belongs with a doctor every time, without exception and without waiting for a consultation.",
            "<strong>Fast or laboured breathing</strong>, drawing in between the ribs, grunting on breathing out — to a doctor immediately.",
            "<strong>Refusing to drink, markedly fewer wet nappies, drowsiness or unusual unresponsiveness</strong> — examination, not consultation.",
            "<strong>A rash that does not fade under pressure</strong> — call 155.",
          ]),
          p("For older children with an ordinary cold, an already known diagnosis or a question about established treatment, a remote consultation makes as much sense as it does for adults."),
        ],
      },
      {
        id: "urgent",
        nav: "When to call 155",
        eyebrow: "Safety",
        h2: "When not to consult, but to call",
        blocks: [
          lead("With these presentations, any wait for a consultation is lost time that can cost a life."),
          ul([
            "Chest pain or pressure, especially with breathlessness, sweating, or pain into the arm or jaw.",
            "Sudden one-sided weakness, facial droop, difficulty speaking, or a sudden severe headache.",
            "Breathlessness at rest, or blue lips or face.",
            "Loss of consciousness, seizures, or a head injury with loss of consciousness.",
            "A rash that does not fade under pressure, with fever, neck stiffness or confusion.",
            "Heavy bleeding or vomiting blood.",
            "Any thought of harming yourself.",
          ]),
          p("Call <strong>155</strong> or <strong>112</strong>. Outside surgery hours, less urgent problems are covered by the out-of-hours medical service in your region."),
        ],
      },
    ],
    linksEyebrow: "Global Health Czechia",
    linksH2: "Where to go from here",
    linksLead: "Our Czech doctors consult online and will tell you at the start whether your problem can be handled at a distance.",
    links: [
      { label: "Video consultation with a Czech doctor", href: href("en", "/services/lekar-online-praha") },
      { label: "Our doctors in Czechia", href: href("en", "/doctors") },
      { label: "Contact Global Health Czechia", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Need to speak to a doctor today?",
      text: "Book a video consultation with a doctor registered in Czechia. If your problem needs a surgery, we will tell you at the start, not at the end.",
      primary: { label: "Book a consultation", href: href("en", "/services/lekar-online-praha") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where to check independently",
    sourcesLead: "Information on health and the Czech care system, and the public register in which you can verify any doctor.",
    sources: [
      { label: "NZIP — National Health Information Portal", href: NZIP },
      { label: "Czech Medical Chamber — register of doctors", href: CLK_REGISTER },
    ],
    sourcesNote: "Links open on the relevant institution's own website. Global Health is not an emergency care provider, and an online consultation does not replace the ambulance service.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "What can an online doctor actually solve?",
        a: "Common acute problems where the history and your description carry the decision: respiratory infections without breathlessness, gastrointestinal upsets without warning signs, skin problems that can be shown, known headaches, anxiety, continuation of established treatment, and interpretation of results you already have.",
      },
      {
        q: "What can an online consultation not solve?",
        a: "Percussion, rectal examination and the doctor's own palpation of an abdomen. Without a digital stethoscope, listening to the chest and heart. Most of the rest can be worked around: we talk you through examining yourself, we request bloods and imaging, and with a home health kit we get blood pressure, saturation and temperature. The physical examination remains for statutory check-ups, where it is legally part of the act.",
      },
      {
        q: "Does an online doctor replace registration with a GP?",
        a: "No. A registering GP provides preventive check-ups with a physical examination, vaccination and continuous medical records. Follow-up of chronic disease, on the other hand, largely can run remotely. An online consultation is a complement, not a replacement for registration.",
      },
      {
        q: "What should I prepare for a video consultation?",
        a: "A list of the medicines you take including supplements and doses, a timeline of the problem, any measurements such as temperature or blood pressure, results of related investigations, information on allergies, and a quiet place with good light — especially for skin complaints.",
      },
      {
        q: "How do I verify that the doctor really is a doctor?",
        a: "In the public register of the Czech Medical Chamber. Every doctor practising in Czechia is a member, so you can look up a specific name yourself — with us as anywhere else.",
      },
      {
        q: "When should I call the ambulance service instead of consulting?",
        a: "With chest pain, sudden one-sided weakness or speech disturbance, breathlessness at rest, loss of consciousness or seizures, a non-fading rash with fever, heavy bleeding, or thoughts of harming yourself. Call 155 or 112 and do not wait for a consultation.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by MUDr. Romana Pavlů, General Practitioner for adults at Global Health Czechia, and clinically reviewed by MUDr. Vojtěch Černý, General Practitioner. This article is general information about remote consultations in Czechia and is not individual medical advice. It does not replace examination by a doctor who knows your history. Global Health is not an emergency care provider. In a life-threatening emergency call 155 or 112 immediately.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "medico-online-chequia-o-que-resolve",
  title: "Médico online 24/7 na Chéquia: o que a consulta à distância resolve e o que não resolve",
  excerpt:
    "O médico online está disponível depressa, mas não serve para tudo. O que pode ser avaliado com segurança por vídeo, o que exige consultório, quando ligar 155 e por que a consulta à distância não substitui a inscrição num médico de família.",
  seoTitle: "Médico online 24/7 na Chéquia: o que resolve",
  seoDescription:
    "O que uma consulta online com médico na Chéquia resolve, o que exige observação presencial, quando ligar 155 e o que só o médico de família faz.",
  category: "Clínica Geral",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Clínica Geral",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Chéquia · Guia de telemedicina",
    h1: "Médico online 24/7",
    deck: "A disponibilidade é só metade da resposta. A outra metade é saber que queixas podem ser avaliadas à distância com segurança — e quais definitivamente não podem.",
    intro:
      "Um médico online é um médico com quem fala por vídeo ou telefone em vez de no consultório. Resolve bem <strong>queixas agudas comuns</strong>, em que decidem a história clínica e a descrição dos sintomas — infeções respiratórias, gastroenterites, lesões de pele que se conseguem mostrar, enxaqueca, ansiedade, renovação de terapêutica prolongada. O que não resolve é o que exige <strong>as mãos do médico</strong> — percussão, toque rectal, palpação do abdómen pelo médico — e, sem aparelho, a auscultação do tórax e do coração. Exames de imagem e análises podemos pedi-los, e com um kit de saúde em casa também as medições. Não substitui a inscrição num médico de família, a quem pertencem os exames de rotina com observação física.",
    facts: ["Disponibilidade rápida", "Adequado a queixas agudas comuns", "Não substitui o médico de família"],
    primaryCta: { label: "Marcar videoconsulta", href: href("pt", "/services/lekar-online-praha") },
    secondaryCta: { label: "Os nossos médicos checos", href: href("pt", "/doctors") },
    panelChip: "O que este guia cobre",
    panelParas: [
      "Uma lista concreta de queixas que podem ser avaliadas à distância e uma lista igualmente concreta das que não podem.",
      "Como decorre a videoconsulta e o que preparar para que valha a pena.",
      "Por que a consulta online não substitui o médico de família em que está inscrito — e em que se complementam.",
    ],
    author: { initials: "RP", name: "MUDr. Romana Pavlů", line: "Médica de clínica geral para adultos · Global Health Chéquia" },
    reviewLine: "Revisto clinicamente pelo MUDr. Vojtěch Černý, médico de clínica geral, Global Health Chéquia.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "co-to-je",
        nav: "O que significa",
        eyebrow: "Delimitação",
        h2: "O que significa «médico online 24/7»",
        blocks: [
          lead("Significa que a consulta está disponível a qualquer hora, não que toda a medicina esteja."),
          p("O médico em consulta online tem a mesma formação, a mesma responsabilidade e os mesmos deveres profissionais do médico no consultório. Difere numa coisa apenas — não o tem à frente. Isso é decisivo em tudo o que se reconhece com as mãos e com o estetoscópio, e quase irrelevante no que se reconhece pela conversa e pelo olhar."),
          p("Por isso, telemedicina bem feita não soa a «resolvemos tudo». Soa a «isto resolvemos já, isto precisa de consultório e isto é motivo para ir à urgência». É esta terceira categoria o maior benefício da disponibilidade rápida: alguém lhe diz a tempo que não deve esperar."),
          warn("Rapidez não é cuidado urgente", "A consulta online não substitui o serviço de emergência médica. Em situações que ameacem a vida ligue imediatamente 155 ou 112, e não um formulário de marcação."),
        ],
      },
      {
        id: "co-vyresi",
        nav: "O que resolve",
        eyebrow: "Casos adequados",
        h2: "O que pode ser avaliado à distância com segurança",
        blocks: [
          lead("Situações em que decidem a história clínica, a descrição das queixas e, por vezes, aquilo que se consegue mostrar à câmara."),
          ul([
            "<strong>Infeções respiratórias agudas</strong> sem dificuldade respiratória — corrimento nasal, tosse, dor de garganta, febre com evolução típica.",
            "<strong>Queixas intestinais</strong> sem sinais de desidratação e sem sangue nas fezes.",
            "<strong>Lesões de pele</strong> que se conseguem mostrar com boa luz — erupções, herpes, acne, alterações suspeitas para triagem.",
            "<strong>Enxaqueca e cefaleias já conhecidas</strong> em doente com diagnóstico estabelecido.",
            "<strong>Ansiedade e humor deprimido</strong> — primeira avaliação e decisão sobre o passo seguinte.",
            "<strong>Continuação de terapêutica instituída</strong> em doença crónica estabilizada.",
            "<strong>Interpretação de resultados</strong> que já tem, e decisão sobre o que fazer com eles.",
            "<strong>Avaliação da incapacidade temporária para o trabalho</strong> quando a videoconsulta é avaliação suficiente.",
          ]),
          p(`A incapacidade para o trabalho é tratada em detalhe num artigo próprio sobre <a href="${href("pt", "/blog/neschopenka-baixa-medica-na-chequia")}">como funciona a eNeschopenka</a>.`),
        ],
      },
      {
        id: "co-nevyresi",
        nav: "O que não resolve",
        eyebrow: "Limites",
        h2: "O que a consulta online não resolve",
        blocks: [
          lead("A fronteira não é entre «à distância» e «no consultório». É entre o que se consegue avaliar pela história, pela câmara e pelos aparelhos que tem em casa, e o que exige as mãos do médico."),
          p("Boa parte do que se toma por limite não o é. O doente pode ser guiado passo a passo a palpar o próprio abdómen ou a mostrar a amplitude de movimento de uma articulação, e isso, com a descrição da dor, costuma bastar para decidir o passo seguinte. Exames de imagem e análises podemos pedi-los e encaminhá-lo para os fazer. E se tiver em casa um <strong>kit de saúde</strong> — medidor de tensão, termómetro, oxímetro, por vezes otoscópio ou estetoscópio digital — a consulta aproxima-se muito do que daria o consultório."),
          ul([
            "<strong>Percussão</strong> e <strong>toque rectal</strong> — nenhum se faz à distância.",
            "<strong>Palpação do abdómen pela mão do médico</strong>, quando o exame guiado pelo doente não chega ou há suspeita de abdómen agudo.",
            "<strong>Auscultação do tórax e do coração</strong> — salvo se tiver um estetoscópio digital, caso em que auscultamos.",
            "<strong>Avaliações obrigatórias</strong> em que a observação física faz parte do ato por imposição legal.",
          ]),
          p("À distância, a <strong>história clínica</strong> pesa por isso muito mais do que no consultório: tempo, evolução, contexto, medicação, o que agrava a dor e o que a alivia. Quando daí resulta que falta uma observação ou um aparelho, dizemo-lo e encaminhamo-lo para o consultório ou para a urgência. Esse é o resultado correto da consulta, não a sua falha."),
        ],
      },
      {
        id: "jak-probiha",
        nav: "Como decorre",
        eyebrow: "Prático",
        h2: "Como decorre a videoconsulta e o que preparar",
        blocks: [
          lead("Dez minutos de preparação aumentam a utilidade da consulta mais do que qualquer outra coisa."),
          ul([
            "<strong>Lista dos medicamentos</strong> que toma, incluindo suplementos e respetivas doses.",
            "<strong>Cronologia das queixas</strong> — quando começou, o que está a piorar, o que ajuda.",
            "<strong>Valores medidos</strong>, se os tiver — temperatura, tensão, pulso, saturação.",
            "<strong>Resultados de exames</strong> e cartas de alta relacionados com a queixa.",
            "<strong>Boa luz e um local sossegado.</strong> Nas queixas de pele, a luz conta mais do que a resolução da câmara.",
            "<strong>Alergias</strong> e reações anteriores a medicamentos.",
          ]),
          p("A consulta termina com uma conclusão e um plano recomendado. Se houver indicação para receita, o médico emite-a eletronicamente; se houver indicação para observação ou análises, recebe uma recomendação concreta sobre onde ir e com que urgência."),
          cite(`Informação verificada sobre saúde e sobre o sistema checo: <a href="${NZIP}" rel="nofollow noopener" target="_blank">Portal Nacional de Informação em Saúde</a> (Ministério da Saúde e ÚZIS).`),
        ],
      },
      {
        id: "praktik",
        nav: "Médico de família",
        eyebrow: "Complemento, não substituto",
        h2: "O médico online substitui o médico de família?",
        blocks: [
          lead("Não. E um serviço que afirme o contrário não lhe está a dizer a verdade."),
          p("O médico de família em que está inscrito desempenha funções que não podem ser cumpridas à distância: <strong>exames de rotina</strong> e avaliações obrigatórias com observação física, vacinação e manutenção do registo clínico ao longo do tempo. A <strong>vigilância das doenças crónicas</strong>, essa, pode em boa parte ser feita à distância — consultas de controlo, ajuste da terapêutica, leitura dos valores que mede em casa —; falta apenas a observação física em si. A inscrição é também o que lhe dá um médico que conhece a sua história, e não um episódio isolado."),
          p("A consulta online complementa isso com rapidez: à noite, ao fim de semana, em viagem, ou quando o prazo de marcação é maior do que a duração da queixa. O melhor arranjo é ter ambos — inscrição num médico de família e consulta online para o que é agudo pelo meio."),
          ul([
            "Confirme que o médico com quem fala está habilitado a exercer na Chéquia — a inscrição na Ordem é pública.",
            "Pergunte o que a consulta inclui e o que não inclui antes de a pagar.",
            "Peça a conclusão escrita da consulta para o seu registo.",
          ]),
          cite(`Lista pública de médicos: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Ordem dos Médicos Checa</a>.`),
        ],
      },
      {
        id: "deti",
        nav: "Crianças",
        eyebrow: "Especial cuidado",
        h2: "Crianças e consultas à distância",
        blocks: [
          lead("A maioria das queixas das crianças resolve-se à distância. O que muda é o limiar: numa criança encaminhamos para observação mais cedo do que num adulto."),
          p("As crianças pequenas agravam-se mais depressa do que os adultos e o seu estado avalia-se pela impressão global — como respiram, como reagem, como bebem, a cor da pele. Parte disso vê-se pela câmara; parte, decididamente, não. A videoconsulta numa criança serve, sobretudo, para o médico decidir com que rapidez e para onde é preciso ir."),
          ul([
            "<strong>Recém-nascido ou lactente com febre</strong> tem de ser sempre observado, sem exceção e sem esperar por consulta.",
            "<strong>Respiração rápida ou difícil</strong>, tiragem intercostal, gemido expiratório — ao médico de imediato.",
            "<strong>Recusa de líquidos, muito menos fraldas molhadas, sonolência ou reatividade invulgarmente diminuída</strong> — observação, não consulta.",
            "<strong>Erupção que não desaparece à pressão</strong> — ligue 155.",
          ]),
          p("Em crianças mais velhas, com uma constipação banal, com diagnóstico já conhecido ou com uma dúvida sobre terapêutica instituída, a consulta à distância faz tanto sentido como nos adultos."),
        ],
      },
      {
        id: "urgent",
        nav: "Quando ligar 155",
        eyebrow: "Segurança",
        h2: "Quando não consultar, mas ligar",
        blocks: [
          lead("Nestes quadros, qualquer espera por consulta é tempo perdido que pode custar uma vida."),
          ul([
            "Dor ou aperto no peito, sobretudo com falta de ar, suores ou dor a irradiar para o braço ou mandíbula.",
            "Fraqueza súbita de metade do corpo, desvio da face, dificuldade em falar ou dor de cabeça súbita e intensa.",
            "Dificuldade respiratória em repouso, lábios ou face azulados.",
            "Alteração do estado de consciência, convulsões, traumatismo craniano com perda de consciência.",
            "Erupção que não desaparece à pressão, com febre, rigidez da nuca ou confusão.",
            "Hemorragia abundante ou vómitos com sangue.",
            "Qualquer ideia de se magoar a si próprio.",
          ]),
          p("Ligue <strong>155</strong> ou <strong>112</strong>. Fora do horário, os quadros menos urgentes são cobertos pelo serviço de atendimento permanente da sua região."),
        ],
      },
    ],
    linksEyebrow: "Global Health Chéquia",
    linksH2: "Passos seguintes",
    linksLead: "Os nossos médicos checos atendem online e dizem-lhe logo no início se a sua queixa é resolúvel à distância.",
    links: [
      { label: "Videoconsulta com médico checo", href: href("pt", "/services/lekar-online-praha") },
      { label: "Os nossos médicos na Chéquia", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Chéquia", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Precisa de falar com um médico hoje?",
      text: "Marque uma videoconsulta com um médico inscrito na Chéquia. Se a sua queixa exigir consultório, dizemos-lho no início e não no fim.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/lekar-online-praha") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "Onde confirmar",
    sourcesLead: "Informação sobre saúde e sobre o sistema checo, e o registo público onde confirma a inscrição de qualquer médico.",
    sources: [
      { label: "NZIP — Portal Nacional de Informação em Saúde", href: NZIP },
      { label: "Ordem dos Médicos Checa — lista de médicos", href: CLK_REGISTER },
    ],
    sourcesNote: "As ligações abrem nos sites das instituições competentes. A Global Health não é prestador de cuidados urgentes e a consulta online não substitui o serviço de emergência médica.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "O que é que um médico online resolve mesmo?",
        a: "Queixas agudas comuns, em que decidem a história clínica e a descrição dos sintomas: infeções respiratórias sem dificuldade respiratória, queixas intestinais sem sinais de alarme, lesões de pele que se conseguem mostrar, cefaleias já conhecidas, ansiedade, continuação de terapêutica instituída e interpretação de resultados já feitos.",
      },
      {
        q: "O que é que a consulta online não resolve?",
        a: "Percussão, toque rectal e a palpação do abdómen pela mão do médico. Sem estetoscópio digital, também a auscultação do tórax e do coração. O resto costuma resolver-se: guiamos o doente para fazer ele próprio o que é preciso, pedimos análises e imagiologia e, com um kit de saúde em casa, medimos tensão, saturação e temperatura. A observação física mantém-se nas avaliações obrigatórias, em que a lei a exige.",
      },
      {
        q: "O médico online substitui a inscrição num médico de família?",
        a: "Não substitui. O médico de família assegura exames de rotina, vigilância das doenças crónicas, vacinação e o registo clínico ao longo do tempo. A consulta online é um complemento para situações agudas, não um substituto desse acompanhamento.",
      },
      {
        q: "O que devo preparar para a videoconsulta?",
        a: "Lista dos medicamentos, incluindo suplementos e doses, a cronologia das queixas, valores medidos como temperatura ou tensão, resultados de exames relacionados, informação sobre alergias, e um local sossegado com boa luz — sobretudo em queixas de pele.",
      },
      {
        q: "Como confirmo que o médico é mesmo médico?",
        a: "Na lista pública da Ordem dos Médicos Checa. Qualquer médico que exerça na Chéquia é seu membro, pelo que pode procurar um nome concreto por si próprio, connosco como em qualquer outro lado.",
      },
      {
        q: "Quando devo ligar à emergência em vez de consultar?",
        a: "Perante dor no peito, fraqueza súbita de metade do corpo ou alteração da fala, dificuldade respiratória em repouso, alteração da consciência ou convulsões, erupção que não desaparece à pressão com febre, hemorragia abundante, ou ideias de se magoar. Ligue 155 ou 112 e não espere por consulta.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pela MUDr. Romana Pavlů, médica de clínica geral para adultos da Global Health Chéquia, e revisto clinicamente pelo MUDr. Vojtěch Černý, médico de clínica geral. Este artigo contém informação geral sobre consultas à distância na Chéquia e não constitui aconselhamento médico individual. Não substitui a observação por um médico que conheça a sua história. A Global Health não é prestador de cuidados urgentes. Em caso de perigo de vida, ligue imediatamente 155 ou 112.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "medico-online-chequia-que-resuelve",
  title: "Médico online 24/7 en Chequia: qué resuelve la consulta a distancia y qué no",
  excerpt:
    "El médico online está disponible rápido, pero no sirve para cualquier caso. Qué puede valorarse con seguridad por vídeo, qué exige consulta presencial, cuándo llamar al 155 y por qué no sustituye estar registrado con un médico de familia.",
  seoTitle: "Médico online 24/7 en Chequia: qué resuelve",
  seoDescription:
    "Qué resuelve una consulta online con médico en Chequia, qué exige exploración presencial, cuándo llamar al 155 y qué hace el médico de familia.",
  category: "Medicina General",
  article: {
    lang: "es-ES",
    tagline: "Medicina en cualquier momento y lugar",
    categoryLabel: "Medicina General",
    categoryHref: href("es", "/blog"),
    eyebrow: "Chequia · Guía de telemedicina",
    h1: "Médico online 24/7",
    deck: "La disponibilidad es solo la mitad de la respuesta. La otra mitad es qué molestias pueden valorarse a distancia con seguridad, y cuáles desde luego no.",
    intro:
      "Un médico online es un médico con el que habla por vídeo o teléfono en lugar de en la consulta. Resuelve bien las <strong>molestias agudas habituales</strong>, en las que deciden la historia clínica y su descripción de los síntomas: infecciones respiratorias, cuadros digestivos, lesiones de piel que puedan mostrarse, migraña, ansiedad, renovación de un tratamiento prolongado. Lo que no resuelve es lo que exige <strong>las manos del médico</strong>: percusión, tacto rectal, la palpación del abdomen por el propio médico y, sin aparato, la auscultación pulmonar y cardiaca. Las pruebas de imagen y los análisis podemos indicarlos, y con un kit de salud en casa también las mediciones. No sustituye estar registrado con un médico de familia, a quien corresponden las revisiones preventivas con exploración física.",
    facts: ["Disponibilidad rápida", "Adecuado para molestias agudas habituales", "No sustituye al médico de familia"],
    primaryCta: { label: "Reservar videoconsulta", href: href("es", "/services/lekar-online-praha") },
    secondaryCta: { label: "Nuestros médicos checos", href: href("es", "/doctors") },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Una lista concreta de molestias que pueden valorarse a distancia y otra igual de concreta de las que no.",
      "Cómo transcurre la videoconsulta y qué preparar para que merezca la pena.",
      "Por qué la consulta online no sustituye al médico de familia con el que está registrado, y en qué se complementan.",
    ],
    author: { initials: "RP", name: "MUDr. Romana Pavlů", line: "Médica de familia para adultos · Global Health Chequia" },
    reviewLine: "Revisado clínicamente por el MUDr. Vojtěch Černý, médico de familia, Global Health Chequia.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "co-to-je",
        nav: "Qué significa",
        eyebrow: "Delimitación",
        h2: "Qué significa «médico online 24/7»",
        blocks: [
          lead("Significa que la consulta está disponible a cualquier hora, no que lo esté toda la medicina."),
          p("El médico en consulta online tiene la misma formación, la misma responsabilidad y los mismos deberes profesionales que en la consulta presencial. Cambia una sola cosa: no le tiene delante. Eso es decisivo en cuanto se reconoce con las manos y el fonendoscopio, y casi irrelevante en lo que se reconoce con la conversación y la vista."),
          p("Por eso la telemedicina bien hecha no suena a «lo resolvemos absolutamente». Suena a «esto lo resolvemos ya, esto necesita consulta presencial y esto es motivo para ir a urgencias». Esa tercera categoría es el mayor beneficio de la disponibilidad rápida: alguien le dice a tiempo que no debe esperar."),
          warn("Rapidez no es atención urgente", "La consulta online no sustituye al servicio de emergencias. Ante situaciones que amenazan la vida llame de inmediato al 155 o al 112, no a un formulario de reserva."),
        ],
      },
      {
        id: "co-vyresi",
        nav: "Qué resuelve",
        eyebrow: "Casos adecuados",
        h2: "Qué puede valorarse a distancia con seguridad",
        blocks: [
          lead("Situaciones en las que deciden la historia clínica, la descripción de las molestias y, a veces, lo que pueda mostrarse a la cámara."),
          ul([
            "<strong>Infecciones respiratorias agudas</strong> sin dificultad para respirar: mocos, tos, dolor de garganta, fiebre con evolución típica.",
            "<strong>Cuadros digestivos</strong> sin signos de deshidratación y sin sangre en heces.",
            "<strong>Lesiones de piel</strong> que puedan mostrarse con buena luz: erupciones, herpes, acné, cambios sospechosos para triaje.",
            "<strong>Migraña y cefaleas ya conocidas</strong> en pacientes con diagnóstico establecido.",
            "<strong>Ansiedad y ánimo bajo</strong>: primera valoración y decisión sobre el siguiente paso.",
            "<strong>Continuación de un tratamiento instaurado</strong> en enfermedad crónica estable.",
            "<strong>Interpretación de resultados</strong> que ya tiene y decisión sobre qué hacer con ellos.",
            "<strong>Valoración de la incapacidad temporal para el trabajo</strong> cuando la videoconsulta es exploración suficiente.",
          ]),
          p(`La incapacidad para el trabajo se trata en detalle en un artículo aparte sobre <a href="${href("es", "/blog/neschopenka-baja-medica-en-chequia")}">cómo funciona la eNeschopenka</a>.`),
        ],
      },
      {
        id: "co-nevyresi",
        nav: "Qué no resuelve",
        eyebrow: "Límites",
        h2: "Qué no resuelve la consulta online",
        blocks: [
          lead("La frontera no está entre «a distancia» y «en consulta». Está entre lo que puede valorarse por la historia, la cámara y los aparatos que tenga en casa, y lo que exige las manos del médico."),
          p("Buena parte de lo que se da por límite no lo es. Al paciente se le puede guiar paso a paso para que se palpe el propio abdomen o muestre el recorrido de una articulación, y eso, junto con la descripción del dolor, suele bastar para decidir el siguiente paso. Las pruebas de imagen y los análisis podemos indicarlos y derivarle a hacerlos. Y si tiene en casa un <strong>kit de salud</strong> — tensiómetro, termómetro, pulsioxímetro, a veces otoscopio o estetoscopio digital — la consulta se acerca mucho a lo que daría el gabinete."),
          ul([
            "<strong>Percusión</strong> y <strong>tacto rectal</strong>: ninguno se hace a distancia.",
            "<strong>Palpación del abdomen con la mano del médico</strong>, cuando la exploración guiada por el paciente no basta o se sospecha un abdomen agudo.",
            "<strong>Auscultación pulmonar y cardiaca</strong>, salvo que disponga de estetoscopio digital, en cuyo caso auscultamos.",
            "<strong>Valoraciones obligatorias</strong> en las que la exploración física forma parte del acto por exigencia legal.",
          ]),
          p("A distancia, por tanto, la <strong>historia clínica</strong> pesa mucho más que en el gabinete: tiempo, evolución, contexto, medicación, qué empeora el dolor y qué lo calma. Cuando de ahí sale que falta una exploración o un aparato, se lo decimos y le dirigimos a consulta presencial o a urgencias. Ese es el resultado correcto de la consulta, no su fracaso."),
        ],
      },
      {
        id: "jak-probiha",
        nav: "Cómo transcurre",
        eyebrow: "Práctico",
        h2: "Cómo transcurre la videoconsulta y qué preparar",
        blocks: [
          lead("Diez minutos de preparación elevan la utilidad de la consulta más que ninguna otra cosa."),
          ul([
            "<strong>Lista de los medicamentos</strong> que toma, incluidos suplementos y sus dosis.",
            "<strong>Cronología de las molestias</strong>: cuándo empezó, qué empeora, qué ayuda.",
            "<strong>Valores medidos</strong>, si los tiene: temperatura, tensión, pulso, saturación.",
            "<strong>Resultados de pruebas</strong> e informes de alta relacionados con la molestia.",
            "<strong>Buena luz y un sitio tranquilo.</strong> En las lesiones de piel, la luz importa más que la resolución de la cámara.",
            "<strong>Alergias</strong> y reacciones previas a medicamentos.",
          ]),
          p("La consulta termina con una conclusión y una pauta recomendada. Si procede una receta, el médico la emite electrónicamente; si procede una exploración presencial o una analítica, recibe una recomendación concreta sobre dónde acudir y con qué rapidez."),
          cite(`Información verificada sobre salud y sobre el sistema checo: <a href="${NZIP}" rel="nofollow noopener" target="_blank">Portal Nacional de Información Sanitaria</a> (Ministerio de Sanidad y ÚZIS).`),
        ],
      },
      {
        id: "praktik",
        nav: "Médico de familia",
        eyebrow: "Complemento, no sustituto",
        h2: "¿Sustituye el médico online al médico de familia?",
        blocks: [
          lead("No. Y un servicio que afirme lo contrario no le está diciendo la verdad."),
          p("El médico de familia con el que está registrado cumple funciones que no pueden cumplirse a distancia: <strong>revisiones preventivas</strong> y valoraciones obligatorias con exploración física, vacunación y llevar la historia clínica a lo largo del tiempo. El <strong>seguimiento de las enfermedades crónicas</strong>, en cambio, sí puede llevarse en buena parte a distancia — controles, ajuste del tratamiento, lectura de las cifras que usted mide en casa —; lo único que falta es la exploración física en sí. Estar registrado es además lo que le da un médico que conoce su historia, no un episodio suelto."),
          p("La consulta online complementa eso con rapidez: por la tarde, el fin de semana, de viaje, o cuando la demora de cita es mayor que la duración de la molestia. Lo mejor es tener ambas cosas: registro con médico de familia y consulta online para lo agudo mientras tanto."),
          ul([
            "Compruebe que el médico con el que habla está habilitado para ejercer en Chequia: la pertenencia al Colegio es públicamente consultable.",
            "Pregunte qué incluye la consulta y qué no antes de pagarla.",
            "Pida la conclusión escrita de la consulta para su historia.",
          ]),
          cite(`Lista pública de médicos: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Colegio de Médicos checo</a>.`),
        ],
      },
      {
        id: "deti",
        nav: "Niños",
        eyebrow: "Precaución especial",
        h2: "Los niños y la consulta a distancia",
        blocks: [
          lead("La mayoría de las molestias infantiles se resuelven a distancia. Lo que cambia es el umbral: en un niño derivamos a exploración antes que en un adulto."),
          p("Los niños pequeños empeoran más rápido que los adultos y su estado se valora por la impresión global: cómo respiran, cómo reaccionan, cómo beben, el color de la piel. Parte de eso se ve por la cámara; parte desde luego no. Por eso la videoconsulta en un niño sirve principalmente para que el médico decida con qué rapidez y adónde hay que acudir."),
          ul([
            "<strong>Recién nacido o lactante con fiebre</strong>: siempre hay que verlo, sin excepción y sin esperar a una consulta.",
            "<strong>Respiración rápida o dificultosa</strong>, tiraje intercostal, quejido espiratorio: al médico de inmediato.",
            "<strong>Rechazo de líquidos, muchos menos pañales mojados, somnolencia o reactividad inusualmente baja</strong>: exploración, no consulta.",
            "<strong>Erupción que no desaparece al presionar</strong>: llame al 155.",
          ]),
          p("En niños mayores con un catarro corriente, con un diagnóstico ya conocido o con una duda sobre un tratamiento instaurado, la consulta a distancia tiene tanto sentido como en adultos."),
        ],
      },
      {
        id: "urgent",
        nav: "Cuándo llamar al 155",
        eyebrow: "Seguridad",
        h2: "Cuándo no consultar, sino llamar",
        blocks: [
          lead("En estos cuadros, cualquier espera a una consulta es tiempo perdido que puede costar una vida."),
          ul([
            "Dolor u opresión en el pecho, especialmente con falta de aire, sudoración o dolor irradiado al brazo o a la mandíbula.",
            "Debilidad súbita de medio cuerpo, desviación de la boca, dificultad para hablar o dolor de cabeza súbito e intenso.",
            "Dificultad para respirar en reposo, labios o cara azulados.",
            "Alteración de la consciencia, convulsiones, traumatismo craneal con pérdida de conocimiento.",
            "Erupción que no desaparece al presionar, con fiebre, rigidez de nuca o confusión.",
            "Sangrado abundante o vómito con sangre.",
            "Cualquier idea de hacerse daño.",
          ]),
          p("Llame al <strong>155</strong> o al <strong>112</strong>. Fuera del horario de consulta, los cuadros menos urgentes los cubre el servicio de atención continuada de su región."),
        ],
      },
    ],
    linksEyebrow: "Global Health Chequia",
    linksH2: "Siguientes pasos",
    linksLead: "Nuestros médicos checos atienden online y le dicen al principio si su molestia puede resolverse a distancia.",
    links: [
      { label: "Videoconsulta con médico checo", href: href("es", "/services/lekar-online-praha") },
      { label: "Nuestros médicos en Chequia", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Chequia", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿Necesita hablar hoy con un médico?",
      text: "Reserve una videoconsulta con un médico colegiado en Chequia. Si su molestia exige consulta presencial, se lo diremos al principio y no al final.",
      primary: { label: "Reservar consulta", href: href("es", "/services/lekar-online-praha") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "Dónde comprobarlo",
    sourcesLead: "Información sobre salud y sobre el sistema checo, y el registro público en el que puede verificar a cualquier médico.",
    sources: [
      { label: "NZIP — Portal Nacional de Información Sanitaria", href: NZIP },
      { label: "Colegio de Médicos checo — lista de médicos", href: CLK_REGISTER },
    ],
    sourcesNote: "Los enlaces abren en el sitio de la institución correspondiente. Global Health no es proveedor de atención urgente y la consulta online no sustituye al servicio de emergencias.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Qué puede resolver realmente un médico online?",
        a: "Molestias agudas habituales en las que deciden la historia y la descripción de los síntomas: infecciones respiratorias sin dificultad para respirar, cuadros digestivos sin signos de alarma, lesiones de piel que puedan mostrarse, cefaleas ya conocidas, ansiedad, continuación de un tratamiento instaurado e interpretación de resultados ya hechos.",
      },
      {
        q: "¿Qué no puede resolver la consulta online?",
        a: "Cuanto exija exploración física o aparato: palpar el abdomen, auscultar el tórax, mirar el oído con otoscopio, valorar un traumatismo o una articulación, medir la tensión, ECG, extracciones. También las revisiones preventivas, en las que la exploración forma parte del acto.",
      },
      {
        q: "¿Sustituye el médico online al registro con un médico de familia?",
        a: "No lo sustituye. El médico de familia garantiza las revisiones preventivas, el seguimiento de las enfermedades crónicas, la vacunación y la historia clínica a lo largo del tiempo. La consulta online es un complemento para situaciones agudas, no un sustituto de esa atención.",
      },
      {
        q: "¿Qué debo preparar para la videoconsulta?",
        a: "La lista de medicamentos incluidos suplementos y dosis, la cronología de las molestias, valores medidos como temperatura o tensión, resultados de pruebas relacionadas, información sobre alergias y un sitio tranquilo con buena luz, especialmente en molestias de piel.",
      },
      {
        q: "¿Cómo compruebo que el médico es realmente médico?",
        a: "En la lista pública del Colegio de Médicos checo. Cualquier profesional que ejerza en Chequia es miembro, así que puede buscar un nombre concreto usted mismo, con nosotros y con cualquier otro servicio.",
      },
      {
        q: "¿Cuándo debo llamar a emergencias en lugar de consultar?",
        a: "Ante dolor torácico, debilidad súbita de medio cuerpo o alteración del habla, dificultad para respirar en reposo, alteración de la consciencia o convulsiones, erupción que no desaparece al presionar con fiebre, sangrado abundante, o ideas de hacerse daño. Llame al 155 o al 112 y no espere a una consulta.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por la MUDr. Romana Pavlů, médica de familia para adultos de Global Health Chequia, y revisado clínicamente por el MUDr. Vojtěch Černý, médico de familia. Este artículo contiene información general sobre las consultas a distancia en Chequia y no constituye asesoramiento médico individual. No sustituye la exploración por un médico que conozca su historia. Global Health no es proveedor de atención urgente. Ante un peligro vital, llame de inmediato al 155 o al 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "medic-online-cehia-ce-rezolva",
  title: "Medic online 24/7 în Cehia: ce rezolvă consultația la distanță și ce nu",
  excerpt:
    "Medicul online se găsește repede, dar nu este potrivit pentru orice. Ce se poate evalua în siguranță prin video, ce ține de cabinet, când sunați la 155 și de ce consultația la distanță nu înlocuiește înscrierea la un medic de familie.",
  seoTitle: "Medic online 24/7 în Cehia: ce rezolvă",
  seoDescription:
    "Ce rezolvă în siguranță o consultație online cu un medic în Cehia, ce cere examinare în cabinet, când sunați la 155 și ce face medicul de familie.",
  category: "Medicină de familie",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Medicină de familie",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Cehia · Ghid de telemedicină",
    h1: "Medic online 24/7",
    deck: "Disponibilitatea este doar jumătate din răspuns. Cealaltă jumătate este care acuze pot fi evaluate la distanță în siguranță — și care sigur nu.",
    intro:
      "Un medic online este un medic cu care vorbiți prin video sau telefon în loc de cabinet. Rezolvă bine <strong>acuzele acute obișnuite</strong>, la care decid anamneza și descrierea simptomelor — infecții respiratorii, tulburări digestive, leziuni cutanate care pot fi arătate, migrenă, anxietate, continuarea unui tratament de durată. Nu rezolvă ce cere <strong>mâinile medicului</strong> — percuția, tușeul rectal, palparea abdomenului de către medic — și, fără aparat, ascultația plămânilor și a inimii. Imagistica și analizele le putem recomanda, iar cu un kit medical acasă și măsurătorile. Nu înlocuiește înscrierea la un medic de familie, de care țin controalele preventive cu examinare fizică.",
    facts: ["Disponibilitate rapidă", "Potrivit pentru acuze acute obișnuite", "Nu înlocuiește medicul de familie"],
    primaryCta: { label: "Programați o consultație video", href: href("ro", "/services/lekar-online-praha") },
    secondaryCta: { label: "Medicii noștri cehi", href: href("ro", "/doctors") },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "O listă concretă de acuze care pot fi evaluate la distanță și una la fel de concretă cu cele care nu pot.",
      "Cum decurge consultația video și ce să pregătiți ca să merite.",
      "De ce consultația online nu înlocuiește medicul de familie la care sunteți înscris — și cum se completează reciproc.",
    ],
    author: { initials: "RP", name: "MUDr. Romana Pavlů", line: "Medic de familie pentru adulți · Global Health Cehia" },
    reviewLine: "Revizuit clinic de MUDr. Vojtěch Černý, medic de familie, Global Health Cehia.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "co-to-je",
        nav: "Ce înseamnă",
        eyebrow: "Delimitare",
        h2: "Ce înseamnă „medic online 24/7”",
        blocks: [
          lead("Înseamnă că o consultație este disponibilă oricând, nu că este disponibilă toată medicina."),
          p("Medicul aflat în consultație online are aceeași pregătire, aceeași răspundere și aceleași obligații profesionale ca în cabinet. Diferă un singur lucru — nu vă are în față. Este decisiv pentru tot ce se recunoaște cu mâinile și cu stetoscopul și aproape irelevant pentru ce se recunoaște din discuție și din privire."),
          p("De aceea telemedicina bine făcută nu sună a „rezolvăm orice”. Sună a „asta rezolvăm acum, asta cere cabinet, iar asta este motiv să mergeți la urgențe”. A treia categorie este cel mai mare câștig al disponibilității rapide: cineva vă spune la timp că nu trebuie să așteptați."),
          warn("Rapiditatea nu este îngrijire de urgență", "Consultația online nu înlocuiește serviciul de ambulanță. În situații care amenință viața sunați imediat la 155 sau 112, nu completați un formular de programare."),
        ],
      },
      {
        id: "co-vyresi",
        nav: "Ce rezolvă",
        eyebrow: "Cazuri potrivite",
        h2: "Ce poate fi evaluat la distanță în siguranță",
        blocks: [
          lead("Situații în care decid anamneza, descrierea acuzelor și, uneori, ceea ce poate fi arătat camerei."),
          ul([
            "<strong>Infecții respiratorii acute</strong> fără dificultate de respirație — secreții nazale, tuse, durere în gât, febră cu evoluție tipică.",
            "<strong>Tulburări digestive</strong> fără semne de deshidratare și fără sânge în scaun.",
            "<strong>Leziuni cutanate</strong> care pot fi arătate la lumină bună — erupții, herpes, acnee, modificări suspecte pentru triaj.",
            "<strong>Migrenă și dureri de cap cunoscute</strong> la un pacient cu diagnostic deja stabilit.",
            "<strong>Anxietate și dispoziție scăzută</strong> — prima evaluare și decizia asupra pasului următor.",
            "<strong>Continuarea unui tratament instituit</strong> într-o boală cronică stabilă.",
            "<strong>Interpretarea rezultatelor</strong> pe care le aveți deja și decizia asupra a ce urmează.",
            "<strong>Evaluarea incapacității temporare de muncă</strong> acolo unde consultația video este o examinare suficientă.",
          ]),
          p(`Incapacitatea de muncă este tratată pe larg într-un articol separat despre <a href="${href("ro", "/blog/neschopenka-concediu-medical-in-cehia")}">cum funcționează eNeschopenka</a>.`),
        ],
      },
      {
        id: "co-nevyresi",
        nav: "Ce nu rezolvă",
        eyebrow: "Limite",
        h2: "Ce nu rezolvă consultația online",
        blocks: [
          lead("Granița nu trece între „la distanță” și „în cabinet”. Trece între ce se poate aprecia din anamneză, din imagine și din aparatele pe care le aveți acasă și ce cere mâinile medicului."),
          p("O bună parte din ce trece drept limită nu este. Pacientul poate fi ghidat pas cu pas să își palpeze singur abdomenul sau să arate amplitudinea mișcării unei articulații, iar asta, împreună cu descrierea durerii, ajunge de obicei pentru a decide pasul următor. Imagistica și analizele le putem recomanda și vă trimitem să le faceți. Iar dacă aveți acasă un <strong>kit medical</strong> — tensiometru, termometru, pulsoximetru, uneori otoscop sau stetoscop digital — consultația se apropie mult de ce ar da cabinetul."),
          ul([
            "<strong>Percuția</strong> și <strong>tușeul rectal</strong> — niciunul nu se face la distanță.",
            "<strong>Palparea abdomenului cu mâna medicului</strong>, când examinarea ghidată de pacient nu ajunge sau se suspectează un abdomen acut.",
            "<strong>Ascultația plămânilor și a inimii</strong> — dacă nu aveți stetoscop digital; cu el ascultăm.",
            "<strong>Evaluările obligatorii</strong> în care examinarea fizică face parte din act prin lege.",
          ]),
          p("La distanță, <strong>anamneza</strong> cântărește mult mai mult decât în cabinet: momentul, evoluția, contextul, medicamentele, ce agravează durerea și ce o calmează. Când din ea reiese că lipsește o examinare sau un aparat, v-o spunem și vă îndrumăm spre cabinet ori spre urgențe. Acesta este rezultatul corect al consultației, nu eșecul ei."),
        ],
      },
      {
        id: "jak-probiha",
        nav: "Cum decurge",
        eyebrow: "Practic",
        h2: "Cum decurge consultația video și ce pregătiți",
        blocks: [
          lead("Zece minute de pregătire cresc utilitatea consultației mai mult decât orice altceva."),
          ul([
            "<strong>Lista medicamentelor</strong> pe care le luați, inclusiv suplimente și dozele lor.",
            "<strong>Cronologia acuzelor</strong> — când a început, ce se agravează, ce ajută.",
            "<strong>Valorile măsurate</strong>, dacă le aveți — temperatură, tensiune, puls, saturație.",
            "<strong>Rezultatele investigațiilor</strong> și scrisorile de externare legate de acuze.",
            "<strong>Lumină bună și un loc liniștit.</strong> La leziunile de piele, lumina contează mai mult decât rezoluția camerei.",
            "<strong>Alergiile</strong> și reacțiile anterioare la medicamente.",
          ]),
          p("Consultația se încheie cu o concluzie și cu o conduită recomandată. Dacă se impune o rețetă, medicul o emite electronic; dacă se impune examinare în cabinet sau analize, primiți o recomandare concretă despre unde și cât de repede."),
          cite(`Informații verificate despre sănătate și despre sistemul ceh: <a href="${NZIP}" rel="nofollow noopener" target="_blank">Portalul Național de Informații în Sănătate</a> (Ministerul Sănătății și ÚZIS).`),
        ],
      },
      {
        id: "praktik",
        nav: "Medicul de familie",
        eyebrow: "Completare, nu înlocuire",
        h2: "Înlocuiește medicul online medicul de familie?",
        blocks: [
          lead("Nu. Iar un serviciu care susține contrariul nu vă spune adevărul."),
          p("Medicul de familie la care sunteți înscris îndeplinește roluri care nu pot fi îndeplinite la distanță: <strong>controale preventive</strong> și evaluări obligatorii cu examinare fizică, vaccinare și ținerea documentației medicale în timp. <strong>Urmărirea bolilor cronice</strong>, în schimb, se poate face în bună măsură la distanță — controale, ajustarea tratamentului, citirea valorilor măsurate acasă —; lipsește doar examinarea fizică propriu-zisă. Înscrierea este și cea care vă dă un medic care vă cunoaște istoricul, nu o singură episodă."),
          p("Consultația online completează asta cu rapiditate: seara, în weekend, în deplasare sau când termenul de programare este mai lung decât durata acuzei. Cea mai bună variantă este să le aveți pe amândouă — înscris la medicul de familie și consultație online pentru acut, între timp."),
          ul([
            "Verificați că medicul cu care vorbiți are drept de liberă practică în Cehia — apartenența la Camera Medicilor este publică.",
            "Întrebați ce include consultația și ce nu, înainte să o plătiți.",
            "Cereți concluzia scrisă a consultației pentru dosarul dumneavoastră.",
          ]),
          cite(`Lista publică a medicilor: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Camera Medicilor din Cehia</a>.`),
        ],
      },
      {
        id: "deti",
        nav: "Copiii",
        eyebrow: "Prudență sporită",
        h2: "Copiii și consultația la distanță",
        blocks: [
          lead("Cele mai multe acuze ale copiilor se pot rezolva la distanță. Ce diferă este pragul: la un copil trimitem la examinare mai devreme decât la un adult."),
          p("Copiii mici se agravează mai repede decât adulții, iar starea lor se apreciază din impresia generală — cum respiră, cum reacționează, cum beau, ce culoare are pielea. O parte se vede prin cameră; o parte sigur nu. De aceea consultația video la un copil servește mai ales pentru ca medicul să decidă cât de repede și unde trebuie mers."),
          ul([
            "<strong>Nou-născutul sau sugarul cu febră</strong> trebuie văzut întotdeauna, fără excepție și fără să așteptați o consultație.",
            "<strong>Respirație rapidă sau dificilă</strong>, tiraj intercostal, geamăt la expir — imediat la medic.",
            "<strong>Refuzul lichidelor, mult mai puține scutece ude, somnolență sau reactivitate neobișnuit de scăzută</strong> — examinare, nu consultație.",
            "<strong>Erupție care nu dispare la apăsare</strong> — sunați la 155.",
          ]),
          p("La copiii mai mari, cu o răceală obișnuită, cu un diagnostic deja cunoscut sau cu o întrebare despre un tratament instituit, consultația la distanță are la fel de mult sens ca la adulți."),
        ],
      },
      {
        id: "urgent",
        nav: "Când sunați la 155",
        eyebrow: "Siguranță",
        h2: "Când nu consultați, ci sunați",
        blocks: [
          lead("În aceste situații, orice așteptare a unei consultații este timp pierdut care poate costa o viață."),
          ul([
            "Durere sau apăsare în piept, mai ales cu lipsă de aer, transpirații sau durere care iradiază în braț ori în mandibulă.",
            "Slăbiciune bruscă a unei jumătăți de corp, gură strâmbă, tulburare de vorbire sau durere de cap bruscă și foarte intensă.",
            "Lipsă de aer în repaus, buze sau față vinete.",
            "Tulburare de conștiență, convulsii, traumatism cranian cu pierderea cunoștinței.",
            "Erupție care nu dispare la apăsare, cu febră, redoare de ceafă sau confuzie.",
            "Sângerare abundentă sau vărsături cu sânge.",
            "Orice gând de a vă face rău.",
          ]),
          p("Sunați la <strong>155</strong> sau <strong>112</strong>. În afara programului, situațiile mai puțin urgente sunt acoperite de serviciul de gardă din regiunea dumneavoastră."),
        ],
      },
    ],
    linksEyebrow: "Global Health Cehia",
    linksH2: "Pașii următori",
    linksLead: "Medicii noștri cehi consultă online și vă spun de la început dacă acuza dumneavoastră poate fi rezolvată la distanță.",
    links: [
      { label: "Consultație video cu un medic ceh", href: href("ro", "/services/lekar-online-praha") },
      { label: "Medicii noștri din Cehia", href: href("ro", "/doctors") },
      { label: "Contactați Global Health Cehia", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Aveți nevoie să vorbiți astăzi cu un medic?",
      text: "Programați o consultație video cu un medic înscris în Cehia. Dacă acuza dumneavoastră cere cabinet, vă spunem la început, nu la sfârșit.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/lekar-online-praha") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "Unde verificați informațiile",
    sourcesLead: "Informații despre sănătate și despre sistemul ceh, plus registrul public în care puteți verifica orice medic.",
    sources: [
      { label: "NZIP — Portalul Național de Informații în Sănătate", href: NZIP },
      { label: "Camera Medicilor din Cehia — lista medicilor", href: CLK_REGISTER },
    ],
    sourcesNote: "Linkurile deschid site-urile instituțiilor competente. Global Health nu este furnizor de îngrijiri de urgență, iar consultația online nu înlocuiește serviciul de ambulanță.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Ce poate rezolva efectiv un medic online?",
        a: "Acuze acute obișnuite la care decid anamneza și descrierea simptomelor: infecții respiratorii fără dificultate de respirație, tulburări digestive fără semne de alarmă, leziuni cutanate care pot fi arătate, dureri de cap cunoscute, anxietate, continuarea unui tratament instituit și interpretarea rezultatelor deja obținute.",
      },
      {
        q: "Ce nu poate rezolva consultația online?",
        a: "Percuția, tușeul rectal și palparea abdomenului cu mâna medicului. Fără stetoscop digital, și ascultația plămânilor și a inimii. Restul se rezolvă de obicei: ghidăm pacientul să facă singur ce e nevoie, recomandăm analize și imagistică, iar cu un kit medical acasă măsurăm tensiunea, saturația și temperatura. Examinarea fizică rămâne la evaluările obligatorii, unde legea o cere.",
      },
      {
        q: "Înlocuiește medicul online înscrierea la un medic de familie?",
        a: "Nu o înlocuiește. Medicul de familie asigură controalele preventive, urmărirea bolilor cronice, vaccinarea și documentația medicală în timp. Consultația online este o completare pentru situații acute, nu un substitut al acestei îngrijiri.",
      },
      {
        q: "Ce pregătesc pentru consultația video?",
        a: "Lista medicamentelor, inclusiv suplimentele și dozele, cronologia acuzelor, valorile măsurate precum temperatura sau tensiunea, rezultatele investigațiilor legate de acuză, informații despre alergii și un loc liniștit, cu lumină bună — mai ales la acuzele cutanate.",
      },
      {
        q: "Cum verific că medicul este într-adevăr medic?",
        a: "În lista publică a Camerei Medicilor din Cehia. Orice medic care profesează în Cehia este membru, așa că puteți căuta singur un nume anume, la noi ca oriunde altundeva.",
      },
      {
        q: "Când sun la ambulanță în loc să consult?",
        a: "La durere în piept, slăbiciune bruscă a unei jumătăți de corp sau tulburare de vorbire, lipsă de aer în repaus, tulburare de conștiență ori convulsii, erupție care nu dispare la apăsare cu febră, sângerare abundentă sau gânduri de a vă face rău. Sunați la 155 sau 112 și nu așteptați o consultație.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Scris de MUDr. Romana Pavlů, medic de familie pentru adulți la Global Health Cehia, și revizuit clinic de MUDr. Vojtěch Černý, medic de familie. Articolul conține informații generale despre consultațiile la distanță în Cehia și nu constituie sfat medical individual. Nu înlocuiește examinarea de către un medic care vă cunoaște istoricul. Global Health nu este furnizor de îngrijiri de urgență. În caz de pericol vital, sunați imediat la 155 sau 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "arzt-online-tschechien-was-moeglich-ist",
  title: "Arzt online 24/7 in Tschechien: was eine Fernsprechstunde löst und was nicht",
  excerpt:
    "Eine Online-Praxis ist schnell erreichbar, aber nicht für alles geeignet. Was sich per Video sicher beurteilen lässt, was in die Praxis gehört, wann Sie 155 rufen und warum eine Fernsprechstunde die Einschreibung bei einer Hausarztpraxis nicht ersetzt.",
  seoTitle: "Arzt online 24/7 in Tschechien: was möglich ist",
  seoDescription:
    "Was eine Online-Sprechstunde in Tschechien sicher löst, was eine Untersuchung vor Ort erfordert, wann Sie 155 rufen und was die Hausarztpraxis leistet.",
  category: "Allgemeinmedizin",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Allgemeinmedizin",
    categoryHref: href("de", "/blog"),
    eyebrow: "Tschechien · Telemedizin-Leitfaden",
    h1: "Arzt online 24/7",
    deck: "Erreichbarkeit ist nur die halbe Antwort. Die andere Hälfte ist, welche Beschwerden sich aus der Ferne sicher beurteilen lassen — und welche ganz sicher nicht.",
    intro:
      "Eine Online-Praxis ist eine Praxis, mit der Sie per Video oder Telefon sprechen statt vor Ort. Gut gelöst werden <strong>häufige akute Beschwerden</strong>, bei denen Vorgeschichte und Ihre Schilderung entscheiden — Atemwegsinfekte, Magen-Darm-Beschwerden, zeigbare Hautveränderungen, Migräne, Angstzustände, Folgerezepte für eine Dauertherapie. Nicht gelöst wird, was <strong>die Hände der Ärztin</strong> braucht — Perkussion, rektale Untersuchung, das ärztliche Abtasten des Bauchs — und ohne Gerät das Abhören von Lunge und Herz. Bildgebung und Laborwerte können wir veranlassen, mit einem Gesundheitsset zu Hause auch die Messungen. Sie ersetzt nicht die Einschreibung bei einer Hausarztpraxis, zu der Vorsorgeuntersuchungen mit körperlicher Untersuchung gehören.",
    facts: ["Schnell erreichbar", "Für häufige akute Beschwerden geeignet", "Kein Ersatz für die Hausarztpraxis"],
    primaryCta: { label: "Videosprechstunde buchen", href: href("de", "/services/lekar-online-praha") },
    secondaryCta: { label: "Unsere tschechischen Ärztinnen und Ärzte", href: href("de", "/doctors") },
    panelChip: "Was dieser Leitfaden abdeckt",
    panelParas: [
      "Eine konkrete Liste von Beschwerden, die sich aus der Ferne beurteilen lassen, und eine ebenso konkrete Liste derer, die es nicht tun.",
      "Wie eine Videosprechstunde abläuft und was Sie vorbereiten, damit sie etwas bringt.",
      "Warum eine Online-Sprechstunde die Hausarztpraxis, bei der Sie eingeschrieben sind, nicht ersetzt — und wie sich beide ergänzen.",
    ],
    author: { initials: "RP", name: "MUDr. Romana Pavlů", line: "Allgemeinmedizinerin für Erwachsene · Global Health Tschechien" },
    reviewLine: "Fachlich geprüft von MUDr. Vojtěch Černý, Allgemeinmediziner, Global Health Tschechien.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "co-to-je",
        nav: "Was es heißt",
        eyebrow: "Abgrenzung",
        h2: "Was „Arzt online 24/7“ tatsächlich heißt",
        blocks: [
          lead("Es heißt, dass eine Sprechstunde rund um die Uhr verfügbar ist, nicht die gesamte Medizin."),
          p("Wer online berät, hat dieselbe Ausbildung, dieselbe Verantwortung und dieselben Berufspflichten wie in der Praxis. Genau eines unterscheidet sich — Sie sitzen nicht gegenüber. Das ist entscheidend für alles, was mit Händen und Stethoskop erkannt wird, und nahezu belanglos für das, was aus Gespräch und Blick erkennbar ist."),
          p("Gute Telemedizin klingt deshalb nicht nach „wir lösen alles“. Sie klingt nach „das klären wir jetzt, das braucht eine Praxis, und das ist ein Grund, in die Notaufnahme zu fahren“. Gerade das Dritte ist der eigentliche Gewinn schneller Erreichbarkeit: jemand sagt Ihnen rechtzeitig, dass Sie nicht warten sollen."),
          warn("Schnelligkeit ist keine Notfallversorgung", "Eine Online-Sprechstunde ersetzt nicht den Rettungsdienst. Rufen Sie bei lebensbedrohlichen Zuständen sofort 155 oder 112 an, nicht ein Buchungsformular."),
        ],
      },
      {
        id: "co-vyresi",
        nav: "Was sie löst",
        eyebrow: "Geeignete Fälle",
        h2: "Was sich aus der Ferne sicher beurteilen lässt",
        blocks: [
          lead("Situationen, in denen Vorgeschichte, Ihre Schilderung und gelegentlich das, was Sie in die Kamera halten können, entscheiden."),
          ul([
            "<strong>Akute Atemwegsinfekte</strong> ohne Atemnot — Schnupfen, Husten, Halsschmerzen, Fieber mit typischem Verlauf.",
            "<strong>Magen-Darm-Beschwerden</strong> ohne Zeichen von Austrocknung und ohne Blut im Stuhl.",
            "<strong>Hautveränderungen</strong>, die sich bei gutem Licht zeigen lassen — Ausschläge, Lippenherpes, Akne, auffällige Veränderungen zur Ersteinschätzung.",
            "<strong>Migräne und bekannte Kopfschmerzen</strong> bei bereits gestellter Diagnose.",
            "<strong>Angst und gedrückte Stimmung</strong> — Ersteinschätzung und Entscheidung über das weitere Vorgehen.",
            "<strong>Fortführung einer eingestellten Therapie</strong> bei stabiler chronischer Erkrankung.",
            "<strong>Besprechung von Befunden</strong>, die Sie bereits haben, und die Entscheidung, was daraus folgt.",
            "<strong>Beurteilung der vorübergehenden Arbeitsunfähigkeit</strong> dort, wo eine Videosprechstunde eine ausreichende Untersuchung ist.",
          ]),
          p(`Die Arbeitsunfähigkeit behandelt ein eigener Artikel dazu, <a href="${href("de", "/blog/neschopenka-krankschreibung-in-tschechien")}">wie die eNeschopenka funktioniert</a>.`),
        ],
      },
      {
        id: "co-nevyresi",
        nav: "Was nicht",
        eyebrow: "Grenzen",
        h2: "Was eine Online-Sprechstunde nicht löst",
        blocks: [
          lead("Die Grenze verläuft nicht zwischen «aus der Ferne» und «in der Praxis». Sie verläuft zwischen dem, was sich aus Vorgeschichte, Kamerabild und den Geräten bei Ihnen zu Hause beurteilen lässt, und dem, was die Hände einer Ärztin braucht."),
          p("Vieles, was als Grenze gilt, ist keine. Man kann Patientinnen Schritt für Schritt anleiten, den eigenen Bauch abzutasten oder den Bewegungsumfang eines Gelenks zu zeigen; zusammen mit der Schilderung des Schmerzes reicht das meist, um das weitere Vorgehen zu entscheiden. Bildgebung und Laborwerte können wir veranlassen und Sie dorthin schicken. Und wenn Sie ein <strong>Gesundheitsset</strong> zu Hause haben — Blutdruckmessgerät, Thermometer, Pulsoximeter, mitunter Otoskop oder digitales Stethoskop — kommt die Sprechstunde dem Praxisbesuch sehr nahe."),
          ul([
            "<strong>Perkussion</strong> und <strong>rektale Untersuchung</strong> — beides ist aus der Ferne nicht möglich.",
            "<strong>Abtasten des Bauchs durch die Hand der Ärztin</strong>, wenn der patientengeführte Befund nicht ausreicht oder ein akutes Abdomen im Raum steht.",
            "<strong>Abhören von Lunge und Herz</strong> — sofern Sie kein digitales Stethoskop haben; mit einem hören wir ab.",
            "<strong>Pflichtbegutachtungen</strong>, bei denen die körperliche Untersuchung gesetzlich Teil der Leistung ist.",
          ]),
          p("Aus der Ferne wiegt die <strong>Vorgeschichte</strong> deshalb weit schwerer als im Sprechzimmer: Zeitpunkt, Verlauf, Zusammenhänge, Medikamente, was den Schmerz verstärkt und was ihn lindert. Zeigt sich dabei, dass eine Untersuchung oder ein Gerät fehlt, sagen wir das und schicken Sie in eine Praxis oder in die Notaufnahme. Das ist das richtige Ergebnis der Sprechstunde, nicht ihr Scheitern."),
        ],
      },
      {
        id: "jak-probiha",
        nav: "Ablauf",
        eyebrow: "Praktisch",
        h2: "Wie eine Videosprechstunde abläuft und was Sie vorbereiten",
        blocks: [
          lead("Zehn Minuten Vorbereitung erhöhen den Nutzen einer Sprechstunde mehr als alles andere."),
          ul([
            "<strong>Eine Liste Ihrer Medikamente</strong>, einschließlich Nahrungsergänzung und Dosierungen.",
            "<strong>Ein Zeitverlauf der Beschwerden</strong> — wann es begann, was schlimmer wird, was hilft.",
            "<strong>Gemessene Werte</strong>, sofern vorhanden — Temperatur, Blutdruck, Puls, Sauerstoffsättigung.",
            "<strong>Befunde und Entlassungsbriefe</strong>, die zu den Beschwerden gehören.",
            "<strong>Gutes Licht und ein ruhiger Ort.</strong> Bei Hautveränderungen zählt Licht mehr als Kameraauflösung.",
            "<strong>Allergien</strong> und frühere Reaktionen auf Medikamente.",
          ]),
          p("Die Sprechstunde endet mit einer Einschätzung und einem empfohlenen Vorgehen. Ist ein Rezept angezeigt, wird es elektronisch ausgestellt; ist eine Untersuchung vor Ort oder eine Blutentnahme angezeigt, erhalten Sie eine konkrete Empfehlung, wohin und wie rasch."),
          cite(`Geprüfte Informationen zu Gesundheit und zum tschechischen System: <a href="${NZIP}" rel="nofollow noopener" target="_blank">Nationales Gesundheitsinformationsportal</a> (Gesundheitsministerium und ÚZIS).`),
        ],
      },
      {
        id: "praktik",
        nav: "Hausarzt vs. online",
        eyebrow: "Ergänzung, kein Ersatz",
        h2: "Ersetzt eine Online-Praxis die Hausarztpraxis?",
        blocks: [
          lead("Nein. Und ein Dienst, der das Gegenteil behauptet, sagt Ihnen nicht die Wahrheit."),
          p("Die Hausarztpraxis, bei der Sie eingeschrieben sind, erfüllt Aufgaben, die aus der Ferne nicht erfüllbar sind: <strong>Vorsorgeuntersuchungen</strong> und Pflichtbegutachtungen mit körperlicher Untersuchung, Impfungen und die Führung der Dokumentation über die Zeit. Die <strong>Begleitung chronischer Erkrankungen</strong> lässt sich dagegen zu großen Teilen aus der Ferne führen — Kontrollen, Anpassung der Therapie, Beurteilung der zu Hause gemessenen Werte —; es fehlt allein die körperliche Untersuchung selbst. Die Einschreibung gibt Ihnen außerdem eine Praxis, die Ihre Geschichte kennt und nicht nur eine Episode."),
          p("Die Online-Sprechstunde ergänzt das um Tempo: abends, am Wochenende, unterwegs, oder wenn die Wartezeit länger ist als die Beschwerden dauern. Am besten haben Sie beides — eingeschrieben in einer Hausarztpraxis, dazwischen die Online-Sprechstunde für Akutes."),
          ul([
            "Prüfen Sie, ob die Praxis, mit der Sie sprechen, in Tschechien zur Berufsausübung berechtigt ist — die Kammermitgliedschaft ist öffentlich abfragbar.",
            "Fragen Sie vor dem Bezahlen, was die Sprechstunde einschließt und was nicht.",
            "Lassen Sie sich die schriftliche Einschätzung für Ihre Unterlagen geben.",
          ]),
          cite(`Öffentliches Ärzteverzeichnis: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Tschechische Ärztekammer</a>.`),
        ],
      },
      {
        id: "deti",
        nav: "Kinder",
        eyebrow: "Besondere Vorsicht",
        h2: "Kinder und Fernsprechstunden",
        blocks: [
          lead("Die meisten Beschwerden von Kindern lassen sich aus der Ferne klären. Anders ist die Schwelle: Bei einem Kind schicken wir früher zur Untersuchung als bei Erwachsenen."),
          p("Kleine Kinder verschlechtern sich schneller als Erwachsene, und ihr Zustand wird aus dem Gesamteindruck beurteilt — wie sie atmen, wie sie reagieren, wie sie trinken, welche Hautfarbe sie haben. Ein Teil davon ist über die Kamera sichtbar, ein Teil ganz sicher nicht. Eine Videosprechstunde beim Kind dient deshalb vor allem der Entscheidung, wie schnell und wohin Sie fahren müssen."),
          ul([
            "<strong>Ein Neugeborenes oder ein Säugling mit Fieber</strong> gehört immer ärztlich gesehen, ausnahmslos und ohne auf eine Sprechstunde zu warten.",
            "<strong>Schnelle oder angestrengte Atmung</strong>, Einziehungen zwischen den Rippen, Stöhnen beim Ausatmen — sofort ärztlich vorstellen.",
            "<strong>Trinkverweigerung, deutlich weniger nasse Windeln, Schläfrigkeit oder ungewöhnlich geringe Reaktion</strong> — Untersuchung, keine Sprechstunde.",
            "<strong>Ein Ausschlag, der sich nicht wegdrücken lässt</strong> — rufen Sie 155.",
          ]),
          p("Bei älteren Kindern mit einer gewöhnlichen Erkältung, bei bereits bekannter Diagnose oder bei einer Frage zur eingestellten Therapie ist die Fernsprechstunde ebenso sinnvoll wie bei Erwachsenen."),
        ],
      },
      {
        id: "urgent",
        nav: "Wann 155 rufen",
        eyebrow: "Sicherheit",
        h2: "Wann nicht beraten, sondern anrufen",
        blocks: [
          lead("Bei diesen Bildern ist jedes Warten auf eine Sprechstunde verlorene Zeit, die ein Leben kosten kann."),
          ul([
            "Schmerz oder Druck in der Brust, besonders mit Atemnot, Schweißausbruch oder Ausstrahlung in Arm oder Kiefer.",
            "Plötzliche halbseitige Schwäche, hängender Mundwinkel, Sprachstörung oder plötzlicher heftigster Kopfschmerz.",
            "Atemnot in Ruhe, bläuliche Lippen oder Gesichtshaut.",
            "Bewusstseinsstörung, Krampfanfall, Kopfverletzung mit Bewusstlosigkeit.",
            "Ein Ausschlag, der sich nicht wegdrücken lässt, mit Fieber, Nackensteife oder Verwirrtheit.",
            "Starke Blutung oder Bluterbrechen.",
            "Jeder Gedanke an Selbstverletzung.",
          ]),
          p("Rufen Sie <strong>155</strong> oder <strong>112</strong>. Außerhalb der Sprechzeiten übernimmt der ärztliche Bereitschaftsdienst Ihrer Region die weniger dringenden Fälle."),
        ],
      },
    ],
    linksEyebrow: "Global Health Tschechien",
    linksH2: "Wie es weitergeht",
    linksLead: "Unsere tschechischen Ärztinnen und Ärzte beraten online und sagen Ihnen zu Beginn, ob Ihr Anliegen aus der Ferne lösbar ist.",
    links: [
      { label: "Videosprechstunde mit einer tschechischen Praxis", href: href("de", "/services/lekar-online-praha") },
      { label: "Unsere Ärztinnen und Ärzte in Tschechien", href: href("de", "/doctors") },
      { label: "Global Health Tschechien kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Heute ärztlichen Rat nötig?",
      text: "Buchen Sie eine Videosprechstunde bei einer in Tschechien registrierten Praxis. Braucht Ihr Anliegen eine Untersuchung vor Ort, sagen wir das am Anfang und nicht am Ende.",
      primary: { label: "Termin buchen", href: href("de", "/services/lekar-online-praha") },
      secondary: { label: "Ärztinnen und Ärzte ansehen", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Wo Sie es prüfen können",
    sourcesLead: "Informationen zu Gesundheit und zum tschechischen System sowie das öffentliche Register, in dem Sie jede Praxis überprüfen können.",
    sources: [
      { label: "NZIP — Nationales Gesundheitsinformationsportal", href: NZIP },
      { label: "Tschechische Ärztekammer — Ärzteverzeichnis", href: CLK_REGISTER },
    ],
    sourcesNote: "Die Links führen auf die Seiten der jeweiligen Institution. Global Health ist kein Anbieter von Notfallversorgung, und eine Online-Sprechstunde ersetzt nicht den Rettungsdienst.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Was kann eine Online-Praxis tatsächlich lösen?",
        a: "Häufige akute Beschwerden, bei denen Vorgeschichte und Schilderung entscheiden: Atemwegsinfekte ohne Atemnot, Magen-Darm-Beschwerden ohne Warnzeichen, zeigbare Hautveränderungen, bekannte Kopfschmerzen, Angstzustände, die Fortführung einer eingestellten Therapie und die Besprechung bereits vorliegender Befunde.",
      },
      {
        q: "Was kann eine Online-Sprechstunde nicht lösen?",
        a: "Perkussion, rektale Untersuchung und das Abtasten des Bauchs durch die Hand der Ärztin. Ohne digitales Stethoskop auch das Abhören von Lunge und Herz. Das meiste Übrige lässt sich lösen: Wir leiten Sie an, das Nötige selbst zu tun, veranlassen Labor und Bildgebung, und mit einem Gesundheitsset messen wir Blutdruck, Sättigung und Temperatur. Die körperliche Untersuchung bleibt bei Pflichtuntersuchungen, wo sie gesetzlich zur Leistung gehört.",
      },
      {
        q: "Ersetzt eine Online-Praxis die Einschreibung bei einer Hausarztpraxis?",
        a: "Nein. Die Hausarztpraxis leistet Vorsorgeuntersuchungen, die Begleitung chronischer Erkrankungen, Impfungen und die fortlaufende Dokumentation. Die Online-Sprechstunde ist eine Ergänzung für akute Situationen, kein Ersatz für diese Versorgung.",
      },
      {
        q: "Was soll ich für die Videosprechstunde vorbereiten?",
        a: "Die Liste der eingenommenen Medikamente samt Nahrungsergänzung und Dosierungen, den Zeitverlauf der Beschwerden, gemessene Werte wie Temperatur oder Blutdruck, Befunde zugehöriger Untersuchungen, Angaben zu Allergien sowie einen ruhigen Ort mit gutem Licht — besonders bei Hautbeschwerden.",
      },
      {
        q: "Wie prüfe ich, ob die Person wirklich Ärztin oder Arzt ist?",
        a: "Im öffentlichen Verzeichnis der Tschechischen Ärztekammer. Alle in Tschechien tätigen Ärztinnen und Ärzte sind Mitglied, Sie können einen konkreten Namen also selbst nachschlagen — bei uns wie überall sonst.",
      },
      {
        q: "Wann sollte ich statt einer Sprechstunde den Rettungsdienst rufen?",
        a: "Bei Brustschmerz, plötzlicher halbseitiger Schwäche oder Sprachstörung, Atemnot in Ruhe, Bewusstseinsstörung oder Krampfanfall, einem nicht wegdrückbaren Ausschlag mit Fieber, starker Blutung oder Gedanken an Selbstverletzung. Rufen Sie 155 oder 112 und warten Sie nicht auf eine Sprechstunde.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von MUDr. Romana Pavlů, Allgemeinmedizinerin für Erwachsene bei Global Health Tschechien, fachlich geprüft von MUDr. Vojtěch Černý, Allgemeinmediziner. Der Artikel enthält allgemeine Informationen zu Fernsprechstunden in Tschechien und ist keine individuelle ärztliche Beratung. Er ersetzt nicht die Untersuchung durch eine Praxis, die Ihre Vorgeschichte kennt. Global Health ist kein Anbieter von Notfallversorgung. Rufen Sie bei akuter Lebensgefahr sofort 155 oder 112 an.",
  } satisfies Article,
};

export const CZ_LEKAR_ONLINE: PostSet = {
  key: "cz-lekar-online",
  countryCode: "cz",
  targetKeyword: "lékař online 24/7",
  searchVolume: 340,
  keywordDifficulty: 1,
  evidence:
    "cs/2203 expansion 2026-08-04: 'lékař online 24 7' 170 KD 0 and 'lékař online 24/7' 170 KD 1 — same intent, ~340/mo combined. Replaced the original pick 'praktický lékař online' (KD 5, no volume returned). Head term 'online lékař' 880/mo is KD 28, above the ceiling for 57 referring domains, so it is the term this grows into rather than the target. SERP page 1 is provider homepages and directories only (praktickylekar.online, mojeambulance.cz, euc.cz, znamylekar.cz, navstevalekare.cz, zpmvcr.cz). GSC: cluster at pos 13.4 on /czechia/cs/gp-consultation-online.",
  serviceSlug: "lekar-online-praha",
  authorDoctorId: "cmqz4mk98007801lugo7c4y30",
  authorDisplayName: "MUDr. Romana Pavlů",
  reviewerDoctorId: "cmqz2vn0j006901lu9zla3zmp",
  reviewerDisplayName: "MUDr. Vojtěch Černý",
  posts: [cs, en, pt, es, roPost, de],
};
