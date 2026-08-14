import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { CorporateEmployeeStatus, CorporateRequestStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  BILLABLE_EMPLOYEE_STATUSES,
  computeBillingSummary,
  requireCorporateAdmin,
} from "../modules/corporate/corporate-shared.js";
import {
  serializeEmployee,
  serializeRequest,
} from "../modules/corporate/corporate-serializers.js";
import { mintAndSendInvite } from "../modules/corporate/corporate-invite.service.js";
import {
  cancelCorporateRequest,
  createCorporateRequest,
} from "../modules/corporate/corporate-request.service.js";
import { setEmployeeStanding } from "../modules/corporate/corporate-status.service.js";

/**
 * Corporate portal API (role CORPORATE_ADMIN). Every handler is scoped
 * to `request.corporateCompany` loaded by the guard from
 * `adminUserId === authUser.sub` — a corporate admin can never touch
 * another company's rows. Privacy rule (§6, plan doc): responses carry
 * status labels/booleans/counts only — never appointment content,
 * medical notes, or beneficiary PII.
 */

const employeeInputSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional(),
  addressLine1: z.string().trim().max(240).optional(),
  addressLine2: z.string().trim().max(240).optional(),
  city: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(24).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employeeCode: z.string().trim().max(64).optional(),
  department: z.string().trim().max(120).optional(),
  jobTitle: z.string().trim().max(120).optional(),
});

const companyPatchSchema = z.object({
  name: z.string().trim().min(1).max(240).optional(),
  registrationNumber: z.string().trim().max(120).nullable().optional(),
  addressLine1: z.string().trim().max(240).nullable().optional(),
  addressLine2: z.string().trim().max(240).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  postalCode: z.string().trim().max(24).nullable().optional(),
  billingEmail: z.string().trim().email().max(320).optional(),
  contactName: z.string().trim().min(1).max(240).optional(),
  contactEmail: z.string().trim().email().max(320).optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
});

// S-024: bound the tenant-scoped list query params — an unvalidated
// `status` cast straight into the Prisma `where` 500s on a garbage enum
// value, and an unbounded `query` string increases search cost for no
// benefit (the underlying list is already scoped to one company).
const employeeListQuerySchema = z.object({
  status: z.nativeEnum(CorporateEmployeeStatus).optional(),
  query: z.string().trim().max(120).optional(),
});

const requestListQuerySchema = z.object({
  status: z.nativeEnum(CorporateRequestStatus).optional(),
});

function parseDob(input: string | undefined): Date | null {
  if (!input) return null;
  const parsed = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function employeeDataFromInput(input: z.infer<typeof employeeInputSchema>) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email.toLowerCase(),
    phone: input.phone || null,
    addressLine1: input.addressLine1 || null,
    addressLine2: input.addressLine2 || null,
    city: input.city || null,
    postalCode: input.postalCode || null,
    dateOfBirth: parseDob(input.dateOfBirth),
    employeeCode: input.employeeCode || null,
    department: input.department || null,
    jobTitle: input.jobTitle || null,
  };
}

