import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

async function main() {
  const users = await prisma.user.findMany({
    where: { role: "DOCTOR", doctorId: { not: null } },
    select: {
      email: true,
      fullName: true,
      doctorProfile: {
        select: {
          fullName: true,
          slug: true,
          country: { select: { code: true, name: true } },
          _count: { select: { appointments: true } },
        },
      },
    },
  });

  console.log("Doctor portal accounts (email → profile, appointments):");
  for (const u of users) {
    const d = u.doctorProfile;
    console.log(
      `  ${u.email} → ${d?.fullName ?? u.fullName} [${d?.country.code ?? "?"}] — ${d?._count.appointments ?? 0} appts`,
    );
  }

  const sampleAppt = await prisma.appointment.findFirst({
    where: { doctorId: { not: null } },
    select: { id: true, fullName: true, doctorId: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("\nSample appointment:", sampleAppt ?? "none");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
