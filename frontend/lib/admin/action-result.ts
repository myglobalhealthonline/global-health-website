export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string; fieldErrors?: FieldErrors };

import { ZodError } from "zod";

export function fieldErrorsFromZod(err: ZodError): FieldErrors {
  const flat = err.flatten();
  return flat.fieldErrors as FieldErrors;
}

export function fail(message: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}
