import { z } from "zod";

export const adminPartnersQuerySchema = z.object({
  countryId: z.string().trim().min(1),
});

export const partnerCreateBodySchema = z
  .object({
    countryId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(200),
    websiteUrl: z.string().trim().url().max(500).optional().nullable(),
    logoImagePath: z.string().trim().max(2000).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const partnerUpdateBodySchema = partnerCreateBodySchema
  .omit({ countryId: true })
  .partial()
  .strict();

export type PartnerCreateBody = z.infer<typeof partnerCreateBodySchema>;
export type PartnerUpdateBody = z.infer<typeof partnerUpdateBodySchema>;
