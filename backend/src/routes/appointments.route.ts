import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  createAppointmentWithOptionalOwner,
  SlotAlreadyTakenError,
} from "../modules/appointments/appointments.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { bookingSchema } from "../validations/booking.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { sendBookingConfirmationEmail } from "../lib/email/templates.js";
import { isStripeConfigured } from "../lib/stripe/client.js";
import { recordAudit } from "../modules/audit/audit.service.js";

const appointmentsRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/appointments", {
    // 5 booking requests per hour per IP. Real patients book once; bots
    // try to flood the admin inbox.
    config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const parsed = bookingSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(
        errorResponse("Invalid booking request", parsed.error.flatten()),
      );
    }

    try {
      // Enforce per-country BookingSetting before doing any work. The
      // setting is admin-controlled at /admin/countries — operators can
      // disable bookings in a country (maintenance, regulator pause)
      // and require phone collection where local rules need it.
      try {
        const settings = await prisma.bookingSetting.findFirst({
          where: { country: { code: parsed.data.country } },
          select: {
            bookingEnabled: true,
            requirePhone: true,
            requireDateOfBirth: true,
          },
        });
        if (settings) {
          if (settings.bookingEnabled === false) {
            return reply
              .status(503)
              .send(
                errorResponse(
                  "Online bookings are paused for this country. Please contact us by email.",
                ),
              );
          }
          if (settings.requirePhone && !parsed.data.phone) {
            return reply
              .status(400)
              .send(errorResponse("A phone number is required for bookings in this country."));
          }
          if (settings.requireDateOfBirth && !parsed.data.dateOfBirth) {
            return reply
              .status(400)
              .send(errorResponse("A date of birth is required for bookings in this country."));
          }
        }
      } catch (settingsErr) {
        // Settings lookup is best-effort — never block bookings if the
        // table is empty / lookup fails.
        app.log.warn({ err: settingsErr }, "BookingSetting lookup failed; allowing booking");
      }

      let authUserId: string | null = null;
      try {
        const authUser = await resolveOptionalAuthUser(request);
        authUserId = authUser?.id ?? null;
      } catch (error) {
        app.log.warn(error, "Unable to resolve booking owner from auth cookie; proceeding as guest booking");
      }

      const created = await createAppointmentWithOptionalOwner(parsed.data, { userId: authUserId });

      // Resolve the catalogue Service (if a slug was passed) and copy its
      // price + currency onto the appointment. This makes Stripe Checkout
      // a single round-trip later — no second look-up needed.
      let amountCents: number | null = null;
      if (parsed.data.serviceSlug) {
        try {
          // Try Service first — typical case for GP / specialist /
          // prescription bookings.
          const service = await prisma.service.findFirst({
            where: {
              slug: parsed.data.serviceSlug,
              country: { code: parsed.data.country },
              isActive: true,
            },
            select: { id: true, basePriceCents: true, currencyCode: true },
          });
          if (service) {
            amountCents = service.basePriceCents;
            await prisma.appointment.update({
              where: { id: created.id },
              data: {
                serviceId: service.id,
                amountCents: service.basePriceCents,
                currencyCode: service.currencyCode,
              },
            });
          } else {
            // Fall through to HealthTest — slug came from a test card.
            // Stamps healthTestId + the test's price/currency so Stripe
            // checkout fires the same way as for Services.
            const test = await prisma.healthTest.findFirst({
              where: {
                slug: parsed.data.serviceSlug,
                country: { code: parsed.data.country },
                isActive: true,
              },
              select: { id: true, priceCents: true, currencyCode: true },
            });
            if (test) {
              amountCents = test.priceCents;
              await prisma.appointment.update({
                where: { id: created.id },
                data: {
                  healthTestId: test.id,
                  amountCents: test.priceCents,
                  currencyCode: test.currencyCode,
                },
              });
            }
          }
        } catch (svcErr) {
          app.log.warn({ err: svcErr }, "Service/HealthTest slug lookup failed; booking saved without price");
        }
      }

      // Confirmation email — fire and forget. Email delivery failures must
      // never block the booking response (admin still sees the inbox row).
      try {
        await sendBookingConfirmationEmail({
          to: parsed.data.email,
          fullName: parsed.data.fullName,
          consultationType: parsed.data.consultationType,
          countryName: parsed.data.country.toUpperCase(),
        });
      } catch (emailError) {
        app.log.warn(
          { err: emailError, email: parsed.data.email },
          "Booking confirmation email failed",
        );
      }

      recordAudit({
        actorUserId: authUserId ?? undefined,
        actorRole: authUserId ? "PATIENT" : "SYSTEM",
        action: "APPOINTMENT_CREATED",
        entityType: "Appointment",
        entityId: created.id,
        metadata: {
          consultationType: parsed.data.consultationType,
          country: parsed.data.country,
          serviceSlug: parsed.data.serviceSlug ?? null,
          amountCents,
        },
        request,
      }).catch(() => {});

      // Caller (the booking form) uses `paymentRequired` to decide whether to
      // route the user to Stripe Checkout vs the thank-you screen.
      const paymentRequired =
        isStripeConfigured() && amountCents !== null && amountCents > 0;

      return okResponse(
        {
          status: "request_received",
          appointmentId: created.id,
          paymentRequired,
        },
        "Request received. Our team will follow up.",
      );
    } catch (error) {
      if (error instanceof SlotAlreadyTakenError) {
        return reply.status(409).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected appointment error"));
    }
  });
};

export default appointmentsRoute;
