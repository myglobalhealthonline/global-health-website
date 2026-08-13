import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import {
  holdsMembershipSuperAdminRole,
  verifyManageMembershipsAccess,
} from "../utils/manage-memberships-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { listBenefitOptions } from "../modules/benefits/benefit-options.service.js";
import { listMembershipOverrideOptions } from "../modules/memberships/membership-override.service.js";
import { adminMembershipBenefitOptionsQuerySchema } from "../validations/admin-membership-benefit-options.schema.js";

/**
 * `GET /api/admin/membership-benefit-options` — the manual-booking form's
 * benefit picker (§11.7). The admin-side twin of `/api/me/benefit-options`,
 * priced by the same resolver so the two surfaces cannot quote different
 * numbers for the same patient and slot.
 *
 * **Deliberately gated on plain `verifyAdminAccess`**, unlike every other admin
 * membership endpoint, which requires MANAGE_MEMBERSHIPS. This is booking-time
 * pricing for one patient an admin is already booking for — not plan config and
 * not the member list. Gating it higher would leave LOCAL_ADMIN, the
 * country-scoped role that actually takes phone bookings, unable to see why a
 * member's price differs from the list price. It returns option labels and
 * prices only; no other member data leaves through here.
 *
 * Keyed on email because a manual booking creates the `User` during the
 * booking: the patient may have no account yet, and email is the membership
 * linking key everywhere else (§5). A patient with no account simply has no
 * options — only the override can apply to them (§11.7).
 */
const adminMembershipBenefitOptionsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/membership-benefit-options", async (request, reply) => {
    const parsed = adminMembershipBenefitOptionsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid query", parsed.error.flatten()));
    }
    const email = parsed.data.email.trim().toLowerCase();

    try {
      const patient = await prisma.user.findFirst({
        where: { email, role: "PATIENT" },
        select: { id: true },
      });

      const result = await listBenefitOptions({
        // No account yet: a sentinel that cannot match any row, so every
        // user-scoped source comes back empty while the service still resolves
        // the peak price the override picker has to be quoted against.
        userId: patient?.id ?? "__manual_booking_no_account__",
        serviceId: parsed.data.serviceId,
        doctorId: parsed.data.doctorId ?? null,
        timeSlotId: parsed.data.timeSlotId ?? null,
        locale: parsed.data.locale ?? null,
      });
      if (!result) return reply.status(404).send(errorResponse("Service not found"));

      // Insurance is dropped rather than passed through: on this form it has its
      // own picker, it is mutually exclusive with a membership (§11.7), and the
      // service rejects the pair — so offering it in the benefit dropdown would
      // only produce a 422 the admin cannot act on. `recommended` is recomputed
      // because removing the cheapest option would otherwise leave the badge on
      // nothing at all.
      const options = result.options.filter((option) => option.source !== "INSURANCE");
      const cheapest = options.reduce<number | null>(
        (min, option) => (min == null ? option.unitPriceCents : Math.min(min, option.unitPriceCents)),
        null,
      );
      const priced = options.map((option) => ({
        ...option,
        recommended: cheapest != null && option.unitPriceCents === cheapest,
      }));

      // Override candidates are SUPER_ADMIN-only, and absent from the payload
      // entirely for everyone else — an empty array would still tell a
      // LOCAL_ADMIN the escape hatch exists.
      const membershipAuth = await verifyManageMembershipsAccess(request);
      const canOverride = membershipAuth.ok && holdsMembershipSuperAdminRole(membershipAuth);
      const service = canOverride
        ? await prisma.service.findUnique({
            where: { id: parsed.data.serviceId },
            select: { id: true, countryId: true, kind: true },
          })
        : null;
      const overrideOptions =
        canOverride && service
          ? await listMembershipOverrideOptions({
              service,
              fullPriceCents: result.fullPriceCents,
              patientEmail: email,
            })
          : canOverride
            ? []
            : null;

      return okResponse({
        fullPriceCents: result.fullPriceCents,
        currencyCode: result.currencyCode,
        slotPriced: result.slotPriced,
        patientHasAccount: patient != null,
        options: priced,
        ...(overrideOptions ? { overrideOptions } : {}),
      });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load benefit options"));
    }
  });
};

export default adminMembershipBenefitOptionsRoute;
