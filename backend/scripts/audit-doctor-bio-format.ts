/**
 * Read-only audit of every doctor bio value in the DB.
 *
 *   node --env-file=.env --import tsx scripts/audit-doctor-bio-format.ts
 *
 * Covers Doctor.bio, DoctorTranslation.bio and DoctorMarketTranslation.bio.
 * Dumps every row to doctor-bios-dump.json for offline inspection.
 */
import fs from "node:fs";
import { prisma } from "../src/db/prisma.js";

type Row = {
  kind: "doctor" | "translation" | "market";
  id: string;
  doctor: string;
  slug: string;
  locale: string;
  country: string | null;
  bio: string;
};

function flags(bio: string): string[] {
  const f: string[] = [];
  const hasTags = /<[a-z][^>]*>/i.test(bio);
  if (!hasTags) f.push("PLAIN_TEXT");
  if (!hasTags && /\n\s*\n/.test(bio)) f.push("PLAIN_MULTI_PARA");
  if (!hasTags && bio.length > 900) f.push("PLAIN_LONG");
  if (/<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>/i.test(bio)) f.push("EMPTY_P");
  if (/style\s*=\s*"[^"]*color/i.test(bio)) f.push("INLINE_COLOR");
  if (/&nbsp;/i.test(bio)) f.push("NBSP");
  if (/—/.test(bio)) f.push(`EMDASH:${(bio.match(/—/g) ?? []).length}`);
  if (/–/.test(bio)) f.push(`ENDASH:${(bio.match(/–/g) ?? []).length}`);
  if (/(^|\n|<p>|<br\s*\/?>)\s*[•·▪]/.test(bio)) f.push("MANUAL_BULLETS");
  if (/<b>|<i>/i.test(bio)) f.push("B_I_TAGS");
  if (/<span[^>]*>\s*<span/i.test(bio)) f.push("NESTED_SPAN");
  if (hasTags && /\n\s*\n/.test(bio.replace(/<[^>]+>/g, ""))) f.push("HTML_WITH_BLANK_LINES");
  return f;
}

async function main() {
  const doctors = await prisma.doctor.findMany({
    include: {
      country: true,
      translations: true,
      additionalCountries: { include: { country: true, translations: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const rows: Row[] = [];
  for (const d of doctors) {
    if (d.bio) {
      rows.push({
        kind: "doctor",
        id: d.id,
        doctor: d.fullName,
        slug: d.slug,
        locale: "BASE",
        country: d.country.code,
        bio: d.bio,
      });
    }
    for (const t of d.translations) {
      if (t.bio)
        rows.push({
          kind: "translation",
          id: t.id,
          doctor: d.fullName,
          slug: d.slug,
          locale: t.locale,
          country: null,
          bio: t.bio,
        });
    }
    for (const dc of d.additionalCountries) {
      for (const t of dc.translations) {
        if (t.bio)
          rows.push({
            kind: "market",
            id: t.id,
            doctor: d.fullName,
            slug: d.slug,
            locale: t.locale,
            country: dc.country.code,
            bio: t.bio,
          });
      }
    }
  }

  const counts = new Map<string, number>();
  const perRow = rows.map((r) => {
    const f = flags(r.bio);
    for (const raw of f) {
      const key = raw.split(":")[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return { ...r, flags: f, len: r.bio.length };
  });

  console.log(`doctors=${doctors.length} bio rows=${rows.length}`);
  console.log(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join("  "),
  );

  const plain = perRow.filter((r) => r.flags.includes("PLAIN_TEXT"));
  console.log(`\nPLAIN_TEXT rows: ${plain.length} across ${new Set(plain.map((r) => r.slug)).size} doctors`);
  const emdash = perRow.filter((r) => r.flags.some((f) => f.startsWith("EMDASH")));
  console.log(
    `EMDASH rows: ${emdash.length}, total dashes ${emdash.reduce((n, r) => n + Number(r.flags.find((f) => f.startsWith("EMDASH"))!.split(":")[1]), 0)}`,
  );

  fs.writeFileSync("doctor-bios-dump.json", JSON.stringify(perRow, null, 1), "utf8");
  console.log("\ndump: doctor-bios-dump.json");
}

main().finally(() => prisma.$disconnect());
