/**
 * Brazil (BR) market inventory, read-only, for COUNTRY-WAVE-003 Brazil
 * investigation (2026-08-13). Pulls: full doctor roster (active flag,
 * assignedServices, bookability signals) and full service roster
 * (isActive, kind, pricing, editorialChecklist) for country code "br".
 * Modeled on investigate-es-market-inventory.ts / investigate-pt-doctor-service-supply.ts.
 * No writes.
 *
 * Run: node --env-file=.env --import tsx scripts/investigate-br-market-inventory.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

async function main() {
  const country = await prisma.country.findFirst({
    where: { code: "br" },
    select: { id: true, code: true, name: true, isActive: true },
  });
  if (!country) {
    console.log("No country row with code=br found. Listing all country codes:");
    const all = await prisma.country.findMany({ select: { code: true, name: true } });
    console.log(all);
    return;
  }
  console.log(`Country: ${country.name} (${country.code}) id=${country.id} isActive=${country.isActive}`);

  const doctors = await prisma.doctor.findMany({
    where: {
      OR: [
        { countryId: country.id },
        { additionalCountries: { some: { countryId: country.id } } },
      ],
    },
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
      countryId: true,
      country: { select: { code: true } },
      additionalCountries: {
        select: { active: true, isVerified: true, registrationNumber: true, chamberEntity: true, country: { select: { code: true } } },
      },
      specialties: { select: { specialty: { select: { name: true } } } },
      translations: { select: { locale: true, bio: true, title: true } },
      assignedServices: {
        select: { isActive: true, status: true, service: { select: { slug: true, isActive: true, countryId: true } } },
      },
      availabilities: { select: { weekday: true, isActive: true } },
      timeSlots: { select: { status: true, startAt: true }, orderBy: { startAt: "desc" }, take: 3 },
    },
    orderBy: { fullName: "asc" },
  });

  console.log(`\n${"=".repeat(70)}\nDOCTORS (primary or additional country = BR): ${doctors.length}\n${"=".repeat(70)}`);
  for (const d of doctors) {
    const isPrimary = d.country.code === "br";
    const activeAvail = d.availabilities.filter((a) => a.isActive).length;
    console.log(`\n${d.fullName} (${d.slug})  id=${d.id}  primaryCountry=${d.country.code}${isPrimary ? "" : " [ADDITIONAL only]"}`);
    console.log(`  legacyMongoId: ${d.legacyMongoId ?? "null"}`);
    console.log(`  active=${d.active}  bioLen=${(d.bio ?? "").length}  lastReviewedAt=${d.lastReviewedAt?.toISOString() ?? "null"}`);
    console.log(`  editorialChecklist=${JSON.stringify(d.editorialChecklist)}`);
    console.log(`  createdAt=${d.createdAt.toISOString()}  updatedAt=${d.updatedAt.toISOString()}`);
    console.log(`  specialties=${d.specialties.map((s) => s.specialty.name).join(", ") || "(none)"}`);
    console.log(`  translations (${d.translations.length}): ${d.translations.map((t) => `${t.locale}[bioLen=${(t.bio ?? "").length}]`).join(", ") || "none"}`);
    const brAdditional = d.additionalCountries.find((ac) => ac.country.code === "br");
    if (!isPrimary && brAdditional) {
      console.log(`  BR additionalCountry row: active=${brAdditional.active} verified=${brAdditional.isVerified} chamber=${brAdditional.chamberEntity} reg=${brAdditional.registrationNumber}`);
    }
    console.log(`  assignedServices (${d.assignedServices.length}): ${d.assignedServices.map((s) => `${s.service.slug}[svcActive=${s.service.isActive},joinActive=${s.isActive},status=${s.status},svcCountry=${s.service.countryId === country.id ? "br" : "other"}]`).join(", ") || "none"}`);
    console.log(`  availabilities: ${d.availabilities.length} total, ${activeAvail} active`);
    console.log(`  recent timeSlots (up to 3): ${d.timeSlots.map((s) => `${s.startAt.toISOString()}:${s.status}`).join(", ") || "none"}`);
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
      assignedDoctors: { select: { isActive: true, status: true, doctor: { select: { slug: true, active: true } } } },
    },
    orderBy: { slug: "asc" },
  });

  console.log(`\n${"=".repeat(70)}\nBRAZIL SERVICES (countryId = BR): ${services.length}\n${"=".repeat(70)}`);
  for (const s of services) {
    const activeBookableDoctors = s.assignedDoctors.filter((ad) => ad.isActive && ad.status === "active" && ad.doctor.active);
    console.log(`\n${s.slug}  (${s.name})  kind=${s.kind}  isActive=${s.isActive}`);
    console.log(`  price=${s.basePriceCents != null ? (s.basePriceCents / 100).toFixed(2) + " " + s.currencyCode : "null"}  legacyPath=${s.legacyPath ?? "null"}  lastReviewedAt=${s.lastReviewedAt?.toISOString() ?? "null"}`);
    console.log(`  editorialChecklist=${JSON.stringify(s.editorialChecklist)}`);
    console.log(`  assignedDoctors: ${s.assignedDoctors.length} total, ${activeBookableDoctors.length} active+bookable — ${s.assignedDoctors.map((ad) => `${ad.doctor.slug}[joinActive=${ad.isActive},status=${ad.status},docActive=${ad.doctor.active}]`).join(", ") || "none"}`);
    if (activeBookableDoctors.length === 0) {
      console.log(`    ^^ ZERO bookable doctors — flag for product/ops gate`);
    }
  }

  console.log(`\n${"=".repeat(70)}\nTotals: ${doctors.length} doctors, ${services.length} services (countryId=br)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
