/**
 * REPORT ONLY — how much of `Appointment.patientProfileId` a conservative
 * backfill could fill, and how much would stay null.
 *
 * The column ships nullable and unbackfilled on purpose: a guessed link is a
 * wrong-patient PHI disclosure, and `Appointment.userId` is the PURCHASER's
 * account, so it can never be the evidence on its own. This script exists so a
 * later backfill decision is made against real counts rather than an estimate,
 * and it is the preflight to run on a Railway DEVELOPMENT database first.
 *
 * It WRITES NOTHING. It prints counts, and — only with `--ids` — opaque
 * appointment ids for the unresolved and conflicting buckets so a human can
 * spot-check them. It never prints an email, name, phone, national id, address,
 * storage key or any clinical field.
 *
 * The three safe-candidate rules it counts, all requiring a concrete
 * PatientProfile and none of them email-only or fuzzy:
 *
 *   1. DEPENDENT   — an order line names a `FamilyMember` that carries a
 *                    `patientProfileId`. The dependent IS the patient. EVERY
 *                    such line is read, not the first: `OrderItem.appointmentId`
 *                    has no unique constraint, so one appointment can carry
 *                    several lines naming different dependents, and taking one
 *                    of them makes the answer depend on row order — a coin toss
 *                    between two real patients. Two distinct dependent profiles
 *                    is a conflict, not a candidate.
 *   2. SELF        — the appointment's account and the profile's account are
 *                    the same, the two email addresses agree, AND no order
 *                    line marks the appointment as booked for a dependent or
 *                    for someone else. The third condition is not redundant:
 *                    a dependent with no address of their own leaves the
 *                    appointment carrying the PURCHASER's email AND account,
 *                    so account-plus-address agreement alone is satisfied by
 *                    a booking that belongs to somebody else.
 *   3. FOLLOW_UP   — the appointment this one follows up from is already
 *                    linked. The patient of a follow-up is the patient of the
 *                    consultation it follows.
 *
 * `MedicalAccessLog` is deliberately NOT among them. Historical log rows were
 * written while the appointment resolver still reached for the purchaser's
 * account, so a row booked for a dependent can carry a perfectly consistent
 * run of log entries all naming the PAYER's profile. "Exactly one distinct
 * profile" therefore measures how consistently the old bug fired, not who the
 * patient was. It is still counted and printed, under
 * HISTORICAL_ACCESS_LOG — as evidence a human must corroborate against an
 * independent trusted relationship before acting on, never as a safe or
 * recommended automatic backfill.
 *
 * A row that qualifies under several rules with DIFFERENT profiles is counted
 * as CONFLICTING and is never a candidate. Anything left over is UNRESOLVED and
 * stays null — which is the safe outcome, not a failure.
 *
 * Usage (never against production):
 *   node --env-file=.env.<target> --import tsx \
 *     scripts/report-appointment-patient-link-backfill.ts [--ids]
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const SHOW_IDS = process.argv.includes("--ids");
/** Bounded so a large table cannot turn the report into a dump. */
const ID_SAMPLE = 25;
const PAGE = 1000;

/** Rules whose answer is safe to act on automatically. */
type Bucket = "DEPENDENT" | "SELF" | "FOLLOW_UP";

/** Counts only, plus opaque appointment ids. Nothing in this shape can hold an
 *  email, a name, an address, an identifier or any clinical value — which is
 *  what makes the printed output safe by construction rather than by review. */
export type BackfillReport = {
  total: number;
  linked: number;
  unlinked: number;
  backfillable: number;
  byBucket: Record<Bucket, number>;
  /** Unresolved rows whose only candidate came from a historical access log. */
  historicalAccessLogOnly: number;
  conflicting: number;
  unresolved: number;
  unresolvedIds: string[];
  conflictingIds: string[];
};

/**
 * The subset of the client this report touches, narrowed to the exact methods
 * it calls. Demanding whole model delegates would force any caller building a
 * scoped stub — the test does — into an `as unknown as` cast, which switches
 * off the very checking this type exists for; adding a call site here then
 * fails at runtime instead of at compile time.
 */
export type BackfillReportDb = {
  appointment: Pick<PrismaClient["appointment"], "count" | "findMany" | "findUnique">;
  orderItem: Pick<PrismaClient["orderItem"], "findFirst" | "findMany">;
  patientProfile: Pick<PrismaClient["patientProfile"], "findUnique">;
  medicalAccessLog: Pick<PrismaClient["medicalAccessLog"], "findMany">;
};

