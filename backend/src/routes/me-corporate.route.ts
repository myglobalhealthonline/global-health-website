import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  companyIsLive,
  getBeneficiaryMembershipForUser,
  getEmployeeMembershipForUser,
  isEmployeeProfileComplete,
} from "../modules/corporate/corporate-shared.js";
import {
  serializeBeneficiary,
  serializeCard,
} from "../modules/corporate/corporate-serializers.js";
import { mintAndSendInvite } from "../modules/corporate/corporate-invite.service.js";
import {
  REQUEST_TYPE_LABEL,
  planServiceSlug,
  requestBookPath,
} from "../modules/corporate/corporate-request.service.js";

/**
 * Patient-portal corporate membership endpoints. Everything is scoped
 * to the logged-in user's own membership rows (`userId === authUser.sub`).
 */
const meCorporateRoute: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/api/me/corporate", async (request) => {
    const userId = request.authUser!.sub;
    const employee = await getEmployeeMembershipForUser(userId);

    if (employee) {
      const [card, openRequests, assignedPreAssessmentSlug] = await Promise.all([
        prisma.corporateBenefitCard.findUnique({ where: { employeeId: employee.id } }),
        prisma.corporateServiceRequest.findMany({
          where: { employeeId: employee.id, status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED", "BOOKED"] } },
          orderBy: { createdAt: "desc" },
          include: { service: { select: { slug: true } } },
        }),
        planServiceSlug(employee.company.planId, "PRE_ASSESSMENT"),
      ]);
      // Plan-assigned pre-assessment service first; fall back to any
      // CORPORATE_ONLY service in the company's country (pre-assignment data).
      const preAssessmentService = await prisma.service.findFirst({
        where: {
          ...(assignedPreAssessmentSlug ? { slug: assignedPreAssessmentSlug } : {}),
          visibility: "CORPORATE_ONLY",
          isActive: true,
          country: { code: employee.company.countryCode },
        },
        select: { slug: true },
      });
      const profileComplete = isEmployeeProfileComplete(employee);
      const bookPath = preAssessmentService
        ? `/${employee.company.countryCode.toLowerCase()}/en/book?service=${preAssessmentService.slug}${
            employee.company.preAssessmentDoctorId
              ? `&doctor=${employee.company.preAssessmentDoctorId}`
              : ""
          }`
        : null;
      return okResponse({
        memberType: "EMPLOYEE",
        companyName: employee.company.name,
        companyLive: companyIsLive(employee.company),
        planName: employee.company.plan.name,
        maxBeneficiaries: employee.company.plan.maxBeneficiariesPerEmployee,
        status: employee.status,
        onboarding: {
          profileComplete,
          preAssessment: {
            required: true,
            booked: ["PREASSESSMENT_BOOKED", "ACTIVE", "SUSPENDED"].includes(employee.status),
            completed: employee.status === "ACTIVE" || employee.status === "SUSPENDED",
            bookPath,
          },
        },
        card: card ? serializeCard(card) : null,
        beneficiaries: employee.beneficiaries.map(serializeBeneficiary),
        openRequests: openRequests.map((r) => ({
          id: r.id,
          type: r.type,
          label: REQUEST_TYPE_LABEL[r.type],
          status: r.status,
          bookPath: requestBookPath(employee.company.countryCode, r.type, r.service.slug),
          createdAt: r.createdAt.toISOString(),
        })),
      });
    }

    const beneficiary = await getBeneficiaryMembershipForUser(userId);
    if (beneficiary) {
      const card = await prisma.corporateBenefitCard.findUnique({
        where: { beneficiaryId: beneficiary.id },
      });
      return okResponse({
        memberType: "BENEFICIARY",
        companyName: beneficiary.company.name,
        companyLive: companyIsLive(beneficiary.company),
        planName: beneficiary.company.plan.name,
        status: beneficiary.status,
        card: card ? serializeCard(card) : null,
      });
    }

    return okResponse(null);
  });

  // ── Beneficiary management (employee only) ─────────────────────────────
  const beneficiaryInputSchema = z.object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(40).optional(),
    relationship: z.string().trim().min(1).max(60),
    addressLine1: z.string().trim().max(240).optional(),
    city: z.string().trim().max(120).optional(),
    postalCode: z.string().trim().max(24).optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().trim().max(1000).optional(),
  });

  app.post("/api/me/corporate/beneficiaries", async (request, reply) => {
    const userId = request.authUser!.sub;
    const employee = await getEmployeeMembershipForUser(userId);
    if (!employee) return reply.status(403).send(errorResponse("No corporate employee membership"));
    if (!companyIsLive(employee.company)) {
      return reply.status(403).send(errorResponse("Your company plan is not active"));
    }
    const parsed = beneficiaryInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid beneficiary details", parsed.error.flatten()));
    }
    const input = parsed.data;
    const email = input.email.toLowerCase();
    const maxBeneficiaries = employee.company.plan.maxBeneficiariesPerEmployee;

    // Race-safe max-N: count + create inside one tx (plan doc §9.1).
    try {
      const beneficiary = await prisma.$transaction(async (tx) => {
        const count = await tx.corporateBeneficiary.count({
          where: { employeeId: employee.id, status: { not: "REMOVED" } },
        });
        if (count >= maxBeneficiaries) {
          throw new Error(`LIMIT:You can add up to ${maxBeneficiaries} beneficiaries`);
        }
        return tx.corporateBeneficiary.create({
          data: {
            employeeId: employee.id,
            companyId: employee.companyId,
            firstName: input.firstName,
            lastName: input.lastName,
            email,
            phone: input.phone || null,
            relationship: input.relationship,
            addressLine1: input.addressLine1 || null,
            city: input.city || null,
            postalCode: input.postalCode || null,
            dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
            notes: input.notes || null,
          },
        });
      });
      const status = await mintAndSendInvite({ type: "BENEFICIARY", memberId: beneficiary.id });
      return okResponse({ id: beneficiary.id, status });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.startsWith("LIMIT:")) {
        return reply.status(400).send(errorResponse(message.slice("LIMIT:".length)));
      }
      if (message.includes("Unique constraint") || (error as { code?: string })?.code === "P2002") {
        return reply.status(409).send(errorResponse("A beneficiary with this email already exists"));
      }
      throw error;
    }
  });

  app.patch("/api/me/corporate/beneficiaries/:id", async (request, reply) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const employee = await getEmployeeMembershipForUser(userId);
    if (!employee) return reply.status(403).send(errorResponse("No corporate employee membership"));
    const beneficiary = await prisma.corporateBeneficiary.findFirst({
      where: { id, employeeId: employee.id },
    });
    if (!beneficiary) return reply.status(404).send(errorResponse("Beneficiary not found"));

    const schema = z.object({ action: z.literal("REMOVE") });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid payload"));
    await prisma.corporateBeneficiary.update({
      where: { id },
      data: { status: "REMOVED" },
    });
    await prisma.corporateBenefitCard.updateMany({
      where: { beneficiaryId: id },
      data: { status: "EXPIRED" },
    });
    return okResponse({ id });
  });

  app.post("/api/me/corporate/beneficiaries/:id/resend-invite", async (request, reply) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const employee = await getEmployeeMembershipForUser(userId);
    if (!employee) return reply.status(403).send(errorResponse("No corporate employee membership"));
    const beneficiary = await prisma.corporateBeneficiary.findFirst({
      where: { id, employeeId: employee.id },
      select: { status: true },
    });
    if (!beneficiary) return reply.status(404).send(errorResponse("Beneficiary not found"));
    if (!["INVITED", "INVITE_SENT", "INVITE_FAILED"].includes(beneficiary.status)) {
      return reply.status(400).send(errorResponse("This beneficiary has already registered"));
    }
    const status = await mintAndSendInvite({ type: "BENEFICIARY", memberId: id, isReminder: true });
    return okResponse({ id, status });
  });
};

export default meCorporateRoute;
