/**
 * Czechia — article 1 of 2.
 *
 * Target keyword: "neschopenka" — 2,400/mo, KD 10, informational, CPC €2.27
 * (OpenSEO / DataForSEO, location 2203, language cs, 2026-08-04).
 * Cluster confirmed by the same expansion run, all KD <= 18:
 *   elektronická neschopenka 1,600 KD 0 · e neschopenka 1,600 KD 0 ·
 *   jak zjistit kdy mi přijde nemocenská 1,300 KD 5 · čssz nemocenská 720 KD 10 ·
 *   neschopenka zpětně 590 KD 0 · dlouhodobá nemocenská 480 KD 5 ·
 *   neschopenka vycházky 390 KD 0 · neschopenka po telefonu 320 KD 2 ·
 *   jak funguje neschopenka 210 KD 4 · vystavení neschopenky 70 KD 0.
 *
 * Why it can rank: page 1 is ČSSZ itself plus news/HR/law explainers
 * (e15.cz, sloneek.cz, dostupnyadvokat.cz, cmkos.cz) and one clinic blog
 * (mediclinic.cz). Nothing on page 1 is written by a praktický lékař who
 * actually issues the document. Search Console already shows the domain at
 * position 46 for "vystavení neschopenky" on /czechia/cs/services/neschopenka-online.
 *
 * No figures anywhere: no percentages, no denní vyměřovací základ, no length
 * of podpůrčí doba, no number of employer-paid days. Those are statutory,
 * they move, and they are not sourced here — every numeric question points at
 * ČSSZ instead.
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "./template.js";
import type { LocalePost, PostSet } from "./types.js";

const CSSZ_NEMOCENSKE = "https://www.cssz.gov.cz/nemocenske";
const CSSZ_EPORTAL_DPN = "https://eportal.cssz.cz/web/portal/-/sluzby/informace-o-docasne-pracovni-neschopnosti";
const CLK_REGISTER = "https://www.lkcr.cz/seznam-lekaru";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/czechia/${lang}${path}`;

const cs: LocalePost = {
  locale: "CS",
  slug: "neschopenka-jak-funguje-eneschopenka",
  title: "Neschopenka: jak funguje eNeschopenka, vycházky a výplata nemocenské",
  excerpt:
    "Neschopenku vystavuje elektronicky ošetřující lékař a odesílá ji přímo ČSSZ. Vysvětlujeme, kdo ji smí vystavit, jak se o ní dozví zaměstnavatel, jak fungují vycházky a proč se zpětné vystavení řeší jinak než ostatní případy.",
  seoTitle: "Neschopenka: jak funguje eNeschopenka (2026)",
  seoDescription:
    "Jak funguje elektronická neschopenka: kdo ji smí vystavit, jak se o ní dozví zaměstnavatel, pravidla vycházek a kdy lze neschopenku vystavit zpětně.",
  category: "Praktické lékařství",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Praktické lékařství",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Česko · Průvodce pro zaměstnance",
    h1: "Neschopenka a jak dnes funguje",
    deck: "Dočasná pracovní neschopnost je od roku 2020 plně elektronická. Papír už nikam nenosíte — nese ho za vás lékař, do systému ČSSZ.",
    intro:
      "Neschopenka je rozhodnutí o <strong>dočasné pracovní neschopnosti</strong>, které vystavuje váš ošetřující lékař, pokud vás zdravotní stav znemožňuje vykonávat práci. Vystavuje se elektronicky jako <strong>eNeschopenka</strong>: lékař ji odešle přímo <strong>České správě sociálního zabezpečení (ČSSZ)</strong>, zaměstnavatel se o ní dozví z ePortálu ČSSZ a vy nemusíte roznášet žádné díly formuláře. V první fázi vám náleží náhrada mzdy od zaměstnavatele, od zákonem stanoveného dne přebírá výplatu nemocenského ČSSZ.",
    facts: ["Vystavuje ošetřující lékař", "Odesílá se elektronicky ČSSZ", "Zaměstnavatel ji vidí v ePortálu"],
    primaryCta: { label: "Objednat online konzultaci", href: href("cs", "/services/neschopenka-online") },
    secondaryCta: { label: "Nemocenské na webu ČSSZ", href: CSSZ_NEMOCENSKE },
    panelChip: "Co v článku najdete",
    panelParas: [
      "Kdo smí neschopenku vystavit a proč to není nikdy administrativní pracovník ani zaměstnavatel.",
      "Jak se informace dostane k zaměstnavateli a kde si sami zkontrolujete, v jakém stavu vaše neschopenka je.",
      "Výše nemocenského, délka podpůrčí doby ani počet dnů hrazených zaměstnavatelem tu nejsou uvedeny. Jsou dány zákonem, mění se, a proto na ně odkazujeme přímo na ČSSZ.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Praktický lékař · Global Health Česko" },
    reviewLine: "Odborně zkontrolovala MUDr. Romana Pavlů, praktická lékařka pro dospělé, Global Health Česko.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "co-to-je",
        nav: "Co to je",
        eyebrow: "Základ",
        h2: "Co neschopenka vlastně je",
        blocks: [
          lead("Neschopenka není omluvenka. Je to rozhodnutí lékaře o tom, že váš zdravotní stav vám dočasně neumožňuje vykonávat vaši práci."),
          p("Rozhoduje o ní <strong>ošetřující lékař</strong> — nejčastěji praktický lékař, ale i specialista, který vás pro danou diagnózu léčí, nebo lékař v nemocnici při hospitalizaci. Rozhodnutí vychází z vyšetření a z diagnózy, nikoli z toho, jak dlouho si volno přejete."),
          p("Od roku 2020 se vystavuje výhradně elektronicky. Lékař odešle hlášení o vzniku dočasné pracovní neschopnosti do systému ČSSZ, odkud si ho převezme jak okresní správa sociálního zabezpečení, tak váš zaměstnavatel. Tím skončilo roznášení papírových dílů, které dřív bylo nejčastější příčinou zpoždění výplaty."),
          warn("Neschopenka a dovolená nejsou zaměnitelné", "Neschopenka je zdravotní rozhodnutí, ne způsob, jak si prodloužit volno. Lékař, který by ji vystavil bez odpovídajícího zdravotního důvodu, porušuje své profesní povinnosti."),
        ],
      },
      {
        id: "kdo-vystavuje",
        nav: "Kdo ji vystaví",
        eyebrow: "Kompetence",
        h2: "Kdo smí neschopenku vystavit",
        blocks: [
          lead("Jen lékař, který vás pro dané onemocnění ošetřuje, a jen po odpovídajícím vyšetření."),
          ul([
            "<strong>Praktický lékař</strong>, u kterého jste registrováni, nebo praktický lékař, který vás akutně ošetřil.",
            "<strong>Ambulantní specialista</strong>, pokud vás pro danou diagnózu léčí.",
            "<strong>Lékař ve zdravotnickém zařízení</strong> při hospitalizaci.",
            "Nikdy ne zaměstnavatel, personalista, lékárník ani nelékařský pracovník.",
          ]),
          p(`Každý lékař vykonávající povolání v Česku je členem <strong>České lékařské komory</strong>. Registraci konkrétního lékaře si můžete ověřit ve veřejném seznamu ČLK, stejně jako u nás — u našich českých lékařů to považujeme za samozřejmost, ne za bonus.`),
          cite(`Veřejný seznam lékařů: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Česká lékařská komora</a>.`),
        ],
      },
      {
        id: "zamestnavatel",
        nav: "Zaměstnavatel",
        eyebrow: "Tok informací",
        h2: "Jak se o neschopence dozví zaměstnavatel",
        blocks: [
          lead("Sami mu nic nenosíte. Přesto mu musíte dát vědět."),
          p("Informace o vzniku, trvání i ukončení dočasné pracovní neschopnosti putuje elektronicky přes ČSSZ. Zaměstnavatel si ji zobrazí ve svém přístupu do <strong>ePortálu ČSSZ</strong> a na jejím základě vyplácí náhradu mzdy za první fázi."),
          p("To ale neznamená, že se zaměstnavatel dozví, co vám je. Zaměstnavateli se nesděluje diagnóza — dostává informaci o tom, že jste práce neschopni a od kdy do kdy, nikoli proč. Diagnóza je zdravotní údaj a chrání ji lékařské tajemství."),
          warn("Oznamovací povinnost trvá", "Elektronický přenos nenahrazuje to, že máte zaměstnavateli sami bez zbytečného odkladu oznámit, že jste onemocněli. Systém řeší doklad, ne organizaci směn."),
          cite(`Přehled o vlastní pracovní neschopnosti: <a href="${CSSZ_EPORTAL_DPN}" rel="nofollow noopener" target="_blank">ePortál ČSSZ</a>.`),
        ],
      },
      {
        id: "vychazky",
        nav: "Vycházky",
        eyebrow: "Režim",
        h2: "Vycházky a kontrola dodržování režimu",
        blocks: [
          lead("Vycházky nejsou automatické právo. Povoluje je lékař, a to jen tehdy, pokud to zdravotní stav dovoluje."),
          p("Rozsah vycházek určuje ošetřující lékař a zapisuje ho do rozhodnutí. Mimo povolené vycházky se od vás očekává, že budete na adrese, kterou jste pro dobu neschopnosti uvedli — a tuto adresu musíte hlásit, pokud se změní, například když nemoc trávíte u rodičů."),
          ul([
            "Rozsah vycházek je zdravotní rozhodnutí lékaře, ne dohoda mezi vámi a zaměstnavatelem.",
            "Dodržování režimu může kontrolovat ČSSZ i zaměstnavatel; kontrola má zákonem vymezená pravidla.",
            "Cesta k lékaři, na vyšetření nebo do lékárny je součástí léčby, i když právě neběží vycházková doba.",
            "Porušení režimu má důsledky ve výplatě dávky — v tom je smysl toho, že je režim vůbec stanoven.",
          ]),
          p("Pokud vám povolený rozsah vycházek přestává vyhovovat, protože se stav mění, je řešením kontrola u lékaře, ne vlastní úprava režimu."),
        ],
      },
      {
        id: "zpetne",
        nav: "Zpětné vystavení",
        eyebrow: "Výjimka",
        h2: "Lze neschopenku vystavit zpětně?",
        blocks: [
          lead("Výjimečně ano, ale není to na dohodě s lékařem — do rozhodnutí vstupuje správa sociálního zabezpečení."),
          p("Dočasná pracovní neschopnost se zpravidla vystavuje ke dni, kdy vás lékař vyšetřil. Vystavení k dřívějšímu datu je výjimka, kterou lékař nemůže udělit sám ze své vůle: posuzuje se odděleně a se souhlasem příslušné okresní správy sociálního zabezpečení."),
          p("Prakticky to znamená jediné — pokud jste nemocní, kontaktujte lékaře hned, ne až poté, co si vyberete, jak si týden zorganizujete. Zpětné řešení je vždycky komplikovanější než včasné."),
          warn("Slib zpětné neschopenky je varovný signál", "Žádné zdravotnické zařízení vám nemůže dopředu zaručit, že bude neschopenka vystavena zpětně. Kdo to slibuje, slibuje něco, co nemá ve své pravomoci."),
          cite(`Podmínky nemocenského pojištění: <a href="${CSSZ_NEMOCENSKE}" rel="nofollow noopener" target="_blank">ČSSZ — nemocenské</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Online konzultace",
        eyebrow: "Telemedicína",
        h2: "Může neschopenku vystavit lékař online?",
        blocks: [
          lead("Záleží na tom, co vám je. Videokonzultace je plnohodnotné vyšetření jen pro část stavů."),
          p("Lékař v online konzultaci má stejné profesní povinnosti jako lékař v ordinaci. Rozhodnutí o pracovní neschopnosti smí vzniknout jen po <strong>odpovídajícím vyšetření</strong>. U řady běžných onemocnění — respirační infekt, střevní potíže, migréna, akutní úzkostný stav — je dobře vedená videokonzultace dostatečná."),
          p("U jiných stavů dostatečná není. Cokoli, co vyžaduje poslech plic, pohmat břicha, vyšetření kloubu, změření tlaku nebo akutní odběry, patří do ordinace. Odpovědný lékař vám to řekne a odešle vás na vyšetření, místo aby rozhodoval naslepo."),
          ul([
            "Lékař musí být oprávněn vykonávat povolání v Česku a být členem ČLK.",
            "Konzultace musí být dost podrobná na to, aby o závěru vůbec šlo rozhodnout.",
            "Pokud zdravotní stav pracovní neschopnost neodůvodňuje, lékař to řekne. To není selhání služby, to je důvod, proč má takový doklad váhu.",
          ]),
        ],
      },
      {
        id: "kdy-ihned",
        nav: "Kdy ihned k lékaři",
        eyebrow: "Bezpečnost",
        h2: "Kdy neřešit doklad, ale okamžitě péči",
        blocks: [
          lead("Jsou situace, kdy je administrativa to poslední, co má smysl řešit."),
          ul([
            "Bolest nebo tlak na hrudi, zvlášť s dušností, pocením nebo bolestí vystřelující do paže či čelisti.",
            "Náhlá slabost končetin, pokleslý koutek, porucha řeči nebo náhlá krutá bolest hlavy.",
            "Dušnost v klidu, promodrávání rtů nebo obličeje.",
            "Vyrážka, která nebledne při zatlačení, zvlášť s horečkou, ztuhlou šíjí nebo zmateností.",
            "Jakákoli myšlenka na sebepoškození.",
          ]),
          p("V těchto případech volejte <strong>155</strong> nebo <strong>112</strong>, případně jeďte na nejbližší urgentní příjem. Doklady se vyřídí potom."),
        ],
      },
    ],
    linksEyebrow: "Global Health Česko",
    linksH2: "Kam dál",
    linksLead: "Naši čeští lékaři konzultují online a posoudí, zda je ve vašem případě vystavení neschopenky odborně namístě.",
    links: [
      { label: "eNeschopenka a online konzultace s lékařem", href: href("cs", "/services/neschopenka-online") },
      { label: "Naši lékaři v Česku", href: href("cs", "/doctors") },
      { label: "Kontakt — Global Health Česko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Potřebujete posoudit pracovní neschopnost?",
      text: "Online konzultace s českým lékařem určí, zda vám zdravotní stav brání v práci, a pokud ano, lékař vystaví rozhodnutí elektronicky.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/neschopenka-online") },
      secondary: { label: "Zobrazit lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Odkud pravidla skutečně pocházejí",
    sourcesLead: "Výše nemocenského, délka podpůrčí doby i pravidla kontrol jsou dány zákonem o nemocenském pojištění a mění se. Aktuální hodnoty čtěte vždy u zdroje, ne v článku.",
    sources: [
      { label: "ČSSZ — nemocenské", href: CSSZ_NEMOCENSKE },
      { label: "ePortál ČSSZ — informace o DPN", href: CSSZ_EPORTAL_DPN },
      { label: "ČLK — seznam lékařů", href: CLK_REGISTER },
    ],
    sourcesNote: "Odkazy vedou na weby příslušných institucí. Global Health není součástí ČSSZ ani ČLK a nemůže o dávce rozhodovat, urychlovat ji ani ji zaručit.",
    faqEyebrow: "FAQ",
    faqH2: "Časté dotazy",
    faqs: [
      {
        q: "Jak funguje neschopenka a co s ní mám dělat?",
        a: "Ošetřující lékař vystaví rozhodnutí o dočasné pracovní neschopnosti elektronicky a odešle ho ČSSZ. Vy nikam nic nenosíte, ale musíte bez zbytečného odkladu oznámit zaměstnavateli, že jste práce neschopni, a dodržovat léčebný režim včetně nahlášené adresy.",
      },
      {
        q: "Jak se o neschopence dozví zaměstnavatel?",
        a: "Z ePortálu ČSSZ, kam se údaj o vzniku, trvání a ukončení neschopnosti dostane elektronicky od lékaře. Diagnózu se zaměstnavatel nedozví — dostane informaci o tom, že práce neschopni jste a v jakém období, nikoli proč.",
      },
      {
        q: "Jak si zkontroluji stav své neschopenky?",
        a: "Přes ePortál ČSSZ, ve službě s informacemi o vaší dočasné pracovní neschopnosti. Uvidíte tam údaje, které lékař odeslal. Pokud něco nesedí, řešte to nejprve s lékařem, který rozhodnutí vystavil.",
      },
      {
        q: "Jak fungují vycházky?",
        a: "Jejich rozsah povoluje ošetřující lékař podle zdravotního stavu a zapisuje ho do rozhodnutí. Mimo vycházky se očekává, že budete na nahlášené adrese. Cesta na vyšetření nebo do lékárny je součástí léčby. Dodržování režimu může být kontrolováno.",
      },
      {
        q: "Lze neschopenku vystavit zpětně?",
        a: "Jen výjimečně. Neschopenka se zpravidla vystavuje ke dni vyšetření a vystavení k dřívějšímu datu se posuzuje samostatně, se souhlasem příslušné okresní správy sociálního zabezpečení. Není to něco, co by lékař mohl slíbit dopředu.",
      },
      {
        q: "Může neschopenku vystavit lékař při online konzultaci?",
        a: "U stavů, pro které je videokonzultace dostatečným vyšetřením, ano. U potíží vyžadujících fyzikální vyšetření, odběry nebo sledování v ordinaci lékař místo vystavení doporučí návštěvu ambulance. Rozhoduje o tom vždy lékař po konzultaci, ne objednávka předem.",
      },
    ],
    disclaimerTitle: "Zdravotní upozornění",
    disclaimer:
      "Napsal MUDr. Vojtěch Černý, praktický lékař Global Health Česko, odborně zkontrolovala MUDr. Romana Pavlů, praktická lékařka pro dospělé. Článek obsahuje obecné informace o systému dočasné pracovní neschopnosti a nemocenského pojištění v Česku. Nejde o individuální lékařskou, právní ani finanční radu. O nároku na dávku rozhoduje výhradně Česká správa sociálního zabezpečení a žádná konzultace u nás nezaručuje vystavení rozhodnutí ani výplatu dávky. Při akutním ohrožení života volejte okamžitě 155 nebo 112.",
  } satisfies Article,
};

const en: LocalePost = {
  locale: "EN",
  slug: "neschopenka-czech-sick-note-explained",
  title: "Neschopenka: how the Czech electronic sick note actually works",
  excerpt:
    "In Czechia the sick note is issued electronically by your treating doctor and sent straight to ČSSZ. Here is who may issue it, how your employer finds out, how the permitted-outings regime works, and why backdating is treated as an exception.",
  seoTitle: "Neschopenka: the Czech sick note explained",
  seoDescription:
    "How the Czech eNeschopenka works: who may issue it, how your employer is notified, the rules on permitted outings, and when it can be backdated.",
  category: "General Practice",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "General Practice",
    categoryHref: href("en", "/blog"),
    eyebrow: "Czechia · Employee guide",
    h1: "The Czech sick note (neschopenka)",
    deck: "Temporary incapacity for work has been fully electronic since 2020. You no longer carry paper anywhere — your doctor sends it into the ČSSZ system for you.",
    intro:
      "A <strong>neschopenka</strong> is a decision on <strong>temporary incapacity for work</strong>, issued by your treating doctor when your health prevents you doing your job. It is issued electronically as an <strong>eNeschopenka</strong>: the doctor sends it directly to the <strong>Czech Social Security Administration (ČSSZ)</strong>, your employer sees it in the ČSSZ ePortal, and you carry no forms around. In the first phase your employer pays wage compensation; from the day set by law, ČSSZ takes over paying sickness benefit.",
    facts: ["Issued by your treating doctor", "Sent electronically to ČSSZ", "Employers see it in the ePortal"],
    primaryCta: { label: "Book an online consultation", href: href("en", "/services/neschopenka-online") },
    secondaryCta: { label: "Sickness benefit on the ČSSZ site", href: CSSZ_NEMOCENSKE },
    panelChip: "What this guide covers",
    panelParas: [
      "Who may issue a neschopenka, and why it is never an administrator or an employer.",
      "How the information reaches your employer, and where you can check the status of your own case.",
      "Benefit amounts, the length of the support period and the number of employer-paid days are not printed here. They are set by law, they change, so every numeric question points at ČSSZ instead.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "General Practitioner · Global Health Czechia" },
    reviewLine: "Clinically reviewed by MUDr. Romana Pavlů, General Practitioner for adults, Global Health Czechia.",
    navLabel: "In this article",
    sections: [
      {
        id: "co-to-je",
        nav: "What it is",
        eyebrow: "The basics",
        h2: "What a neschopenka actually is",
        blocks: [
          lead("It is not a note excusing you from work. It is a doctor's decision that your health temporarily prevents you doing your job."),
          p("The decision rests with your <strong>treating doctor</strong> — most often a GP, but equally a specialist treating you for that diagnosis, or a hospital doctor during admission. It follows from examination and diagnosis, not from how much time off you would like."),
          p("Since 2020 it is issued electronically only. The doctor sends notification of the incapacity into the ČSSZ system, from where both the district social security office and your employer collect it. That ended the carrying of paper counterfoils, which used to be the single most common cause of delayed payment."),
          warn("Sick leave and holiday are not interchangeable", "A neschopenka is a medical decision, not a way to extend time off. A doctor issuing one without a corresponding medical reason is in breach of their professional duties."),
        ],
      },
      {
        id: "kdo-vystavuje",
        nav: "Who issues it",
        eyebrow: "Competence",
        h2: "Who may issue a neschopenka",
        blocks: [
          lead("Only a doctor treating you for that condition, and only after an adequate examination."),
          ul([
            "<strong>The GP</strong> you are registered with, or a GP who treated you acutely.",
            "<strong>An outpatient specialist</strong>, if they are treating you for that diagnosis.",
            "<strong>A hospital doctor</strong> during an inpatient stay.",
            "Never an employer, an HR officer, a pharmacist or a non-medical member of staff.",
          ]),
          p("Every doctor practising in Czechia is a member of the <strong>Czech Medical Chamber</strong>. You can verify any doctor's registration in the Chamber's public list — including ours. With our Czech doctors we treat that as a given, not a selling point."),
          cite(`Public register of doctors: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Czech Medical Chamber</a>.`),
        ],
      },
      {
        id: "zamestnavatel",
        nav: "Your employer",
        eyebrow: "Information flow",
        h2: "How your employer finds out",
        blocks: [
          lead("You take nothing to them. You still have to tell them."),
          p("Notification of the start, continuation and end of temporary incapacity travels electronically through ČSSZ. Your employer views it through their access to the <strong>ČSSZ ePortal</strong> and pays wage compensation for the first phase on that basis."),
          p("That does not mean your employer learns what is wrong with you. The diagnosis is not disclosed — they are told that you are incapable of work and for what period, not why. A diagnosis is health data and is protected by medical confidentiality."),
          warn("Your duty to notify still applies", "The electronic transfer does not replace your own obligation to tell your employer without undue delay that you have fallen ill. The system handles the document, not the staffing of your shift."),
          cite(`Overview of your own incapacity: <a href="${CSSZ_EPORTAL_DPN}" rel="nofollow noopener" target="_blank">ČSSZ ePortal</a>.`),
        ],
      },
      {
        id: "vychazky",
        nav: "Permitted outings",
        eyebrow: "The regime",
        h2: "Permitted outings and checks on the regime",
        blocks: [
          lead("Outings are not an automatic right. The doctor permits them, and only where your condition allows."),
          p("The extent of permitted outings is set by the treating doctor and written into the decision. Outside those hours you are expected to be at the address you gave for the period of incapacity — and you must report that address if it changes, for instance if you spend the illness at your parents' home."),
          ul([
            "The extent of outings is a medical decision by the doctor, not an arrangement between you and your employer.",
            "Compliance may be checked by ČSSZ and by your employer; those checks follow rules laid down in law.",
            "Travel to the doctor, to an examination or to the pharmacy is part of treatment, even outside permitted hours.",
            "Breaching the regime has consequences for the benefit — which is the whole reason a regime is set at all.",
          ]),
          p("If the permitted range stops fitting because your condition is changing, the answer is a review appointment, not adjusting the regime yourself."),
        ],
      },
      {
        id: "zpetne",
        nav: "Backdating",
        eyebrow: "The exception",
        h2: "Can a neschopenka be backdated?",
        blocks: [
          lead("Exceptionally yes, but it is not an arrangement with your doctor — the social security administration is part of the decision."),
          p("Temporary incapacity is normally issued as of the day the doctor examined you. Issuing it from an earlier date is an exception the doctor cannot simply grant: it is assessed separately and requires the consent of the relevant district social security office."),
          p("In practice that means one thing — if you are ill, contact a doctor now, not after you have worked out how to arrange your week. Sorting it out retrospectively is always more complicated than doing it in time."),
          warn("A promise of backdating is a warning sign", "No clinic can guarantee in advance that a sick note will be issued retrospectively. Anyone promising that is promising something outside their power."),
          cite(`Conditions of sickness insurance: <a href="${CSSZ_NEMOCENSKE}" rel="nofollow noopener" target="_blank">ČSSZ — sickness benefit</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Online consultation",
        eyebrow: "Telemedicine",
        h2: "Can a doctor issue it online?",
        blocks: [
          lead("It depends what is wrong with you. A video consultation is a full examination for some conditions and not for others."),
          p("A doctor consulting online carries the same professional duties as one in the surgery. A decision on incapacity for work may only follow an <strong>adequate examination</strong>. For a range of common illnesses — a respiratory infection, a gastrointestinal upset, a migraine, an acute anxiety episode — a well-conducted video consultation is sufficient."),
          p("For other conditions it is not. Anything requiring the chest to be listened to, an abdomen palpated, a joint examined, blood pressure measured or bloods taken the same day belongs in a surgery. A responsible doctor will say so and refer you, rather than deciding blind."),
          ul([
            "The doctor must be licensed to practise in Czechia and a member of the Chamber.",
            "The consultation must be detailed enough for the conclusion to be reachable at all.",
            "If your condition does not justify incapacity for work, the doctor will say so. That is not a failure of the service; it is why the document carries weight.",
          ]),
        ],
      },
      {
        id: "kdy-ihned",
        nav: "When to seek care",
        eyebrow: "Safety",
        h2: "When to forget the paperwork and get care now",
        blocks: [
          lead("There are situations in which the administration is the last thing worth dealing with."),
          ul([
            "Chest pain or pressure, particularly with breathlessness, sweating, or pain into the arm or jaw.",
            "Sudden limb weakness, facial droop, difficulty speaking, or a sudden severe headache.",
            "Breathlessness at rest, or blue lips or face.",
            "A rash that does not fade under pressure, especially with fever, neck stiffness or confusion.",
            "Any thought of harming yourself.",
          ]),
          p("In these cases call <strong>155</strong> or <strong>112</strong>, or go to the nearest emergency department. The paperwork can follow."),
        ],
      },
    ],
    linksEyebrow: "Global Health Czechia",
    linksH2: "Where to go from here",
    linksLead: "Our Czech doctors consult online and will assess whether issuing a neschopenka is clinically appropriate in your case.",
    links: [
      { label: "eNeschopenka and online consultation with a doctor", href: href("en", "/services/neschopenka-online") },
      { label: "Our doctors in Czechia", href: href("en", "/doctors") },
      { label: "Contact Global Health Czechia", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Need your fitness for work assessed?",
      text: "An online consultation with a Czech doctor establishes whether your health prevents you working, and if it does, the decision is issued electronically.",
      primary: { label: "Book a consultation", href: href("en", "/services/neschopenka-online") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where the rules actually come from",
    sourcesLead: "Benefit amounts, the length of the support period and the rules on checks come from the Sickness Insurance Act and change. Read current figures at the source, not in an article.",
    sources: [
      { label: "ČSSZ — sickness benefit", href: CSSZ_NEMOCENSKE },
      { label: "ČSSZ ePortal — incapacity information", href: CSSZ_EPORTAL_DPN },
      { label: "Czech Medical Chamber — register of doctors", href: CLK_REGISTER },
    ],
    sourcesNote: "Links open on the relevant institution's own website. Global Health is not part of ČSSZ or the Chamber and cannot decide, expedite or guarantee any benefit.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions",
    faqs: [
      {
        q: "How does a neschopenka work and what do I have to do with it?",
        a: "Your treating doctor issues the decision on temporary incapacity electronically and sends it to ČSSZ. You carry nothing anywhere, but you must tell your employer without undue delay that you are unfit for work, and follow the treatment regime including the address you reported.",
      },
      {
        q: "How does my employer find out?",
        a: "Through the ČSSZ ePortal, which receives the start, continuation and end of the incapacity electronically from the doctor. Your employer does not learn the diagnosis — only that you are unfit for work and for what period, not why.",
      },
      {
        q: "How do I check the status of my own sick note?",
        a: "Through the ČSSZ ePortal, in the service showing information about your temporary incapacity. It displays what the doctor submitted. If something does not match, raise it first with the doctor who issued the decision.",
      },
      {
        q: "How do permitted outings work?",
        a: "Their extent is authorised by the treating doctor according to your condition and written into the decision. Outside them you are expected to be at the address you reported. Travel to an examination or the pharmacy is part of treatment. Compliance may be checked.",
      },
      {
        q: "Can a sick note be backdated?",
        a: "Only exceptionally. It is normally issued as of the day of examination, and issuing it from an earlier date is assessed separately, with the consent of the relevant district social security office. It is not something a doctor can promise in advance.",
      },
      {
        q: "Can a doctor issue it during an online consultation?",
        a: "For conditions where a video consultation is an adequate examination, yes. For problems requiring physical examination, blood tests or observation in the surgery, the doctor will recommend an in-person visit instead. The decision always follows the consultation, never the booking.",
      },
    ],
    disclaimerTitle: "Medical Disclaimer",
    disclaimer:
      "Written by MUDr. Vojtěch Černý, General Practitioner at Global Health Czechia, and clinically reviewed by MUDr. Romana Pavlů, General Practitioner for adults. This article is general information about temporary incapacity for work and sickness insurance in Czechia. It is not individual medical, legal or financial advice. Entitlement to benefit is decided solely by the Czech Social Security Administration, and no consultation with us guarantees that a decision will be issued or a benefit paid. In a life-threatening emergency call 155 or 112 immediately.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "neschopenka-baixa-medica-na-chequia",
  title: "Neschopenka: como funciona a baixa médica eletrónica na Chéquia",
  excerpt:
    "Na Chéquia a baixa é emitida eletronicamente pelo médico assistente e enviada diretamente à ČSSZ. Explicamos quem a pode emitir, como a entidade patronal fica a saber, como funcionam as saídas autorizadas e por que a emissão retroativa é uma exceção.",
  seoTitle: "Neschopenka: a baixa médica na Chéquia",
  seoDescription:
    "Como funciona a eNeschopenka na Chéquia: quem a pode emitir, como a entidade patronal é informada, as regras das saídas e quando pode ser retroativa.",
  category: "Clínica Geral",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Clínica Geral",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Chéquia · Guia para trabalhadores",
    h1: "A baixa médica checa (neschopenka)",
    deck: "A incapacidade temporária para o trabalho é totalmente eletrónica desde 2020. Já não transporta papel nenhum — é o médico que o envia ao sistema da ČSSZ por si.",
    intro:
      "A <strong>neschopenka</strong> é a decisão de <strong>incapacidade temporária para o trabalho</strong> emitida pelo médico assistente quando o estado de saúde o impede de exercer a sua função. É emitida eletronicamente como <strong>eNeschopenka</strong>: o médico envia-a diretamente à <strong>Administração da Segurança Social Checa (ČSSZ)</strong>, a entidade patronal vê-a no ePortal da ČSSZ, e não anda a entregar formulários. Na primeira fase recebe compensação salarial da entidade patronal; a partir do dia fixado por lei, é a ČSSZ que passa a pagar o subsídio de doença.",
    facts: ["Emitida pelo médico assistente", "Enviada eletronicamente à ČSSZ", "A empresa vê-a no ePortal"],
    primaryCta: { label: "Marcar consulta online", href: href("pt", "/services/neschopenka-online") },
    secondaryCta: { label: "Subsídio de doença no site da ČSSZ", href: CSSZ_NEMOCENSKE },
    panelChip: "O que este guia cobre",
    panelParas: [
      "Quem pode emitir a neschopenka, e por que nunca é um administrativo nem a entidade patronal.",
      "Como a informação chega à entidade patronal e onde pode consultar o estado do seu próprio processo.",
      "Os valores do subsídio, a duração do período de apoio e o número de dias pagos pela empresa não estão aqui. São fixados por lei e mudam, pelo que cada pergunta sobre números remete para a ČSSZ.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Médico de Clínica Geral · Global Health Chéquia" },
    reviewLine: "Revisto clinicamente pela MUDr. Romana Pavlů, médica de clínica geral para adultos, Global Health Chéquia.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "co-to-je",
        nav: "O que é",
        eyebrow: "Base",
        h2: "O que é, afinal, a neschopenka",
        blocks: [
          lead("Não é uma justificação de faltas. É a decisão de um médico de que o seu estado de saúde o impede temporariamente de exercer a sua profissão."),
          p("A decisão cabe ao <strong>médico assistente</strong> — na maioria das vezes o médico de família, mas também o especialista que o segue para aquele diagnóstico, ou o médico do hospital durante o internamento. Resulta do exame e do diagnóstico, não do tempo de descanso que o doente gostaria de ter."),
          p("Desde 2020 é emitida exclusivamente por via eletrónica. O médico envia a comunicação de incapacidade ao sistema da ČSSZ, de onde a recolhem tanto o serviço distrital da segurança social como a entidade patronal. Acabou assim a entrega de talões em papel, que era a causa mais frequente de atraso no pagamento."),
          warn("Baixa e férias não são intermutáveis", "A neschopenka é uma decisão clínica, não uma forma de prolongar o descanso. Um médico que a emitisse sem razão de saúde correspondente estaria a violar os seus deveres profissionais."),
        ],
      },
      {
        id: "kdo-vystavuje",
        nav: "Quem a emite",
        eyebrow: "Competência",
        h2: "Quem pode emitir a neschopenka",
        blocks: [
          lead("Apenas o médico que o segue para aquela doença, e apenas após avaliação adequada."),
          ul([
            "<strong>O médico de família</strong> em que está inscrito, ou o que o atendeu em situação aguda.",
            "<strong>O especialista em ambulatório</strong>, se o segue para aquele diagnóstico.",
            "<strong>O médico do hospital</strong> durante o internamento.",
            "Nunca a entidade patronal, os recursos humanos, o farmacêutico ou um profissional não médico.",
          ]),
          p("Todos os médicos que exercem na Chéquia são membros da <strong>Ordem dos Médicos Checa</strong>. Pode verificar a inscrição de qualquer médico na lista pública — connosco também. Nos nossos médicos checos, isso é para nós evidente, não um argumento de venda."),
          cite(`Lista pública de médicos: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Ordem dos Médicos Checa</a>.`),
        ],
      },
      {
        id: "zamestnavatel",
        nav: "Entidade patronal",
        eyebrow: "Fluxo de informação",
        h2: "Como a entidade patronal fica a saber",
        blocks: [
          lead("Não lhe leva nada. Mesmo assim, tem de a avisar."),
          p("A informação sobre o início, a manutenção e o fim da incapacidade circula eletronicamente através da ČSSZ. A entidade patronal consulta-a no seu acesso ao <strong>ePortal da ČSSZ</strong> e é com base nela que paga a compensação salarial da primeira fase."),
          p("Isso não significa que a entidade patronal fique a saber o que tem. O diagnóstico não é comunicado — recebe a informação de que está incapaz para o trabalho e em que período, não porquê. O diagnóstico é um dado de saúde protegido pelo sigilo médico."),
          warn("O dever de comunicar mantém-se", "A transmissão eletrónica não substitui o seu dever de comunicar à entidade patronal, sem demora injustificada, que adoeceu. O sistema trata do documento, não da organização dos turnos."),
          cite(`Consulta da sua incapacidade: <a href="${CSSZ_EPORTAL_DPN}" rel="nofollow noopener" target="_blank">ePortal da ČSSZ</a>.`),
        ],
      },
      {
        id: "vychazky",
        nav: "Saídas autorizadas",
        eyebrow: "Regime",
        h2: "Saídas autorizadas e controlo do regime",
        blocks: [
          lead("As saídas não são um direito automático. É o médico que as autoriza, e só quando o estado de saúde o permite."),
          p("A extensão das saídas é definida pelo médico assistente e inscrita na decisão. Fora desse horário espera-se que esteja na morada que indicou para o período de incapacidade — e tem de comunicar essa morada se ela mudar, por exemplo se passar a doença em casa dos pais."),
          ul([
            "A extensão das saídas é uma decisão clínica do médico, não um acordo entre si e a entidade patronal.",
            "O cumprimento do regime pode ser fiscalizado pela ČSSZ e pela entidade patronal; essa fiscalização tem regras fixadas na lei.",
            "A deslocação ao médico, a um exame ou à farmácia faz parte do tratamento, mesmo fora do horário de saídas.",
            "O incumprimento do regime tem consequências no pagamento da prestação — é para isso que o regime existe.",
          ]),
          p("Se a extensão autorizada deixar de servir porque o estado está a mudar, a solução é uma consulta de reavaliação, não ajustar o regime por sua conta."),
        ],
      },
      {
        id: "zpetne",
        nav: "Emissão retroativa",
        eyebrow: "Exceção",
        h2: "A neschopenka pode ser emitida retroativamente?",
        blocks: [
          lead("Excecionalmente sim, mas não é um acordo com o médico — entra na decisão o serviço da segurança social."),
          p("A incapacidade temporária é emitida, em regra, com data do dia em que o médico o observou. A emissão com data anterior é uma exceção que o médico não pode conceder por si: é apreciada em separado e depende do acordo do serviço distrital da segurança social competente."),
          p("Na prática, isto significa apenas uma coisa — se está doente, contacte o médico já, e não depois de decidir como organizar a semana. Resolver retroativamente é sempre mais complicado do que resolver a tempo."),
          warn("Prometer uma baixa retroativa é um sinal de alarme", "Nenhuma unidade de saúde lhe pode garantir à partida que a baixa será emitida retroativamente. Quem o promete está a prometer o que não está na sua competência."),
          cite(`Condições do seguro de doença: <a href="${CSSZ_NEMOCENSKE}" rel="nofollow noopener" target="_blank">ČSSZ — subsídio de doença</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Consulta online",
        eyebrow: "Telemedicina",
        h2: "Um médico pode emitir a baixa online?",
        blocks: [
          lead("Depende do que tem. A videoconsulta é uma avaliação completa para uma parte dos quadros, e não para outros."),
          p("O médico em consulta online tem exatamente os mesmos deveres profissionais do médico no consultório. A decisão de incapacidade só pode resultar de uma <strong>avaliação adequada</strong>. Em muitas doenças comuns — infeção respiratória, gastroenterite, enxaqueca, episódio agudo de ansiedade — uma videoconsulta bem conduzida é suficiente."),
          p("Noutros quadros não é. Tudo o que exija auscultar o tórax, palpar o abdómen, examinar uma articulação, medir a tensão ou colher análises no próprio dia pertence ao consultório. Um médico responsável di-lo-á e encaminhá-lo-á, em vez de decidir às cegas."),
          ul([
            "O médico tem de estar habilitado a exercer na Chéquia e ser membro da Ordem dos Médicos Checa.",
            "A consulta tem de ser suficientemente detalhada para que a conclusão possa sequer ser tomada.",
            "Se o estado de saúde não justificar a incapacidade, o médico dirá isso mesmo. Não é uma falha do serviço — é a razão pela qual este documento tem peso.",
          ]),
        ],
      },
      {
        id: "kdy-ihned",
        nav: "Quando não esperar",
        eyebrow: "Segurança",
        h2: "Quando o problema não é o documento",
        blocks: [
          lead("Há situações em que a burocracia é a última coisa a tratar."),
          ul([
            "Dor ou aperto no peito, sobretudo com falta de ar, suores ou dor a irradiar para o braço ou mandíbula.",
            "Fraqueza súbita de um membro, desvio da face, dificuldade em falar ou dor de cabeça súbita e intensa.",
            "Dificuldade respiratória em repouso, ou lábios e face azulados.",
            "Manchas na pele que não desaparecem à pressão, sobretudo com febre, rigidez da nuca ou confusão.",
            "Qualquer ideia de se magoar a si próprio.",
          ]),
          p("Nestes casos ligue <strong>155</strong> ou <strong>112</strong>, ou dirija-se ao serviço de urgência mais próximo. Os documentos tratam-se depois."),
        ],
      },
    ],
    linksEyebrow: "Global Health Chéquia",
    linksH2: "Passos seguintes",
    linksLead: "Os nossos médicos checos atendem online e avaliam se, no seu caso, a emissão da neschopenka é clinicamente adequada.",
    links: [
      { label: "eNeschopenka e consulta médica online", href: href("pt", "/services/neschopenka-online") },
      { label: "Os nossos médicos na Chéquia", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Chéquia", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Precisa de avaliar a incapacidade para o trabalho?",
      text: "Uma consulta online com um médico checo determina se o seu estado de saúde o impede de trabalhar e, se sim, a decisão é emitida por via eletrónica.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/neschopenka-online") },
      secondary: { label: "Ver os nossos médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "De onde vêm efetivamente as regras",
    sourcesLead: "Os valores do subsídio, a duração do período de apoio e as regras de fiscalização constam da lei do seguro de doença e mudam. Leia sempre os valores atuais na fonte, não num artigo.",
    sources: [
      { label: "ČSSZ — subsídio de doença", href: CSSZ_NEMOCENSKE },
      { label: "ePortal da ČSSZ — informação sobre incapacidade", href: CSSZ_EPORTAL_DPN },
      { label: "Ordem dos Médicos Checa — lista de médicos", href: CLK_REGISTER },
    ],
    sourcesNote: "As ligações abrem nos sites das instituições competentes. A Global Health não faz parte da ČSSZ nem da Ordem dos Médicos Checa e não pode decidir, acelerar nem garantir qualquer prestação.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes",
    faqs: [
      {
        q: "Como funciona a neschopenka e o que tenho de fazer com ela?",
        a: "O médico assistente emite a decisão de incapacidade temporária por via eletrónica e envia-a à ČSSZ. Não tem de levar nada a lado nenhum, mas tem de comunicar à entidade patronal, sem demora injustificada, que está incapaz para o trabalho, e cumprir o regime de tratamento, incluindo a morada indicada.",
      },
      {
        q: "Como fica a entidade patronal a saber?",
        a: "Pelo ePortal da ČSSZ, para onde o início, a manutenção e o fim da incapacidade seguem eletronicamente a partir do médico. A entidade patronal não fica a saber o diagnóstico — recebe a informação de que está incapaz e em que período, não porquê.",
      },
      {
        q: "Como confirmo o estado da minha baixa?",
        a: "No ePortal da ČSSZ, no serviço com informação sobre a sua incapacidade temporária. Verá os dados que o médico enviou. Se algo não coincidir, trate disso primeiro com o médico que emitiu a decisão.",
      },
      {
        q: "Como funcionam as saídas autorizadas?",
        a: "A sua extensão é autorizada pelo médico assistente em função do estado de saúde e inscrita na decisão. Fora delas, espera-se que esteja na morada comunicada. A deslocação a um exame ou à farmácia faz parte do tratamento. O cumprimento pode ser fiscalizado.",
      },
      {
        q: "A baixa pode ser emitida retroativamente?",
        a: "Apenas excecionalmente. Em regra é emitida com data do dia da observação, e a emissão com data anterior é apreciada em separado, com o acordo do serviço distrital da segurança social competente. Não é algo que um médico possa prometer à partida.",
      },
      {
        q: "Um médico pode emitir a baixa em consulta online?",
        a: "Nos quadros em que a videoconsulta é uma avaliação adequada, sim. Nas queixas que exijam exame físico, análises ou observação no consultório, o médico recomendará uma consulta presencial em vez de emitir. Decide sempre o médico depois da consulta, nunca a marcação.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito pelo MUDr. Vojtěch Černý, médico de clínica geral da Global Health Chéquia, e revisto clinicamente pela MUDr. Romana Pavlů, médica de clínica geral para adultos. O artigo contém informação geral sobre o sistema de incapacidade temporária e de seguro de doença na Chéquia. Não constitui aconselhamento médico, jurídico ou financeiro individual. O direito à prestação é decidido exclusivamente pela Administração da Segurança Social Checa, e nenhuma consulta connosco garante a emissão da decisão nem o pagamento da prestação. Em caso de perigo de vida, ligue imediatamente 155 ou 112.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "neschopenka-baja-medica-en-chequia",
  title: "Neschopenka: cómo funciona la baja médica electrónica en Chequia",
  excerpt:
    "En Chequia la baja la emite electrónicamente el médico responsable y se envía directamente a la ČSSZ. Explicamos quién puede emitirla, cómo se entera la empresa, cómo funcionan las salidas autorizadas y por qué la emisión retroactiva es una excepción.",
  seoTitle: "Neschopenka: la baja médica en Chequia",
  seoDescription:
    "Cómo funciona la eNeschopenka en Chequia: quién puede emitirla, cómo se informa a la empresa, las reglas de las salidas y cuándo puede ser retroactiva.",
  category: "Medicina General",
  article: {
    lang: "es-ES",
    tagline: "Medicina en cualquier momento y lugar",
    categoryLabel: "Medicina General",
    categoryHref: href("es", "/blog"),
    eyebrow: "Chequia · Guía para trabajadores",
    h1: "La baja médica checa (neschopenka)",
    deck: "La incapacidad temporal para el trabajo es totalmente electrónica desde 2020. Usted ya no lleva papeles a ninguna parte: los envía el médico al sistema de la ČSSZ.",
    intro:
      "La <strong>neschopenka</strong> es la resolución de <strong>incapacidad temporal para el trabajo</strong> que emite su médico responsable cuando su estado de salud le impide desempeñar su trabajo. Se emite electrónicamente como <strong>eNeschopenka</strong>: el médico la envía directamente a la <strong>Administración de la Seguridad Social checa (ČSSZ)</strong>, la empresa la ve en el ePortal de la ČSSZ y usted no reparte formularios. En la primera fase recibe una compensación salarial de la empresa; desde el día fijado por ley, la ČSSZ asume el pago de la prestación por enfermedad.",
    facts: ["La emite el médico responsable", "Se envía electrónicamente a la ČSSZ", "La empresa la ve en el ePortal"],
    primaryCta: { label: "Reservar consulta online", href: href("es", "/services/neschopenka-online") },
    secondaryCta: { label: "Prestación por enfermedad en la ČSSZ", href: CSSZ_NEMOCENSKE },
    panelChip: "Qué cubre esta guía",
    panelParas: [
      "Quién puede emitir una neschopenka y por qué nunca es un administrativo ni la empresa.",
      "Cómo llega la información a la empresa y dónde puede comprobar usted el estado de su propio expediente.",
      "La cuantía de la prestación, la duración del periodo de apoyo y los días pagados por la empresa no aparecen aquí. Los fija la ley y cambian, así que cada pregunta numérica remite a la ČSSZ.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Médico de familia · Global Health Chequia" },
    reviewLine: "Revisado clínicamente por la MUDr. Romana Pavlů, médica de familia para adultos, Global Health Chequia.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "co-to-je",
        nav: "Qué es",
        eyebrow: "Lo básico",
        h2: "Qué es realmente la neschopenka",
        blocks: [
          lead("No es un justificante. Es la resolución de un médico de que su estado de salud le impide temporalmente desempeñar su trabajo."),
          p("La decisión corresponde al <strong>médico responsable</strong>: casi siempre el médico de familia, pero también el especialista que le trata por ese diagnóstico, o el médico del hospital durante un ingreso. Se basa en la exploración y el diagnóstico, no en cuánto tiempo libre desearía usted."),
          p("Desde 2020 se emite únicamente por vía electrónica. El médico envía la comunicación de incapacidad al sistema de la ČSSZ, de donde la recogen tanto la oficina comarcal de la seguridad social como su empresa. Así terminó el reparto de copias en papel, que era la causa más frecuente de retraso en el pago."),
          warn("Baja y vacaciones no son intercambiables", "La neschopenka es una decisión sanitaria, no una forma de alargar el descanso. Un médico que la emitiera sin motivo de salud correspondiente incumpliría sus deberes profesionales."),
        ],
      },
      {
        id: "kdo-vystavuje",
        nav: "Quién la emite",
        eyebrow: "Competencia",
        h2: "Quién puede emitir la neschopenka",
        blocks: [
          lead("Solo el médico que le atiende por esa dolencia, y solo tras una exploración adecuada."),
          ul([
            "<strong>El médico de familia</strong> en el que está registrado, o el que le atendió de forma aguda.",
            "<strong>El especialista ambulatorio</strong>, si le trata por ese diagnóstico.",
            "<strong>El médico del hospital</strong> durante el ingreso.",
            "Nunca la empresa, el departamento de personal, el farmacéutico ni personal no médico.",
          ]),
          p("Cada profesional que ejerce en Chequia es miembro del <strong>Colegio de Médicos checo</strong>. Puede verificar la colegiación de cualquier médico en su lista pública, también la de los nuestros. En nuestros médicos checos lo damos por descontado, no lo presentamos como una ventaja."),
          cite(`Lista pública de médicos: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Colegio de Médicos checo</a>.`),
        ],
      },
      {
        id: "zamestnavatel",
        nav: "La empresa",
        eyebrow: "Flujo de información",
        h2: "Cómo se entera la empresa",
        blocks: [
          lead("Usted no le lleva nada. Aun así, tiene que avisarla."),
          p("La información sobre el inicio, la continuación y el fin de la incapacidad viaja electrónicamente a través de la ČSSZ. La empresa la consulta con su acceso al <strong>ePortal de la ČSSZ</strong> y sobre esa base paga la compensación salarial de la primera fase."),
          p("Eso no significa que la empresa sepa qué le ocurre. El diagnóstico no se comunica: recibe la información de que usted está incapacitado y en qué periodo, no por qué. El diagnóstico es un dato de salud protegido por el secreto médico."),
          warn("El deber de comunicar sigue existiendo", "La transmisión electrónica no sustituye su obligación de comunicar a la empresa, sin demora injustificada, que ha enfermado. El sistema resuelve el documento, no la organización de los turnos."),
          cite(`Consulta de su propia incapacidad: <a href="${CSSZ_EPORTAL_DPN}" rel="nofollow noopener" target="_blank">ePortal de la ČSSZ</a>.`),
        ],
      },
      {
        id: "vychazky",
        nav: "Salidas autorizadas",
        eyebrow: "El régimen",
        h2: "Salidas autorizadas y control del régimen",
        blocks: [
          lead("Las salidas no son un derecho automático. Las autoriza el médico, y solo cuando el estado de salud lo permite."),
          p("El alcance de las salidas lo fija el médico responsable y queda escrito en la resolución. Fuera de ese horario se espera que esté en la dirección que indicó para el periodo de incapacidad, y debe comunicar esa dirección si cambia, por ejemplo si pasa la enfermedad en casa de sus padres."),
          ul([
            "El alcance de las salidas es una decisión sanitaria del médico, no un acuerdo entre usted y la empresa.",
            "El cumplimiento del régimen puede ser controlado por la ČSSZ y por la empresa; ese control tiene reglas fijadas por ley.",
            "Ir al médico, a una prueba o a la farmacia forma parte del tratamiento, aunque no sea horario de salidas.",
            "Incumplir el régimen tiene consecuencias sobre la prestación: para eso se fija un régimen.",
          ]),
          p("Si el alcance autorizado deja de encajar porque su estado cambia, la solución es una revisión con el médico, no ajustar el régimen por su cuenta."),
        ],
      },
      {
        id: "zpetne",
        nav: "Efecto retroactivo",
        eyebrow: "La excepción",
        h2: "¿Puede emitirse la neschopenka con efecto retroactivo?",
        blocks: [
          lead("Excepcionalmente sí, pero no es un acuerdo con el médico: en la decisión interviene la administración de la seguridad social."),
          p("La incapacidad temporal se emite, por regla general, con la fecha del día en que el médico le exploró. Emitirla con fecha anterior es una excepción que el médico no puede conceder por sí solo: se valora aparte y requiere la conformidad de la oficina comarcal de la seguridad social competente."),
          p("En la práctica esto significa una sola cosa: si está enfermo, contacte con un médico ya, no después de decidir cómo organiza la semana. Resolverlo hacia atrás siempre es más complicado que resolverlo a tiempo."),
          warn("Prometer una baja retroactiva es una señal de alarma", "Ningún centro puede garantizarle de antemano que la baja se emitirá con efecto retroactivo. Quien lo promete promete algo que no está en su mano."),
          cite(`Condiciones del seguro de enfermedad: <a href="${CSSZ_NEMOCENSKE}" rel="nofollow noopener" target="_blank">ČSSZ — prestación por enfermedad</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Consulta online",
        eyebrow: "Telemedicina",
        h2: "¿Puede emitirla un médico online?",
        blocks: [
          lead("Depende de qué tenga. La videoconsulta es una exploración completa para una parte de los cuadros y no para otros."),
          p("El médico en consulta online tiene los mismos deberes profesionales que en la consulta presencial. La resolución de incapacidad solo puede derivar de una <strong>exploración adecuada</strong>. En muchas enfermedades habituales —una infección respiratoria, una gastroenteritis, una migraña, un episodio agudo de ansiedad— una videoconsulta bien llevada es suficiente."),
          p("En otros cuadros no lo es. Cuanto exija auscultar el tórax, palpar el abdomen, explorar una articulación, medir la tensión o extraer sangre el mismo día pertenece a la consulta presencial. Un médico responsable se lo dirá y le derivará, en lugar de decidir a ciegas."),
          ul([
            "El médico debe estar habilitado para ejercer en Chequia y ser miembro del Colegio.",
            "La consulta debe ser lo bastante detallada como para que la conclusión pueda alcanzarse.",
            "Si el estado de salud no justifica la incapacidad, el médico lo dirá. No es un fallo del servicio: es la razón por la que ese documento tiene peso.",
          ]),
        ],
      },
      {
        id: "kdy-ihned",
        nav: "Cuándo no esperar",
        eyebrow: "Seguridad",
        h2: "Cuándo el problema no es el papel",
        blocks: [
          lead("Hay situaciones en las que la gestión administrativa es lo último que conviene atender."),
          ul([
            "Dolor u opresión en el pecho, especialmente con falta de aire, sudoración o dolor irradiado al brazo o a la mandíbula.",
            "Debilidad súbita de una extremidad, desviación de la boca, dificultad para hablar o dolor de cabeza súbito e intenso.",
            "Dificultad para respirar en reposo, o labios y cara azulados.",
            "Manchas en la piel que no desaparecen al presionar, especialmente con fiebre, rigidez de nuca o confusión.",
            "Cualquier idea de hacerse daño.",
          ]),
          p("En estos casos llame al <strong>155</strong> o al <strong>112</strong>, o acuda al servicio de urgencias más cercano. Los papeles se resuelven después."),
        ],
      },
    ],
    linksEyebrow: "Global Health Chequia",
    linksH2: "Siguientes pasos",
    linksLead: "Nuestros médicos checos atienden online y valoran si, en su caso, emitir la neschopenka es clínicamente adecuado.",
    links: [
      { label: "eNeschopenka y consulta médica online", href: href("es", "/services/neschopenka-online") },
      { label: "Nuestros médicos en Chequia", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Chequia", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿Necesita que valoren su incapacidad para trabajar?",
      text: "Una consulta online con un médico checo determina si su estado de salud le impide trabajar y, si es así, la resolución se emite por vía electrónica.",
      primary: { label: "Reservar consulta", href: href("es", "/services/neschopenka-online") },
      secondary: { label: "Ver nuestros médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "De dónde vienen realmente las reglas",
    sourcesLead: "La cuantía de la prestación, la duración del periodo de apoyo y las reglas de control proceden de la ley del seguro de enfermedad y cambian. Consulte siempre las cifras vigentes en la fuente, no en un artículo.",
    sources: [
      { label: "ČSSZ — prestación por enfermedad", href: CSSZ_NEMOCENSKE },
      { label: "ePortal de la ČSSZ — información sobre la incapacidad", href: CSSZ_EPORTAL_DPN },
      { label: "Colegio de Médicos checo — lista de médicos", href: CLK_REGISTER },
    ],
    sourcesNote: "Los enlaces abren en el sitio de la institución correspondiente. Global Health no forma parte de la ČSSZ ni del Colegio y no puede decidir, acelerar ni garantizar ninguna prestación.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Cómo funciona la neschopenka y qué debo hacer con ella?",
        a: "Su médico responsable emite la resolución de incapacidad temporal por vía electrónica y la envía a la ČSSZ. Usted no lleva nada a ninguna parte, pero debe comunicar a su empresa sin demora injustificada que está incapacitado para trabajar y cumplir el régimen de tratamiento, incluida la dirección comunicada.",
      },
      {
        q: "¿Cómo se entera mi empresa?",
        a: "Por el ePortal de la ČSSZ, adonde llegan electrónicamente desde el médico el inicio, la continuación y el fin de la incapacidad. La empresa no conoce el diagnóstico: recibe la información de que usted está incapacitado y en qué periodo, no por qué.",
      },
      {
        q: "¿Cómo compruebo el estado de mi baja?",
        a: "En el ePortal de la ČSSZ, en el servicio con información sobre su incapacidad temporal. Verá los datos que envió el médico. Si algo no cuadra, trátelo primero con el médico que emitió la resolución.",
      },
      {
        q: "¿Cómo funcionan las salidas autorizadas?",
        a: "Su alcance lo autoriza el médico responsable según el estado de salud y queda escrito en la resolución. Fuera de ellas se espera que esté en la dirección comunicada. Ir a una prueba o a la farmacia forma parte del tratamiento. El cumplimiento puede ser controlado.",
      },
      {
        q: "¿Puede emitirse la baja con efecto retroactivo?",
        a: "Solo excepcionalmente. Por regla general se emite con la fecha de la exploración, y emitirla con fecha anterior se valora aparte, con la conformidad de la oficina comarcal de la seguridad social competente. No es algo que un médico pueda prometer de antemano.",
      },
      {
        q: "¿Puede un médico emitirla en consulta online?",
        a: "En los cuadros para los que la videoconsulta es una exploración adecuada, sí. En las molestias que exigen exploración física, analítica u observación presencial, el médico recomendará acudir a consulta en lugar de emitirla. Decide siempre el médico tras la consulta, nunca la reserva.",
      },
    ],
    disclaimerTitle: "Aviso Médico",
    disclaimer:
      "Escrito por el MUDr. Vojtěch Černý, médico de familia de Global Health Chequia, y revisado clínicamente por la MUDr. Romana Pavlů, médica de familia para adultos. El artículo contiene información general sobre el sistema de incapacidad temporal y el seguro de enfermedad en Chequia. No constituye asesoramiento médico, jurídico ni financiero individual. El derecho a la prestación lo decide únicamente la Administración de la Seguridad Social checa, y ninguna consulta con nosotros garantiza la emisión de la resolución ni el pago de la prestación. Ante un peligro vital, llame de inmediato al 155 o al 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "neschopenka-concediu-medical-in-cehia",
  title: "Neschopenka: cum funcționează concediul medical electronic în Cehia",
  excerpt:
    "În Cehia concediul medical este emis electronic de medicul curant și transmis direct la ČSSZ. Explicăm cine îl poate emite, cum află angajatorul, cum funcționează ieșirile permise și de ce emiterea retroactivă este o excepție.",
  seoTitle: "Neschopenka: concediul medical în Cehia",
  seoDescription:
    "Cum funcționează eNeschopenka în Cehia: cine o poate emite, cum este informat angajatorul, regulile ieșirilor permise și când poate fi retroactivă.",
  category: "Medicină de familie",
  article: {
    lang: "ro-RO",
    tagline: "Îngrijire medicală oricând, oriunde",
    categoryLabel: "Medicină de familie",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Cehia · Ghid pentru angajați",
    h1: "Concediul medical ceh (neschopenka)",
    deck: "Incapacitatea temporară de muncă este complet electronică din 2020. Nu mai purtați hârtii nicăieri — le trimite medicul în sistemul ČSSZ pentru dumneavoastră.",
    intro:
      "<strong>Neschopenka</strong> este decizia de <strong>incapacitate temporară de muncă</strong>, emisă de medicul curant atunci când starea de sănătate vă împiedică să vă faceți munca. Se emite electronic, sub forma <strong>eNeschopenka</strong>: medicul o transmite direct <strong>Administrației Cehe de Asigurări Sociale (ČSSZ)</strong>, angajatorul o vede în ePortalul ČSSZ, iar dumneavoastră nu plimbați niciun formular. În prima fază primiți compensație salarială de la angajator; din ziua stabilită prin lege, ČSSZ preia plata indemnizației de boală.",
    facts: ["Emisă de medicul curant", "Transmisă electronic la ČSSZ", "Angajatorul o vede în ePortal"],
    primaryCta: { label: "Programați o consultație online", href: href("ro", "/services/neschopenka-online") },
    secondaryCta: { label: "Indemnizația de boală pe site-ul ČSSZ", href: CSSZ_NEMOCENSKE },
    panelChip: "Ce acoperă acest ghid",
    panelParas: [
      "Cine poate emite o neschopenka și de ce nu este niciodată un funcționar administrativ sau angajatorul.",
      "Cum ajunge informația la angajator și unde vă verificați singur stadiul propriului dosar.",
      "Cuantumul indemnizației, durata perioadei de sprijin și numărul de zile plătite de angajator nu apar aici. Sunt stabilite prin lege și se modifică, așa că fiecare întrebare despre cifre trimite la ČSSZ.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Medic de familie · Global Health Cehia" },
    reviewLine: "Revizuit clinic de MUDr. Romana Pavlů, medic de familie pentru adulți, Global Health Cehia.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "co-to-je",
        nav: "Ce este",
        eyebrow: "Baza",
        h2: "Ce este, de fapt, neschopenka",
        blocks: [
          lead("Nu este o scutire. Este decizia unui medic că starea dumneavoastră de sănătate vă împiedică temporar să vă faceți munca."),
          p("Decizia aparține <strong>medicului curant</strong> — cel mai adesea medicul de familie, dar și specialistul care vă tratează pentru acel diagnostic sau medicul din spital pe durata internării. Rezultă din examinare și din diagnostic, nu din cât timp liber v-ați dori."),
          p("Din 2020 se emite exclusiv electronic. Medicul transmite anunțul de incapacitate în sistemul ČSSZ, de unde îl preiau atât oficiul județean de asigurări sociale, cât și angajatorul. Astfel s-a încheiat plimbarea taloanelor de hârtie, care era cea mai frecventă cauză de întârziere a plății."),
          warn("Concediul medical și concediul de odihnă nu sunt interschimbabile", "Neschopenka este o decizie medicală, nu o modalitate de a prelungi timpul liber. Un medic care ar emite-o fără un motiv medical corespunzător și-ar încălca obligațiile profesionale."),
        ],
      },
      {
        id: "kdo-vystavuje",
        nav: "Cine o emite",
        eyebrow: "Competență",
        h2: "Cine poate emite neschopenka",
        blocks: [
          lead("Doar medicul care vă tratează pentru acea afecțiune și doar după o examinare adecvată."),
          ul([
            "<strong>Medicul de familie</strong> la care sunteți înscris sau medicul de familie care v-a consultat în regim acut.",
            "<strong>Medicul specialist din ambulatoriu</strong>, dacă vă tratează pentru acel diagnostic.",
            "<strong>Medicul din spital</strong> pe durata internării.",
            "Niciodată angajatorul, un responsabil de personal, farmacistul sau un profesionist nemedical.",
          ]),
          p("Orice medic care profesează în Cehia este membru al <strong>Camerei Medicilor din Cehia</strong>. Puteți verifica înscrierea oricărui medic în lista publică a Camerei, inclusiv a medicilor noștri. La medicii noștri cehi considerăm asta de la sine înțeles, nu un argument de vânzare."),
          cite(`Lista publică a medicilor: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Camera Medicilor din Cehia</a>.`),
        ],
      },
      {
        id: "zamestnavatel",
        nav: "Angajatorul",
        eyebrow: "Fluxul de informație",
        h2: "Cum află angajatorul",
        blocks: [
          lead("Nu îi duceți nimic. Cu toate acestea, trebuie să îl anunțați."),
          p("Informația privind începerea, continuarea și încheierea incapacității circulă electronic prin ČSSZ. Angajatorul o vede în accesul său la <strong>ePortalul ČSSZ</strong> și pe baza ei plătește compensația salarială din prima fază."),
          p("Asta nu înseamnă că angajatorul află ce aveți. Diagnosticul nu i se comunică — primește informația că sunteți incapabil de muncă și pentru ce perioadă, nu de ce. Diagnosticul este un dat de sănătate protejat de secretul medical."),
          warn("Obligația de a anunța rămâne", "Transmiterea electronică nu înlocuiește obligația dumneavoastră de a comunica angajatorului, fără întârziere nejustificată, că v-ați îmbolnăvit. Sistemul rezolvă documentul, nu organizarea turelor."),
          cite(`Situația propriei incapacități: <a href="${CSSZ_EPORTAL_DPN}" rel="nofollow noopener" target="_blank">ePortalul ČSSZ</a>.`),
        ],
      },
      {
        id: "vychazky",
        nav: "Ieșiri permise",
        eyebrow: "Regimul",
        h2: "Ieșirile permise și controlul respectării regimului",
        blocks: [
          lead("Ieșirile nu sunt un drept automat. Le permite medicul, și doar atunci când starea de sănătate o îngăduie."),
          p("Intervalul ieșirilor este stabilit de medicul curant și trecut în decizie. În afara lui se așteaptă să fiți la adresa pe care ați indicat-o pentru perioada de incapacitate — iar adresa trebuie anunțată dacă se schimbă, de exemplu dacă petreceți boala la părinți."),
          ul([
            "Intervalul ieșirilor este o decizie medicală, nu o înțelegere între dumneavoastră și angajator.",
            "Respectarea regimului poate fi verificată de ČSSZ și de angajator; controlul are reguli stabilite prin lege.",
            "Drumul la medic, la o investigație sau la farmacie face parte din tratament, chiar dacă nu este ora ieșirilor.",
            "Încălcarea regimului are consecințe asupra plății indemnizației — tocmai de aceea există un regim.",
          ]),
          p("Dacă intervalul aprobat nu vă mai este potrivit pentru că starea se schimbă, soluția este o reevaluare la medic, nu modificarea regimului pe cont propriu."),
        ],
      },
      {
        id: "zpetne",
        nav: "Emitere retroactivă",
        eyebrow: "Excepția",
        h2: "Poate fi emisă neschopenka retroactiv?",
        blocks: [
          lead("Excepțional, da, dar nu ține de o înțelegere cu medicul — în decizie intervine administrația de asigurări sociale."),
          p("Incapacitatea temporară se emite, de regulă, cu data zilei în care medicul v-a examinat. Emiterea cu o dată anterioară este o excepție pe care medicul nu o poate acorda singur: se analizează separat și cu acordul oficiului județean de asigurări sociale competent."),
          p("Practic, asta înseamnă un singur lucru — dacă sunteți bolnav, contactați medicul acum, nu după ce ați hotărât cum vă organizați săptămâna. Rezolvarea retroactivă este întotdeauna mai complicată decât cea la timp."),
          warn("Promisiunea unui concediu retroactiv este un semnal de alarmă", "Nicio unitate medicală nu vă poate garanta dinainte că neschopenka va fi emisă retroactiv. Cine promite asta promite ceva ce nu ține de competența sa."),
          cite(`Condițiile asigurării de boală: <a href="${CSSZ_NEMOCENSKE}" rel="nofollow noopener" target="_blank">ČSSZ — indemnizație de boală</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Consultație online",
        eyebrow: "Telemedicină",
        h2: "Poate un medic să o emită online?",
        blocks: [
          lead("Depinde de ce aveți. Consultația video este o examinare completă pentru o parte dintre situații, nu pentru toate."),
          p("Medicul aflat în consultație online are exact aceleași obligații profesionale ca în cabinet. Decizia de incapacitate poate rezulta doar dintr-o <strong>examinare adecvată</strong>. În multe afecțiuni obișnuite — infecție respiratorie, tulburare digestivă, migrenă, episod acut de anxietate — o consultație video bine condusă este suficientă."),
          p("În alte situații nu este. Tot ce cere auscultația plămânilor, palparea abdomenului, examinarea unei articulații, măsurarea tensiunii sau analize în aceeași zi ține de cabinet. Un medic responsabil vă spune asta și vă îndrumă, în loc să decidă în orb."),
          ul([
            "Medicul trebuie să aibă drept de liberă practică în Cehia și să fie membru al Camerei Medicilor.",
            "Consultația trebuie să fie suficient de detaliată încât concluzia să poată fi luată.",
            "Dacă starea de sănătate nu justifică incapacitatea, medicul o va spune. Nu este un eșec al serviciului — este motivul pentru care documentul are greutate.",
          ]),
        ],
      },
      {
        id: "kdy-ihned",
        nav: "Când nu așteptați",
        eyebrow: "Siguranță",
        h2: "Când problema nu este actul",
        blocks: [
          lead("Există situații în care hârtiile sunt ultimul lucru care merită rezolvat."),
          ul([
            "Durere sau apăsare în piept, mai ales cu lipsă de aer, transpirații sau durere care iradiază în braț ori în mandibulă.",
            "Slăbiciune bruscă a unui membru, gură strâmbă, tulburare de vorbire sau durere de cap bruscă și foarte intensă.",
            "Lipsă de aer în repaus, ori buze și față vinete.",
            "Erupție care nu dispare la apăsare, mai ales cu febră, redoare de ceafă sau confuzie.",
            "Orice gând de a vă face rău.",
          ]),
          p("În aceste cazuri sunați la <strong>155</strong> sau <strong>112</strong>, ori mergeți la cea mai apropiată urgență. Actele se rezolvă după."),
        ],
      },
    ],
    linksEyebrow: "Global Health Cehia",
    linksH2: "Pașii următori",
    linksLead: "Medicii noștri cehi consultă online și evaluează dacă, în cazul dumneavoastră, emiterea unei neschopenka este justificată clinic.",
    links: [
      { label: "eNeschopenka și consultație medicală online", href: href("ro", "/services/neschopenka-online") },
      { label: "Medicii noștri din Cehia", href: href("ro", "/doctors") },
      { label: "Contactați Global Health Cehia", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Aveți nevoie de evaluarea incapacității de muncă?",
      text: "O consultație online cu un medic ceh stabilește dacă starea de sănătate vă împiedică să munciți, iar dacă da, decizia se emite electronic.",
      primary: { label: "Programați o consultație", href: href("ro", "/services/neschopenka-online") },
      secondary: { label: "Vedeți medicii noștri", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "De unde vin, de fapt, regulile",
    sourcesLead: "Cuantumul indemnizației, durata perioadei de sprijin și regulile de control decurg din legea asigurării de boală și se modifică. Citiți valorile curente la sursă, nu într-un articol.",
    sources: [
      { label: "ČSSZ — indemnizație de boală", href: CSSZ_NEMOCENSKE },
      { label: "ePortalul ČSSZ — informații despre incapacitate", href: CSSZ_EPORTAL_DPN },
      { label: "Camera Medicilor din Cehia — lista medicilor", href: CLK_REGISTER },
    ],
    sourcesNote: "Linkurile deschid site-urile instituțiilor competente. Global Health nu face parte din ČSSZ sau din Camera Medicilor și nu poate decide, accelera sau garanta vreo indemnizație.",
    faqEyebrow: "Întrebări frecvente",
    faqH2: "Întrebări frecvente",
    faqs: [
      {
        q: "Cum funcționează neschopenka și ce trebuie să fac cu ea?",
        a: "Medicul curant emite decizia de incapacitate temporară electronic și o transmite la ČSSZ. Nu duceți nimic nicăieri, dar trebuie să anunțați angajatorul fără întârziere nejustificată că sunteți incapabil de muncă și să respectați regimul de tratament, inclusiv adresa comunicată.",
      },
      {
        q: "Cum află angajatorul?",
        a: "Din ePortalul ČSSZ, unde ajung electronic de la medic începerea, continuarea și încheierea incapacității. Angajatorul nu află diagnosticul — primește informația că sunteți incapabil de muncă și pentru ce perioadă, nu de ce.",
      },
      {
        q: "Cum îmi verific stadiul concediului medical?",
        a: "Prin ePortalul ČSSZ, în serviciul cu informații despre incapacitatea dumneavoastră temporară. Veți vedea datele transmise de medic. Dacă ceva nu corespunde, discutați mai întâi cu medicul care a emis decizia.",
      },
      {
        q: "Cum funcționează ieșirile permise?",
        a: "Intervalul lor este aprobat de medicul curant în funcție de starea de sănătate și trecut în decizie. În afara lui se așteaptă să fiți la adresa comunicată. Drumul la o investigație sau la farmacie face parte din tratament. Respectarea poate fi controlată.",
      },
      {
        q: "Poate fi emis concediul medical retroactiv?",
        a: "Doar excepțional. De regulă se emite cu data examinării, iar emiterea cu o dată anterioară se analizează separat, cu acordul oficiului județean de asigurări sociale competent. Nu este ceva ce un medic poate promite dinainte.",
      },
      {
        q: "Poate un medic să îl emită în consultație online?",
        a: "Pentru situațiile în care consultația video este o examinare adecvată, da. Pentru acuze care cer examinare fizică, analize sau observație în cabinet, medicul va recomanda o vizită față în față în loc să emită. Decide întotdeauna medicul după consultație, nu programarea.",
      },
    ],
    disclaimerTitle: "Aviz medical",
    disclaimer:
      "Scris de MUDr. Vojtěch Černý, medic de familie la Global Health Cehia, și revizuit clinic de MUDr. Romana Pavlů, medic de familie pentru adulți. Articolul conține informații generale despre sistemul de incapacitate temporară de muncă și asigurarea de boală din Cehia. Nu constituie sfat medical, juridic sau financiar individual. Dreptul la indemnizație este decis exclusiv de Administrația Cehă de Asigurări Sociale, iar nicio consultație la noi nu garantează emiterea deciziei sau plata indemnizației. În caz de pericol vital, sunați imediat la 155 sau 112.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE",
  slug: "neschopenka-krankschreibung-in-tschechien",
  title: "Neschopenka: wie die elektronische Krankschreibung in Tschechien funktioniert",
  excerpt:
    "In Tschechien stellt die behandelnde Praxis die Krankschreibung elektronisch aus und sendet sie direkt an die ČSSZ. Wer sie ausstellen darf, wie der Arbeitgeber davon erfährt, wie die genehmigten Ausgänge geregelt sind und warum eine Rückdatierung die Ausnahme ist.",
  seoTitle: "Neschopenka: Krankschreibung in Tschechien",
  seoDescription:
    "Wie die eNeschopenka in Tschechien funktioniert: wer sie ausstellen darf, wie der Arbeitgeber informiert wird und wann sie rückdatiert werden kann.",
  category: "Allgemeinmedizin",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Allgemeinmedizin",
    categoryHref: href("de", "/blog"),
    eyebrow: "Tschechien · Leitfaden für Beschäftigte",
    h1: "Die tschechische Krankschreibung (neschopenka)",
    deck: "Die vorübergehende Arbeitsunfähigkeit läuft seit 2020 vollständig elektronisch. Sie tragen kein Papier mehr herum — die Praxis übermittelt es für Sie in das System der ČSSZ.",
    intro:
      "Die <strong>neschopenka</strong> ist die Entscheidung über <strong>vorübergehende Arbeitsunfähigkeit</strong>, die Ihre behandelnde Praxis ausstellt, wenn Ihr Gesundheitszustand Sie an Ihrer Arbeit hindert. Sie wird elektronisch als <strong>eNeschopenka</strong> ausgestellt: die Praxis sendet sie direkt an die <strong>Tschechische Sozialversicherungsanstalt (ČSSZ)</strong>, Ihr Arbeitgeber sieht sie im ePortal der ČSSZ, und Sie tragen keine Formulare umher. In der ersten Phase zahlt der Arbeitgeber Lohnausgleich; ab dem gesetzlich bestimmten Tag übernimmt die ČSSZ das Krankengeld.",
    facts: ["Von der behandelnden Praxis ausgestellt", "Elektronisch an die ČSSZ gesendet", "Arbeitgeber sehen sie im ePortal"],
    primaryCta: { label: "Online-Sprechstunde buchen", href: href("de", "/services/neschopenka-online") },
    secondaryCta: { label: "Krankengeld auf der ČSSZ-Seite", href: CSSZ_NEMOCENSKE },
    panelChip: "Was dieser Leitfaden abdeckt",
    panelParas: [
      "Wer eine neschopenka ausstellen darf und warum das nie eine Verwaltungskraft oder der Arbeitgeber ist.",
      "Wie die Information zum Arbeitgeber gelangt und wo Sie den Stand Ihres eigenen Vorgangs prüfen.",
      "Höhe des Krankengeldes, Dauer des Bezugszeitraums und die Zahl der vom Arbeitgeber getragenen Tage stehen hier nicht. Sie sind gesetzlich festgelegt und ändern sich, deshalb verweist jede Zahlenfrage auf die ČSSZ.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Allgemeinmediziner · Global Health Tschechien" },
    reviewLine: "Fachlich geprüft von MUDr. Romana Pavlů, Allgemeinmedizinerin für Erwachsene, Global Health Tschechien.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "co-to-je",
        nav: "Was es ist",
        eyebrow: "Grundlage",
        h2: "Was die neschopenka tatsächlich ist",
        blocks: [
          lead("Sie ist keine Entschuldigung. Sie ist die ärztliche Entscheidung, dass Ihr Gesundheitszustand Sie vorübergehend an Ihrer Arbeit hindert."),
          p("Die Entscheidung liegt bei der <strong>behandelnden Praxis</strong> — meist der Hausarztpraxis, ebenso aber bei der Fachpraxis, die Sie wegen dieser Diagnose behandelt, oder bei der Klinik während eines stationären Aufenthalts. Sie folgt aus Untersuchung und Diagnose, nicht daraus, wie viel Freizeit gewünscht wird."),
          p("Seit 2020 wird sie ausschließlich elektronisch ausgestellt. Die Praxis übermittelt die Meldung der Arbeitsunfähigkeit in das System der ČSSZ, von wo sowohl die Bezirksstelle der Sozialversicherung als auch Ihr Arbeitgeber sie abrufen. Damit endete das Herumtragen von Papierabschnitten, früher die häufigste Ursache verzögerter Zahlungen."),
          warn("Krankschreibung und Urlaub sind nicht austauschbar", "Die neschopenka ist eine medizinische Entscheidung und kein Mittel zur Verlängerung freier Tage. Wer sie ohne entsprechenden gesundheitlichen Grund ausstellt, verletzt seine Berufspflichten."),
        ],
      },
      {
        id: "kdo-vystavuje",
        nav: "Wer sie ausstellt",
        eyebrow: "Zuständigkeit",
        h2: "Wer eine neschopenka ausstellen darf",
        blocks: [
          lead("Nur wer Sie wegen dieser Erkrankung behandelt, und nur nach angemessener Untersuchung."),
          ul([
            "<strong>Die Hausarztpraxis</strong>, bei der Sie eingeschrieben sind, oder eine Praxis, die Sie akut behandelt hat.",
            "<strong>Die ambulante Fachpraxis</strong>, sofern sie Sie wegen dieser Diagnose behandelt.",
            "<strong>Die Klinik</strong> während eines stationären Aufenthalts.",
            "Niemals der Arbeitgeber, die Personalabteilung, die Apotheke oder nichtärztliches Personal.",
          ]),
          p("Alle in Tschechien tätigen Ärztinnen und Ärzte sind Mitglied der <strong>Tschechischen Ärztekammer</strong>. Die Registrierung lässt sich im öffentlichen Verzeichnis der Kammer prüfen — bei uns ebenso. Bei unseren tschechischen Ärztinnen und Ärzten halten wir das für selbstverständlich, nicht für ein Verkaufsargument."),
          cite(`Öffentliches Ärzteverzeichnis: <a href="${CLK_REGISTER}" rel="nofollow noopener" target="_blank">Tschechische Ärztekammer</a>.`),
        ],
      },
      {
        id: "zamestnavatel",
        nav: "Arbeitgeber",
        eyebrow: "Informationsfluss",
        h2: "Wie der Arbeitgeber davon erfährt",
        blocks: [
          lead("Sie bringen ihm nichts. Melden müssen Sie sich trotzdem."),
          p("Die Information über Beginn, Fortdauer und Ende der Arbeitsunfähigkeit läuft elektronisch über die ČSSZ. Der Arbeitgeber sieht sie über seinen Zugang zum <strong>ePortal der ČSSZ</strong> und zahlt auf dieser Grundlage den Lohnausgleich der ersten Phase."),
          p("Das heißt nicht, dass der Arbeitgeber erfährt, was Ihnen fehlt. Die Diagnose wird nicht mitgeteilt — er erfährt, dass Sie arbeitsunfähig sind und für welchen Zeitraum, nicht warum. Die Diagnose ist ein Gesundheitsdatum und durch die ärztliche Schweigepflicht geschützt."),
          warn("Die Meldepflicht bleibt bestehen", "Die elektronische Übermittlung ersetzt nicht Ihre eigene Pflicht, dem Arbeitgeber ohne unnötigen Verzug mitzuteilen, dass Sie erkrankt sind. Das System regelt den Nachweis, nicht die Schichtplanung."),
          cite(`Übersicht zur eigenen Arbeitsunfähigkeit: <a href="${CSSZ_EPORTAL_DPN}" rel="nofollow noopener" target="_blank">ePortal der ČSSZ</a>.`),
        ],
      },
      {
        id: "vychazky",
        nav: "Genehmigte Ausgänge",
        eyebrow: "Das Regime",
        h2: "Genehmigte Ausgänge und Kontrolle des Regimes",
        blocks: [
          lead("Ausgänge sind kein automatisches Recht. Die Praxis genehmigt sie, und nur, wenn der Zustand es zulässt."),
          p("Den Umfang der Ausgänge legt die behandelnde Praxis fest und trägt ihn in die Entscheidung ein. Außerhalb dieser Zeiten wird erwartet, dass Sie unter der Adresse erreichbar sind, die Sie für die Zeit der Arbeitsunfähigkeit angegeben haben — und diese Adresse müssen Sie melden, wenn sie sich ändert, etwa wenn Sie die Krankheit bei Ihren Eltern verbringen."),
          ul([
            "Der Umfang der Ausgänge ist eine ärztliche Entscheidung, keine Absprache zwischen Ihnen und dem Arbeitgeber.",
            "Die Einhaltung kann von der ČSSZ und vom Arbeitgeber kontrolliert werden; die Kontrolle folgt gesetzlich festgelegten Regeln.",
            "Der Weg zur Praxis, zu einer Untersuchung oder in die Apotheke gehört zur Behandlung, auch außerhalb der Ausgangszeiten.",
            "Ein Verstoß gegen das Regime hat Folgen für die Leistung — genau dafür wird ein Regime überhaupt festgelegt.",
          ]),
          p("Wenn der genehmigte Umfang nicht mehr passt, weil sich der Zustand ändert, ist die Lösung ein Kontrolltermin, nicht die eigenmächtige Änderung des Regimes."),
        ],
      },
      {
        id: "zpetne",
        nav: "Rückdatierung",
        eyebrow: "Die Ausnahme",
        h2: "Kann eine neschopenka rückdatiert werden?",
        blocks: [
          lead("Ausnahmsweise ja, aber es ist keine Absprache mit der Praxis — die Sozialversicherung entscheidet mit."),
          p("Die vorübergehende Arbeitsunfähigkeit wird in der Regel zu dem Tag ausgestellt, an dem Sie untersucht wurden. Eine Ausstellung zu einem früheren Datum ist eine Ausnahme, die ärztlich nicht allein gewährt werden kann: sie wird gesondert beurteilt und bedarf der Zustimmung der zuständigen Bezirksstelle der Sozialversicherung."),
          p("Praktisch bedeutet das nur eines — wenn Sie krank sind, melden Sie sich jetzt ärztlich, nicht erst, nachdem Sie Ihre Woche geordnet haben. Nachträglich ist es immer komplizierter als rechtzeitig."),
          warn("Ein Versprechen der Rückdatierung ist ein Warnsignal", "Keine Einrichtung kann Ihnen vorab garantieren, dass eine Krankschreibung rückwirkend ausgestellt wird. Wer das verspricht, verspricht etwas außerhalb seiner Befugnis."),
          cite(`Bedingungen der Krankenversicherung: <a href="${CSSZ_NEMOCENSKE}" rel="nofollow noopener" target="_blank">ČSSZ — Krankengeld</a>.`),
        ],
      },
      {
        id: "online",
        nav: "Online-Sprechstunde",
        eyebrow: "Telemedizin",
        h2: "Darf sie online ausgestellt werden?",
        blocks: [
          lead("Es hängt davon ab, was Ihnen fehlt. Eine Videosprechstunde ist für einen Teil der Beschwerdebilder eine vollwertige Untersuchung, für andere nicht."),
          p("Wer online berät, unterliegt denselben Berufspflichten wie in der Praxis. Eine Entscheidung über Arbeitsunfähigkeit darf nur nach einer <strong>angemessenen Untersuchung</strong> entstehen. Bei vielen häufigen Erkrankungen — einem Atemwegsinfekt, Magen-Darm-Beschwerden, Migräne, einer akuten Angstepisode — genügt eine gut geführte Videosprechstunde."),
          p("Bei anderen Zuständen genügt sie nicht. Alles, was Abhören der Lunge, Abtasten des Bauchs, Untersuchung eines Gelenks, Blutdruckmessung oder eine Blutentnahme am selben Tag erfordert, gehört in die Praxis. Verantwortungsvoll wird Ihnen das gesagt und überwiesen, statt blind zu entscheiden."),
          ul([
            "Die Praxis muss in Tschechien zur Berufsausübung berechtigt und Mitglied der Kammer sein.",
            "Die Sprechstunde muss ausführlich genug sein, damit die Entscheidung überhaupt getroffen werden kann.",
            "Trägt der Gesundheitszustand die Arbeitsunfähigkeit nicht, wird das gesagt. Das ist kein Versagen des Dienstes, sondern der Grund, warum dieser Nachweis Gewicht hat.",
          ]),
        ],
      },
      {
        id: "kdy-ihned",
        nav: "Nicht warten",
        eyebrow: "Sicherheit",
        h2: "Wenn nicht der Nachweis das Problem ist",
        blocks: [
          lead("Es gibt Situationen, in denen die Verwaltung das Letzte ist, was zählt."),
          ul([
            "Schmerz oder Druck in der Brust, besonders mit Atemnot, Schweißausbruch oder Ausstrahlung in Arm oder Kiefer.",
            "Plötzliche Schwäche einer Gliedmaße, hängender Mundwinkel, Sprachstörung oder plötzlicher heftigster Kopfschmerz.",
            "Atemnot in Ruhe, bläuliche Lippen oder Gesichtshaut.",
            "Ein Ausschlag, der sich nicht wegdrücken lässt, besonders mit Fieber, Nackensteife oder Verwirrtheit.",
            "Jeder Gedanke an Selbstverletzung.",
          ]),
          p("Rufen Sie in diesen Fällen <strong>155</strong> oder <strong>112</strong> an oder fahren Sie in die nächste Notaufnahme. Die Nachweise lassen sich danach klären."),
        ],
      },
    ],
    linksEyebrow: "Global Health Tschechien",
    linksH2: "Wie es weitergeht",
    linksLead: "Unsere tschechischen Ärztinnen und Ärzte beraten online und beurteilen, ob eine neschopenka in Ihrem Fall fachlich angezeigt ist.",
    links: [
      { label: "eNeschopenka und ärztliche Online-Sprechstunde", href: href("de", "/services/neschopenka-online") },
      { label: "Unsere Ärztinnen und Ärzte in Tschechien", href: href("de", "/doctors") },
      { label: "Global Health Tschechien kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Arbeitsunfähigkeit beurteilen lassen?",
      text: "Eine Online-Sprechstunde bei einer tschechischen Praxis klärt, ob Ihr Gesundheitszustand Sie an der Arbeit hindert — und wenn ja, wird die Entscheidung elektronisch ausgestellt.",
      primary: { label: "Termin buchen", href: href("de", "/services/neschopenka-online") },
      secondary: { label: "Ärztinnen und Ärzte ansehen", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Woher die Regeln tatsächlich stammen",
    sourcesLead: "Höhe des Krankengeldes, Dauer des Bezugszeitraums und die Kontrollregeln ergeben sich aus dem Krankenversicherungsgesetz und ändern sich. Lesen Sie aktuelle Werte an der Quelle, nicht in einem Artikel.",
    sources: [
      { label: "ČSSZ — Krankengeld", href: CSSZ_NEMOCENSKE },
      { label: "ePortal der ČSSZ — Informationen zur Arbeitsunfähigkeit", href: CSSZ_EPORTAL_DPN },
      { label: "Tschechische Ärztekammer — Ärzteverzeichnis", href: CLK_REGISTER },
    ],
    sourcesNote: "Die Links führen auf die Seiten der jeweiligen Institution. Global Health ist weder Teil der ČSSZ noch der Kammer und kann keine Leistung entscheiden, beschleunigen oder garantieren.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen",
    faqs: [
      {
        q: "Wie funktioniert die neschopenka und was muss ich damit tun?",
        a: "Die behandelnde Praxis stellt die Entscheidung über die vorübergehende Arbeitsunfähigkeit elektronisch aus und sendet sie an die ČSSZ. Sie tragen nichts umher, müssen aber Ihrem Arbeitgeber ohne unnötigen Verzug mitteilen, dass Sie arbeitsunfähig sind, und das Behandlungsregime einschließlich der gemeldeten Adresse einhalten.",
      },
      {
        q: "Wie erfährt mein Arbeitgeber davon?",
        a: "Über das ePortal der ČSSZ, in das Beginn, Fortdauer und Ende der Arbeitsunfähigkeit elektronisch von der Praxis gelangen. Die Diagnose erfährt der Arbeitgeber nicht — er erfährt, dass Sie arbeitsunfähig sind und für welchen Zeitraum, nicht warum.",
      },
      {
        q: "Wie prüfe ich den Stand meiner Krankschreibung?",
        a: "Über das ePortal der ČSSZ, im Dienst mit den Informationen zu Ihrer vorübergehenden Arbeitsunfähigkeit. Dort sehen Sie, was die Praxis übermittelt hat. Stimmt etwas nicht, klären Sie es zuerst mit der Praxis, die die Entscheidung ausgestellt hat.",
      },
      {
        q: "Wie sind die genehmigten Ausgänge geregelt?",
        a: "Ihren Umfang genehmigt die behandelnde Praxis nach dem Gesundheitszustand und trägt ihn in die Entscheidung ein. Außerhalb davon wird erwartet, dass Sie unter der gemeldeten Adresse erreichbar sind. Der Weg zu einer Untersuchung oder in die Apotheke gehört zur Behandlung. Die Einhaltung kann kontrolliert werden.",
      },
      {
        q: "Kann eine Krankschreibung rückdatiert werden?",
        a: "Nur ausnahmsweise. In der Regel wird sie zum Tag der Untersuchung ausgestellt; eine Ausstellung zu einem früheren Datum wird gesondert beurteilt und bedarf der Zustimmung der zuständigen Bezirksstelle der Sozialversicherung. Vorab versprechen lässt sich das nicht.",
      },
      {
        q: "Darf sie in einer Online-Sprechstunde ausgestellt werden?",
        a: "Bei Beschwerdebildern, für die eine Videosprechstunde eine angemessene Untersuchung ist, ja. Wo körperliche Untersuchung, Laborwerte oder Beobachtung in der Praxis nötig sind, wird stattdessen ein Präsenztermin empfohlen. Entschieden wird immer nach der Sprechstunde, nie mit der Buchung.",
      },
    ],
    disclaimerTitle: "Medizinischer Hinweis",
    disclaimer:
      "Verfasst von MUDr. Vojtěch Černý, Allgemeinmediziner bei Global Health Tschechien, fachlich geprüft von MUDr. Romana Pavlů, Allgemeinmedizinerin für Erwachsene. Der Artikel enthält allgemeine Informationen zum System der vorübergehenden Arbeitsunfähigkeit und der Krankenversicherung in Tschechien. Er ist keine individuelle medizinische, rechtliche oder finanzielle Beratung. Über den Leistungsanspruch entscheidet allein die Tschechische Sozialversicherungsanstalt; keine Sprechstunde bei uns garantiert die Ausstellung einer Entscheidung oder die Zahlung einer Leistung. Rufen Sie bei akuter Lebensgefahr sofort 155 oder 112 an.",
  } satisfies Article,
};

export const CZ_NESCHOPENKA: PostSet = {
  key: "cz-neschopenka",
  countryCode: "cz",
  targetKeyword: "neschopenka",
  searchVolume: 2400,
  keywordDifficulty: 10,
  evidence:
    "Cluster from the 2026-08-04 cs/2203 expansion, all KD<=18: elektronická neschopenka 1,600 KD 0, e neschopenka 1,600 KD 0, jak zjistit kdy mi přijde nemocenská 1,300 KD 5, čssz nemocenská 720 KD 10, neschopenka zpětně 590 KD 0, neschopenka vycházky 390 KD 0, neschopenka po telefonu 320 KD 2. SERP page 1 = ČSSZ + news/HR/law explainers + one clinic blog; no praktický lékař authors any of it. GSC: 'vystavení neschopenky' already at pos 46 on /czechia/cs/services/neschopenka-online.",
  serviceSlug: "neschopenka-online",
  authorDoctorId: "cmqz2vn0j006901lu9zla3zmp",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmqz4mk98007801lugo7c4y30",
  reviewerDisplayName: "MUDr. Romana Pavlů",
  posts: [cs, en, pt, es, roPost, de],
};
