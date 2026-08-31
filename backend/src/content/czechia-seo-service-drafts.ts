import { createHash } from "node:crypto";

export type CzechiaSeoServiceDraft = {
  serviceId: string;
  expectedServiceUpdatedAt: string;
  expectedSourceSha256: string;
  countryCode: "cz";
  locale: "CS";
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  name: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroDescription: string;
  detailBody: string;
  ctaLabel: string;
  faqs: readonly {
    id: string;
    question: string;
    answer: string;
  }[];
};

const sickNote = {
  serviceId: "cmr85xs2p000e70juwmch637u",
  expectedServiceUpdatedAt: "2026-07-19T05:02:26.121Z",
  expectedSourceSha256: "880fd7d374b062af8df380b46b24d1a07c7187f570f2307aba679336203834cc",
  countryCode: "cz",
  locale: "CS",
  slug: "neschopenka-online",
  primaryKeyword: "online neschopenka",
  secondaryKeywords: ["neschopenka online", "lékařská neschopenka online"],
  name: "Online neschopenka",
  summary:
    "Online konzultace k posouzení pracovní neschopnosti. Lékař rozhodne podle zdravotního stavu a povahy práce; vystavení eNeschopenky není automatické.",
  seoTitle: "Online neschopenka | Posouzení lékařem",
  seoDescription:
    "Online konzultace k posouzení pracovní neschopnosti. Lékař rozhodne podle zdravotního stavu; vystavení eNeschopenky není automatické.",
  heroTitle: "Online posouzení pracovní neschopnosti",
  heroDescription:
    "Při videokonzultaci lékař posoudí váš zdravotní stav a povahu práce. Pokud vyšetření na dálku nestačí, doporučí osobní péči. eNeschopenku lze vystavit jen tehdy, je-li pracovní neschopnost medicínsky odůvodněná.",
  detailBody: `<p><strong>Při náhlém nebo závažném zhoršení zdravotního stavu volejte 155 nebo 112. Online konzultace není určena pro neodkladnou péči.</strong></p>
<h2>Co lékař při konzultaci posoudí</h2>
<p>Lékař se zeptá na vaše potíže, jejich průběh, dosavadní léčbu a nároky vaší práce. Zhodnotí také, zda lze stav posoudit při videokonzultaci. Pokud potřebuje fyzikální vyšetření, odběry nebo jiné vyšetření na místě, doporučí osobní návštěvu.</p>
<h2>Co si připravit</h2>
<ul><li>doklad totožnosti a údaje vyžádané při rezervaci,</li><li>seznam užívaných léků a informace o alergiích,</li><li>stručný průběh potíží včetně data jejich začátku,</li><li>popis práce a činností, které nyní nemůžete vykonávat,</li><li>dostupné lékařské zprávy nebo výsledky související s potížemi.</li></ul>
<h2>Jaký může být výsledek posouzení</h2>
<p>Pokud lékař po odpovídajícím vyšetření uzná dočasnou pracovní neschopnost, může rozhodnutí zapsat do systému eNeschopenka a předat příslušné správě sociálního zabezpečení. Vystavení dokladu, jeho délku ani zpětné datum nelze slíbit před konzultací.</p>
<p>ČSSZ uvádí, že zaměstnanec musí o překážce v práci neprodleně informovat zaměstnavatele. Elektronická notifikace zaměstnavateli závisí na aktivaci služby a na zpracování údajů v systému ČSSZ. Podrobnosti najdete v <a href="https://www.cssz.gov.cz/web/eneschopenka">oficiálních informacích ČSSZ k eNeschopence</a>.</p>
<h2>Neschopenka a nárok na nemocenské nejsou totéž</h2>
<p>Lékař posuzuje zdravotní důvod dočasné pracovní neschopnosti. Účast na nemocenském pojištění, náhradu mzdy a výplatu dávky řeší zaměstnavatel a ČSSZ podle aktuálních pravidel. Tato konzultace neurčuje nárok ani výši dávky.</p>
<h2>Průběh eNeschopenky krok za krokem</h2>
<p>Administrativní postup pro zaměstnance, zaměstnavatele, lékaře a ČSSZ popisuje samostatný článek <a href="/czechia/cs/blog/neschopenka-jak-funguje-eneschopenka">Jak funguje eNeschopenka</a>. Tato stránka slouží k objednání lékařského posouzení.</p>
<h2>Kdy zvolit osobní nebo akutní péči</h2>
<p>Osobní vyšetření může být nutné při dušnosti, bolesti na hrudi, poruše vědomí, silné bolesti, významném zhoršení stavu nebo tehdy, když lékař nemá při videokonzultaci dost informací. Při bezprostředním ohrožení života volejte 155 nebo 112.</p>`,
  ctaLabel: "Objednat posouzení",
  faqs: [
    {
      id: "cmr85xsa6000f70juiww70ryi",
      question: "Je eNeschopenka po konzultaci vystavena automaticky?",
      answer:
        "Ne. Lékař nejprve posoudí zdravotní stav, povahu práce a vhodnost vyšetření na dálku. eNeschopenku může vystavit pouze tehdy, pokud je dočasná pracovní neschopnost medicínsky odůvodněná.",
    },
    {
      id: "cmr85xsa7000g70juxfnb13c0",
      question: "Co si mám připravit k online posouzení neschopenky?",
      answer:
        "Připravte si doklad totožnosti, údaje vyžádané při rezervaci, seznam léků, informace o alergiích, průběh potíží, popis své práce a dostupné lékařské zprávy.",
    },
    {
      id: "cmr85xsa7000h70jukgav4lq6",
      question: "Rozhodne lékař také o mém nároku na nemocenské?",
      answer:
        "Ne. Lékař posuzuje zdravotní důvod dočasné pracovní neschopnosti. Účast na nemocenském pojištění a nárok na dávku se řídí aktuálními pravidly ČSSZ a pracovním vztahem.",
    },
    {
      id: "cmr85xsa7000i70juhcv8uf4r",
      question: "Může online posouzení využít OSVČ?",
      answer:
        "Konzultaci si objednat můžete. Lékař posoudí zdravotní stav; případný nárok na nemocenské je samostatná otázka nemocenského pojištění, kterou je potřeba ověřit u ČSSZ.",
    },
    {
      id: "cmr85xsa7000j70juz48nt8zz",
      question: "Lze eNeschopenku vystavit zpětně?",
      answer:
        "Zpětné vystavení je omezené zákonnými podmínkami a nelze je slíbit předem. Lékaři při konzultaci sdělte, kdy potíže začaly a zda už proběhlo vyšetření.",
    },
    {
      id: "cmr85xsa7000k70ju3eqob21a",
      question: "Musím o pracovní neschopnosti informovat zaměstnavatele?",
      answer:
        "Ano. ČSSZ uvádí, že zaměstnanec musí zaměstnavatele o překážce v práci neprodleně informovat. Údaje o rozhodnutí předává lékař elektronicky; notifikace zaměstnavateli závisí na nastavení a zpracování v systému ČSSZ.",
    },
    {
      id: "cmr85xsa7000l70ju0rerevdi",
      question: "Jak rychle se informace objeví v systému ČSSZ?",
      answer:
        "Doba zpracování je individuální a může trvat hodiny nebo dny podle správnosti údajů a potřeby jejich ověření. Konzultace proto nemůže slíbit konkrétní čas notifikace.",
    },
  ],
} satisfies CzechiaSeoServiceDraft;

