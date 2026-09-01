import { createHash } from "node:crypto";

export type CzechiaPageContentSeoDraft = Readonly<{
  key: "home-cs" | "home-en" | "doctors-cs" | "gp-safety-cs";
  pageContentId: string;
  translationId: string;
  expectedPageUpdatedAt: string;
  expectedTranslationUpdatedAt: string;
  expectedSourceSha256: string;
  countryCode: "cz";
  pageKey: "HOME" | "DOCTORS_INDEX" | "GENERAL_CONSULTATION";
  locale: "CS" | "EN";
  canonicalPath: "/czechia/cs" | "/czechia/en" | "/czechia/cs/doctors" | "/czechia/cs/gp-consultation-online";
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  copy: Readonly<{
    seoTitle: string;
    seoDescription: string;
    heroTitle?: string;
    heroSubtitle?: string;
    intro?: string;
    body?: string;
    faq?: readonly Readonly<{ question: string; answer: string }>[];
  }>;
}>;

const homeCs = {
  key: "home-cs",
  pageContentId: "cmrind0xz005w01mzte2zambm",
  translationId: "cmriu5y3f00b901qn6od5vjdf",
  expectedPageUpdatedAt: "2026-07-25T08:22:17.345Z",
  expectedTranslationUpdatedAt: "2026-08-09T00:41:13.804Z",
  expectedSourceSha256: "00a8584c7e7b99dde81423b9757f32d9730e867f4db2e00e3625bf88e67a7a7d",
  countryCode: "cz",
  pageKey: "HOME",
  locale: "CS",
  canonicalPath: "/czechia/cs",
  primaryKeyword: "online lékař Česko",
  secondaryKeywords: ["online lékař", "lékař online Česko"],
  copy: {
    seoTitle: "Online lékař v Česku | Registrovaní lékaři",
    seoDescription:
      "Online konzultace s lékaři registrovanými v Česku. Vyberte službu a volný termín; další postup vždy závisí na klinickém posouzení.",
    heroTitle: "Online lékařská péče v Česku",
    heroSubtitle:
      "Vyberte službu, zkontrolujte aktuální termíny a objednejte se k lékaři registrovanému v Česku. Dostupnost a výsledek konzultace nelze slíbit předem.",
  },
} satisfies CzechiaPageContentSeoDraft;

const homeEn = {
  key: "home-en",
  pageContentId: "cmrind0xz005w01mzte2zambm",
  translationId: "cmriu5y3f00bb01qnbannlbyv",
  expectedPageUpdatedAt: "2026-07-25T08:22:17.345Z",
  expectedTranslationUpdatedAt: "2026-07-25T08:22:18.643Z",
  expectedSourceSha256: "7c365a1345451e62def0e83c84e16bc618351cdc0293ba48c2fc293070337097",
  countryCode: "cz",
  pageKey: "HOME",
  locale: "EN",
  canonicalPath: "/czechia/en",
  primaryKeyword: "online doctor Czech Republic",
  secondaryKeywords: ["doctor for foreigners Czech Republic", "English doctor Czechia"],
  copy: {
    seoTitle: "Online Doctor in the Czech Republic | Registered Doctors",
    seoDescription:
      "Consult doctors registered in the Czech Republic by video. Choose a service and a live appointment; prescriptions and documents depend on clinical assessment.",
    heroTitle: "Online medical care in the Czech Republic",
    heroSubtitle:
      "Choose a service, check live availability and book a video consultation with a doctor registered in the Czech Republic. Outcomes cannot be guaranteed in advance.",
  },
} satisfies CzechiaPageContentSeoDraft;

const doctorsCs = {
  key: "doctors-cs",
  pageContentId: "cmrinrt3t009c01mzt7hdzny7",
  translationId: "cmriubvte00cf01qn3st7z9ih",
  expectedPageUpdatedAt: "2026-07-13T06:27:47.275Z",
  expectedTranslationUpdatedAt: "2026-07-13T06:27:47.283Z",
  expectedSourceSha256: "13ff81231bf79f84e21651e0f13046e0a4e9e15690e7971660643735700995b5",
  countryCode: "cz",
  pageKey: "DOCTORS_INDEX",
  locale: "CS",
  canonicalPath: "/czechia/cs/doctors",
  primaryKeyword: "online lékaři Česko",
  secondaryKeywords: ["lékaři Global Health", "ČLK lékař"],
  copy: {
    seoTitle: "Online lékaři v Česku | Ověřené profily",
    seoDescription:
      "Prohlédněte si profily lékařů registrovaných v Česku. Ověřte registraci, jazyky a aktuální možnost online rezervace.",
    heroTitle: "Online lékaři v Česku",
    heroSubtitle:
      "Vyberte si z ověřených profilů lékařů registrovaných v Česku. U každého najdete jazyky, registrační údaje a aktuální možnost rezervace.",
    intro:
      "Vyberte si z ověřených profilů lékařů registrovaných v Česku. U každého najdete jazyky, registrační údaje a aktuální možnost rezervace.",
  },
} satisfies CzechiaPageContentSeoDraft;

