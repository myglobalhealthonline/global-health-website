import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Doctor portal API. Every endpoint here is scoped to the logged-in
 * doctor's own profile + appointments. The `verifyDoctorAccess` helper
 * resolves `User.doctorId` from the session and returns 401/403 before
 * any DB query runs.
 *
 * Surfaces shipped in this MVP:
 *   GET  /api/doctor/me          — profile + stats (today/week appointment counts)
 *   GET  /api/doctor/appointments — list assigned appointments with filters
 *   GET  /api/doctor/patients    — distinct patients with at least one appointment
 *   PATCH /api/doctor/profile    — self-edit name, bio, qualifications, languages
 *
 * Deferred (documented in roadmap as Doctor Dashboard Phase 4):
 *   - Consultation notes / documents
 *   - Forms management
 *   - Exam results
 *   - Services-used tracking
 *   - Invoices visibility
 *   - Reports
 *   - Internal messaging
 */

const listAppointmentsQuerySchema = z.object({
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z
      .enum([
        "REQUEST_RECEIVED",
        "UNDER_REVIEW",
        "CONTACTED",
        "COMPLETED",
        "CANCELLED",
      ])
      .optional(),
  ),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
    .optional(),
  consultationType: z.string().trim().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const profilePatchBodySchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    bio: z.string().trim().max(12000).nullable().optional(),
    qualifications: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
    languages: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
    whatsappNumber: z.string().trim().max(32).nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

const doctorRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/me", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    try {
      // Profile + lightweight stats. `appointmentCount` excludes
      // CANCELLED so the overview tile mirrors the working list.
      const doctor = await prisma.doctor.findUnique({
        where: { id: auth.doctorId },
        select: {
          id: true,
          slug: true,
          fullName: true,
          title: true,
          bio: true,
          qualifications: true,
          languages: true,
          whatsappNumber: true,
          country: { select: { code: true, name: true, slug: true, defaultLocale: true } },
          additionalCountries: {
            include: {
              country: { select: { code: true, name: true, slug: true } },
            },
          },
          specialties: {
            include: { specialty: { select: { name: true, slug: true } } },
          },
          assets: {
            where: { kind: "IMAGE", isActive: true },
            select: { path: true },
            take: 1,
          },
        },
      });
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }

      const now = new Date();
      const startOfDay = new Date(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      );
      const startOfTomorrow = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [todayCount, weekCount, totalActive] = await prisma.$transaction([
        prisma.appointment.count({
          where: {
            doctorId: auth.doctorId,
            scheduledAt: { gte: startOfDay, lt: startOfTomorrow },
            status: { notIn: ["CANCELLED"] },
          },
        }),
        prisma.appointment.count({
          where: {
            doctorId: auth.doctorId,
            scheduledAt: { gte: startOfDay, lt: endOfWeek },
            status: { notIn: ["CANCELLED"] },
          },
        }),
        prisma.appointment.count({
          where: { doctorId: auth.doctorId, status: { notIn: ["CANCELLED", "COMPLETED"] } },
        }),
      ]);

      return okResponse({
        doctor: {
          ...doctor,
          profileImagePath: doctor.assets[0]?.path ?? null,
        },
        stats: { todayCount, weekCount, totalActive },
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load doctor profile"));
    }
  });

  app.get("/api/doctor/appointments", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const query = listAppointmentsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid query", query.error.flatten()));
    }
    const { status, search, from, to, consultationType, page, pageSize } = query.data;
    const fromUtc = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
    const toUtc = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
    try {
      const where = {
        doctorId: auth.doctorId,
        ...(status ? { status } : {}),
        ...(consultationType ? { consultationType } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        // Filter on scheduledAt when present, fall back to createdAt
        // so a brand-new unscheduled booking still shows in "today".
        ...(fromUtc || toUtc
          ? {
              OR: [
                {
                  scheduledAt: {
                    ...(fromUtc ? { gte: fromUtc } : {}),
                    ...(toUtc ? { lte: toUtc } : {}),
                  },
                },
                {
                  AND: [
                    { scheduledAt: null },
                    {
                      createdAt: {
                        ...(fromUtc ? { gte: fromUtc } : {}),
                        ...(toUtc ? { lte: toUtc } : {}),
                      },
                    },
                  ],
                },
              ],
            }
          : {}),
      };
      const [total, rows] = await prisma.$transaction([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            consultationType: true,
            countryCode: true,
            status: true,
            paymentStatus: true,
            scheduledAt: true,
            meetingUrl: true,
            createdAt: true,
            notes: true,
          },
        }),
      ]);
      return okResponse({
        items: rows.map((r) => ({
          ...r,
          scheduledAt: r.scheduledAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          notesPreview: r.notes ? r.notes.slice(0, 200) : null,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply
        .status(500)
        .send(errorResponse("Could not load appointments"));
    }
  });

  app.get("/api/doctor/patients", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    try {
      // Distinct patients (by email since guest bookings may not have
      // a userId) who have at least one appointment with this doctor.
      // The aggregation is a JS groupBy because Prisma's distinct +
      // count is awkward; the per-doctor scope keeps row count small.
      const rows = await prisma.appointment.findMany({
        where: { doctorId: auth.doctorId },
        select: {
          email: true,
          fullName: true,
          phone: true,
          countryCode: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      const map = new Map<
        string,
        {
          email: string;
          fullName: string;
          phone: string | null;
          countryCode: string;
          firstSeen: string;
          appointmentCount: number;
        }
      >();
      for (const r of rows) {
        const key = r.email.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.appointmentCount += 1;
        } else {
          map.set(key, {
            email: r.email,
            fullName: r.fullName,
            phone: r.phone,
            countryCode: r.countryCode,
            firstSeen: r.createdAt.toISOString(),
            appointmentCount: 1,
          });
        }
      }
      return okResponse({ items: Array.from(map.values()) });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load patients"));
    }
  });

  app.patch("/api/doctor/profile", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const body = profilePatchBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid profile update", body.error.flatten()));
    }
    try {
      const updated = await prisma.doctor.update({
        where: { id: auth.doctorId },
        data: {
          ...(body.data.fullName !== undefined && { fullName: body.data.fullName }),
          ...(body.data.bio !== undefined && { bio: body.data.bio }),
          ...(body.data.qualifications !== undefined && {
            qualifications: body.data.qualifications,
          }),
          ...(body.data.languages !== undefined && { languages: body.data.languages }),
          ...(body.data.whatsappNumber !== undefined && {
            whatsappNumber: body.data.whatsappNumber,
          }),
        },
        select: {
          id: true,
          fullName: true,
          bio: true,
          qualifications: true,
          languages: true,
          whatsappNumber: true,
        },
      });
      return okResponse({ doctor: updated }, "Profile updated");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update profile"));
    }
  });
};

export default doctorRoute;
