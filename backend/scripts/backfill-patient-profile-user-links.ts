/**
 * Repair the PatientProfile rows that carry a PATIENT User's address but no
 * `userId`, by pointing each one at that account.
 *
 * WHY THIS EXISTS
 * `PatientProfile` is the clinical chart, `User` is the login account, and
 * `PatientProfile.userId` is the only link between them. `assertMedicalAccess`
 * reads exactly that column for a PATIENT actor and denies with
 * PATIENT_NOT_OWN_RECORD when it is null — so an unlinked chart locks a
 * patient out of their OWN records the moment the guard is enforced. On
 * 2026-09-07 production held 532 such rows: charts loaded on 2026-07-16 by
 * legacy-migration/load-contacts.ts, accounts minted on 2026-08-02 by
 * patient-platform-invite.ts, and nothing joining the two. The leak itself is
 * fixed in the invite script; this repairs the rows it already left behind.
 *
 * SAFETY
 * Dry run by default — `--apply` is the only thing that writes. A candidate
 * needs EXACTLY one PATIENT User at that address, an account that holds no
 * other chart, and a chart that is neither anonymized nor a deletion
 * tombstone; everything else is skipped and counted by reason, never guessed
 * at. The write is one transaction of `updateMany`s each keyed on the row id
 * AND `userId IS NULL`, so a chart claimed between the scan and the write is
 * left alone rather than clobbered, and the run aborts if the number of rows
 * actually updated does not equal the number of candidates.
 *
 * Address matching is exact (both sides are stored lowercased by every
 * writer). Confirmed against production on 2026-09-07: exact and `lower()`
 * matching select the identical 532 rows, so there is no case leak to chase.
 *
 * Prints counts and opaque ids only — never an email, name, or clinical value.
 *
 * Usage:
 *   node --env-file=.env --import tsx \
 *     scripts/backfill-patient-profile-user-links.ts            # dry run
 *   node --env-file=.env --import tsx \
 *     scripts/backfill-patient-profile-user-links.ts --apply    # writes
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const APPLY = process.argv.includes("--apply");
/** Bounded so a large skip bucket cannot turn the report into a dump. */
const ID_SAMPLE = 25;

/** Deletion tombstone address minted by the anonymization path. */
const TOMBSTONE_EMAIL_PREFIX = "deleted-";
const TOMBSTONE_EMAIL_SUFFIX = "@deleted.invalid";

export type SkipReason =
  /** More than one PATIENT User answers to that address (case variants). */
  | "AMBIGUOUS_MULTIPLE_USERS"
  /** The only account at that address already holds a DIFFERENT chart.
   *  `PatientProfile.userId` is unique, and two charts for one person is a
   *  merge decision for a human, not something to guess at here. */
  | "ACCOUNT_HOLDS_ANOTHER_CHART"
  /** Erased under a data-deletion request. Re-attaching it to a live account
   *  would undo the erasure. */
  | "ANONYMIZED_OR_TOMBSTONE";

/** Counts and opaque ids only — nothing in this shape can hold an email, a
 *  name, an address, an identifier or any clinical value, which is what makes
 *  the printed output safe by construction rather than by review. */
export type LinkBackfillPlan = {
  /** Every PatientProfile row with `userId IS NULL`, whatever the reason. */
  unlinkedTotal: number;
  /** Of those, the ones with at least one PATIENT User at the same address. */
  withPatientAccount: number;
  candidates: { patientProfileId: string; userId: string }[];
  skipped: Record<SkipReason, string[]>;
};

export type LinkBackfillDb = Pick<PrismaClient, "$queryRaw">;

/** One row per (unlinked chart × PATIENT account at the same address). */
type ScanRow = {
  patientProfileId: string;
  erased: boolean;
  userId: string;
  /** The chart that account already holds, if any. `PatientProfile.userId` is
   *  unique, so this can never multiply the row out. */
  otherChartId: string | null;
};

