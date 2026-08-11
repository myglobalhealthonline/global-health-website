import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  createAppointmentWithOptionalOwner,
  DoctorNotAssignedToServiceError,
  SlotAlreadyTakenError,
} from "../modules/appointments/appointments.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { bookingSchema, NATIONAL_ID_VALIDATORS } from "../validations/booking.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { sendBookingConfirmationEmail } from "../lib/email/templates.js";
import { isStripeConfigured } from "../lib/stripe/client.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { computeSlotPrice, getServicePeakConfig } from "../modules/pricing/peak-pricing.service.js";
import { resolveDoctorTimeZone } from "../modules/doctor-availability/doctor-availability.service.js";
import { promoteAppointmentConsents } from "../modules/consents/promote-appointment-consents.js";

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
            requireNationalId: true,
            requireAddress: true,
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
          if (settings.requireNationalId) {
            const id = (parsed.data.nationalIdNumber ?? "").trim();
            const validator = NATIONAL_ID_VALIDATORS[parsed.data.country];
            const label = validator?.label ?? "National ID";
            if (!id) {
              return reply
                .status(400)
                .send(errorResponse(`A ${label} is required for bookings in this country.`));
            }
            if (validator && !validator.valid(id)) {
              return reply
                .status(400)
                .send(errorResponse(`The ${label} you entered is not in the expected format.`));
            }
          }
          // Brazil: CPF (nationalIdNumber) or, failing that, a passport
          // number — the prescription needs ONE identifier to print.
          if (
            parsed.data.country === "br" &&
            !(parsed.data.nationalIdNumber ?? "").trim() &&
            !(parsed.data.passportNumber ?? "").trim()
          ) {
            return reply
              .status(400)
              .send(errorResponse("Enter your CPF or your passport number to continue."));
          }
          if (settings.requireAddress) {
            const missing: string[] = [];
            if (!parsed.data.addressLine1) missing.push("street address");
            if (!parsed.data.addressCity) missing.push("city");
            if (!parsed.data.addressPostalCode) missing.push("postal code");
            if (missing.length > 0) {
              return reply
                .status(400)
                .send(
                  errorResponse(
                    `Address required for this country. Missing: ${missing.join(", ")}.`,
                  ),
                );
            }
          }
        }
      } catch (settingsErr) {
        // Settings lookup is best-effort — never block bookings if the
        // table is empty / lookup fails.
        app.log.warn({ err: settingsErr }, "BookingSetting lookup failed; allowing booking");
      }

      // Dual GDPR consent — required for EVERY booking regardless of
      // country and regardless of whether a BookingSetting row exists.
      // Fired outside the settings try/catch so a settings lookup
      // failure doesn't bypass the legal-basis check. Both flags must
      // be explicitly true (schema loosened them to optional booleans
      // for legacy /book-online template compat; enforcement is here).
      if (parsed.data.gdprConsentClinic !== true) {
        return reply.status(400).send(
          errorResponse(
            "Clinic data sharing consent is required to book a consultation.",
          ),
        );
      }
      if (parsed.data.gdprConsentPlatform !== true) {
        return reply.status(400).send(
          errorResponse(
            "Platform processing consent is required to book a consultation.",
          ),
        );
      }

      let authUserId: string | null = null;
      try {
        const authUser = await resolveOptionalAuthUser(request);
        authUserId = authUser?.id ?? null;
      } catch (error) {
        app.log.warn(error, "Unable to resolve booking owner from auth cookie; proceeding as guest booking");
      }

      const created = await createAppointmentWithOptionalOwner(parsed.data, { userId: authUserId });

      // Promote the medical-access consent just captured straight into the
      // append-only ledger — for logged-in bookings by userId, and for guest
      // bookings by email (no-op if no PatientProfile exists yet; it will be
      // promoted later on login/verify or at payment time — see
      // claimGuestAppointmentsForUser and complete-order-payment.service.ts).
      promoteAppointmentConsents(authUserId, parsed.data.email).catch((err) => {
        app.log.warn({ err, userId: authUserId }, "Could not promote booking-time medical-access consents");
      });

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
            let priceCurrencyCode = service.currencyCode;

            // Peak/off-peak recompute (code review 2026-07-05, bug #2) — every
            // other booking surface (cart, checkout, admin manual booking)
            // derives the charged price from the slot's clinic-local start
            // time specifically as an anti-tamper measure; this direct-booking
            // endpoint was stamping the flat base price regardless of the
            // slot picked, letting a PEAK slot be booked at STANDARD price.
            if (parsed.data.timeSlotId) {
              try {
                const bookedSlot = await prisma.appointment.findUnique({
                  where: { id: created.id },
                  select: { doctorId: true, scheduledAt: true },
                });
                if (
                  bookedSlot?.doctorId &&
                  bookedSlot.scheduledAt &&
                  service.basePriceCents != null &&
                  service.currencyCode
                ) {
                  const peakConfig = await getServicePeakConfig(service.id);
                  if (peakConfig?.enabled) {
                    const tz = await resolveDoctorTimeZone(bookedSlot.doctorId);
                    const priced = computeSlotPrice({
                      config: peakConfig,
                      basePriceCents: service.basePriceCents,
                      fallbackCurrency: service.currencyCode,
                      slotStartUtc: bookedSlot.scheduledAt,
                      clinicTimezone: tz,
                    });
                    amountCents = priced.unitPriceCents;
                    priceCurrencyCode = priced.currencyCode;
                  }
                }
              } catch (peakErr) {
                app.log.warn(
                  { err: peakErr, appointmentId: created.id },
                  "Peak-pricing recompute failed; booking saved at base price",
                );
              }
            }

            await prisma.appointment.update({
              where: { id: created.id },
              data: {
                serviceId: service.id,
                amountCents,
                currencyCode: priceCurrencyCode,
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
      if (error instanceof DoctorNotAssignedToServiceError) {
        // 400 — patient/payload mismatch (often a stale form). UI should
        // refresh the doctor picker and surface the message.
        return reply.status(400).send(errorResponse(error.message));
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
