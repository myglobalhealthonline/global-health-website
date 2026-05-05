import { z } from "zod";
import {
  emailSchema,
  fullNameSchema,
  optionalNotesSchema,
  optionalPhoneSchema,
} from "./shared.schema.js";

export const contactSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  message: optionalNotesSchema,
});

export type ContactInput = z.infer<typeof contactSchema>;
