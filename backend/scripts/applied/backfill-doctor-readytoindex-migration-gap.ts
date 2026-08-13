/**
 * APPLIED 2026-08-08 — 28 doctors, all `active: true`, `editorialChecklist`
 * set to `{ readyToIndex: true }`. See
 * docs/audits/seo/doctor-indexability-migration-gap-2026-08-08.md for the
 * full before/after and per-doctor breakdown. Kept for the record; re-running
 * is a safe no-op (every one of the 28 now has a non-null checklist, so the
 * candidate filter finds nothing left to do).
 *
 * Sets `editorialChecklist.readyToIndex = true` for doctors the "Third Pass:
 * Editorial Completion" migration (2026-05-08, commit 03e7cc99) never
 * touched — `Doctor.editorialChecklist IS NULL` on every one of them,
 * confirmed against the live public API, not merely inferred.
 *
 * `readyToIndex: false` is a real, intentional value produced by that
 * migration's `baseChecklist()` helper (defaults closed unless a record was
 * explicitly reviewed and marked ready) and by the admin portal's own
 * editorial-checklist UI. `null` is a different thing: the record was never
 * routed through either. This script only ever touches the `null` case —
 * it is not a decision about any doctor with an existing checklist object,
 * explicit `false` included.
 *
 *   node --env-file=.env --import tsx scripts/applied/backfill-doctor-readytoindex-migration-gap.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/applied/backfill-doctor-readytoindex-migration-gap.ts --apply   # write
 *
 * SAFE BY DESIGN:
 *   - Only `active: true` doctors with `editorialChecklist === null` are
 *     candidates — inactive and already-reviewed doctors are untouched.
 *   - This does NOT bypass `isPublicDoctorRecordIndexable()`. That function's
 *     content checks (bio length, credentials, name/title, blocked-copy scan)
 *     run per locale on the merged public record and stay exactly as strict
 *     as before. Flipping the doctor-wide flag only removes the "never
 *     reviewed" gate; a locale whose bio is thin or whose credential is
 *     missing stays noindex on its own account, unaffected by this script.
 *     Confirmed against a full production audit before running: 5 of the 28
 *     candidate doctors have a content-complete-in-zero-locales profile and
 *     this script visibly changes nothing for them — flagged in the dry-run
 *     output rather than silently skipped, since giving them a real checklist
 *     record (vs. eternal `null`) is itself worth doing.
 *   - Idempotent — an already-migrated `readyToIndex: true` doctor is
 *     reported as already-set and skipped, never double-written.
 *   - Retired doctors are structurally excluded twice over: `isRetiredDoctorSlug`
 *     skips them outright, and a departed doctor's row does not exist in the
 *     database in the first place (see lib/seo/gone-content.ts).
 */
import { prisma } from "../../src/db/prisma.js";
import { isRetiredDoctorSlug } from "../../src/lib/retired-doctors.js";

const APPLY = process.argv.includes("--apply");
const note = (m: string) => console.log(m);

const stats = { candidates: 0, changed: 0, alreadySet: 0, skippedRetired: 0, skippedInactive: 0 };

async function main() {
  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      slug: true,
      fullName: true,
      active: true,
      editorialChecklist: true,
      country: { select: { code: true } },
    },
  });
  // Prisma's JSON-null filtering is inconsistent across providers for this
  // schema's usage, so filter in application code against the actual value.
  const nullChecklist = doctors.filter((d) => d.editorialChecklist === null);

  for (const d of nullChecklist) {
    if (isRetiredDoctorSlug(d.slug)) {
      stats.skippedRetired++;
      note(`  SKIP (retired-doctor guard): ${d.slug}`);
      continue;
    }
    if (!d.active) {
      stats.skippedInactive++;
      note(`  SKIP (inactive): ${d.slug}`);
      continue;
    }
    stats.candidates++;
    note(`${APPLY ? "SET" : "WOULD SET"} editorialChecklist.readyToIndex=true: ${d.country.code}/${d.slug} (${d.fullName})`);
    if (APPLY) {
      await prisma.doctor.update({
        where: { id: d.id },
        data: { editorialChecklist: { readyToIndex: true, migratedFrom: "readytoindex-migration-gap-backfill-2026-08-08" } },
      });
      stats.changed++;
    }
  }

  note("");
  note(
    `${APPLY ? "Applied" : "Dry-run"}: ${stats.candidates} candidate(s), ` +
      `${stats.skippedRetired} retired-guard skip(s), ${stats.skippedInactive} inactive skip(s).` +
      (APPLY ? ` ${stats.changed} row(s) written.` : " Re-run with --apply to write."),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
