/**
 * Apply reviewed SEO landing-page translation drafts to the database.
 *
 * Reads the JSONL written by draft-landing-translations-openai.ts and creates
 * the missing SeoLandingPageTranslation rows, which is what stops
 * /ireland/de/health/hypertension serving English under `lang="de"`.
 *
 * Safety rules, in order of importance:
 *   - NEVER overwrites a field that already holds content. A human (or an
 *     earlier apply) wins over a draft, always. Re-running is therefore safe
 *     and converges rather than clobbering.
 *   - Skips any draft carrying validationIssues — those need a human first.
 *   - Requires a `title`, since the row cannot exist without one; a locale
 *     whose title draft is missing is skipped whole rather than half-written.
 *   - bodyHtml goes through the same sanitizeRichHtml the admin write path
 *     uses, so this cannot introduce markup the UI would not have accepted.
 *
 * Dry run by default; pass --apply to write.
 *
 *   node --import tsx --env-file=.env scripts/apply-landing-translations.ts
 *   node --import tsx --env-file=.env scripts/apply-landing-translations.ts --apply
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type LocaleCode } from "@prisma/client";
import { Pool } from "pg";
import { sanitizeRichHtml } from "../src/utils/sanitize-html.js";

const FIELDS = ["title", "seoTitle", "seoDescription", "bodyHtml"] as const;
type Field = (typeof FIELDS)[number];

type Draft = {
  key: string;
  landingPageId: string;
  countryCode: string;
  slug: string;
  field: Field;
  targetLocale: string;
  draftText: string;
  validationIssues: string[];
};

const APPLY = process.argv.includes("--apply");
const argValue = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const inputFile = path.resolve(
  argValue("input") ??
    process.env.I18N_DRAFT_OUTPUT_DIR?.trim() ??
    path.join(process.cwd(), "tmp", "i18n-drafts"),
  argValue("input") ? "." : "seo-landing-pages.jsonl",
);

const meaningful = (v: string | null | undefined): v is string =>
  !!v?.trim() && v.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim().length > 0;

async function main() {
  if (!existsSync(inputFile)) throw new Error(`No draft file at ${inputFile}`);

  const drafts: Draft[] = [];
  let skippedForIssues = 0;
  for (const line of readFileSync(inputFile, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as Draft;
    if (row.validationIssues?.length) {
      console.log(`HOLD  ${row.key} — ${row.validationIssues.join(", ")}`);
      skippedForIssues += 1;
      continue;
    }
    drafts.push(row);
  }

  // One row per (page, locale); a translation row carries all four fields.
  const byTarget = new Map<string, Draft[]>();
  for (const d of drafts) {
    const k = `${d.landingPageId}:${d.targetLocale}`;
    byTarget.set(k, [...(byTarget.get(k) ?? []), d]);
  }

  console.log(`${drafts.length} drafts, ${byTarget.size} page/locale rows, ${skippedForIssues} held\n`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let created = 0;
  let updated = 0;
  let untouched = 0;

  for (const [key, rows] of byTarget) {
    const [landingPageId, locale] = key.split(":") as [string, LocaleCode];
    const first = rows[0]!;
    const label = `${first.countryCode}/${first.slug}:${locale}`;

    const existing = await prisma.seoLandingPageTranslation.findUnique({
      where: { landingPageId_locale: { landingPageId, locale } },
      select: { id: true, title: true, seoTitle: true, seoDescription: true, bodyHtml: true },
    });

    const drafted = new Map(rows.map((r) => [r.field, r.draftText]));
    const value = (f: Field) => {
      const raw = drafted.get(f);
      if (!meaningful(raw)) return undefined;
      return f === "bodyHtml" ? sanitizeRichHtml(raw) ?? undefined : raw;
    };

    // Only fill what is genuinely empty — a human edit always wins.
    const patch: Partial<Record<Field, string>> = {};
    for (const f of FIELDS) {
      if (meaningful(existing?.[f])) continue;
      const v = value(f);
      if (v !== undefined) patch[f] = v;
    }

    if (Object.keys(patch).length === 0) {
      untouched += 1;
      continue;
    }

    if (!existing) {
      if (!patch.title) {
        console.log(`SKIP  ${label} — no title draft, refusing a half-written row`);
        continue;
      }
      console.log(`CREATE ${label}  [${Object.keys(patch).join(", ")}]`);
      if (APPLY) {
        await prisma.seoLandingPageTranslation.create({
          data: { landingPageId, locale, ...patch, title: patch.title },
        });
      }
      created += 1;
    } else {
      console.log(`FILL   ${label}  [${Object.keys(patch).join(", ")}]`);
      if (APPLY) {
        await prisma.seoLandingPageTranslation.update({ where: { id: existing.id }, data: patch });
      }
      updated += 1;
    }
  }

  console.log(
    `\n${APPLY ? "applied" : "DRY RUN"} — ${created} rows to create, ${updated} to fill, ` +
      `${untouched} already complete, ${skippedForIssues} held for review`,
  );
  if (!APPLY) console.log("re-run with --apply to write");

  await prisma.$disconnect();
  await pool.end();
}

void main();
