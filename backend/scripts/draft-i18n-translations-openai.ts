import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/db/prisma.js";

const LOCALES = ["EN", "PT", "ES", "CS", "RO", "DE"] as const;
type Locale = (typeof LOCALES)[number];

const ENTITIES = ["services", "service-faqs", "doctors", "doctor-markets", "health-tests", "health-test-faqs", "blog"] as const;
type EntityFlag = (typeof ENTITIES)[number];

const TRANS_ENTITY_NAME: Record<EntityFlag, string> = {
  services: "ServiceTranslation",
  "service-faqs": "ServiceFaqTranslation",
  doctors: "DoctorTranslation",
  "doctor-markets": "DoctorMarketTranslation",
  "health-tests": "HealthTestTranslation",
  "health-test-faqs": "HealthTestFaqTranslation",
  blog: "BlogTranslation",
};

// Job field names for "blog" are BlogPost column names, NOT BlogTranslation
// column names (body/seoDescription/coverAlt vs content/seoDesc/coverImageAlt
// on BlogTranslation) — apply-blog-translations.ts maps between the two.
const ENTITY_FIELDS: Record<EntityFlag, readonly string[]> = {
  services: ["name", "summary", "seoTitle", "seoDescription", "heroTitle", "heroDescription", "detailBody", "ctaLabel"],
  "service-faqs": ["question", "answer"],
  doctors: ["title", "bio", "seoTitle", "seoDescription"],
  "doctor-markets": ["title", "bio", "seoTitle", "seoDescription"],
  "health-tests": ["title", "shortDescription", "sampleType", "resultsTimeline", "heroButtonLabel", "detailIntro", "whatThisTestCovers", "whyGetTested", "seoTitle", "seoDescription"],
  "health-test-faqs": ["question", "answer"],
  blog: ["title", "excerpt", "body", "seoTitle", "seoDescription", "coverAlt"],
};

// BlogPost.body is a full article (tens of thousands of chars); the other
// short-field jobs are fine on the default cap.
const BLOG_BODY_MAX_OUTPUT_TOKENS = Math.max(16_000, Number(process.env.BLOG_BODY_MAX_OUTPUT_TOKENS?.trim() || "48000"));

type Job = {
  key: string;
  entity: EntityFlag;
  parentId: string;
  slug: string;
  countryCode: string;
  field: string;
  sourceLocale: Locale;
  targetLocale: Locale;
  sourceText: string;
};

type Usage = { inputTokens: number; outputTokens: number; costUsd: number };

type Draft = Job & {
  createdAt: string;
  model: string;
  draftText: string;
  requiresHumanReview: true;
  validationIssues: string[];
  usage: Usage;
};

const args = new Set(process.argv.slice(2));
const argValue = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const entityFlag = argValue("entity") as EntityFlag | undefined;
if (!entityFlag || !ENTITIES.includes(entityFlag)) {
  console.error(`--entity=<${ENTITIES.join("|")}> is required`);
  process.exit(1);
}
const entity: EntityFlag = entityFlag;
const limit = Math.max(1, Math.min(10_000, Number(argValue("limit") ?? "1")));
const fieldFilter = new Set((argValue("fields") ?? "").split(",").map((field) => field.trim()).filter(Boolean));
const model = process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5.4-mini";
const budgetUsd = Number(process.env.I18N_BUDGET_USD?.trim() || "1.00");
// ponytail: prices are env-tunable estimates; deliberately conservative-high so the guard trips early, never late
const priceInPerM = Number(process.env.OPENAI_PRICE_IN_PER_M?.trim() || "0.60");
const priceOutPerM = Number(process.env.OPENAI_PRICE_OUT_PER_M?.trim() || "2.40");
const outputDir = path.resolve(process.env.I18N_DRAFT_OUTPUT_DIR?.trim() || path.join(process.cwd(), "tmp", "i18n-drafts"));
const outputFile = path.join(outputDir, `${entity}.jsonl`);
// Legacy Ireland-only drafts predate the entity-prefixed key format; their keys
// are `${parentId}:${targetLocale}:${field}` with no entity prefix. Honor them
// as already-completed so re-running this script doesn't re-draft Ireland work.
const LEGACY_FILES: Partial<Record<EntityFlag, string>> = {
  services: "ireland-services.jsonl",
  "service-faqs": "ireland-service-faqs.jsonl",
};

let spentUsd = 0;

function isMeaningful(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim().length > 0;
}

function tagSignature(value: string): string[] {
  return [...value.matchAll(/<\/?([a-z0-9]+)/gi)].map((match) => match[1]!.toLowerCase()).sort();
}