const treatmentRenewal = {
  serviceId: "cmr85xtxo000r70juhan2iood",
  expectedServiceUpdatedAt: "2026-07-19T05:02:31.451Z",
  expectedSourceSha256: "8bd648915a8dce6651a6be34a161f3948b9d2861c39e41a305a4ed4805e74ad8",
  countryCode: "cz",
  locale: "CS",
  slug: "obnoveni-lecby",
  primaryKeyword: "obnovení receptu online",
  secondaryKeywords: ["obnova léčby online", "eRecept online", "online konzultace kvůli receptu"],
  name: "Obnovení léčby a receptu online",
  summary:
    "Online konzultace k pokračování zavedené léčby. Lékař posoudí dokumentaci, aktuální stav a bezpečnost dalšího postupu; vystavení eReceptu není automatické.",
  seoTitle: "Obnovení receptu online | Posouzení léčby lékařem",
  seoDescription:
    "Online konzultace k pokračování zavedené léčby. Lékař posoudí dokumentaci, bezpečnost a další postup; vystavení eReceptu není automatické.",
  heroTitle: "Obnovení léčby a receptu online",
  heroDescription:
    "Lékař při videokonzultaci zkontroluje dosavadní léčbu, dokumentaci, aktuální potíže a bezpečnost pokračování. eRecept vystaví pouze tehdy, pokud je další léčba vhodná a má pro rozhodnutí dost informací.",
  detailBody: `<p><strong>Při náhlém nebo závažném zhoršení zdravotního stavu volejte 155 nebo 112. Online konzultace není určena pro neodkladnou péči.</strong></p>
<h2>Komu může konzultace pomoci</h2>
<p>Služba je určena k posouzení pokračování zavedené léčby u stabilního stavu. Lékař potřebuje znát dosavadní diagnózu, užívané léky a průběh léčby. Nové nebo výrazně změněné potíže mohou vyžadovat širší konzultaci či osobní vyšetření.</p>
<h2>Co si připravit</h2>
<ul><li>seznam všech léků včetně dávkování a délky užívání,</li><li>poslední lékařskou zprávu nebo doporučení předepisujícího lékaře,</li><li>výsledky kontrolních odběrů a domácí měření, pokud se léčby týkají,</li><li>informace o alergiích, nežádoucích účincích a nových potížích,</li><li>údaje o dalších lécích a doplňcích kvůli možným interakcím.</li></ul>
<h2>Jak lékař rozhoduje</h2>
<p>Lékař ověří, zda léčba stále odpovídá vašemu zdravotnímu stavu. Zohlední účinek, nežádoucí účinky, možné interakce a potřebu kontrolních vyšetření. Pokud nemá dostatek informací nebo léčba vyžaduje vyšetření na místě, doporučí jiný postup.</p>
<h2>eRecept není automatickou součástí objednávky</h2>
<p>Pokud je pokračování léčby po posouzení vhodné, lékař může vystavit eRecept. Elektronický recept je uložen v centrálním systému a pacient dostane jeho identifikátor pro výdej v lékárně. Způsob předání identifikátoru a dostupnost konkrétního léčivého přípravku se mohou lišit.</p>
<p>Informace o systému najdete na oficiálním portálu <a href="https://www.epreskripce.cz/">ePreskripce</a>. Konzultace nezaručuje předepsání konkrétního léku, dávky ani počtu balení.</p>
<h2>Kdy je potřeba jiný postup</h2>
<p>Osobní kontrola nebo vyšetření může být nutné při změně příznaků, chybějící dokumentaci, potřebě fyzikálního vyšetření či odběrů nebo u léčiv vyžadujících zvláštní dohled. Lékař může také doporučit návštěvu původního předepisujícího lékaře nebo specialisty.</p>
<p>Pokud řešíte nový zdravotní problém, využijte <a href="/czechia/cs/gp-consultation-online">online konzultaci s praktickým lékařem</a>. Při bezprostředním ohrožení života volejte 155 nebo 112.</p>`,
  ctaLabel: "Objednat posouzení léčby",
  faqs: [
    {
      id: "cmr85xu55000s70juvfpdxhi4",
      question: "Je recept po konzultaci obnoven automaticky?",
      answer:
        "Ne. Lékař nejprve zkontroluje dosavadní léčbu, aktuální stav, možné nežádoucí účinky a dostupnou dokumentaci. eRecept může vystavit pouze tehdy, pokud je pokračování léčby vhodné.",
    },
    {
      id: "cmr85xu55000t70jusnndkqhm",
      question: "Lze při videokonzultaci obnovit každý lék?",
      answer:
        "Ne. Některé léky vyžadují osobní vyšetření, laboratorní kontrolu, zvláštní dohled nebo návštěvu původního předepisujícího lékaře. O vhodném postupu rozhodne lékař podle konkrétní situace.",
    },
    {
      id: "cmr85xu55000u70jucleqlqkr",
      question: "Jak dostanu eRecept, pokud ho lékař vystaví?",
      answer:
        "Elektronický recept má jedinečný identifikátor, který slouží k výdeji v lékárně. Lékař nebo služba vám sdělí dostupný způsob jeho předání. Samotná objednávka nezaručuje vystavení receptu.",
    },
    {
      id: "cmr85xu55000v70ju4q27csa4",
      question: "Co si mám připravit k posouzení léčby?",
      answer:
        "Připravte si seznam léků a dávkování, poslední lékařskou zprávu, relevantní výsledky, informace o alergiích a nežádoucích účincích a přehled dalších léků či doplňků.",
    },
    {
      id: "cmr85xu55000w70ju09qbtii5",
      question: "Co když se můj stav od poslední kontroly změnil?",
      answer:
        "Popište změnu hned na začátku konzultace. Lékař posoudí, zda stačí videokonzultace, nebo je bezpečnější širší či osobní vyšetření. Při náhlém závažném zhoršení volejte 155 nebo 112.",
    },
    {
      id: "cmr85xu55000x70jus9xjlihu",
      question: "Mohu si konzultaci objednat bez registrovaného praktického lékaře?",
      answer:
        "Ano, konzultaci si objednat můžete. Rozhodnutí o pokračování léčby závisí na dostupné dokumentaci a klinickém posouzení. Služba nenahrazuje pravidelné kontroly ani dlouhodobou péči praktického lékaře.",
    },
  ],
} satisfies CzechiaSeoServiceDraft;

