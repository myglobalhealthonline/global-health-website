import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  companyIsLive,
  getBeneficiaryMembershipForUser,
  getEmployeeMembershipForUser,
  isBeneficiaryProfileComplete,
  isEmployeeProfileComplete,
  memberBookingLocale,
} from "../modules/corporate/corporate-shared.js";
import {
  serializeBeneficiary,
  serializeCard,
} from "../modules/corporate/corporate-serializers.js";
import { mintAndSendInvite } from "../modules/corporate/corporate-invite.service.js";
import {
  activateBeneficiary,
  notifyCompanyMemberProfileComplete,
  setBeneficiaryStanding,
} from "../modules/corporate/corporate-status.service.js";
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
      // CORPORATE_ONLY service in the company's country. The fallback has to
      // be a SECOND query — folding the slug into one `findFirst` meant a
      // plan pointing at a slug with no row in this country returned null and
      // left the employee with no way to book.
      const preAssessmentBase = {
        visibility: "CORPORATE_ONLY" as const,
        isActive: true,
        country: { code: employee.company.countryCode },
      };
      const preAssessmentService =
        (assignedPreAssessmentSlug
          ? await prisma.service.findFirst({
              where: { ...preAssessmentBase, slug: assignedPreAssessmentSlug },
              select: { slug: true },
            })
          : null) ??
        (await prisma.service.findFirst({
          where: preAssessmentBase,
          select: { slug: true },
        }));
      const profileComplete = isEmployeeProfileComplete(employee);
      const locale = await memberBookingLocale(userId, employee.company.countryCode);
      const bookPath = preAssessmentService
        ? `/${employee.company.countryCode.toLowerCase()}/${locale}/book?service=${preAssessmentService.slug}${
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
        // The member's own membership-row profile — what completeness is
        // computed from, and what the self-service completion form prefills.
        profile: {
          phone: employee.phone,
          dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString().slice(0, 10) : null,
          addressLine1: employee.addressLine1,
          city: employee.city,
          postalCode: employee.postalCode,
        },
        card: card ? serializeCard(card) : null,
        beneficiaries: employee.beneficiaries.map(serializeBeneficiary),
        openRequests: openRequests.map((r) => ({
          id: r.id,
          type: r.type,
          label: REQUEST_TYPE_LABEL[r.type],
          status: r.status,
          bookPath: requestBookPath(
            employee.company.countryCode,
            locale,
            r.type,
            r.service.slug,
          ),
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
        profile: {
          phone: beneficiary.phone,
          dateOfBirth: beneficiary.dateOfBirth
            ? beneficiary.dateOfBirth.toISOString().slice(0, 10)
            : null,
          addressLine1: beneficiary.addressLine1,
          city: beneficiary.city,
          postalCode: beneficiary.postalCode,
        },
        card: card ? serializeCard(card) : null,
      });
    }

    return okResponse(null);
  });

  /**
   * Self-service profile completion. PROFILE_INCOMPLETE was a dead end: the
   * pre-assessment gate refuses it, `/account/profile` writes the User row (not
   * the membership row this status is computed from), and the corporate admin
   * is blocked from editing details post-registration. The only escape was an
   * admin FORCE_ACTIVATE, which skips the mandatory pre-assessment entirely.
   */
  app.patch("/api/me/corporate/profile", async (request, reply) => {
    const userId = request.authUser!.sub;
    const schema = z.object({
      phone: z.string().trim().max(40).optional(),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      addressLine1: z.string().trim().max(240).optional(),
      city: z.string().trim().max(120).optional(),
      postalCode: z.string().trim().max(24).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid profile", parsed.error.flatten()));
    }
    const input = parsed.data;
    const data = {
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 || null } : {}),
      ...(input.city !== undefined ? { city: input.city || null } : {}),
      ...(input.postalCode !== undefined ? { postalCode: input.postalCode || null } : {}),
      ...(input.dateOfBirth ? { dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`) } : {}),
    };

    const employee = await getEmployeeMembershipForUser(userId);
    if (employee) {
      const updated = await prisma.corporateEmployee.update({
        where: { id: employee.id },
        data,
      });
      if (updated.status === "PROFILE_INCOMPLETE" && isEmployeeProfileComplete(updated)) {
        await prisma.corporateEmployee.update({
          where: { id: employee.id },
          data: { status: "PREASSESSMENT_PENDING" },
        });
        void notifyCompanyMemberProfileComplete("EMPLOYEE", employee.id).catch((error) =>
          request.log.warn({ err: error }, "corporate profile-complete notice failed"),
        );
        return okResponse({ status: "PREASSESSMENT_PENDING" });
      }
      return okResponse({ status: updated.status });
    }

    const beneficiary = await getBeneficiaryMembershipForUser(userId);
    if (beneficiary) {
      const updated = await prisma.corporateBeneficiary.update({
        where: { id: beneficiary.id },
        data,
      });
      if (updated.status === "PROFILE_INCOMPLETE" && isBeneficiaryProfileComplete(updated)) {
        // Issues the card too — a beneficiary is ACTIVE the moment their
        // profile is complete (no pre-assessment for them).
        await activateBeneficiary(beneficiary.id);
        return okResponse({ status: "ACTIVE" });
      }
      return okResponse({ status: updated.status });
    }

    return reply.status(403).send(errorResponse("No corporate membership"));
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

  /** Adding a beneficiary or re-sending their invite hands out a benefit card
   *  and a discount. A SUSPENDED employee must not be able to do that through
   *  a proxy they create — suspension would be trivially bypassable. */
  const inGoodStanding = (status: string) => status !== "SUSPENDED";

  app.post("/api/me/corporate/beneficiaries", async (request, reply) => {
    const userId = request.authUser!.sub;
    const employee = await getEmployeeMembershipForUser(userId);
    if (!employee) return reply.status(403).send(errorResponse("No corporate employee membership"));
    if (!companyIsLive(employee.company)) {
      return reply.status(403).send(errorResponse("Your company plan is not active"));
    }
    if (!inGoodStanding(employee.status)) {
      return reply.status(403).send(errorResponse("Your membership is suspended"));
    }
    const parsed = beneficiaryInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid beneficiary details", parsed.error.flatten()));
    }
    const input = parsed.data;
    const email = input.email.toLowerCase();
    const maxBeneficiaries = employee.company.plan.maxBeneficiariesPerEmployee;

    // Race-safe max-N (plan doc §9.1). A transaction alone was NOT enough:
    // Postgres runs READ COMMITTED, so a burst of parallel POSTs each read the
    // same pre-burst count and all pass the cap (measured: 8 concurrent → 8
    // rows on a cap of 5). Locking the employee row serialises the burst.
    try {
      const beneficiary = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "CorporateEmployee" WHERE id = ${employee.id} FOR UPDATE`;
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
      },
      // Concurrent adds now queue on the row lock instead of racing. Prisma's
      // 5s default counts that wait, so a burst against a remote DB timed the
      // later transactions out (P2028) — a 500 where the caller should get
      // either a row or the cap message.
      { timeout: 15_000 });
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
    // One removal path for both sides. Hand-rolling the removal here left the
    // outstanding invites alive: the token lookup kept returning the removed
    // person's name, company and masked email long after they were gone.
    const result = await setBeneficiaryStanding(id, "REMOVE");
    if (!result.ok) return reply.status(400).send(errorResponse(result.message ?? "Not allowed"));
    return okResponse({ id });
  });

  // Same posture as the public invite endpoints — it sends mail/WhatsApp.
  app.post("/api/me/corporate/beneficiaries/:id/resend-invite", {
    config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const employee = await getEmployeeMembershipForUser(userId);
    if (!employee) return reply.status(403).send(errorResponse("No corporate employee membership"));
    if (!inGoodStanding(employee.status)) {
      return reply.status(403).send(errorResponse("Your membership is suspended"));
    }
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
