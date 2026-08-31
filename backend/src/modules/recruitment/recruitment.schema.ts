import { JobApplicationStatus, JobListingStatus, JobWorkplaceMode, LocaleCode } from "@prisma/client";
import { z } from "zod";
import { verifySniffedMime } from "../../utils/sniff-mime.js";

export const MAX_CV_BYTES = 5 * 1024 * 1024;

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

const exclusiveSubmittedToSchema = z.preprocess((value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const start = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== value) {
    return new Date(Number.NaN);
  }
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}, z.coerce.date());

const jobShape = {
  countryId: z.string().trim().min(1).max(64),
  locale: z.nativeEnum(LocaleCode),
  slug: z.string().trim().min(3).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(3).max(140),
  department: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(120),
  workplaceMode: z.nativeEnum(JobWorkplaceMode),
  employmentType: z.string().trim().min(2).max(80),
  minimumExperience: optionalText(100),
  descriptionHtml: z.string().trim().min(1).max(100 * 1024),
  status: z.nativeEnum(JobListingStatus),
  closesAt: z.coerce.date().nullable().optional(),
};

export const adminJobCreateBodySchema = z
  .object(jobShape)
  .extend({ status: z.nativeEnum(JobListingStatus).default(JobListingStatus.DRAFT) })
  .strict();
export const adminJobPatchBodySchema = z.object(jobShape).partial().strict();
export type AdminJobInput = z.infer<typeof adminJobCreateBodySchema>;
export type AdminJobPatch = z.infer<typeof adminJobPatchBodySchema>;

export const publicJobsQuerySchema = z
  .object({
    countryCode: z.string().trim().min(2).max(3).transform((value) => value.toLowerCase()),
    locale: z.nativeEnum(LocaleCode),
  })
  .strict();
export const jobSlugParamsSchema = z.object({ slug: z.string().trim().min(3).max(160) }).strict();
export const jobIdParamsSchema = z.object({ id: z.string().trim().min(1).max(64) }).strict();

export const adminJobsQuerySchema = z
  .object({
    countryId: z.string().trim().min(1).max(64).optional(),
    locale: z.nativeEnum(LocaleCode).optional(),
    status: z.nativeEnum(JobListingStatus).optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export const applicationFieldsSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).transform((value) => value.replace(/\s+/g, " ")),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    phone: optionalText(40),
    message: optionalText(2000),
    privacyAcknowledged: z.literal("true"),
    website: z.string().max(200).optional().default(""),
  })
  .strict();
export type ApplicationFields = z.infer<typeof applicationFieldsSchema>;

export const adminApplicationsQuerySchema = z
  .object({
    countryId: z.string().trim().min(1).max(64).optional(),
    jobId: z.string().trim().min(1).max(64).optional(),
    status: z.nativeEnum(JobApplicationStatus).optional(),
    submittedFrom: z.coerce.date().optional(),
    submittedTo: exclusiveSubmittedToSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict()
  .refine((value) => !value.submittedFrom || !value.submittedTo || value.submittedFrom <= value.submittedTo, {
    message: "submittedFrom must be before submittedTo",
  });
export const applicationStatusBodySchema = z.object({ status: z.nativeEnum(JobApplicationStatus) }).strict();
export const applicationPurgeBodySchema = z
  .object({ reason: z.enum(["DATA_SUBJECT_REQUEST", "ADMIN_CORRECTION"]) })
  .strict();

export function isAllowedJobTransition(from: JobListingStatus, to: JobListingStatus): boolean {
  if (from === JobListingStatus.ARCHIVED) return to === JobListingStatus.ARCHIVED;
  if (from === JobListingStatus.PUBLISHED) return to === JobListingStatus.PUBLISHED || to === JobListingStatus.ARCHIVED;
  return to === JobListingStatus.DRAFT || to === JobListingStatus.PUBLISHED || to === JobListingStatus.ARCHIVED;
}

export function addCalendarMonths(date: Date, months: number): Date {
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), daysInTargetMonth), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
}

export type CvValidationResult = { ok: true } | { ok: false; status: 400 | 413; message: string };

export function validateCvPdf(buffer: Buffer, filename: string, declaredMime: string): CvValidationResult {
  if (buffer.length > MAX_CV_BYTES) return { ok: false, status: 413, message: "The PDF must be 5 MB or smaller." };
  if (!/^[^\\/]+\.pdf$/i.test(filename)) return { ok: false, status: 400, message: "Please upload a valid PDF." };
  if (!verifySniffedMime(buffer, declaredMime, new Set(["application/pdf"]))) {
    return { ok: false, status: 400, message: "Please upload a valid PDF." };
  }
  return { ok: true };
}
