import "server-only";

import { cookies } from "next/headers";
import { prisma } from "backend";

export const COUNTRY_COOKIE = "gh_admin_country";

export type CountryOption = {
  id: string;
  code: string;
  slug: string;
  name: string;
};

export async function listScopeCountries(): Promise<CountryOption[]> {
  return prisma.country.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, code: true, slug: true, name: true },
  });
}

/**
 * Resolve the active country for the admin shell.
 * Order of precedence:
 *   1. URL segment (`/admin/[country]/...`) — handled by caller (pass `slug`)
 *   2. Cookie `gh_admin_country`
 *   3. First active country
 *
 * Returns null if no country exists.
 */
export async function resolveScopeCountry(slug?: string | null): Promise<CountryOption | null> {
  const jar = await cookies();
  const candidates: (string | null | undefined)[] = [slug, jar.get(COUNTRY_COOKIE)?.value];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const found = await prisma.country.findUnique({
      where: { slug: candidate },
      select: { id: true, code: true, slug: true, name: true },
    });
    if (found) return found;
  }
  return prisma.country.findFirst({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, code: true, slug: true, name: true },
  });
}
