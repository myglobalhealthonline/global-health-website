/**
 * PHI Access Recovery Plan (docs/plans/security/phi-access-recovery-plan-2026-07-17.md)
 * Task 2 — backfill `PatientConsent` so the medical-access guard's direct-consent
 * path (`MEDICAL_ACCESS_DIRECT`) doesn't lock every pre-existing patient's doctor
 * out once `MEDICAL_ACCESS_ENFORCE` flips on.
 *
 * For every `PatientProfile` whose LATEST `MEDICAL_ACCESS_DIRECT` row is missing,
 * insert one: `consentValue: true`, `source: "BACKFILL_2026_07"`.
 *
 * PatientConsent is append-only (see schema.prisma:3366-3384) — "latest row per
 * (patientProfileId, consentType) wins" — so this never updates/deletes a row,
 * only appends. That also means it is safe to insert-if-missing per this
 * script's own last run without re-checking every time: once a profile has any
 * MEDICAL_ACCESS_DIRECT row (whichever value), it is left alone. Re-running the
 * script inserts nothing new for profiles it already covered.
 *
 * An explicit revocation (latest row consentValue=false) is NEVER overridden —
 * those profiles are counted and skipped separately, never touched.
 *
 * Dry-run by default (prints counts only). Pass --apply to write, in batches.
 *
 *   pnpm --filter backend exec tsx scripts/backfill-patient-consent.ts            # dry-run
 *   pnpm --filter backend exec tsx scripts/backfill-patient-consent.ts --apply    # writes
 *
 * Run with --env-file=.env (P1000 gotcha — Prisma needs DATABASE_URL loaded
 * explicitly outside a few entrypoints). Run on Dev DB first, verify counts,
 * then owner runs on Production.
 *
 * Legal note: defensible under GDPR Art 9(2)(h) (care provision) — flagged for
 * legal sign-off, not blocking this backfill.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const CONSENT_TYPE = "MEDICAL_ACCESS_DIRECT";
const SOURCE = "BACKFILL_2026_07";
const BATCH_SIZE = 200;

const APPLY = process.argv.includes("--apply");

async function main() {
  let totalProfiles = 0;
  let alreadyConsented = 0; // latest MEDICAL_ACCESS_DIRECT row exists, consentValue=true
  let revokedSkipped = 0; // latest row exists, consentValue=false — never override
  let toInsert = 0;
  let inserted = 0;
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, globalHealthNumber: true },
    });
    if (rows.length === 0) break;

    for (const profile of rows) {
      totalProfiles += 1;

      const latest = await prisma.patientConsent.findFirst({
        where: { patientProfileId: profile.id, consentType: CONSENT_TYPE },
        orderBy: { createdAt: "desc" },
        select: { consentValue: true },
      });

      if (latest === null) {
        toInsert += 1;
        if (APPLY) {
          await prisma.patientConsent.create({
            data: {
              patientProfileId: profile.id,
              globalHealthNumber: profile.globalHealthNumber ?? null,
              consentType: CONSENT_TYPE,
              consentValue: true,
              source: SOURCE,
              changedByRole: "SYSTEM",
            },
          });
          inserted += 1;
        }
        continue;
      }

      if (latest.consentValue === true) {
        alreadyConsented += 1;
      } else {
        revokedSkipped += 1;
      }
    }

    cursor = rows[rows.length - 1].id;
    if (rows.length < BATCH_SIZE) break;
  }

  console.log(
    [
      `[backfill-patient-consent] mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
      `total profiles=${totalProfiles}`,
      `already consented=${alreadyConsented}`,
      `revoked (skipped, never overridden)=${revokedSkipped}`,
      `to insert=${toInsert}`,
      APPLY ? `inserted=${inserted}` : `(pass --apply to write)`,
    ].join("\n  "),
  );
}

main()
  .catch((err) => {
    console.error("[backfill-patient-consent] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