function multiset(values: string[]): string {
  return values.map((value) => value.toLowerCase()).sort().join("|");
}

function validate(source: string, draft: string): string[] {
  const issues: string[] = [];
  const patterns: Array<[string, RegExp]> = [
    ["url", /https?:\/\/[^\s"'<>)]+/g],
    ["email", /[\w.+-]+@[\w-]+\.[\w.-]+/g],
    ["placeholder", /\{\{[^}]*\}\}|\{[a-zA-Z_][^}]*\}|%[sd]/g],
    ["number", /\d+(?:[.,]\d+)*/g],
  ];
  for (const [label, pattern] of patterns) {
    if (multiset(source.match(pattern) ?? []) !== multiset(draft.match(pattern) ?? [])) issues.push(`${label} mismatch`);
  }
  if (draft.trim().length < Math.min(2, source.trim().length)) issues.push("suspiciously short output");
  return issues;
}

async function callOpenAi(body: object): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2_000 * 2 ** (attempt - 1)));
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`OpenAI transient error (${response.status}): ${await response.text()}`);
        continue;
      }
      if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("OpenAI request failed")) throw error;
      lastError = error; // network/transient
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function outputText(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const body = response as { output_text?: unknown; output?: unknown };
  if (typeof body.output_text === "string") return body.output_text.trim() || null;
  if (!Array.isArray(body.output)) return null;
  return body.output
    .flatMap((item) => (item && typeof item === "object" && Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: Array<{ text?: unknown }> }).content
      : []))
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim() || null;
}

function usageOf(body: Record<string, unknown>): Usage {
  const usage = (body.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const costUsd = (inputTokens * priceInPerM + outputTokens * priceOutPerM) / 1_000_000;
  return { inputTokens, outputTokens, costUsd };
}

async function translate(job: Job): Promise<Draft> {
  const prompt = [
    `Translate this ${job.field} from ${job.sourceLocale} to ${job.targetLocale}.`,
    "Return only the translated field value. Do not add commentary, labels, markdown fences, claims, guarantees, qualifications, prices, URLs, or content not present in the source.",
    "Preserve every HTML tag, entity, placeholder, URL, number, and proper name. Keep the medical and legal meaning exactly equivalent; use cautious wording when the source is cautious.",
    "If the source contains multiple lines, return the same number of lines in the same order.",
    "The output is a draft and requires human review.",
    "SOURCE:",
    job.sourceText,
  ].join("\n\n");

  const body = await callOpenAi({
    model,
    reasoning: { effort: "low" },
    max_output_tokens: job.entity === "blog" && job.field === "body" ? BLOG_BODY_MAX_OUTPUT_TOKENS : 16_000,
    input: prompt,
  });
  if (body.incomplete_details) throw new Error(`OpenAI response incomplete: ${JSON.stringify(body.incomplete_details)}`);
  const translated = outputText(body);
  if (!translated) throw new Error("OpenAI response contained no translation text");
  if (tagSignature(job.sourceText).join("|") !== tagSignature(translated).join("|")) {
    throw new Error(`HTML tag mismatch for ${job.key}`);
  }
  const usage = usageOf(body);
  spentUsd += usage.costUsd;
  return {
    ...job,
    createdAt: new Date().toISOString(),
    model,
    draftText: translated,
    requiresHumanReview: true,
    validationIssues: validate(job.sourceText, translated),
    usage,
  };
}

function countryTargets(country: { defaultLocale: string; countryLocales: Array<{ locale: string }> }): Locale[] {
  const enabled = country.countryLocales.map((row) => row.locale).filter((locale): locale is Locale => LOCALES.includes(locale as Locale));
  return enabled.filter((locale) => locale !== country.defaultLocale);
}

function rowsByLocale<T extends { locale: string }>(rows: T[]): Map<Locale, T> {
  return new Map(rows.map((row) => [row.locale as Locale, row]));
}

// A "leaf" is one translatable parent record (a Service, a ServiceFaq, a
// Doctor, ...) flattened to the shape buildJobs needs, regardless of how
// deeply it was nested in the Prisma query it came from.
type Leaf = {
  id: string;
  slug: string;
  countryCode: string;
  sourceLocale: Locale;
  targetLocales: Locale[];
  base: Record<string, string | null>;
  translations: Map<Locale, Record<string, string | null>>;
};

function wantedField(field: string): boolean {
  return fieldFilter.size === 0 || fieldFilter.has(field);
}

function buildJobs(leaves: Leaf[], fields: readonly string[], completed: Set<string>, legacyCompleted: Set<string>): Job[] {
  const jobs: Job[] = [];
  for (const leaf of leaves) {
    for (const targetLocale of leaf.targetLocales) {
      const current = leaf.translations.get(targetLocale);
      for (const field of fields) {
        if (!wantedField(field)) continue;
        if (!isMeaningful(leaf.base[field]) || isMeaningful(current?.[field] ?? null)) continue;
        const key = `${entity}:${leaf.id}:${targetLocale}:${field}`;
        const legacyKey = `${leaf.id}:${targetLocale}:${field}`;
        if (completed.has(key) || legacyCompleted.has(legacyKey)) continue;
        jobs.push({ key, entity, parentId: leaf.id, slug: leaf.slug, countryCode: leaf.countryCode, field, sourceLocale: leaf.sourceLocale, targetLocale, sourceText: leaf.base[field]! });
      }
    }
  }
  return jobs;
}

// Joins array fields (HealthTest.whatThisTestCovers / whyGetTested) into a
// single newline-delimited string so they flow through the same string-based
// translate/validate pipeline as every other field. Human review re-splits
// on newline when applying the draft.
function textOf(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value.length ? value.join("\n") : null;
  return value ?? null;
}

async function collectServiceJobs(completed: Set<string>, legacyCompleted: Set<string>): Promise<Job[]> {
  const services = await prisma.service.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { slug: "asc" },
    select: {
      id: true, slug: true, name: true, summary: true, seoTitle: true, seoDescription: true,
      heroTitle: true, heroDescription: true, detailBody: true, ctaLabel: true,
      country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } },
      translations: { select: { locale: true, name: true, summary: true, seoTitle: true, seoDescription: true, heroTitle: true, heroDescription: true, detailBody: true, ctaLabel: true } },
    },
  });
  const leaves: Leaf[] = services.map((service) => ({
    id: service.id,
    slug: service.slug,
    countryCode: service.country.code,
    sourceLocale: service.country.defaultLocale as Locale,
    targetLocales: countryTargets(service.country),
    base: service as unknown as Record<string, string | null>,
    translations: rowsByLocale(service.translations) as unknown as Map<Locale, Record<string, string | null>>,
  }));
  return buildJobs(leaves, ENTITY_FIELDS.services, completed, legacyCompleted);
}

