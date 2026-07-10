import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

// ponytail: hard cap, not full page/pageSize — nothing renders a "load
// older" UI for this list yet, and it's newest-first, so a cap just bounds
// worst-case response size for a patient with a very long history.
const LIST_CAP = 200;

/**
 * Patient view of prescriptions:
 *
 *   • `issued` — clinical scripts the doctor wrote during signed
 *     consultations. Read-only history.
 *   • `orders` — appointments where the patient ordered a
 *     `ServiceKind.PRESCRIPTION` product (the "shop" path that
 *     parallels HealthTest orders).
 *
 * GET /api/account/prescriptions
 */

type IssuedPrescription = {
  id: string;
  drugName: string;
  dose: string | null;
  frequency: string | null;
  durationDays: number | null;
  instructions: string | null;
  refills: number;
  appointmentId: string;
  doctorName: string;
  consultationSignedAt: string | null;
  createdAt: string;
};

type PrescriptionOrder = {
  appointmentId: string;
  consultationType: string;
  countryCode: string;
  status: string;
  paymentStatus: string;
  amountCents: number | null;
  currencyCode: string | null;
  scheduledAt: string | null;
  serviceName: string | null;
  createdAt: string;
};

const accountPrescriptionsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/account/prescriptions", async (request, reply) => {
    let user;
    try {
      user = await resolveOptionalAuthUser(request);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      return reply.status(500).send(errorResponse("Authentication error"));
    }
    if (!user) return reply.status(401).send(errorResponse("Not authenticated"));
    if (user.role !== "PATIENT" && user.role !== "ADMIN") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    try {
      // ── Issued prescriptions (clinical) ────────────────────────
      // Only show scripts on SIGNED consultations so unfinished
      // drafts don't leak. Scope by appointment.userId so patients
      // see only their own.
      const issuedRows = await prisma.prescription.findMany({
        where: {
          consultation: {
            status: "SIGNED",
            appointment: { userId: user.id },
          },
        },
        orderBy: { createdAt: "desc" },
        take: LIST_CAP,
        select: {
          id: true,
          drugName: true,
          dose: true,
          frequency: true,
          durationDays: true,
          instructions: true,
          refills: true,
          createdAt: true,
          doctor: { select: { fullName: true } },
          consultation: {
            select: {
              signedAt: true,
              appointmentId: true,
            },
          },
        },
      });

      const issued: IssuedPrescription[] = issuedRows.map((r) => ({
        id: r.id,
        drugName: r.drugName,
        dose: r.dose,
        frequency: r.frequency,
        durationDays: r.durationDays,
        instructions: r.instructions,
        refills: r.refills,
        appointmentId: r.consultation.appointmentId,
        doctorName: r.doctor.fullName,
        consultationSignedAt: r.consultation.signedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      }));

      // ── Online prescription orders ─────────────────────────────
      // Appointments tagged as PRESCRIPTION (either by linked
      // Service.kind or by free-text consultationType).
      const orderRows = await prisma.appointment.findMany({
        where: {
          userId: user.id,
          OR: [
            { service: { kind: "PRESCRIPTION" } },
            { consultationType: { in: ["prescription", "online-prescription"] } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: LIST_CAP,
        select: {
          id: true,
          consultationType: true,
          countryCode: true,
          status: true,
          paymentStatus: true,
          amountCents: true,
          currencyCode: true,
          scheduledAt: true,
          createdAt: true,
          service: { select: { name: true } },
        },
      });

      const orders: PrescriptionOrder[] = orderRows.map((r) => ({
        appointmentId: r.id,
        consultationType: r.consultationType,
        countryCode: r.countryCode,
        status: r.status,
        paymentStatus: r.paymentStatus,
        amountCents: r.amountCents,
        currencyCode: r.currencyCode,
        scheduledAt: r.scheduledAt?.toISOString() ?? null,
        serviceName: r.service?.name ?? null,
        createdAt: r.createdAt.toISOString(),
      }));

      return okResponse({ issued, orders });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load prescriptions"));
    }
  });
};

export default accountPrescriptionsRoute;
