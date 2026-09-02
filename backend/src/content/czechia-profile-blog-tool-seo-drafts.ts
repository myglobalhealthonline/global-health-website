import { createHash } from "node:crypto";

type AssetKind = "doctor" | "blog" | "tool";

export type CzechiaDoctorFaqReplacement = Readonly<{
  id: string;
  question: string;
  answer: string;
}>;

type DraftBase = Readonly<{
  assetKind: AssetKind;
  assetPath: string;
  slug: string;
  countryCode: "cz";
  locale: "CS";
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  expectedSourceSha256: string;
  faqReplacements: readonly CzechiaDoctorFaqReplacement[];
}>;

export type CzechiaDoctorProfileSeoDraft = DraftBase &
  Readonly<{
    assetKind: "doctor";
    doctorId: string;
    doctorCountryId: string;
    translationId: string;
    expectedTranslationUpdatedAt: string;
    desired: Readonly<{
      seoTitle: string;
      seoDescription: string;
      seoKeywords: readonly string[];
    }>;
  }>;

export type CzechiaBlogSeoDraft = DraftBase &
  Readonly<{
    assetKind: "blog";
    postId: string;
    expectedPostUpdatedAt: string;
    desired: Readonly<{
      title: string;
      seoTitle: string;
      seoDescription: string;
    }>;
  }>;

export type CzechiaToolSeoDraft = DraftBase &
  Readonly<{
    assetKind: "tool";
    sourceFile: "frontend/locales/cs/tools.json";
    desired: Readonly<{
      metaTitle: string;
      metaDescription: string;
      h1Lead: string;
      h1Accent: string;
      h1Trail: string;
    }>;
  }>;

export type CzechiaProfileBlogToolDraft =
  | CzechiaDoctorProfileSeoDraft
  | CzechiaBlogSeoDraft
  | CzechiaToolSeoDraft;