async function collectServiceFaqJobs(completed: Set<string>, legacyCompleted: Set<string>): Promise<Job[]> {
  const services = await prisma.service.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { slug: "asc" },
    select: {
      slug: true,
      country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } },
      faqs: { select: { id: true, question: true, answer: true, translations: { select: { locale: true, question: true, answer: true } } } },
    },
  });
  const leaves: Leaf[] = services.flatMap((service) =>
    service.faqs.map((faq) => ({
      id: faq.id,
      slug: service.slug,
      countryCode: service.country.code,
      sourceLocale: service.country.defaultLocale as Locale,
      targetLocales: countryTargets(service.country),
      base: faq as unknown as Record<string, string | null>,
      translations: rowsByLocale(faq.translations) as unknown as Map<Locale, Record<string, string | null>>,
    })),
  );
  return buildJobs(leaves, ENTITY_FIELDS["service-faqs"], completed, legacyCompleted);
}

async function collectDoctorJobs(completed: Set<string>): Promise<Job[]> {
  const doctors = await prisma.doctor.findMany({
    orderBy: { slug: "asc" },
    select: {
      id: true, slug: true, title: true, bio: true, seoTitle: true, seoDescription: true,
      country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } },
      translations: { select: { locale: true, title: true, bio: true, seoTitle: true, seoDescription: true } },
    },
  });
  const leaves: Leaf[] = doctors.map((doctor) => ({
    id: doctor.id,
    slug: doctor.slug,
    countryCode: doctor.country.code,
    sourceLocale: doctor.country.defaultLocale as Locale,
    targetLocales: countryTargets(doctor.country),
    base: doctor as unknown as Record<string, string | null>,
    translations: rowsByLocale(doctor.translations) as unknown as Map<Locale, Record<string, string | null>>,
  }));
  return buildJobs(leaves, ENTITY_FIELDS.doctors, completed, new Set());
}