export async function collectLinkBackfillPlan(
  prisma: LinkBackfillDb,
): Promise<LinkBackfillPlan> {
  const [{ n: unlinkedTotal }] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM "PatientProfile" WHERE "userId" IS NULL
  `;

  // ONE query rather than one per chart: several hundred unlinked rows against
  // a production database over a proxy is the difference between a second and
  // several minutes.
  //
  // The join is on `lower(email)` even though production proved exact and
  // `lower()` matching select the identical 532 rows. That is not redundancy:
  // matching exactly would mean a case-variant second account never appears in
  // this scan at all, and the ambiguity it creates would be silently resolved
  // in favour of whichever address happens to match byte-for-byte. Matching
  // case-insensitively is what lets the AMBIGUOUS_MULTIPLE_USERS skip below
  // actually see it.
  const rows = await prisma.$queryRaw<ScanRow[]>`
    SELECT p.id                                       AS "patientProfileId",
           (p."anonymizedAt" IS NOT NULL
             OR p.email LIKE ${`${TOMBSTONE_EMAIL_PREFIX}%${TOMBSTONE_EMAIL_SUFFIX}`}) AS "erased",
           u.id                                       AS "userId",
           other.id                                   AS "otherChartId"
      FROM "PatientProfile" p
      JOIN "User" u
        ON lower(u.email) = lower(p.email)
       AND u.role = 'PATIENT'
      LEFT JOIN "PatientProfile" other
        ON other."userId" = u.id
     WHERE p."userId" IS NULL
  `;

  // A chart with no account at that address never appears above, and that is
  // correct: a guest chart with nobody to link it to is the normal resting
  // state, not a defect — so it is neither a candidate nor a skip.
  const byProfile = new Map<string, ScanRow[]>();
  for (const row of rows) {
    byProfile.set(row.patientProfileId, [...(byProfile.get(row.patientProfileId) ?? []), row]);
  }

  const plan: LinkBackfillPlan = {
    unlinkedTotal,
    withPatientAccount: byProfile.size,
    candidates: [],
    skipped: {
      AMBIGUOUS_MULTIPLE_USERS: [],
      ACCOUNT_HOLDS_ANOTHER_CHART: [],
      ANONYMIZED_OR_TOMBSTONE: [],
    },
  };

  for (const [patientProfileId, matches] of byProfile) {
    if (matches[0].erased) {
      plan.skipped.ANONYMIZED_OR_TOMBSTONE.push(patientProfileId);
      continue;
    }
    if (matches.length > 1) {
      plan.skipped.AMBIGUOUS_MULTIPLE_USERS.push(patientProfileId);
      continue;
    }
    const [match] = matches;
    if (match.otherChartId !== null && match.otherChartId !== patientProfileId) {
      plan.skipped.ACCOUNT_HOLDS_ANOTHER_CHART.push(patientProfileId);
      continue;
    }
    plan.candidates.push({ patientProfileId, userId: match.userId });
  }

  return plan;
}

function totalSkipped(plan: LinkBackfillPlan): number {
  return Object.values(plan.skipped).reduce((n, ids) => n + ids.length, 0);
}

export function formatLinkBackfillPlan(plan: LinkBackfillPlan, apply: boolean): string {
  const lines = [
    "",
    apply
      ? "PatientProfile -> User link backfill — APPLY"
      : "PatientProfile -> User link backfill — DRY RUN (nothing written)",
    "",
    `  PatientProfile with userId null   ${plan.unlinkedTotal}`,
    `    with a PATIENT account          ${plan.withPatientAccount}`,
    `      candidates                    ${plan.candidates.length}`,
    `      skipped                       ${totalSkipped(plan)}`,
  ];
  for (const [reason, ids] of Object.entries(plan.skipped)) {
    lines.push(`        ${reason.padEnd(28)}${ids.length}`);
  }
  lines.push(
    "",
    `  would update                      ${plan.candidates.length}` +
      (apply ? "" : "   (re-run with --apply)"),
  );
  const populated = Object.entries(plan.skipped).filter(([, ids]) => ids.length > 0);
  if (populated.length > 0) {
    lines.push("", "Opaque PatientProfile ids of the skipped rows — no patient data.");
    for (const [reason, ids] of populated) {
      lines.push(`  ${reason} (first ${ID_SAMPLE}): ${ids.slice(0, ID_SAMPLE).join(", ")}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export type LinkBackfillApplyDb = Pick<PrismaClient, "$transaction">;

/**
 * Link every candidate in ONE transaction, and record the run.
 *
 * ONE set-based statement, not a loop of `updateMany`s. The loop was the first
 * attempt and it failed against production on 2026-09-07: 532 sequential round
 * trips over the Railway proxy took longer than the interactive transaction's
 * lifetime and the whole thing rolled back at 120 s. Raising the timeout would
 * have treated the symptom — the work is one UPDATE, so it should cost one
 * round trip.
 *
 * The candidate ids are bound as parameters, never interpolated. The
 * `p."userId" IS NULL` predicate is carried into the statement, so a chart
 * claimed between the scan and the write is skipped rather than re-pointed —
 * and the row-count mismatch that produces aborts the transaction, because a
 * partial backfill whose printed count does not match what happened is worse
 * than no backfill at all.
 */
export async function applyLinkBackfill(
  prisma: LinkBackfillApplyDb,
  plan: LinkBackfillPlan,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    let updated = 0;
    if (plan.candidates.length > 0) {
      const params: string[] = [];
      const tuples = plan.candidates.map((candidate, i) => {
        params.push(candidate.patientProfileId, candidate.userId);
        // Cast the first tuple only — Postgres infers the rest of the VALUES
        // column types from it, and without a cast it cannot resolve the
        // parameter types at all in this position.
        return i === 0 ? `($1::text, $2::text)` : `($${i * 2 + 1}, $${i * 2 + 2})`;
      });
      updated = await tx.$executeRawUnsafe(
        `UPDATE "PatientProfile" AS p
            SET "userId" = v.user_id
           FROM (VALUES ${tuples.join(", ")}) AS v(profile_id, user_id)
          WHERE p.id = v.profile_id
            AND p."userId" IS NULL`,
        ...params,
      );
    }
    if (updated !== plan.candidates.length) {
      throw new Error(
        `link backfill aborted: updated ${updated} of ${plan.candidates.length} candidates — a chart was claimed mid-run`,
      );
    }
    // Counts only, no addresses. There is no AuditAction member for this
    // one-off repair, and adding one needs a migration that production will
    // not have when this runs (the backfill deliberately precedes the deploy
    // that enforces the guard), so the job name lives in entityType/metadata.
    await tx.auditLog.create({
      data: {
        action: "PATIENT_PROFILE_UPDATED",
        entityType: "PATIENT_PROFILE_USER_LINK_BACKFILL",
        entityId: "PATIENT_PROFILE_USER_LINK_BACKFILL",
        actorUserId: null,
        actorRole: "SYSTEM",
        metadata: {
          job: "PATIENT_PROFILE_USER_LINK_BACKFILL",
          unlinkedTotal: plan.unlinkedTotal,
          withPatientAccount: plan.withPatientAccount,
          candidates: plan.candidates.length,
          updated,
          skipped: Object.fromEntries(
            Object.entries(plan.skipped).map(([reason, ids]) => [reason, ids.length]),
          ),
        },
      },
    });
    return updated;
  }, { maxWait: 15_000, timeout: 120_000 });
}

async function main(): Promise<void> {
  // Prisma 7 requires an explicit driver adapter — a bare `new PrismaClient()`
  // throws at construction. A dedicated pool rather than src/db/prisma.ts, so
  // this stays a standalone tool with no application config to load.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const plan = await collectLinkBackfillPlan(prisma);
    console.log(formatLinkBackfillPlan(plan, APPLY));
    if (!APPLY) return;
    const updated = await applyLinkBackfill(prisma, plan);
    console.log(`  APPLIED — ${updated} PatientProfile row(s) linked to their account.\n`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Importing this module (the test does) must not run the backfill.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    // The message is ours; a Prisma error can name a column but never a value.
    console.error("backfill failed:", err instanceof Error ? err.message : "unknown error");
    process.exit(1);
  });
}