export const CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS = [
  {
    assetKind: "doctor",
    assetPath: "/czechia/cs/doctors/dr-ahmed-maklad",
    slug: "dr-ahmed-maklad",
    countryCode: "cz",
    locale: "CS",
    doctorId: "cmqas8yh9000b01pgpc0yp1la",
    doctorCountryId: "cmqybpo1g01z601qk3cxn1l5r",
    translationId: "dcmt_57b6801799cd71b366ba",
    expectedTranslationUpdatedAt: "2026-07-29T18:54:53.718Z",
    expectedSourceSha256: "1c1598c0789ed5bc3287053387e5666c032d2eee3bd463d944e1ae5dd748fe05",
    primaryKeyword: "MUDr. Ahmed Maklad",
    secondaryKeywords: ["Ahmed Maklad praktický lékař", "Ahmed Maklad ČLK"],
    desired: {
      seoTitle: "MUDr. Ahmed Maklad | Praktický lékař online v Česku",
      seoDescription:
        "Profil MUDr. Ahmeda Maklada, praktického lékaře registrovaného u ČLK č. 1176686198. Ověřte jazyky, kvalifikaci a aktuální dostupnost konzultací.",
      seoKeywords: ["MUDr. Ahmed Maklad", "Ahmed Maklad praktický lékař", "Ahmed Maklad ČLK"],
    },
    faqReplacements: [
      {
        id: "cmrl5zxt80009a0juv89gv0hs",
        question: "Jak si rezervovat konzultaci s MUDr. Makladem?",
        answer: "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
      },
    ],
  },
  {
    assetKind: "doctor",
    assetPath: "/czechia/cs/doctors/khoiamul-islam",
    slug: "khoiamul-islam",
    countryCode: "cz",
    locale: "CS",
    doctorId: "cmp9n5dpq0000foju1qv98wm3",
    doctorCountryId: "cmraouqf707ie01mz2vgn4icq",
    translationId: "cmrw6jr2y000201mzs7b9bphh",
    expectedTranslationUpdatedAt: "2026-07-29T18:54:30.145Z",
    expectedSourceSha256: "11d7e3c8d799dfe60f520db8e7829f404e01691f7cfe79c396b866a9be662869",
    primaryKeyword: "MUDr. Khoiamul Islam",
    secondaryKeywords: ["Khoiamul Islam praktický lékař", "Khoiamul Islam ČLK"],
    desired: {
      seoTitle: "MUDr. Khoiamul Islam | Praktický lékař online v Česku",
      seoDescription:
        "Profil MUDr. Khoiamula Islama, praktického lékaře registrovaného u ČLK č. 1178781199. Ověřte jazyky a aktuální dostupnost online konzultací.",
      seoKeywords: ["MUDr. Khoiamul Islam", "Khoiamul Islam praktický lékař", "Khoiamul Islam ČLK"],
    },
    faqReplacements: [
      {
        id: "cmrl60dlo000ya0juiyioxt4v",
        question: "Jak si rezervovat konzultaci s MUDr. Islamem?",
        answer: "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
      },
    ],
  },
  {
    assetKind: "doctor",
    assetPath: "/czechia/cs/doctors/mudr-romana-pavlu",
    slug: "mudr-romana-pavlu",
    countryCode: "cz",
    locale: "CS",
    doctorId: "cmqz4mk98007801lugo7c4y30",
    doctorCountryId: "cmqz4px1k007b01luk5w4t6q3",
    translationId: "dcmt_5a2ac631b7c0d6a230f0",
    expectedTranslationUpdatedAt: "2026-08-20T06:24:46.051Z",
    expectedSourceSha256: "b85c9f22c1a3493974447642ebae58432e6232e1d68dd37b457b2b4d10467f97",
    primaryKeyword: "MUDr. Romana Pavlů",
    secondaryKeywords: ["Romana Pavlů praktická lékařka", "Romana Pavlů ČLK"],
    desired: {
      seoTitle: "MUDr. Romana Pavlů | Praktická lékařka online v Česku",
      seoDescription:
        "Profil MUDr. Romany Pavlů, praktické lékařky registrované u ČLK č. 5163514190. Ověřte jazyky, kvalifikaci a aktuální dostupnost konzultací.",
      seoKeywords: ["MUDr. Romana Pavlů", "Romana Pavlů praktická lékařka", "Romana Pavlů ČLK"],
    },
    faqReplacements: [
      {
        id: "cmrl60a88000sa0juznacdn72",
        question: "Jak si rezervovat konzultaci s MUDr. Pavlů?",
        answer: "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
      },
    ],
  },
  {
    assetKind: "doctor",
    assetPath: "/czechia/cs/doctors/mudr-vojtech-cerny",
    slug: "mudr-vojtech-cerny",
    countryCode: "cz",
    locale: "CS",
    doctorId: "cmqz2vn0j006901lu9zla3zmp",
    doctorCountryId: "dc_53d387ff2c706ad5639cd4",
    translationId: "dcmt_4b221fa7266d5663cd39",
    expectedTranslationUpdatedAt: "2026-08-20T06:24:50.284Z",
    expectedSourceSha256: "5bb9fe0c70a8cb775844257331de78f8300d93c67307df737a4ffefc8fa137d0",
    primaryKeyword: "MUDr. Vojtěch Černý",
    secondaryKeywords: ["Vojtěch Černý praktický lékař", "Vojtěch Černý ČLK"],
    desired: {
      seoTitle: "MUDr. Vojtěch Černý | Praktický lékař online v Česku",
      seoDescription:
        "Profil MUDr. Vojtěcha Černého, praktického lékaře registrovaného u ČLK č. 1172330197. Ověřte jazyky, kvalifikaci a aktuální dostupnost konzultací.",
      seoKeywords: ["MUDr. Vojtěch Černý", "Vojtěch Černý praktický lékař", "Vojtěch Černý ČLK"],
    },
    faqReplacements: [
      {
        id: "cmrl5zud70002a0juyprdpwtr",
        question: "Je online konzultace s MUDr. Černým vhodná při náhlém nebo závažném zhoršení?",
        answer: "Ne. Online konzultace není určena pro neodkladnou péči. Při náhlém nebo závažném zhoršení, nebo pokud si nejste jistí závažností stavu, nečekejte na online termín a volejte 155 nebo 112.",
      },
      {
        id: "cmrl5zukd0003a0jua02nny7w",
        question: "Jak si rezervovat konzultaci s MUDr. Černým?",
        answer: "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
      },
    ],
  },
  {
    assetKind: "doctor",
    assetPath: "/czechia/cs/doctors/mudr-yasmin-holz",
    slug: "mudr-yasmin-holz",
    countryCode: "cz",
    locale: "CS",
    doctorId: "cmqz3xma7006p01lu137jacd4",
    doctorCountryId: "cmqz3zdkp006s01lu95zjty6m",
    translationId: "dcmt_8710c21ec1d7130e2215",
    expectedTranslationUpdatedAt: "2026-08-20T06:24:54.769Z",
    expectedSourceSha256: "0a7b30fa8fa3f6914420a1e99d9e2c5cd54f600a36a5c8d63304d1947848fed7",
    primaryKeyword: "MUDr. Yasmin Holz",
    secondaryKeywords: ["Yasmin Holz praktická lékařka", "Yasmin Holz ČLK"],
    desired: {
      seoTitle: "MUDr. Yasmin Holz | Praktická lékařka online v Česku",
      seoDescription:
        "Profil MUDr. Yasmin Holz, praktické lékařky registrované u ČLK č. 5178823192. Ověřte jazyky, kvalifikaci a aktuální dostupnost konzultací.",
      seoKeywords: ["MUDr. Yasmin Holz", "Yasmin Holz praktická lékařka", "Yasmin Holz ČLK"],
    },
    faqReplacements: [
      {
        id: "cmrl601x4000ea0jutgyf2i2q",
        question: "Jak ověřím možnost posouzení eNeschopenky při konzultaci s MUDr. Holz?",
        answer: "Možnost eNeschopenky se ověřuje u konkrétní služby a termínu. Vystavit ji může pouze oprávněný lékař, pokud je pracovní neschopnost po klinickém posouzení odůvodněná a splňuje příslušné podmínky; rezervace vystavení nezaručuje.",
      },
      {
        id: "cmrl6024a000fa0jumi26025q",
        question: "V jakých jazycích MUDr. Holz konzultuje?",
        answer: "MUDr. Holz konzultuje v jazycích uvedených v aktuálním profilu. Před rezervací zkontrolujte jazyk konkrétního termínu a při konzultaci sdělte, kterému jazyku dáváte přednost.",
      },
      {
        id: "cmrl602bg000ga0jue0woiccy",
        question: "Jak si rezervovat konzultaci s MUDr. Holz?",
        answer: "Pokud je online rezervace pro tohoto lékaře aktivní, aktuální volné termíny se zobrazí v rezervačním kalendáři. Termín je potvrzen až po dokončení objednávky; pokud kalendář žádný termín nenabízí, dostupnost není potvrzena.",
      },
    ],
  },
] as const satisfies readonly CzechiaDoctorProfileSeoDraft[];

