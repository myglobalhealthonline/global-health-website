/* eslint-disable no-console */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

(async () => {
  const ids = [
    "31096d38-1718-4fb8-bf96-cb8535ec8e1c",
    "8d07df13-5f0b-497d-bab1-75f1c3042fb7",
    "cf1b8e33-7ba4-4dd2-bd2a-a1cd5a53c4f2",
  ];
  for (const id of ids) {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        manualEntry: true,
        consultationMode: true,
        clinicId: true,
        locationAddress: true,
        amountCents: true,
        currencyCode: true,
        paymentStatus: true,
        stripeSessionId: true,
        email: true,
        fullName: true,
        userId: true,
      },
    });
    const user = appt?.userId
      ? await prisma.user.findUnique({
          where: { id: appt.userId },
          select: {
            id: true,
            email: true,
            role: true,
            mustChangePassword: true,
            passwordHash: true,
          },
        })
      : null;
    const profile = appt?.email
      ? await prisma.patientProfile.findUnique({
          where: { email: appt.email },
          select: { id: true, email: true, fullName: true, userId: true },
        })
      : null;
    console.log("---", id);
    console.log("appt:", appt);
    console.log("user:", user ? { ...user, passwordHash: user.passwordHash.slice(0, 14) + "…" } : null);
    console.log("profile:", profile);
  }

  // Audit rows from the two creations.
  const audits = await prisma.auditLog.findMany({
    where: { action: "APPOINTMENT_CREATED", entityId: { in: ids } },
    select: {
      action: true,
      entityId: true,
      actorRole: true,
      metadata: true,
      createdAt: true,
    },
  });
  console.log("\n--- audits ---");
  console.log(JSON.stringify(audits, null, 2));

  await prisma.$disconnect();
})();
