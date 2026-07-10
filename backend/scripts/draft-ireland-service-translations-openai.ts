import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const TARGET_LOCALES = ["PT", "ES", "CS", "RO", "DE"] as const;
const DISPLAY_FIELDS = [
  "name",
  "summary",
  "seoTitle",
  "seoDescription",
  "heroTitle",
  "heroDescription",
  "detailBody",
  "ctaLabel",
] as const;
const FAQ_FIELDS = ["question", "answer"] as const;

type Locale = (typeof TARGET_LOCALES)[number];
type Field = (typeof DISPLAY_FIELDS)[number] | (typeof FAQ_FIELDS)[number];

type Job = {
  key: string;
  entity: "ServiceTranslation" | "ServiceFaqTranslation";
  parentId: string;
  slug: string;
  field: Field;
  sourceLocale: "EN";
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
const limit = Math.max(1, Math.min(10_000, Number(argValue("limit") ?? "1")));
const faqMode = args.has("--faqs");
const fieldFilter = new Set((argValue("fields") ?? "").split(",").map((field) => field.trim()).filter(Boolean));
const model = process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5.4-mini";
const budgetUsd = Number(process.env.I18N_BUDGET_USD?.trim() || "1.00");
// ponytail: prices are env-tunable estimates; deliberately conservative-high so the guard trips early, never late
const priceInPerM = Number(process.env.OPENAI_PRICE_IN_PER_M?.trim() || "0.60");
const priceOutPerM = Number(process.env.OPENAI_PRICE_OUT_PER_M?.trim() || "2.40");
const outputDir = path.resolve(process.env.I18N_DRAFT_OUTPUT_DIR?.trim() || path.join(process.cwd(), "tmp", "i18n-drafts"));
const outputFile = path.join(outputDir, faqMode ? "ireland-service-faqs.jsonl" : "ireland-services.jsonl");

let spentUsd = 0;

function isMeaningful(value: string | null): value is string {
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
        lastError = new Error(`OpenAI transient error (${response.status})`);
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
    `Translate this ${job.field} from English to ${job.targetLocale}.`,
    "Return only the translated field value. Do not add commentary, labels, markdown fences, claims, guarantees, qualifications, prices, URLs, or content not present in the source.",
    "Preserve every HTML tag, entity, placeholder, URL, number, and proper name. Keep the medical and legal meaning exactly equivalent; use cautious wording when the source is cautious.",
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

async function collectJobs(completed: Set<string>): Promise<Job[]> {
  const services = await prisma.service.findMany({
    where: { country: { code: COUNTRY_CODE }, visibility: "PUBLIC" },
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      seoTitle: true,
      seoDescription: true,
      heroTitle: true,
      heroDescription: true,
      detailBody: true,
      ctaLabel: true,
      translations: { select: { locale: true, name: true, summary: true, seoTitle: true, seoDescription: true, heroTitle: true, heroDescription: true, detailBody: true, ctaLabel: true } },
      faqs: { select: { id: true, question: true, answer: true, translations: { select: { locale: true, question: true, answer: true } } } },
    },
  });

  const jobs: Job[] = [];
  const wanted = (field: string) => fieldFilter.size === 0 || fieldFilter.has(field);
  for (const service of services) {
    if (faqMode) {
      for (const faq of service.faqs) {
        const rows = new Map(faq.translations.map((row) => [row.locale, row]));
        for (const targetLocale of TARGET_LOCALES) {
          const current = rows.get(targetLocale);
          for (const field of FAQ_FIELDS) {
            if (!wanted(field) || !isMeaningful(faq[field]) || isMeaningful(current?.[field] ?? null)) continue;
            const key = `${faq.id}:${targetLocale}:${field}`;
            if (!completed.has(key)) jobs.push({ key, entity: "ServiceFaqTranslation", parentId: faq.id, slug: service.slug, field, sourceLocale: "EN", targetLocale, sourceText: faq[field] });
          }
        }
      }
      continue;
    }
    const source = service as unknown as Record<Field, string | null>;
    const translations = new Map(service.translations.map((row) => [row.locale, row as unknown as Record<Field, string | null>]));
    for (const targetLocale of TARGET_LOCALES) {
      const current = translations.get(targetLocale);
      for (const field of DISPLAY_FIELDS) {
        if (!wanted(field) || !isMeaningful(source[field]) || isMeaningful(current?.[field] ?? null)) continue;
        const key = `${service.id}:${targetLocale}:${field}`;
        if (!completed.has(key)) jobs.push({ key, entity: "ServiceTranslation", parentId: service.id, slug: service.slug, field, sourceLocale: "EN", targetLocale, sourceText: source[field] });
      }
    }
  }
  return jobs;
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const completed = new Set<string>();
  if (existsSync(outputFile)) {
    for (const line of readFileSync(outputFile, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as Partial<Draft>;
      if (typeof row.key === "string") completed.add(row.key);
    }
  }

  const jobs = await collectJobs(completed);
  const selected = jobs.slice(0, limit);
  console.log(`Mode: ${faqMode ? "service FAQs" : "service fields"}; model: ${model}; budget: $${budgetUsd.toFixed(2)}`);
  if (fieldFilter.size > 0) console.log(`Field filter: ${[...fieldFilter].join(", ")}`);
  console.log(`Pending draft jobs: ${jobs.length}; processing: ${selected.length}`);
  if (args.has("--dry-run")) return;
  for (const job of selected) {
    if (spentUsd >= budgetUsd) {
      console.log(`Budget ceiling $${budgetUsd.toFixed(2)} reached (spent ~$${spentUsd.toFixed(4)}); stopping safely. Re-run to resume.`);
      break;
    }
    const draft = await translate(job);
    appendFileSync(outputFile, `${JSON.stringify(draft)}\n`, "utf8");
    const flag = draft.validationIssues.length ? ` [REVIEW: ${draft.validationIssues.join("; ")}]` : "";
    console.log(`Drafted ${job.slug} ${job.targetLocale} ${job.field} (${draft.usage.inputTokens}in/${draft.usage.outputTokens}out, ~$${draft.usage.costUsd.toFixed(5)}, total ~$${spentUsd.toFixed(4)})${flag}`);
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