export const CZECHIA_BLOG_SEO_DRAFTS = [
  {
    assetKind: "blog",
    assetPath: "/czechia/cs/blog/diabetes-ticha-nemoc",
    slug: "diabetes-ticha-nemoc",
    countryCode: "cz",
    locale: "CS",
    postId: "cmrrei76y03me01phamppepo8",
    expectedPostUpdatedAt: "2026-08-29T04:55:38.691Z",
    expectedSourceSha256: "8854e85423c2ce48a7cfda112aa282d25d719968618bb2fa9c38d0e5620e3299",
    primaryKeyword: "diabetes příznaky",
    secondaryKeywords: ["cukrovka příznaky", "léčba diabetu"],
    desired: {
      title: "Diabetes: příznaky, léčba a prevence",
      seoTitle: "Diabetes v Česku: příznaky, léčba a prevence",
      seoDescription:
        "Přehled příznaků, rizik, léčby a prevence diabetu v Česku. Článek napsal MUDr. Ahmed Maklad, registrovaný u ČLK č. 1176686198.",
    },
    faqReplacements: [],
  },
] as const satisfies readonly CzechiaBlogSeoDraft[];

export const CZECHIA_TOOL_SEO_DRAFTS = [
  {
    slug: "adhd-test",
    expectedSourceSha256: "dd8176c7ad3293282486d928cf5d0485ef9f03c9a0de662a4631794cf196d93c",
    primaryKeyword: "ADHD test pro dospělé zdarma",
    secondaryKeywords: ["ADHD test", "test ADHD zdarma", "screening ADHD"],
    desired: {
      metaTitle: "ADHD test pro dospělé zdarma | Screening",
      metaDescription:
        "Vyplňte šest otázek screeningového testu ADHD pro dospělé. Výsledek není diagnóza; tu stanoví psychiatr nebo klinický psycholog.",
      h1Lead: "ADHD",
      h1Accent: "test pro dospělé",
      h1Trail: "",
    },
  },
  {
    slug: "blood-pressure-chart",
    expectedSourceSha256: "dabcd6bbb630e6c0c20242b4f2b173852630c93c46afc48f5c5d5868c84720be",
    primaryKeyword: "krevní tlak kalkulačka",
    secondaryKeywords: ["tabulka krevního tlaku", "hodnoty krevního tlaku", "normální krevní tlak"],
    desired: {
      metaTitle: "Krevní tlak: kalkulačka a tabulka hodnot",
      metaDescription:
        "Zkontrolujte orientační kategorii krevního tlaku, správný postup měření a situace, kdy je vhodná konzultace nebo akutní pomoc.",
      h1Lead: "Kalkulačka a tabulka",
      h1Accent: "krevního tlaku",
      h1Trail: "",
    },
  },
  {
    slug: "bmi-calculator",
    expectedSourceSha256: "4941e46ceb4ef6477f05a0f19fda8e8f68b5ea9e157002ef2498a4505b08b125",
    primaryKeyword: "BMI kalkulačka",
    secondaryKeywords: ["výpočet BMI", "BMI ženy", "BMI muži"],
    desired: {
      metaTitle: "BMI kalkulačka | Výpočet BMI online",
      metaDescription:
        "Spočítejte si BMI z výšky a hmotnosti. Výsledek používá orientační kategorie pro dospělé a nenahrazuje individuální zdravotní posouzení.",
      h1Lead: "BMI",
      h1Accent: "kalkulačka",
      h1Trail: "",
    },
  },
  {
    slug: "calorie-calculator",
    expectedSourceSha256: "807be2e77a79480950751a18cdcb8aeccbfd31d33f1125f0ce285b6dc5046438",
    primaryKeyword: "kalkulačka kalorií",
    secondaryKeywords: ["výpočet kalorií", "kalorický příjem", "denní příjem kalorií"],
    desired: {
      metaTitle: "Kalkulačka kalorií | Denní kalorický příjem",
      metaDescription:
        "Odhadněte denní kalorický příjem pro udržení, hubnutí nebo nabírání podle rovnice Mifflin-St Jeor. Výsledek je orientační.",
      h1Lead: "Kalkulačka",
      h1Accent: "kalorií",
      h1Trail: "",
    },
  },
  {
    slug: "due-date-calculator",
    expectedSourceSha256: "58d54f095ffe12630a45e2408cab9c4858ec7aa7a2ac11e8f4a0ebe8216a18b5",
    primaryKeyword: "těhotenská kalkulačka",
    secondaryKeywords: ["kalkulačka těhotenství", "výpočet týdne těhotenství", "termín porodu"],
    desired: {
      metaTitle: "Těhotenská kalkulačka | Termín porodu a týdny",
      metaDescription:
        "Odhadněte termín porodu a týden těhotenství podle prvního dne poslední menstruace a délky cyklu. Výsledek je orientační.",
      h1Lead: "Těhotenská",
      h1Accent: "kalkulačka",
      h1Trail: "",
    },
  },
  {
    slug: "osteoporosis-risk-checker",
    expectedSourceSha256: "58daa06ae5f69928d1a40bfa71643ff6ec6e34c33aa7a17c417b9b1dc5d1b3d5",
    primaryKeyword: "riziko osteoporózy",
    secondaryKeywords: ["test na osteoporózu", "potřebuji denzitometrii"],
    desired: {
      metaTitle: "Riziko osteoporózy | Orientační kontrola",
      metaDescription:
        "Projděte orientační rizikové faktory osteoporózy a zjistěte, kdy může být vhodné odborné posouzení. Nejde o FRAX ani diagnózu.",
      h1Lead: "Riziko",
      h1Accent: "osteoporózy",
      h1Trail: "",
    },
  },
  {
    slug: "ovulation-calculator",
    expectedSourceSha256: "70f9fe3eed2cf1e043f3ad9803ffecbf5b4385c06fc4824b19249f34cb353ca1",
    primaryKeyword: "ovulační kalkulačka",
    secondaryKeywords: ["ovulační kalendář", "výpočet ovulace", "plodné dny"],
    desired: {
      metaTitle: "Ovulační kalkulačka | Plodné dny a ovulace",
      metaDescription:
        "Odhadněte den ovulace a plodné dny podle prvního dne poslední menstruace a délky cyklu. Výsledek je orientační.",
      h1Lead: "Ovulační",
      h1Accent: "kalkulačka",
      h1Trail: "",
    },
  },
].map((draft) => ({
  ...draft,
  assetKind: "tool" as const,
  assetPath: `/czechia/cs/tools/${draft.slug}`,
  countryCode: "cz" as const,
  locale: "CS" as const,
  sourceFile: "frontend/locales/cs/tools.json" as const,
  faqReplacements: [] as const,
})) satisfies readonly CzechiaToolSeoDraft[];

