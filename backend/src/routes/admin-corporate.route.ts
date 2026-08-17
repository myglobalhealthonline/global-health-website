import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { CorporateCompanyStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { resolveAdminSessionActor, verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  issuePasswordResetToken,
} from "../modules/auth/auth.service.js";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { sendCorporateAdminInviteEmail } from "../modules/corporate/corporate-emails.js";
import {
  computeBillingSummary,
} from "../modules/corporate/corporate-shared.js";
import {
  serializeBeneficiary,
  serializeEmployee,
  serializeRequest,
} from "../modules/corporate/corporate-serializers.js";
import { mintAndSendInvite } from "../modules/corporate/corporate-invite.service.js";
import {
  cancelCorporateRequest,
  createCorporateRequest,
} from "../modules/corporate/corporate-request.service.js";
import {
  activateEmployee,
  setBeneficiaryStanding,
  setEmployeeStanding,
} from "../modules/corporate/corporate-status.service.js";
import { listCorporateInvoiceDocuments } from "../modules/corporate/corporate-invoice.service.js";
import {
  companyDeletionCheck,
  deleteCorporateCompany,
  deleteCorporateEmployee,
} from "../modules/corporate/corporate-deletion.service.js";

/**
 * Platform-admin corporate management. ADMIN/SUPER_ADMIN get full
 * access; LOCAL_ADMIN is READ-ONLY and scoped to companies in their
 * allowedCountryFolders (plan doc §6).
 */

type AdminActor = { userId: string; role: "ADMIN" | "SUPER_ADMIN" | "LOCAL_ADMIN" };

async function requireWriteActor(request: FastifyRequest): Promise<AdminActor | null> {
  const actor = resolveAdminSessionActor(request);
  if (!actor) return null;
  if (actor.role === "LOCAL_ADMIN") return null;
  return actor;
}

async function localAdminCountryFilter(request: FastifyRequest): Promise<string[] | null> {
  const actor = resolveAdminSessionActor(request);
  if (!actor || actor.role !== "LOCAL_ADMIN") return null;
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { allowedCountryFolders: true },
  });
  return user?.allowedCountryFolders ?? [];
}

/**
 * True when this actor may read the company. ADMIN/SUPER_ADMIN always may;
 * LOCAL_ADMIN only within their allowed countries. EVERY company-scoped read
 * must call this — the beneficiaries and requests lists used to skip it and
 * handed a LOCAL_ADMIN any company's rows by id.
 */
async function canReadCompany(request: FastifyRequest, companyId: string): Promise<boolean> {
  const localFolders = await localAdminCountryFilter(request);
  if (!localFolders) return true;
  const scoped = await prisma.corporateCompany.findFirst({
    where: { id: companyId, countryCode: { in: localFolders } },
    select: { id: true },
  });
  return Boolean(scoped);
}

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const corporateListQuerySchema = paginationQuerySchema.extend({
  query: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  // S-024: validate against the real enum — a garbage value cast straight
  // into the Prisma `where` previously 500'd instead of 400ing.
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.nativeEnum(CorporateCompanyStatus).optional(),
  ),
});

const companyInputSchema = z.object({
  name: z.string().trim().min(1).max(240),
  registrationNumber: z.string().trim().max(120).optional(),
  addressLine1: z.string().trim().max(240).optional(),
  addressLine2: z.string().trim().max(240).optional(),
  city: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(24).optional(),
  countryCode: z.string().trim().min(2).max(2).toLowerCase(),
  billingEmail: z.string().trim().email().max(320),
  contactName: z.string().trim().min(1).max(240),
  contactEmail: z.string().trim().email().max(320),
  contactPhone: z.string().trim().max(40).optional(),
  planSlug: z.string().trim().default("corporate-standard"),
  contractEndAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** When set, immediately create + invite the CORPORATE_ADMIN login. */
  adminEmail: z.string().trim().email().max(320).optional(),
});

const adminCorporateRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  /** Create (or replace) the CORPORATE_ADMIN login + send invite. */
  async function inviteCompanyAdmin(companyId: string, email: string): Promise<void> {
    const company = await prisma.corporateCompany.findUniqueOrThrow({
      where: { id: companyId },
    });
    const lower = email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email: lower } });
    if (user && user.role !== "CORPORATE_ADMIN") {
      throw new Error("That email already belongs to a non-corporate account");
    }
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: lower,
          // Unusable placeholder — the invite token flow sets the real one.
          passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
          fullName: company.contactName,
          role: "CORPORATE_ADMIN",
          mustChangePassword: false,
        },
      });
    }
    await prisma.corporateCompany.update({
      where: { id: companyId },
      data: { adminUserId: user.id },
    });
    const token = await issuePasswordResetToken(user.id, {
      ttlMinutes: 7 * 24 * 60,
      isInvite: true,
    });
    await sendCorporateAdminInviteEmail({
      to: lower,
      contactName: company.contactName,
      companyName: company.name,
      token,
    });
  }

  // ── Plans + rules ──────────────────────────────────────────────────────
  // ponytail: unpaginated — plans are an admin-configured catalog (a
  // handful of pricing tiers), not a growth table. Paginate if that changes.
  app.get("/api/admin/corporate/plans", async () => {
    const [plans, doctorOptions, countryOptions] = await Promise.all([
      prisma.corporatePlan.findMany({
        include: {
          benefitRules: true,
          includedServices: {
            include: { doctor: { select: { id: true, fullName: true } } },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          _count: { select: { companies: true } },
        },
        // Matrix order, not price order: the range is not monotonic (Basic+
        // €350 sits above Standard €180).
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      // Every corporate consultation names exactly one delivering doctor, and
      // the booking runs on that doctor's ordinary availability.
      prisma.doctor.findMany({
        where: { active: true },
        select: {
          id: true,
          fullName: true,
          country: { select: { code: true, name: true } },
          // Every market the doctor may be pinned to, not just the primary one
          // — `assertAssignableDoctor` accepts DoctorCountry listings too, so a
          // label showing only the primary country made a legal assignment look
          // like a mistake (and an illegal one look fine).
          additionalCountries: { select: { country: { select: { code: true } } } },
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.country.findMany({
        where: { isActive: true },
        select: { code: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return okResponse({ plans, doctorOptions, countryOptions });
  });

  /** Corporate consultation payload. No price and no slug by design: these
   *  are free, portal-only consultations, not catalogue services. */
  const corporateServiceSchema = z.object({
    name: z.string().trim().min(1).max(240),
    description: z.string().trim().max(2000).nullish(),
    countryCode: z.string().trim().min(2).max(8).toLowerCase().nullish(),
    durationMinutes: z.number().int().min(5).max(240).default(30),
    doctorId: z.string().trim().min(1).max(40),
    role: z.enum(["INCLUDED", "PRE_ASSESSMENT", "ILLNESS_BENEFIT", "FIT_FOR_WORK"]).default("INCLUDED"),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(999).default(0),
  });

  /** A doctor who actually exists, is active, and — when the consultation is
   *  pinned to a market — practises in it. Both the doctor's primary country
   *  and their additional DoctorCountry listings count: a doctor primarily in
   *  PT but listed in IE really does practise in IE, and checking only the
   *  primary refused a legitimate assignment. */
  async function assertAssignableDoctor(
    doctorId: string,
    countryCode: string | null | undefined,
  ): Promise<string | null> {
    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, active: true },
      select: {
        country: { select: { code: true } },
        additionalCountries: { select: { country: { select: { code: true } } } },
      },
    });
    if (!doctor) return "Doctor not found";
    if (!countryCode) return null;
    const markets = new Set([
      doctor.country.code,
      ...doctor.additionalCountries.map((row) => row.country.code),
    ]);
    if (!markets.has(countryCode)) {
      return "The assigned doctor does not practise in that country";
    }
    return null;
  }

  app.post("/api/admin/corporate/plans/:id/services", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const parsed = corporateServiceSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
    const { countryCode, doctorId, ...rest } = parsed.data;
    const problem = await assertAssignableDoctor(doctorId, countryCode);
    if (problem) return reply.status(400).send(errorResponse(problem));
    const row = await prisma.corporatePlanService.create({
      data: { ...rest, corporatePlanId: id, doctorId, countryCode: countryCode ?? null },
    });
    return okResponse({ id: row.id });
  });

  app.patch("/api/admin/corporate/plan-services/:id", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const parsed = corporateServiceSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
    const existing = await prisma.corporatePlanService.findUnique({
      where: { id },
      select: { doctorId: true, countryCode: true },
    });
    if (!existing) return reply.status(404).send(errorResponse("Consultation not found"));
    const { countryCode, doctorId, ...rest } = parsed.data;
    // Either field alone can invalidate the pair, so re-check the resulting
    // combination rather than only what was sent.
    const nextCountry = countryCode !== undefined ? (countryCode ?? null) : existing.countryCode;
    const problem = await assertAssignableDoctor(doctorId ?? existing.doctorId, nextCountry);
    if (problem) return reply.status(400).send(errorResponse(problem));
    await prisma.corporatePlanService.update({
      where: { id },
      data: {
        ...rest,
        ...(doctorId !== undefined ? { doctorId } : {}),
        ...(countryCode !== undefined ? { countryCode: countryCode ?? null } : {}),
      },
    });
    return okResponse({ id });
  });

  app.delete("/api/admin/corporate/plan-services/:id", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    await prisma.corporatePlanService.delete({ where: { id } }).catch(() => undefined);
    return okResponse({ id });
  });

  app.patch("/api/admin/corporate/plans/:id", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string().trim().min(1).max(240).optional(),
      annualPricePerEmployeeCents: z.number().int().min(0).optional(),
      maxBeneficiariesPerEmployee: z.number().int().min(0).max(20).optional(),
      isActive: z.boolean().optional(),
      tier: z.string().trim().max(60).nullish(),
      sortOrder: z.number().int().min(0).max(999).optional(),
      priceNote: z.string().trim().max(240).nullish(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
    const plan = await prisma.corporatePlan.update({ where: { id }, data: parsed.data });
    return okResponse({ id: plan.id });
  });

  /**
   * A rule that cannot price anything is a configuration mistake, not a
   * harmless row: the plan card advertises it and checkout then ignores it.
   * Rejecting it here is the only place an admin finds out.
   */
  function coverageProblem(rule: {
    coverage?: "INCLUDED" | "COPAY" | "DISCOUNT";
    copayCents?: number | null;
    discountPercent?: number;
  }): string | null {
    if (rule.coverage === "COPAY" && rule.copayCents == null) {
      return "A co-pay rule needs the amount the member pays";
    }
    if (rule.coverage === "DISCOUNT" && rule.discountPercent != null && rule.discountPercent <= 0) {
      return "A discount rule needs a percentage above 0";
    }
    return null;
  }

  const ruleShape = {
    coverage: z.enum(["INCLUDED", "COPAY", "DISCOUNT"]).default("DISCOUNT"),
    // Required by the column, and still the field DISCOUNT rules use. Sending 0
    // with coverage INCLUDED/COPAY is correct — the percentage is not read.
    discountPercent: z.number().min(0).max(100),
    copayCents: z.number().int().min(0).nullish(),
    annualLimit: z.number().int().min(1).max(365).nullish(),
    limitGroup: z.string().trim().min(1).max(60).nullish(),
    appliesToBeneficiaries: z.boolean().default(true),
    isActive: z.boolean().default(true),
  };

  app.post("/api/admin/corporate/plans/:id/rules", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const schema = z.object({
      serviceKind: z.enum(["GENERAL", "SPECIALIST", "PRESCRIPTION", "HEALTH_TEST", "HOME_DELIVERY"]).nullable().optional(),
      serviceId: z.string().nullable().optional(),
      ...ruleShape,
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
    const problem = coverageProblem(parsed.data);
    if (problem) return reply.status(400).send(errorResponse(problem));
    const rule = await prisma.corporateBenefitRule.create({
      data: { corporatePlanId: id, ...parsed.data },
    });
    return okResponse({ id: rule.id });
  });

  app.patch("/api/admin/corporate/rules/:ruleId", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { ruleId } = request.params as { ruleId: string };
    const schema = z.object(ruleShape).partial();
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
    const existing = await prisma.corporateBenefitRule.findUnique({
      where: { id: ruleId },
      select: { coverage: true, copayCents: true, discountPercent: true },
    });
    if (!existing) return reply.status(404).send(errorResponse("Rule not found"));
    // Validate the RESULTING row: switching coverage to COPAY without sending an
    // amount, or clearing the amount on an existing co-pay rule, are both the
    // same broken row arrived at from different directions.
    const problem = coverageProblem({
      coverage: parsed.data.coverage ?? existing.coverage,
      copayCents:
        parsed.data.copayCents !== undefined ? parsed.data.copayCents : existing.copayCents,
      discountPercent: parsed.data.discountPercent ?? existing.discountPercent,
    });
    if (problem) return reply.status(400).send(errorResponse(problem));
    await prisma.corporateBenefitRule.update({ where: { id: ruleId }, data: parsed.data });
    return okResponse({ id: ruleId });
  });

  app.delete("/api/admin/corporate/rules/:ruleId", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { ruleId } = request.params as { ruleId: string };
    await prisma.corporateBenefitRule.delete({ where: { id: ruleId } }).catch(() => undefined);
    return okResponse({ id: ruleId });
  });

  // ── Companies ──────────────────────────────────────────────────────────
  app.get("/api/admin/corporate/companies", async (request, reply) => {
    const query = corporateListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid companies query", query.error.flatten()));
    }
    const { page, pageSize, query: search, status } = query.data;
    const localFolders = await localAdminCountryFilter(request);
    const where = {
      ...(localFolders ? { countryCode: { in: localFolders } } : {}),
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const [total, companies] = await prisma.$transaction([
      prisma.corporateCompany.count({ where }),
      prisma.corporateCompany.findMany({
        where,
        include: {
          plan: { select: { name: true, annualPricePerEmployeeCents: true, currencyCode: true } },
          _count: { select: { employees: true, beneficiaries: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const items = companies.map((c) => ({
      id: c.id,
      name: c.name,
      countryCode: c.countryCode,
      status: c.status,
      planName: c.plan.name,
      employeeCount: c._count.employees,
      beneficiaryCount: c._count.beneficiaries,
      hasAdminLogin: Boolean(c.adminUserId),
      createdAt: c.createdAt.toISOString(),
    }));
    return okResponse({
      // Back-compat: existing callers read `.companies` directly.
      companies: items,
      items,
      pagination: { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) },
    });
  });

  app.post("/api/admin/corporate/companies", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const parsed = companyInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid company details", parsed.error.flatten()));
    }
    const input = parsed.data;
    const plan = await prisma.corporatePlan.findUnique({ where: { slug: input.planSlug } });
    if (!plan) return reply.status(400).send(errorResponse("Corporate plan not found — run the seed first"));
    const company = await prisma.corporateCompany.create({
      data: {
        name: input.name,
        registrationNumber: input.registrationNumber || null,
        addressLine1: input.addressLine1 || null,
        addressLine2: input.addressLine2 || null,
        city: input.city || null,
        postalCode: input.postalCode || null,
        countryCode: input.countryCode,
        billingEmail: input.billingEmail,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone || null,
        planId: plan.id,
        contractEndAt: input.contractEndAt ? new Date(`${input.contractEndAt}T23:59:59.000Z`) : null,
      },
    });
    if (input.adminEmail) {
      try {
        await inviteCompanyAdmin(company.id, input.adminEmail);
      } catch (error) {
        return okResponse({
          id: company.id,
          adminInviteError: error instanceof Error ? error.message : "Admin invite failed",
        });
      }
    }
    return okResponse({ id: company.id });
  });

  app.get("/api/admin/corporate/companies/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const localFolders = await localAdminCountryFilter(request);
    const company = await prisma.corporateCompany.findFirst({
      where: { id, ...(localFolders ? { countryCode: { in: localFolders } } : {}) },
      include: {
        plan: true,
        adminUser: { select: { email: true, emailVerifiedAt: true } },
      },
    });
    if (!company) return reply.status(404).send(errorResponse("Company not found"));
    const [billing, deletion] = await Promise.all([
      computeBillingSummary(company),
      // Resolved here so the settings tab can render the Delete button already
      // knowing whether it would be refused, and say why. The DELETE route
      // re-runs it — this is for the label, not the decision.
      companyDeletionCheck(company.id),
    ]);
    return okResponse({
      ...company,
      deletion,
      contractStartAt: company.contractStartAt.toISOString().slice(0, 10),
      contractEndAt: company.contractEndAt ? company.contractEndAt.toISOString().slice(0, 10) : null,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      adminLogin: company.adminUser
        ? { email: company.adminUser.email, active: Boolean(company.adminUser.emailVerifiedAt) }
        : null,
      billing,
    });
  });

  /** Hard delete — only a company with no history at all. Anything real gets
   *  EXPIRED (status) instead, which keeps every record and stops benefits. */
  app.delete("/api/admin/corporate/companies/:id", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    if (!(await canReadCompany(request, id))) {
      return reply.status(404).send(errorResponse("Company not found"));
    }
    const result = await deleteCorporateCompany(id);
    if (!result.deletable) return reply.status(400).send(errorResponse(result.reason));
    return okResponse({ id });
  });

  app.patch("/api/admin/corporate/companies/:id", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const schema = companyInputSchema.partial().extend({
      status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED"]).optional(),
      contractEndAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
    const { planSlug: _planSlug, adminEmail: _adminEmail, contractEndAt, ...rest } = parsed.data;
    await prisma.corporateCompany.update({
      where: { id },
      data: {
        ...rest,
        ...(contractEndAt !== undefined
          ? { contractEndAt: contractEndAt ? new Date(`${contractEndAt}T23:59:59.000Z`) : null }
          : {}),
      },
    });
    return okResponse({ id });
  });

  app.post(
    "/api/admin/corporate/companies/:id/admin-invite",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const schema = z.object({ email: z.string().trim().email().max(320) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid email"));
    try {
      await inviteCompanyAdmin(id, parsed.data.email);
    } catch (error) {
      return reply
        .status(409)
        .send(errorResponse(error instanceof Error ? error.message : "Admin invite failed"));
    }
    return okResponse({ id });
    },
  );

  // ── Employees + beneficiaries ──────────────────────────────────────────
  app.get("/api/admin/corporate/companies/:id/employees", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = paginationQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid employees query", query.error.flatten()));
    }
    const { page, pageSize } = query.data;
    if (!(await canReadCompany(request, id))) {
      return reply.status(404).send(errorResponse("Company not found"));
    }
    const where = { companyId: id };
    const [total, employees] = await prisma.$transaction([
      prisma.corporateEmployee.count({ where }),
      prisma.corporateEmployee.findMany({
        where,
        include: { _count: { select: { beneficiaries: { where: { status: { not: "REMOVED" } } } } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const items = employees.map(serializeEmployee);
    return okResponse({
      // Back-compat: existing callers read `.employees` directly.
      employees: items,
      items,
      pagination: { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) },
    });
  });

  app.post("/api/admin/corporate/companies/:id/employees", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const schema = z.object({
      firstName: z.string().trim().min(1).max(120),
      lastName: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(320),
      phone: z.string().trim().max(40).optional(),
      department: z.string().trim().max(120).optional(),
      jobTitle: z.string().trim().max(120).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
    const email = parsed.data.email.toLowerCase();
    const data = {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      phone: parsed.data.phone || null,
      department: parsed.data.department || null,
      jobTitle: parsed.data.jobTitle || null,
    };
    // Same duplicate handling as the corporate portal route — without it the
    // unique (companyId, email) index surfaced as a raw 500.
    const existing = await prisma.corporateEmployee.findUnique({
      where: { companyId_email: { companyId: id, email } },
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
      : await prisma.corporateEmployee.create({ data: { companyId: id, ...data } });
    const status = await mintAndSendInvite({ type: "EMPLOYEE", memberId: employee.id });
    return okResponse({ id: employee.id, status });
  });

  app.patch("/api/admin/corporate/employees/:id", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const schema = z.object({
      action: z.enum(["SUSPEND", "REACTIVATE", "REMOVE", "FORCE_ACTIVATE"]),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload"));
    if (parsed.data.action === "FORCE_ACTIVATE") {
      // activateEmployee no-ops on an unknown id, so check first — otherwise a
      // typo'd id answers 200 "activated" and nothing happened.
      const exists = await prisma.corporateEmployee.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) return reply.status(404).send(errorResponse("Employee not found"));
      await activateEmployee(id);
      return okResponse({ id });
    }
    const result = await setEmployeeStanding(id, parsed.data.action);
    if (!result.ok) return reply.status(400).send(errorResponse(result.message ?? "Not allowed"));
    return okResponse({ id });
  });

  /** Hard delete — only for an employee who never used the plan. Anyone with
   *  history gets REMOVE (soft) instead; the check answers with which. */
  app.delete("/api/admin/corporate/employees/:id", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const employee = await prisma.corporateEmployee.findUnique({
      where: { id },
      select: { companyId: true },
    });
    if (!employee || !(await canReadCompany(request, employee.companyId))) {
      return reply.status(404).send(errorResponse("Employee not found"));
    }
    const result = await deleteCorporateEmployee(id);
    if (!result.deletable) return reply.status(400).send(errorResponse(result.reason));
    return okResponse({ id });
  });

  app.post("/api/admin/corporate/employees/:id/resend-invite", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const status = await mintAndSendInvite({ type: "EMPLOYEE", memberId: id, isReminder: true });
    return okResponse({ id, status });
  });

  app.get("/api/admin/corporate/companies/:id/beneficiaries", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = paginationQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid beneficiaries query", query.error.flatten()));
    }
    const { page, pageSize } = query.data;
    if (!(await canReadCompany(request, id))) {
      return reply.status(404).send(errorResponse("Company not found"));
    }
    const where = { companyId: id };
    const [total, beneficiaries] = await prisma.$transaction([
      prisma.corporateBeneficiary.count({ where }),
      prisma.corporateBeneficiary.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const items = beneficiaries.map(serializeBeneficiary);
    return okResponse({
      // Back-compat: existing callers read `.beneficiaries` directly.
      beneficiaries: items,
      items,
      pagination: { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) },
    });
  });

  app.patch("/api/admin/corporate/beneficiaries/:id", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const schema = z.object({ action: z.enum(["SUSPEND", "REACTIVATE", "REMOVE"]) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload"));
    const result = await setBeneficiaryStanding(id, parsed.data.action);
    if (!result.ok) return reply.status(400).send(errorResponse(result.message ?? "Not allowed"));
    return okResponse({ id });
  });

  app.post("/api/admin/corporate/beneficiaries/:id/resend-invite", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const status = await mintAndSendInvite({ type: "BENEFICIARY", memberId: id, isReminder: true });
    return okResponse({ id, status });
  });

  // ── Requests ───────────────────────────────────────────────────────────
  app.get("/api/admin/corporate/companies/:id/requests", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = paginationQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid requests query", query.error.flatten()));
    }
    const { page, pageSize } = query.data;
    if (!(await canReadCompany(request, id))) {
      return reply.status(404).send(errorResponse("Company not found"));
    }
    const where = { companyId: id };
    const [total, requests] = await prisma.$transaction([
      prisma.corporateServiceRequest.count({ where }),
      prisma.corporateServiceRequest.findMany({
        where,
        include: { employee: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const items = requests.map(serializeRequest);
    return okResponse({
      // Back-compat: existing callers read `.requests` directly.
      requests: items,
      items,
      pagination: { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) },
    });
  });

  app.post("/api/admin/corporate/companies/:id/requests", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const schema = z.object({
      employeeId: z.string().min(1),
      type: z.enum(["ILLNESS_BENEFIT", "FIT_FOR_WORK"]),
      reason: z.string().trim().max(2000).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
    const actor = resolveAdminSessionActor(request);
    const result = await createCorporateRequest({
      companyId: id,
      employeeId: parsed.data.employeeId,
      type: parsed.data.type,
      reason: parsed.data.reason,
      requestedByUserId: actor?.userId ?? "admin-token",
    });
    if (!result.ok) return reply.status(result.status).send(errorResponse(result.message));
    return okResponse({ requestId: result.requestId, status: result.status });
  });

  app.patch("/api/admin/corporate/requests/:id", async (request, reply) => {
    if (!(await requireWriteActor(request))) {
      return reply.status(403).send(errorResponse("Read-only access"));
    }
    const { id } = request.params as { id: string };
    const result = await cancelCorporateRequest({ requestId: id });
    if (!result.ok) return reply.status(400).send(errorResponse(result.message ?? "Not allowed"));
    return okResponse({ id });
  });

  // ── Invoices (employees' consultation documents) ────────────────────────
  // Read-only: the platform does not issue the company's own subscription
  // fiscal documents — corporate billing happens offline under contract.
  app.get("/api/admin/corporate/companies/:id/invoices", async (request, reply) => {
    const { id } = request.params as { id: string };
    // Scope LOCAL_ADMIN to their allowed countries (same guard the other
    // company-scoped reads use).
    if (!(await canReadCompany(request, id))) {
      return reply.status(404).send(errorResponse("Company not found"));
    }
    const documents = await listCorporateInvoiceDocuments(id);
    return okResponse(documents);
  });
};

export default adminCorporateRoute;
