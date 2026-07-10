import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { countryCodeSchema } from "../validations/shared.schema.js";
import {
  resolveGpSameDayService,
  getGpPriorityDoctorId,
  setGpSameDayServiceId,
  setGpPriorityDoctorId,
} from "../modules/gp-booking/gp-config.service.js";

/**
 * Admin config for the same-day GP quick-book (per country).
 *
 *   GET → current settings + the GENERAL services and GP doctors the admin can
 *         pick from (so the form needs no extra round-trips).
 *   PUT → set/clear the same-day service and/or the priority (Dr. Tiago) doctor.
 *
 * Both values live in the Setting table (see gp-config.service); nothing here
 * touches the Doctor or Service schema.
 */

const putBodySchema = z
  .object({
    sameDayServiceId: z.string().trim().min(1).max(64).nullable().optional(),
    priorityDoctorId: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .strict()
  .refine((d) => d.sameDayServiceId !== undefined || d.priorityDoctorId !== undefined, {
    message: "Provide sameDayServiceId and/or priorityDoctorId",
  });

const adminGpSettingsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get<{ Params: { code: string } }>(
    "/api/admin/countries/:code/gp-settings",
    async (request, reply) => {
      const codeParse = countryCodeSchema.safeParse(request.params.code);
      if (!codeParse.success) {
        return reply.status(400).send(errorResponse("Invalid country code"));
      }
      const code = codeParse.data;
      try {
        const [resolvedService, priorityDoctorId, generalServices] = await Promise.all([
          resolveGpSameDayService(code),
          getGpPriorityDoctorId(code),
          prisma.service.findMany({
            where: { kind: "GENERAL", isActive: true, country: { code } },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, slug: true, name: true },
          }),
        ]);

        // Doctors assigned to the resolved GP service — the valid priority picks.
        const gpDoctors = resolvedService
          ? await prisma.doctor.findMany({
              where: {
                active: true,
                OR: [
                  { country: { code } },
                  { additionalCountries: { some: { active: true, country: { code } } } },
                ],
                assignedServices: {
                  some: { serviceId: resolvedService.id, isActive: true, status: "active" },
                },
              },
              orderBy: { fullName: "asc" },
              select: { id: true, fullName: true, languages: true },
            })
          : [];

        return okResponse({
          countryCode: code,
          sameDayServiceId: resolvedService?.id ?? null,
          priorityDoctorId,
          resolvedService: resolvedService
            ? { id: resolvedService.id, slug: resolvedService.slug, name: resolvedService.name }
            : null,
          generalServices,
          gpDoctors,
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load GP settings"));
      }
    },
  );

  app.put<{ Params: { code: string } }>(
    "/api/admin/countries/:code/gp-settings",
    async (request, reply) => {
      const codeParse = countryCodeSchema.safeParse(request.params.code);
      if (!codeParse.success) {
        return reply.status(400).send(errorResponse("Invalid country code"));
      }
      const parsed = putBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(errorResponse("Invalid body", parsed.error.flatten()));
      }
      const code = codeParse.data;
      try {
        // Validate the service is an active GENERAL service in this country.
        if (parsed.data.sameDayServiceId) {
          const svc = await prisma.service.findFirst({
            where: {
              id: parsed.data.sameDayServiceId,
              kind: "GENERAL",
              isActive: true,
              country: { code },
            },
            select: { id: true },
          });
          if (!svc) {
            return reply
              .status(400)
              .send(errorResponse("That service is not an active GENERAL service in this country"));
          }
        }

        // Validate the priority doctor is assigned to the (resolved or chosen)
        // GP service so he can actually take the slots he'd jump the queue for.
        if (parsed.data.priorityDoctorId) {
          const resolved = await resolveGpSameDayService(code);
          const serviceId = parsed.data.sameDayServiceId ?? resolved?.id ?? null;
          if (!serviceId) {
            return reply
              .status(400)
              .send(errorResponse("Set the same-day GP service before choosing a priority doctor"));
          }
          const assigned = await prisma.doctor.findFirst({
            where: {
              id: parsed.data.priorityDoctorId,
              active: true,
              assignedServices: { some: { serviceId, isActive: true, status: "active" } },
            },
            select: { id: true },
          });
          if (!assigned) {
            return reply
              .status(400)
              .send(errorResponse("That doctor is not an active GP for the same-day service"));
          }
        }

        if (parsed.data.sameDayServiceId !== undefined) {
          await setGpSameDayServiceId(code, parsed.data.sameDayServiceId);
        }
        if (parsed.data.priorityDoctorId !== undefined) {
          await setGpPriorityDoctorId(code, parsed.data.priorityDoctorId);
        }

        // S-008: resolveAdminSessionActor resolves all admin-tier roles
        // (resolveOptionalAuthUser silently dropped SUPER_ADMIN/LOCAL_ADMIN).
        const actor = resolveAdminSessionActor(request);
        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "GP_SETTINGS_UPDATED",
          entityType: "Country",
          entityId: code,
          metadata: {
            gpSameDayServiceId: parsed.data.sameDayServiceId ?? null,
            gpPriorityDoctorId: parsed.data.priorityDoctorId ?? null,
          },
          request,
        }).catch(() => {});

        return okResponse({ countryCode: code }, "GP settings updated");
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update GP settings"));
      }
    },
  );
};

export default adminGpSettingsRoute;