export function czechiaClinicalDraftApprovalSha256(
  draft: CzechiaProfileBlogToolDraft,
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      assetKind: draft.assetKind,
      assetPath: draft.assetPath,
      locale: draft.locale,
      desired: draft.desired,
      faqReplacements: draft.faqReplacements,
    }))
    .digest("hex");
}

export function czechiaClinicalDraftConfirmationToken(
  draft: CzechiaProfileBlogToolDraft,
): string {
  return `CZ-SEO-${draft.assetKind.toUpperCase()}:${draft.slug}:${czechiaClinicalDraftApprovalSha256(draft).slice(0, 16)}`;
}

type PromotionGate = Readonly<{
  apply: boolean;
  draft: CzechiaProfileBlogToolDraft;
  registerStatus: string | null;
  reviewedAt: Date | null;
  reviewerId: string | null;
  approvedHash: string | null;
  confirmation: string | null;
}>;

export function assertCzechiaClinicalPromotionGate(input: PromotionGate): void {
  if (!input.apply) return;
  if (input.registerStatus?.trim().toLowerCase() !== "approved") {
    throw new Error("Refusing to apply until the exact clinical-register row is approved");
  }
  if (!input.reviewedAt || Number.isNaN(input.reviewedAt.getTime())) {
    throw new Error("Refusing to apply without a valid clinical review date");
  }
  if (input.reviewedAt > new Date()) {
    throw new Error("Refusing to apply with a future clinical review date");
  }
  if (!input.reviewerId?.trim()) {
    throw new Error("Refusing to apply without a named clinical reviewer ID");
  }
  if (input.approvedHash !== czechiaClinicalDraftApprovalSha256(input.draft)) {
    throw new Error("Refusing to apply without approval for the exact reviewed copy");
  }
  if (input.confirmation !== czechiaClinicalDraftConfirmationToken(input.draft)) {
    throw new Error("Refusing to apply without the exact confirmation token");
  }
}

