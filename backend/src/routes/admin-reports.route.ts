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
  adminCommissionPayoutReport,
  adminPatientsReport,
  adminServicesReport,
  doctorPayoutStatementReport,
  resolveCommissionPayoutDoctorIds,
  type PayoutBankInfo,
  type ReportFilters,
} from "../modules/reports/report-datasets.js";
import {
  serializeReport,
  type ReportTable,
} from "../modules/reports/report-formatters.js";
import { resolvePayoutStatementLocale } from "../modules/reports/payout-statement-content.js";
import { loadDoctorPayoutBanks } from "../modules/reports/payout-bank-lookup.js";
import {
  CLINICAL_DIRECTOR_TERMS,
  clinicalDirectorStatementReport,
  findClinicalDirector,
  type ClinicalDirectorPayee,
} from "../modules/reports/clinical-director-report.js";

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
  dataset: z.enum([
    "services",
    "patients",
    "appointments",
    "payout",
    // Commission markets (Brazil): what each doctor is owed, for the manual
    // bank-transfer run. Not doctor-scoped like "payout" — it covers everyone.
    "commission-payouts",
    // Clinical director statements: everything invoiced in that market over the
    // period, plus the director's tiered commission on the patient-paid gross.
    // One dataset per market because the agreed terms differ per market.
    "director-cz",
    "director-ro",
  ]),
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
  /** Language to render the export in. Honoured by `dataset=payout` (admin
   *  picks it explicitly, so finance can hand a doctor a statement in the
   *  doctor's own language — defaults to English) and `dataset=commission-payouts`
   *  (Brazil-only today, so it defaults to Portuguese instead). */
  locale: z.string().trim().min(2).max(8).optional(),
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
      // Both payout datasets default to the previous full calendar month —
      // that's the cadence finance actually runs them on.
      const range =
        (q.dataset === "payout" ||
          q.dataset === "commission-payouts" ||
          q.dataset.startsWith("director-")) &&
        !q.from &&
        !q.to
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
      } else if (q.dataset.startsWith("director-")) {
        // The market is fixed by the dataset, not by the country filter — a
        // director statement is only meaningful for a market whose commission
        // terms are actually agreed.
        const terms = CLINICAL_DIRECTOR_TERMS[q.dataset.slice("director-".length)];
        if (!terms) {
          return reply.status(400).send(errorResponse("Unknown clinical director market"));
        }

        // Finance pays the director straight off this statement, so it carries
        // their account in the clear — resolved exactly as a doctor payout is
        // (their market account first, doctor-level as the fallback), and the
        // full-IBAN reveal audited the same way. A missing director is not an
        // error: the consultation list and commission still stand.
        const director = await findClinicalDirector(terms.countryCode);
        let payee: ClinicalDirectorPayee | null = null;
        if (director) {
          const banks = await loadDoctorPayoutBanks(director.id);
          const marketBank = banks.byMarket[terms.countryCode.toLowerCase()];
          const bank =
            marketBank && (marketBank.iban || marketBank.accountHolder || marketBank.bic)
              ? marketBank
              : banks.fallback;
          payee = {
            fullName: director.fullName,
            accountHolder: bank.accountHolder,
            iban: bank.iban,
            bic: bank.bic,
          };
          if (bank.iban) {
            const actor = resolveAdminSessionActor(request);
            await recordCriticalAudit({
              actorUserId: actor?.userId ?? null,
              actorRole: actor?.role ?? "ADMIN",
              action: "DOCTOR_BANK_VIEWED",
              entityType: "Doctor",
              entityId: director.id,
              metadata: { source: "clinical-director-statement", market: terms.countryCode },
              request,
            });
          }
        }
        table = await clinicalDirectorStatementReport(terms, filters, payee);
      } else if (q.dataset === "commission-payouts") {
        // Finance runs the bank transfer straight from this worksheet, so it
        // carries every covered doctor's bank details in the clear. Same rule
        // as the single-doctor payout statement: a full-IBAN reveal is
        // financial data and must be audited (DOCTOR_BANK_VIEWED) per doctor,
        // failing the export if any audit write fails.
        const doctorIds = await resolveCommissionPayoutDoctorIds(filters);
        const bankByDoctorId = new Map<string, PayoutBankInfo>();
        if (doctorIds.length > 0) {
          const bankRows = await prisma.doctorBankAccount.findMany({
            where: { doctorId: { in: doctorIds } },
            select: { doctorId: true, accountHolder: true, ibanEncrypted: true, bic: true },
          });
          const actor = resolveAdminSessionActor(request);
          for (const b of bankRows) {
            const iban = b.ibanEncrypted ? decryptPhi(b.ibanEncrypted) : null;
            bankByDoctorId.set(b.doctorId, {
              accountHolder: b.accountHolder,
              iban,
              bic: b.bic,
            });
            if (iban) {
              await recordCriticalAudit({
                actorUserId: actor?.userId ?? null,
                actorRole: actor?.role ?? "ADMIN",
                action: "DOCTOR_BANK_VIEWED",
                entityType: "Doctor",
                entityId: b.doctorId,
                request,
              });
            }
          }

          // Some doctors bank per MARKET (DoctorMarketBankAccount) instead of
          // globally — a multi-market doctor can have a different account per
          // country. A doctor missing from the global lookup above isn't
          // necessarily missing bank details entirely; check their markets
          // before reporting "not on file". Only fall back when exactly one
          // market has bank details set — with more than one, which account
          // to pay into is genuinely ambiguous and guessing wrong risks
          // sending the transfer to the wrong account.
          const missingGlobalBank = doctorIds.filter((doctorId) => {
            const entry = bankByDoctorId.get(doctorId);
            return !entry || (!entry.iban && !entry.accountHolder && !entry.bic);
          });
          if (missingGlobalBank.length > 0) {
            const marketBankRows = await prisma.doctorCountry.findMany({
              where: {
                doctorId: { in: missingGlobalBank },
                bankAccount: { isNot: null },
              },
              select: {
                doctorId: true,
                bankAccount: {
                  select: { accountHolder: true, ibanEncrypted: true, bic: true },
                },
              },
            });
            const marketBanksByDoctorId = new Map<string, typeof marketBankRows>();
            for (const row of marketBankRows) {
              const list = marketBanksByDoctorId.get(row.doctorId) ?? [];
              list.push(row);
              marketBanksByDoctorId.set(row.doctorId, list);
            }
            for (const [doctorId, rows] of marketBanksByDoctorId) {
              if (rows.length !== 1) continue;
              const marketBank = rows[0].bankAccount!;
              const iban = marketBank.ibanEncrypted ? decryptPhi(marketBank.ibanEncrypted) : null;
              bankByDoctorId.set(doctorId, {
                accountHolder: marketBank.accountHolder,
                iban,
                bic: marketBank.bic,
              });
              if (iban) {
                await recordCriticalAudit({
                  actorUserId: actor?.userId ?? null,
                  actorRole: actor?.role ?? "ADMIN",
                  action: "DOCTOR_BANK_VIEWED",
                  entityType: "Doctor",
                  entityId: doctorId,
                  request,
                });
              }
            }
          }
        }
        // Brazil is the only commission market today, so this defaults to
        // Portuguese rather than English — the admin can still override via
        // `?locale=`.
        table = await adminCommissionPayoutReport(
          filters,
          bankByDoctorId,
          resolvePayoutStatementLocale(q.locale, "pt"),
        );
      } else if (q.dataset === "payout") {
        // Doctors working several markets can bank each one separately
        // (DoctorMarketBankAccount) — load every account, so the statement can
        // value each market's consultations against the account THAT market is
        // actually paid into and fall back to the doctor-level account only for
        // markets with none of their own.
        const [doctor, banks] = await Promise.all([
          prisma.doctor.findUnique({
            where: { id: q.doctorId! },
            select: { fullName: true },
          }),
          loadDoctorPayoutBanks(q.doctorId!),
        ]);

        // Finance needs the full IBAN to pay the doctor, so the statement
        // carries it in the clear. A full-IBAN reveal is financial data — audit
        // it (DOCTOR_BANK_VIEWED) exactly as the dedicated bank-reveal route
        // does, and fail the export if the audit write fails rather than emit
        // un-audited account details. One event per export, listing which of
        // the doctor's accounts it revealed.
        const revealedAccounts = [
          ...(banks.fallbackHasIban ? ["doctor"] : []),
          ...banks.marketsWithIban,
        ];
        if (revealedAccounts.length > 0) {
          const actor = resolveAdminSessionActor(request);
          await recordCriticalAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? "ADMIN",
            action: "DOCTOR_BANK_VIEWED",
            entityType: "Doctor",
            entityId: q.doctorId!,
            metadata: { source: "payout-statement", accounts: revealedAccounts },
            request,
          });
        }

        table = await doctorPayoutStatementReport(
          q.doctorId!,
          doctor?.fullName ?? "Doctor",
          filters,
          banks.fallback,
          resolvePayoutStatementLocale(q.locale),
          banks.byMarket,
        );
      } else {
        table = await adminAppointmentsReport(filters);
      }

      // JSON = the on-screen preview: same builder output the file formats use,
      // so the table shown on screen can never diverge from the download.
      if (q.format === "json") {
        // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- Fastify's typed reply.send() of a plain JSON object, not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput).
        return reply.send(table);
      }

      const stamp = new Date().toISOString().slice(0, 10);
      // Payout statements carry their language in the filename — finance often
      // pulls the same month in two languages and the files must not collide.
      const base =
        q.dataset === "payout"
          ? `admin-payout-${resolvePayoutStatementLocale(q.locale)}-${stamp}`
          : q.dataset === "commission-payouts"
            ? `admin-commission-payouts-${resolvePayoutStatementLocale(q.locale, "pt")}-${stamp}`
            : q.dataset.startsWith("director-")
              ? `admin-clinical-director-${q.dataset.slice("director-".length)}-${stamp}`
              : `admin-${q.dataset}-${stamp}`;
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
