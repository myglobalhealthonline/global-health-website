/**
 * Draft the missing SEO landing-page translations with OpenAI.
 *
 * The 15 landing pages exist in their country's default locale only, so
 * `resolveTranslation` falls back to it for every other locale — which is why
 * /ireland/de/health/hypertension serves English body copy under `lang="de"`.
 * Google will not index a page whose declared language contradicts its
 * content, and that, not the linking, is what keeps ~90 URLs out of the index.
 *
 * Writes DRAFTS ONLY, one JSONL row per field, every row flagged
 * `requiresHumanReview: true`. Nothing is written to the database — this is
 * medical copy, and the repo convention (see
 * draft-ireland-service-translations-openai.ts) is draft -> review -> apply.
 *
 * Resumable: existing rows in the output file are skipped, so a budget stop or
 * a crash costs nothing already paid for.
 *
 *   node --import tsx --env-file=.env scripts/draft-landing-translations-openai.ts --limit=400
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const FIELDS = ["title", "seoTitle", "seoDescription", "bodyHtml"] as const;
type Field = (typeof FIELDS)[number];

type Job = {
  key: string;
  entity: "SeoLandingPageTranslation";
  landingPageId: string;
  countryCode: string;
  slug: string;
  field: Field;
  sourceLocale: string;
  targetLocale: string;
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

const argValue = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const limit = Math.max(1, Math.min(10_000, Number(argValue("limit") ?? "400")));
const model = process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5.4-mini";
const budgetUsd = Number(process.env.I18N_BUDGET_USD?.trim() || "3.00");
const priceInPerM = Number(process.env.OPENAI_PRICE_IN_PER_M?.trim() || "0.60");
const priceOutPerM = Number(process.env.OPENAI_PRICE_OUT_PER_M?.trim() || "2.40");
const outputDir = path.resolve(
  process.env.I18N_DRAFT_OUTPUT_DIR?.trim() || path.join(process.cwd(), "tmp", "i18n-drafts"),
);
const outputFile = path.join(outputDir, "seo-landing-pages.jsonl");

let spentUsd = 0;

function isMeaningful(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim().length > 0;
}

const tagSignature = (v: string) =>
  [...v.matchAll(/<\/?([a-z0-9]+)/gi)].map((m) => m[1]!.toLowerCase()).sort();
const multiset = (v: string[]) => v.map((x) => x.toLowerCase()).sort().join("|");

/** Anything that must survive translation byte-for-byte. */
function validate(source: string, draft: string): string[] {
  const issues: string[] = [];
  const patterns: Array<[string, RegExp]> = [
    ["url", /https?:\/\/[^\s"'<>)]+/g],
    ["href", /href="[^"]*"/g],
    ["number", /\d+(?:[.,]\d+)*/g],
    ["placeholder", /\{\{[^}]*\}\}|\{[a-zA-Z_][^}]*\}|%[sd]/g],
  ];
  for (const [label, pattern] of patterns) {
    if (multiset(source.match(pattern) ?? []) !== multiset(draft.match(pattern) ?? [])) {
      issues.push(`${label} mismatch`);
    }
  }
  if (draft.trim().length < Math.min(2, source.trim().length)) issues.push("suspiciously short output");
  return issues;
}

async function callOpenAi(body: object): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2_000 * 2 ** (attempt - 1)));
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`OpenAI transient error (${response.status})`);
        continue;
      }
      if (!response.ok) {
        throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
      }
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("OpenAI request failed")) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function outputText(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const body = response as { output_text?: unknown; output?: unknown };
  if (typeof body.output_text === "string") return body.output_text.trim() || null;
  if (!Array.isArray(body.output)) return null;
  return (
    body.output
      .flatMap((item) =>
        item && typeof item === "object" && Array.isArray((item as { content?: unknown }).content)
          ? (item as { content: Array<{ text?: unknown }> }).content
          : [],
      )
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim() || null
  );
}

function usageOf(body: Record<string, unknown>): Usage {
  const usage = (body.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    costUsd: (inputTokens * priceInPerM + outputTokens * priceOutPerM) / 1_000_000,
  };
}