export function assertCzechiaDoctorMetadataReadback(
  draft: CzechiaDoctorProfileSeoDraft,
  saved: Readonly<{
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: readonly string[];
  }> | undefined,
): void {
  if (
    saved?.seoTitle !== draft.desired.seoTitle ||
    saved.seoDescription !== draft.desired.seoDescription ||
    JSON.stringify(saved.seoKeywords) !== JSON.stringify(draft.desired.seoKeywords)
  ) {
    throw new Error(`${draft.assetPath} metadata readback did not match the approved draft`);
  }
}

export function assertCzechiaDoctorFaqReadback(
  draft: CzechiaDoctorProfileSeoDraft,
  saved: readonly Readonly<{ id: string; question: string; answer: string }>[],
): void {
  const byId = new Map(saved.map((faq) => [faq.id, faq]));
  for (const expected of draft.faqReplacements) {
    const actual = byId.get(expected.id);
    if (actual?.question !== expected.question || actual.answer !== expected.answer) {
      throw new Error(`${draft.assetPath} FAQ readback did not match the approved draft`);
    }
  }
}

export function assertCzechiaBlogMetadataReadback(
  draft: CzechiaBlogSeoDraft,
  saved: Readonly<{
    title: string;
    seoTitle: string | null;
    seoDescription: string | null;
  }>,
): void {
  if (
    saved.title !== draft.desired.title ||
    saved.seoTitle !== draft.desired.seoTitle ||
    saved.seoDescription !== draft.desired.seoDescription
  ) {
    throw new Error(`${draft.assetPath} metadata readback did not match the approved draft`);
  }
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (quoted) throw new Error("Clinical review register contains an unterminated quote");
  return rows;
}

