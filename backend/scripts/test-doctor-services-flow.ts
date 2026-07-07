/**
 * Manual smoke test for doctor service self-selection against the
 * configured DATABASE_URL. Run:
 *   pnpm --filter backend exec tsx scripts/test-doctor-services-flow.ts
 */
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(backendRoot, "..", ".env") });

const tag = `smoke-${Date.now()}`;

async function main() {
  const { prisma } = await import("../src/db/prisma.js");
  const {
    adminAssignServiceToDoctor,
    adminUpdateDoctorService,
    listAdminDoctorServices,
    listDoctorSelectableServices,
    saveDoctorServiceSelections,
  } = await import("../src/modules/doctor-services/doctor-services.service.js");

  console.log("Connecting…");
  await prisma.$queryRawUnsafe("SELECT 1");

  const currency = await prisma.currency.create({
    data: { code: `S${tag.slice(-7)}`, symbol: "€", decimals: 2 },
  });
  const country = await prisma.country.create({
    data: {
      code: `S${tag.slice(-5)}`,
      name: `Smoke ${tag}`,
      slug: `smoke-${tag}`,
      legacyHomePath: `/smoke-${tag}`,
      teamPath: `/smoke-${tag}/team`,
      generalConsultationPath: `/smoke-${tag}/general`,
      specialistConsultationPath: `/smoke-${tag}/specialist`,
      currencyId: currency.id,
    },
  });
  await prisma.bookingSetting.upsert({
    where: { countryId: country.id },
    create: { countryId: country.id, doctorServiceSelfSelectApproval: true },
    update: { doctorServiceSelfSelectApproval: true },
  });
  const doctor = await prisma.doctor.create({
    data: {
      countryId: country.id,
      slug: `dr-smoke-${tag}`,
      fullName: `Dr Smoke ${tag}`,
      title: "GP",
      qualifications: [],
      languages: ["English"],
    },
  });
  const general = await prisma.service.create({
    data: {
      countryId: country.id,
      kind: "GENERAL",
      slug: `gen-smoke-${tag}`,
      name: `General smoke ${tag}`,
      isActive: true,
    },
  });
  const healthTest = await prisma.service.create({
    data: {
      countryId: country.id,
      kind: "HEALTH_TEST",
      slug: `ht-smoke-${tag}`,
      name: `HT smoke ${tag}`,
      isActive: true,
    },
  });

  try {
    const listed = await listDoctorSelectableServices(doctor.id);
    console.log("✓ listDoctorSelectableServices", {
      count: listed.items.length,
      hasGeneral: listed.items.some((s) => s.id === general.id),
      hasHealthTest: listed.items.some((s) => s.id === healthTest.id),
      approvalRequired: listed.approvalRequired,
    });
    if (!listed.items.some((s) => s.id === general.id)) throw new Error("general missing");
    if (listed.items.some((s) => s.id === healthTest.id)) {
      throw new Error("health test should not be doctor-selectable");
    }

    const saved = await saveDoctorServiceSelections(doctor.id, [general.id]);
    const pending = saved.items.find((s) => s.id === general.id)?.assignment;
    console.log("✓ saveDoctorServiceSelections (pending)", pending);
    if (pending?.status !== "pending" || pending.isActive) {
      throw new Error(`expected pending/inactive, got ${pending?.status}/${pending?.isActive}`);
    }

    const adminRows = await listAdminDoctorServices(doctor.id);
    const row = adminRows.find((r) => r.serviceId === general.id);
    if (!row) throw new Error("admin list missing assignment");
    const approved = await adminUpdateDoctorService(doctor.id, row.id, {
      status: "active",
    });
    console.log("✓ adminUpdateDoctorService (active)", {
      status: approved?.status,
      isActive: approved?.isActive,
    });
    if (!approved?.isActive) throw new Error("expected active after approval");

    const adminHt = await adminAssignServiceToDoctor(doctor.id, healthTest.id);
    console.log("✓ adminAssignServiceToDoctor (health test)", {
      kind: adminHt?.service.kind,
      status: adminHt?.status,
    });

    console.log("\nAll doctor-service smoke checks passed.");
  } finally {
    await prisma.serviceDoctor.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.service.deleteMany({ where: { id: { in: [general.id, healthTest.id] } } });
    await prisma.doctor.delete({ where: { id: doctor.id } });
    await prisma.bookingSetting.deleteMany({ where: { countryId: country.id } });
    await prisma.country.delete({ where: { id: country.id } });
    await prisma.currency.delete({ where: { id: currency.id } });
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
