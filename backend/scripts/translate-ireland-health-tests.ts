/**
 * Ireland health test kits — draft PT/ES/CS/RO/DE translations from the EN
 * source and write HealthTestTranslation + HealthTestFaqTranslation rows.
 *
 * One OpenAI call per (kit, locale) rather than per field: the array fields
 * (`whatThisTestCovers`, `whyGetTested`), the `extraSections` blocks and the
 * FAQs must stay index-aligned with the source, and a single structured
 * response is the only way to guarantee that. Every response is validated for
 * shape before it is allowed near the database — mismatched counts, a changed
 * `kind`, or a lost "Heading\nBody" split rejects the whole kit+locale.
 *
 * Machine translation of medical copy is a DRAFT. Nothing here has been read
 * by a clinician or a native speaker; treat the output as review-ready, not
 * publication-ready.
 *
 *   npx tsx scripts/translate-ireland-health-tests.ts                     # dry run, 1 kit
 *   npx tsx scripts/translate-ireland-health-tests.ts --limit=15          # dry run, all
 *   npx tsx scripts/translate-ireland-health-tests.ts --limit=15 --apply  # write (PROD)
 *   ... --locales=PT,ES        restrict target locales
 *   ... --only=vitamin-d-test  restrict to one kit
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const SOURCE_LOCALE = "EN" as const;
const ALL_LOCALES = ["PT", "ES", "CS", "RO", "DE"] as const;
type Locale = (typeof ALL_LOCALES)[number];

const LANGUAGE: Record<Locale, string> = {
  PT: "European Portuguese (pt-PT)",
  ES: "European Spanish (es-ES)",
  CS: "Czech",
  RO: "Romanian",
  DE: "German",
};

const args = new Set(process.argv.slice(2));
const argValue = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const APPLY = args.has("--apply");
const limit = Math.max(1, Math.min(50, Number(argValue("limit") ?? "1")));
const onlySlug = argValue("only")?.trim();
const locales = (argValue("locales")?.split(",").map((l) => l.trim().toUpperCase()).filter(Boolean) ??
  ALL_LOCALES) as Locale[];
const model = process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5.4-mini";
const budgetUsd = Number(process.env.I18N_BUDGET_USD?.trim() || "3.00");
// ponytail: env-tunable estimates, deliberately high so the guard trips early.
const priceInPerM = Number(process.env.OPENAI_PRICE_IN_PER_M?.trim() || "0.60");
const priceOutPerM = Number(process.env.OPENAI_PRICE_OUT_PER_M?.trim() || "2.40");

let spentUsd = 0;

type Source = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  sampleType: string | null;
  resultsTimeline: string | null;
  heroButtonLabel: string | null;
  detailIntro: string | null;
  whatThisTestCovers: string[];
  whyGetTested: string[];
  extraSections: Array<{ title: string; body: string; kind?: string }>;
  seoTitle: string | null;
  seoDescription: string | null;
  faqs: Array<{ id: string; question: string; answer: string }>;
};

type Translated = {
  title: string;
  shortDescription: string;
  sampleType: string;
  resultsTimeline: string;
  heroButtonLabel: string;
  detailIntro: string;
  whatThisTestCovers: string[];
  whyGetTested: string[];
  extraSections: Array<{ title: string; body: string }>;
  seoTitle: string;
  seoDescription: string;
  faqs: Array<{ question: string; answer: string }>;
};

async function callOpenAi(body: object): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2_000 * 2 ** (attempt - 1)));
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`OpenAI transient error (${res.status})`);
        continue;
      }
      if (!res.ok) throw new Error(`OpenAI request failed (${res.status}): ${await res.text()}`);
      return (await res.json()) as Record<string, unknown>;
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

function trackUsage(body: Record<string, unknown>): number {
  const usage = (body.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
  const cost =
    ((usage.input_tokens ?? 0) * priceInPerM + (usage.output_tokens ?? 0) * priceOutPerM) / 1_000_000;
  spentUsd += cost;
  return cost;
}

const PROMPT_RULES = [
  "You are translating patient-facing copy for a licensed telemedicine clinic. The output is a draft for human review.",
  "Translate meaning, not words. Keep the register calm and clinical; where the source hedges ('may', 'can', 'is not a diagnosis'), hedge identically. Never add a claim, guarantee, price, URL or qualification that is not in the source, and never drop one.",
  "Keep these EXACTLY as they appear in the source, untranslated: laboratory analyte and marker names (HbA1c, Free T4, HDL Cholesterol, Anti-TPO, PSA, AMH, eGFR, HLA-DQ, C282Y, ...), gene and mutation codes, device and brand names (Randox, QuickDraw, Tasso+, Osentia), the regulator abbreviations IMC and UKAS, and every number, unit and euro amount.",
  "Translate surrounding words normally — a panel name like 'Liver health' is translated even though the markers inside it are not.",
  "Return each array with exactly the same number of entries as the source, in the same order. An entry of the form 'Panel name: marker, marker' keeps that exact shape: translated panel name, colon, space, then the original marker names comma-separated.",
  "Each extraSections body is made of blocks separated by a blank line, and each block is a heading line, a newline, then body text. Preserve that structure exactly: same block count, same single newline after each heading, blank line between blocks.",
  "seoTitle stays under 60 characters and seoDescription under 155 where the target language allows it.",
  "Output valid JSON only, matching the requested schema.",
].join("\n");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "shortDescription",
    "sampleType",
    "resultsTimeline",
    "heroButtonLabel",
    "detailIntro",
    "whatThisTestCovers",
    "whyGetTested",
    "extraSections",
    "seoTitle",
    "seoDescription",
    "faqs",
  ],
  properties: {
    title: { type: "string" },
    shortDescription: { type: "string" },
    sampleType: { type: "string" },
    resultsTimeline: { type: "string" },
    heroButtonLabel: { type: "string" },
    detailIntro: { type: "string" },
    whatThisTestCovers: { type: "array", items: { type: "string" } },
    whyGetTested: { type: "array", items: { type: "string" } },
    extraSections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body"],
        properties: { title: { type: "string" }, body: { type: "string" } },
      },
    },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    faqs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: { question: { type: "string" }, answer: { type: "string" } },
      },
    },
  },
} as const;

const blocks = (body: string) => body.split(/\n{2,}/).filter((b) => b.trim());

/** Reject anything whose shape drifted — a dropped list entry or a collapsed
 *  heading would render as broken copy on a live page. */
