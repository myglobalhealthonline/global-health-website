import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

// Renders every JSONL draft file into one reviewable markdown report.
// Read-only: touches no database, calls no API.

const draftDir = path.resolve(process.env.I18N_DRAFT_OUTPUT_DIR?.trim() || path.join(process.cwd(), "tmp", "i18n-drafts"));
const outputPath = path.resolve(process.env.I18N_DRAFT_REPORT_PATH?.trim() || path.join(process.cwd(), "..", "docs", "i18n-draft-review.md"));

type Draft = {
  key: string;
  entity?: string;
  slug: string;
  field: string;
  targetLocale: string;
  sourceText: string;
  draftText: string;
  model: string;
  createdAt: string;
  validationIssues?: string[];
};

if (!existsSync(draftDir)) {
  console.error(`No draft directory at ${draftDir}`);
  process.exit(1);
}

const drafts: Array<Draft & { file: string }> = [];
for (const file of readdirSync(draftDir).filter((name) => name.endsWith(".jsonl"))) {
  for (const line of readFileSync(path.join(draftDir, file), "utf8").split(/\r?\n/)) {
    if (line.trim()) drafts.push({ ...(JSON.parse(line) as Draft), file });
  }
}

const escape = (value: string) => value.replaceAll("|", "\\|").replaceAll(/\r?\n/g, "<br>");
const flagged = drafts.filter((draft) => draft.validationIssues?.length);
const lines: string[] = [
  "# Ireland i18n draft review",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Drafts: ${drafts.length} (${flagged.length} with validation flags). All drafts require human review before any database write.`,
  "",
];

if (flagged.length) {
  lines.push("## Validation-flagged drafts", "");
  for (const draft of flagged) lines.push(`- \`${draft.key}\` (${draft.slug} ${draft.targetLocale} ${draft.field}): ${draft.validationIssues!.join("; ")}`);
  lines.push("");
}

for (const [slug, group] of Map.groupBy(drafts, (draft) => draft.slug)) {
  lines.push(`## ${slug}`, "", "| Field | Locale | Source (EN) | Proposed | Flags | Model |", "|---|---|---|---|---|---|");
  for (const draft of group) {
    lines.push(`| ${draft.field} | ${draft.targetLocale} | ${escape(draft.sourceText)} | ${escape(draft.draftText)} | ${draft.validationIssues?.join("; ") || "—"} | ${draft.model} |`);
  }
  lines.push("");
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Drafts: ${drafts.length}; flagged: ${flagged.length}`);
console.log(`Report -> ${outputPath}`);