const corporateRoute: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireCorporateAdmin);

  // ── Company ────────────────────────────────────────────────────────────
  app.get("/api/corporate/company", async (request) => {
    const company = request.corporateCompany!;
    const billing = await computeBillingSummary(company);
    return okResponse({
      id: company.id,
      name: company.name,
      registrationNumber: company.registrationNumber,
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2,
      city: company.city,
      postalCode: company.postalCode,
      countryCode: company.countryCode,
      billingEmail: company.billingEmail,
      contactName: company.contactName,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      status: company.status,
      contractStartAt: company.contractStartAt.toISOString().slice(0, 10),
      contractEndAt: company.contractEndAt
        ? company.contractEndAt.toISOString().slice(0, 10)
        : null,
      plan: {
        name: company.plan.name,
        slug: company.plan.slug,
        annualPricePerEmployeeCents: company.plan.annualPricePerEmployeeCents,
        currencyCode: company.plan.currencyCode,
        maxBeneficiariesPerEmployee: company.plan.maxBeneficiariesPerEmployee,
      },
      billing,
    });
  });

  app.patch("/api/corporate/company", async (request, reply) => {
    const parsed = companyPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid company details", parsed.error.flatten()));
    }
    const updated = await prisma.corporateCompany.update({
      where: { id: request.corporateCompany!.id },
      data: parsed.data,
    });
    return okResponse({ id: updated.id });
  });

  app.get("/api/corporate/billing-summary", async (request) => {
    return okResponse(await computeBillingSummary(request.corporateCompany!));
  });

  // ── Employees ──────────────────────────────────────────────────────────
  app.get("/api/corporate/employees", async (request, reply) => {
    const parsed = employeeListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid employees query", parsed.error.flatten()));
    }
    const query = parsed.data;
    const companyId = request.corporateCompany!.id;
    const employees = await prisma.corporateEmployee.findMany({
      where: {
        companyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.query
          ? {
              OR: [
                { firstName: { contains: query.query, mode: "insensitive" } },
                { lastName: { contains: query.query, mode: "insensitive" } },
                { email: { contains: query.query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { beneficiaries: { where: { status: { not: "REMOVED" } } } } } },
      orderBy: { createdAt: "desc" },
    });
    const counts = await prisma.corporateEmployee.groupBy({
      by: ["status"],
      where: { companyId },
      _count: true,
    });
    return okResponse({
      employees: employees.map(serializeEmployee),
      statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    });
  });

  app.post("/api/corporate/employees", async (request, reply) => {
    const parsed = employeeInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid employee details", parsed.error.flatten()));
    }
    const companyId = request.corporateCompany!.id;
    const data = employeeDataFromInput(parsed.data);
    const existing = await prisma.corporateEmployee.findUnique({
      where: { companyId_email: { companyId, email: data.email } },
      select: { id: true, status: true },
    });
    if (existing && existing.status !== "REMOVED") {
      return reply.status(409).send(errorResponse("An employee with this email already exists"));
    }
    const employee = existing
      ? await prisma.corporateEmployee.update({
          where: { id: existing.id },
          data: { ...data, status: "DRAFT", userId: null, preAssessmentAppointmentId: null },
        })
      : await prisma.corporateEmployee.create({ data: { companyId, ...data } });
    // Brief: invites go out when the corporate user saves the employee.
    const status = await mintAndSendInvite({ type: "EMPLOYEE", memberId: employee.id });
    return okResponse({ id: employee.id, status });
  });

  // Batch ceiling + send concurrency. One awaited email per row meant 500
  // rows held a single HTTP request open for minutes and lost every result
  // to the gateway timeout. Rows are written fast and sequentially; only the
  // slow part (email + WhatsApp) runs in bounded parallel.
  const BULK_MAX_ROWS = 200;
  const BULK_SEND_CONCURRENCY = 10;

  app.post("/api/corporate/employees/bulk", async (request, reply) => {
    const schema = z.object({
      employees: z.array(employeeInputSchema).min(1).max(BULK_MAX_ROWS),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid bulk payload", parsed.error.flatten()));
    }
    const companyId = request.corporateCompany!.id;
    const results: { email: string; ok: boolean; status?: string; message?: string }[] = [];
    const pendingInvites: { email: string; employeeId: string; index: number }[] = [];

    for (const row of parsed.data.employees) {
      const data = employeeDataFromInput(row);
      try {
        const existing = await prisma.corporateEmployee.findUnique({
          where: { companyId_email: { companyId, email: data.email } },
          select: { id: true, status: true },
        });
        if (existing && existing.status !== "REMOVED") {
          results.push({ email: data.email, ok: false, message: "Already exists" });
          continue;
        }
        const employee = existing
          ? await prisma.corporateEmployee.update({
              where: { id: existing.id },
              data: { ...data, status: "DRAFT", userId: null, preAssessmentAppointmentId: null },
            })
          : await prisma.corporateEmployee.create({ data: { companyId, ...data } });
        pendingInvites.push({
          email: data.email,
          employeeId: employee.id,
          index: results.push({ email: data.email, ok: true }) - 1,
        });
      } catch (error) {
        results.push({
          email: data.email,
          ok: false,
          message: error instanceof Error ? error.message : "Failed",
        });
      }
    }

    for (let i = 0; i < pendingInvites.length; i += BULK_SEND_CONCURRENCY) {
      await Promise.all(
        pendingInvites.slice(i, i + BULK_SEND_CONCURRENCY).map(async (pending) => {
          const row = results[pending.index]!;
          try {
            row.status = await mintAndSendInvite({
              type: "EMPLOYEE",
              memberId: pending.employeeId,
            });
          } catch (error) {
            row.ok = false;
            row.message = error instanceof Error ? error.message : "Invite failed";
          }
        }),
      );
    }
    return okResponse({ results });
  });

  app.get("/api/corporate/employees/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const employee = await prisma.corporateEmployee.findFirst({
      where: { id, companyId: request.corporateCompany!.id },
      include: {
        _count: { select: { beneficiaries: { where: { status: { not: "REMOVED" } } } } },
        invites: { orderBy: { createdAt: "desc" }, take: 5 },
        serviceRequests: {
          orderBy: { createdAt: "desc" },
          include: { employee: { select: { firstName: true, lastName: true, email: true } } },
        },
        preAssessmentAppointment: { select: { status: true, scheduledAt: true } },
      },
    });
    if (!employee) return reply.status(404).send(errorResponse("Employee not found"));
    return okResponse({
      ...serializeEmployee(employee),
      preAssessment: employee.preAssessmentAppointment
        ? {
            booked: true,
            completed: employee.preAssessmentAppointment.status === "COMPLETED",
            scheduledAt: employee.preAssessmentAppointment.scheduledAt
              ? employee.preAssessmentAppointment.scheduledAt.toISOString()
              : null,
          }
        : { booked: false, completed: false, scheduledAt: null },
      invites: employee.invites.map((invite) => ({
        createdAt: invite.createdAt.toISOString(),
        emailSentAt: invite.emailSentAt ? invite.emailSentAt.toISOString() : null,
        whatsappSentAt: invite.whatsappSentAt ? invite.whatsappSentAt.toISOString() : null,
        usedAt: invite.usedAt ? invite.usedAt.toISOString() : null,
        lastSendError: invite.lastSendError,
      })),
      requests: employee.serviceRequests.map(serializeRequest),
    });
  });

  app.patch("/api/corporate/employees/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const bodySchema = z.object({
      action: z.enum(["SUSPEND", "REACTIVATE", "REMOVE"]).optional(),
      details: employeeInputSchema.partial().optional(),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
    }
    const employee = await prisma.corporateEmployee.findFirst({
      where: { id, companyId: request.corporateCompany!.id },
    });
    if (!employee) return reply.status(404).send(errorResponse("Employee not found"));

    if (parsed.data.action) {
      const result = await setEmployeeStanding(id, parsed.data.action);
      if (!result.ok) return reply.status(400).send(errorResponse(result.message ?? "Not allowed"));
      return okResponse({ id });
    }

    if (parsed.data.details) {
      // Contact details are editable only before the member owns their
      // account (post-accept, the member edits their own profile).
      if (!["DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"].includes(employee.status)) {
        return reply
          .status(400)
          .send(errorResponse("Details can only be edited before the employee registers"));
      }
      const d = parsed.data.details;
      await prisma.corporateEmployee.update({
        where: { id },
        data: {
          ...(d.firstName ? { firstName: d.firstName } : {}),
          ...(d.lastName ? { lastName: d.lastName } : {}),
          ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
          ...(d.addressLine1 !== undefined ? { addressLine1: d.addressLine1 || null } : {}),
          ...(d.city !== undefined ? { city: d.city || null } : {}),
          ...(d.postalCode !== undefined ? { postalCode: d.postalCode || null } : {}),
          ...(d.dateOfBirth ? { dateOfBirth: parseDob(d.dateOfBirth) } : {}),
          ...(d.employeeCode !== undefined ? { employeeCode: d.employeeCode || null } : {}),
          ...(d.department !== undefined ? { department: d.department || null } : {}),
          ...(d.jobTitle !== undefined ? { jobTitle: d.jobTitle || null } : {}),
        },
      });
      return okResponse({ id });
    }
    return reply.status(400).send(errorResponse("Nothing to update"));
  });

  app.post("/api/corporate/employees/:id/resend-invite", async (request, reply) => {
    const { id } = request.params as { id: string };
    const employee = await prisma.corporateEmployee.findFirst({
      where: { id, companyId: request.corporateCompany!.id },
      select: { status: true },
    });
    if (!employee) return reply.status(404).send(errorResponse("Employee not found"));
    if (!["DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"].includes(employee.status)) {
      return reply.status(400).send(errorResponse("This employee has already registered"));
    }
    const status = await mintAndSendInvite({ type: "EMPLOYEE", memberId: id, isReminder: true });
    return okResponse({ id, status });
  });

  // ── Requests ───────────────────────────────────────────────────────────
  app.get("/api/corporate/requests", async (request, reply) => {
    const parsed = requestListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid requests query", parsed.error.flatten()));
    }
    const query = parsed.data;
    const requests = await prisma.corporateServiceRequest.findMany({
      where: {
        companyId: request.corporateCompany!.id,
        ...(query.status ? { status: query.status } : {}),
      },
      include: { employee: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return okResponse({ requests: requests.map(serializeRequest) });
  });

  app.post("/api/corporate/requests", async (request, reply) => {
    const schema = z.object({
      employeeId: z.string().min(1),
      type: z.enum(["ILLNESS_BENEFIT", "FIT_FOR_WORK"]),
      reason: z.string().trim().max(2000).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid request", parsed.error.flatten()));
    }
    const result = await createCorporateRequest({
      companyId: request.corporateCompany!.id,
      employeeId: parsed.data.employeeId,
      type: parsed.data.type,
      reason: parsed.data.reason,
      requestedByUserId: request.authUser!.sub,
    });
    if (!result.ok) return reply.status(result.status).send(errorResponse(result.message));
    return okResponse({ requestId: result.requestId, status: result.status });
  });

  app.patch("/api/corporate/requests/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({ action: z.literal("CANCEL") });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload"));
    const result = await cancelCorporateRequest({
      requestId: id,
      companyId: request.corporateCompany!.id,
    });
    if (!result.ok) return reply.status(400).send(errorResponse(result.message ?? "Not allowed"));
    return okResponse({ id });
  });

  // ── Dashboard funnel ───────────────────────────────────────────────────
  app.get("/api/corporate/overview", async (request) => {
    const company = request.corporateCompany!;
    const [statusCounts, billing, openRequests] = await Promise.all([
      prisma.corporateEmployee.groupBy({
        by: ["status"],
        where: { companyId: company.id },
        _count: true,
      }),
      computeBillingSummary(company),
      prisma.corporateServiceRequest.count({
        where: { companyId: company.id, status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED", "BOOKED"] } },
      }),
    ]);
    const counts = Object.fromEntries(statusCounts.map((c) => [c.status, c._count]));
    const total = Object.entries(counts)
      .filter(([status]) => BILLABLE_EMPLOYEE_STATUSES.includes(status as never))
      .reduce((sum, [, n]) => sum + (n as number), 0);
    return okResponse({
      companyName: company.name,
      companyStatus: company.status,
      planName: company.plan.name,
      employeeTotal: total,
      statusCounts: counts,
      openRequests,
      billing,
    });
  });
};

export default corporateRoute;
