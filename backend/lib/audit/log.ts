import type { Prisma } from "@prisma/client";
import { prisma } from "../../src/index.js";

type AuditInput = {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  countryId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

/**
 * Append a row to `AdminAuditLog`. Never throws — auditing must not break the
 * mutation that triggered it. Errors are logged to stderr.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        countryId: input.countryId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log:", err);
  }
}
