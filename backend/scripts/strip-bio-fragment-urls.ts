/**
 * Remove pasted Chrome "copy link to highlight" URLs (…#:~:text=…) from
 * EVERY doctor bio, plus any <h2>/<h3>/<p> the URL leaves empty.
 *
 *   node --env-file=.env --import tsx scripts/strip-bio-fragment-urls.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/strip-bio-fragment-urls.ts --apply    # write
 *
 * Covers Doctor.bio, DoctorTranslation.bio, DoctorMarketTranslation.bio.
 * Writes doctor-bio-fragment-backup.json (before values of changed rows) first.
 * The frontend sanitizer strips the same URLs at render time; this cleans the data.
 */
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

// Own client: src/db/prisma.ts loads the full app env validation, which a
// one-off data script cannot satisfy locally.
const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })),
});

const APPLY = process.argv.includes("--apply");
const TEXT_FRAGMENT_URL = /\bhttps?:\/\/[^\s<>"]*#:~:text=[^\s<>"]*/gi;

export function stripFragmentUrls(bio: string): string {
  return bio
    .replace(TEXT_FRAGMENT_URL, "")
    .replace(/<(h2|h3|p)\b[^>]*>(\s|&nbsp;)*<\/\1>/gi, "")
    .trim();
}

async function main() {
  console.log(APPLY ? "== APPLY ==" : "== DRY-RUN (pass --apply to write) ==");
  const where = { bio: { contains: "#:~:text=" } };
  const [doctors, translations, markets] = await Promise.all([
    prisma.doctor.findMany({ where, select: { id: true, slug: true, bio: true } }),
    prisma.doctorTranslation.findMany({ where, select: { id: true, locale: true, bio: true } }),
    prisma.doctorMarketTranslation.findMany({ where, select: { id: true, locale: true, bio: true } }),
  ]);
  const rows = [
    ...doctors.map((r) => ({ kind: "doctor" as const, id: r.id, label: r.slug, before: r.bio! })),
    ...translations.map((r) => ({ kind: "translation" as const, id: r.id, label: r.locale, before: r.bio! })),
    ...markets.map((r) => ({ kind: "market" as const, id: r.id, label: r.locale, before: r.bio! })),
  ].map((r) => ({ ...r, after: stripFragmentUrls(r.before) }));

  fs.writeFileSync("doctor-bio-fragment-backup.json", JSON.stringify(rows, null, 1), "utf8");
  for (const r of rows) console.log(`  ${r.kind} ${r.label} ${r.id}  ${r.before.length} -> ${r.after.length} chars`);
  console.log(`rows=${rows.length} (backup: doctor-bio-fragment-backup.json)`);
  if (!APPLY) return console.log("dry-run complete, nothing written");

  for (const r of rows) {
    const data = { bio: r.after || null };
    if (r.kind === "doctor") await prisma.doctor.update({ where: { id: r.id }, data });
    else if (r.kind === "translation") await prisma.doctorTranslation.update({ where: { id: r.id }, data });
    else await prisma.doctorMarketTranslation.update({ where: { id: r.id }, data });
  }
  console.log(`done, ${rows.length} rows written`);
}

main().finally(() => prisma.$disconnect());