export const CZECHIA_SEO_SERVICE_DRAFTS = [sickNote, treatmentRenewal] as const;

function approvalPayload(draft: CzechiaSeoServiceDraft) {
  return {
    slug: draft.slug,
    locale: draft.locale,
    name: draft.name,
    summary: draft.summary,
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    heroTitle: draft.heroTitle,
    heroDescription: draft.heroDescription,
    detailBody: draft.detailBody,
    ctaLabel: draft.ctaLabel,
    faqs: draft.faqs,
  };
}

export function czechiaSeoApprovalSha256(draft: CzechiaSeoServiceDraft): string {
  return createHash("sha256").update(JSON.stringify(approvalPayload(draft))).digest("hex");
}

export function czechiaSeoConfirmationToken(draft: CzechiaSeoServiceDraft): string {
  return `CZ-SEO-SERVICE:${draft.slug}:${czechiaSeoApprovalSha256(draft).slice(0, 16)}`;
}

export function parseCzechiaSeoReviewDate(value: string | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Review date must use YYYY-MM-DD");
  }
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Review date must be a valid calendar date");
  }
  if (value > new Date().toISOString().slice(0, 10)) {
    throw new Error("Review date cannot be in the future");
  }
  return date;
}

export function assertCzechiaSeoApplyGate(
  apply: boolean,
  draft: CzechiaSeoServiceDraft,
  reviewedAt: Date | null,
  providedHash: string | null,
  reviewerDoctorId: string | null,
  confirmation: string | null,
): void {
  if (!apply) return;
  if (!reviewedAt) throw new Error("Refusing to apply without a real clinical review date");
  if (providedHash !== czechiaSeoApprovalSha256(draft)) {
    throw new Error("Refusing to apply without approval for the exact reviewed copy");
  }
  if (!reviewerDoctorId) throw new Error("Refusing to apply without a linked reviewer doctor");
  if (confirmation !== czechiaSeoConfirmationToken(draft)) {
    throw new Error("Refusing to apply without the exact confirmation token");
  }
}

export function validateCzechiaSeoServiceDraft(draft: CzechiaSeoServiceDraft): string[] {
  const errors: string[] = [];
  const text = JSON.stringify(draft);
  if (draft.seoTitle.length > 60) errors.push("SEO title exceeds 60 characters");
  if (draft.seoDescription.length < 110 || draft.seoDescription.length > 160) {
    errors.push("SEO description must be 110-160 characters");
  }
  if (!/155.*112|112.*155/.test(draft.detailBody)) errors.push("Emergency numbers are missing");
  if (draft.faqs.length < 5) errors.push("At least five visible FAQs are required");
  if (/term[ií]n (ještě )?dnes|ve stejný den|bez čekání/i.test(text)) {
    errors.push("Availability promise found");
  }
  if (/vystaví potřebné žádanky|stejnou klinickou platnost|neschopenka ihned/i.test(text)) {
    errors.push("Unconditional medical promise found");
  }
  if (/[—–]/.test(text)) errors.push("Deslop failed: dash-heavy copy remains");
  if (/zde je|pojďme|v dnešní|stojí za zmínku|zásadně|robustní|landscape/i.test(text)) {
    errors.push("Deslop failed: formulaic phrasing remains");
  }
  return errors;
}
