/**
 * Merge ONE legacy-import duplicate Doctor into the native profile of the same
 * person, by id.
 *
 * `merge-doctors.ts` does this in bulk, matched by name. It deliberately skips
 * a duplicate whose name does not match — "Dr Mustafa Usman Yoosuf" is neither
 * an exact match for nor a token subset of "Dr Muhammad Usman Yoosuf" — and it
 * cannot be re-run against one that has since acquired dependent rows, because
 * its merge path is a plain `doctor.delete` and both `GeneratedDocument` and
 * `MedicalNote` reference `Doctor` with onDelete RESTRICT.
 *
 * This script is the manual-review path that leaves behind: an operator names
 * the two ids, every dependent row is repointed, and only then is the
 * duplicate deleted. Its `DoctorCountry` rows cascade with it, which is what
 * frees a registration number the duplicate was holding (SC-2, see
 * docs/audits/security/sc2-doctorcountry-registration-uniqueness-2026-09-07.md).
 *
 * Everything runs in ONE transaction, so a failure at any step leaves the
 * database exactly as it was. Before writing anything it dumps the current
 * state of every row it will touch to a JSON file — this database has no
 * automated backups, so that file is the only way back.
 *
 *   dry run (default):
 *     node --env-file=.env --import tsx scripts/legacy-migration/merge-duplicate-doctor.ts
 *   for real:
 *     DRY_RUN=false node --env-file=.env --import tsx scripts/legacy-migration/merge-duplicate-doctor.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { prisma } from "../../src/db/prisma.js";
import { DRY_RUN } from "./lib/config.js";

/** The legacy-import duplicate that gets absorbed and deleted. */
const DUPLICATE_ID = process.env.DUPLICATE_DOCTOR_ID ?? "cmrmbiq8q001zhww8xmh1bg48";
/** The real profile everything is repointed onto. */
const KEEP_ID = process.env.KEEP_DOCTOR_ID ?? "cmqwle36k0004rgjuepo2djjx";

const SNAPSHOT_PATH = resolve(
  process.env.SNAPSHOT_PATH ?? `./merge-duplicate-doctor-${DUPLICATE_ID}.snapshot.json`,
);

async function main(): Promise<void> {
  const [duplicate, keep] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id: DUPLICATE_ID },
      select: { id: true, fullName: true, slug: true, legacyMongoId: true, active: true },
    }),
    prisma.doctor.findUnique({
      where: { id: KEEP_ID },
      select: { id: true, fullName: true, slug: true, legacyMongoId: true, active: true },
    }),
  ]);

  if (!duplicate) throw new Error(`duplicate doctor ${DUPLICATE_ID} not found`);
  if (!keep) throw new Error(`target doctor ${KEEP_ID} not found`);
  if (duplicate.id === keep.id) throw new Error("duplicate and target are the same row");
  if (keep.legacyMongoId && keep.legacyMongoId !== duplicate.legacyMongoId) {
    // Moving the duplicate's legacy id would overwrite a different one and
    // break idempotency for whichever import owns it.
    throw new Error(
      `target already carries a different legacyMongoId (${keep.legacyMongoId}) — resolve by hand`,
    );
  }

  // Everything that points at the duplicate. Kept in one place so the snapshot,
  // the dry-run report and the writes cannot drift apart.
  const [appointments, doctorCountries, generatedDocuments, medicalNotes] = await Promise.all([
    prisma.appointment.findMany({
      where: { doctorId: DUPLICATE_ID },
      select: { id: true, countryCode: true, status: true, createdAt: true },
    }),
    prisma.doctorCountry.findMany({
      where: { doctorId: DUPLICATE_ID },
      select: {
        id: true,
        countryId: true,
        chamberEntity: true,
        registrationNumber: true,
        division: true,
        active: true,
        isVerified: true,
        verifiedAt: true,
      },
    }),
    prisma.generatedDocument.findMany({
      where: { doctorId: DUPLICATE_ID },
      select: { id: true, appointmentId: true, documentType: true, sentToPatient: true },
    }),
    prisma.medicalNote.findMany({
      where: { createdByDoctorId: DUPLICATE_ID },
      select: { id: true, appointmentId: true, createdAt: true },
    }),
  ]);

  console.log(`${DRY_RUN ? "[dry] " : ""}merging duplicate into native profile`);
  console.log(`  duplicate : ${duplicate.fullName}  (${duplicate.id}, slug ${duplicate.slug}, active=${duplicate.active})`);
  console.log(`  keep      : ${keep.fullName}  (${keep.id}, slug ${keep.slug}, active=${keep.active})`);
  console.log(`  legacyMongoId to move: ${duplicate.legacyMongoId ?? "(none)"}`);
  console.log("");
  console.log(`  Appointment.doctorId            repoint ${appointments.length}`);
  console.log(`  GeneratedDocument.doctorId      repoint ${generatedDocuments.length}`);
  console.log(`  MedicalNote.createdByDoctorId   repoint ${medicalNotes.length}`);
  console.log(`  DoctorCountry                   delete  ${doctorCountries.length} (cascades with the doctor)`);
  for (const dc of doctorCountries) {
    console.log(
      `    - ${dc.id}  ${dc.chamberEntity ?? "?"} ${dc.registrationNumber ?? "(no number)"}` +
        `  active=${dc.active} isVerified=${dc.isVerified}`,
    );
  }
  console.log(`  Doctor                          delete  1`);

  const snapshot = {
    takenAt: new Date().toISOString(),
    duplicate,
    keep,
    repointed: { appointments, generatedDocuments, medicalNotes },
    deleted: { doctorCountries },
  };

  if (DRY_RUN) {
    console.log(`\n[dry] nothing written. Snapshot would go to ${SNAPSHOT_PATH}`);
    console.log("[dry] re-run with DRY_RUN=false to apply.");
    return;
  }

  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`\nsnapshot written to ${SNAPSHOT_PATH}`);

  await prisma.$transaction(async (tx) => {
    await tx.appointment.updateMany({
      where: { doctorId: DUPLICATE_ID },
      data: { doctorId: KEEP_ID },
    });
    await tx.generatedDocument.updateMany({
      where: { doctorId: DUPLICATE_ID },
      data: { doctorId: KEEP_ID },
    });
    await tx.medicalNote.updateMany({
      where: { createdByDoctorId: DUPLICATE_ID },
      data: { createdByDoctorId: KEEP_ID },
    });
    // Delete first, then stamp: `legacyMongoId` is unique, so the target cannot
    // take the value while the duplicate still holds it. Both inside the same
    // transaction, so the id is never lost even if the stamp fails.
    await tx.doctor.delete({ where: { id: DUPLICATE_ID } });
    if (duplicate.legacyMongoId) {
      await tx.doctor.update({
        where: { id: KEEP_ID },
        data: { legacyMongoId: duplicate.legacyMongoId },
      });
    }
  });

  const [remaining, leftover] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id: KEEP_ID },
      select: { id: true, fullName: true, legacyMongoId: true },
    }),
    prisma.doctor.findUnique({ where: { id: DUPLICATE_ID }, select: { id: true } }),
  ]);
  console.log(`\nduplicate row gone: ${leftover === null}`);
  console.log(`kept profile: ${JSON.stringify(remaining)}`);
}

main()
  .catch((e) => {
    console.error("merge-duplicate-doctor failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
