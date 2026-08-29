/**
 * Czechia — Week 2 editorial batch.
 *
 * Target keyword: "výpočet nemocenské 2026" — 1,600/mo, KD 31, CPC €1.26
 * Supporting: "nemocenská 2026" — 2,900/mo, KD 22.
 *
 * Angle: calculation-first explainer for employees in Czechia. Deliberately not
 * a copy of the existing "cz-neschopenka" article: that post explains how the
 * electronic sick note works; this one focuses on who pays when, how the money
 * is calculated, and where people most often confuse employer-paid náhrada mzdy
 * with ČSSZ-paid nemocenské.
 *
 * Sources checked 2026-08-24:
 * - MPSV, "Nemocenské pojištění v roce 2026" (updated 2026-01-20)
 * - ČSSZ, "Podrobné informace o nemocenském"
 * - ČSSZ, "Výše a výpočet dávek"
 * - Zákoník práce § 192 and zákon č. 187/2006 Sb. via ppropo.mpsv.cz
 *
 * Conservative dated values used here:
 * - sickness-insurance reduction thresholds for 2026: 1,633 Kč / 2,449 Kč /
 *   4,897 Kč
 * - sickness benefit rates: 60 % (days 15-30), 66 % (days 31-60), 72 % (day
 *   61 onward)
 * - employer compensation remains the first 14 calendar days, paid only for
 *   scheduled working days / paid holidays, at 60 % of reduced average earnings
 * - the labour-code reduction thresholds for employer compensation are derived
 *   from the sickness thresholds by × 0.175, i.e. 285.78 Kč / 428.58 Kč /
 *   856.98 Kč per hour in 2026
 */
import { cite, lead, p, renderArticle, ul, warn, type Article } from "../blog-seo-2026-08/template.js";
import type { LocalePost, PostSet } from "../blog-seo-2026-08/types.js";

const MPSV_SICKNESS_2026 = "https://mpsv.gov.cz/nemocenske-pojisteni";
const CSSZ_SICKNESS_DETAIL = "https://www.cssz.gov.cz/podrobne-informace-o-nemocenskem";
const CSSZ_BENEFIT_CALC = "https://www.cssz.gov.cz/web/cz/vyse-a-vypocet-davek";
const LABOUR_CODE_192 = "https://ppropo.mpsv.cz/zakon_262_2006";
const SICKNESS_ACT_187 = "https://ppropo.mpsv.cz/zakon_187_2006";
const MPSV_CALCULATOR_2026 = "https://mpsv.gov.cz/kalkulacka-pro-vypocet-davek-v-roce-2026";

const href = (lang: string, path: string) => `https://www.myglobalhealth.online/czechia/${lang}${path}`;

const EMPLOYER_HOURLY_THRESHOLDS_2026 = "285,78 Kč / 428,58 Kč / 856,98 Kč";
const DVZ_THRESHOLDS_2026 = "1 633 Kč / 2 449 Kč / 4 897 Kč";

const cs: LocalePost = {
  locale: "CS",
  slug: "vypocet-nemocenske-2026-co-plati-zamestnavatel-a-co-cssz",
  title: "Výpočet nemocenské 2026: zaměstnavatel a ČSSZ",
  excerpt: "Jak se v roce 2026 počítá náhrada mzdy za prvních 14 dnů a nemocenské od ČSSZ od 15. dne.",
  seoTitle: "Výpočet nemocenské 2026: zaměstnavatel a ČSSZ",
  seoDescription: "Výpočet nemocenské 2026: náhrada mzdy v prvních 14 dnech, dávka ČSSZ od 15. dne, redukční hranice a orientační postup.",
  category: "Praktické lékařství",
  article: {
    lang: "cs-CZ",
    tagline: "Medicína kdykoli a kdekoli",
    categoryLabel: "Praktické lékařství",
    categoryHref: href("cs", "/blog"),
    eyebrow: "Česko · Pravidla pro rok 2026",
    h1: "Výpočet nemocenské v roce 2026",
    deck: "Prvních 14 dnů platí zaměstnavatel náhradu mzdy za zameškané směny. Od 15. dne platí ČSSZ nemocenské za kalendářní dny.",
    intro: "Výpočet nemocenské v roce 2026 má <strong>dva odlišné kroky</strong>. U běžného zaměstnance v pojištěném pracovním poměru vyplácí v prvních 14 kalendářních dnech zaměstnavatel náhradu mzdy jen za zameškané směny a placené svátky. Od 15. dne vyplácí ČSSZ nemocenské za každý kalendářní den. OSVČ, dohody a přeshraniční situace mohou mít jiná pravidla. Obě částky se redukují, takže je nelze přesně získat jedním procentem z hrubé měsíční mzdy.",
    facts: [
      "1.–14. den: náhrada mzdy od zaměstnavatele",
      "Od 15. dne: nemocenské od ČSSZ",
      "Redukční hranice 2026: 1 633, 2 449 a 4 897 Kč",
    ],
    primaryCta: { label: "Otevřít kalkulačku MPSV 2026", href: MPSV_CALCULATOR_2026 },
    secondaryCta: { label: "Jak funguje eNeschopenka", href: href("cs", "/blog/neschopenka-jak-funguje-eneschopenka") },
    panelChip: "Rychlé vysvětlení",
    panelParas: [
      "Náhrada mzdy a nemocenské nejsou stejná platba.",
      "První fáze se počítá z hodinového výdělku a směn.",
      "ČSSZ od 15. dne používá denní vyměřovací základ.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Praktický lékař · Global Health Česko" },
    reviewLine: "Odborná a jazyková kontrola MUDr. Romanou Pavlů je nutná před zveřejněním.",
    navLabel: "Obsah článku",
    sections: [
      {
        id: "prvnich-14",
        nav: "Prvních 14 dnů",
        eyebrow: "Náhrada mzdy",
        h2: "Co platí zaměstnavatel v prvních 14 dnech",
        blocks: [
          lead("Zaměstnavatel platí 60 % redukovaného průměrného hodinového výdělku za zameškané směny a placené svátky."),
          p("Mzdová účtárna vychází z průměrného hodinového výdělku, ne přímo z aktuální hrubé mzdy. Pro rok 2026 používá odvozené hodinové redukční hranice " + EMPLOYER_HOURLY_THRESHOLDS_2026 + ". Do první hranice započítá 90 %, mezi první a druhou 60 %, mezi druhou a třetí 30 % a nad třetí hranici už nic."),
          p("Z redukovaného výsledku vezme 60 % a vynásobí ho počtem hodin v neodpracovaných směnách. Dva zaměstnanci se stejnou měsíční mzdou proto mohou dostat jinou náhradu, pokud mají jinak rozvrženou pracovní dobu."),
          cite("Pravidla stanoví <a href=\"" + LABOUR_CODE_192 + "\" rel=\"nofollow noopener\" target=\"_blank\">§ 192 zákoníku práce</a>."),
        ],
      },
      {
        id: "od-15-dne",
        nav: "Od 15. dne",
        eyebrow: "Nemocenské ČSSZ",
        h2: "Jak ČSSZ počítá nemocenské od 15. dne",
        blocks: [
          lead("ČSSZ používá redukovaný denní vyměřovací základ a platí všechny kalendářní dny."),
          p("Denní základ vychází zpravidla ze započitatelných příjmů za 12 kalendářních měsíců před měsícem vzniku neschopnosti, dělených započitatelnými dny. V roce 2026 platí denní redukční hranice " + DVZ_THRESHOLDS_2026 + ". Započítává se 90 % do první, 60 % mezi první a druhou a 30 % mezi druhou a třetí hranicí."),
        ],
      },
      {
        id: "sazby-cssz",
        nav: "Sazby ČSSZ",
        eyebrow: "Délka neschopnosti",
        h2: "Kolik procent platí ČSSZ",
        blocks: [
          ul([
            "<strong>15.–30. den:</strong> 60 % redukovaného denního základu.",
            "<strong>31.–60. den:</strong> 66 %.",
            "<strong>Od 61. dne:</strong> 72 %.",
          ]),
          cite("Hranice a sazby byly ověřeny 25. srpna 2026 na stránkách <a href=\"" + MPSV_SICKNESS_2026 + "\" rel=\"nofollow noopener\" target=\"_blank\">MPSV</a> a <a href=\"" + CSSZ_BENEFIT_CALC + "\" rel=\"nofollow noopener\" target=\"_blank\">ČSSZ</a>."),
        ],
      },
      {
        id: "priklad",
        nav: "Příklad",
        eyebrow: "Jak postupovat",
        h2: "Orientační příklad výpočtu nemocenské",
        blocks: [
          lead("Na jednoduchých číslech je vidět, proč se obě fáze nesmí smíchat."),
          p("Příklad zaměstnavatele: průměrný hodinový výdělek 250 Kč je pod první hodinovou hranicí. Započte se 90 %, tedy 225 Kč, a náhrada činí 60 % z této částky, tedy 135 Kč za zameškanou hodinu. Při devíti osmihodinových směnách je orientační náhrada 72 × 135 Kč = 9 720 Kč před zákonným zaokrouhlením a případnými zvláštnostmi mzdového výpočtu."),
          p("Příklad ČSSZ: pokud je nezredukovaný denní vyměřovací základ 1 500 Kč, započte se 90 %, tedy 1 350 Kč. Od 15. do 30. dne činí nemocenské 60 % z redukovaného základu, tedy orientačně 810 Kč za kalendářní den. ČSSZ použije skutečné příjmy, započitatelné a vyloučené dny a zákonné zaokrouhlení."),
          p("Pro vlastní odhad použijte <a href=\"" + MPSV_CALCULATOR_2026 + "\" rel=\"nofollow noopener\" target=\"_blank\">kalkulačku MPSV 2026</a> a výsledek porovnejte s mzdovou účtárnou nebo ČSSZ."),
          warn("Kalkulačka dává jen odhad", "Výsledek může změnit rozhodné období, vyloučené dny, směny, předchozí zaměstnání, dohoda, OSVČ nebo přeshraniční pojistný režim."),
        ],
      },
      {
        id: "co-zkontrolovat",
        nav: "Co zkontrolovat",
        eyebrow: "Když částka nesedí",
        h2: "Co ověřit u zaměstnavatele a ČSSZ",
        blocks: [
          lead("Nejdřív zjistěte, která ze dvou plateb se právě počítá."),
          ul([
            "Kolik směn a hodin jste zameškali v prvních 14 dnech?",
            "Jaký průměrný hodinový výdělek použila mzdová účtárna?",
            "Od kterého dne převzala platbu ČSSZ?",
            "Jaké příjmy a vyloučené dny vstoupily do denního základu?",
            "Odpovídá odhad v kalkulačce MPSV údajům, které eviduje mzdová účtárna nebo ČSSZ?",
          ]),
          p("Proces vystavení neschopenky vysvětluje náš samostatný průvodce <a href=\"" + href("cs", "/blog/neschopenka-jak-funguje-eneschopenka") + "\">Jak funguje eNeschopenka</a>. Pokud potřebujete lékařské posouzení, můžete využít <a href=\"" + href("cs", "/services/neschopenka-online") + "\">online konzultaci pro neschopenku</a>. Lékař nemůže zaručit vystavení neschopenky ani konkrétní výši dávky."),
        ],
      },
    ],
    linksEyebrow: "Global Health Česko",
    linksH2: "Neschopenka a lékařské posouzení",
    linksLead: "ČSSZ počítá dávku; lékař posuzuje zdravotní důvody pracovní neschopnosti.",
    links: [
      { label: "Online konzultace pro neschopenku", href: href("cs", "/services/neschopenka-online") },
      { label: "Jak funguje eNeschopenka", href: href("cs", "/blog/neschopenka-jak-funguje-eneschopenka") },
      { label: "Lékaři v Česku", href: href("cs", "/doctors") },
      { label: "Kontakt Global Health Česko", href: href("cs", "/contact") },
    ],
    ctaBox: {
      h3: "Potřebujete lékařské posouzení?",
      text: "Český lékař může posoudit, zda zdravotní stav odůvodňuje pracovní neschopnost. Výši platby určuje zaměstnavatel a ČSSZ.",
      primary: { label: "Objednat konzultaci", href: href("cs", "/services/neschopenka-online") },
      secondary: { label: "Zobrazit lékaře", href: href("cs", "/doctors") },
    },
    sourcesEyebrow: "Oficiální zdroje",
    sourcesH2: "Pravidla pro rok 2026",
    sourcesLead: "Hranice a postup byly ověřeny 25. srpna 2026.",
    sources: [
      { label: "MPSV — Nemocenské pojištění v roce 2026", href: MPSV_SICKNESS_2026 },
      { label: "ČSSZ — Podrobné informace o nemocenském", href: CSSZ_SICKNESS_DETAIL },
      { label: "ČSSZ — Výše a výpočet dávek", href: CSSZ_BENEFIT_CALC },
      { label: "MPSV — Kalkulačka dávek pro rok 2026", href: MPSV_CALCULATOR_2026 },
      { label: "Zákoník práce § 192", href: LABOUR_CODE_192 },
      { label: "Zákon o nemocenském pojištění", href: SICKNESS_ACT_187 },
    ],
    sourcesNote: "Přesnou náhradu mzdy stanoví zaměstnavatel a přesné nemocenské ČSSZ.",
    faqEyebrow: "Časté otázky",
    faqH2: "Výpočet nemocenské 2026",
    faqs: [
      { q: "Kdo platí prvních 14 dnů?", a: "Zaměstnavatel platí náhradu mzdy za zameškané směny a placené svátky. ČSSZ začne platit nemocenské od 15. kalendářního dne." },
      { q: "Kolik procent platí ČSSZ?", a: "Od 15. do 30. dne 60 %, od 31. do 60. dne 66 % a od 61. dne 72 % redukovaného denního vyměřovacího základu." },
      { q: "Kde najdu oficiální kalkulačku?", a: "MPSV zveřejňuje kalkulačku dávek pro rok 2026. Je orientační: nemusí znát váš skutečný hodinový průměr, směny, rozhodné období, vyloučené dny ani všechny údaje vedené u ČSSZ." },
    ],
    disclaimerTitle: "Zdravotní a finanční upozornění",
    disclaimer: "AI-assisted článek připravený pro českou jazykovou a odbornou kontrolu. Obecné informace k 25. srpnu 2026; nejde o individuální lékařskou, právní ani mzdovou radu.",
  } satisfies Article,
};

