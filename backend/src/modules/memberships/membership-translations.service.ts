import type { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { assertLocaleSupported } from "../shared/locale-support.js";
import {
  MembershipLevelNotFoundError,
  MembershipPlanNotFoundError,
} from "./membership-plans.service.js";
import type { MembershipTranslationBody } from "../../validations/admin-membership-plans.schema.js";

/**
 * Per-locale plan and level copy (decision 23). Patient-facing surfaces read
 * the translation; the base `name` column stays an internal label.
 *
 * The writable locale set is whatever the plan's country has enabled, via the
 * shared `assertLocaleSupported` — the same rule Service, HealthTest and
 * PricingPlan translations use, so no membership-specific locale list can
 * drift out of sync with a market's configuration. Ireland currently has all
 * six enabled with EN as its default (§18 open item 1).
 */

export async function getMembershipPlanTranslation(planId: string, locale: LocaleCode) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true },
  });
  if (!plan) throw new MembershipPlanNotFoundError();
  try {
    return await prisma.membershipPlanTranslation.findUnique({
      where: { planId_locale: { planId, locale } },
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership translations are unavailable");
  }
}

export async function upsertMembershipPlanTranslation(
  planId: string,
  locale: LocaleCode,
  body: MembershipTranslationBody,
) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { countryId: true },
  });
  if (!plan) throw new MembershipPlanNotFoundError();
  await assertLocaleSupported(plan.countryId, locale);

  const data = { name: body.name, description: body.description };
  try {
    return await prisma.membershipPlanTranslation.upsert({
      where: { planId_locale: { planId, locale } },
      create: { planId, locale, ...data },
      update: data,
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership translations are unavailable");
  }
}

export async function getMembershipLevelTranslation(levelId: string, locale: LocaleCode) {
  const level = await prisma.membershipLevel.findUnique({
    where: { id: levelId },
    select: { id: true },
  });
  if (!level) throw new MembershipLevelNotFoundError();
  try {
    return await prisma.membershipLevelTranslation.findUnique({
      where: { levelId_locale: { levelId, locale } },
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership translations are unavailable");
  }
}

export async function upsertMembershipLevelTranslation(
  levelId: string,
  locale: LocaleCode,
  body: MembershipTranslationBody,
) {
  // The level's own countryId is the plan's country (composite FK), so it is
  // the right thing to validate the locale against without a second hop.
  const level = await prisma.membershipLevel.findUnique({
    where: { id: levelId },
    select: { countryId: true },
  });
  if (!level) throw new MembershipLevelNotFoundError();
  await assertLocaleSupported(level.countryId, locale);

  const data = { name: body.name, description: body.description };
  try {
    return await prisma.membershipLevelTranslation.upsert({
      where: { levelId_locale: { levelId, locale } },
      create: { levelId, locale, ...data },
      update: data,
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership translations are unavailable");
  }
}
