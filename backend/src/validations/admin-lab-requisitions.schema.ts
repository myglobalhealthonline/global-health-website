import { z } from "zod";

/**
 * Request schemas for the admin lab-requisition queue
 * (`routes/admin-lab-requisitions.route.ts`).
 */

const LAB_REQUISITION_STATUSES = [
  "PRESCRIBED",
  "PATIENT_CONFIRMED",
  "AWAITING_PAYMENT",
  "READY_TO_SEND",
  "SENT_TO_LAB",
  "SAMPLE_COLLECTED",
  "RESULT_RECEIVED",
  "CLOSED",
  "CANCELLED",
] as const;

/** Treat blank form fields (`?status=&q=`) as absent rather than invalid. */
const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const labRequisitionIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

export const adminLabRequisitionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .default(25)
    .transform((n) => Math.min(n, 100)),
  countryCode: z.preprocess(blankToUndefined, z.string().trim().min(2).max(8).optional()),
  status: z.preprocess(blankToUndefined, z.enum(LAB_REQUISITION_STATUSES).optional()),
  q: z.preprocess(blankToUndefined, z.string().trim().min(1).max(120).optional()),
});

export const adminLabRequisitionConfirmBodySchema = z
  .object({
    /** Items the patient agreed to on the call. Everything else is declined. */
    acceptedItemIds: z.array(z.string().trim().min(1).max(120)).max(200),
    testCenterId: z.string().trim().min(1).max(120).nullable().optional(),
    collectionDate: z.string().datetime().nullable().optional(),
    priority: z.enum(["Rutina", "Statim", "Vital"]).optional(),
    adminNotes: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

export const adminLabRequisitionStatusBodySchema = z
  .object({
    status: z.enum(LAB_REQUISITION_STATUSES),
  })
  .strict();