const enResearch: LocalePost = {
  locale: "EN",
  slug: "czech-sickness-benefit-calculation-2026-employer-vs-cssz",
  title: "Czech Sickness Benefit Calculation 2026: Employer Pay vs ČSSZ",
  excerpt:
    "In Czechia, sickness-related income is calculated in two stages in 2026: the employer pays wage compensation for the first 14 calendar days only for missed working days, and from day 15 ČSSZ pays sickness benefit for calendar days. This guide explains the exact difference, the 2026 reduction thresholds, and a practical worked example.",
  seoTitle: "Czech sickness benefit 2026: employer vs ČSSZ",
  seoDescription:
    "Czech sickness benefit in 2026: employer compensation for 14 days, ČSSZ from day 15, reduction thresholds and worked examples.",
  category: "General Practice",
  article: {
    lang: "en-GB",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "General Practice",
    categoryHref: href("en", "/blog"),
    eyebrow: "Czechia · Work and income guide",
    h1: "Czech sickness benefit in 2026",
    deck: "The first 14 calendar days are not paid the same way as the rest of a sick leave. That handover from employer wage compensation to state sickness benefit is exactly where most people miscalculate what they will receive.",
    intro:
      "If a doctor in Czechia declares you <strong>temporarily incapable of work</strong>, one single payment does not start from day one. There are <strong>two different calculation systems</strong>. During the first 14 calendar days, your employer pays <strong>wage compensation</strong>, and only for scheduled working days or paid holidays you actually miss. From the <strong>15th calendar day</strong>, the Czech Social Security Administration, <strong>ČSSZ</strong>, takes over and pays <strong>sickness benefit</strong> for calendar days. In 2026 the reduction thresholds used for sickness insurance are 1,633 CZK, 2,449 CZK and 4,897 CZK. So if someone tries to estimate their sick-leave income as one flat percentage of gross salary, they will almost always get the answer wrong.",
    facts: [
      "Days 1-14: employer wage compensation",
      "From day 15: sickness benefit from ČSSZ",
      "New 2026 reduction thresholds apply",
    ],
    primaryCta: { label: "Book an online consultation", href: href("en", "/services/neschopenka-online") },
    secondaryCta: { label: "ČSSZ sickness detail page", href: CSSZ_SICKNESS_DETAIL },
    panelChip: "What to remember",
    panelParas: [
      "Employer wage compensation and ČSSZ sickness benefit are not the same payment and do not use the same base.",
      "Employees are not paid for all calendar days in the first two weeks; they are paid for the working time actually lost under the rota.",
      "From day 15 onward ČSSZ moves to a daily assessment base, and the percentage increases again after day 30 and day 60.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "General Practitioner · Global Health Czechia" },
    reviewLine: "Clinical and native editorial review by MUDr. Romana Pavlů is required before publication.",
    navLabel: "In this article",
    sections: [
      {
        id: "two-systems",
        nav: "Two systems",
        eyebrow: "The key distinction",
        h2: "Sick-leave income is not one continuous payment from day one",
        blocks: [
          lead("The most common misunderstanding is to assume that ČSSZ starts paying sickness benefit immediately once the doctor issues the sick note. For an employee in Czechia in 2026, that is not how it works."),
          p("The opening phase is handled by the <strong>employer</strong>. Under the Labour Code, during the first 14 calendar days of temporary incapacity for work, the employee receives <strong>wage compensation</strong>. That payment is not calculated for every calendar day. It is paid only for <strong>working days and paid holidays</strong> on which the employee was scheduled to work and was unable to do so because of illness."),
          p("Only from the <strong>15th calendar day</strong> does <strong>ČSSZ</strong> step in with sickness benefit from the statutory sickness-insurance system. That benefit is paid by <strong>calendar day</strong>, not by shift. This is why the amount often changes at the handover point even where the same salary continues in the background."),
          ul([
            "Days 1-14: employer, wage compensation, only missed working time and paid holidays.",
            "From day 15: ČSSZ, sickness benefit, all calendar days of incapacity.",
            "Self-employed people are a different category: there is no employer compensation and no sickness benefit for the first 14 days.",
          ]),
          warn("Why expectations often miss the mark", "People frequently multiply a guessed daily rate by all days in the first two weeks. But employers do not pay weekends unless a shift was actually scheduled there. That is why the first sick-leave payment often feels lower or less predictable than expected."),
        ],
      },
      {
        id: "employer-first-14",
        nav: "First 14 days",
        eyebrow: "Wage compensation",
        h2: "How employer wage compensation is calculated in 2026",
        blocks: [
          lead("For the first 14 calendar days, the system does not use ČSSZ's daily assessment base. It starts from the employee's average hourly earnings and reduces that figure first."),
          p("The Czech Labour Code states that wage compensation is paid at <strong>60% of reduced average earnings</strong>. In practice, payroll goes through three steps. First it determines the employee's <strong>average hourly earnings</strong>. Second, it reduces that amount using a mechanism aligned with sickness-insurance reduction bands. Third, it pays 60% of the reduced result for the number of lost scheduled hours."),
          p(`For 2026, the hourly thresholds used for this employer-paid stage are derived from the sickness-insurance thresholds by multiplying them by 0.175. That produces hourly thresholds of <strong>${EMPLOYER_HOURLY_THRESHOLDS_2026}</strong>. Up to the first threshold, 90% is counted; between the first and second, 60%; between the second and third, 30%; and above the third, nothing is counted.`),
          p("Only after that reduction does the 60% payment rate apply. Payroll then multiplies the result by the number of hours in shifts lost during the first 14 calendar days. That means two employees with identical monthly salaries can receive different first-phase sick-leave income if their scheduled shifts fell differently in the calendar."),
          ul([
            "Employer compensation is a payroll calculation, not a ČSSZ payment.",
            "It starts from average hourly earnings, not simply from this month's gross salary.",
            "It covers only lost scheduled working days and paid holidays in the first 14 calendar days.",
            "The payment rate is 60% of reduced average earnings.",
          ]),
          cite(`Legal basis: <a href="${LABOUR_CODE_192}" rel="nofollow noopener" target="_blank">Labour Code § 192</a>. Official 2026 overview: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Sickness insurance in 2026</a>.`),
        ],
      },
      {
        id: "cssz-from-day-15",
        nav: "From day 15",
        eyebrow: "State sickness benefit",
        h2: "How ČSSZ calculates sickness benefit from day 15",
        blocks: [
          lead("From the 15th calendar day onward, the logic changes completely. ČSSZ stops looking at the rota and starts looking at the statutory daily assessment base."),
          p("ČSSZ works from the employee's <strong>countable income</strong> in the relevant period, usually the last 12 calendar months before the month in which the incapacity started. That income is divided by the number of countable calendar days to produce the <strong>daily assessment base</strong>."),
          p(`In 2026, that daily assessment base is reduced against the statutory thresholds of <strong>${DVZ_THRESHOLDS_2026}</strong>. Up to the first threshold, 90% counts; between the first and second, 60%; between the second and third, 30%; and anything above the third threshold is ignored. The result is the <strong>reduced daily assessment base</strong>.`),
          p("The benefit percentage is then applied according to how long the incapacity has lasted. From day 15 to day 30, sickness benefit is <strong>60%</strong> of the reduced daily assessment base. From day 31 to day 60, it rises to <strong>66%</strong>. From day 61 onward, it rises again to <strong>72%</strong>. That is why a longer sick leave can increase slightly even when the underlying income base does not change."),
          ul([
            "From day 15, payment is by calendar day, including weekends.",
            "ČSSZ uses daily reduction bands, not the hourly payroll bands used by employers.",
            "The percentage increases after day 30 and again after day 60.",
            "The standard support period is up to 380 calendar days from the start of incapacity.",
          ]),
          cite(`ČSSZ detailed sickness page: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">CSSZ detail</a>. Calculation examples and reduction bands: <a href="${CSSZ_BENEFIT_CALC}" rel="nofollow noopener" target="_blank">ČSSZ — Amount and calculation of benefits</a>.`),
        ],
      },
      {
        id: "worked-example",
        nav: "Worked example",
        eyebrow: "Practical illustration",
        h2: "Worked example: why the same salary produces different amounts in different weeks",
        blocks: [
          lead("The purpose of a worked example is not to replace payroll or ČSSZ. It is to show why the first two weeks and the later state-paid phase cannot be estimated in the same way."),
          p("Imagine an employee working Monday to Friday who becomes unfit for work on Tuesday 10 March 2026. In the first 14 calendar days, that employee misses nine scheduled working days. The employer therefore ignores the weekends, takes the employee's average hourly earnings, reduces that amount through the 2026 hourly thresholds, and then pays 60% of the reduced figure for the hours actually lost. With eight-hour shifts that means 72 lost hours; with twelve-hour shifts, the multiplier changes even if the monthly salary does not."),
          p("If the incapacity continues beyond 23 March 2026, the next day moves into the ČSSZ phase. At that point ČSSZ no longer asks whether it is Saturday or Tuesday. It asks what the reduced daily assessment base is and pays 60% of it for days 15 to 30 of the incapacity. If the illness lasts beyond day 30, the daily payment rises to 66%; after day 60 it rises to 72%."),
          p("So it is perfectly normal for one person to see three different amounts over the course of one prolonged sick leave: one in employer payroll, a second in the early ČSSZ period, and a third if the incapacity lasts longer than a month. That is not a system error. It is the legal design of Czech sickness insurance."),
          warn("What the example is and is not", "It is a way to understand the mechanics. It is not a payroll forecast to the last crown. The exact amount always depends on your own average earnings, your own rota, and your own countable income history in the relevant period."),
        ],
      },
      {
        id: "after-employment-osvc",
        nav: "After employment and self-employed",
        eyebrow: "Edge cases",
        h2: "What changes after employment ends, and for self-employed people",
        blocks: [
          lead("Not everyone goes through the first 14 days in the same way. After employment ends, or in self-employment, the result is different from the standard employee path."),
          p("If employment has ended and the person falls ill within the <strong>protective period</strong>, sickness benefit can still arise after the end of employment. The standard protective period is <strong>7 calendar days</strong>, but only where the employment lasted at least that long. If the employment was shorter, the protective period is only as long as the employment itself."),
          p("What surprises people is that there is then no employer left to pay wage compensation for the first 14 days. So ČSSZ may be able to pay sickness benefit from day 15, but the opening two-week phase is not covered by employer compensation. That is one of the least intuitive but most important practical rules in the Czech system."),
          p("For the <strong>self-employed</strong>, the structure is stricter again. Sickness insurance is voluntary, and entitlement requires at least three months of participation immediately before incapacity begins. Even where that condition is met, there is still no employer compensation in the first two weeks because there is no employer in the picture."),
          ul([
            "Employee in ongoing employment: first 14 days employer compensation, from day 15 sickness benefit.",
            "Former employee in the protective period: possible sickness benefit from day 15, but no employer compensation for the first two weeks.",
            "Self-employed person: no employer compensation, sickness benefit only from day 15 and only if insurance conditions are met.",
          ]),
          cite(`Protective-period rules and support duration: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">ČSSZ sickness detail</a>. Self-employed insurance rules: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Sickness insurance in 2026</a>.`),
        ],
      },
      {
        id: "what-to-check",
        nav: "What to check",
        eyebrow: "Practical checklist",
        h2: "What to check if the amount is not what you expected",
        blocks: [
          lead("Before assuming there has been a payroll or ČSSZ mistake, it helps to identify exactly which calculation stage you are in and what base is being used."),
          ul([
            "Are you still within the first 14 calendar days, or already in the ČSSZ phase from day 15 onward?",
            "How many working days and hours were actually lost under your rota in the first two weeks?",
            "Did payroll use the correct average hourly earnings from the last closed quarter, as Czech labour law requires?",
            "Did the incapacity begin just after employment ended, so employer compensation never arose?",
            "Is this already a longer incapacity where the percentage increased after day 30 or day 60?",
          ]),
          p("If you first need the process side rather than the calculation side, we cover that separately in our Czech guide on how eNeschopenka works: <a href=\"https://www.myglobalhealth.online/czechia/en/blog/neschopenka-czech-sick-note-explained\">How the Czech electronic sick note actually works</a>. That guide is about the sick note process itself. This article is deliberately about the money."),
          p("And if you still need a doctor to decide whether temporary incapacity for work is medically justified in your case, you can book an online consultation. What a doctor can decide is whether incapacity is clinically appropriate. What neither the doctor nor the clinic can decide is the statutory amount paid by payroll or by ČSSZ."),
        ],
      },
    ],
    linksEyebrow: "Global Health Czechia",
    linksH2: "Where to go next",
    linksLead: "If you need a medical assessment for incapacity, or if you want the separate process guide on eNeschopenka first, these are the most useful next steps.",
    links: [
      { label: "Online sick-note consultation in Czechia", href: href("en", "/services/neschopenka-online") },
      { label: "How the Czech electronic sick note works", href: "https://www.myglobalhealth.online/czechia/en/blog/neschopenka-czech-sick-note-explained" },
      { label: "Our doctors in Czechia", href: href("en", "/doctors") },
      { label: "Contact Global Health Czechia", href: href("en", "/contact") },
    ],
    ctaBox: {
      h3: "Need the medical assessment first?",
      text: "An online consultation with a Czech doctor can establish whether temporary incapacity for work is medically justified. The amount of money paid afterwards is then determined by payroll and ČSSZ under Czech law.",
      primary: { label: "Book a consultation", href: href("en", "/services/neschopenka-online") },
      secondary: { label: "See our doctors", href: href("en", "/doctors") },
    },
    sourcesEyebrow: "Official sources",
    sourcesH2: "Where the 2026 figures come from",
    sourcesLead: "The values used here are tied to the law and official state guidance applicable in 2026. For an exact personal amount, you still need your own payroll data and your own ČSSZ assessment base.",
    sources: [
      { label: "MPSV — Sickness insurance in 2026", href: MPSV_SICKNESS_2026 },
      { label: "ČSSZ — detailed sickness information", href: CSSZ_SICKNESS_DETAIL },
      { label: "ČSSZ — amount and calculation of benefits", href: CSSZ_BENEFIT_CALC },
      { label: "Czech Labour Code § 192", href: LABOUR_CODE_192 },
      { label: "Act No. 187/2006 Coll. on sickness insurance", href: SICKNESS_ACT_187 },
    ],
    sourcesNote: "Global Health is not ČSSZ and not your employer's payroll department. A doctor can assess incapacity for work, but cannot promise a specific benefit amount or change the statutory calculation.",
    faqEyebrow: "FAQ",
    faqH2: "Common questions about Czech sickness-benefit calculation",
    faqs: [
      {
        q: "How is sickness benefit calculated in Czechia in 2026?",
        a: "In two stages. For the first 14 calendar days, the employer pays wage compensation only for missed working days and paid holidays, at 60% of reduced average earnings. From day 15 onward, ČSSZ pays sickness benefit for calendar days from a reduced daily assessment base.",
      },
      {
        q: "What is the difference between employer wage compensation and ČSSZ sickness benefit?",
        a: "Employer wage compensation is the opening phase paid under the Labour Code. ČSSZ sickness benefit is the statutory sickness-insurance payment from day 15. They differ in payer, calculation base, and whether the system follows working time or calendar days.",
      },
      {
        q: "What are the 2026 reduction thresholds?",
        a: "For ČSSZ sickness benefit they are 1,633 CZK, 2,449 CZK and 4,897 CZK per day. For the employer-paid first phase, the Labour Code converts those to hourly thresholds of 285.78 CZK, 428.58 CZK and 856.98 CZK by multiplying the sickness thresholds by 0.175.",
      },
      {
        q: "What percentage do I receive from day 15 onward?",
        a: "From day 15 to day 30, sickness benefit is 60% of the reduced daily assessment base. From day 31 to day 60 it is 66%, and from day 61 onward it is 72%. The payment is made for calendar days.",
      },
      {
        q: "Why was the amount in the first two weeks lower than I expected?",
        a: "Most often because the employer does not pay all calendar days in that phase. It pays only for scheduled working time and paid holidays you missed, and it uses reduced average hourly earnings rather than a simple share of gross salary.",
      },
      {
        q: "Do I get anything if I fall ill after employment has ended?",
        a: "If the incapacity starts inside the protective period, sickness benefit can still arise from day 15. But there is no employer compensation for the first 14 days once employment has ended, because there is no employer left to compensate lost work.",
      },
    ],
    disclaimerTitle: "Medical and financial notice",
    disclaimer:
      "Written by MUDr. Vojtěch Černý, General Practitioner at Global Health Czechia. Clinical and native editorial review by MUDr. Romana Pavlů is required before publication. This article provides general information about Czech temporary incapacity for work and sickness-related income as of 24 August 2026. It is not personal medical advice, legal advice, or payroll advice. Your employer determines the exact first-phase wage compensation from your payroll records; ČSSZ determines the exact sickness benefit from your countable income under the law. In a medical emergency, call 155 or 112 immediately.",
  } satisfies Article,
};

const pt: LocalePost = {
  locale: "PT",
  slug: "calculo-da-baixa-medica-na-chequia-2026-empregador-vs-cssz",
  title: "Cálculo da baixa médica na Chéquia em 2026: empregador vs. ČSSZ",
  excerpt:
    "Na Chéquia, o rendimento durante uma baixa por doença em 2026 é calculado em duas fases: nos primeiros 14 dias de calendário o empregador paga compensação salarial apenas pelos dias de trabalho perdidos; a partir do dia 15 a ČSSZ paga o subsídio de doença por dias de calendário. Explicamos as diferenças, os limites de redução de 2026 e um exemplo prático.",
  seoTitle: "Baixa médica na Chéquia 2026: empregador vs. ČSSZ",
  seoDescription:
    "Baixa médica na Chéquia em 2026: 14 dias pelo empregador, ČSSZ desde o dia 15, limites de redução e exemplo prático.",
  category: "Medicina geral",
  article: {
    lang: "pt-PT",
    tagline: "Medicina a qualquer hora, em qualquer lugar",
    categoryLabel: "Medicina geral",
    categoryHref: href("pt", "/blog"),
    eyebrow: "Chéquia · Trabalho e rendimento",
    h1: "Como se calcula a baixa médica checa em 2026",
    deck: "Os primeiros 14 dias não funcionam da mesma forma que o resto da baixa. É nessa passagem do empregador para a ČSSZ que mais pessoas fazem contas erradas.",
    intro:
      "Se um médico na Chéquia o declarar em <strong>incapacidade temporária para o trabalho</strong>, o pagamento não segue uma única fórmula desde o primeiro dia. Existem <strong>dois regimes de cálculo</strong>. Durante os primeiros 14 dias de calendário, o empregador paga uma <strong>compensação salarial</strong>, e só pelos dias úteis ou feriados pagos em que o trabalhador iria efetivamente trabalhar. A partir do <strong>15.º dia de calendário</strong>, a <strong>Administração Checa da Segurança Social, ČSSZ</strong>, assume o pagamento do <strong>subsídio de doença</strong> por dias de calendário. Em 2026, os limites de redução relevantes são 1 633 CZK, 2 449 CZK e 4 897 CZK. Uma estimativa baseada apenas numa percentagem fixa do salário bruto dará quase sempre um valor errado.",
    facts: [
      "Dias 1-14: compensação salarial do empregador",
      "A partir do dia 15: prestação paga pela ČSSZ",
      "Aplicam-se novos limites de 2026",
    ],
    primaryCta: { label: "Marcar consulta online", href: href("pt", "/services/neschopenka-online") },
    secondaryCta: { label: "Detalhe oficial da ČSSZ", href: CSSZ_SICKNESS_DETAIL },
    panelChip: "O essencial",
    panelParas: [
      "A compensação do empregador e o subsídio da ČSSZ não são a mesma prestação e não usam a mesma base de cálculo.",
      "Nos primeiros 14 dias o trabalhador não recebe automaticamente por todos os dias do calendário, mas apenas pelo horário de trabalho perdido.",
      "Depois do dia 15, a ČSSZ passa para uma base diária e a percentagem sobe novamente depois do dia 30 e do dia 60.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Médico de clínica geral · Global Health Chéquia" },
    reviewLine: "Revisão clínica de MUDr. Romana Pavlů, médica de clínica geral para adultos, Global Health Chéquia.",
    navLabel: "Neste artigo",
    sections: [
      {
        id: "dois-regimes",
        nav: "Dois regimes",
        eyebrow: "Diferença central",
        h2: "Não existe um único pagamento contínuo desde o primeiro dia",
        blocks: [
          lead("O erro mais frequente é pensar que a ČSSZ começa logo a pagar assim que o médico emite a baixa. Em 2026, para um trabalhador por conta de outrem na Chéquia, não é isso que acontece."),
          p("A fase inicial é responsabilidade do <strong>empregador</strong>. Nos primeiros 14 dias de calendário de incapacidade temporária, o trabalhador tem direito a <strong>compensação salarial</strong>. Mas essa compensação não é contada por todos os dias do calendário. Só é paga pelos <strong>dias de trabalho e feriados pagos</strong> em que existia horário previsto e que se perderam por doença."),
          p("Só a partir do <strong>15.º dia de calendário</strong> entra o <strong>subsídio de doença</strong> do sistema de seguro de doença. Aí o pagamento passa para a ČSSZ e já é feito por <strong>dias de calendário</strong>, não por turnos. É exatamente por isso que o valor muda muitas vezes na passagem entre a fase do empregador e a fase da segurança social, mesmo quando o salário base da pessoa não mudou."),
          ul([
            "Dias 1-14: empregador, compensação salarial, apenas tempo de trabalho perdido e feriados pagos.",
            "A partir do dia 15: ČSSZ, subsídio de doença, todos os dias de calendário da incapacidade.",
            "Trabalhadores independentes são um caso diferente: não têm compensação do empregador nem recebem esta prestação nos primeiros 14 dias.",
          ]),
          warn("Porque é que as expectativas falham tantas vezes", "Muitas pessoas multiplicam uma taxa diária por todos os dias do calendário logo nas primeiras duas semanas. Mas o empregador não paga fins de semana se não havia turno previsto nesses dias. Por isso, o primeiro valor recebido costuma parecer menos intuitivo do que o trabalhador esperava."),
        ],
      },
      {
        id: "primeiros-14-dias",
        nav: "Primeiros 14 dias",
        eyebrow: "Compensação salarial",
        h2: "Como se calcula a compensação do empregador em 2026",
        blocks: [
          lead("Nos primeiros 14 dias de calendário, a base não é a base diária usada pela ČSSZ. O cálculo começa no rendimento horário médio do trabalhador e esse valor é primeiro reduzido."),
          p("O direito laboral checo estabelece que a compensação salarial corresponde a <strong>60% do rendimento médio reduzido</strong>. Na prática, o processamento salarial segue três passos. Primeiro determina o <strong>rendimento médio por hora</strong>. Depois reduz esse valor através de limites horários derivados das regras do seguro de doença. Só no fim aplica a taxa de 60%."),
          p(`Para 2026, esses limites horários resultam da conversão das bandas do seguro de doença pelo coeficiente 0,175. Assim, surgem as referências horárias de <strong>${EMPLOYER_HOURLY_THRESHOLDS_2026}</strong>. Até ao primeiro limite contam 90%, entre o primeiro e o segundo contam 60%, entre o segundo e o terceiro contam 30%, e acima do terceiro já nada conta.`),
          ul([
            "A compensação do empregador é uma operação salarial, não um pagamento da ČSSZ.",
            "Parte do rendimento médio horário e não simplesmente do salário bruto do mês em curso.",
            "Abrange apenas o tempo de trabalho perdido e os feriados pagos nos primeiros 14 dias de calendário.",
            "A taxa aplicada é 60% do rendimento médio reduzido.",
          ]),
          cite(`Base legal: <a href="${LABOUR_CODE_192}" rel="nofollow noopener" target="_blank">Código do Trabalho checo § 192</a>. Visão oficial de 2026: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Seguro de doença em 2026</a>.`),
        ],
      },
      {
        id: "cssz-dia-15",
        nav: "Dia 15 em diante",
        eyebrow: "Subsídio da ČSSZ",
        h2: "Como a ČSSZ calcula o subsídio de doença a partir do dia 15",
        blocks: [
          lead("A partir do 15.º dia de calendário, a ČSSZ deixa de usar o horário de trabalho e passa a calcular o pagamento a partir da base diária prevista na lei."),
          p("A ČSSZ parte do <strong>rendimento contabilizável</strong> no período relevante, normalmente os 12 meses civis anteriores ao mês em que começou a incapacidade. Esse rendimento é dividido pelo número de dias de calendário contabilizáveis e assim nasce a <strong>base diária de incidência</strong>."),
          p(`Em 2026, essa base diária é reduzida usando os limites legais de <strong>${DVZ_THRESHOLDS_2026}</strong>. Até ao primeiro limite contam 90%, entre o primeiro e o segundo contam 60%, entre o segundo e o terceiro contam 30%, e o que ultrapassa o terceiro deixa de contar. O resultado é a <strong>base diária reduzida</strong>.`),
          p("Sobre essa base aplica-se depois a percentagem correspondente à duração da incapacidade. Do dia 15 ao dia 30, o subsídio é <strong>60%</strong> da base diária reduzida. Do dia 31 ao dia 60 sobe para <strong>66%</strong>. A partir do dia 61 sobe para <strong>72%</strong>. É por isso que uma baixa longa pode aumentar ligeiramente sem que a base salarial mude."),
          ul([
            "A partir do dia 15, o pagamento é feito por dias de calendário, incluindo fins de semana.",
            "A ČSSZ usa limites diários, não os limites horários da fase do empregador.",
            "A percentagem sobe depois do dia 30 e volta a subir depois do dia 60.",
            "O período de apoio é, em regra, até 380 dias de calendário desde o início da incapacidade.",
          ]),
          cite(`Página detalhada da ČSSZ: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">ČSSZ — informação detalhada</a>. Limites e exemplos: <a href="${CSSZ_BENEFIT_CALC}" rel="nofollow noopener" target="_blank">ČSSZ — montante e cálculo das prestações</a>.`),
        ],
      },
      {
        id: "exemplo",
        nav: "Exemplo",
        eyebrow: "Exemplo prático",
        h2: "Porque o mesmo salário gera valores diferentes em semanas diferentes",
        blocks: [
          lead("Este exemplo mostra porque é que as primeiras duas semanas e a fase posterior, paga pela ČSSZ, exigem cálculos diferentes."),
          p("Imagine um trabalhador com horário regular de segunda a sexta que fica incapaz para o trabalho na terça-feira, 10 de março de 2026. Nos primeiros 14 dias de calendário perde nove dias úteis programados. O empregador ignora os fins de semana, pega no rendimento médio horário, reduz esse valor através dos limites horários de 2026 e paga 60% do resultado pelas horas efetivamente perdidas. Com turnos de oito horas, isso significa 72 horas perdidas; com turnos de doze horas, a conta é diferente, mesmo que o salário mensal seja igual."),
          p("Se a incapacidade continuar para lá de 23 de março de 2026, no dia seguinte começa a fase da ČSSZ. A partir daí, o que importa é a base diária reduzida e a taxa legal correspondente ao dia da incapacidade: 60% entre o dia 15 e o dia 30, 66% depois e, em baixas mais prolongadas, 72%."),
          warn("Para que serve este exemplo", "Serve para perceber a mecânica. Não serve para prever ao cêntimo. O valor exato depende sempre do seu rendimento médio, do seu horário e do histórico de rendimentos considerado pela ČSSZ."),
        ],
      },
      {
        id: "apos-fim-emprego-osvc",
        nav: "Fim do emprego e independentes",
        eyebrow: "Casos-limite",
        h2: "O que muda depois do fim do emprego e para trabalhadores independentes",
        blocks: [
          lead("Nem todas as pessoas passam pelos primeiros 14 dias da mesma maneira. Depois de terminar o emprego, ou no caso dos independentes, o resultado é diferente do percurso normal de um trabalhador por conta de outrem."),
          p("Se a relação laboral já terminou e a pessoa adoece ainda dentro do <strong>prazo de proteção</strong>, o direito ao subsídio pode continuar a nascer. Esse prazo é normalmente de <strong>7 dias de calendário</strong>, desde que o emprego tenha durado pelo menos esse tempo. Se durou menos, o prazo de proteção dura apenas tanto quanto durou o próprio emprego."),
          p("Quando a relação laboral já terminou, não há empregador que pague a compensação dos primeiros 14 dias. A ČSSZ pode pagar a partir do dia 15, mas as duas semanas iniciais ficam sem compensação salarial. Para os <strong>trabalhadores independentes</strong>, o seguro de doença é voluntário e, mesmo quando existe direito, não há compensação do empregador nos primeiros 14 dias."),
          ul([
            "Trabalhador com contrato em vigor: primeiros 14 dias compensados pelo empregador, a partir do dia 15 subsídio.",
            "Ex-trabalhador no prazo de proteção: possível subsídio a partir do dia 15, mas sem compensação salarial nas primeiras duas semanas.",
            "Independente: sem compensação do empregador; subsídio apenas a partir do dia 15 e se as condições do seguro estiverem cumpridas.",
          ]),
          cite(`Prazo de proteção e duração do apoio: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">ČSSZ — informação detalhada</a>. Regras para independentes: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Seguro de doença em 2026</a>.`),
        ],
      },
      {
        id: "o-que-verificar",
        nav: "O que verificar",
        eyebrow: "Checklist prático",
        h2: "O que deve confirmar quando o valor não bate certo",
        blocks: [
          lead("Antes de presumir que houve erro da empresa ou da ČSSZ, vale a pena confirmar em que fase do cálculo se encontra e qual é a base usada."),
          ul([
            "Ainda está nos primeiros 14 dias de calendário ou já entrou na fase ČSSZ do dia 15 em diante?",
            "Quantos dias úteis e quantas horas se perderam realmente, de acordo com o seu horário?",
            "O processamento salarial usou o rendimento médio horário correto do último trimestre fechado?",
            "A incapacidade começou logo após o fim do emprego, de modo que nunca houve direito a compensação do empregador?",
            "Trata-se já de uma incapacidade mais longa, em que a percentagem subiu depois do dia 30 ou do dia 60?",
          ]),
          p("Se o que precisa primeiro é do lado do processo e não do cálculo, tratamos isso em separado no nosso guia sobre a eNeschopenka: <a href=\"https://www.myglobalhealth.online/czechia/pt/blog/neschopenka-czech-sick-note-explained\">como funciona a baixa eletrónica checa</a>. Esse texto explica o circuito do documento. Este artigo está propositadamente focado no dinheiro."),
          p("Se ainda precisa que um médico decida se a incapacidade temporária para o trabalho é clinicamente justificada no seu caso, pode marcar uma consulta online. O médico decide a questão clínica; o valor é decidido pela lei, pelo empregador e pela ČSSZ."),
        ],
      },
    ],
    linksEyebrow: "Global Health Chéquia",
    linksH2: "Próximos passos",
    linksLead: "Se precisa de uma avaliação médica da incapacidade para o trabalho, ou se quer primeiro perceber o processo da eNeschopenka, estes são os passos mais úteis.",
    links: [
      { label: "Consulta online para baixa médica na Chéquia", href: href("pt", "/services/neschopenka-online") },
      { label: "Como funciona a baixa eletrónica checa", href: "https://www.myglobalhealth.online/czechia/pt/blog/neschopenka-czech-sick-note-explained" },
      { label: "Os nossos médicos na Chéquia", href: href("pt", "/doctors") },
      { label: "Contactar a Global Health Chéquia", href: href("pt", "/contact") },
    ],
    ctaBox: {
      h3: "Precisa primeiro da avaliação clínica?",
      text: "Uma consulta online com um médico na Chéquia pode confirmar se a incapacidade temporária para o trabalho é clinicamente adequada. O cálculo do valor pago é depois feito por lei, pelo empregador e pela ČSSZ.",
      primary: { label: "Marcar consulta", href: href("pt", "/services/neschopenka-online") },
      secondary: { label: "Ver médicos", href: href("pt", "/doctors") },
    },
    sourcesEyebrow: "Fontes oficiais",
    sourcesH2: "De onde vêm os valores de 2026",
    sourcesLead: "Os números usados aqui resultam da lei checa e das orientações oficiais de 2026. Para o valor pessoal exato, continua a ser preciso o seu histórico salarial e a base apurada pela ČSSZ.",
    sources: [
      { label: "MPSV — Seguro de doença em 2026", href: MPSV_SICKNESS_2026 },
      { label: "ČSSZ — informação detalhada sobre o subsídio de doença", href: CSSZ_SICKNESS_DETAIL },
      { label: "ČSSZ — montante e cálculo das prestações", href: CSSZ_BENEFIT_CALC },
      { label: "Código do Trabalho checo § 192", href: LABOUR_CODE_192 },
      { label: "Lei n.º 187/2006 sobre seguro de doença", href: SICKNESS_ACT_187 },
    ],
    sourcesNote: "A Global Health não é a ČSSZ nem o departamento salarial do seu empregador. O médico pode avaliar a incapacidade para o trabalho, mas não pode prometer um montante específico nem alterar o cálculo legal da prestação.",
    faqEyebrow: "FAQ",
    faqH2: "Perguntas frequentes sobre o cálculo da baixa na Chéquia",
    faqs: [
      {
        q: "Como se calcula a baixa médica na Chéquia em 2026?",
        a: "Em duas fases. Nos primeiros 14 dias de calendário, o empregador paga compensação salarial apenas pelos dias úteis e feriados pagos perdidos, à taxa de 60% do rendimento médio reduzido. A partir do dia 15, a ČSSZ paga o subsídio de doença por dias de calendário a partir de uma base diária reduzida.",
      },
      {
        q: "Qual é a diferença entre compensação do empregador e subsídio da ČSSZ?",
        a: "A compensação do empregador é a fase inicial prevista no direito laboral. O subsídio da ČSSZ é a prestação legal do seguro de doença a partir do dia 15. Muda o pagador, a base de cálculo e o facto de se contar tempo de trabalho ou dias de calendário.",
      },
      {
        q: "Quais são os limites de redução de 2026?",
        a: "Para o subsídio da ČSSZ são 1 633 CZK, 2 449 CZK e 4 897 CZK por dia. Para a compensação do empregador, a lei converte esses valores em limites horários de 285,78 CZK, 428,58 CZK e 856,98 CZK, multiplicando por 0,175.",
      },
      {
        q: "Que percentagem recebo a partir do dia 15?",
        a: "Do dia 15 ao dia 30, o subsídio é 60% da base diária reduzida. Do dia 31 ao dia 60 sobe para 66% e, a partir do dia 61, para 72%. O pagamento é feito por dias de calendário.",
      },
      {
        q: "Porque é que recebi menos nas primeiras duas semanas do que esperava?",
        a: "Normalmente porque nessa fase o empregador não paga todos os dias do calendário. Compensa apenas o tempo de trabalho perdido e os feriados pagos, usando o rendimento horário médio reduzido e não uma simples percentagem do salário bruto.",
      },
      {
        q: "Recebo alguma coisa se adoecer depois de terminar o emprego?",
        a: "Se a incapacidade começar dentro do prazo de proteção, pode existir direito ao subsídio a partir do dia 15. Mas já não existe compensação do empregador para os primeiros 14 dias, porque a relação laboral terminou.",
      },
    ],
    disclaimerTitle: "Aviso médico e financeiro",
    disclaimer:
      "Escrito por MUDr. Vojtěch Černý, médico de clínica geral da Global Health Chéquia, com revisão clínica de MUDr. Romana Pavlů, médica de clínica geral para adultos. Este artigo fornece informação geral sobre a incapacidade temporária para o trabalho e os pagamentos associados na Chéquia com referência a 24 de agosto de 2026. Não substitui aconselhamento médico individual, aconselhamento jurídico nem aconselhamento salarial. O valor exato da compensação inicial é determinado pelo seu empregador com base nos seus dados salariais; o valor exato do subsídio é determinado pela ČSSZ de acordo com o seu rendimento contabilizável e a lei. Em urgência médica, ligue 155 ou 112.",
  } satisfies Article,
};

const es: LocalePost = {
  locale: "ES",
  slug: "calculo-de-la-baja-medica-en-chequia-2026-empleador-vs-cssz",
  title: "Cálculo de la baja médica en Chequia en 2026: empleador vs. ČSSZ",
  excerpt:
    "En Chequia, los ingresos durante una baja por enfermedad en 2026 se calculan en dos fases: los primeros 14 días de calendario los paga el empleador como compensación salarial solo por los días laborables perdidos; desde el día 15 paga la ČSSZ por días de calendario. La guía aclara ambos cálculos, los límites de reducción de 2026 y un ejemplo práctico.",
  seoTitle: "Baja médica Chequia 2026: empleador vs. ČSSZ",
  seoDescription:
    "Baja médica en Chequia en 2026: 14 días a cargo del empleador, ČSSZ desde el día 15, límites de reducción y ejemplo práctico.",
  category: "Medicina general",
  article: {
    lang: "es-ES",
    tagline: "Medicina en cualquier momento y lugar",
    categoryLabel: "Medicina general",
    categoryHref: href("es", "/blog"),
    eyebrow: "Chequia · Trabajo e ingresos",
    h1: "Cómo se calcula la baja checa en 2026",
    deck: "Los primeros 14 días no se pagan igual que el resto de la baja. Justo en ese paso entre el empleador y la ČSSZ es donde más gente se equivoca al calcular.",
    intro:
      "Si en Chequia un médico le declara en <strong>incapacidad temporal para el trabajo</strong>, no empieza desde el primer día una única prestación lineal. Existen <strong>dos sistemas de cálculo</strong>. Durante los primeros 14 días de calendario, el empleador paga una <strong>compensación salarial</strong>, y solo por los días laborables o festivos retribuidos en los que usted realmente habría trabajado. A partir del <strong>día 15 de calendario</strong>, la <strong>Administración Checa de la Seguridad Social, ČSSZ</strong>, pasa a pagar la <strong>prestación por enfermedad</strong> por días de calendario. En 2026, los límites de reducción aplicables son 1.633 CZK, 2.449 CZK y 4.897 CZK. Por eso, quien intenta estimar la baja como un único porcentaje del salario bruto casi siempre acaba con una cifra equivocada.",
    facts: [
      "Días 1-14: compensación salarial del empleador",
      "Desde el día 15: prestación pagada por la ČSSZ",
      "Se aplican nuevos límites de 2026",
    ],
    primaryCta: { label: "Reservar consulta online", href: href("es", "/services/neschopenka-online") },
    secondaryCta: { label: "Detalle oficial de la ČSSZ", href: CSSZ_SICKNESS_DETAIL },
    panelChip: "Lo más importante",
    panelParas: [
      "La compensación del empleador y la prestación de la ČSSZ no son la misma ayuda ni usan la misma base de cálculo.",
      "Durante las dos primeras semanas el trabajador no cobra automáticamente todos los días de calendario, sino solo el tiempo de trabajo realmente perdido.",
      "Desde el día 15 la ČSSZ pasa a una base diaria y el porcentaje vuelve a subir después del día 30 y del día 60.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Médico de medicina general · Global Health Chequia" },
    reviewLine: "Revisión clínica de MUDr. Romana Pavlů, médica de medicina general para adultos, Global Health Chequia.",
    navLabel: "En este artículo",
    sections: [
      {
        id: "dos-regimenes",
        nav: "Dos regímenes",
        eyebrow: "Diferencia clave",
        h2: "No existe un único pago continuo desde el primer día",
        blocks: [
          lead("El error más habitual es pensar que la ČSSZ empieza a pagar en cuanto el médico emite la baja. Para una persona asalariada en Chequia en 2026, no funciona así."),
          p("La fase inicial corresponde al <strong>empleador</strong>. Durante los primeros 14 días de calendario de incapacidad temporal, la persona trabajadora tiene derecho a una <strong>compensación salarial</strong>. Pero esa compensación no se calcula por todos los días del calendario. Solo se paga por los <strong>días laborables y festivos retribuidos</strong> en los que existía jornada programada y que se pierden por enfermedad."),
          p("Solo a partir del <strong>día 15 de calendario</strong> entra en juego la <strong>prestación por enfermedad</strong> del seguro checo, pagada por la ČSSZ. A partir de ahí ya se paga por <strong>días de calendario</strong> y no por turnos. Precisamente por eso el importe suele cambiar al pasar de la fase del empleador a la fase de la seguridad social, aunque el salario base no haya cambiado."),
          ul([
            "Días 1-14: empleador, compensación salarial, solo tiempo de trabajo perdido y festivos retribuidos.",
            "Desde el día 15: ČSSZ, prestación por enfermedad, todos los días de calendario de la incapacidad.",
            "Las personas autónomas son un caso distinto: no tienen compensación del empleador ni cobran esta prestación en los primeros 14 días.",
          ]),
          warn("Por qué suelen fallar las expectativas", "Mucha gente multiplica una supuesta cuantía diaria por todos los días del calendario ya en las dos primeras semanas. Pero el empleador no paga fines de semana si no había turno previsto. Por eso la primera cantidad recibida suele parecer menos intuitiva de lo esperado."),
        ],
      },
      {
        id: "primeros-14",
        nav: "Primeros 14 días",
        eyebrow: "Compensación salarial",
        h2: "Cómo se calcula la compensación del empleador en 2026",
        blocks: [
          lead("En los primeros 14 días de calendario, la base no es la base diaria usada por la ČSSZ. El cálculo empieza en el rendimiento medio por hora y ese valor se reduce primero."),
          p("La normativa laboral checa establece que la compensación salarial equivale al <strong>60% del rendimiento medio reducido</strong>. En la práctica, la nómina sigue tres pasos. Primero calcula el <strong>rendimiento medio por hora</strong>. Después reduce ese valor con franjas horarias derivadas de las reglas del seguro de enfermedad. Solo al final aplica el 60%."),
          p(`En 2026, esas franjas horarias se obtienen de los límites del seguro de enfermedad multiplicándolos por 0,175. Así aparecen los umbrales de <strong>${EMPLOYER_HOURLY_THRESHOLDS_2026}</strong> por hora. Hasta el primer umbral cuenta el 90%, entre el primero y el segundo cuenta el 60%, entre el segundo y el tercero cuenta el 30%, y por encima del tercero ya no cuenta nada.`),
          ul([
            "La compensación del empleador es una operación de nómina, no un pago de la ČSSZ.",
            "Parte del rendimiento medio por hora, no simplemente del salario bruto del mes corriente.",
            "Cubre solo el tiempo de trabajo perdido y los festivos retribuidos de los primeros 14 días.",
            "La tasa aplicable es el 60% del rendimiento medio reducido.",
          ]),
          cite(`Base legal: <a href="${LABOUR_CODE_192}" rel="nofollow noopener" target="_blank">Código del Trabajo checo § 192</a>. Resumen oficial de 2026: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Seguro de enfermedad en 2026</a>.`),
        ],
      },
      {
        id: "cssz-dia-15",
        nav: "Desde el día 15",
        eyebrow: "Prestación estatal",
        h2: "Cómo calcula la ČSSZ la prestación desde el día 15",
        blocks: [
          lead("A partir del día 15 de calendario, la ČSSZ deja de usar el horario laboral y calcula el pago con la base diaria prevista por la ley."),
          p("La ČSSZ parte del <strong>ingreso computable</strong> del período relevante, normalmente los 12 meses naturales anteriores al mes en que empezó la incapacidad. Ese ingreso se divide entre el número de días naturales computables y así nace la <strong>base diaria de cálculo</strong>."),
          p(`En 2026, esa base diaria se reduce usando los límites legales de <strong>${DVZ_THRESHOLDS_2026}</strong>. Hasta el primer límite cuenta el 90%, entre el primero y el segundo el 60%, entre el segundo y el tercero el 30%, y lo que supera el tercero deja de contar. El resultado es la <strong>base diaria reducida</strong>.`),
          p("Sobre esa base se aplica el porcentaje según la duración de la incapacidad. Del día 15 al 30 la prestación es el <strong>60%</strong> de la base diaria reducida. Del día 31 al 60 sube al <strong>66%</strong>. A partir del día 61 sube al <strong>72%</strong>. Por eso una baja larga puede aumentar ligeramente sin que cambie la base salarial inicial."),
          ul([
            "Desde el día 15 el pago se hace por días de calendario, incluidos los fines de semana.",
            "La ČSSZ usa límites diarios, no los umbrales horarios de la fase del empleador.",
            "El porcentaje sube después del día 30 y vuelve a subir después del día 60.",
            "La duración ordinaria del apoyo es de hasta 380 días de calendario desde el inicio de la incapacidad.",
          ]),
          cite(`Página detallada de la ČSSZ: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">ČSSZ — información detallada</a>. Umbrales y ejemplos: <a href="${CSSZ_BENEFIT_CALC}" rel="nofollow noopener" target="_blank">ČSSZ — importe y cálculo de prestaciones</a>.`),
        ],
      },
      {
        id: "ejemplo",
        nav: "Ejemplo",
        eyebrow: "Ejemplo práctico",
        h2: "Por qué el mismo salario da importes distintos en semanas distintas",
        blocks: [
          lead("Este ejemplo muestra por qué las dos primeras semanas y la fase posterior, pagada por la ČSSZ, requieren cálculos distintos."),
          p("Imagine una persona asalariada con horario regular de lunes a viernes que cae de baja el martes 10 de marzo de 2026. En los primeros 14 días naturales pierde nueve jornadas laborables programadas. El empleador ignora los fines de semana, toma el rendimiento medio por hora, lo reduce con los umbrales horarios de 2026 y paga el 60% del resultado por las horas realmente perdidas. Con turnos de ocho horas son 72 horas; con turnos de doce horas, la cuenta cambia aunque el salario mensual sea idéntico."),
          p("Si la incapacidad continúa más allá del 23 de marzo de 2026, al día siguiente empieza la fase de la ČSSZ. Lo relevante pasa a ser la base diaria reducida y el porcentaje legal aplicable: 60% entre el día 15 y el 30, 66% después y, en bajas más largas, 72%."),
          warn("Para qué sirve este ejemplo", "Sirve para entender el mecanismo. No sirve para predecir el importe exacto al céntimo. La cantidad real siempre depende de su rendimiento medio, de su horario y del historial de ingresos que entra en el cálculo de la ČSSZ."),
        ],
      },
      {
        id: "fin-empleo-autonomos",
        nav: "Fin del empleo y autónomos",
        eyebrow: "Casos límite",
        h2: "Qué cambia tras el fin del empleo y para autónomos",
        blocks: [
          lead("No todo el mundo atraviesa los primeros 14 días de la misma forma. Tras el fin del empleo, o en el trabajo autónomo, el resultado es distinto al caso estándar de una persona asalariada."),
          p("Si la relación laboral ya terminó y la enfermedad empieza aún dentro del <strong>período de protección</strong>, puede seguir existiendo derecho a la prestación. Ese período suele ser de <strong>7 días de calendario</strong>, siempre que el empleo haya durado al menos ese tiempo. Si duró menos, el período de protección dura solo tanto como duró ese empleo."),
          p("Cuando la relación laboral ya ha terminado, no hay un empleador que pague la compensación de los primeros 14 días. La ČSSZ puede pagar desde el día 15, pero las dos primeras semanas quedan sin compensación salarial. Para las <strong>personas autónomas</strong>, además, el seguro de enfermedad es voluntario y tampoco existe compensación del empleador durante ese período."),
          ul([
            "Trabajador con contrato en vigor: primeros 14 días pagados por el empleador, desde el día 15 prestación.",
            "Ex trabajador dentro del período de protección: posible prestación desde el día 15, pero sin compensación del empleador en las dos primeras semanas.",
            "Autónomo: sin compensación del empleador; prestación solo desde el día 15 y si se cumplen las condiciones del seguro.",
          ]),
          cite(`Período de protección y duración del apoyo: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">ČSSZ — información detallada</a>. Reglas para autónomos: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Seguro de enfermedad en 2026</a>.`),
        ],
      },
      {
        id: "que-revisar",
        nav: "Qué revisar",
        eyebrow: "Checklist práctico",
        h2: "Qué conviene comprobar cuando la cantidad no coincide con lo esperado",
        blocks: [
          lead("Antes de dar por hecho que hubo un error de nómina o de la ČSSZ, merece la pena confirmar en qué fase del cálculo se encuentra y cuál es la base utilizada."),
          ul([
            "¿Sigue dentro de los primeros 14 días de calendario o ya ha entrado en la fase ČSSZ desde el día 15?",
            "¿Cuántos días laborables y cuántas horas se perdieron realmente según su horario?",
            "¿La empresa usó correctamente el rendimiento medio por hora del último trimestre cerrado?",
            "¿La incapacidad empezó justo después de terminar el empleo, de modo que nunca surgió el derecho a compensación del empleador?",
            "¿Se trata ya de una incapacidad más larga en la que el porcentaje ha subido después del día 30 o del día 60?",
          ]),
          p("Si lo que necesita primero es la parte del proceso y no la del cálculo, lo tratamos por separado en nuestra guía sobre la eNeschopenka: <a href=\"https://www.myglobalhealth.online/czechia/es/blog/neschopenka-czech-sick-note-explained\">cómo funciona la baja electrónica checa</a>. Ese texto explica el recorrido del documento. Este artículo está deliberadamente centrado en el dinero."),
          p("Si todavía necesita que un médico determine si la incapacidad temporal para el trabajo está médicamente justificada en su caso, puede reservar una consulta online. El médico decide la cuestión clínica; el importe lo determinan la ley, el empleador y la ČSSZ."),
        ],
      },
    ],
    linksEyebrow: "Global Health Chequia",
    linksH2: "Próximos pasos",
    linksLead: "Si necesita una valoración médica de la incapacidad laboral, o si prefiere entender primero el proceso de la eNeschopenka, estos son los pasos más útiles.",
    links: [
      { label: "Consulta online para baja médica en Chequia", href: href("es", "/services/neschopenka-online") },
      { label: "Cómo funciona la baja electrónica checa", href: "https://www.myglobalhealth.online/czechia/es/blog/neschopenka-czech-sick-note-explained" },
      { label: "Nuestros médicos en Chequia", href: href("es", "/doctors") },
      { label: "Contactar con Global Health Chequia", href: href("es", "/contact") },
    ],
    ctaBox: {
      h3: "¿Necesita primero la valoración médica?",
      text: "Una consulta online con un médico en Chequia puede confirmar si la incapacidad temporal para el trabajo está clínicamente justificada. El cálculo de la cantidad pagada lo hacen después la ley, el empleador y la ČSSZ.",
      primary: { label: "Reservar consulta", href: href("es", "/services/neschopenka-online") },
      secondary: { label: "Ver médicos", href: href("es", "/doctors") },
    },
    sourcesEyebrow: "Fuentes oficiales",
    sourcesH2: "De dónde salen los valores de 2026",
    sourcesLead: "Las cifras utilizadas aquí provienen de la legislación checa y de la guía oficial vigente en 2026. Para conocer el importe exacto en un caso personal siguen siendo necesarios sus datos salariales y la base calculada por la ČSSZ.",
    sources: [
      { label: "MPSV — Seguro de enfermedad en 2026", href: MPSV_SICKNESS_2026 },
      { label: "ČSSZ — información detallada sobre la prestación", href: CSSZ_SICKNESS_DETAIL },
      { label: "ČSSZ — importe y cálculo de prestaciones", href: CSSZ_BENEFIT_CALC },
      { label: "Código del Trabajo checo § 192", href: LABOUR_CODE_192 },
      { label: "Ley n.º 187/2006 sobre seguro de enfermedad", href: SICKNESS_ACT_187 },
    ],
    sourcesNote: "Global Health no es la ČSSZ ni el departamento de nómina de su empresa. El médico puede valorar la incapacidad para el trabajo, pero no puede prometer una cuantía concreta ni alterar el cálculo legal.",
    faqEyebrow: "FAQ",
    faqH2: "Preguntas frecuentes sobre el cálculo de la baja en Chequia",
    faqs: [
      {
        q: "¿Cómo se calcula la baja médica en Chequia en 2026?",
        a: "En dos fases. Durante los primeros 14 días de calendario, el empleador paga compensación salarial solo por los días laborables y festivos retribuidos perdidos, al 60% del rendimiento medio reducido. Desde el día 15, la ČSSZ paga la prestación por enfermedad por días de calendario a partir de una base diaria reducida.",
      },
      {
        q: "¿Cuál es la diferencia entre la compensación del empleador y la prestación de la ČSSZ?",
        a: "La compensación del empleador es la fase inicial prevista por el derecho laboral. La prestación de la ČSSZ es la ayuda legal del seguro de enfermedad desde el día 15. Cambian el pagador, la base de cálculo y el hecho de que se cuente tiempo de trabajo o días de calendario.",
      },
      {
        q: "¿Cuáles son los límites de reducción de 2026?",
        a: "Para la prestación de la ČSSZ son 1.633 CZK, 2.449 CZK y 4.897 CZK por día. Para la compensación del empleador, la ley los transforma en umbrales horarios de 285,78 CZK, 428,58 CZK y 856,98 CZK, multiplicando por 0,175.",
      },
      {
        q: "¿Qué porcentaje cobro a partir del día 15?",
        a: "Del día 15 al 30 se paga el 60% de la base diaria reducida. Del día 31 al 60 sube al 66% y, a partir del día 61, al 72%. El pago se hace por días de calendario.",
      },
      {
        q: "¿Por qué cobré menos de lo esperado en las dos primeras semanas?",
        a: "Normalmente porque en esa fase el empleador no paga todos los días del calendario. Solo compensa el tiempo de trabajo perdido y los festivos retribuidos, usando el rendimiento medio horario reducido y no un porcentaje simple del salario bruto.",
      },
      {
        q: "¿Cobro algo si enfermo después de terminar el empleo?",
        a: "Si la incapacidad empieza dentro del período de protección, puede existir derecho a la prestación desde el día 15. Pero ya no hay compensación del empleador para los primeros 14 días, porque la relación laboral ya terminó.",
      },
    ],
    disclaimerTitle: "Aviso médico y financiero",
    disclaimer:
      "Escrito por MUDr. Vojtěch Černý, médico de medicina general de Global Health Chequia, con revisión clínica de MUDr. Romana Pavlů, médica de medicina general para adultos. Este artículo ofrece información general sobre la incapacidad temporal para el trabajo y los pagos asociados en Chequia con referencia al 24 de agosto de 2026. No sustituye el consejo médico individual, el asesoramiento jurídico ni el asesoramiento de nómina. El importe exacto de la compensación inicial lo determina su empleador con sus datos salariales; el importe exacto de la prestación lo determina la ČSSZ conforme a su ingreso computable y la ley. En una urgencia médica, llame al 155 o al 112.",
  } satisfies Article,
};

const roPost: LocalePost = {
  locale: "RO",
  slug: "calculul-indemnizatiei-de-boala-in-cehia-2026-angajator-vs-cssz",
  title: "Calculul indemnizației de boală în Cehia în 2026: angajator vs. ČSSZ",
  excerpt:
    "În Cehia, venitul pe perioada incapacității temporare de muncă în 2026 se calculează în două etape: în primele 14 zile calendaristice angajatorul plătește compensarea salarială doar pentru zilele de lucru pierdute, iar din ziua 15 ČSSZ plătește indemnizația de boală pe zile calendaristice. Explicăm diferența exactă, plafoanele de reducere din 2026 și un exemplu practic.",
  seoTitle: "Indemnizație de boală Cehia 2026: angajator vs. ČSSZ",
  seoDescription:
    "Indemnizația de boală în Cehia în 2026: 14 zile plătite de angajator, ČSSZ din ziua 15, plafoane și exemplu practic.",
  category: "Medicină generală",
  article: {
    lang: "ro-RO",
    tagline: "Medicină oricând, oriunde",
    categoryLabel: "Medicină generală",
    categoryHref: href("ro", "/blog"),
    eyebrow: "Cehia · Muncă și venituri",
    h1: "Cum se calculează concediul medical ceh în 2026",
    deck: "Primele 14 zile nu sunt plătite în același mod ca restul concediului. Tocmai la trecerea dintre angajator și ČSSZ apar cele mai multe calcule greșite.",
    intro:
      "Dacă în Cehia un medic vă declară în <strong>incapacitate temporară de muncă</strong>, plata nu se calculează după aceeași formulă din prima zi. Există <strong>două regimuri de calcul</strong>. În primele 14 zile calendaristice, angajatorul plătește o <strong>compensație salarială</strong>, și numai pentru zilele lucrătoare sau sărbătorile plătite în care ați fi lucrat efectiv. Din <strong>ziua 15 calendaristică</strong>, <strong>Administrația Cehă de Asigurări Sociale, ČSSZ</strong>, preia plata <strong>indemnizației de boală</strong> pe zile calendaristice. În 2026 se aplică plafoanele de reducere de 1.633 CZK, 2.449 CZK și 4.897 CZK. O estimare bazată doar pe un procent fix din salariul brut va fi aproape sigur greșită.",
    facts: [
      "Zilele 1-14: compensație salarială de la angajator",
      "Din ziua 15: prestație plătită de ČSSZ",
      "Se aplică noi plafoane pentru 2026",
    ],
    primaryCta: { label: "Programează consultație online", href: href("ro", "/services/neschopenka-online") },
    secondaryCta: { label: "Detaliile oficiale ČSSZ", href: CSSZ_SICKNESS_DETAIL },
    panelChip: "Ce trebuie să rețineți",
    panelParas: [
      "Compensația plătită de angajator și indemnizația plătită de ČSSZ nu sunt aceeași prestație și nu folosesc aceeași bază de calcul.",
      "În primele două săptămâni angajatul nu este plătit automat pentru toate zilele din calendar, ci doar pentru timpul de lucru pierdut efectiv.",
      "Din ziua 15 ČSSZ trece la o bază zilnică, iar procentul crește din nou după ziua 30 și după ziua 60.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Medic de medicină generală · Global Health Cehia" },
    reviewLine: "Revizuit clinic de MUDr. Romana Pavlů, medic de medicină generală pentru adulți, Global Health Cehia.",
    navLabel: "În acest articol",
    sections: [
      {
        id: "doua-regimuri",
        nav: "Două regimuri",
        eyebrow: "Diferența esențială",
        h2: "Nu există o singură plată continuă din prima zi",
        blocks: [
          lead("Cea mai frecventă confuzie este ideea că ČSSZ începe să plătească imediat ce medicul emite concediul medical. Pentru un angajat din Cehia în 2026, lucrurile nu funcționează așa."),
          p("Faza inițială aparține <strong>angajatorului</strong>. În primele 14 zile calendaristice de incapacitate temporară de muncă, angajatul primește <strong>compensație salarială</strong>. Dar aceasta nu se calculează pentru toate zilele din calendar. Se plătește doar pentru <strong>zilele lucrătoare și sărbătorile plătite</strong> în care exista program de lucru și care se pierd din cauza bolii."),
          p("Abia din <strong>ziua 15 calendaristică</strong> intervine <strong>indemnizația de boală</strong> din sistemul ceh de asigurări sociale, plătită de ČSSZ. Din acel moment plata se face pe <strong>zile calendaristice</strong>, nu pe ture. Tocmai de aceea suma se schimbă deseori la trecerea dintre faza angajatorului și faza ČSSZ, chiar dacă salariul de bază rămâne același."),
          ul([
            "Zilele 1-14: angajator, compensație salarială, doar timp de lucru pierdut și sărbători plătite.",
            "Din ziua 15: ČSSZ, indemnizație de boală, toate zilele calendaristice ale incapacității.",
            "Persoanele independente sunt un caz separat: nu au compensație de la angajator și nu primesc această prestație în primele 14 zile.",
          ]),
          warn("De ce suma poate fi mai mică decât vă așteptați", "Mulți înmulțesc încă din primele două săptămâni o valoare zilnică presupusă cu toate zilele din calendar. Angajatorul nu plătește însă weekendurile dacă nu exista o tură planificată. De aceea prima sumă poate fi mai mică decât se aștepta angajatul."),
        ],
      },
      {
        id: "primele-14-zile",
        nav: "Primele 14 zile",
        eyebrow: "Compensația salarială",
        h2: "Cum se calculează compensația plătită de angajator în 2026",
        blocks: [
          lead("În primele 14 zile calendaristice, baza de calcul nu este baza zilnică folosită de ČSSZ. Calculul pornește de la câștigul mediu orar al angajatului, iar acel câștig este mai întâi redus."),
          p("Legislația muncii cehe prevede că această compensație salarială este de <strong>60% din câștigul mediu redus</strong>. În practică, departamentul salarial face trei pași. Mai întâi stabilește <strong>câștigul mediu pe oră</strong>. Apoi reduce acest câștig folosind praguri orare derivate din regulile sistemului de asigurare pentru boală. Abia la final aplică procentul de 60%."),
          p(`Pentru 2026, pragurile orare rezultă din transformarea limitelor sistemului de boală cu coeficientul 0,175. Astfel se ajunge la valorile de <strong>${EMPLOYER_HOURLY_THRESHOLDS_2026}</strong> pe oră. Până la primul prag se iau în calcul 90%, între primul și al doilea 60%, între al doilea și al treilea 30%, iar peste al treilea nu se mai ia nimic în calcul.`),
          p("Doar după această reducere se aplică procentul de 60%. Apoi angajatorul înmulțește rezultatul cu orele de muncă efectiv pierdute în turele din primele 14 zile. De aceea două persoane cu același salariu lunar pot primi sume diferite în această fază, dacă programul lor era repartizat diferit în calendar."),
          ul([
            "Compensația angajatorului este o operațiune de salarizare, nu o plată a ČSSZ.",
            "Pornește de la câștigul mediu orar, nu pur și simplu de la salariul brut din luna curentă.",
            "Acoperă numai timpul de lucru pierdut și sărbătorile plătite din primele 14 zile calendaristice.",
            "Procentul aplicat este 60% din câștigul mediu redus.",
          ]),
          cite(`Baza legală: <a href="${LABOUR_CODE_192}" rel="nofollow noopener" target="_blank">Codul muncii ceh § 192</a>. Privire oficială pentru 2026: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Asigurarea pentru boală în 2026</a>.`),
        ],
      },
      {
        id: "cssz-din-ziua-15",
        nav: "Din ziua 15",
        eyebrow: "Indemnizația de stat",
        h2: "Cum calculează ČSSZ indemnizația de boală din ziua 15",
        blocks: [
          lead("Din ziua 15 calendaristică, ČSSZ nu mai folosește programul de lucru, ci calculează plata pe baza zilnică prevăzută de lege."),
          p("ČSSZ pornește de la <strong>venitul luat în calcul</strong> în perioada relevantă, de regulă ultimele 12 luni calendaristice anterioare lunii în care a început incapacitatea. Acest venit se împarte la numărul de zile calendaristice luate în calcul și astfel rezultă <strong>baza zilnică de evaluare</strong>."),
          p(`În 2026, această bază zilnică este redusă folosind limitele legale de <strong>${DVZ_THRESHOLDS_2026}</strong>. Până la primul prag se iau în calcul 90%, între primul și al doilea 60%, între al doilea și al treilea 30%, iar ce depășește al treilea prag nu mai contează. Rezultatul este <strong>baza zilnică redusă</strong>.`),
          p("Pe această bază se aplică apoi procentul în funcție de durata incapacității. Din ziua 15 până în ziua 30 indemnizația este <strong>60%</strong> din baza zilnică redusă. Din ziua 31 până în ziua 60 crește la <strong>66%</strong>. Din ziua 61 crește la <strong>72%</strong>. De aceea un concediu medical mai lung poate aduce o sumă zilnică puțin mai mare, chiar dacă baza salarială nu s-a schimbat."),
          ul([
            "Din ziua 15 plata se face pe zile calendaristice, inclusiv weekendurile.",
            "ČSSZ folosește limite zilnice, nu pragurile orare din faza angajatorului.",
            "Procentul crește după ziua 30 și din nou după ziua 60.",
            "Durata obișnuită a sprijinului este de până la 380 de zile calendaristice de la debutul incapacității.",
          ]),
          cite(`Pagina detaliată ČSSZ: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">ČSSZ — informații detaliate</a>. Plafoane și exemple: <a href="${CSSZ_BENEFIT_CALC}" rel="nofollow noopener" target="_blank">ČSSZ — cuantumul și calculul prestațiilor</a>.`),
        ],
      },
      {
        id: "exemplu",
        nav: "Exemplu",
        eyebrow: "Exemplu practic",
        h2: "De ce același salariu produce sume diferite în săptămâni diferite",
        blocks: [
          lead("Exemplul arată de ce primele două săptămâni și faza ulterioară, plătită de ČSSZ, trebuie calculate separat."),
          p("Imaginați-vă un angajat cu program regulat de luni până vineri care intră în concediu medical marți, 10 martie 2026. În primele 14 zile calendaristice pierde nouă zile lucrătoare programate. Angajatorul ignoră weekendurile, ia câștigul mediu orar, îl reduce prin pragurile orare din 2026 și plătește 60% din rezultat pentru orele efectiv pierdute. Cu ture de opt ore asta înseamnă 72 de ore; cu ture de douăsprezece ore, calculul se schimbă, chiar dacă salariul lunar este identic."),
          p("Dacă incapacitatea continuă după 23 martie 2026, în ziua următoare începe faza ČSSZ. Din acel moment nu mai contează dacă este sâmbătă sau marți. Contează baza zilnică redusă și procentul legal aplicabil pentru etapa respectivă a incapacității. Între ziua 15 și ziua 30 se plătește 60%; apoi 66%; iar în concedii mai lungi 72%."),
          p("Aceeași persoană poate vedea trei valori diferite pe parcursul unui concediu medical prelungit: una în faza angajatorului, alta la începutul plății de la ČSSZ și încă una dacă incapacitatea durează mai mult de o lună. Diferența rezultă din etapele prevăzute de sistemul ceh."),
          warn("La ce folosește exemplul", "Ajută la înțelegerea mecanismului. Nu oferă o predicție exactă la ultimul ban. Suma reală depinde întotdeauna de câștigul mediu al persoanei, de programul ei și de istoricul veniturilor luat în calcul de ČSSZ."),
        ],
      },
      {
        id: "dupa-incetarea-muncii-osvc",
        nav: "După încetarea muncii și independenți",
        eyebrow: "Situații-limită",
        h2: "Ce se schimbă după încetarea contractului și pentru persoanele independente",
        blocks: [
          lead("Nu toată lumea trece prin primele 14 zile în același mod. După încetarea raportului de muncă sau în activitatea independentă, rezultatul este diferit față de cazul standard al unui angajat."),
          p("Dacă raportul de muncă s-a încheiat deja și boala începe încă în <strong>perioada de protecție</strong>, dreptul la indemnizație poate continua să apară. Această perioadă este, în mod obișnuit, de <strong>7 zile calendaristice</strong>, cu condiția ca raportul de muncă să fi durat cel puțin atât. Dacă a durat mai puțin, perioada de protecție durează doar atât cât a durat contractul respectiv."),
          p("După încetarea raportului de muncă, nu mai există un angajator care să plătească primele 14 zile. ČSSZ poate plăti din ziua 15, dar cele două săptămâni inițiale rămân fără compensație salarială. Pentru <strong>persoanele independente</strong>, asigurarea pentru boală este voluntară și, chiar când există dreptul, nu există compensație de la angajator în primele două săptămâni."),
          ul([
            "Angajat cu contract activ: primele 14 zile plătite de angajator, din ziua 15 indemnizație.",
            "Fost angajat în perioada de protecție: posibilă indemnizație din ziua 15, dar fără compensația angajatorului în primele două săptămâni.",
            "Independent: fără compensație de la angajator; indemnizație doar din ziua 15 și numai dacă sunt îndeplinite condițiile asigurării.",
          ]),
          cite(`Perioada de protecție și durata sprijinului: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">ČSSZ — informații detaliate</a>. Reguli pentru independenți: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Asigurarea pentru boală în 2026</a>.`),
        ],
      },
      {
        id: "ce-sa-verificati",
        nav: "Ce să verificați",
        eyebrow: "Checklist practic",
        h2: "Ce merită verificat când suma nu corespunde așteptărilor",
        blocks: [
          lead("Înainte să presupuneți că a existat o greșeală a angajatorului sau a ČSSZ, merită să verificați exact în ce etapă a calculului vă aflați și ce bază este folosită."),
          ul([
            "Sunteți încă în primele 14 zile calendaristice sau deja în faza ČSSZ din ziua 15?",
            "Câte zile lucrătoare și câte ore s-au pierdut efectiv conform programului?",
            "A folosit departamentul salarial corect câștigul mediu orar din ultimul trimestru încheiat?",
            "A început incapacitatea imediat după încetarea raportului de muncă, astfel încât nu a existat deloc compensație de la angajator?",
            "Este deja o incapacitate mai lungă, în care procentul a crescut după ziua 30 sau ziua 60?",
          ]),
          p("Dacă aveți nevoie mai întâi de partea de proces și nu de cea de calcul, o tratăm separat în ghidul nostru despre eNeschopenka: <a href=\"https://www.myglobalhealth.online/czechia/ro/blog/neschopenka-czech-sick-note-explained\">cum funcționează concediul medical electronic ceh</a>. Acel text explică traseul documentului. Articolul de aici este concentrat intenționat pe bani."),
          p("Dacă aveți nevoie ca un medic să stabilească dacă incapacitatea temporară de muncă este justificată clinic în cazul dumneavoastră, puteți programa o consultație online. Medicul face evaluarea clinică, iar suma este stabilită potrivit legii de angajator și de ČSSZ."),
        ],
      },
    ],
    linksEyebrow: "Global Health Cehia",
    linksH2: "Pașii următori",
    linksLead: "Dacă aveți nevoie de o evaluare medicală a incapacității de muncă, sau dacă vreți mai întâi să înțelegeți procesul eNeschopenka, aceștia sunt pașii cei mai utili.",
    links: [
      { label: "Consultație online pentru concediu medical în Cehia", href: href("ro", "/services/neschopenka-online") },
      { label: "Cum funcționează concediul medical electronic ceh", href: "https://www.myglobalhealth.online/czechia/ro/blog/neschopenka-czech-sick-note-explained" },
      { label: "Medicii noștri din Cehia", href: href("ro", "/doctors") },
      { label: "Contact Global Health Cehia", href: href("ro", "/contact") },
    ],
    ctaBox: {
      h3: "Aveți nevoie mai întâi de evaluarea medicală?",
      text: "O consultație online cu un medic din Cehia poate confirma dacă incapacitatea temporară de muncă este justificată clinic. Calculul sumei plătite este făcut apoi prin lege de angajator și de ČSSZ.",
      primary: { label: "Programează consultație", href: href("ro", "/services/neschopenka-online") },
      secondary: { label: "Vezi medicii", href: href("ro", "/doctors") },
    },
    sourcesEyebrow: "Surse oficiale",
    sourcesH2: "De unde provin valorile pentru 2026",
    sourcesLead: "Cifrele folosite aici provin din legislația cehă și din ghidajul oficial valabil în 2026. Pentru suma exactă într-un caz concret rămân necesare datele salariale proprii și baza calculată de ČSSZ.",
    sources: [
      { label: "MPSV — Asigurarea pentru boală în 2026", href: MPSV_SICKNESS_2026 },
      { label: "ČSSZ — informații detaliate despre indemnizația de boală", href: CSSZ_SICKNESS_DETAIL },
      { label: "ČSSZ — cuantumul și calculul prestațiilor", href: CSSZ_BENEFIT_CALC },
      { label: "Codul muncii ceh § 192", href: LABOUR_CODE_192 },
      { label: "Legea nr. 187/2006 privind asigurarea pentru boală", href: SICKNESS_ACT_187 },
    ],
    sourcesNote: "Global Health nu este ČSSZ și nu este departamentul de salarizare al angajatorului dumneavoastră. Medicul poate evalua incapacitatea de muncă, dar nu poate promite o sumă exactă și nici modifica formula legală de calcul.",
    faqEyebrow: "FAQ",
    faqH2: "Întrebări frecvente despre calculul concediului medical în Cehia",
    faqs: [
      {
        q: "Cum se calculează indemnizația de boală în Cehia în 2026?",
        a: "În două etape. În primele 14 zile calendaristice, angajatorul plătește compensație salarială doar pentru zilele lucrătoare și sărbătorile plătite pierdute, la 60% din câștigul mediu redus. Din ziua 15, ČSSZ plătește indemnizația de boală pe zile calendaristice dintr-o bază zilnică redusă.",
      },
      {
        q: "Care este diferența dintre compensația angajatorului și indemnizația ČSSZ?",
        a: "Compensația angajatorului este faza inițială prevăzută de dreptul muncii. Indemnizația ČSSZ este prestația legală a sistemului de boală din ziua 15. Diferă plătitorul, baza de calcul și faptul că se urmărește timpul de lucru sau zilele de calendar.",
      },
      {
        q: "Care sunt plafoanele de reducere din 2026?",
        a: "Pentru prestația ČSSZ sunt 1.633 CZK, 2.449 CZK și 4.897 CZK pe zi. Pentru compensația angajatorului, legea transformă aceste valori în praguri orare de 285,78 CZK, 428,58 CZK și 856,98 CZK, prin înmulțirea cu 0,175.",
      },
      {
        q: "Ce procent primesc din ziua 15?",
        a: "Din ziua 15 până în ziua 30 se plătește 60% din baza zilnică redusă. Din ziua 31 până în ziua 60 procentul urcă la 66%, iar din ziua 61 la 72%. Plata se face pe zile calendaristice.",
      },
      {
        q: "De ce am primit mai puțin decât mă așteptam în primele două săptămâni?",
        a: "De regulă pentru că în această fază angajatorul nu plătește toate zilele din calendar. El compensează doar timpul de lucru pierdut și sărbătorile plătite, folosind câștigul mediu orar redus și nu un procent simplu din salariul brut.",
      },
      {
        q: "Primesc ceva dacă mă îmbolnăvesc după încetarea contractului de muncă?",
        a: "Dacă incapacitatea începe în perioada de protecție, poate exista dreptul la indemnizație din ziua 15. Dar nu mai există compensația angajatorului pentru primele 14 zile, deoarece raportul de muncă s-a încheiat deja.",
      },
    ],
    disclaimerTitle: "Aviz medical și financiar",
    disclaimer:
      "Scris de MUDr. Vojtěch Černý, medic de medicină generală la Global Health Cehia, și revizuit clinic de MUDr. Romana Pavlů, medic de medicină generală pentru adulți. Acest articol oferă informații generale despre incapacitatea temporară de muncă și plățile aferente în Cehia, cu referință la 24 august 2026. Nu înlocuiește sfatul medical individual, consultanța juridică sau consultanța de salarizare. Valoarea exactă a compensației inițiale este stabilită de angajator pe baza datelor salariale proprii; valoarea exactă a indemnizației este stabilită de ČSSZ pe baza venitului luat în calcul și a legii. În urgență medicală, sunați imediat la 155 sau 112.",
  } satisfies Article,
};

const deResearch: LocalePost = {
  locale: "DE",
  slug: "tschechien-berechnung-krankengeld-2026-arbeitgeber-vs-cssz",
  title: "Berechnung des Krankengeldes in Tschechien 2026: Arbeitgeber vs. ČSSZ",
  excerpt:
    "In Tschechien wird krankheitsbedingtes Einkommen 2026 in zwei Stufen berechnet: Zuerst zahlt der Arbeitgeber für die ersten 14 Kalendertage eine Lohnersatzleistung nur für ausgefallene Arbeitstage, ab Tag 15 zahlt die ČSSZ Krankengeld für Kalendertage. Dieser Leitfaden erklärt den genauen Unterschied, die Reduktionsgrenzen 2026 und ein praxisnahes Beispiel.",
  seoTitle: "Krankengeld Tschechien 2026: Arbeitgeber vs. ČSSZ",
  seoDescription:
    "So wird Krankengeld in Tschechien 2026 berechnet: erste 14 Tage Lohnersatz vom Arbeitgeber, ab Tag 15 Leistung der ČSSZ, Reduktionsgrenzen und Beispiel.",
  category: "Allgemeinmedizin",
  article: {
    lang: "de-DE",
    tagline: "Medizin jederzeit und überall",
    categoryLabel: "Allgemeinmedizin",
    categoryHref: href("de", "/blog"),
    eyebrow: "Tschechien · Arbeit und Einkommen",
    h1: "Krankengeld in Tschechien 2026",
    deck: "Die ersten 14 Kalendertage werden nicht nach demselben Mechanismus bezahlt wie der weitere Verlauf. Genau an dieser Schnittstelle zwischen Arbeitgeber und Sozialversicherung rechnen die meisten Menschen falsch.",
    intro:
      "Wenn eine Ärztin oder ein Arzt in Tschechien Ihre <strong>vorübergehende Arbeitsunfähigkeit</strong> feststellt, beginnt nicht vom ersten Tag an eine einheitliche Leistung. Es gibt <strong>zwei unterschiedliche Berechnungssysteme</strong>. Während der ersten 14 Kalendertage zahlt der Arbeitgeber <strong>Lohnersatz</strong>, und zwar nur für geplante Arbeitstage oder bezahlte Feiertage, die wegen der Krankheit ausfallen. Ab dem <strong>15. Kalendertag</strong> übernimmt die <strong>Tschechische Sozialversicherungsanstalt (ČSSZ)</strong> und zahlt <strong>Krankengeld</strong> für Kalendertage. Im Jahr 2026 gelten dafür die Reduktionsgrenzen 1.633 CZK, 2.449 CZK und 4.897 CZK. Wer versucht, die Leistung als einen festen Prozentsatz des Bruttolohns zu schätzen, landet deshalb fast immer neben der tatsächlichen Zahl.",
    facts: [
      "Tage 1-14: Lohnersatz durch den Arbeitgeber",
      "Ab Tag 15: Krankengeld von der ČSSZ",
      "Neue Reduktionsgrenzen für 2026",
    ],
    primaryCta: { label: "Online-Sprechstunde buchen", href: href("de", "/services/neschopenka-online") },
    secondaryCta: { label: "ČSSZ — Detailseite zum Krankengeld", href: CSSZ_SICKNESS_DETAIL },
    panelChip: "Was wichtig ist",
    panelParas: [
      "Lohnersatz des Arbeitgebers und Krankengeld der ČSSZ sind nicht dieselbe Leistung und beruhen nicht auf derselben Berechnungsbasis.",
      "Beschäftigte erhalten in den ersten zwei Wochen nicht automatisch Geld für alle Kalendertage, sondern nur für tatsächlich ausgefallene Arbeitszeit nach Dienstplan.",
      "Ab Tag 15 verwendet die ČSSZ eine tägliche Bemessungsgrundlage; nach Tag 30 und Tag 60 steigt der Prozentsatz erneut.",
    ],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Allgemeinmediziner · Global Health Tschechien" },
    reviewLine: "Die fachliche und muttersprachliche Prüfung durch MUDr. Romana Pavlů ist vor der Veröffentlichung erforderlich.",
    navLabel: "In diesem Artikel",
    sections: [
      {
        id: "zwei-systeme",
        nav: "Zwei Systeme",
        eyebrow: "Der Kernunterschied",
        h2: "Es gibt nicht vom ersten Tag an eine einheitliche Zahlung",
        blocks: [
          lead("Der häufigste Irrtum besteht darin, anzunehmen, dass die ČSSZ sofort zahlt, sobald die Krankschreibung ausgestellt ist. Für Beschäftigte in Tschechien ist das 2026 nicht der Fall."),
          p("Die Anfangsphase liegt beim <strong>Arbeitgeber</strong>. Nach dem Arbeitsgesetzbuch erhält die beschäftigte Person während der ersten 14 Kalendertage der Arbeitsunfähigkeit <strong>Lohnersatz</strong>. Dieser wird aber nicht für jeden Kalendertag berechnet. Er wird nur für <strong>Arbeitstage und bezahlte Feiertage</strong> gezahlt, an denen eigentlich eine Schicht geplant war und die wegen der Krankheit ausfallen."),
          p("Erst ab dem <strong>15. Kalendertag</strong> tritt die <strong>ČSSZ</strong> mit dem gesetzlichen Krankengeld ein. Dieses wird nach <strong>Kalendertagen</strong> berechnet und nicht nach Schichten. Genau deshalb ändert sich die Zahlung beim Übergang häufig, obwohl das zugrunde liegende Arbeitsverhältnis unverändert bleibt."),
          ul([
            "Tag 1-14: Arbeitgeber, Lohnersatz, nur ausgefallene Arbeitszeit und bezahlte Feiertage.",
            "Ab Tag 15: ČSSZ, Krankengeld, alle Kalendertage der Arbeitsunfähigkeit.",
            "Selbstständige sind ein eigener Fall: kein Arbeitgeber-Lohnersatz und kein Krankengeld in den ersten 14 Tagen.",
          ]),
          warn("Warum Erwartungen oft nicht stimmen", "Viele rechnen schon in den ersten zwei Wochen mit einem Tagesbetrag mal Kalendertage. Der Arbeitgeber zahlt aber Wochenenden nicht mit, wenn dort gar keine Schicht geplant war. Darum wirkt die erste Zahlung oft unlogisch, obwohl sie gesetzlich korrekt ist."),
        ],
      },
      {
        id: "arbeitgeber-erste-14",
        nav: "Erste 14 Tage",
        eyebrow: "Lohnersatz",
        h2: "Wie der Lohnersatz des Arbeitgebers 2026 berechnet wird",
        blocks: [
          lead("Für die ersten 14 Kalendertage gilt nicht die tägliche Bemessungsgrundlage der ČSSZ. Ausgangspunkt ist vielmehr der durchschnittliche Stundenverdienst der beschäftigten Person, der zunächst reduziert wird."),
          p("Das Arbeitsgesetzbuch bestimmt, dass der Lohnersatz <strong>60% des reduzierten durchschnittlichen Verdienstes</strong> beträgt. Praktisch läuft das in drei Schritten. Zuerst ermittelt die Lohnbuchhaltung den <strong>durchschnittlichen Stundenverdienst</strong>. Dann reduziert sie diesen anhand von Schwellen, die nach demselben Prinzip wie im Krankengeldsystem funktionieren. Erst danach werden 60% dieses reduzierten Ergebnisses gezahlt."),
          p(`Für 2026 werden die Stunden-Schwellen aus den Krankengeldgrenzen abgeleitet, indem diese mit 0,175 multipliziert werden. Daraus ergeben sich <strong>${EMPLOYER_HOURLY_THRESHOLDS_2026}</strong> pro Stunde. Bis zur ersten Schwelle zählen 90%, zwischen der ersten und zweiten 60%, zwischen der zweiten und dritten 30%, darüber hinaus nichts.`),
          p("Erst auf den reduzierten Stundenwert wird der Satz von 60% angewandt. Anschließend multipliziert die Lohnbuchhaltung ihn mit den Stunden der ausgefallenen Schichten in den ersten 14 Kalendertagen. Daher können zwei Beschäftigte mit demselben Monatslohn in der ersten Krankheitsphase unterschiedliche Beträge erhalten, wenn ihr Dienstplan anders über den Kalender verteilt war."),
          ul([
            "Der Arbeitgeber-Lohnersatz ist eine Entgeltabrechnung, keine Zahlung der ČSSZ.",
            "Ausgangspunkt ist der durchschnittliche Stundenverdienst und nicht einfach der Bruttolohn des laufenden Monats.",
            "Erfasst werden nur ausgefallene Schichten und bezahlte Feiertage in den ersten 14 Kalendertagen.",
            "Der Zahlungssatz beträgt 60% des reduzierten durchschnittlichen Verdienstes.",
          ]),
          cite(`Rechtsgrundlage: <a href="${LABOUR_CODE_192}" rel="nofollow noopener" target="_blank">Arbeitsgesetzbuch § 192</a>. Offizielle Übersicht 2026: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Krankheitsversicherung 2026</a>.`),
        ],
      },
      {
        id: "cssz-ab-tag-15",
        nav: "Ab Tag 15",
        eyebrow: "Staatliches Krankengeld",
        h2: "Wie die ČSSZ das Krankengeld ab Tag 15 berechnet",
        blocks: [
          lead("Ab dem 15. Kalendertag ändert sich die Logik vollständig. Die ČSSZ interessiert sich nicht mehr für den Dienstplan, sondern für die gesetzliche tägliche Bemessungsgrundlage."),
          p("Die ČSSZ geht vom <strong>anrechenbaren Einkommen</strong> im maßgeblichen Zeitraum aus, in der Regel den letzten 12 Kalendermonaten vor dem Monat, in dem die Arbeitsunfähigkeit begonnen hat. Dieses Einkommen wird durch die Zahl der anrechenbaren Kalendertage geteilt. So entsteht die <strong>tägliche Bemessungsgrundlage</strong>."),
          p(`Im Jahr 2026 wird diese tägliche Bemessungsgrundlage anhand der gesetzlichen Grenzen <strong>${DVZ_THRESHOLDS_2026}</strong> reduziert. Bis zur ersten Grenze zählen 90%, zwischen der ersten und zweiten 60%, zwischen der zweiten und dritten 30%, darüber hinaus nichts. Das Ergebnis ist die <strong>reduzierte tägliche Bemessungsgrundlage</strong>.`),
          p("Darauf wird dann der Prozentsatz je nach Dauer der Arbeitsunfähigkeit angewandt. Von Tag 15 bis Tag 30 beträgt das Krankengeld <strong>60%</strong> der reduzierten täglichen Bemessungsgrundlage. Von Tag 31 bis Tag 60 steigt es auf <strong>66%</strong>, ab Tag 61 auf <strong>72%</strong>. Darum kann eine längere Krankheitsphase selbst bei gleicher Einkommensbasis leicht ansteigen."),
          ul([
            "Ab Tag 15 wird nach Kalendertagen gezahlt, einschließlich Wochenenden.",
            "Die ČSSZ verwendet tägliche Reduktionsgrenzen und nicht die stündlichen Schwellen der Arbeitgeberphase.",
            "Der Prozentsatz steigt nach Tag 30 und erneut nach Tag 60.",
            "Die reguläre Bezugsdauer beträgt bis zu 380 Kalendertage ab Beginn der Arbeitsunfähigkeit.",
          ]),
          cite(`ČSSZ Detailseite: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">CSSZ Detail</a>. Rechenbeispiele und Reduktionsgrenzen: <a href="${CSSZ_BENEFIT_CALC}" rel="nofollow noopener" target="_blank">ČSSZ — Höhe und Berechnung der Leistungen</a>.`),
        ],
      },
      {
        id: "beispiel",
        nav: "Beispiel",
        eyebrow: "Praxisbeispiel",
        h2: "Warum derselbe Lohn in verschiedenen Wochen zu verschiedenen Beträgen führt",
        blocks: [
          lead("Ein Praxisbeispiel soll nicht die Lohnbuchhaltung ersetzen. Es soll zeigen, warum die ersten zwei Wochen und die spätere staatliche Phase nicht gleich geschätzt werden können."),
          p("Stellen Sie sich eine beschäftigte Person mit regulärer Montag-bis-Freitag-Arbeitszeit vor, die am Dienstag, dem 10. März 2026, arbeitsunfähig wird. In den ersten 14 Kalendertagen fallen neun geplante Arbeitstage aus. Der Arbeitgeber ignoriert also die Wochenenden, nimmt den durchschnittlichen Stundenverdienst, reduziert ihn über die Stunden-Schwellen 2026 und zahlt 60% des reduzierten Wertes für die tatsächlich verlorenen Stunden. Bei Acht-Stunden-Schichten sind das 72 Stunden; bei Zwölf-Stunden-Schichten fällt die Rechnung anders aus, obwohl der Monatslohn derselbe sein kann."),
          p("Dauert die Arbeitsunfähigkeit über den 23. März 2026 hinaus an, beginnt am nächsten Tag die ČSSZ-Phase. Jetzt ist es der Behörde gleich, ob gerade Samstag oder Dienstag ist. Sie nimmt die reduzierte tägliche Bemessungsgrundlage und zahlt 60% davon für Tag 15 bis 30. Dauert die Krankheit länger als 30 Tage, steigt die tägliche Leistung auf 66%; nach 60 Tagen auf 72%."),
          p("Es ist also völlig normal, dass eine Person im Verlauf einer längeren Arbeitsunfähigkeit drei unterschiedliche Beträge sieht: einen in der Lohnabrechnung des Arbeitgebers, einen in der ersten ČSSZ-Phase und einen weiteren, wenn die Arbeitsunfähigkeit länger als einen Monat dauert. Das ist kein Fehler des Systems. Genau so ist das tschechische Krankengeldrecht konstruiert."),
          warn("Wofür das Beispiel taugt", "Es dient dem Verständnis der Mechanik. Es ist keine Prognose bis auf die letzte Krone. Der exakte Betrag hängt immer von Ihrem eigenen Durchschnittsverdienst, Ihrem Dienstplan und Ihrem anrechenbaren Einkommensverlauf ab."),
        ],
      },
      {
        id: "nach-beschaeftigung-osvc",
        nav: "Nach Beschäftigungsende und selbstständig",
        eyebrow: "Sonderlagen",
        h2: "Was sich nach Ende des Arbeitsverhältnisses und bei Selbstständigen ändert",
        blocks: [
          lead("Nicht jede Person durchläuft die ersten 14 Tage auf dieselbe Weise. Nach Ende des Arbeitsverhältnisses oder in der Selbstständigkeit fällt das Ergebnis anders aus als im Standardfall eines Beschäftigten."),
          p("Ist das Arbeitsverhältnis bereits beendet und tritt die Erkrankung noch innerhalb der <strong>Schutzfrist</strong> ein, kann ein Anspruch auf Krankengeld weiter bestehen. Die Schutzfrist beträgt grundsätzlich <strong>7 Kalendertage</strong>, aber nur dann, wenn das Arbeitsverhältnis mindestens so lange bestand. War es kürzer, ist die Schutzfrist nur so lang wie dieses Arbeitsverhältnis selbst."),
          p("Was viele überrascht: Es gibt dann keinen Arbeitgeber mehr, der für die ersten 14 Tage Lohnersatz zahlen würde. Die ČSSZ kann daher zwar ab Tag 15 Krankengeld zahlen, aber die eröffnende Zwei-Wochen-Phase ist nicht durch Arbeitgeber-Lohnersatz gedeckt. Genau diese Konstellation sorgt oft für Missverständnisse."),
          p("Für <strong>Selbstständige</strong> ist das System noch strenger. Die Krankheitsversicherung ist freiwillig, und ein Anspruch setzt mindestens drei Monate Teilnahme unmittelbar vor Beginn der Arbeitsunfähigkeit voraus. Selbst wenn diese Bedingung erfüllt ist, gibt es in den ersten zwei Wochen keinen Arbeitgeber-Lohnersatz, weil es keinen Arbeitgeber gibt."),
          ul([
            "Beschäftigte im laufenden Arbeitsverhältnis: erste 14 Tage Arbeitgeber-Lohnersatz, ab Tag 15 Krankengeld.",
            "Ehemalige Beschäftigte in der Schutzfrist: mögliches Krankengeld ab Tag 15, aber kein Lohnersatz für die ersten zwei Wochen.",
            "Selbstständige: kein Lohnersatz, Krankengeld erst ab Tag 15 und nur bei erfüllten Versicherungsbedingungen.",
          ]),
          cite(`Schutzfrist und Bezugsdauer: <a href="${CSSZ_SICKNESS_DETAIL}" rel="nofollow noopener" target="_blank">ČSSZ Detailseite</a>. Regeln für Selbstständige: <a href="${MPSV_SICKNESS_2026}" rel="nofollow noopener" target="_blank">MPSV — Krankheitsversicherung 2026</a>.`),
        ],
      },
      {
        id: "pruefen",
        nav: "Prüfen",
        eyebrow: "Praktische Checkliste",
        h2: "Was Sie prüfen sollten, wenn der Betrag nicht Ihren Erwartungen entspricht",
        blocks: [
          lead("Bevor Sie von einem Fehler der Lohnbuchhaltung oder der ČSSZ ausgehen, lohnt sich ein genauer Blick darauf, in welcher Berechnungsphase Sie sich überhaupt befinden."),
          ul([
            "Befinden Sie sich noch in den ersten 14 Kalendertagen oder bereits in der ČSSZ-Phase ab Tag 15?",
            "Wie viele Arbeitstage und Stunden sind in den ersten zwei Wochen nach Ihrem Dienstplan tatsächlich ausgefallen?",
            "Hat die Lohnbuchhaltung den korrekten durchschnittlichen Stundenverdienst aus dem letzten abgeschlossenen Quartal verwendet?",
            "Begann die Arbeitsunfähigkeit kurz nach Ende des Arbeitsverhältnisses, sodass gar kein Arbeitgeber-Lohnersatz mehr entstehen konnte?",
            "Handelt es sich bereits um eine längere Arbeitsunfähigkeit, bei der der Prozentsatz nach Tag 30 oder Tag 60 angestiegen ist?",
          ]),
          p("Wenn Sie zunächst die Prozessseite statt der Berechnungsseite brauchen, behandeln wir das gesondert in unserem Leitfaden zur eNeschopenka: <a href=\"https://www.myglobalhealth.online/czechia/de/blog/neschopenka-krankschreibung-in-tschechien\">Wie die elektronische Krankschreibung in Tschechien funktioniert</a>. Dieser Text dort erklärt den Ablauf. Dieser Artikel hier ist bewusst auf die finanzielle Berechnung fokussiert."),
          p("Und falls Sie zunächst ärztlich klären lassen müssen, ob eine vorübergehende Arbeitsunfähigkeit in Ihrem Fall medizinisch gerechtfertigt ist, können Sie eine Online-Sprechstunde buchen. Ärztlich entschieden wird die Frage der Arbeitsunfähigkeit. Gesetzlich entschieden wird dagegen die Höhe des Geldes, das Arbeitgeber oder ČSSZ später zahlen."),
        ],
      },
    ],
    linksEyebrow: "Global Health Tschechien",
    linksH2: "Wie es weitergeht",
    linksLead: "Wenn Sie eine ärztliche Einschätzung zur Arbeitsunfähigkeit brauchen oder zuerst den Prozess der eNeschopenka verstehen möchten, sind diese Schritte am hilfreichsten.",
    links: [
      { label: "Online-Sprechstunde für Krankschreibung in Tschechien", href: href("de", "/services/neschopenka-online") },
      { label: "Wie die elektronische Krankschreibung funktioniert", href: "https://www.myglobalhealth.online/czechia/de/blog/neschopenka-krankschreibung-in-tschechien" },
      { label: "Unsere Ärztinnen und Ärzte in Tschechien", href: href("de", "/doctors") },
      { label: "Global Health Tschechien kontaktieren", href: href("de", "/contact") },
    ],
    ctaBox: {
      h3: "Brauchen Sie zuerst die ärztliche Einschätzung?",
      text: "Eine Online-Sprechstunde mit einer tschechischen Ärztin oder einem Arzt kann klären, ob die Arbeitsunfähigkeit medizinisch gerechtfertigt ist. Die spätere Geldleistung wird dann gesetzlich von Lohnbuchhaltung und ČSSZ berechnet.",
      primary: { label: "Termin buchen", href: href("de", "/services/neschopenka-online") },
      secondary: { label: "Unsere Ärztinnen und Ärzte", href: href("de", "/doctors") },
    },
    sourcesEyebrow: "Offizielle Quellen",
    sourcesH2: "Woher die Zahlen für 2026 stammen",
    sourcesLead: "Die hier verwendeten Werte beruhen auf dem tschechischen Recht und staatlichen Informationen für 2026. Für den exakten persönlichen Betrag brauchen Sie dennoch Ihre eigene Lohnabrechnung und Ihre eigene Bemessungsgrundlage bei der ČSSZ.",
    sources: [
      { label: "MPSV — Krankheitsversicherung 2026", href: MPSV_SICKNESS_2026 },
      { label: "ČSSZ — ausführliche Informationen zum Krankengeld", href: CSSZ_SICKNESS_DETAIL },
      { label: "ČSSZ — Höhe und Berechnung der Leistungen", href: CSSZ_BENEFIT_CALC },
      { label: "Arbeitsgesetzbuch § 192", href: LABOUR_CODE_192 },
      { label: "Gesetz Nr. 187/2006 Slg. über die Krankheitsversicherung", href: SICKNESS_ACT_187 },
    ],
    sourcesNote: "Global Health ist weder die ČSSZ noch die Lohnbuchhaltung Ihres Arbeitgebers. Ärztinnen und Ärzte können die Arbeitsunfähigkeit medizinisch beurteilen, aber keinen konkreten Leistungsbetrag zusagen oder die gesetzliche Berechnung verändern.",
    faqEyebrow: "FAQ",
    faqH2: "Häufige Fragen zur Berechnung des tschechischen Krankengeldes",
    faqs: [
      {
        q: "Wie wird das Krankengeld in Tschechien 2026 berechnet?",
        a: "In zwei Stufen. Für die ersten 14 Kalendertage zahlt der Arbeitgeber Lohnersatz nur für ausgefallene Arbeitstage und bezahlte Feiertage, und zwar in Höhe von 60% des reduzierten durchschnittlichen Verdienstes. Ab Tag 15 zahlt die ČSSZ Krankengeld für Kalendertage aus einer reduzierten täglichen Bemessungsgrundlage.",
      },
      {
        q: "Was ist der Unterschied zwischen Arbeitgeber-Lohnersatz und Krankengeld der ČSSZ?",
        a: "Der Arbeitgeber-Lohnersatz ist die erste Phase nach dem Arbeitsgesetzbuch. Das Krankengeld der ČSSZ ist die gesetzliche Versicherungsleistung ab Tag 15. Unterschiedlich sind Zahler, Berechnungsbasis und die Frage, ob nach Arbeitszeit oder Kalendertagen gerechnet wird.",
      },
      {
        q: "Welche Reduktionsgrenzen gelten 2026?",
        a: "Für das Krankengeld der ČSSZ gelten 1.633 CZK, 2.449 CZK und 4.897 CZK pro Tag. Für den Arbeitgeber-Lohnersatz werden daraus nach dem Arbeitsgesetzbuch Stunden-Schwellen von 285,78 CZK, 428,58 CZK und 856,98 CZK, weil die Krankengeldgrenzen mit 0,175 multipliziert werden.",
      },
      {
        q: "Wie viel Prozent bekomme ich ab Tag 15?",
        a: "Von Tag 15 bis Tag 30 beträgt das Krankengeld 60% der reduzierten täglichen Bemessungsgrundlage. Von Tag 31 bis Tag 60 sind es 66%, ab Tag 61 72%. Gezahlt wird für Kalendertage.",
      },
      {
        q: "Warum war der Betrag in den ersten zwei Wochen niedriger als erwartet?",
        a: "Meist weil der Arbeitgeber in dieser Phase nicht alle Kalendertage bezahlt. Er ersetzt nur ausgefallene Arbeitszeit und bezahlte Feiertage und rechnet mit reduziertem durchschnittlichem Stundenverdienst statt mit einem schlichten Anteil des Bruttolohns.",
      },
      {
        q: "Bekomme ich etwas, wenn ich erst nach Ende des Arbeitsverhältnisses krank werde?",
        a: "Beginnt die Arbeitsunfähigkeit innerhalb der Schutzfrist, kann ab Tag 15 dennoch Krankengeld entstehen. Einen Arbeitgeber-Lohnersatz für die ersten 14 Tage gibt es dann aber nicht mehr, weil das Arbeitsverhältnis bereits beendet ist.",
      },
    ],
    disclaimerTitle: "Medizinischer und finanzieller Hinweis",
    disclaimer:
      "Verfasst von MUDr. Vojtěch Černý, Allgemeinmediziner bei Global Health Tschechien. Die fachliche und muttersprachliche Prüfung durch MUDr. Romana Pavlů ist vor der Veröffentlichung erforderlich. Dieser Artikel enthält allgemeine Informationen zur tschechischen Arbeitsunfähigkeit und zu krankheitsbedingten Zahlungen mit Stand 24. August 2026. Er ersetzt keine persönliche ärztliche Beratung, keine Rechtsberatung und keine Lohnbuchhaltungsberatung. Den exakten Lohnersatz ermittelt Ihr Arbeitgeber anhand Ihrer Entgeltunterlagen; das exakte Krankengeld ermittelt die ČSSZ anhand Ihres anrechenbaren Einkommens nach dem Gesetz. Im medizinischen Notfall rufen Sie sofort 155 oder 112 an.",
  } satisfies Article,
};

// These older long-form copies are retained as research material only. The
// approved EN and DE candidates below are translations of the compact Czech
// source and keep Czech benefit rules intact.
void [enResearch, deResearch];

const en: LocalePost = {
  locale: "EN",
  slug: "czech-sick-pay-calculation-2026-employer-cssz",
  title: "Czech sick pay calculation 2026: employer and ČSSZ",
  excerpt: "How employer wage compensation is calculated for the first 14 days and how ČSSZ sickness benefit works from day 15 in Czechia.",
  seoTitle: "Czech sick pay calculation 2026: employer and ČSSZ",
  seoDescription: "Calculate Czech sick pay in 2026: employer compensation for days 1-14, ČSSZ benefit from day 15, reduction thresholds and examples.",
  category: "General Practice",
  article: {
    lang: "en-CZ",
    tagline: "Medicine Anytime, Anywhere",
    categoryLabel: "General Practice",
    categoryHref: href("en", "/blog"),
    eyebrow: "Czechia · 2026 rules",
    h1: "How Czech sick pay is calculated in 2026",
    deck: "The employer pays wage compensation for missed shifts during the first 14 calendar days. From day 15, ČSSZ pays sickness benefit for every calendar day.",
    intro: "A Czech sick-pay calculation in 2026 has <strong>two separate stages</strong>. For an employee covered by sickness insurance, the employer pays wage compensation during the first 14 calendar days, but only for missed scheduled shifts and paid public holidays. From day 15, ČSSZ pays sickness benefit for every calendar day. Self-employed people, some agreements and cross-border cases follow different rules. Both stages use reduction thresholds, so neither amount is a simple percentage of monthly gross salary.",
    facts: ["Days 1-14: wage compensation from the employer", "From day 15: sickness benefit from ČSSZ", "2026 daily thresholds: CZK 1,633, 2,449 and 4,897"],
    primaryCta: { label: "Open the official 2026 calculator", href: MPSV_CALCULATOR_2026 },
    secondaryCta: { label: "How Czech eNeschopenka works", href: href("en", "/blog/neschopenka-czech-sick-note-explained") },
    panelChip: "Quick answer",
    panelParas: ["The two stages use different calculations.", "From day 15, ČSSZ uses a daily assessment base."],
    author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "General Practitioner · Global Health Czechia" },
    reviewLine: "Clinical and native-language review by MUDr. Romana Pavlů is required before publication.",
    navLabel: "In this guide",
    sections: [
      { id: "first-14-days", nav: "First 14 days", eyebrow: "Wage compensation", h2: "What the employer pays during the first 14 days", blocks: [
        lead("The employer pays 60% of reduced average hourly earnings for missed shifts and paid public holidays."),
        p("Payroll starts with average hourly earnings rather than the current monthly salary. For 2026, the hourly reduction thresholds are " + EMPLOYER_HOURLY_THRESHOLDS_2026 + ". Payroll counts 90% up to the first threshold, 60% between the first and second, and 30% between the second and third. Earnings above the third threshold do not enter the calculation."),
        p("The employer takes 60% of the reduced result and multiplies it by the missed working hours. Two people with the same monthly salary can therefore receive different compensation when their shift patterns differ."),
        cite("The legal basis is <a href=\"" + LABOUR_CODE_192 + "\" rel=\"nofollow noopener\" target=\"_blank\">Section 192 of the Czech Labour Code</a>."),
      ]},
      { id: "from-day-15", nav: "From day 15", eyebrow: "ČSSZ benefit", h2: "How ČSSZ calculates sickness benefit from day 15", blocks: [
        lead("ČSSZ uses a reduced daily assessment base and pays for every calendar day."),
        p("The base normally uses assessable income from the previous 12 calendar months. The 2026 daily thresholds are " + DVZ_THRESHOLDS_2026 + ". ČSSZ counts 90% up to the first threshold, 60% to the second, and 30% to the third."),
      ]},
      { id: "cssz-rates", nav: "ČSSZ rates", eyebrow: "Length of absence", h2: "What percentage ČSSZ pays", blocks: [
        ul(["<strong>Days 15-30:</strong> 60% of the reduced daily base.", "<strong>Days 31-60:</strong> 66%.", "<strong>From day 61:</strong> 72%."]),
        cite("Thresholds and rates were checked on 25 August 2026 with <a href=\"" + MPSV_SICKNESS_2026 + "\" rel=\"nofollow noopener\" target=\"_blank\">MPSV</a> and <a href=\"" + CSSZ_BENEFIT_CALC + "\" rel=\"nofollow noopener\" target=\"_blank\">ČSSZ</a>."),
      ]},
      { id: "example", nav: "Example", eyebrow: "Worked method", h2: "A worked Czech sick-pay example", blocks: [
        lead("A simple example shows why the two stages cannot be combined."),
        p("Employer example: CZK 250 an hour is reduced to CZK 225. Sixty percent is CZK 135 per missed hour. Nine eight-hour shifts give an estimate of CZK 9,720 before rounding."),
        p("ČSSZ example: a daily base of CZK 1,500 is reduced to CZK 1,350. From day 15 to day 30, 60% gives an estimated CZK 810 per calendar day."),
        p("For your own estimate, use the <a href=\"" + MPSV_CALCULATOR_2026 + "\" rel=\"nofollow noopener\" target=\"_blank\">MPSV 2026 calculator</a>, then compare the result with payroll or ČSSZ."),
        warn("A calculator gives an estimate", "The assessment period, excluded days, shift pattern, earlier employment, an agreement, self-employment or cross-border insurance can change the result."),
      ]},
      { id: "checks", nav: "What to check", eyebrow: "If the amount looks wrong", h2: "What to verify with payroll and ČSSZ", blocks: [
        lead("First identify which of the two payments is being calculated."),
        ul(["How many shifts and hours were missed in the first 14 days?", "Which average hourly earnings did payroll use?", "On which date did ČSSZ take over payment?", "Which income and excluded days entered the daily base?", "Does the MPSV estimate use the same information as payroll or ČSSZ?"]),
        p("Our separate guide explains <a href=\"" + href("en", "/blog/neschopenka-czech-sick-note-explained") + "\">how Czech eNeschopenka works</a>. If you need a medical assessment, see the <a href=\"" + href("en", "/services/neschopenka-online") + "\">online sick-note consultation</a>. A doctor cannot guarantee a sick note or a particular benefit amount."),
      ]},
    ],
    linksEyebrow: "Global Health Czechia", linksH2: "Sick note and medical assessment", linksLead: "ČSSZ calculates the benefit; a doctor assesses whether health reasons justify incapacity for work.",
    links: [{ label: "Online sick-note consultation", href: href("en", "/services/neschopenka-online") }, { label: "How eNeschopenka works", href: href("en", "/blog/neschopenka-czech-sick-note-explained") }, { label: "Doctors in Czechia", href: href("en", "/doctors") }, { label: "Contact Global Health Czechia", href: href("en", "/contact") }],
    ctaBox: { h3: "Do you need a medical assessment?", text: "A Czech doctor can assess whether your condition justifies incapacity for work. The employer and ČSSZ determine the payment.", primary: { label: "Book a consultation", href: href("en", "/services/neschopenka-online") }, secondary: { label: "View doctors", href: href("en", "/doctors") } },
    sourcesEyebrow: "Official sources", sourcesH2: "Rules for 2026", sourcesLead: "Checked on 25 August 2026.",
    sources: [{ label: "MPSV: sickness insurance in 2026", href: MPSV_SICKNESS_2026 }, { label: "ČSSZ: detailed sickness-benefit information", href: CSSZ_SICKNESS_DETAIL }, { label: "ČSSZ: benefit amounts and calculations", href: CSSZ_BENEFIT_CALC }, { label: "MPSV: 2026 benefit calculator", href: MPSV_CALCULATOR_2026 }, { label: "Czech Labour Code, Section 192", href: LABOUR_CODE_192 }, { label: "Czech Sickness Insurance Act", href: SICKNESS_ACT_187 }],
    sourcesNote: "The employer calculates exact wage compensation; ČSSZ calculates exact sickness benefit.", faqEyebrow: "Frequently asked questions", faqH2: "Czech sick pay in 2026",
    faqs: [{ q: "Who pays during the first 14 days?", a: "The employer pays wage compensation for missed shifts and paid public holidays. ČSSZ starts paying sickness benefit from the 15th calendar day." }, { q: "What percentage does ČSSZ pay?", a: "It pays 60% from days 15-30, 66% from days 31-60 and 72% from day 61, always after reducing the daily assessment base." }, { q: "Where is the official calculator?", a: "MPSV publishes a 2026 benefit calculator. It is only an estimate because it may not know your actual hourly average, shifts, assessment period or excluded days." }],
    disclaimerTitle: "Medical and financial information", disclaimer: "AI-assisted article awaiting Czech legal, payroll and clinical review. General information checked on 25 August 2026; not individual medical, legal or payroll advice.",
  } satisfies Article,
};

