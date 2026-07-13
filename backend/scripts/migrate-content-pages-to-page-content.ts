/**
 * One-off, idempotent migration: groups existing ContentPage rows by
 * (countryId, pageKey) and creates one PageContent + one
 * PageContentTranslation per locale row in the new structured-content
 * model. Old `ContentPage` rows are left untouched (dormant, not dropped).
 *
 * Dry-run by default — prints the plan, writes nothing. Pass --apply to
 * actually write. Idempotent: skips any (countryId, pageKey) group whose
 * PageContent already exists, so re-running after --apply is a no-op.
 *
 *   npx tsx scripts/migrate-content-pages-to-page-content.ts          # dry run
 *   npx tsx scripts/migrate-content-pages-to-page-content.ts --apply  # write
 */
import "dotenv/config";
import { PublishStatus } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

type OldRow = Awaited<ReturnType<typeof loadOldRows>>[number];

async function loadOldRows() {
  return prisma.contentPage.findMany({
    select: {
      id: true,
      countryId: true,
      pageKey: true,
      locale: true,
      status: true,
      isActive: true,
      body: true,
      heroTitle: true,
      heroSubtitle: true,
      heroImagePath: true,
      ctaLabel: true,
      ctaHref: true,
      ogImagePath: true,
      seoTitle: true,
      seoDescription: true,
      country: { select: { defaultLocale: true, code: true } },
    },
    orderBy: [{ countryId: "asc" }, { pageKey: "asc" }, { locale: "asc" }],
  });
}

function groupKey(row: Pick<OldRow, "countryId" | "pageKey">): string {
  return `${row.countryId}:${row.pageKey}`;
}

async function main(): Promise<void> {
  const rows = await loadOldRows();
  console.log(`Found ${rows.length} ContentPage row(s) across ${new Set(rows.map(groupKey)).size} group(s).`);

  const groups = new Map<string, OldRow[]>();
  for (const row of rows) {
    const key = groupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const summary: Array<{
    countryCode: string;
    pageKey: string;
    locales: string;
    status: string;
    action: "create" | "skip (exists)";
  }> = [];

  let created = 0;
  let skipped = 0;

  for (const [key, groupRows] of groups) {
    const [countryId, pageKey] = key.split(":");
    const countryCode = groupRows[0].country.code;
    const defaultLocale = groupRows[0].country.defaultLocale;

    const existing = await prisma.pageContent.findUnique({
      where: { countryId_pageKey: { countryId, pageKey: pageKey as OldRow["pageKey"] } },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      summary.push({
        countryCode,
        pageKey,
        locales: groupRows.map((r) => r.locale).join(","),
        status: "n/a",
        action: "skip (exists)",
      });
      continue;
    }

    const anyPublished = groupRows.some(
      (r) => r.status === PublishStatus.PUBLISHED && r.isActive,
    );
    const status = anyPublished ? PublishStatus.PUBLISHED : PublishStatus.DRAFT;

    const defaultRow = groupRows.find((r) => r.locale === defaultLocale) ?? groupRows[0];
    const showBody = groupRows.some((r) => !!r.body && r.body.trim().length > 0);

    summary.push({
      countryCode,
      pageKey,
      locales: groupRows.map((r) => r.locale).join(","),
      status,
      action: "create",
    });

    if (!APPLY) continue;

    await prisma.pageContent.create({
      data: {
        countryId,
        pageKey: pageKey as OldRow["pageKey"],
        status,
        isActive: true,
        heroImagePath: defaultRow.heroImagePath ?? null,
        ogImagePath: defaultRow.ogImagePath ?? null,
        ctaHref: defaultRow.ctaHref ?? null,
        showBody,
        translations: {
          create: groupRows.map((r) => ({
            locale: r.locale,
            heroTitle: r.heroTitle,
            heroSubtitle: r.heroSubtitle,
            ctaLabel: r.ctaLabel,
            body: r.body && r.body.trim().length > 0 ? r.body : null,
            seoTitle: r.seoTitle,
            seoDescription: r.seoDescription,
          })),
        },
      },
    });
    created += 1;
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — plan:`);
  console.table(summary);
  console.log(
    `\n[migrate-content-pages] groups=${groups.size} created=${created} skipped=${skipped} apply=${APPLY}`,
  );
  if (!APPLY) {
    console.log("Re-run with --apply to write these rows.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
