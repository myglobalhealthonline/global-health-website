/* eslint-disable no-console */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

(async () => {
  const svc = await prisma.service.findFirst({
    where: { isActive: true, country: { code: "ie" }, basePriceCents: { gt: 0 } },
    select: {
      id: true,
      name: true,
      basePriceCents: true,
      currencyCode: true,
      country: { select: { code: true } },
    },
  });
  const doc = await prisma.doctor.findFirst({
    where: { active: true, country: { code: "ie" } },
    select: { id: true, fullName: true, title: true },
  });
  const clinic = await prisma.clinic.findFirst({
    where: { country: { code: "ie" } },
    select: { id: true, name: true, city: true },
  });
  console.log(JSON.stringify({ svc, doc, clinic }, null, 2));
  await prisma.$disconnect();
})();
