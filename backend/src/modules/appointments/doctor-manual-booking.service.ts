import type { ServiceKind } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import {
  createManualBooking,
  DoctorNotAssignedToServiceError,
  ServiceNotFoundError,
  type CreateManualBookingResult,
} from "./manual-booking.service.js";

/**
 * Doctor-initiated manual booking (walk-in / phone-in the doctor takes
 * themselves), gated per-doctor by `Doctor.canCreateManualAppointments`.
 *
 * This is the admin walk-in flow with the authority narrowed to what a
 * doctor is allowed to decide:
 *
 *   admin picks  →  country, service, DOCTOR, slot, insurer, price shown
 *   doctor picks →  service (their own), slot (their own calendar), venue
 *
 * Everything else is derived server-side: the doctor is always the booked
 * doctor, the country comes from the service, and the amount comes from the
 * catalogue (base price + the slot's peak/off-peak rule) inside
 * `createManualBooking`. That is the whole point of routing through the
 * shared pipeline — the payment link is minted at the REAL published price
 * even though no price is ever sent to, or shown in, the doctor portal.
 */

/**
 * The picked clinic isn't a real, active venue in the service's country.
 * Raised so a crafted payload can't attach an unrelated country's clinic to
 * an in-person booking.
 */
export class ClinicNotAvailableError extends Error {
  constructor() {
    super("Selected clinic is not available for this service's country.");
    this.name = "ClinicNotAvailableError";
  }
}

/** A service the doctor may book for. Price fields are deliberately absent. */
export type DoctorBookableServiceDto = {
  id: string;
  slug: string;
  name: string;
  kind: ServiceKind;
  /** Consultation length; the booking consumes this many minutes of slots. */
  durationMinutes: number | null;
  countryCode: string;
  countryName: string;
};

export type DoctorBookingClinicDto = {
  id: string;
  name: string;
  city: string | null;
  countryCode: string;
};

export type DoctorBookingOptions = {
  canCreateManualAppointments: boolean;
  services: DoctorBookableServiceDto[];
  clinics: DoctorBookingClinicDto[];
};

/** Countries the doctor is rostered in (primary + active additional). */
async function getDoctorCountryIds(doctorId: string): Promise<string[]> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      countryId: true,
      additionalCountries: { where: { active: true }, select: { countryId: true } },
    },
  });
  if (!doctor) return [];
  return Array.from(
    new Set([doctor.countryId, ...doctor.additionalCountries.map((c) => c.countryId)]),
  );
}

/**
 * Picklists for the doctor's booking form: the services they are actively
 * approved to provide, plus the clinics in those countries for in-person
 * bookings. No `basePriceCents` / `currencyCode` is selected — the doctor
 * portal must never render a patient-facing price.
 */
export async function listDoctorBookingOptions(
  doctorId: string,
): Promise<DoctorBookingOptions> {
  try {
    const [doctor, countryIds] = await Promise.all([
      prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { canCreateManualAppointments: true },
      }),
      getDoctorCountryIds(doctorId),
    ]);

    if (countryIds.length === 0) {
      return {
        canCreateManualAppointments: Boolean(doctor?.canCreateManualAppointments),
        services: [],
        clinics: [],
      };
    }

    const [assignments, clinics] = await Promise.all([
      prisma.serviceDoctor.findMany({
        where: {
          doctorId,
          isActive: true,
          status: "active",
          service: {
            isActive: true,
            countryId: { in: countryIds },
            country: { isActive: true },
          },
        },
        orderBy: [{ service: { kind: "asc" } }, { sortOrder: "asc" }],
        select: {
          service: {
            select: {
              id: true,
              slug: true,
              name: true,
              kind: true,
              durationMinutes: true,
              country: { select: { code: true, name: true } },
            },
          },
        },
      }),
      prisma.clinic.findMany({
        where: { countryId: { in: countryIds }, active: true },
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, city: true, country: { select: { code: true } } },
      }),
    ]);

    return {
      canCreateManualAppointments: Boolean(doctor?.canCreateManualAppointments),
      services: assignments.map(({ service }) => ({
        id: service.id,
        slug: service.slug,
        name: service.name,
        kind: service.kind,
        durationMinutes: service.durationMinutes,
        countryCode: service.country.code,
        countryName: service.country.name,
      })),
      clinics: clinics.map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        countryCode: c.country.code,
      })),
    };
  } catch (error) {
    throw normalizeDbError(error, "Doctor booking options are unavailable");
  }
}

export type CreateDoctorManualBookingInput = {
  /** Authenticated doctor — also the doctor the appointment is booked with. */
  doctorId: string;
  /** The doctor's portal User id, recorded as the audit actor. */
  actorUserId: string | null;
  patient: {
    email: string;
    fullName: string;
    phone: string;
    dateOfBirth?: string | null;
    nationalIdNumber?: string | null;
    taxIdNumber?: string | null;
    passportNumber?: string | null;
    utenteNumber?: string | null;
    addressLine1?: string | null;
    addressCity?: string | null;
    addressCountryCode?: string | null;
  };
  serviceId: string;
  timeSlotId: string;
  consultationMode: "ONLINE" | "IN_PERSON";
  clinicId?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
  request?: FastifyRequest;
};

export async function createDoctorManualBooking(
  input: CreateDoctorManualBookingInput,
): Promise<CreateManualBookingResult> {
  // Country is derived, never sent: the service decides which market (and
  // therefore which currency, Stripe account, and booking rules) applies.
  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, isActive: true, country: { isActive: true } },
    select: { id: true, countryId: true, country: { select: { code: true } } },
  });
  if (!service) throw new ServiceNotFoundError();

  // The doctor may only book services an admin (or the approval flow) has
  // actually activated for them. `createManualBooking` re-checks this — the
  // duplicate is intentional, so the doctor gets the precise error rather
  // than a generic failure deeper in the pipeline.
  const assignment = await prisma.serviceDoctor.findFirst({
    where: {
      serviceId: service.id,
      doctorId: input.doctorId,
      isActive: true,
      status: "active",
    },
    select: { id: true },
  });
  if (!assignment) throw new DoctorNotAssignedToServiceError();

  // In-person venue: a clinic must be a live venue in the SAME country as the
  // service. The picker is already country-scoped; this is the server-side
  // guard behind it.
  const clinicId =
    input.consultationMode === "IN_PERSON" ? input.clinicId?.trim() || null : null;
  if (clinicId) {
    const clinic = await prisma.clinic.findFirst({
      where: { id: clinicId, active: true, countryId: service.countryId },
      select: { id: true },
    });
    if (!clinic) throw new ClinicNotAvailableError();
  }

  return createManualBooking({
    // The doctor is the acting staff member for this booking — recorded as
    // the audit actor exactly where an admin's id would go.
    adminUserId: input.actorUserId,
    patient: input.patient,
    serviceId: service.id,
    doctorId: input.doctorId,
    timeSlotId: input.timeSlotId,
    consultationMode: input.consultationMode,
    clinicId,
    locationAddress:
      input.consultationMode === "IN_PERSON" ? input.locationAddress ?? null : null,
    notes: input.notes ?? null,
    countryCode: service.country.code,
    // No amount override and no insurer: the price is resolved from the
    // catalogue + the slot's peak rule, so the doctor cannot influence it.
    origin: { source: "doctor_manual", actorRole: "DOCTOR" },
    request: input.request,
  });
}
