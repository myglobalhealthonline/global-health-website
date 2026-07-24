import { prisma } from "../src/db/prisma.js";
async function main() {
  const country = await prisma.country.findUnique({ where: { code: "br" }, select: { id: true, defaultLocale: true } });
  console.log("country", country);
  const locales = await prisma.countryLocale.findMany({ where: { countryId: country!.id } });
  console.log("locales", locales);
  const service = await prisma.service.findFirst({
    where: { countryId: country!.id, isActive: true, visibility: "PUBLIC", basePriceCents: { not: null }, currencyCode: { not: null } },
    orderBy: { basePriceCents: "asc" },
  });
  console.log("priced service", service);
}
main().finally(() => prisma.$disconnect());
