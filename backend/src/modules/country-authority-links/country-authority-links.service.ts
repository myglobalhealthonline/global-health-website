import { AuthorityCategory } from "@prisma/client";
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