function validate(src: Source, out: Translated): string[] {
  const issues: string[] = [];
  if (out.whatThisTestCovers.length !== src.whatThisTestCovers.length) {
    issues.push(`whatThisTestCovers ${out.whatThisTestCovers.length} vs ${src.whatThisTestCovers.length}`);
  }
  if (out.whyGetTested.length !== src.whyGetTested.length) {
    issues.push(`whyGetTested ${out.whyGetTested.length} vs ${src.whyGetTested.length}`);
  }
  if (out.extraSections.length !== src.extraSections.length) {
    issues.push(`extraSections ${out.extraSections.length} vs ${src.extraSections.length}`);
  } else {
    src.extraSections.forEach((s, i) => {
      const a = blocks(s.body).length;
      const b = blocks(out.extraSections[i]!.body).length;
      if (a !== b) issues.push(`extraSections[${i}] blocks ${b} vs ${a}`);
      if (blocks(out.extraSections[i]!.body).some((blk) => !blk.includes("\n"))) {
        issues.push(`extraSections[${i}] lost a heading/body split`);
      }
    });
  }
  if (out.faqs.length !== src.faqs.length) issues.push(`faqs ${out.faqs.length} vs ${src.faqs.length}`);
  // Panel rows must keep the "name: markers" shape the frontend parses.
  src.whatThisTestCovers.forEach((entry, i) => {
    const hasPanel = entry.includes(": ");
    const got = out.whatThisTestCovers[i] ?? "";
    if (hasPanel && !got.includes(": ")) issues.push(`covers[${i}] lost its panel colon`);
  });
  const emptied = Object.entries(out).filter(([, v]) => typeof v === "string" && !v.trim());
  if (emptied.length > 0) issues.push(`empty: ${emptied.map(([k]) => k).join(",")}`);
  return issues;
}

