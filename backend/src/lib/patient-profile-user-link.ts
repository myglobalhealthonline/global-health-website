import type { PrismaClient } from "@prisma/client";

/** The minimum Prisma surface this helper needs — so a `$transaction`
 *  callback client is accepted alongside the singleton. */
type ProfileLinkDb = {
  patientProfile: Pick<PrismaClient["patientProfile"], "findFirst" | "updateMany">;
};

export type ProfileLinkOutcome =
  /** The chart was unowned and now points at this account. */
  | "linked"
  /** This account already holds the chart at that address. */
  | "already-linked"
  /** A chart exists at that address but belongs to a different account. */
  | "owned-by-another-account"
  /** This account already holds a DIFFERENT chart. `PatientProfile.userId` is
   *  unique, so linking would raise P2002 — and the two charts are a merge
   *  decision for a human, not something to guess at. */
  | "account-holds-another-chart"
  /** No PatientProfile carries that address. */
  | "no-chart";

/**
 * Point an existing, unlinked `PatientProfile` at the `User` that owns the same
 * address.
 *
 * Why this exists: `PatientProfile` is the clinical chart and `User` is the
 * login account, joined by `PatientProfile.userId`. Every medical-access
 * decision for a PATIENT actor reads that column — `assertMedicalAccess`
 * denies with PATIENT_NOT_OWN_RECORD when it is null — so a chart minted
 * before its account exists locks the patient out of their own records the
 * moment the guard is enforced. Any writer that creates one side while the
 * other may already exist has to close the link.
 *
 * The `userId: null` predicate on the write is load-bearing, not defensive: it
 * makes this a claim of an UNOWNED chart rather than a move, so a chart that
 * already belongs to somebody else is never re-pointed even if the read above
 * raced. `updateMany` (not `update`) keeps that predicate expressible.
 *
 * Address matching is exact after lowercasing. `PatientProfile.email` and
 * `User.email` are both stored lowercased by every writer, and a production
 * check on 2026-09-07 confirmed exact and `lower()` matching select the
 * identical 532 rows.
 */
export async function linkPatientProfileToUserByEmail(
  db: ProfileLinkDb,
  input: { email: string; userId: string },
): Promise<ProfileLinkOutcome> {
  const email = input.email.trim().toLowerCase();

  const chart = await db.patientProfile.findFirst({
    where: { email },
    select: { id: true, userId: true },
  });
  if (!chart) return "no-chart";
  if (chart.userId === input.userId) return "already-linked";
  if (chart.userId !== null) return "owned-by-another-account";

  // Checked BEFORE the write rather than by catching P2002, so the caller gets
  // a reason it can count and report instead of an aborted batch.
  const heldElsewhere = await db.patientProfile.findFirst({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (heldElsewhere) return "account-holds-another-chart";

  const { count } = await db.patientProfile.updateMany({
    where: { id: chart.id, userId: null },
    data: { userId: input.userId },
  });
  // count === 0 means the chart was claimed between the read and the write.
  return count === 1 ? "linked" : "owned-by-another-account";
}
