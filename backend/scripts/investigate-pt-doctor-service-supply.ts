/**
 * PT-SEO investigation (COUNTRY-WAVE-002, read-only): Portugal doctor roster
 * (active flag, assigned services, indexability signals) and Portugal service
 * roster (isActive, slug) for a fresh page inventory / product-operations
 * gate check. Modeled on investigate-cz-doctor-supply.ts.
 *
 * Run: node --env-file=.env --import tsx scripts/investigate-pt-doctor-service-supply.ts
 * READ-ONLY — no writes.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

async function main() {
  const country = await prisma.country.findFirst({
    where: { code: "pt" },
    select: { id: true, code: true, name: true, isActive: true },
  });
  console.log(`Country row: ${JSON.stringify(country)}`);
  if (!country) throw new Error("Portugal country row not found (code 'pt')");

  const doctors = await prisma.doctor.findMany({
    where: { countryId: country.id },
    select: {
      id: true,
      legacyMongoId: true,
      slug: true,
      fullName: true,
      title: true,
      bio: true,
      active: true,
      editorialChecklist: true,
      lastReviewedAt: true,
      createdAt: true,
      updatedAt: true,
      assignedServices: {
        select: { service: { select: { slug: true, isActive: true } }, isActive: true, status: true },
      },
      availabilities: { select: { weekday: true, isActive: true } },
      timeSlots: {
        select: { status: true, startAt: true },
        orderBy: { startAt: "desc" },
        take: 3,
      },
    },
    orderBy: { fullName: "asc" },
  });

  console.log(`\n${"=".repeat(70)}\nPORTUGAL DOCTORS (primary country): ${doctors.length}\n${"=".repeat(70)}`);
  for (const d of doctors) {
    console.log(`\n${d.fullName}  (${d.slug})  id=${d.id}`);
    console.log(`  legacyMongoId: ${d.legacyMongoId ?? "null"}`);
    console.log(`  active=${d.active}  bioLen=${(d.bio ?? "").length}  lastReviewedAt=${d.lastReviewedAt?.toISOString() ?? "null"}`);
    console.log(`  editorialChecklist=${JSON.stringify(d.editorialChecklist)}`);
    console.log(`  createdAt=${d.createdAt.toISOString()}  updatedAt=${d.updatedAt.toISOString()}`);
    console.log(`  assignedServices (${d.assignedServices.length}): ${d.assignedServices.map((s) => `${s.service.slug}[svcActive=${s.service.isActive},joinActive=${s.isActive},status=${s.status}]`).join(", ") || "none"}`);
    const activeAvail = d.availabilities.filter((a) => a.isActive).length;
    console.log(`  availabilities: ${d.availabilities.length} total, ${activeAvail} active`);
    console.log(`  recent timeSlots (up to 3): ${d.timeSlots.map((s) => `${s.startAt.toISOString()}:${s.status}`).join(", ") || "none"}`);
  }

  // Doctors with PT as a secondary/linked market (DoctorCountry)
  const linked = await prisma.doctorCountry.findMany({
    where: { countryId: country.id },
    select: {
      active: true,
      isVerified: true,
      registrationNumber: true,
      chamberEntity: true,
      doctor: { select: { id: true, slug: true, fullName: true, active: true, country: { select: { code: true } } } },
    },
  });
  console.log(`\n${"=".repeat(70)}\nPORTUGAL AS LINKED/SECONDARY MARKET (DoctorCountry): ${linked.length}\n${"=".repeat(70)}`);
  for (const l of linked) {
    console.log(`  ${l.doctor.fullName} (${l.doctor.slug}) primaryCountry=${l.doctor.country.code} baseActive=${l.doctor.active} marketActive=${l.active} verified=${l.isVerified} chamber=${l.chamberEntity} reg=${l.registrationNumber}`);
  }

  const services = await prisma.service.findMany({
    where: { countryId: country.id },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      isActive: true,
      basePriceCents: true,
      currencyCode: true,
      lastReviewedAt: true,
      legacyPath: true,
      editorialChecklist: true,
      assignedDoctors: {
        select: { isActive: true, status: true, doctor: { select: { slug: true, active: true } } },
      },
    },
    orderBy: { slug: "asc" },
  });

  console.log(`\n${"=".repeat(70)}\nPORTUGAL SERVICES: ${services.length}\n${"=".repeat(70)}`);
  for (const s of services) {
    const activeDoctors = s.assignedDoctors.filter((ad) => ad.isActive && ad.doctor.active);
    console.log(`\n${s.slug}  (${s.name})  kind=${s.kind}  isActive=${s.isActive}`);
    console.log(`  price=${s.basePriceCents != null ? (s.basePriceCents / 100).toFixed(2) + " " + s.currencyCode : "null"}  legacyPath=${s.legacyPath ?? "null"}  lastReviewedAt=${s.lastReviewedAt?.toISOString() ?? "null"}`);
    console.log(`  assignedDoctors: ${s.assignedDoctors.length} total, ${activeDoctors.length} active+bookable — ${s.assignedDoctors.map((ad) => `${ad.doctor.slug}[joinActive=${ad.isActive},status=${ad.status},docActive=${ad.doctor.active}]`).join(", ") || "none"}`);
  }

  console.log(`\n${"=".repeat(70)}\nTotals: ${doctors.length} primary-market doctors, ${linked.length} linked doctors, ${services.length} services\n${"=".repeat(70)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
