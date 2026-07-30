import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { prisma } from "../src/db/prisma.js";

// Applies JSONL translation drafts (produced by draft-i18n-translations-openai.ts /
// draft-ireland-service-translations-openai.ts) to the DB. Upserts ONLY fields that
// are currently missing/empty on the target row — never overwrites a meaningful
// existing value. See CLAUDE.md-adjacent docs/i18n/translation-handoff.md for context.

type EntityFlag = "services" | "service-faqs" | "doctors" | "doctor-markets" | "health-tests" | "health-test-faqs";

type EntityConfig = {
  parentIdField: string;
  parentModel: string; // prisma delegate name for the parent record
  translationModel: string; // prisma delegate name for the translation table
  uniqueName: string; // @@unique compound name, e.g. serviceId_locale
  requiredFields: string[]; // NOT NULL columns — a create must supply all of these
  arrayFields: string[]; // String[] columns — draftText is split on "\n"
  allowedFields: string[];
};

const ENTITY_CONFIG: Record<EntityFlag, EntityConfig> = {
  services: {
    parentIdField: "serviceId",
    parentModel: "service",
    translationModel: "serviceTranslation",
    uniqueName: "serviceId_locale",
    requiredFields: ["name"],
    arrayFields: [],
    allowedFields: ["name", "summary", "seoTitle", "seoDescription", "heroTitle", "heroDescription", "detailBody", "ctaLabel"],
  },
  "service-faqs": {
    parentIdField: "serviceFaqId",
    parentModel: "serviceFaq",
    translationModel: "serviceFaqTranslation",
    uniqueName: "serviceFaqId_locale",
    requiredFields: ["question", "answer"],
    arrayFields: [],
    allowedFields: ["question", "answer"],
  },
  doctors: {
    parentIdField: "doctorId",
    parentModel: "doctor",
    translationModel: "doctorTranslation",
    uniqueName: "doctorId_locale",
    requiredFields: ["title"],
    arrayFields: [],
    allowedFields: ["title", "bio", "seoTitle", "seoDescription"],
  },
  "doctor-markets": {
    parentIdField: "doctorCountryId",
    parentModel: "doctorCountry",
    translationModel: "doctorMarketTranslation",
    uniqueName: "doctorCountryId_locale",
    requiredFields: ["title"],
    arrayFields: [],
    allowedFields: ["title", "bio", "seoTitle", "seoDescription"],
  },
  "health-tests": {
    parentIdField: "healthTestId",
    parentModel: "healthTest",
    translationModel: "healthTestTranslation",
    uniqueName: "healthTestId_locale",
    requiredFields: ["title"],
    arrayFields: ["whatThisTestCovers", "whyGetTested"],
    allowedFields: [
      "title", "shortDescription", "sampleType", "resultsTimeline", "heroButtonLabel",
      "detailIntro", "whatThisTestCovers", "whyGetTested", "seoTitle", "seoDescription",
    ],
  },
  "health-test-faqs": {
    parentIdField: "healthTestFaqId",
    parentModel: "healthTestFaq",
    translationModel: "healthTestFaqTranslation",
    uniqueName: "healthTestFaqId_locale",
    requiredFields: ["question", "answer"],
    arrayFields: [],
    allowedFields: ["question", "answer"],
  },
};

type RawDraft = {
  key?: string;
  entity?: string;
  parentId?: string;
  serviceId?: string; // legacy ireland-services.jsonl shape
  slug?: string;
  field?: string;
  sourceLocale?: string;
  targetLocale?: string;
  sourceText?: string;
  draftText?: string;
  validationIssues?: string[];
};

type Draft = {
  key: string;
  entity: EntityFlag;
  parentId: string;
  slug: string;
  field: string;
  targetLocale: string;
  draftText: string;
  validationIssues: string[];
};

// Same emptiness rule as the draft scripts: null/undefined/whitespace-only/HTML-empty.
function isMeaningful(value: string | string[] | null | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (!value?.trim()) return false;
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim().length > 0;
}

function fieldValue(config: EntityConfig, field: string, draftText: string): string | string[] {
  return config.arrayFields.includes(field) ? draftText.split("\n") : draftText;
}

// Draft files in the wild use two different spellings for the same entity:
// the flag-style plural used by draft-i18n-translations-openai.ts ("services",
// "service-faqs", ...) and the raw Prisma model name some older drafts carry
// ("ServiceTranslation", ...). Legacy records omit `entity` entirely.
const ENTITY_ALIASES: Record<string, EntityFlag> = {
  services: "services", ServiceTranslation: "services",
  "service-faqs": "service-faqs", ServiceFaqTranslation: "service-faqs",
  doctors: "doctors", DoctorTranslation: "doctors",
  "doctor-markets": "doctor-markets", DoctorMarketTranslation: "doctor-markets",
  "health-tests": "health-tests", HealthTestTranslation: "health-tests",
  "health-test-faqs": "health-test-faqs", HealthTestFaqTranslation: "health-test-faqs",
};