const gpSafetyCs = {
  key: "gp-safety-cs",
  pageContentId: "cmrijf0f30002soju8l76vgpb",
  translationId: "cmrinddaf006401mzfr90x63h",
  expectedPageUpdatedAt: "2026-07-14T21:32:28.046Z",
  expectedTranslationUpdatedAt: "2026-07-14T21:32:27.766Z",
  expectedSourceSha256: "32c157ef6306915199945ee6427b4599d8a853053f8dc13e9ceceb2b6acf9bdc",
  countryCode: "cz",
  pageKey: "GENERAL_CONSULTATION",
  locale: "CS",
  canonicalPath: "/czechia/cs/gp-consultation-online",
  primaryKeyword: "praktický lékař online",
  secondaryKeywords: ["online konzultace praktický lékař", "online lékař Česko"],
  copy: {
    seoTitle: "Praktický lékař online | Konzultace v Česku",
    seoDescription:
      "Online konzultace s praktickým lékařem. Lékař posoudí potíže a další postup; recepty, dokumenty a doporučení nejsou automatické.",
    heroTitle: "Online konzultace s praktickým lékařem v Česku",
    heroSubtitle:
      "Proberte své potíže s lékařem. Vhodnost online péče a případné recepty, dokumenty nebo doporučení závisejí na klinickém posouzení.",
    intro:
      "Online konzultace může pomoci s posouzením běžných zdravotních potíží a volbou dalšího postupu. Pokud je nutné fyzikální, laboratorní nebo jiné osobní vyšetření, lékař vás na něj upozorní.",
    body: `<p><strong>Při náhlém nebo závažném zhoršení zdravotního stavu volejte 155 nebo 112. Online konzultace není určena pro neodkladnou péči.</strong></p>
<h2>Co může praktický lékař online posoudit</h2>
<p>Lékař probere příznaky, anamnézu, užívané léky a dostupné zdravotní zprávy. Poté vysvětlí, zda je vhodný postup na dálku, nebo je nutné osobní vyšetření.</p>
<h2>Recepty, eNeschopenka a doporučení</h2>
<p>Recept, eNeschopenku, potvrzení nebo doporučení lze vystavit pouze tehdy, pokud je to po klinickém posouzení medicínsky a administrativně odůvodněné. Objednání konzultace žádný výsledek ani dokument nezaručuje.</p>
<h2>Termíny a cena</h2>
<p>Aktuální volné termíny a konečná cena se zobrazují před dokončením rezervace. Mohou se měnit podle zvolené služby a dostupnosti.</p>
<p>Zdroje: <a href="https://ncez.mzcr.cz/cs/milnik-c-3-pravidladokumentypodklady-interoperabilita-telemedicina/pravidla-pro-rozvoj-telemediciny">NCEZ: pravidla pro telemedicínu</a> a <a href="https://www.nzip.cz/clanek/205-zdravotnicka-zachranna-sluzba">NZIP: zdravotnická záchranná služba</a>.</p>`,
    faq: [
      {
        question: "Mohu absolvovat online konzultaci s praktickým lékařem?",
        answer: "Ano, pokud jsou vaše potíže vhodné k posouzení na dálku. Lékař může podle příznaků doporučit osobní nebo akutní vyšetření.",
      },
      {
        question: "Kolik stojí online konzultace s praktickým lékařem?",
        answer: "Aktuální konečná cena se zobrazí před dokončením rezervace. Zkontrolujte ji spolu s délkou a podmínkami zvoleného termínu.",
      },
      {
        question: "Kde ověřím registraci online lékaře?",
        answer: "Registrační údaje uvedené u profilu ověřte v oficiálním seznamu České lékařské komory. Před rezervací zkontrolujte také jméno a rozsah služby vybraného lékaře.",
      },
      {
        question: "Co se děje po online konzultaci s praktickým lékařem?",
        answer: "Lékař shrne posouzení a doporučený další postup. Případné recepty, dokumenty nebo doporučení závisí na klinickém posouzení a dostupných informacích.",
      },
      {
        question: "Může online praktický lékař vystavit doporučení?",
        answer: "Lékař může doporučení vystavit, pokud je po posouzení klinicky vhodné a má potřebné informace. Objednání konzultace vystavení nezaručuje.",
      },
      {
        question: "Musím si pro rezervaci založit účet?",
        answer: "Postup rezervace a případná potřeba účtu se zobrazí během objednávky. Účet může sloužit k přístupu k informacím o konzultaci podle aktuálních funkcí služby.",
      },
      {
        question: "Může online praktický lékař vystavit eNeschopenku?",
        answer: "Lékař může eNeschopenku vystavit pouze tehdy, pokud je pracovní neschopnost po klinickém posouzení odůvodněná a splňuje příslušné podmínky. Vystavení není automatické.",
      },
      {
        question: "Může online praktický lékař vystavit eRecept?",
        answer: "Lékař může eRecept vystavit, pokud je lék klinicky vhodný a lze jej bezpečně předepsat na dálku. Objednání konzultace recept nezaručuje.",
      },
    ],
  },
} satisfies CzechiaPageContentSeoDraft;

