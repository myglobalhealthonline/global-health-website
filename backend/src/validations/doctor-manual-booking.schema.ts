import { z } from "zod";

/**
 * Body for a DOCTOR-initiated manual appointment (walk-in / phone-in the
 * doctor takes themselves). Deliberately narrower than the admin's
 * `createManualAppointmentBodySchema`:
 *
 *   - no `doctorId`   — the booking is always with the authenticated doctor
 *   - no `countryCode`— derived server-side from the chosen service's country
 *   - no price / insurance fields — the amount is resolved from the service
 *     catalogue (base + peak/off-peak) inside `createManualBooking`. The
 *     doctor never sees, sends, or influences what the patient is charged;
 *     the Stripe link is minted at the real catalogue price.
 *
 * Everything the doctor CAN send is patient identity + which of their own
 * services, slots, and venues to use.
 */
export const createDoctorManualAppointmentBodySchema = z
  .object({
    patient: z
      .object({
        email: z.string().trim().toLowerCase().email("Invalid patient email").max(254),
        fullName: z.string().trim().min(2).max(120),
        // Same international format the admin form produces:
        // "+<dial> <national>" (spaces/dashes tolerated).
        phone: z
          .string()
          .trim()
          .regex(
            /^\+[1-9]\d{0,3}[\s-]?\d{6,14}$/,
            "Phone must include a country code, e.g. +353 871234567",
          ),
        dateOfBirth: z.string().trim().max(40).optional().nullable(),
        nationalIdNumber: z.string().trim().max(64).optional().nullable(),
        taxIdNumber: z.string().trim().max(64).optional().nullable(),
        passportNumber: z.string().trim().max(64).optional().nullable(),
        utenteNumber: z.string().trim().max(64).optional().nullable(),
        addressLine1: z.string().trim().max(200).optional().nullable(),
        addressCity: z.string().trim().max(100).optional().nullable(),
        addressCountryCode: z.string().trim().max(8).optional().nullable(),
      })
      .strict(),
    /** One of the doctor's own actively-assigned services. */
    serviceId: z.string().trim().min(1).max(60),
    /** First base `DoctorTimeSlot` to claim, from the doctor's own calendar. */
    timeSlotId: z.string().trim().min(1).max(120),
    consultationMode: z.enum(["ONLINE", "IN_PERSON"]).default("ONLINE"),
    clinicId: z.string().trim().min(1).max(60).optional().nullable(),
    locationAddress: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.consultationMode !== "IN_PERSON") return true;
      return Boolean(
        (data.clinicId && data.clinicId.length > 0) ||
          (data.locationAddress && data.locationAddress.length > 0),
      );
    },
    {
      message: "In-person appointments need a clinic or a location address.",
      path: ["clinicId"],
    },
  )
  .refine(
    (data) =>
      !(
        data.clinicId &&
        data.clinicId.length > 0 &&
        data.locationAddress &&
        data.locationAddress.length > 0
      ),
    {
      message: "Provide a clinic OR a location address, not both.",
      path: ["locationAddress"],
    },
  );

export type CreateDoctorManualAppointmentBody = z.infer<
  typeof createDoctorManualAppointmentBodySchema
>;
