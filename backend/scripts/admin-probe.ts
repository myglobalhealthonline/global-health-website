/* eslint-disable no-console */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

(async () => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, email: true, fullName: true, mustChangePassword: true },
  });
  console.log(JSON.stringify(admins, null, 2));
  await prisma.$disconnect();
})();