export const CZECHIA_PAGE_CONTENT_SEO_DRAFTS = [homeCs, homeEn, doctorsCs, gpSafetyCs] as const;

export function czechiaPageContentApprovalSha256(draft: CzechiaPageContentSeoDraft): string {
  return createHash("sha256")
    .update(JSON.stringify({ key: draft.key, locale: draft.locale, copy: draft.copy }))
    .digest("hex");
}

export function czechiaPageContentConfirmationToken(draft: CzechiaPageContentSeoDraft): string {
  return `CZ-SEO-PAGE:${draft.key}:${czechiaPageContentApprovalSha256(draft).slice(0, 16)}`;
}

export function assertCzechiaPageContentApplyGate(input: Readonly<{
  apply: boolean;
  registerStatus: string;
  draft: CzechiaPageContentSeoDraft;
  approvedHash: string | null;
  reviewedAt: Date | null;
  reviewerId: string | null;
  nativeReviewerId: string | null;
  nativeReviewedAt: Date | null;
  confirmation: string | null;
}>): void {
  if (!input.apply) return;
  if (input.registerStatus.toLowerCase() !== "approved") {
    throw new Error(`Refusing to apply without clinical register status=approved for ${input.draft.canonicalPath}`);
  }
  if (!input.reviewedAt) throw new Error("Refusing to apply without a clinical review date");
  if (!input.reviewerId) throw new Error("Refusing to apply without an exact reviewer ID");
  if (input.draft.locale === "EN" && !input.nativeReviewerId) {
    throw new Error("Refusing to apply English copy without a native English reviewer ID");
  }
  if (input.draft.locale === "EN" && !input.nativeReviewedAt) {
    throw new Error("Refusing to apply English copy without a native English review date");
  }
  if (input.approvedHash !== czechiaPageContentApprovalSha256(input.draft)) {
    throw new Error("Refusing to apply without approval for the exact reviewed copy");
  }
  if (input.confirmation !== czechiaPageContentConfirmationToken(input.draft)) {
    throw new Error("Refusing to apply without the exact confirmation token");
  }
}

export function validateCzechiaPageContentSeoDraft(draft: CzechiaPageContentSeoDraft): string[] {
  const errors: string[] = [];
  const copy = JSON.stringify(draft.copy);
  if (draft.copy.seoTitle.length > 60) errors.push("SEO title exceeds 60 characters");
  if (draft.copy.seoDescription.length < 110 || draft.copy.seoDescription.length > 160) {
    errors.push("SEO description must be 110-160 characters");
  }
  if (/tentýž den|ve stejný den|same-day|guaranteed outcome|\b(?:je|jsou) automatick/i.test(copy)) {
    errors.push("Unsupported availability or outcome promise found");
  }
  if (/[—–]/.test(copy)) errors.push("Deslop failed: dash-heavy copy remains");
  if (/zde je|pojďme|v dnešní|stojí za zmínku|robustní|landscape/i.test(copy)) {
    errors.push("Deslop failed: formulaic phrasing remains");
  }
  return errors;
}
