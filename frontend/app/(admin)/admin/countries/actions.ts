"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAdminCountry,
  deactivateAdminCountry,
  updateAdminCountry,
} from "@/lib/api/admin-countries";
import { asActionResult } from "@/lib/api/admin-client";
import { fail, fieldErrorsFromZod, type ActionResult } from "@/lib/admin/action-result";
import { SLUG_REGEX, slugify } from "@/lib/admin/slug";

/**
 * Form-only schema — handles HTML form conventions (CSV → string[], "" → null,
 * checkbox "on" → boolean). Different from the wire-format schema in
 * @gh/shared/schemas/countries which expects already-typed JSON values.
 *
 * After parsing this, we call the HTTP wrapper which validates server-side too.
 */
const formFields = {
  code: z.string().trim().min(2).max(4).regex(/^[A-Z]{2,4}$/, "Code must be uppercase letters"),
  slug: z.string().trim().min(2).max(8).regex(SLUG_REGEX, "Lowercase letters, digits and hyphens only"),
  name: z.string().trim().min(1).max(80),
  currency: z.string().trim().min(2).max(8),
  currencySymbol: z.string().trim().max(8).optional().or(z.literal("")).transform((v) => v || null),
  languages: z.string().trim().max(400).transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  ),
  phone: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || null),
  email: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v || null),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || null),
  heroTitle: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => v || null),
  heroSubtitle: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => v || null),
  ctaLabel: z.string().trim().max(80).optional().or(z.literal("")).transform((v) => v || null),
  active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
};

const createFormSchema = z.object(formFields);
const updateFormSchema = z.object({ id: z.string().min(1), ...formFields });

function readForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createCountryAction(formData: FormData): Promise<ActionResult> {
  const parsed = createFormSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return fail("Please review the form fields.", fieldErrorsFromZod(parsed.error));
  }
  const publish = formData.get("intent") === "publish";

  const result = await createAdminCountry({
    ...parsed.data,
    status: publish ? "PUBLISHED" : "DRAFT",
  });
  if (!result.ok) return asActionResult(result) as ActionResult;
  redirect("/admin/countries");
}

export async function updateCountryAction(formData: FormData): Promise<ActionResult> {
  const parsed = updateFormSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return fail("Please review the form fields.", fieldErrorsFromZod(parsed.error));
  }
  const { id, ...data } = parsed.data;
  const intent = formData.get("intent");

  const result = await updateAdminCountry(id, {
    ...data,
    ...(intent === "publish" ? { status: "PUBLISHED" } : {}),
    ...(intent === "draft" ? { status: "DRAFT" } : {}),
  });
  if (!result.ok) return asActionResult(result) as ActionResult;
  redirect(`/admin/countries/${id}`);
}

export async function toggleCountryActiveAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const next = formData.get("active") === "true";
  if (!id) return;
  // Two-step: backend doesn't have a dedicated toggle. Use PATCH with active flag.
  await updateAdminCountry(id, { active: next });
}

export async function deactivateCountryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deactivateAdminCountry(id);
}

export async function slugifyHelper(value: string) {
  "use server";
  return slugify(value);
}