export function findCzechiaClinicalRegisterRow(csv: string, assetPath: string) {
  const [header, ...rows] = parseCsv(csv);
  if (!header) throw new Error("Clinical review register is empty");
  const assetIndex = header.indexOf("asset");
  const requirementIndex = header.indexOf("reviewer_requirement");
  const statusIndex = header.indexOf("status");
  if ([assetIndex, requirementIndex, statusIndex].some((index) => index < 0)) {
    throw new Error("Clinical review register is missing required columns");
  }
  const match = rows.find((row) => row[assetIndex] === assetPath);
  if (!match) throw new Error(`No clinical review register row for ${assetPath}`);
  return {
    asset: match[assetIndex],
    reviewerRequirement: match[requirementIndex],
    status: match[statusIndex],
  };
}

export function validateCzechiaProfileBlogToolDrafts(): string[] {
  const drafts: readonly CzechiaProfileBlogToolDraft[] = [
    ...CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS,
    ...CZECHIA_BLOG_SEO_DRAFTS,
    ...CZECHIA_TOOL_SEO_DRAFTS,
  ];
  const errors: string[] = [];
  for (const draft of drafts) {
    const title = draft.assetKind === "tool" ? draft.desired.metaTitle : draft.desired.seoTitle;
    const description =
      draft.assetKind === "tool" ? draft.desired.metaDescription : draft.desired.seoDescription;
    if (title.length > 60) errors.push(`${draft.assetPath}: title exceeds 60 characters`);
    if (description.length < 110 || description.length > 160) {
      errors.push(`${draft.assetPath}: description must be 110-160 characters`);
    }
    if (/[—–]/.test(JSON.stringify(draft.desired))) {
      errors.push(`${draft.assetPath}: deslop failed`);
    }
    if (draft.assetKind !== "doctor" && draft.faqReplacements.length !== 0) {
      errors.push(`${draft.assetPath}: unsupported FAQ replacement`);
    }
    if (draft.assetKind === "doctor") {
      if (draft.faqReplacements.length === 0) {
        errors.push(`${draft.assetPath}: missing source-pinned FAQ replacement`);
      }
      const ids = draft.faqReplacements.map(({ id }) => id);
      if (new Set(ids).size !== ids.length) {
        errors.push(`${draft.assetPath}: duplicate FAQ replacement id`);
      }
      if (/ve stejný den|ještě dnes|jistý výsledek/i.test(JSON.stringify(draft.faqReplacements))) {
        errors.push(`${draft.assetPath}: unsafe FAQ promise remains`);
      }
    }
  }
  return errors;
}