function normalize(raw: RawDraft, sourceFile: string): Draft | null {
  const entity = raw.entity ? ENTITY_ALIASES[raw.entity] : raw.serviceId ? "services" : undefined;
  const parentId = raw.parentId ?? raw.serviceId;
  if (!entity || !(entity in ENTITY_CONFIG) || !parentId || !raw.field || !raw.targetLocale || typeof raw.draftText !== "string") {
    console.warn(`SKIP malformed draft record in ${sourceFile}: ${JSON.stringify(raw).slice(0, 200)}`);
    return null;
  }
  const config = ENTITY_CONFIG[entity];
  if (!config.allowedFields.includes(raw.field)) {
    console.warn(`SKIP unknown field "${raw.field}" for entity ${entity} (${sourceFile})`);
    return null;
  }
  return {
    key: raw.key ?? `${entity}:${parentId}:${raw.targetLocale}:${raw.field}`,
    entity,
    parentId,
    slug: raw.slug ?? parentId,
    field: raw.field,
    targetLocale: raw.targetLocale,
    draftText: raw.draftText,
    validationIssues: raw.validationIssues ?? [],
  };
}

function loadDrafts(files: string[]): Draft[] {
  const drafts: Draft[] = [];
  for (const file of files) {
    if (!existsSync(file)) throw new Error(`Draft file not found: ${file}`);
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const draft = normalize(JSON.parse(line) as RawDraft, file);
      if (draft) drafts.push(draft);
    }
  }
  return drafts;
}

type GroupKey = string; // `${entity}:${parentId}:${targetLocale}`
type Group = { entity: EntityFlag; parentId: string; targetLocale: string; fields: Map<string, Draft> };

function groupDrafts(drafts: Draft[]): Map<GroupKey, Group> {
  const groups = new Map<GroupKey, Group>();
  for (const draft of drafts) {
    const key: GroupKey = `${draft.entity}:${draft.parentId}:${draft.targetLocale}`;
    let group = groups.get(key);
    if (!group) {
      group = { entity: draft.entity, parentId: draft.parentId, targetLocale: draft.targetLocale, fields: new Map() };
      groups.set(key, group);
    }
    // Multiple files could draft the same field; last one wins.
    group.fields.set(draft.field, draft);
  }
  return groups;
}

type Delegate = {
  findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
};
const delegate = (name: string): Delegate => (prisma as unknown as Record<string, Delegate>)[name];

type EntitySummary = {
  wouldCreate: number;
  wouldUpdate: number;
  fieldWrites: number;
  skippedExisting: number;
  skippedFlagged: number;
  orphanDrafts: number;
  skippedIncompleteCreate: number;
};
const emptySummary = (): EntitySummary => ({
  wouldCreate: 0, wouldUpdate: 0, fieldWrites: 0, skippedExisting: 0, skippedFlagged: 0, orphanDrafts: 0, skippedIncompleteCreate: 0,
});

