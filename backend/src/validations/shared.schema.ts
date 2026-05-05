import { z } from "zod";

export const countryCodeSchema = z.enum(["ie", "pt", "sp", "cz", "rm"]);

export const consultationTypeSchema = z.enum(["general", "specialist", "follow-up"]);

export const optionalPhoneSchema = z
  .string()
  .trim()
  .min(6, "Phone must be at least 6 characters")
  .max(32, "Phone is too long")
  .optional()
  .or(z.literal(""));

export const optionalNotesSchema = z
  .string()
  .trim()
  .max(2000, "Notes are too long")
  .optional()
  .or(z.literal(""));

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Full name must be at least 2 characters")
  .max(120, "Full name is too long");
