import { LocaleCode } from "@prisma/client";
import { z } from "zod";

/**
 * `GET /api/me/benefit-options` (§6.3).
 *
 * `timeSlotId` and `doctorId` are optional because the benefit step runs
 * BEFORE time selection (§11.2): without a slot the prices come off the
 * service base price and percent-based options come back flagged `indicative`.
 * Both are needed together for a peak-adjusted price — a slot with no doctor
 * cannot be timezone-resolved.
 */
export const benefitOptionsQuerySchema = z.object({
  serviceId: z.string().trim().min(1).max(80),
  doctorId: z.string().trim().min(1).max(80).optional(),
  timeSlotId: z.string().trim().min(1).max(80).optional(),
  // .catch(undefined): an unknown locale falls back to the untranslated plan
  // name instead of failing the whole query parse — carried over from the
  // retired `/api/me/benefit-preview` this endpoint replaced.
  locale: z
    .preprocess((v) => (typeof v === "string" ? v.toUpperCase() : v), z.nativeEnum(LocaleCode).optional())
    .catch(undefined),
});

export type BenefitOptionsQuery = z.infer<typeof benefitOptionsQuerySchema>;
