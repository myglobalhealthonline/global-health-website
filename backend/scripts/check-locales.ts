import { prisma } from "../src/db/prisma.js";
async function main() {
  const countries = await prisma.country.findMany({ select: { code: true, defaultLocale: true } });
  for (const c of countries) {
    const locs = await prisma.countryLocale.findMany({ where: { countryId: (await prisma.country.findUnique({where:{code:c.code}}))!.id }, select: { locale: true } });
    console.log(c.code, c.defaultLocale, locs.map(l=>l.locale));
  }
}
main().finally(() => prisma.$disconnect());