export async function collectBackfillReport(
  prisma: BackfillReportDb,
): Promise<BackfillReport> {
  const total = await prisma.appointment.count();
  const linked = await prisma.appointment.count({
    where: { patientProfileId: { not: null } },
  });

  const byBucket: Record<Bucket, number> = {
    DEPENDENT: 0,
    SELF: 0,
    FOLLOW_UP: 0,
  };
  /** Rows whose ONLY candidate came from a historical access log — reported
   *  for human review, never counted as backfillable. */
  let historicalAccessLogOnly = 0;
  let backfillable = 0;
  let conflicting = 0;
  let unresolved = 0;
  const unresolvedIds: string[] = [];
  const conflictingIds: string[] = [];

  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.appointment.findMany({
      where: { patientProfileId: null },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        userId: true,
        email: true,
        followUpFromAppointmentId: true,
      },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      /** profileId → the rules that produced it. */
      const candidates = new Map<string, Bucket[]>();
      const offer = (profileId: string | null | undefined, bucket: Bucket) => {
        if (!profileId) return;
        const seen = candidates.get(profileId) ?? [];
        seen.push(bucket);
        candidates.set(profileId, seen);
      };

      // 1. DEPENDENT — every dependent line, because `OrderItem.appointmentId`
      //    is not unique. Offering all of them is what turns two different
      //    named dependents into a CONFLICTING row instead of an arbitrary
      //    "safe" answer decided by whichever line the database returned first.
      const dependentLines = await prisma.orderItem.findMany({
        where: { appointmentId: row.id, familyMemberId: { not: null } },
        select: { familyMember: { select: { patientProfileId: true } } },
      });
      for (const line of dependentLines) {
        offer(line.familyMember?.patientProfileId, "DEPENDENT");
      }

      // 2. SELF — account AND address must agree, AND the order line must not
      //    say the consultation was for somebody else. A dependent with no
      //    address of their own carries the purchaser's on both columns, so
      //    without this check the payer's own profile is offered as SELF for a
      //    booking that is not theirs.
      const bookedForOther = await prisma.orderItem.findFirst({
        where: {
          appointmentId: row.id,
          OR: [{ familyMemberId: { not: null } }, { bookingForOther: true }],
        },
        select: { id: true },
      });
      if (row.userId && !bookedForOther) {
        const byUser = await prisma.patientProfile.findUnique({
          where: { userId: row.userId },
          select: { id: true, email: true },
        });
        if (byUser && byUser.email.toLowerCase() === row.email.trim().toLowerCase()) {
          offer(byUser.id, "SELF");
        }
      }

      // 3. FOLLOW_UP
      if (row.followUpFromAppointmentId) {
        const source = await prisma.appointment.findUnique({
          where: { id: row.followUpFromAppointmentId },
          select: { patientProfileId: true },
        });
        offer(source?.patientProfileId, "FOLLOW_UP");
      }

      // 4. HISTORICAL_ACCESS_LOG — counted, never offered as a candidate.
      //    A consistent run of log rows can consistently name the WRONG
      //    profile, because they were written while the resolver still
      //    reached for the purchaser's account. Feeding it into `candidates`
      //    would make it both a backfill answer and — worse — a second
      //    opinion that could turn a genuine conflict into a lone "safe"
      //    candidate. It is reported on its own line instead.
      const logged = await prisma.medicalAccessLog.findMany({
        where: { relatedAppointmentId: row.id },
        select: { patientProfileId: true },
        distinct: ["patientProfileId"],
        take: 2,
      });
      const historicalOnlyCandidate = logged.length === 1 && Boolean(logged[0].patientProfileId);

      if (candidates.size === 0) {
        // No trusted rule fired. A lone access-log row does not rescue it.
        if (historicalOnlyCandidate) historicalAccessLogOnly += 1;
        unresolved += 1;
        if (unresolvedIds.length < ID_SAMPLE) unresolvedIds.push(row.id);
      } else if (candidates.size > 1) {
        conflicting += 1;
        if (conflictingIds.length < ID_SAMPLE) conflictingIds.push(row.id);
      } else {
        backfillable += 1;
        // Attribute to the strongest rule that produced the single answer.
        const rules = [...candidates.values()][0];
        const order: Bucket[] = ["DEPENDENT", "FOLLOW_UP", "SELF"];
        const best = order.find((b) => rules.includes(b));
        if (best) byBucket[best] += 1;
      }
    }

    if (rows.length < PAGE) break;
  }

  return {
    total,
    linked,
    unlinked: total - linked,
    backfillable,
    byBucket,
    historicalAccessLogOnly,
    conflicting,
    unresolved,
    unresolvedIds,
    conflictingIds,
  };
}

/** Renders the report. Every interpolation is a number or an opaque cuid. */
export function formatBackfillReport(report: BackfillReport, showIds = false): string {
  const lines = [
    "Appointment → patient link backfill preflight (report only, no writes)",
    "─".repeat(72),
    `appointments (total)          ${report.total}`,
    `  already linked              ${report.linked}`,
    `  unlinked                    ${report.unlinked}`,
    `    safely backfillable       ${report.backfillable}`,
    ...Object.entries(report.byBucket).map(
      ([bucket, count]) => `      via ${bucket.padEnd(22)}${count}`,
    ),
    `    conflicting candidates    ${report.conflicting}   (never backfilled)`,
    `    unresolved                ${report.unresolved}   (stays null — safe)`,
    `      of which HISTORICAL_ACCESS_LOG  ${report.historicalAccessLogOnly}   ` +
      "(evidence for human review — NOT safe to backfill)",
  ];
  if (showIds) {
    lines.push(
      "",
      "Opaque appointment ids only — no patient data.",
      `conflicting (first ${ID_SAMPLE}): ${report.conflictingIds.join(", ") || "none"}`,
      `unresolved  (first ${ID_SAMPLE}): ${report.unresolvedIds.join(", ") || "none"}`,
    );
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  // Prisma 7 requires an explicit driver adapter — a bare `new PrismaClient()`
  // throws at construction, so the report could not run at all without this.
  // A dedicated pool rather than `src/db/prisma.ts`, so the script stays a
  // standalone read-only tool with no application config to load.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    console.log(formatBackfillReport(await collectBackfillReport(prisma), SHOW_IDS));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Importing this module (the test does) must not run the report.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    // The message is ours; a Prisma error can name a column but never a value.
    console.error("report failed:", err instanceof Error ? err.message : "unknown error");
    process.exit(1);
  });
}
