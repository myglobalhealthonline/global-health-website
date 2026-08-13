/**
 * Spain (ES) market inventory, read-only, for COUNTRY-WAVE-002 Spain
 * investigation (2026-08-13). Pulls: full doctor roster (active flag,
 * assignedServices, bookability signals) and full service roster
 * (isActive, kind, pricing, editorialChecklist) for country code "ES".
 * No writes.
 *
 * Run: node --env-file=.env --import tsx scripts/investigate-es-market-inventory.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

async function main() {
  const country = await prisma.country.findFirst({
    where: { code: "es" },
    select: { id: true, code: true, name: true },
  });
  if (!country) {
    console.log("No country row with code=ES found. Listing all country codes:");
    const all = await prisma.country.findMany({ select: { code: true, name: true } });
    console.log(all);
    return;
  }
  console.log(`Country: ${country.name} (${country.code}) id=${country.id}`);

  const doctors = await prisma.doctor.findMany({
    where: {
      OR: [
        { countryId: country.id },
        { additionalCountries: { some: { countryId: country.id } } },
      ],
    },
    select: {
      id: true,
      slug: true,
      fullName: true,
      title: true,
      active: true,
      editorialChecklist: true,
      countryId: true,
      country: { select: { code: true } },
      additionalCountries: {
        select: { active: true, isVerified: true, country: { select: { code: true } } },
      },
      specialties: { select: { specialty: { select: { name: true } } } },
      assignedServices: {
        select: {
          isActive: true,
          status: true,
          service: { select: { slug: true, isActive: true, countryId: true } },
        },
      },
      availabilities: { select: { isActive: true } },
    },
    orderBy: { fullName: "asc" },
  });

  console.log(`\n${"=".repeat(70)}\nDOCTORS (primary or additional country = ES): ${doctors.length}\n`);
  for (const d of doctors) {
    const isPrimary = d.country.code === "es";
    const activeAvail = d.availabilities.filter((a) => a.isActive).length;
    console.log(
      `${d.fullName} (${d.slug})  primaryCountry=${d.country.code}${isPrimary ? "" : " [ADDITIONAL only]"}  active=${d.active}  activeAvailabilityRows=${activeAvail}`
    );
    console.log(`  editorialChecklist=${JSON.stringify(d.editorialChecklist)}`);
    console.log(`  specialties=${d.specialties.map((s) => s.specialty.name).join(", ") || "(none)"}`);
    const esAdditional = d.additionalCountries.find((ac) => ac.country.code === "es");
    if (!isPrimary && esAdditional) {
      console.log(`  ES additionalCountry row: active=${esAdditional.active} verified=${esAdditional.isVerified}`);
    }
    console.log(`  assignedServices (${d.assignedServices.length}):`);
    for (const s of d.assignedServices) {
      console.log(
        `    ${s.service.slug} serviceActive=${s.service.isActive} joinActive=${s.isActive} status=${s.status} serviceCountryId=${s.service.countryId === country.id ? "es" : "other"}`
      );
    }
  }

  const services = await prisma.service.findMany({
    where: { countryId: country.id },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      isActive: true,
      editorialChecklist: true,
      basePriceCents: true,
      currencyCode: true,
      legacyPath: true,
      lastReviewedAt: true,
      assignedDoctors: { select: { isActive: true, status: true, doctor: { select: { slug: true, active: true } } } },
    },
    orderBy: { slug: "asc" },
  });

  console.log(`\n${"=".repeat(70)}\nSERVICES (countryId = ES): ${services.length}\n`);
  for (const s of services) {
    const activeBookableDoctors = s.assignedDoctors.filter(
      (sd) => sd.isActive && sd.status === "active" && sd.doctor.active
    ).length;
    console.log(
      `${s.slug}  kind=${s.kind}  isActive=${s.isActive}  price=${s.basePriceCents != null ? (s.basePriceCents / 100).toFixed(2) + " " + s.currencyCode : "null"}  activeBookableDoctors=${activeBookableDoctors}/${s.assignedDoctors.length}  lastReviewedAt=${s.lastReviewedAt?.toISOString() ?? "null"}  legacyPath=${s.legacyPath ?? "-"}`
    );
    if (activeBookableDoctors === 0) {
      console.log(`    ^^ ZERO bookable doctors — flag for product/ops gate`);
    }
  }

  console.log(`\n${"=".repeat(70)}\nTotals: ${doctors.length} doctors, ${services.length} services (countryId=ES)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
