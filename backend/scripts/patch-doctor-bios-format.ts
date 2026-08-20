/**
 * Normalize EVERY doctor bio in the DB: structure it as HTML the public
 * profile can render, and strip the em/en dashes.
 *
 *   node --env-file=.env --import tsx scripts/patch-doctor-bios-format.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/patch-doctor-bios-format.ts --apply    # write
 *   ... --slug dr-fatima-ali        # limit to one doctor
 *   ... --locale EN                 # limit to one locale (BASE = Doctor.bio)
 *
 * Covers Doctor.bio, DoctorTranslation.bio, DoctorMarketTranslation.bio.
 * Idempotent — rows already matching the normalized value are skipped.
 *
 * Safety: every run writes doctor-bios-backup.json (all current values) and
 * doctor-bios-report.txt (before/after for each changed row) BEFORE writing,
 * and refuses to write any row whose word sequence changed.
 */
import fs from "node:fs";
import { prisma } from "../src/db/prisma.js";
import { normalizeBio } from "./lib/normalize-bio.js";

const APPLY = process.argv.includes("--apply");
const argValue = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const ONLY_SLUG = argValue("--slug");
const ONLY_LOCALE = argValue("--locale");

type Target = {
  kind: "doctor" | "translation" | "market";
  id: string;
  doctor: string;
  slug: string;
  locale: string;
  country: string | null;
  before: string;
};

const words = (s: string) =>
  (s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .toLowerCase()
    .match(/\p{L}+|\d+/gu) ?? []).join(" ");

async function main() {
  console.log(APPLY ? "== APPLY ==" : "== DRY-RUN (pass --apply to write) ==");

  const doctors = await prisma.doctor.findMany({
    where: ONLY_SLUG ? { slug: ONLY_SLUG } : undefined,
    include: {
      country: true,
      translations: true,
      additionalCountries: { include: { country: true, translations: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const targets: Target[] = [];
  for (const d of doctors) {
    if (d.bio?.trim())
      targets.push({
        kind: "doctor",
        id: d.id,
        doctor: d.fullName,
        slug: d.slug,
        locale: "BASE",
        country: d.country.code,
        before: d.bio,
      });
    for (const t of d.translations)
      if (t.bio?.trim())
        targets.push({
          kind: "translation",
          id: t.id,
          doctor: d.fullName,
          slug: d.slug,
          locale: t.locale,
          country: null,
          before: t.bio,
        });
    for (const dc of d.additionalCountries)
      for (const t of dc.translations)
        if (t.bio?.trim())
          targets.push({
            kind: "market",
            id: t.id,
            doctor: d.fullName,
            slug: d.slug,
            locale: t.locale,
            country: dc.country.code,
            before: t.bio,
          });
  }

  const scoped = ONLY_LOCALE
    ? targets.filter((t) => t.locale.toUpperCase() === ONLY_LOCALE.toUpperCase())
    : targets;

  fs.writeFileSync("doctor-bios-backup.json", JSON.stringify(scoped, null, 1), "utf8");
  console.log(`backup: doctor-bios-backup.json (${scoped.length} rows)`);

  const report: string[] = [];
  const rejected: Target[] = [];
  const changed: Array<Target & { after: string }> = [];

  for (const t of scoped) {
    const after = normalizeBio(t.before);
    if (!after) {
      rejected.push(t);
      continue;
    }
    if (words(after) !== words(t.before)) {
      rejected.push(t);
      report.push(
        `!! WORD MISMATCH ${t.doctor} ${t.kind}/${t.country ?? "-"}/${t.locale}\n--- before\n${t.before}\n--- after\n${after}\n`,
      );
      continue;
    }
    if (after === t.before) continue;
    changed.push({ ...t, after });
    report.push(
      `== ${t.doctor} | ${t.kind} | ${t.country ?? "-"} | ${t.locale}\n--- before\n${t.before}\n--- after\n${after}\n`,
    );
  }

  fs.writeFileSync("doctor-bios-report.txt", report.join("\n"), "utf8");

  const dashesLeft = changed.filter((c) => /[—–]/.test(c.after));
  console.log(
    `rows=${scoped.length} unchanged=${scoped.length - changed.length - rejected.length} changed=${changed.length} rejected=${rejected.length}`,
  );
  console.log(`rows still containing a dash after normalizing: ${dashesLeft.length}`);
  console.log(`report: doctor-bios-report.txt`);
  for (const r of rejected) console.log(`  REJECTED ${r.doctor} ${r.kind}/${r.locale}`);

  if (!APPLY) {
    console.log("dry-run complete, nothing written");
    return;
  }

  let n = 0;
  for (const c of changed) {
    if (c.kind === "doctor")
      await prisma.doctor.update({ where: { id: c.id }, data: { bio: c.after } });
    else if (c.kind === "translation")
      await prisma.doctorTranslation.update({ where: { id: c.id }, data: { bio: c.after } });
    else await prisma.doctorMarketTranslation.update({ where: { id: c.id }, data: { bio: c.after } });
    n += 1;
    if (n % 50 === 0) console.log(`  written ${n}/${changed.length}`);
  }
  console.log(`done, ${n} rows written`);
}

main().finally(() => prisma.$disconnect());