async function translate(job: Job): Promise<Draft> {
  const prompt = [
    `Translate this ${job.field} of a patient-facing medical web page from ${job.sourceLocale} to ${job.targetLocale}.`,
    "Return only the translated field value. Do not add commentary, labels, markdown fences, claims, guarantees, qualifications, prices, URLs, or any content not present in the source.",
    "Preserve every HTML tag, attribute, entity, placeholder, URL, href, number and proper name exactly. Keep clinical and legal meaning strictly equivalent — where the source hedges, hedge; never make a symptom, outcome or eligibility statement more certain than the original.",
    "Use the register a national health service would use for patients in the target locale.",
    "The output is a draft and requires human review.",
    "SOURCE:",
    job.sourceText,
  ].join("\n\n");

  const body = await callOpenAi({
    model,
    reasoning: { effort: "low" },
    max_output_tokens: 16_000,
    input: prompt,
  });
  if (body.incomplete_details) {
    throw new Error(`OpenAI response incomplete: ${JSON.stringify(body.incomplete_details)}`);
  }
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

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  mkdirSync(outputDir, { recursive: true });
  const completed = new Set<string>();
  if (existsSync(outputFile)) {
    for (const line of readFileSync(outputFile, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        completed.add((JSON.parse(line) as { key: string }).key);
      } catch {
        // a torn final line from an interrupted run — just redo that field
      }
    }
  }

  const pages = await prisma.seoLandingPage.findMany({
    where: { isPublished: true, country: { isActive: true } },
    orderBy: [{ countryId: "asc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      country: {
        select: {
          code: true,
          defaultLocale: true,
          countryLocales: { select: { locale: true } },
        },
      },
      translations: {
        select: { locale: true, title: true, seoTitle: true, seoDescription: true, bodyHtml: true },
      },
    },
  });

  const jobs: Job[] = [];
  for (const page of pages) {
    const sourceLocale = page.country.defaultLocale;
    const source = page.translations.find((t) => t.locale === sourceLocale);
    if (!source) continue;
    const rows = new Map(page.translations.map((t) => [t.locale, t]));
    for (const { locale: targetLocale } of page.country.countryLocales) {
      if (targetLocale === sourceLocale) continue;
      const current = rows.get(targetLocale);
      for (const field of FIELDS) {
        const sourceText = source[field];
        // Skip a field that has nothing to say, or that someone already translated.
        if (!isMeaningful(sourceText) || isMeaningful(current?.[field])) continue;
        const key = `${page.country.code}:${page.slug}:${targetLocale}:${field}`;
        if (completed.has(key)) continue;
        jobs.push({
          key,
          entity: "SeoLandingPageTranslation",
          landingPageId: page.id,
          countryCode: page.country.code,
          slug: page.slug,
          field,
          sourceLocale,
          targetLocale,
          sourceText,
        });
      }
    }
  }

  console.log(
    `${pages.length} published landing pages | ${completed.size} fields already drafted | ${jobs.length} outstanding`,
  );
  console.log(`model=${model} budget=$${budgetUsd.toFixed(2)} limit=${limit}`);
  console.log(`output: ${outputFile}\n`);

  let done = 0;
  let failed = 0;
  for (const job of jobs.slice(0, limit)) {
    if (spentUsd >= budgetUsd) {
      console.log(`\nbudget reached ($${spentUsd.toFixed(4)}) — stopping, rerun to continue`);
      break;
    }
    try {
      const draft = await translate(job);
      appendFileSync(outputFile, `${JSON.stringify(draft)}\n`, "utf8");
      done += 1;
      const flag = draft.validationIssues.length ? `  !! ${draft.validationIssues.join(", ")}` : "";
      console.log(`  ${job.key}${flag}`);
    } catch (error) {
      failed += 1;
      console.log(`  FAIL ${job.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\ndrafted ${done}, failed ${failed}, spent $${spentUsd.toFixed(4)}`);
  console.log("NOTHING was written to the database — these are drafts pending review.");

  await prisma.$disconnect();
  await pool.end();
}

void main();
