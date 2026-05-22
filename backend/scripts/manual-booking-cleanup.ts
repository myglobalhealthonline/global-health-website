/* eslint-disable no-console */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

(async () => {
  const apptIds = [
    "31096d38-1718-4fb8-bf96-cb8535ec8e1c",
    "8d07df13-5f0b-497d-bab1-75f1c3042fb7",
    "cf1b8e33-7ba4-4dd2-bd2a-a1cd5a53c4f2",
  ];
  const emailPattern = { startsWith: "manual-booking-probe-" };

  // Delete in FK order: audits → passwordResetTokens → appointments →
  // patientProfile → user.
  await prisma.auditLog.deleteMany({ where: { entityId: { in: apptIds } } });
  const users = await prisma.user.findMany({
    where: { email: emailPattern },
    select: { id: true, email: true },
  });
  console.log("Users to remove:", users.map((u) => u.email));
  for (const u of users) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: u.id } });
  }
  await prisma.appointment.deleteMany({ where: { id: { in: apptIds } } });
  await prisma.patientProfile.deleteMany({ where: { email: emailPattern } });
  await prisma.user.deleteMany({ where: { email: emailPattern } });
  console.log("Cleanup complete.");
  await prisma.$disconnect();
})();