// DoctorMarketTranslation has no base row of its own — the market's
// default-locale translation row (if authored) is the source-of-truth per
// field, falling back to the parent Doctor's base column when that field
// wasn't authored for the market yet.
async function collectDoctorMarketJobs(completed: Set<string>): Promise<Job[]> {
  const doctorCountries = await prisma.doctorCountry.findMany({
    where: { active: true, doctor: { active: true } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      doctor: { select: { slug: true, title: true, bio: true, seoTitle: true, seoDescription: true } },
      country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } },
      translations: { select: { locale: true, title: true, bio: true, seoTitle: true, seoDescription: true } },
    },
  });
  const leaves: Leaf[] = doctorCountries.map((market) => {
    const defaultLocale = market.country.defaultLocale as Locale;
    const defaultRow = market.translations.find((row) => row.locale === defaultLocale) as Record<string, string | null> | undefined;
    const doctorBase = market.doctor as unknown as Record<string, string | null>;
    const base: Record<string, string | null> = {};
    for (const field of ENTITY_FIELDS["doctor-markets"]) {
      const marketValue = defaultRow?.[field];
      base[field] = isMeaningful(marketValue) ? marketValue! : doctorBase[field];
    }
    return {
      id: market.id,
      slug: `${market.country.code}/${market.doctor.slug}`,
      countryCode: market.country.code,
      sourceLocale: defaultLocale,
      targetLocales: countryTargets(market.country),
      base,
      translations: rowsByLocale(market.translations) as unknown as Map<Locale, Record<string, string | null>>,
    };
  });
  return buildJobs(leaves, ENTITY_FIELDS["doctor-markets"], completed, new Set());
}

async function collectHealthTestJobs(completed: Set<string>): Promise<Job[]> {
  const tests = await prisma.healthTest.findMany({
    orderBy: { slug: "asc" },
    select: {
      id: true, slug: true, title: true, shortDescription: true, sampleType: true, resultsTimeline: true,
      heroButtonLabel: true, detailIntro: true, whatThisTestCovers: true, whyGetTested: true, seoTitle: true, seoDescription: true,
      country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } },
      translations: { select: { locale: true, title: true, shortDescription: true, sampleType: true, resultsTimeline: true, heroButtonLabel: true, detailIntro: true, whatThisTestCovers: true, whyGetTested: true, seoTitle: true, seoDescription: true } },
    },
  });
  const leaves: Leaf[] = tests.map((test) => {
    const base: Record<string, string | null> = {
      title: test.title, shortDescription: test.shortDescription, sampleType: test.sampleType,
      resultsTimeline: test.resultsTimeline, heroButtonLabel: test.heroButtonLabel, detailIntro: test.detailIntro,
      whatThisTestCovers: textOf(test.whatThisTestCovers), whyGetTested: textOf(test.whyGetTested),
      seoTitle: test.seoTitle, seoDescription: test.seoDescription,
    };
    const translations = new Map<Locale, Record<string, string | null>>(
      test.translations.map((row) => [row.locale as Locale, {
        title: row.title, shortDescription: row.shortDescription, sampleType: row.sampleType,
        resultsTimeline: row.resultsTimeline, heroButtonLabel: row.heroButtonLabel, detailIntro: row.detailIntro,
        whatThisTestCovers: textOf(row.whatThisTestCovers), whyGetTested: textOf(row.whyGetTested),
        seoTitle: row.seoTitle, seoDescription: row.seoDescription,
      }]),
    );
    return {
      id: test.id, slug: test.slug, countryCode: test.country.code,
      sourceLocale: test.country.defaultLocale as Locale, targetLocales: countryTargets(test.country),
      base, translations,
    };
  });
  return buildJobs(leaves, ENTITY_FIELDS["health-tests"], completed, new Set());
}

async function collectHealthTestFaqJobs(completed: Set<string>): Promise<Job[]> {
  const tests = await prisma.healthTest.findMany({
    orderBy: { slug: "asc" },
    select: {
      slug: true,
      country: { select: { code: true, defaultLocale: true, countryLocales: { select: { locale: true } } } },
      faqs: { select: { id: true, question: true, answer: true, translations: { select: { locale: true, question: true, answer: true } } } },
    },
  });
  const leaves: Leaf[] = tests.flatMap((test) =>
    test.faqs.map((faq) => ({
      id: faq.id,
      slug: test.slug,
      countryCode: test.country.code,
      sourceLocale: test.country.defaultLocale as Locale,
      targetLocales: countryTargets(test.country),
      base: faq as unknown as Record<string, string | null>,
      translations: rowsByLocale(faq.translations) as unknown as Map<Locale, Record<string, string | null>>,
    })),
  );
  return buildJobs(leaves, ENTITY_FIELDS["health-test-faqs"], completed, new Set());
}

