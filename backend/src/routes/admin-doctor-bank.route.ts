import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { decryptPhi } from "../lib/crypto/phi-crypto.js";
import { maskIban } from "../utils/iban.js";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin read of a doctor's payout bank details. Finance uses this to process
 * payments. Two modes:
 *   GET /api/admin/doctors/:doctorId/bank            → masked (last 4 only)
 *   GET /api/admin/doctors/:doctorId/bank?reveal=1   → full decrypted IBAN
 *
 * The full-IBAN read is audited (DOCTOR_BANK_VIEWED) so every access to a
 * doctor's account number is traceable. Admin-only.
 */

const idParam = z.string().trim().min(1).max(64);

const adminDoctorBankRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get<{ Params: { doctorId: string }; Querystring: { reveal?: string } }>(
    "/api/admin/doctors/:doctorId/bank",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.doctorId).success) {
        return reply.status(400).send(errorResponse("Invalid doctor id"));
      }
      const reveal = request.query.reveal === "1" || request.query.reveal === "true";
      try {
        const row = await prisma.doctorBankAccount.findUnique({
          where: { doctorId: request.params.doctorId },
          select: { accountHolder: true, ibanEncrypted: true, ibanLast4: true, bic: true },
        });

        const ibanSet = Boolean(row?.ibanEncrypted);
        let iban: string | null = null;
        if (reveal && row?.ibanEncrypted) {
          iban = decryptPhi(row.ibanEncrypted);
          const actor = resolveAdminSessionActor(request);
          // S-008: full-IBAN reveal must be traceable — fail the reveal
          // (not just log a warning) if the audit write itself fails,
          // rather than returning un-audited PHI/financial data.
          await recordCriticalAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? "ADMIN",
            action: "DOCTOR_BANK_VIEWED",
            entityType: "Doctor",
            entityId: request.params.doctorId,
            request,
          });
        }

        return okResponse({
          bank: {
            accountHolder: row?.accountHolder ?? null,
            bic: row?.bic ?? null,
            ibanLast4: row?.ibanLast4 ?? null,
            ibanMasked: maskIban(row?.ibanLast4),
            ibanSet,
            ...(reveal ? { iban } : {}),
          },
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load bank details"));
      }
    },
  );
};

export default adminDoctorBankRoute;
