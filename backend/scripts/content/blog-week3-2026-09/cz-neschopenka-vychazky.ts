/**
 * Czechia — Week 3 editorial article.
 *
 * Primary keyword: "neschopenka vycházky" — 390/mo, KD 0, informational.
 * Secondary: "kontrola nemocenské po 22 hodině" — 590/mo, KD 0;
 *            "neomezené vycházky na neschopence" — 170/mo, KD 0.
 * OpenSEO research 2026-09-07 (location 2203, cs). SERP: ČSSZ, law blogs
 * and personal-finance press; AI Overview present. Angle: the legal rules
 * as written, plus what actually happens when a check comes and you are out.
 *
 * Facts anchored to zákon č. 187/2006 Sb. (§ 56, § 64, § 125, § 128),
 * zákoník práce (§ 192, § 301a, § 52 h, § 57) and ČSSZ pages, all read
 * 2026-09-07. Stays separate from the existing eNeschopenka process guide
 * and the 2026 calculation article.
 */
import { cite, lead, p, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const CSSZ_NEMOC = "https://www.cssz.gov.cz/nemoc-snadne-a-prehledne";
const CSSZ_FAQ = "https://www.cssz.gov.cz/-/nejcastejsi-otazky-k-docasne-pracovni-neschopnosti";
const CSSZ_NEMOCENSKE = "https://www.cssz.gov.cz/nemocenske";
const ZNP_56 = "https://www.mesec.cz/zakony/zakon-o-nemocenskem-pojisteni/f3033969/";
const ZNP_125 = "https://www.mesec.cz/zakony/zakon-o-nemocenskem-pojisteni/f3034964/";
const ZP_192 = "https://www.pracepropravniky.cz/zakony/zakonik-prace-uplne-zneni/paragraf-192/";
const SUIP_301A =
  "https://www.suip.cz/vsechny-clanky/-/asset_publisher/BwIpyjT9IXe0/content/vypoved-pro-poruseni-jine-povinnosti-zamestnance-stanovene-v-301a-zakoniku-pra-1";

const base = "https://www.myglobalhealth.online/czechia/cs";
const links = {
  blog: `${base}/blog`,
  doctors: `${base}/doctors`,
  contact: `${base}/contact`,
  service: `${base}/services/neschopenka-online`,
  processGuide: `${base}/blog/neschopenka-jak-funguje-eneschopenka`,
  calcGuide: `${base}/blog/vypocet-nemocenske-2026-co-plati-zamestnavatel-a-co-cssz`,
};
const AUTHOR = { initials: "GH", name: "Global Health Medical Team", line: "Global Health" } as const;

const cs: LocalePost = {
  locale: "CS",
  slug: "neschopenka-vychazky-pravidla-kontrola",
  title: "Vycházky na neschopence: kolik hodin, kdy chodí kontrola a co když vás nezastihne",
  excerpt:
    "Šest hodin denně mezi 7. a 19. hodinou, kontrola kdykoli včetně večera a víkendu. Co přesně říká zákon, co je mýtus a co dělat, když kontrola zazvonila u prázdného bytu.",
  seoTitle: "Vycházky na neschopence: pravidla a kontroly 2026",
  seoDescription:
    "Kolik hodin vycházek lékař povolí, zda existují neomezené vycházky, kdy může přijít kontrola z OSSZ a co hrozí, když vás doma nezastihne.",
  category: "Praktické lékařství",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Praktické lékařství",
    categoryHref: links.blog,
    eyebrow: "Česko · Průvodce neschopenkou",
    h1: "Vycházky na neschopence: pravidla, kontroly a co dělat, když vás nezastihnou",
    deck: "Zákon dovoluje nejvýše šest hodin vycházek denně mezi 7. a 19. hodinou. Kontrola může přijít kdykoli, i v sobotu večer.",
    intro:
      "<strong>Vycházky na neschopence</strong> povoluje ošetřující lékař, a to <strong>nejvýše 6 hodin denně v době od 7 do 19 hodin</strong>. Mimo tyto hodiny máte být na adrese, kterou jste lékaři nahlásili. Kontrolovat vás může zaměstnavatel v prvních 14 dnech a OSSZ po celou dobu neschopnosti, bez ohledu na denní dobu. Tzv. neomezené vycházky zákon nezná, existuje jen úzká výjimka se souhlasem OSSZ. Pokud vás kontrola nezastihne, nechá vám oznámení a čeká na vaše vysvětlení.",
    facts: [
      "Maximálně 6 hodin vycházek denně, jen mezi 7:00 a 19:00",
      "Kontrola z OSSZ může přijít kdykoli, i o víkendu nebo večer",
      "Za porušení režimu hrozí krácení nemocenské až na 100 dnů a pokuta do 20 000 Kč",
    ],
    primaryCta: { label: "Oficiální pravidla ČSSZ", href: CSSZ_NEMOC },
    secondaryCta: { label: "Jak funguje eNeschopenka", href: links.processGuide },
    panelChip: "Rychlé vysvětlení",
    panelParas: [
      "Vycházky nedostanete automaticky. Zapisuje je lékař do eNeschopenky, včetně konkrétních hodin.",
      "Mimo povolené hodiny se zdržujete doma. Na zvonku a schránce musí být vaše jmenovka.",
      "Změna adresy nebo hodin jde jen přes lékaře, nikdy zpětně.",
    ],
    author: AUTHOR,
    reviewLine: "Před publikací je nutná odborná a jazyková kontrola.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "pravidla",
        nav: "Základní pravidla",
        eyebrow: "§ 56 zákona o nemocenském pojištění",
        h2: "Kolik hodin vycházek na neschopence můžete mít",
        blocks: [
          lead("Zákon je zde nezvykle konkrétní: šest hodin denně, mezi sedmou ráno a sedmou večer, a přesný úsek určí lékař."),
          p("Lékař nemusí povolit vůbec nic. Pokud vycházky dostanete, mohou být v jednom bloku (třeba 13:00 až 19:00) nebo rozdělené. Platí každý den, i o víkendu, a nepřenášejí se: když v pondělí nikam nejdete, v úterý nemáte dvanáct hodin."),
          ul([
            "<strong>Maximum:</strong> 6 hodin denně, vždy mezi 7:00 a 19:00.",
            "<strong>Kdo rozhoduje:</strong> ošetřující lékař, zápisem do eNeschopenky.",
            "<strong>Kde vycházky platí:</strong> zákon neomezuje vzdálenost od adresy, jen čas. Cesta k lékaři nebo na vyšetření je součástí léčebného režimu.",
            "<strong>Mimo vycházky:</strong> jste na nahlášené adrese. Nemusí to být trvalé bydliště, ale musí být uvedená v neschopence.",
          ]),
          cite("Pravidla ověřena 7. září 2026 v <a href=\"" + ZNP_56 + "\" rel=\"nofollow noopener\" target=\"_blank\">§ 56 zákona č. 187/2006 Sb.</a> a na stránce <a href=\"" + CSSZ_NEMOC + "\" rel=\"nofollow noopener\" target=\"_blank\">ČSSZ Nemoc snadno a přehledně</a>."),
        ],
      },
      {
        id: "neomezene",
        nav: "Neomezené vycházky",
        eyebrow: "Co zákon nezná",
        h2: "Existují neomezené vycházky?",
        blocks: [
          lead("Ne v tom smyslu, jak se o nich mluví v diskuzích. Zákon má jen jednu výjimku a je úzká."),
          p("Podle druhé věty § 56 odst. 6 může lékař ve výjimečných případech povolit, abyste si dobu vycházek volili podle aktuálního zdravotního stavu. Týká se to mimořádně náročného léčebného plánu, probíhající intenzivní léčby, nepříznivých vedlejších účinků léčby nebo celkově závažného stavu. Zpravidla jde o onkologické pacienty nebo lidi po náročných operacích."),
          p("Zůstávají dvě podmínky: žádáte vy a lékař souhlasí, a OSSZ dá předchozí písemný souhlas. Bez něj režim neplatí. Limit šesti hodin v době od 7 do 19 hodin platí dál; volíte si pouze, kdy je vyčerpáte."),
          warn("Pozor na rady z internetu", "Návody „jak získat neomezené vycházky“ obvykle popisují právě tuhle výjimku, jen bez podmínek. Pokud nesplňujete zdravotní důvod, lékař vám ji povolit nemůže a OSSZ ji neschválí."),
        ],
      },
      {
        id: "kontrola",
        nav: "Kdy chodí kontrola",
        eyebrow: "Zaměstnavatel a OSSZ",
        h2: "Kdo vás kontroluje a kdy může přijít",
        blocks: [
          lead("Prvních 14 dní může kontrolovat zaměstnavatel. OSSZ může přijít kdykoli po celou dobu neschopnosti."),
          p("V prvních 14 kalendářních dnech vám zaměstnavatel platí náhradu mzdy, a proto má podle § 192 zákoníku práce právo ověřit, že jste doma a dodržujete vycházky. Kontroluje pouze pobyt a dodržení vycházek, nikoli léčbu. Když zjistí porušení, sepíše záznam a pošle ho vám, OSSZ i lékaři."),
          p("OSSZ kontroluje celý režim, včetně léčebného, a to od prvního dne až do ukončení neschopnosti. Na dotaz, jestli může kontrola přijít večer nebo o víkendu, odpovídá ČSSZ přímo: možnost kontroly není omezena na běžnou pracovní dobu a kontrolor může přijít i o víkendu nebo mimo pracovní dobu. Otázka „kontrola po 22. hodině“ tedy nemá v zákoně hranici. Pokud máte vycházky do 19:00, ve 22:00 jste prostě doma."),
          ul([
            "Podle § 64 zákona o nemocenském pojištění musíte kontrolu umožnit a poskytnout součinnost, tedy prokázat totožnost.",
            "Nefunkční zvonek nebo chybějící jmenovka jdou k vaší tíži, protože označení bytu jmenovkou je vaše zákonná povinnost.",
          ]),
          cite("Zdroj: <a href=\"" + CSSZ_FAQ + "\" rel=\"nofollow noopener\" target=\"_blank\">Nejčastější otázky ČSSZ k dočasné pracovní neschopnosti</a>, <a href=\"" + ZP_192 + "\" rel=\"nofollow noopener\" target=\"_blank\">§ 192 zákoníku práce</a> a <a href=\"" + CSSZ_NEMOCENSKE + "\" rel=\"nofollow noopener\" target=\"_blank\">ČSSZ Nemocenské (povinnosti pojištěnce)</a>, čteno 7. září 2026."),
        ],
      },
      {
        id: "nezastizeni",
        nav: "Když vás nezastihnou",
        eyebrow: "Postup OSSZ",
        h2: "Kontrola přišla a vy jste nebyli doma",
        blocks: [
          lead("Nejdřív přijde písemná výzva, ne trest. Rozhoduje, jak rychle a jak věrohodně reagujete."),
          p("Podle ČSSZ nechají pracovníci OSSZ v případě nezastižení písemné oznámení s výzvou, abyste se ozvali. Důvody nepřítomnosti OSSZ posoudí a teprve potom případně zahájí správní řízení. Návštěva lékaře, vyšetření v nemocnici nebo hospitalizace jsou důvody, které se dají doložit. „Byl jsem si jen pro rohlíky“ mimo povolené hodiny důvod není."),
          p("Ozvěte se co nejdřív, ideálně týž den, a mějte po ruce doklad: lékařskou zprávu, žádanku, propouštěcí zprávu. Pokud jste byli doma a jen jste neslyšeli zvonek, řekněte to rovnou a zkontrolujte, jestli zvonek funguje a nese vaše jméno."),
          warn("Co se stane při prokázaném porušení", "OSSZ může nemocenské krátit nebo odejmout ode dne porušení, nejdéle na 100 kalendářních dnů. Za porušení režimu nebo odmítnutí součinnosti je možná pokuta až 20 000 Kč. Zaměstnavatel může v prvních 14 dnech snížit nebo neposkytnout náhradu mzdy a při zvlášť hrubém porušení dát výpověď do jednoho měsíce od zjištění."),
          cite("<a href=\"" + ZNP_125 + "\" rel=\"nofollow noopener\" target=\"_blank\">§ 125 a § 128 zákona o nemocenském pojištění</a>, <a href=\"" + SUIP_301A + "\" rel=\"nofollow noopener\" target=\"_blank\">výklad SÚIP k § 301a zákoníku práce</a> a <a href=\"" + CSSZ_NEMOCENSKE + "\" rel=\"nofollow noopener\" target=\"_blank\">stránka ČSSZ Nemocenské</a>."),
        ],
      },
      {
        id: "zmeny",
        nav: "Změna adresy a hodin",
        eyebrow: "Praktické situace",
        h2: "Jak změnit adresu, hodiny vycházek nebo odjet k rodičům",
        blocks: [
          lead("Všechno jde jen přes ošetřujícího lékaře a vždy dopředu."),
          ul([
            "<strong>Změna adresy:</strong> požádejte lékaře předem, zapíše ji do eNeschopenky. V prvních 14 dnech změnu navíc oznamte zaměstnavateli.",
            "<strong>Změna hodin vycházek:</strong> stejně, přes lékaře. Zpětně to nejde, kontrola porovnává skutečnost se zápisem v den návštěvy.",
            "<strong>Pobyt v cizině:</strong> vyžaduje předchozí souhlas OSSZ, ne jen lékaře.",
            "<strong>Hospitalizace nebo lázně:</strong> při přijetí do lůžkové péče se o změnu nežádá. Po propuštění ohlásíte lékaři, kde se zdržujete.",
          ]),
          p("Na psa a zahradu zákon výslovně nemyslí. Platí obecné pravidlo: mimo byt pouze v povolených hodinách, a ty začínají nejdříve v 7:00. Pokud potřebujete vycházet dřív, domluvte hodiny s lékařem podle toho."),
          cite("<a href=\"" + ZNP_56 + "\" rel=\"nofollow noopener\" target=\"_blank\">§ 56 odst. 3 zákona č. 187/2006 Sb.</a> (změna místa pobytu, pobyt v cizině, hospitalizace) a <a href=\"" + CSSZ_NEMOCENSKE + "\" rel=\"nofollow noopener\" target=\"_blank\">ČSSZ Nemocenské</a>."),
          p("Pokud řešíte samotné vystavení nebo prodloužení neschopenky, lékaři Global Health v Praze ji umí posoudit i online, viz <a href=\"" + links.service + "\">neschopenka online</a>. Vycházky ale zapisuje výhradně lékař, který neschopenku vede, a rozhoduje podle vašeho stavu, ne podle přání."),
        ],
      },
    ],
    linksEyebrow: "Global Health Česko",
    linksH2: "Neschopenka a lékařské posouzení",
    linksLead: "Lékař posuzuje zdravotní stav a vycházky. Kontroly a dávky řeší zaměstnavatel a OSSZ.",
    links: [
      { label: "Jak funguje eNeschopenka krok za krokem", href: links.processGuide },
      { label: "Výpočet nemocenské 2026", href: links.calcGuide },
      { label: "Neschopenka online", href: links.service },
      { label: "Lékaři v Česku", href: links.doctors },
      { label: "Kontaktovat Global Health", href: links.contact },
    ],
    ctaBox: {
      h3: "Potřebujete posoudit neschopenku?",
      text: "Lékař posoudí váš stav a v odůvodněných případech vystaví nebo prodlouží neschopenku online.",
      primary: { label: "Objednat posouzení", href: links.service },
      secondary: { label: "Zobrazit lékaře", href: links.doctors },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Pravidla ověřena 7. září 2026",
    sourcesLead: "Text vychází ze zákona a z výkladu ČSSZ.",
    sources: [
      { label: "ČSSZ — Nemoc snadno a přehledně", href: CSSZ_NEMOC },
      { label: "ČSSZ — Nejčastější otázky k dočasné pracovní neschopnosti", href: CSSZ_FAQ },
      { label: "ČSSZ — Nemocenské", href: CSSZ_NEMOCENSKE },
      { label: "Zákon č. 187/2006 Sb., § 56 (režim a vycházky)", href: ZNP_56 },
      { label: "Zákon č. 187/2006 Sb., § 125 a § 128 (krácení a pokuty)", href: ZNP_125 },
      { label: "Zákoník práce, § 192 (kontrola zaměstnavatelem)", href: ZP_192 },
      { label: "SÚIP — výpověď pro porušení § 301a", href: SUIP_301A },
    ],
    sourcesNote: "Konkrétní případ vždy ověřte u své OSSZ nebo ošetřujícího lékaře.",
    faqEyebrow: "Časté otázky",
    faqH2: "Vycházky a kontroly na neschopence",
    faqs: [
      { q: "Může kontrola přijít po 22. hodině?", a: "Zákon denní dobu kontroly neomezuje a ČSSZ výslovně uvádí, že kontrolor může přijít mimo pracovní dobu i o víkendu. Vycházky ale končí nejpozději v 19:00, takže večer máte být doma." },
      { q: "Co když kontrola přijde a já spím?", a: "Zákon ukládá kontrolu umožnit a poskytnout součinnost; zvonek a jmenovka jsou vaše povinnost. Pokud vás kontrola nezastihne, nechá výzvu a OSSZ posoudí důvody." },
      { q: "Můžu si vycházky přesunout, když mám ten den lékaře?", a: "Cesta na vyšetření je součástí léčebného režimu a nepočítá se jako vycházka. Trvalou změnu hodin ale musí zapsat lékař dopředu." },
      { q: "Jak dlouho může OSSZ krátit nemocenské?", a: "Ode dne porušení nejdéle na 100 kalendářních dnů. Vedle toho je možná pokuta až 20 000 Kč a v prvních 14 dnech postih od zaměstnavatele." },
    ],
    disclaimerTitle: "Zdravotní a právní upozornění",
    disclaimer:
      "Článek vznikl s podporou AI a před publikací vyžaduje odbornou a jazykovou kontrolu. Jde o obecné informace platné k září 2026, ne o rozhodnutí OSSZ, právní poradenství ani záruku vystavení neschopenky nebo povolení vycházek.",
  } satisfies Article,
};

export const CZ_NESCHOPENKA_VYCHAZKY: PostSet = {
  key: "cz-neschopenka-vychazky",
  countryCode: "cz",
  targetKeyword: "neschopenka vycházky",
  searchVolume: 390,
  keywordDifficulty: 0,
  evidence:
    "OpenSEO 2026-09-07 (2203/cs): 'neschopenka vycházky' 390/KD0; 'kontrola nemocenské po 22 hodině' 590/KD0; 'neomezené vycházky na neschopence' 170/KD0; 'jak získat neomezené vycházky' 210/KD0. Administrative, country-specific, separate from the existing eNeschopenka process and 2026 calculation posts.",
  serviceSlug: "neschopenka-online",
  authorDoctorId: "cmqz2vn0j006901lu9zla3zmp",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmqz4mk98007801lugo7c4y30",
  reviewerDisplayName: "MUDr. Romana Pavlů",
  posts: [cs],
};