async function translateKit(src: Source, locale: Locale): Promise<{ out: Translated; cost: number }> {
  const payload = {
    title: src.title,
    shortDescription: src.shortDescription ?? "",
    sampleType: src.sampleType ?? "",
    resultsTimeline: src.resultsTimeline ?? "",
    heroButtonLabel: src.heroButtonLabel ?? "",
    detailIntro: src.detailIntro ?? "",
    whatThisTestCovers: src.whatThisTestCovers,
    whyGetTested: src.whyGetTested,
    extraSections: src.extraSections.map((s) => ({ title: s.title, body: s.body })),
    seoTitle: src.seoTitle ?? "",
    seoDescription: src.seoDescription ?? "",
    faqs: src.faqs.map((f) => ({ question: f.question, answer: f.answer })),
  };

  const body = await callOpenAi({
    model,
    reasoning: { effort: "low" },
    max_output_tokens: 16_000,
    text: {
      format: { type: "json_schema", name: "health_test_translation", strict: true, schema: SCHEMA },
    },
    input: [
      PROMPT_RULES,
      `Translate every string value below from English into ${LANGUAGE[locale]}.`,
      "SOURCE JSON:",
      JSON.stringify(payload, null, 1),
    ].join("\n\n"),
  });
  if (body.incomplete_details) {
    throw new Error(`OpenAI response incomplete: ${JSON.stringify(body.incomplete_details)}`);
  }
  const text = outputText(body);
  if (!text) throw new Error("OpenAI response contained no text");
  const cost = trackUsage(body);
  return { out: JSON.parse(text) as Translated, cost };
}

async function main(): Promise<void> {
  const country = await prisma.country.findUnique({ where: { code: COUNTRY_CODE }, select: { id: true } });
  if (!country) throw new Error("IE country not found");

  const kits = await prisma.healthTest.findMany({
    where: { countryId: country.id, ...(onlySlug ? { slug: onlySlug } : {}) },
    orderBy: { sortOrder: "asc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      sampleType: true,
      resultsTimeline: true,
      heroButtonLabel: true,
      detailIntro: true,
      whatThisTestCovers: true,
      whyGetTested: true,
      extraSections: true,
      seoTitle: true,
      seoDescription: true,
      faqs: { orderBy: { sortOrder: "asc" }, select: { id: true, question: true, answer: true } },
    },
  });

  console.log(
    `\n${kits.length} kit(s) × ${locales.length} locale(s) = ${kits.length * locales.length} calls · model ${model} · budget $${budgetUsd.toFixed(2)} · ${APPLY ? "APPLY" : "DRY RUN"}\n`,
  );

  let ok = 0;
  let failed = 0;

  for (const row of kits) {
    const src: Source = {
      ...row,
      extraSections: Array.isArray(row.extraSections)
        ? (row.extraSections as Array<{ title: string; body: string; kind?: string }>)
        : [],
    };

    for (const locale of locales) {
      if (spentUsd >= budgetUsd) {
        console.log(`\n!! budget $${budgetUsd.toFixed(2)} reached — stopping`);
        return;
      }
      const label = `${src.slug} ${locale}`;
      try {
        const { out, cost } = await translateKit(src, locale);
        const issues = validate(src, out);
        if (issues.length > 0) {
          failed++;
          console.log(`  x ${label} — REJECTED: ${issues.join("; ")}`);
          continue;
        }
        ok++;
        console.log(`  ok ${label} — ${out.title} ($${cost.toFixed(4)})`);
        if (args.has("--show")) console.log(JSON.stringify(out, null, 1));

        if (!APPLY) continue;

        // `kind` is structural, never translated — carry the source value over.
        const extraSections = out.extraSections.map((s, i) => ({
          title: s.title,
          body: s.body,
          ...(src.extraSections[i]?.kind ? { kind: src.extraSections[i]!.kind } : {}),
        }));
        const data = {
          title: out.title,
          shortDescription: out.shortDescription,
          sampleType: out.sampleType,
          resultsTimeline: out.resultsTimeline,
          heroButtonLabel: out.heroButtonLabel,
          detailIntro: out.detailIntro,
          whatThisTestCovers: out.whatThisTestCovers,
          whyGetTested: out.whyGetTested,
          extraSections,
          seoTitle: out.seoTitle,
          seoDescription: out.seoDescription,
        };
        await prisma.healthTestTranslation.upsert({
          where: { healthTestId_locale: { healthTestId: src.id, locale } },
          create: { healthTestId: src.id, locale, ...data },
          update: data,
        });
        await prisma.$transaction(
          src.faqs.map((faq, i) => {
            const t = out.faqs[i]!;
            return prisma.healthTestFaqTranslation.upsert({
              where: { healthTestFaqId_locale: { healthTestFaqId: faq.id, locale } },
              create: { healthTestFaqId: faq.id, locale, question: t.question, answer: t.answer },
              update: { question: t.question, answer: t.answer },
            });
          }),
        );
      } catch (error) {
        failed++;
        console.log(`  x ${label} — ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  console.log(
    `\n${ok} ok · ${failed} failed · $${spentUsd.toFixed(4)} spent · ${APPLY ? "written to PROD" : "dry run, nothing written"}`,
  );
  if (APPLY && ok > 0) {
    console.log("Machine-drafted medical copy — have a native speaker review before relying on it.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
