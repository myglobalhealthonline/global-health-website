import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyGlobalAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse } from "../utils/response.js";
import { prisma } from "../db/prisma.js";
import { decryptPhi } from "../lib/crypto/phi-crypto.js";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import {
  adminAppointmentsReport,
  adminPatientsReport,
  adminServicesReport,
  doctorPayoutStatementReport,
  type ReportFilters,
} from "../modules/reports/report-datasets.js";
import {
  serializeReport,
  type ReportTable,
} from "../modules/reports/report-formatters.js";

/**
 * GET /api/admin/reports/export?dataset=services|patients|appointments
 *                              &format=csv|pdf&doctorId=…&countryCode=…&from=…&to=…
 *
 * Global (all-doctor) list reports for the admin portal:
 *   • services   — every doctor↔service assignment (optionally one doctor)
 *   • patients   — all registered patient profiles
 *   • appointments — all appointments, filterable by doctor / country / status
 *
 * Streams CSV or PDF as an attachment so a plain <a href> carries the admin
 * session cookie (proxied same-origin by Next). Mirrors the audit-log export.
 */

const querySchema = z.object({
  dataset: z.enum(["services", "patients", "appointments", "payout"]),
  format: z.enum(["csv", "excel", "pdf", "json"]).default("excel"),
  doctorId: z.string().trim().min(1).max(40).optional(),
  countryCode: z.string().trim().min(2).max(8).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  consultationType: z.string().trim().min(1).max(64).optional(),
  paymentStatus: z
    .enum(["UNPAID", "PENDING", "PAID", "REFUNDED", "FAILED"])
    .optional(),
  status: z
    .enum([
      "REQUEST_RECEIVED",
      "UNDER_REVIEW",
      "CONTACTED",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
});

function resolveRange(from?: string, to?: string): { from?: Date; to?: Date } {
  if (!from && !to) return {};
  const now = new Date();
  const toUtc = to ? new Date(`${to}T23:59:59.999Z`) : now;
  const fromUtc = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  return { from: fromUtc, to: toUtc };
}

/** Previous full calendar month — default range for a doctor payout pull. */
function lastCalendarMonth(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
  return { from, to };
}

const adminReportsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/reports/export", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid query", parsed.error.flatten()));
    }
    const q = parsed.data;
    if (q.from && q.to && q.to < q.from) {
      return reply.status(400).send(errorResponse("`to` must be after `from`"));
    }

    if (q.dataset === "payout" && !q.doctorId) {
      return reply
        .status(400)
        .send(errorResponse("A doctor must be selected for a payout statement"));
    }

    try {
      const range =
        q.dataset === "payout" && !q.from && !q.to
          ? lastCalendarMonth()
          : resolveRange(q.from, q.to);
      const filters: ReportFilters = {
        from: range.from,
        to: range.to,
        status: q.status,
        paymentStatus: q.paymentStatus,
        consultationType: q.consultationType,
        doctorId: q.doctorId,
        countryCode: q.countryCode,
      };

      let table: ReportTable;
      if (q.dataset === "services") {
        table = await adminServicesReport(filters);
      } else if (q.dataset === "patients") {
        table = await adminPatientsReport(filters);
      } else if (q.dataset === "payout") {
        const [doctor, bankRow] = await Promise.all([
          prisma.doctor.findUnique({
            where: { id: q.doctorId! },
            select: { fullName: true },
          }),
          prisma.doctorBankAccount.findUnique({
            where: { doctorId: q.doctorId! },
            select: { accountHolder: true, ibanEncrypted: true, bic: true },
          }),
        ]);

        // Finance needs the full IBAN to pay the doctor, so the statement
        // carries it in the clear. A full-IBAN reveal is financial data — audit
        // it (DOCTOR_BANK_VIEWED) exactly as the dedicated bank-reveal route
        // does, and fail the export if the audit write fails rather than emit
        // un-audited account details.
        let iban: string | null = null;
        if (bankRow?.ibanEncrypted) {
          iban = decryptPhi(bankRow.ibanEncrypted);
          const actor = resolveAdminSessionActor(request);
          await recordCriticalAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? "ADMIN",
            action: "DOCTOR_BANK_VIEWED",
            entityType: "Doctor",
            entityId: q.doctorId!,
            request,
          });
        }

        table = await doctorPayoutStatementReport(
          q.doctorId!,
          doctor?.fullName ?? "Doctor",
          filters,
          {
            accountHolder: bankRow?.accountHolder ?? null,
            iban,
            bic: bankRow?.bic ?? null,
          },
        );
      } else {
        table = await adminAppointmentsReport(filters);
      }

      // JSON = the on-screen preview: same builder output the file formats use,
      // so the table shown on screen can never diverge from the download.
      if (q.format === "json") {
        return reply.send(table);
      }

      const stamp = new Date().toISOString().slice(0, 10);
      const base = `admin-${q.dataset}-${stamp}`;
      const out = await serializeReport(table, q.format);
      return reply
        .header("Content-Type", out.contentType)
        .header("Content-Disposition", `attachment; filename="${base}.${out.ext}"`)
        .send(out.body);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not export report"));
    }
  });
};

export default adminReportsRoute;