const de: LocalePost = {
  locale: "DE", slug: "krankengeld-tschechien-berechnung-2026-arbeitgeber-cssz", title: "Krankengeld in Tschechien 2026: Arbeitgeber und ČSSZ", excerpt: "So werden die Lohnfortzahlung in den ersten 14 Tagen und das Krankengeld der ČSSZ ab Tag 15 in Tschechien berechnet.", seoTitle: "Krankengeld Tschechien 2026: Berechnung", seoDescription: "Berechnung bei Krankheit in Tschechien 2026: Arbeitgeberzahlung für Tag 1-14, ČSSZ-Leistung ab Tag 15, Reduktionsgrenzen und Beispiele.", category: "Allgemeinmedizin",
  article: {
    lang: "de-DE", tagline: "Medizin, wenn Sie sie brauchen", categoryLabel: "Allgemeinmedizin", categoryHref: href("de", "/blog"), eyebrow: "Tschechien · Regeln für 2026", h1: "Berechnung des Krankengelds in Tschechien 2026", deck: "In den ersten 14 Kalendertagen zahlt der Arbeitgeber Ersatz für ausgefallene Schichten. Ab Tag 15 zahlt die ČSSZ für jeden Kalendertag.",
    intro: "Die Berechnung bei Krankheit in Tschechien hat 2026 <strong>zwei getrennte Stufen</strong>. Bei einem versicherten Arbeitsverhältnis zahlt der Arbeitgeber in den ersten 14 Kalendertagen Lohnersatz, jedoch nur für ausgefallene Schichten und bezahlte Feiertage. Ab Tag 15 zahlt die ČSSZ Krankengeld für jeden Kalendertag. Für Selbstständige, bestimmte Vereinbarungen und grenzüberschreitende Fälle können andere Regeln gelten. Beide Beträge werden reduziert und lassen sich nicht als einfacher Prozentsatz des monatlichen Bruttolohns berechnen.",
    facts: ["Tag 1-14: Lohnersatz durch den Arbeitgeber", "Ab Tag 15: Krankengeld durch die ČSSZ", "Tagesgrenzen 2026: 1.633, 2.449 und 4.897 CZK"], primaryCta: { label: "Offiziellen Rechner für 2026 öffnen", href: MPSV_CALCULATOR_2026 }, secondaryCta: { label: "So funktioniert eNeschopenka", href: href("de", "/blog/neschopenka-krankschreibung-in-tschechien") }, panelChip: "Kurz erklärt", panelParas: ["Lohnersatz und Krankengeld sind verschiedene Zahlungen.", "Die erste Stufe nutzt Stundenverdienst und ausgefallene Schichten.", "Ab Tag 15 verwendet die ČSSZ eine tägliche Bemessungsgrundlage."], author: { initials: "VČ", name: "MUDr. Vojtěch Černý", line: "Allgemeinmediziner · Global Health Tschechien" }, reviewLine: "Vor der Veröffentlichung ist die fachliche und sprachliche Prüfung durch MUDr. Romana Pavlů erforderlich.", navLabel: "In diesem Leitfaden",
    sections: [
      { id: "erste-14-tage", nav: "Erste 14 Tage", eyebrow: "Lohnersatz", h2: "Was der Arbeitgeber in den ersten 14 Tagen zahlt", blocks: [lead("Der Arbeitgeber zahlt 60% des reduzierten durchschnittlichen Stundenverdiensts für ausgefallene Schichten und bezahlte Feiertage."), p("Die Lohnabrechnung verwendet den durchschnittlichen Stundenverdienst, nicht direkt das aktuelle Monatsgehalt. Für 2026 gelten die stündlichen Reduktionsgrenzen " + EMPLOYER_HOURLY_THRESHOLDS_2026 + ". Bis zur ersten Grenze zählen 90%, zwischen der ersten und zweiten 60%, zwischen der zweiten und dritten 30%. Einkommen oberhalb der dritten Grenze bleibt unberücksichtigt."), p("Vom reduzierten Ergebnis werden 60% mit den ausgefallenen Arbeitsstunden multipliziert. Zwei Beschäftigte mit gleichem Monatsgehalt können deshalb bei unterschiedlichen Schichtplänen verschiedene Beträge erhalten."), cite("Rechtsgrundlage ist <a href=\"" + LABOUR_CODE_192 + "\" rel=\"nofollow noopener\" target=\"_blank\">§ 192 des tschechischen Arbeitsgesetzbuchs</a>.")] },
      { id: "ab-tag-15", nav: "Ab Tag 15", eyebrow: "Leistung der ČSSZ", h2: "Wie die ČSSZ ab Tag 15 rechnet", blocks: [lead("Die ČSSZ verwendet eine reduzierte tägliche Bemessungsgrundlage und zahlt für jeden Kalendertag."), p("Die Grundlage wird gewöhnlich aus dem anrechenbaren Einkommen der zwölf Kalendermonate vor Beginn der Arbeitsunfähigkeit und den anrechenbaren Tagen gebildet. 2026 gelten die täglichen Grenzen " + DVZ_THRESHOLDS_2026 + ". Bis zur ersten Grenze zählen 90%, zwischen der ersten und zweiten 60%, zwischen der zweiten und dritten 30%.")] },
      { id: "cssz-saetze", nav: "ČSSZ-Sätze", eyebrow: "Dauer der Krankheit", h2: "Welchen Prozentsatz die ČSSZ zahlt", blocks: [ul(["<strong>Tag 15-30:</strong> 60% der reduzierten Tagesgrundlage.", "<strong>Tag 31-60:</strong> 66%.", "<strong>Ab Tag 61:</strong> 72%."]), p("Die Prozentsätze werden erst nach der Reduktion der Tagesgrundlage angewandt. Wer sie direkt auf das monatliche Bruttogehalt anwendet, erhält ein falsches Ergebnis."), cite("Grenzen und Sätze wurden am 25. August 2026 bei <a href=\"" + MPSV_SICKNESS_2026 + "\" rel=\"nofollow noopener\" target=\"_blank\">MPSV</a> und <a href=\"" + CSSZ_BENEFIT_CALC + "\" rel=\"nofollow noopener\" target=\"_blank\">ČSSZ</a> geprüft.")] },
      { id: "beispiel", nav: "Beispiel", eyebrow: "Rechenweg", h2: "Beispiel für die Berechnung", blocks: [lead("Ein einfaches Beispiel zeigt, warum beide Stufen getrennt bleiben müssen."), p("Arbeitgeberbeispiel: Ein durchschnittlicher Stundenverdienst von 250 CZK liegt unter der ersten Stundengrenze. Davon zählen 90%, also 225 CZK. Der Lohnersatz beträgt 60% davon, somit 135 CZK je ausgefallener Stunde. Bei neun Achtstundenschichten ergibt sich vor Rundung und Besonderheiten der Lohnabrechnung eine Schätzung von 72 × 135 CZK = 9.720 CZK."), p("ČSSZ-Beispiel: Eine ungekürzte tägliche Bemessungsgrundlage von 1.500 CZK wird zu 90% berücksichtigt, also mit 1.350 CZK. Von Tag 15 bis 30 beträgt die Leistung 60%, damit geschätzt 810 CZK je Kalendertag. Die ČSSZ nutzt die tatsächlichen Einkünfte, anrechenbare und ausgeschlossene Tage sowie die gesetzlichen Rundungsregeln."), p("Nutzen Sie für eine eigene Schätzung den <a href=\"" + MPSV_CALCULATOR_2026 + "\" rel=\"nofollow noopener\" target=\"_blank\">MPSV-Rechner 2026</a> und vergleichen Sie das Ergebnis mit der Lohnabrechnung oder ČSSZ."), warn("Der Rechner liefert nur eine Schätzung", "Bemessungszeitraum, ausgeschlossene Tage, Schichten, frühere Beschäftigung, Selbstständigkeit oder ein grenzüberschreitendes Versicherungsverhältnis können den Betrag ändern.")] },
      { id: "pruefen", nav: "Was prüfen", eyebrow: "Wenn der Betrag nicht stimmt", h2: "Was Sie bei Arbeitgeber und ČSSZ prüfen sollten", blocks: [lead("Klären Sie zuerst, welche der beiden Zahlungen gerade berechnet wird."), ul(["Wie viele Schichten und Stunden fielen in den ersten 14 Tagen aus?", "Welchen durchschnittlichen Stundenverdienst nutzte die Lohnabrechnung?", "Ab welchem Tag übernahm die ČSSZ?", "Welche Einkünfte und ausgeschlossenen Tage flossen in die Tagesgrundlage ein?", "Nutzt die MPSV-Schätzung dieselben Angaben wie Arbeitgeber oder ČSSZ?"]), p("Unser eigener Leitfaden erklärt, <a href=\"" + href("de", "/blog/neschopenka-krankschreibung-in-tschechien") + "\">wie eNeschopenka funktioniert</a>. Für eine medizinische Beurteilung können Sie die <a href=\"" + href("de", "/services/neschopenka-online") + "\">Online-Konsultation zur Krankschreibung</a> nutzen. Ein Arzt kann weder Krankschreibung noch Leistungshöhe garantieren.")] },
    ],
    linksEyebrow: "Global Health Tschechien", linksH2: "Krankschreibung und medizinische Beurteilung", linksLead: "Die ČSSZ berechnet die Leistung; der Arzt beurteilt die gesundheitliche Arbeitsunfähigkeit.", links: [{ label: "Online-Konsultation zur Krankschreibung", href: href("de", "/services/neschopenka-online") }, { label: "So funktioniert eNeschopenka", href: href("de", "/blog/neschopenka-krankschreibung-in-tschechien") }, { label: "Ärzte in Tschechien", href: href("de", "/doctors") }, { label: "Global Health Tschechien kontaktieren", href: href("de", "/contact") }], ctaBox: { h3: "Brauchen Sie eine medizinische Beurteilung?", text: "Ein tschechischer Arzt kann beurteilen, ob Ihr Zustand eine Arbeitsunfähigkeit begründet. Arbeitgeber und ČSSZ bestimmen die Zahlung.", primary: { label: "Konsultation buchen", href: href("de", "/services/neschopenka-online") }, secondary: { label: "Ärzte ansehen", href: href("de", "/doctors") } },
    sourcesEyebrow: "Offizielle Quellen", sourcesH2: "Regeln für 2026", sourcesLead: "Grenzen und Verfahren wurden am 25. August 2026 geprüft.", sources: [{ label: "MPSV: Krankenversicherung 2026", href: MPSV_SICKNESS_2026 }, { label: "ČSSZ: Einzelheiten zum Krankengeld", href: CSSZ_SICKNESS_DETAIL }, { label: "ČSSZ: Höhe und Berechnung", href: CSSZ_BENEFIT_CALC }, { label: "MPSV: Leistungsrechner 2026", href: MPSV_CALCULATOR_2026 }, { label: "Tschechisches Arbeitsgesetzbuch § 192", href: LABOUR_CODE_192 }, { label: "Tschechisches Krankenversicherungsgesetz", href: SICKNESS_ACT_187 }], sourcesNote: "Der Arbeitgeber berechnet den genauen Lohnersatz; die ČSSZ berechnet das genaue Krankengeld.", faqEyebrow: "Häufige Fragen", faqH2: "Krankengeld in Tschechien 2026", faqs: [{ q: "Wer zahlt in den ersten 14 Tagen?", a: "Der Arbeitgeber zahlt Lohnersatz für ausgefallene Schichten und bezahlte Feiertage. Ab dem 15. Kalendertag zahlt die ČSSZ Krankengeld." }, { q: "Welchen Prozentsatz zahlt die ČSSZ?", a: "60% von Tag 15-30, 66% von Tag 31-60 und 72% ab Tag 61, jeweils nach Reduktion der täglichen Bemessungsgrundlage." }, { q: "Wo finde ich den offiziellen Rechner?", a: "MPSV veröffentlicht einen Rechner für 2026. Er bleibt eine Schätzung, da er Ihren tatsächlichen Stundenwert, Schichten und ausgeschlossenen Tage möglicherweise nicht kennt." }], disclaimerTitle: "Medizinischer und finanzieller Hinweis", disclaimer: "KI-unterstützter Artikel, der noch tschechisch-rechtlich, lohnfachlich und klinisch geprüft werden muss. Allgemeine Informationen vom 25. August 2026; keine individuelle medizinische, rechtliche oder lohnfachliche Beratung.",
  } satisfies Article,
};

export const CZ_VYPOCET_NEMOCENSKE: PostSet = {
  key: "cz-vypocet-nemocenske",
  countryCode: "cz",
  targetKeyword: "výpočet nemocenské 2026",
  searchVolume: 1600,
  keywordDifficulty: 31,
  evidence:
    "Primary keyword 'výpočet nemocenské 2026' 1,600/KD31/CPC1.26 with supporting head term 'nemocenská 2026' 2,900/KD22 from the 2026-08 editorial research brief. Search intent is explicitly calculation-focused, with SERPs mixing state sources, payroll explainers and calculators. This article is intentionally calculation-first and distinct from the existing eNeschopenka process explainer.",
  serviceSlug: "neschopenka-online",
  authorDoctorId: "cmqz2vn0j006901lu9zla3zmp",
  authorDisplayName: "Global Health Medical Team",
  reviewerDoctorId: "cmqz4mk98007801lugo7c4y30",
  reviewerDisplayName: "MUDr. Romana Pavlů",
  posts: [cs, en, pt, es, roPost, de],
};

export const CZ_VYPOCET_NEMOCENSKE_BODIES = () =>
  CZ_VYPOCET_NEMOCENSKE.posts.map((post) => renderArticle(post.article));
