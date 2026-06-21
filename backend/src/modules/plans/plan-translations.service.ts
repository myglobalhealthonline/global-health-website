import { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import { assertLocaleSupported } from "../shared/locale-support.js";
import { PlanNotFoundError, getAdminPlanById } from "./plans.service.js";
import type { AdminPlanTranslationBody } from "../../validations/admin-plans.schema.js";

async function loadPlan(planId: string): Promise<{ countryId: string }> {
  const plan = await prisma.pricingPlan.findUnique({
    where: { id: planId },
    select: { countryId: true },
  });
  if (!plan) throw new PlanNotFoundError();
  return plan;
}

export async function getPlanTranslation(planId: string, locale: LocaleCode) {
  await loadPlan(planId);
  return prisma.planTranslation.findUnique({
    where: { planId_locale: { planId, locale } },
  });
}

/** Upsert one PlanTranslation row (planId, locale). Validates the locale is
 *  enabled for the plan's country (matches the Service/HealthTest pattern). */
export async function upsertPlanTranslation(
  planId: string,
  locale: LocaleCode,
  body: AdminPlanTranslationBody,
) {
  const plan = await loadPlan(planId);
  await assertLocaleSupported(plan.countryId, locale);
  const data = {
    name: body.name,
    shortDescription: body.shortDescription,
    longDescription: body.longDescription,
    notesTerms: body.notesTerms,
  };
  try {
    return await prisma.planTranslation.upsert({
      where: { planId_locale: { planId, locale } },
      create: { planId, locale, ...data },
      update: data,
    });
  } catch (error) {
    throw normalizeDbError(error, "Plan translations are unavailable");
  }
}

export type PlanPreview = {
  resolvedLocale: LocaleCode;
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  notesTerms: string | null;
  plan: NonNullable<Awaited<ReturnType<typeof getAdminPlanById>>>;
};

/**
 * Read-only resolved plan for the admin preview screen (§25.1): base columns
 * overridden by the best translation for the requested locale (requested →
 * country default → first → base). The plan is already country-scoped.
 */
export async function getPlanPreview(planId: string, locale?: LocaleCode): Promise<PlanPreview> {
  const plan = await getAdminPlanById(planId);
  if (!plan) throw new PlanNotFoundError();

  const country = await prisma.country.findUnique({
    where: { id: plan.countryId },
    select: { defaultLocale: true },
  });
  const defaultLocale = country?.defaultLocale ?? LocaleCode.EN;
  const requested = locale ?? defaultLocale;

  const { tr, resolvedLocale } = resolveTranslation(plan.translations, requested, defaultLocale);
  return {
    resolvedLocale,
    name: tr?.name ?? plan.name,
    shortDescription: tr?.shortDescription ?? plan.shortDescription,
    longDescription: tr?.longDescription ?? plan.longDescription,
    notesTerms: tr?.notesTerms ?? plan.notesTerms,
    plan,
  };
}
