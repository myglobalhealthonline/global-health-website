import { z } from "zod";
import { emailSchema, fullNameSchema } from "./shared.schema.js";

export const registerBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  fullName: fullNameSchema,
  phone: z
    .string()
    .trim()
    .min(6, "Phone must be at least 6 characters")
    .max(32, "Phone is too long")
    .optional()
    .or(z.literal("")),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().trim().min(10).max(512),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});
export {};
