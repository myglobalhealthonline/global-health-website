import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse } from "../utils/response.js";
import { decryptPhi } from "../lib/crypto/phi-crypto.js";
import {
  doctorAppointmentsReport,
  doctorPatientsReport,
  doctorPayoutStatementReport,
  doctorServicesReport,
  type ReportFilters,
} from "../modules/reports/report-datasets.js";
import {
  serializeReport,
  type ReportTable,
} from "../modules/reports/report-formatters.js";

/**
 * GET /api/doctor/reports/export?dataset=services|patients|appointments
 *                               &format=csv|pdf&from=…&to=…&status=…
 *                               &countryCode=…&consultationType=…
 *
 * Download the raw list behind the /doctor/reports dashboard tiles, scoped
 * to the signed-in doctor. Streams CSV or PDF as an attachment so a plain
 * <a href> can carry the `gh_auth` cookie (proxied same-origin by Next).
 */

const querySchema = z.object({
  dataset: z.enum(["services", "patients", "appointments", "payout"]),
  format: z.enum(["csv", "excel", "pdf", "json"]).default("excel"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  countryCode: z.string().trim().min(2).max(8).optional(),
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

/** Resolve the from/to strings into a bounded date range. Defaults to the
 *  last 30 days (matching the dashboard) for the time-bounded datasets. */
function resolveRange(from?: string, to?: string): { from?: Date; to?: Date } {
  const now = new Date();
  const toUtc = to ? new Date(`${to}T23:59:59.999Z`) : now;
  const fromUtc = from
    ? new Date(`${from}T00:00:00.000Z`)
    : new Date(toUtc.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: fromUtc, to: toUtc };
}

/** Previous full calendar month [first day 00:00, last day 23:59:59.999] UTC.
 *  Default range for the payout statement — "last month's consultations". */
function lastCalendarMonth(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
  return { from, to };
}

const doctorReportExportsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/reports/export", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
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

    try {
      const doctor = await prisma.doctor.findUnique({
        where: { id: auth.doctorId },
        select: { fullName: true },
      });
      const doctorName = doctor?.fullName ?? "Doctor";

      // The payout statement defaults to last full calendar month; other
      // time-bounded datasets default to the trailing 30 days.
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
        countryCode: q.countryCode,
        // `doctorId` is deliberately NOT read from the query — every builder
        // below is passed `auth.doctorId`, so a doctor can never widen the
        // scope to another clinician's rows.
      };

      let table: ReportTable;
      if (q.dataset === "services") {
        // Service assignments aren't time-bounded — ignore the range.
        table = await doctorServicesReport(auth.doctorId, doctorName);
      } else if (q.dataset === "patients") {
        table = await doctorPatientsReport(auth.doctorId, doctorName, filters);
      } else if (q.dataset === "payout") {
        // The doctor's own payout bank details — their own data, so no
        // reveal-audit (unlike the admin export of another doctor's IBAN).
        const bankRow = await prisma.doctorBankAccount.findUnique({
          where: { doctorId: auth.doctorId },
          select: { accountHolder: true, ibanEncrypted: true, bic: true },
        });
        const iban = bankRow?.ibanEncrypted ? decryptPhi(bankRow.ibanEncrypted) : null;
        table = await doctorPayoutStatementReport(auth.doctorId, doctorName, filters, {
          accountHolder: bankRow?.accountHolder ?? null,
          iban,
          bic: bankRow?.bic ?? null,
        });
      } else {
        table = await doctorAppointmentsReport(auth.doctorId, doctorName, filters);
      }

      // JSON = the on-screen preview: same builder output the file formats use,
      // so the table shown on screen can never diverge from the download.
      if (q.format === "json") {
        return reply.send(table);
      }

      const stamp = new Date().toISOString().slice(0, 10);
      const base = `doctor-${q.dataset}-${stamp}`;
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

export default doctorReportExportsRoute;
