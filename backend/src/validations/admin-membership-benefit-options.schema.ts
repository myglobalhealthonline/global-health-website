import { LocaleCode } from "@prisma/client";
import { z } from "zod";

/**
 * `GET /api/admin/membership-benefit-options` (§4.1) — the admin-side twin of
 * `/api/me/benefit-options`, for the manual-booking form.
 *
 * Keyed on EMAIL rather than a user id: the form identifies the patient through
 * the existing `/api/admin/patients/by-email` typeahead, which returns no id,
 * and a manual booking may be for someone who has no account yet at all.
 *
 * `doctorId` and `timeSlotId` stay optional for the same reason they are on the
 * member route — the admin prices mid-entry, before a slot is picked — but the
 * form asks again once it has one, so what the admin finally quotes is exact.
 */
export const adminMembershipBenefitOptionsQuerySchema = z.object({
  email: z.string().trim().email().max(200),
  serviceId: z.string().trim().min(1).max(80),
  doctorId: z.string().trim().min(1).max(80).optional(),
  timeSlotId: z.string().trim().min(1).max(80).optional(),
  // .catch(undefined): an unknown locale falls back to the untranslated plan
  // name rather than failing the whole query parse.
  locale: z
    .preprocess(
      (v) => (typeof v === "string" ? v.toUpperCase() : v),
      z.nativeEnum(LocaleCode).optional(),
    )
    .catch(undefined),
});

export type AdminMembershipBenefitOptionsQuery = z.infer<
  typeof adminMembershipBenefitOptionsQuerySchema
>;
