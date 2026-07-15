/**
 * Verification harness — run after the loaders (in either DRY or LIVE, though
 * the counts only mean something once a LIVE load has run). Reads source counts
 * from the NDJSON exports and compares them to the imported rows (isolated by
 * legacyMongoId), then HEAD-checks EVERY imported document's object in storage.
 *
 *   DUMP_DIR=... node --import tsx scripts/legacy-migration/verify.ts
 *
 * All checks must pass before cutover (see the plan's Verification section).
 * This is read-only.
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { requireDumpDir, banner } from "./lib/config.js";
import { readCollection, hasCollection } from "./lib/source.js";
import { MARKETS, patientCollection } from "./lib/markets.js";
import { collectDocArrays, NOTES_FIELD } from "./lib/mapping.js";
import { headObject, isObjectStorageConfigured } from "../../src/services/object-storage.js";

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label.padEnd(40)} ${detail}`);
}

async function sourceCount(coll: string): Promise<number> {
  if (!hasCollection(coll)) return 0;
  let n = 0;
  for await (const _ of readCollection(coll)) n += 1;
  return n;
}

async function main() {
  requireDumpDir();
  banner("verify (read-only)");

  // ── row counts ──
  const srcDoctors = await sourceCount("GlobalDoctors");
  const tgtDoctors = await prisma.doctor.count({ where: { legacyMongoId: { not: null } } });
  check("doctors", tgtDoctors <= srcDoctors && tgtDoctors > 0 === srcDoctors > 0,
    `source=${srcDoctors} imported=${tgtDoctors} (imported <= source; some may be skipped — read unresolved)`);

  let srcPatients = 0;
  let srcUploads = 0;
  let srcNotes = 0;
  for (const market of MARKETS) {
    const coll = patientCollection(market);
    if (!hasCollection(coll)) continue;
    for await (const doc of readCollection(coll)) {
      srcPatients += 1;
      for (const a of collectDocArrays(doc)) srcUploads += a.elements.length;
      if (Array.isArray(doc[NOTES_FIELD])) srcNotes += (doc[NOTES_FIELD] as unknown[]).length;
    }
  }
  const tgtPatients = await prisma.patientProfile.count({
    where: { legacyMongoIds: { isEmpty: false } },
  });
  check("patients (deduped)", tgtPatients > 0 && tgtPatients <= srcPatients,
    `source=${srcPatients} imported<=source due to email dedup; imported=${tgtPatients}`);

  const tgtDocs = await prisma.medicalDocument.count({ where: { legacyMongoId: { not: null } } });
  check("medical documents", tgtDocs <= srcUploads,
    `source UPLOAD…[]=${srcUploads} imported=${tgtDocs} (gap = missing objects / no key — read unresolved)`);

  const tgtNotes = await prisma.medicalNote.count({ where: { legacyMongoId: { not: null } } });
  check("medical notes", tgtNotes <= srcNotes,
    `source medicalNotes[]=${srcNotes} imported=${tgtNotes}`);

  const srcAppts = await sourceCount("Appointments");
  const tgtAppts = await prisma.appointment.count({ where: { legacyMongoId: { not: null } } });
  check("appointments", tgtAppts <= srcAppts + tgtPatients,
    `source=${srcAppts} imported=${tgtAppts} (may include synthetic legacy-records appts)`);

  const srcReviews = await sourceCount("reviewinvites");
  const tgtReviews = await prisma.reviewInvite.count({ where: { legacyMongoId: { not: null } } });
  check("review invites", tgtReviews <= srcReviews, `source=${srcReviews} imported=${tgtReviews}`);

  const srcConsents = await sourceCount("brazil_consent_submissions");
  const tgtConsents = await prisma.brazilConsentSubmission.count({
    where: { legacyMongoId: { not: null } },
  });
  check("brazil consents", tgtConsents <= srcConsents,
    `source=${srcConsents} imported=${tgtConsents} (gap = unresolved appointment FK)`);

  // ── every imported document's object must exist in storage ──
  console.log("\n── storage HEAD check (every imported document) ──");
  if (!isObjectStorageConfigured()) {
    check("object storage configured", false, "S3_*/Tigris not set — cannot verify objects");
  } else {
    let verified = 0;
    let missing = 0;
    let unverified = 0;
    const docs = await prisma.medicalDocument.findMany({
      where: { legacyMongoId: { not: null } },
      select: { id: true, fileKey: true },
    });
    for (const d of docs) {
      let head: Awaited<ReturnType<typeof headObject>> = null;
      let err: unknown = null;
      for (let a = 0; a < 4; a += 1) {
        try {
          head = await headObject(d.fileKey);
          err = null;
          break;
        } catch (e) {
          err = e;
        }
      }
      if (err) {
        unverified += 1;
        continue;
      }
      if (head) verified += 1;
      else {
        missing += 1;
        console.log(`      MISSING object for document ${d.id}: ${d.fileKey}`);
      }
    }
    check("all document objects present", missing === 0 && unverified === 0,
      `verified=${verified} missing=${missing} unverified(transient)=${unverified} of ${docs.length}`);
  }

  // ── unresolved audit ──
  console.log("\n── unresolved references (must be read + accepted) ──");
  const groups = await prisma.migrationUnresolved.groupBy({
    by: ["stage"],
    _count: { _all: true },
  });
  if (groups.length === 0) {
    console.log("  (none)");
  } else {
    for (const g of groups) console.log(`  ${g.stage.padEnd(20)} ${g._count._all}`);
    console.log("  -> review these rows before cutover: SELECT * FROM \"MigrationUnresolved\";");
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((err) => {
    console.error("verify failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
