import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import {
  countPendingAppointmentsByCountry,
  getAppointmentById,
  InvalidAppointmentStatusTransitionError,
  listAppointments,
  scheduleAppointment,
  UnrecognizedAppointmentStatusError,
  updateAppointmentStatus,
} from "../modules/appointments/appointments.service.js";
import { releaseAppointmentSlot } from "../modules/doctor-availability/doctor-availability.service.js";
import {
  assertTargetSlotFree,
  moveAppointmentSlot,
  readSlotMinutes,
} from "../modules/appointments/appointment-slot-move.service.js";
import { releaseMembershipAllowanceForSlot } from "../modules/memberships/membership-allowance.service.js";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { sendAppointmentScheduledEmail } from "../lib/email/templates.js";
import { formatDoctorForPatientNotification } from "../lib/doctor-name.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import {
  assertAdminCountryFolderScope,
  buildCountryCodeFilter,
  resolveAdminListCountryFolders,
} from "../utils/order-country-scope.js";
import {
  CouponAndDiscountConflictError,
  CouponUnavailableError,
} from "../modules/coupons/coupon-reserve.service.js";
import { couponRejectMessage } from "../modules/coupons/coupon-messages.js";
import {
  holdsMembershipSuperAdminRole,
  MEMBERSHIP_SUPER_ADMIN_FORBIDDEN,
  verifyManageMembershipsAccess,
} from "../utils/manage-memberships-auth.js";
import { notifyDoctor } from "../modules/notifications/notify.service.js";
import { resolveCountryTimeZone } from "../modules/countries/country-timezone.service.js";
import { sendAppointmentUpdateNotifications } from "../modules/automation/appointment-update-notifications.service.js";
import { recomputePrePaymentDueAt } from "../modules/automation/pre-payment-flow.service.js";
import { rearmPostPaymentRemindersForReschedule } from "../modules/automation/post-payment-flow.service.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  adminAppointmentsQuerySchema,
  appointmentIdParamsSchema,
  createManualAppointmentBodySchema,
  createManualTestBookingBodySchema,
  scheduleAppointmentBodySchema,
  updateAppointmentBodySchema,
  updateAppointmentLabReferenceBodySchema,
  updateAppointmentStatusBodySchema,
} from "../validations/admin-appointments.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  createManualTestBooking,
  TestCenterNotBookableError,
} from "../modules/appointments/manual-test-booking.service.js";
import {
  createManualBooking,
  DiscountTooLargeError,
  DoctorNotAssignedToServiceError,
  DoctorNotInInsuranceNetworkError,
  InsuranceNotCoveredError,
  DoctorNotAvailableInCountryError,
  DoctorNotFoundError,
  DuplicatePatientError,
  MembershipNotAvailableError,
  MembershipWithInsuranceError,
  ManualBookingUnavailableError,
  ServiceNotFoundError,
  ServicePriceMissingError,
  SlotNotAvailableError,
} from "../modules/appointments/manual-booking.service.js";
import { MembershipOverrideError } from "../modules/memberships/membership-override.service.js";
import {
  adminUpdateAppointment,
  AppointmentNotFoundError,
  NoAppointmentChangesError,
  TargetSlotUnavailableError,
  TestBookingRescheduleUnsupportedError,
} from "../modules/appointments/admin-update-appointment.service.js";

/**
 * AZ-1: `verifyAdminAccess` treats LOCAL_ADMIN exactly like ADMIN, so every
 * route below was reachable for any country's appointment. Resolve the target's
 * own country and run the same folder check `/api/admin/orders*` has used since
 * the 2026-07-05 review. Called BEFORE any mutation, so a denial leaves the
 * appointment untouched. ADMIN, SUPER_ADMIN and the admin-token fallback are
 * unscoped and pass straight through.
 */
async function assertAppointmentCountryScope(
  request: FastifyRequest,
  appointmentId: string,
): Promise<{ allowed: true } | { allowed: false; status: 403 | 404; message: string }> {
  // ADMIN, SUPER_ADMIN and the admin-token fallback are never scoped, so skip
  // the lookup entirely for them rather than fetching a row only to discard it.
  // `resolveAdminSessionActor` is a synchronous JWT decode — no DB call.
  if (resolveAdminSessionActor(request)?.role !== "LOCAL_ADMIN") return { allowed: true };

  const target = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { countryCode: true },
  });
  if (!target) return { allowed: false, status: 404, message: "Appointment not found" };
  return assertAdminCountryFolderScope(request, {
    entityType: "Appointment",
    entityId: appointmentId,
    countryCode: target.countryCode,
    auditReason: "LOCAL_ADMIN appointment access outside assigned country scope",
    deniedMessage: "This appointment is outside your assigned country scope",
  });
}

const adminAppointmentsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/appointments", async (request, reply) => {
    const query = adminAppointmentsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointments query", query.error.flatten()));
    }

    try {
      // AZ-1: clamp the list to a LOCAL_ADMIN's assigned folders. An explicit
      // out-of-scope `?countryCode=` returns nothing rather than falling back
      // to the admin's own country or to every country.
      const scopedFolders = await resolveAdminListCountryFolders(request);

      const data = await listAppointments({
        page: query.data.page,
        pageSize: query.data.pageSize,
        status: query.data.status,
        countryCode: buildCountryCodeFilter(query.data.countryCode, scopedFolders),
        consultationType: query.data.consultationType,
        search: query.data.search,
        email: query.data.email,
        doctorName: query.data.doctorName,
        dateFrom: query.data.dateFrom,
        dateTo: query.data.dateTo,
      });
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin appointments error"));
    }
  });

  // Global per-country pending counts for the dashboard's Country-health
  // table — a groupBy count, not the capped/paginated list, so a country's
  // pending backlog is never silently dropped once total volume passes the
  // list endpoint's 100-row cap.
  app.get("/api/admin/appointments/pending-counts", async (request, reply) => {
    try {
      const scopedFolders = await resolveAdminListCountryFolders(request);
      const counts = await countPendingAppointmentsByCountry(scopedFolders ?? undefined);
      return okResponse({ counts });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin appointments error"));
    }
  });

  /**
   * Admin-initiated manual appointment creation. Walks the full
   * pipeline (patient User + temp password + Stripe Checkout + branded
   * reservation email) via `createManualBooking`. Body shape lives in
   * `createManualAppointmentBodySchema`; response carries the temp
   * password + set-password URL so the admin can share them if email
   * delivery fails.
   */
  app.post("/api/admin/appointments", async (request, reply) => {
    const body = createManualAppointmentBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid manual booking payload", body.error.flatten()));
    }

    // Determine the admin actor id. Session cookie → User.id; token
    // fallback has no User row, so we pass null and rely on the audit
    // metadata + actorRole + IP address for traceability. (AuditLog
    // FK rejects synthetic strings.)
    //
    // S-008: previously used resolveOptionalAuthUser, which resolves only
    // PATIENT/ADMIN and silently returned null (→ no adminUserId) for a
    // real SUPER_ADMIN/LOCAL_ADMIN session. resolveAdminSessionActor
    // resolves all three admin-tier roles directly from the JWT, so its
    // result is never a PATIENT and needs no extra role check.
    const actor = resolveAdminSessionActor(request);
    const adminUserId: string | null = actor?.userId ?? null;

    // The goodwill override (§11.7, decision 26) needs a SUPER_ADMIN in a real
    // session. This route's onRequest hook is plain `verifyAdminAccess`, so the
    // check lands in the handler rather than on the hook — the rest of the
    // endpoint stays reachable by every admin tier that takes phone bookings,
    // and only the escape hatch is raised. `holdsMembershipSuperAdminRole` is
    // the same rule the allowance adjust uses, reached through the same
    // `verifyManageMembershipsAccess` — one notion of "admin" across both writes
    // that hand out money by hand, and the shared master token reaches neither.
    if (body.data.membership?.override) {
      const membershipAuth = await verifyManageMembershipsAccess(request);
      if (!membershipAuth.ok || !holdsMembershipSuperAdminRole(membershipAuth)) {
        return reply.status(403).send(errorResponse(MEMBERSHIP_SUPER_ADMIN_FORBIDDEN));
      }
    }

    try {
      // AZ-1 (security review): creation took `countryCode` straight from the
      // body, so a LOCAL_ADMIN could open a booking in someone else's country —
      // patient account, order, Stripe session and a claimed slot on that
      // country's doctor. Checked here, before `createManualBooking` resolves
      // any id, so a denial writes nothing at all. `countryCodeSchema` has
      // already lowercased the value.
      const createScope = await assertAdminCountryFolderScope(request, {
        entityType: "Appointment",
        entityId: "new",
        countryCode: body.data.countryCode,
        auditReason: "LOCAL_ADMIN manual booking outside assigned country scope",
        deniedMessage: "This country is outside your assigned country scope",
      });
      if (!createScope.allowed) {
        return reply.status(createScope.status).send(errorResponse(createScope.message));
      }

      const result = await createManualBooking({
        adminUserId,
        patient: body.data.patient,
        allowDuplicatePatient: body.data.allowDuplicatePatient ?? false,
        serviceId: body.data.serviceId,
        doctorId: body.data.doctorId,
        timeSlotId: body.data.timeSlotId,
        durationMinutes: body.data.durationMinutes ?? null,
        consultationMode: body.data.consultationMode,
        clinicId: body.data.clinicId ?? null,
        locationAddress: body.data.locationAddress ?? null,
        notes: body.data.notes ?? null,
        countryCode: body.data.countryCode,
        notificationLocale: body.data.notificationLocale ?? null,
        insuranceCompanyId: body.data.insuranceCompanyId ?? null,
        insurancePolicyNumber: body.data.insurancePolicyNumber ?? null,
        discountPercent: body.data.discountPercent ?? null,
        couponCode: body.data.couponCode ?? null,
        membership: body.data.membership ?? null,
        returnTo: body.data.returnTo,
        request,
      });
      return reply.status(201).send(okResponse(result, "Manual booking created"));
    } catch (error) {
      if (error instanceof ServiceNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof DoctorNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      // Anti-tamper: the doctor exists but isn't bookable for this
      // country/service combination. Rejected server-side even if the
      // admin UI is bypassed.
      if (
        error instanceof DoctorNotAvailableInCountryError ||
        error instanceof DoctorNotAssignedToServiceError ||
        // Insurance: doctor outside the insurer's network, or the insurer
        // doesn't cover the service. Same anti-tamper rationale.
        error instanceof DoctorNotInInsuranceNetworkError ||
        error instanceof InsuranceNotCoveredError ||
        // Membership: not this patient's, not active, wrong country, no rule for
        // the service, or asked for alongside insurance. Same anti-tamper
        // rationale — and never downgraded to full price, because the admin
        // quoted the member price from the options list (§13.2).
        error instanceof MembershipNotAvailableError ||
        error instanceof MembershipWithInsuranceError
      ) {
        return reply.status(422).send(errorResponse(error.message));
      }
      // The benefit row named by an override vanished, went inactive, or does
      // not govern this service.
      if (error instanceof MembershipOverrideError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      if (error instanceof ServicePriceMissingError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      // Discount left a total Stripe can't charge (above zero, below its
      // per-currency minimum). The slot was already handed back.
      // Coupon refused — expired, exhausted, locked to another email, or not
      // allowed on this booking (insurance / benefit-priced / commission
      // market). The slot was already handed back. `reason` is machine-readable
      // so the admin form can highlight the coupon field rather than the price.
      if (error instanceof CouponUnavailableError) {
        return reply
          .status(422)
          .send({ ok: false, message: couponRejectMessage(error.reason), code: "COUPON_INVALID", reason: error.reason });
      }
      if (error instanceof CouponAndDiscountConflictError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      if (error instanceof DiscountTooLargeError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      // Slot taken / stale between picker load and submit → 409 so the
      // admin re-picks instead of double-booking.
      if (
        error instanceof SlotNotAvailableError ||
        error instanceof ManualBookingUnavailableError
      ) {
        return reply.status(409).send(errorResponse(error.message));
      }
      // The typed email is new but this person already exists. 409 with the
      // matching records attached, so the form can offer the existing
      // patient's address instead of quietly minting a second chart. Nothing
      // was reserved — the check runs before the slot is held.
      if (error instanceof DuplicatePatientError) {
        return reply
          .status(409)
          .send(errorResponse(error.message, { matches: error.matches }));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply
        .status(500)
        .send(errorResponse("Unexpected manual booking error"));
    }
  });

  /**
   * Admin books a test-centre appointment for a patient.
   *
   * Same pipeline as the consultation route above — patient account + temp
   * password + Stripe Checkout + the pre-payment message ladder — through the
   * sibling service. The response carries the temp password and set-password
   * URL so the admin can read them out if email delivery fails.
   */
  app.post("/api/admin/appointments/test-booking", async (request, reply) => {
    const body = createManualTestBookingBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid test booking payload", body.error.flatten()));
    }

    const actor = resolveAdminSessionActor(request);
    const adminUserId: string | null = actor?.userId ?? null;

    try {
      // Same AZ-1 guard the consultation route carries: countryCode arrives in
      // the body, so a LOCAL_ADMIN could otherwise open a booking — patient
      // account, order, Stripe session and a claimed centre slot — in a market
      // outside their scope. Checked before the service resolves any id, so a
      // denial writes nothing at all.
      const createScope = await assertAdminCountryFolderScope(request, {
        entityType: "Appointment",
        entityId: "new",
        countryCode: body.data.countryCode,
        auditReason: "LOCAL_ADMIN manual test booking outside assigned country scope",
        deniedMessage: "This country is outside your assigned country scope",
      });
      if (!createScope.allowed) {
        return reply.status(createScope.status).send(errorResponse(createScope.message));
      }

      const result = await createManualTestBooking({
        adminUserId,
        patient: body.data.patient,
        allowDuplicatePatient: body.data.allowDuplicatePatient ?? false,
        testCenterId: body.data.testCenterId,
        testCenterLocationId: body.data.testCenterLocationId,
        examTypeId: body.data.examTypeId,
        testCenterTimeSlotId: body.data.testCenterTimeSlotId,
        countryCode: body.data.countryCode,
        notes: body.data.notes ?? null,
        discountPercent: body.data.discountPercent ?? null,
        returnTo: body.data.returnTo,
        request,
      });
      return reply.status(201).send(okResponse(result, "Test booking created"));
    } catch (error) {
      // Exam not published, not carried by this centre, or the centre/market is
      // inactive. One message for all of them — an unpublished exam must not be
      // distinguishable from a nonexistent one.
      if (error instanceof TestCenterNotBookableError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      if (error instanceof ServicePriceMissingError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      // Slot taken or stale between picker load and submit → 409 so the admin
      // re-picks rather than double-booking. The slot was already handed back.
      if (error instanceof SlotNotAvailableError) {
        return reply.status(409).send(errorResponse(error.message));
      }
      // The typed email is new but this person already exists. 409 with the
      // matches attached so the form can offer the existing patient rather than
      // quietly minting a second chart. Nothing was reserved — the check runs
      // before the slot is held.
      if (error instanceof DuplicatePatientError) {
        return reply
          .status(409)
          .send(errorResponse(error.message, { matches: error.matches }));
      }
      request.log.error({ err: error }, "[admin] manual test booking failed");
      return reply.status(500).send(errorResponse("Could not create the test booking"));
    }
  });

  app.get("/api/admin/appointments/:id", async (request, reply) => {
    const params = appointmentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointment id", params.error.flatten()));
    }

    try {
      // AZ-1: country scope BEFORE the detail (patient name, email, phone,
      // notes) is loaded at all, so a denied read never materialises it.
      const scope = await assertAppointmentCountryScope(request, params.data.id);
      if (!scope.allowed) {
        return reply.status(scope.status).send(errorResponse(scope.message));
      }

      const appointment = await getAppointmentById(params.data.id);
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      return okResponse({ appointment });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin appointment error"));
    }
  });

  // Schedule (or reschedule) the call. Sets `scheduledAt` + `meetingUrl`,
  // then fires a SendGrid email with the Meet link if both ended up set.
  // The email failure is logged but doesn't fail the request — admin can
  // resend manually if SendGrid is misconfigured.
  app.patch("/api/admin/appointments/:id/schedule", async (request, reply) => {
    const params = appointmentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointment id", params.error.flatten()));
    }
    const body = scheduleAppointmentBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid schedule payload", body.error.flatten()));
    }

    // Normalise empty-string -> null so admins can clear fields via the
    // text inputs they'll see in the admin form.
    const meetingUrlInput =
      body.data.meetingUrl === undefined
        ? undefined
        : body.data.meetingUrl === "" || body.data.meetingUrl === null
          ? null
          : body.data.meetingUrl;
    const scheduledAtInput =
      body.data.scheduledAt === undefined
        ? undefined
        : body.data.scheduledAt === null
          ? null
          : new Date(body.data.scheduledAt);

    // Doctor assignment goes through the same endpoint to keep the
    // "schedule call" admin form a single round-trip. `null` clears the
    // assignment; `undefined` leaves it alone.
    const doctorIdInput = body.data.doctorId ?? undefined;

    // Mode toggle. Cart-flow + manual creation default to ONLINE; admin
    // can flip an existing row to IN_PERSON here, which unlocks the
    // clinic picker + WhereBlock + the in-person reminder cron.
    const consultationModeInput = body.data.consultationMode;

    // Clinic + free-text location for IN_PERSON visits. The Zod schema
    // already rejects "both at once"; here we additionally enforce that
    // an IN_PERSON appointment ends up with at least one location source
    // after the patch is applied.
    const clinicIdInput = body.data.clinicId;
    const locationAddressInput =
      body.data.locationAddress === ""
        ? null
        : body.data.locationAddress;

    try {
      // AZ-1: country scope BEFORE any slot release or write.
      const scope = await assertAppointmentCountryScope(request, params.data.id);
      if (!scope.allowed) {
        return reply.status(scope.status).send(errorResponse(scope.message));
      }

      // Snapshot the pre-update state and the previous doctor+slot in
      // parallel. Without the before-snapshot guard the email re-fires
      // on every admin save even for unrelated edits; the slot snapshot
      // lets us release the booked slot on reschedule and detect doctor changes.
      const [before, beforeSnapshot] = await Promise.all([
        getAppointmentById(params.data.id),
        prisma.appointment.findUnique({
          where: { id: params.data.id },
          select: { doctorId: true, timeSlotId: true },
        }),
      ]);
      const beforeDoctorId = beforeSnapshot?.doctorId ?? null;

      // Reschedule guard: a DoctorTimeSlot belongs to ONE doctor at ONE time,
      // so BOTH dimensions have to move the reservation. Releasing the old slot
      // without claiming a new one left the appointment slotless and its hour
      // still on sale; ignoring a doctor swap left the reservation on the OLD
      // doctor's calendar while the new doctor's hour stayed open — which is
      // how one doctor ended up with two consultations in the same hour
      // (2026-09-08). `before.scheduledAt` is the ISO string
      // (AdminAppointmentDetail.scheduledAt: string | null), so compare
      // strings directly.
      const isReschedule =
        scheduledAtInput !== undefined &&
        (before?.scheduledAt ?? null) !==
          (scheduledAtInput === null ? null : scheduledAtInput.toISOString());
      const isDoctorChange =
        doctorIdInput !== undefined && doctorIdInput !== beforeDoctorId;
      const slotMoveNeeded = isReschedule || isDoctorChange;

      const nextScheduledAt =
        scheduledAtInput !== undefined
          ? scheduledAtInput
          : before?.scheduledAt
            ? new Date(before.scheduledAt)
            : null;
      const nextDoctorId =
        doctorIdInput !== undefined ? doctorIdInput : beforeDoctorId;

      // Refuse a move onto an hour the target doctor has already given away,
      // before anything is written. 409, not 422: the payload is fine, the
      // diary is not.
      if (slotMoveNeeded) {
        try {
          await assertTargetSlotFree(
            nextDoctorId,
            nextScheduledAt,
            beforeSnapshot?.timeSlotId ?? null,
          );
        } catch (slotErr) {
          if (slotErr instanceof TargetSlotUnavailableError) {
            return reply.status(409).send(errorResponse(slotErr.message));
          }
          throw slotErr;
        }
      }

      const previousSlotMinutes = slotMoveNeeded
        ? await readSlotMinutes(beforeSnapshot?.timeSlotId ?? null)
        : null;

      // The order behind this consultation, for the deadline/ladder re-anchor
      // below. Null for legacy and manual rows with no order line.
      const orderIdForAppointment = slotMoveNeeded
        ? (
            await prisma.orderItem.findFirst({
              where: { appointmentId: params.data.id },
              select: { orderId: true },
            })
          )?.orderId ?? null
        : null;

      // For IN_PERSON consults, refuse to land the patch in a state with
      // no location source. Compute the *post-patch* mode (in case admin
      // is flipping ONLINE→IN_PERSON in this same request) and check
      // location accordingly. `before` already contains these fields via
      // AdminAppointmentDetail, so no extra DB read is needed.
      const finalMode =
        consultationModeInput ?? before?.consultationMode ?? "ONLINE";
      if (finalMode === "IN_PERSON") {
        const finalClinicId =
          clinicIdInput === undefined ? before?.clinicId ?? null : clinicIdInput;
        const finalLocationAddress =
          locationAddressInput === undefined
            ? before?.locationAddress ?? null
            : locationAddressInput;
        if (!finalClinicId && !finalLocationAddress) {
          return reply
            .status(422)
            .send(
              errorResponse(
                "In-person appointments need a clinic or a location address.",
              ),
            );
        }
      }

      const appointment = await scheduleAppointment(params.data.id, {
        scheduledAt: scheduledAtInput,
        meetingUrl: meetingUrlInput,
        doctorId: doctorIdInput,
        ...(consultationModeInput !== undefined
          ? { consultationMode: consultationModeInput }
          : {}),
        clinicId: clinicIdInput,
        locationAddress: locationAddressInput,
      });
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }

      // `scheduleAppointment` writes the scalar columns only. Hand the old
      // reservation back to the grid and claim one at the new time/doctor —
      // best-effort, so an off-grid admin time still saves and simply stays
      // slotless.
      if (slotMoveNeeded) {
        const releasedSlotId = beforeSnapshot?.timeSlotId ?? null;
        const claimedSlotId = await moveAppointmentSlot({
          appointmentId: params.data.id,
          currentSlotId: releasedSlotId,
          nextDoctorId,
          nextScheduledAt,
          slotMinutes: previousSlotMinutes,
        });
        if (releasedSlotId) {
          recordAudit({
            actorRole: "ADMIN",
            action: "TIMESLOT_RELEASED",
            entityType: "DoctorTimeSlot",
            entityId: releasedSlotId,
            metadata: {
              reason: isDoctorChange ? "admin_doctor_change" : "admin_reschedule",
              appointmentId: params.data.id,
              // null = the appointment is now slotless (off-grid time). First
              // thing to check when a doctor reports a surprise double-booking.
              claimedSlotId,
            },
            request,
          }).catch(() => {});
        }
      }

      // Deadlines and ladders are anchored to the consultation's start, so a
      // move through this form has to re-anchor them the way every other
      // reschedule path does. Without this the pre-payment cancel sweep still
      // counts down to the OLD time (it can void a booking that was moved
      // later), and a post-payment stage already fired for the old time — or
      // for the previous doctor — never fires again.
      //
      // Deliberately NOT the full `applyRescheduleSideEffects`: this endpoint
      // takes the meeting link from the admin and sends its own schedule email,
      // so regenerating Meet and firing the "appointment updated" notification
      // here would contradict both.
      if (slotMoveNeeded && orderIdForAppointment) {
        if (isReschedule) {
          await recomputePrePaymentDueAt(
            orderIdForAppointment,
            nextScheduledAt,
          ).catch(() => undefined);
        }
        await rearmPostPaymentRemindersForReschedule(
          orderIdForAppointment,
          nextScheduledAt,
        ).catch(() => undefined);
      }

      // Fire the schedule email only when the appointment has enough
      // info to be useful: a scheduledAt + (meetingUrl for ONLINE or a
      // clinic/location for IN_PERSON). Clearing or no-op saves shouldn't
      // re-email the patient.
      const afterRow = await prisma.appointment.findUnique({
        where: { id: params.data.id },
        select: {
          consultationMode: true,
          clinicId: true,
          locationAddress: true,
          countryCode: true,
          patientTimezone: true,
          clinic: { select: { name: true, city: true } },
          doctor: { select: { fullName: true } },
        },
      });
      const whereLabel = afterRow?.clinic
        ? [afterRow.clinic.name, afterRow.clinic.city].filter(Boolean).join(", ")
        : afterRow?.locationAddress ?? null;
      const isInPerson = afterRow?.consultationMode === "IN_PERSON";
      const slotChanged = (before?.scheduledAt ?? null) !== (appointment.scheduledAt ?? null);
      const urlChanged = (before?.meetingUrl ?? null) !== (appointment.meetingUrl ?? null);
      const locationChanged =
        clinicIdInput !== undefined || locationAddressInput !== undefined;
      const hasLink = isInPerson
        ? Boolean(whereLabel)
        : Boolean(appointment.meetingUrl);
      const shouldEmail =
        Boolean(appointment.scheduledAt && hasLink) &&
        (slotChanged || urlChanged || locationChanged);
      if (shouldEmail) {
        // The patient's own zone (captured at booking) wins; a manual/legacy
        // row without one falls back to the clinic zone of the country being
        // booked in. Without this the mail rendered every time in raw UTC.
        const patientTimeZone =
          afterRow?.patientTimezone?.trim() ||
          (await resolveCountryTimeZone(afterRow?.countryCode ?? null));
        sendAppointmentScheduledEmail({
          to: appointment.email,
          fullName: appointment.fullName,
          consultationType: appointment.consultationType,
          scheduledAt: new Date(appointment.scheduledAt!),
          meetingUrl: isInPerson ? null : appointment.meetingUrl,
          where: isInPerson ? whereLabel : null,
          doctorName: afterRow?.doctor
            ? formatDoctorForPatientNotification(afterRow.doctor.fullName)
            : null,
          timeZone: patientTimeZone,
        }).catch((emailErr) => {
          app.log.warn({ err: emailErr }, "Failed to send schedule email — continuing");
        });
      }

      // Notify the ASSIGNED DOCTOR (portal + email + WhatsApp) that their
      // consultation moved. This endpoint deliberately skips the full
      // `applyRescheduleSideEffects` — it takes the meeting link from the
      // admin and sends its own patient email, so regenerating Meet or
      // re-emailing the patient here would contradict both — but the doctor
      // still has to be told, and previously nobody was: an admin reschedule
      // left the doctor sitting on the OLD time with no message at all.
      if (shouldEmail && (slotChanged || isDoctorChange)) {
        const notifyOrderId =
          orderIdForAppointment ??
          (
            await prisma.orderItem.findFirst({
              where: { appointmentId: params.data.id },
              select: { orderId: true },
            })
          )?.orderId ??
          null;
        if (notifyOrderId) {
          await sendAppointmentUpdateNotifications({
            orderId: notifyOrderId,
            appointmentId: params.data.id,
            changeReason: "",
            previousDoctorId: beforeDoctorId,
            newDoctorId: appointment.doctorId ?? null,
            meetingUrl: appointment.meetingUrl ?? null,
            // The branded schedule email above is the patient's copy.
            skipPatient: true,
          }).catch((notifyErr) => {
            app.log.warn(
              { err: notifyErr },
              "Failed to send appointment-update notifications — continuing",
            );
          });
        }
      }

      // Fire APPOINTMENT_ASSIGNED to the doctor when the doctorId
      // transitioned from null/different to a new value. Skip when the
      // admin saved an unrelated edit (no doctor change).
      if (
        doctorIdInput !== undefined &&
        doctorIdInput !== null &&
        doctorIdInput !== beforeDoctorId
      ) {
        notifyDoctor(doctorIdInput, "APPOINTMENT_ASSIGNED", {
          appointmentId: appointment.id,
          snippet: `${appointment.consultationType} · ${appointment.fullName}`,
        }).catch((err) =>
          app.log.warn({ err }, "notifyDoctor failed (appointment assigned)"),
        );
      }

      return okResponse({ appointment, emailed: shouldEmail }, "Appointment scheduled");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin schedule error"));
    }
  });

  /**
   * Admin order-page update: change consultation time and/or doctor with a
   * required reason. Sends branded patient/doctor notifications and
   * regenerates the Meet link on paid online orders when needed.
   */
  app.patch("/api/admin/appointments/:id/update", async (request, reply) => {
    const params = appointmentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointment id", params.error.flatten()));
    }
    const body = updateAppointmentBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid appointment update payload", body.error.flatten()));
    }

    const scheduledAtInput =
      body.data.scheduledAt === undefined
        ? undefined
        : body.data.scheduledAt === null
          ? null
          : new Date(body.data.scheduledAt);
    const doctorIdInput = body.data.doctorId ?? undefined;

    // S-008: see the manual-booking handler above for why
    // resolveAdminSessionActor replaces resolveOptionalAuthUser here.
    const actor = resolveAdminSessionActor(request);
    const adminUserId: string | null = actor?.userId ?? null;

    try {
      // AZ-1: country scope BEFORE the update service runs.
      const scope = await assertAppointmentCountryScope(request, params.data.id);
      if (!scope.allowed) {
        return reply.status(scope.status).send(errorResponse(scope.message));
      }

      const result = await adminUpdateAppointment({
        appointmentId: params.data.id,
        scheduledAt: scheduledAtInput,
        doctorId: doctorIdInput,
        changeReason: body.data.changeReason,
        adminUserId,
        request,
      });
      return okResponse(result, "Appointment updated");
    } catch (error) {
      if (error instanceof AppointmentNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof NoAppointmentChangesError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      if (error instanceof TestBookingRescheduleUnsupportedError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      // 409: nothing wrong with the payload — the target diary entry is taken.
      if (error instanceof TargetSlotUnavailableError) {
        return reply.status(409).send(errorResponse(error.message));
      }
      if (error instanceof DoctorNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (
        error instanceof DoctorNotAvailableInCountryError ||
        error instanceof DoctorNotAssignedToServiceError
      ) {
        return reply.status(422).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin appointment update error"));
    }
  });

  app.patch("/api/admin/appointments/:id/status", async (request, reply) => {
    const params = appointmentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointment id", params.error.flatten()));
    }

    const body = updateAppointmentStatusBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid appointment status update", body.error.flatten()));
    }

    try {
      // AZ-1: country scope BEFORE the status transition and slot release.
      const scope = await assertAppointmentCountryScope(request, params.data.id);
      if (!scope.allowed) {
        return reply.status(scope.status).send(errorResponse(scope.message));
      }

      const before = await prisma.appointment.findUnique({
        where: { id: params.data.id },
        // timeSlotId is read here because the slot release below nulls it, and
        // it is the only link from this appointment to its order line (§7).
        select: { status: true, doctorId: true, fullName: true, timeSlotId: true },
      });
      const appointment = await updateAppointmentStatus(params.data.id, body.data.status);
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }

      // Slot release on cancellation: a CANCELLED appointment must not
      // hold its slot hostage. Returns the slot to OPEN + clears
      // Appointment.timeSlotId so the booking page re-offers the time.
      if (
        body.data.status === "CANCELLED" &&
        before &&
        before.status !== "CANCELLED"
      ) {
        // A membership allowance unit paid for a €0 consultation; cancelling
        // it must give the unit back (decision 16) — the member consumed
        // nothing. Idempotent, and a no-op for every non-membership booking.
        await releaseMembershipAllowanceForSlot(before.timeSlotId).catch((err) => {
          app.log.warn({ err }, "Allowance release failed on admin cancel");
        });
        const releasedSlotId = await releaseAppointmentSlot(params.data.id).catch(
          (err) => {
            app.log.warn({ err }, "Slot release failed on admin cancel");
            return null;
          },
        );
        if (releasedSlotId) {
          recordAudit({
            actorRole: "ADMIN",
            action: "TIMESLOT_RELEASED",
            entityType: "DoctorTimeSlot",
            entityId: releasedSlotId,
            metadata: {
              reason: "admin_cancel",
              appointmentId: params.data.id,
            },
            request,
          }).catch(() => {});
        }
      }

      // Audit + notify doctor on the status change (the doctor side of
      // the same mutation already does this; admin side was bypassing).
      if (before && before.status !== appointment.status) {
        // S-008: see the manual-booking handler above for why
        // resolveAdminSessionActor replaces resolveOptionalAuthUser here.
        const actor = resolveAdminSessionActor(request);
        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "APPOINTMENT_STATUS_CHANGED",
          entityType: "Appointment",
          entityId: appointment.id,
          metadata: { from: before.status, to: appointment.status },
          request,
        }).catch(() => {});
        if (before.doctorId) {
          notifyDoctor(before.doctorId, "APPOINTMENT_STATUS_CHANGED", {
            appointmentId: appointment.id,
            snippet: `${before.fullName} · ${before.status} → ${appointment.status}`,
            byRole: "ADMIN",
          }).catch((err) =>
            app.log.warn({ err }, "notifyDoctor failed (admin status change)"),
          );
        }
      }

      return okResponse({ appointment }, "Appointment status updated");
    } catch (error) {
      if (error instanceof InvalidAppointmentStatusTransitionError) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof UnrecognizedAppointmentStatusError) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin appointment update error"));
    }
  });

  // ── Admin: lab reference + patient confirmation for a test-centre booking ──
  //
  // The booking is replicated by hand in the laboratory's own system, so this
  // is where whatever reference that system hands back gets recorded, and where
  // an admin tells the patient it is really booked. Saving and sending are
  // separate for the same reason they are on a kit's tracking code: a reference
  // pasted from another tab is worth checking before it goes out.
  app.patch("/api/admin/appointments/:id/lab-reference", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const params = appointmentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointment id", params.error.flatten()));
    }
    const body = updateAppointmentLabReferenceBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid lab reference", body.error.flatten()));
    }

    try {
      const scope = await assertAppointmentCountryScope(request, params.data.id);
      if (!scope.allowed) {
        return reply.status(scope.status).send(errorResponse(scope.message));
      }
      const existing = await prisma.appointment.findUnique({
        where: { id: params.data.id },
        select: { id: true, testCenterLocationId: true },
      });
      if (!existing) return reply.status(404).send(errorResponse("Appointment not found"));
      if (!existing.testCenterLocationId) {
        return reply
          .status(400)
          .send(errorResponse("This appointment is not a test-centre booking"));
      }

      const appointment = await prisma.appointment.update({
        where: { id: params.data.id },
        data: { labReference: body.data.labReference?.trim() || null },
        select: { id: true, labReference: true, labConfirmationSentAt: true },
      });
      return okResponse({
        id: appointment.id,
        labReference: appointment.labReference,
        labConfirmationSentAt: appointment.labConfirmationSentAt?.toISOString() ?? null,
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save the lab reference"));
    }
  });

  app.post("/api/admin/appointments/:id/send-confirmation", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const params = appointmentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid admin appointment id", params.error.flatten()));
    }

    try {
      const scope = await assertAppointmentCountryScope(request, params.data.id);
      if (!scope.allowed) {
        return reply.status(scope.status).send(errorResponse(scope.message));
      }
      const { sendTestBookingConfirmationToPatient } = await import(
        "../modules/automation/test-booking-confirmation.service.js"
      );
      const result = await sendTestBookingConfirmationToPatient(params.data.id);
      if (!result.ok) {
        // Nothing reached the patient. 200 + ok:false would read as success in
        // the admin UI, so this is a real failure status.
        return reply
          .status(502)
          .send(errorResponse(result.notes.join("; ") || "Could not notify the patient"));
      }
      return okResponse(result);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not notify the patient"));
    }
  });
};

export default adminAppointmentsRoute;