// Blog isn't country-scoped like services/doctors/health-tests (a post can be
// attached to zero, one, or several countries via BlogPostCountry) — target
// locales are simply every other supported locale, and buildJobs' own
// isMeaningful/completed checks skip anything already translated.
async function collectBlogJobs(completed: Set<string>): Promise<Job[]> {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", isActive: true },
    orderBy: { slug: "asc" },
    select: {
      id: true, slug: true, locale: true, title: true, excerpt: true, body: true,
      seoTitle: true, seoDescription: true,
      coverAsset: { select: { altText: true } },
      translations: { select: { locale: true, title: true, excerpt: true, content: true, seoTitle: true, seoDesc: true, coverImageAlt: true } },
    },
  });
  const leaves: Leaf[] = posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    countryCode: post.locale,
    sourceLocale: post.locale as Locale,
    targetLocales: LOCALES.filter((locale) => locale !== post.locale),
    base: {
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      coverAlt: post.coverAsset?.altText ?? null,
    },
    translations: new Map(
      post.translations.map((row) => [row.locale as Locale, {
        title: row.title, excerpt: row.excerpt, body: row.content,
        seoTitle: row.seoTitle, seoDescription: row.seoDesc, coverAlt: row.coverImageAlt,
      }]),
    ),
  }));
  return buildJobs(leaves, ENTITY_FIELDS.blog, completed, new Set());
}

async function collectJobs(completed: Set<string>, legacyCompleted: Set<string>): Promise<Job[]> {
  switch (entity) {
    case "services": return collectServiceJobs(completed, legacyCompleted);
    case "service-faqs": return collectServiceFaqJobs(completed, legacyCompleted);
    case "doctors": return collectDoctorJobs(completed);
    case "doctor-markets": return collectDoctorMarketJobs(completed);
    case "health-tests": return collectHealthTestJobs(completed);
    case "health-test-faqs": return collectHealthTestFaqJobs(completed);
    case "blog": return collectBlogJobs(completed);
  }
}

function loadKeys(file: string): Set<string> {
  const keys = new Set<string>();
  if (!existsSync(file)) return keys;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as Partial<Draft>;
    if (typeof row.key === "string") keys.add(row.key);
  }
  return keys;
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const completed = loadKeys(outputFile);
  const legacyFile = LEGACY_FILES[entity];
  const legacyCompleted = legacyFile ? loadKeys(path.join(outputDir, legacyFile)) : new Set<string>();

  const jobs = await collectJobs(completed, legacyCompleted);
  const selected = jobs.slice(0, limit);
  console.log(`Entity: ${entity}; model: ${model}; budget: $${budgetUsd.toFixed(2)}`);
  if (fieldFilter.size > 0) console.log(`Field filter: ${[...fieldFilter].join(", ")}`);
  console.log(`Pending draft jobs: ${jobs.length}; processing: ${selected.length}`);

  if (args.has("--dry-run")) {
    const byCountry = new Map<string, number>();
    const byField = new Map<string, number>();
    let totalChars = 0;
    for (const job of jobs) {
      byCountry.set(job.countryCode, (byCountry.get(job.countryCode) ?? 0) + 1);
      byField.set(job.field, (byField.get(job.field) ?? 0) + 1);
      totalChars += job.sourceText.length;
    }
    console.log("Pending by country:");
    for (const [code, count] of [...byCountry.entries()].sort()) console.log(`  ${code}: ${count}`);
    console.log("Pending by field:");
    for (const [field, count] of [...byField.entries()].sort()) console.log(`  ${field}: ${count}`);
    console.log(`Estimated total source characters: ${totalChars}`);
    return;
  }

  for (const job of selected) {
    if (spentUsd >= budgetUsd) {
      console.log(`Budget ceiling $${budgetUsd.toFixed(2)} reached (spent ~$${spentUsd.toFixed(4)}); stopping safely. Re-run to resume.`);
      break;
    }
    const draft = await translate(job);
    appendFileSync(outputFile, `${JSON.stringify(draft)}\n`, "utf8");
    const flag = draft.validationIssues.length ? ` [REVIEW: ${draft.validationIssues.join("; ")}]` : "";
    console.log(`Drafted ${job.countryCode}/${job.slug} ${job.targetLocale} ${job.field} (${draft.usage.inputTokens}in/${draft.usage.outputTokens}out, ~$${draft.usage.costUsd.toFixed(5)}, total ~$${spentUsd.toFixed(4)})${flag}`);
  }
  console.log(`Session usage: ~$${spentUsd.toFixed(4)} of $${budgetUsd.toFixed(2)} budget`);
  console.log(`Draft file -> ${outputFile}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
