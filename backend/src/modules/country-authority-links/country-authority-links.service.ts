import { AuthorityCategory } from "@prisma/client";
import type { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export type AuthorityLinkInput = {
  name: string;
  abbreviation?: string | null;
  url: string;
  category: AuthorityCategory;
  description?: string | null;
  showInFooter?: boolean;
  showInSchema?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

export type AuthorityLinkTranslationInput = {
  name?: string;
  abbreviation?: string | null;
  description?: string | null;
};

// translations included additively — base fields/shape unchanged, so
// existing callers (public read path, admin UI list) are unaffected.
const SELECT = {
  id: true,
  countryId: true,
  name: true,
  abbreviation: true,
  url: true,
  category: true,
  description: true,
  showInFooter: true,
  showInSchema: true,
  sortOrder: true,
  isActive: true,
  translations: {
    select: { id: true, locale: true, name: true, abbreviation: true, description: true },
  },
} as const;

export async function listAuthorityLinks(countryId: string) {
  try {
    return await prisma.countryAuthorityLink.findMany({
      where: { countryId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: SELECT,
    });
  } catch (error) {
    throw normalizeDbError(error, "Authority links unavailable");
  }
}

export async function createAuthorityLink(countryId: string, input: AuthorityLinkInput) {
  const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!country) return null;
  try {
    return await prisma.countryAuthorityLink.create({
      data: {
        countryId,
        name: input.name,
        abbreviation: input.abbreviation ?? null,
        url: input.url,
        category: input.category,
        description: input.description ?? null,
        showInFooter: input.showInFooter ?? false,
        showInSchema: input.showInSchema ?? true,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
      select: SELECT,
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not create authority link");
  }
}

export async function updateAuthorityLink(id: string, input: Partial<AuthorityLinkInput>) {
  const existing = await prisma.countryAuthorityLink.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.countryAuthorityLink.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.abbreviation !== undefined && { abbreviation: input.abbreviation }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.showInFooter !== undefined && { showInFooter: input.showInFooter }),
        ...(input.showInSchema !== undefined && { showInSchema: input.showInSchema }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: SELECT,
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not update authority link");
  }
}

/**
 * Upsert one non-default-locale override of a link's translatable text
 * (name/abbreviation/description), mirroring CountryFooterTranslation's PUT
 * handler: `locale === country.defaultLocale` writes the base row instead
 * (there's nothing to override — the base row IS that locale's copy).
 *
 * CountryAuthorityLinkTranslation.name is NOT NULL, so a first-time
 * translation upsert that omits `name` falls back to the base row's
 * current name rather than writing an empty string.
 */
export async function upsertAuthorityLinkTranslation(
  id: string,
  locale: LocaleCode,
  input: AuthorityLinkTranslationInput,
) {
  const link = await prisma.countryAuthorityLink.findUnique({
    where: { id },
    select: { id: true, name: true, country: { select: { defaultLocale: true } } },
  });
  if (!link) return null;
  try {
    if (locale === link.country.defaultLocale) {
      return await prisma.countryAuthorityLink.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.abbreviation !== undefined && { abbreviation: input.abbreviation }),
          ...(input.description !== undefined && { description: input.description }),
        },
        select: SELECT,
      });
    }
    await prisma.countryAuthorityLinkTranslation.upsert({
      where: { countryAuthorityLinkId_locale: { countryAuthorityLinkId: id, locale } },
      create: {
        countryAuthorityLinkId: id,
        locale,
        name: input.name ?? link.name,
        abbreviation: input.abbreviation ?? null,
        description: input.description ?? null,
      },
      update: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.abbreviation !== undefined && { abbreviation: input.abbreviation }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
    return await prisma.countryAuthorityLink.findUniqueOrThrow({ where: { id }, select: SELECT });
  } catch (error) {
    throw normalizeDbError(error, "Could not update authority link translation");
  }
}

export async function deleteAuthorityLink(id: string): Promise<boolean> {
  const existing = await prisma.countryAuthorityLink.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  try {
    await prisma.countryAuthorityLink.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Could not delete authority link");
  }
}
