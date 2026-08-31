import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { deleteObject, isMediaStorageConfigured } from "../../services/object-storage.js";

export type RecruitmentRetentionResult = {
  candidates: number;
  purged: number;
  failed: number;
  oldestOverdueMs: number;
  enforced: boolean;
  backlogRemaining: boolean;
};

const RETENTION_BATCH_SIZE = 100;
const RETENTION_RUN_CAP = 1000;

type RetentionCursor = { id: string; retentionUntil: Date };

function dueWhere(now: Date, cursor?: RetentionCursor): Prisma.JobApplicationWhereInput {
  return {
    retentionUntil: { lte: now },
    ...(cursor
      ? {
          OR: [
            { retentionUntil: { gt: cursor.retentionUntil } },
            { retentionUntil: cursor.retentionUntil, id: { gt: cursor.id } },
          ],
        }
      : {}),
  };
}

function loadBatch(now: Date, cursor?: RetentionCursor) {
  return prisma.jobApplication.findMany({
    where: dueWhere(now, cursor),
    select: { id: true, cvStorageKey: true, retentionUntil: true },
    orderBy: [{ retentionUntil: "asc" }, { id: "asc" }],
    take: RETENTION_BATCH_SIZE,
  });
}

async function hasRemainingBacklog(now: Date, cursor: RetentionCursor): Promise<boolean> {
  return Boolean(
    await prisma.jobApplication.findFirst({
      where: dueWhere(now, cursor),
      select: { id: true },
      orderBy: [{ retentionUntil: "asc" }, { id: "asc" }],
    }),
  );
}

export async function runRecruitmentRetentionSweep(
  now = new Date(),
): Promise<RecruitmentRetentionResult> {
  let rows = await loadBatch(now);
  const oldestOverdueMs = rows[0] ? Math.max(0, now.getTime() - rows[0].retentionUntil.getTime()) : 0;
  if (!env.RECRUITMENT_RETENTION_ENFORCE) {
    const cursor = rows.at(-1);
    const backlogRemaining =
      rows.length === RETENTION_BATCH_SIZE && cursor
        ? await hasRemainingBacklog(now, cursor)
        : false;
    return {
      candidates: rows.length,
      purged: 0,
      failed: 0,
      oldestOverdueMs,
      enforced: false,
      backlogRemaining,
    };
  }
  if (!isMediaStorageConfigured()) {
    const cursor = rows.at(-1);
    const backlogRemaining =
      rows.length === RETENTION_BATCH_SIZE && cursor
        ? await hasRemainingBacklog(now, cursor)
        : false;
    return {
      candidates: rows.length,
      purged: 0,
      failed: rows.length,
      oldestOverdueMs,
      enforced: true,
      backlogRemaining,
    };
  }

  let candidates = 0;
  let purged = 0;
  let failed = 0;
  let backlogRemaining = false;
  while (rows.length > 0) {
    candidates += rows.length;
    for (const row of rows) {
      try {
        // Object-first: a DB failure leaves a discoverable row for the next idempotent retry.
        await deleteObject(row.cvStorageKey);
        const deleted = await prisma.$transaction(async (tx) => {
          const result = await tx.jobApplication.deleteMany({ where: { id: row.id } });
          if (result.count !== 1) return false;
          await tx.auditLog.create({
            data: {
              actorRole: "SYSTEM",
              action: "JOB_APPLICATION_PURGED",
              entityType: "JobApplication",
              entityId: row.id,
              metadata: { reason: "RETENTION" },
            },
          });
          return true;
        });
        if (deleted) purged++;
      } catch {
        failed++;
      }
    }

    const cursor = rows.at(-1)!;
    if (rows.length < RETENTION_BATCH_SIZE) break;
    if (candidates >= RETENTION_RUN_CAP) {
      backlogRemaining = await hasRemainingBacklog(now, cursor);
      break;
    }
    rows = await loadBatch(now, cursor);
  }
  return {
    candidates,
    purged,
    failed,
    oldestOverdueMs,
    enforced: true,
    backlogRemaining,
  };
}