async function main() {
  const args = new Set(process.argv.slice(2));
  const argValue = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  const fileArg = process.argv.filter((arg) => arg.startsWith("--file=")).map((arg) => arg.slice("--file=".length));
  const files = [...fileArg, ...(argValue("file")?.split(",") ?? [])].filter(Boolean).map((f) => f.trim()).filter(Boolean);
  const uniqueFiles = [...new Set(files)];
  if (uniqueFiles.length === 0) {
    console.error("Usage: apply-i18n-drafts.ts --file=<path.jsonl>[,<path.jsonl>...] [--file=<path>] [--dry-run] [--skip-flagged|--include-flagged]");
    process.exit(1);
  }
  const dryRun = args.has("--dry-run");
  const includeFlagged = args.has("--include-flagged");

  if (!dryRun && process.env.I18N_SNAPSHOT_CONFIRMED !== "1") {
    console.error(
      "Refusing to write: run `npx tsx scripts/snapshot-i18n-content.ts` first, then re-run with I18N_SNAPSHOT_CONFIRMED=1.",
    );
    process.exit(1);
  }

  const drafts = loadDrafts(uniqueFiles);
  const groups = groupDrafts(drafts);
  console.log(`Loaded ${drafts.length} draft record(s) from ${uniqueFiles.length} file(s) into ${groups.size} group(s).`);

  // Batch-fetch parents + existing translation rows per entity to avoid N+1.
  const byEntity = new Map<EntityFlag, Group[]>();
  for (const group of groups.values()) {
    (byEntity.get(group.entity) ?? byEntity.set(group.entity, []).get(group.entity)!).push(group);
  }

  const overall = emptySummary();
  const perEntity = new Map<EntityFlag, EntitySummary>();
  const perLocale = new Map<string, number>(); // fieldWrites by locale (real run only, but tracked either way)

  for (const [entity, entityGroups] of byEntity) {
    const config = ENTITY_CONFIG[entity];
    const summary = emptySummary();
    perEntity.set(entity, summary);

    const parentIds = [...new Set(entityGroups.map((g) => g.parentId))];
    const existingParents = new Set(
      (await delegate(config.parentModel).findMany({ where: { id: { in: parentIds } }, select: { id: true } })).map(
        (row) => row.id as string,
      ),
    );

    const existingTranslations = await delegate(config.translationModel).findMany({
      where: { [config.parentIdField]: { in: parentIds } },
      select: undefined,
    });
    const existingByKey = new Map<string, Record<string, unknown>>();
    for (const row of existingTranslations) {
      existingByKey.set(`${row[config.parentIdField]}:${row.locale}`, row);
    }

    for (const group of entityGroups) {
      if (!existingParents.has(group.parentId)) {
        summary.orphanDrafts += group.fields.size;
        overall.orphanDrafts += group.fields.size;
        console.warn(`SKIP orphan draft(s): ${config.parentModel} ${group.parentId} not found (entity=${entity}, locale=${group.targetLocale})`);
        continue;
      }

      const existingRow = existingByKey.get(`${group.parentId}:${group.targetLocale}`);
      const applied: Record<string, string | string[]> = {};

      for (const draft of group.fields.values()) {
        const flagged = draft.validationIssues.length > 0;
        if (flagged && !includeFlagged) {
          summary.skippedFlagged++;
          overall.skippedFlagged++;
          continue;
        }
        const existingValue = existingRow?.[draft.field] as string | string[] | null | undefined;
        if (isMeaningful(existingValue)) {
          summary.skippedExisting++;
          overall.skippedExisting++;
          continue;
        }
        applied[draft.field] = fieldValue(config, draft.field, draft.draftText);
      }

      if (Object.keys(applied).length === 0) continue;

      if (existingRow) {
        summary.wouldUpdate++;
        overall.wouldUpdate++;
        summary.fieldWrites += Object.keys(applied).length;
        overall.fieldWrites += Object.keys(applied).length;
        perLocale.set(group.targetLocale, (perLocale.get(group.targetLocale) ?? 0) + Object.keys(applied).length);
        if (!dryRun) {
          await prisma.$transaction(async (tx) => {
            const txDelegate = (tx as unknown as Record<string, Delegate>)[config.translationModel];
            await txDelegate.update({
              where: { [config.uniqueName]: { [config.parentIdField]: group.parentId, locale: group.targetLocale as never } },
              data: applied,
            });
          });
        }
        continue;
      }

      const missingRequired = config.requiredFields.filter((field) => !(field in applied));
      if (missingRequired.length > 0) {
        summary.skippedIncompleteCreate++;
        overall.skippedIncompleteCreate++;
        console.warn(
          `SKIP create for ${entity} ${group.parentId} ${group.targetLocale}: missing required field(s) ${missingRequired.join(", ")}`,
        );
        continue;
      }
      summary.wouldCreate++;
      overall.wouldCreate++;
      summary.fieldWrites += Object.keys(applied).length;
      overall.fieldWrites += Object.keys(applied).length;
      perLocale.set(group.targetLocale, (perLocale.get(group.targetLocale) ?? 0) + Object.keys(applied).length);
      if (!dryRun) {
        await prisma.$transaction(async (tx) => {
          const txDelegate = (tx as unknown as Record<string, Delegate>)[config.translationModel];
          await txDelegate.create({
            data: { [config.parentIdField]: group.parentId, locale: group.targetLocale as never, ...applied },
          });
        });
      }
    }
  }

  const printSummary = (label: string, s: EntitySummary) => {
    console.log(
      `${label}: wouldCreate=${s.wouldCreate} wouldUpdate=${s.wouldUpdate} fieldWrites=${s.fieldWrites} ` +
        `skippedExisting=${s.skippedExisting} skippedFlagged=${s.skippedFlagged} orphanDrafts=${s.orphanDrafts} ` +
        `skippedIncompleteCreate=${s.skippedIncompleteCreate}`,
    );
  };

  console.log(`\n${dryRun ? "DRY RUN" : "APPLIED"} summary`);
  for (const [entity, summary] of perEntity) printSummary(entity, summary);
  printSummary("TOTAL", overall);

  console.log("\nField writes by locale:");
  for (const [locale, count] of [...perLocale.entries()].sort()) console.log(`  ${locale}: ${count}`);

  if (overall.skippedFlagged > 0 && !includeFlagged) {
    console.log(`\n${overall.skippedFlagged} draft(s) skipped for validation issues. Re-run with --include-flagged to force-apply after human review.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
