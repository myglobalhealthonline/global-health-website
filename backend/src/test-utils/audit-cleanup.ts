// ponytail: append-only triggers (20260710000000_append_only_audit_logs) block
// DELETE on AuditLog/MedicalAccessLog outside a transaction that sets the
// override GUC. Test cleanup needs the override; app code never should.
import type { Prisma, PrismaClient } from "@prisma/client";

/** Delete AuditLog rows in tests, bypassing the append-only DELETE trigger. */
export async function deleteAuditLogs(
  prisma: PrismaClient,
  where: Prisma.AuditLogWhereInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.allow_log_delete = 'on'`);
    await tx.auditLog.deleteMany({ where });
  });
}

/** Delete MedicalAccessLog rows in tests, bypassing the append-only DELETE trigger. */
export async function deleteMedicalAccessLogs(
  prisma: PrismaClient,
  where: Prisma.MedicalAccessLogWhereInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.allow_log_delete = 'on'`);
    await tx.medicalAccessLog.deleteMany({ where });
  });
}
