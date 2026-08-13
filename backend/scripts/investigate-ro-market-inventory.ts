/**
 * Romania (RO) market inventory, read-only, for COUNTRY-WAVE-003 Romania
 * investigation. Modeled on investigate-pt-doctor-service-supply.ts /
 * investigate-es-market-inventory.ts. Pulls: full doctor roster (primary +
 * linked/secondary via DoctorCountry), translations (locale-level content
 * completeness), full service roster (isActive, translations, pricing,
 * bookability), and Romania-scoped blog posts.
 *
 * Run: node --env-file=.env --import tsx scripts/investigate-ro-market-inventory.ts
 * READ-ONLY — no writes.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

async function main() {
  const country = await prisma.country.findFirst({
    where: { code: "ro" },
    select: { id: true, code: true, name: true, isActive: true, defaultLocale: true, enabledFeatures: true },
  });
  console.log(`Country row: ${JSON.stringify(country)}`);
  if (!country) throw new Error("Romania country row not found (code 'ro')");

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
      specialties: { select: { specialty: { select: { name: true } } } },
      translations: { select: { locale: true, title: true, bio: true } },
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

  console.log(`\n${"=".repeat(70)}\nROMANIA DOCTORS (primary country): ${doctors.length}\n${"=".repeat(70)}`);
  for (const d of doctors) {
    console.log(`\n${d.fullName}  (${d.slug})  id=${d.id}`);
    console.log(`  legacyMongoId: ${d.legacyMongoId ?? "null"}`);
    console.log(`  active=${d.active}  bioLen(base)=${(d.bio ?? "").length}  lastReviewedAt=${d.lastReviewedAt?.toISOString() ?? "null"}`);
    console.log(`  editorialChecklist=${JSON.stringify(d.editorialChecklist)}`);
    console.log(`  specialties=${d.specialties.map((s) => s.specialty.name).join(", ") || "(none)"}`);
    console.log(`  createdAt=${d.createdAt.toISOString()}  updatedAt=${d.updatedAt.toISOString()}`);
    console.log(`  translations (${d.translations.length}): ${d.translations.map((t) => `${t.locale}[bioLen=${(t.bio ?? "").length}]`).join(", ") || "none"}`);
    const roTranslation = d.translations.find((t) => t.locale === "RO");
    if (!roTranslation) console.log(`    ^^ NO RO DoctorTranslation row`);
    console.log(`  assignedServices (${d.assignedServices.length}): ${d.assignedServices.map((s) => `${s.service.slug}[svcActive=${s.service.isActive},joinActive=${s.isActive},status=${s.status}]`).join(", ") || "none"}`);
    const activeAvail = d.availabilities.filter((a) => a.isActive).length;
    console.log(`  availabilities: ${d.availabilities.length} total, ${activeAvail} active`);
    console.log(`  recent timeSlots (up to 3): ${d.timeSlots.map((s) => `${s.startAt.toISOString()}:${s.status}`).join(", ") || "none"}`);
  }

  // Doctors with Romania as a secondary/linked market (DoctorCountry)
  const linked = await prisma.doctorCountry.findMany({
    where: { countryId: country.id },
    select: {
      active: true,
      isVerified: true,
      registrationNumber: true,
      chamberEntity: true,
      doctor: { select: { id: true, slug: true, fullName: true, active: true, country: { select: { code: true } } } },
      translations: { select: { locale: true, bio: true } },
    },
  });
  console.log(`\n${"=".repeat(70)}\nROMANIA AS LINKED/SECONDARY MARKET (DoctorCountry): ${linked.length}\n${"=".repeat(70)}`);
  for (const l of linked) {
    console.log(`  ${l.doctor.fullName} (${l.doctor.slug}) primaryCountry=${l.doctor.country.code} baseActive=${l.doctor.active} marketActive=${l.active} verified=${l.isVerified} chamber=${l.chamberEntity} reg=${l.registrationNumber}`);
    console.log(`    market translations: ${l.translations.map((t) => `${t.locale}[bioLen=${(t.bio ?? "").length}]`).join(", ") || "none"}`);
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
      translations: { select: { locale: true, name: true, summary: true, detailBody: true } },
      assignedDoctors: {
        select: { isActive: true, status: true, doctor: { select: { slug: true, active: true } } },
      },
    },
    orderBy: { slug: "asc" },
  });

  console.log(`\n${"=".repeat(70)}\nROMANIA SERVICES: ${services.length}\n${"=".repeat(70)}`);
  for (const s of services) {
    const activeDoctors = s.assignedDoctors.filter((ad) => ad.isActive && ad.doctor.active);
    console.log(`\n${s.slug}  (${s.name})  kind=${s.kind}  isActive=${s.isActive}`);
    console.log(`  price=${s.basePriceCents != null ? (s.basePriceCents / 100).toFixed(2) + " " + s.currencyCode : "null"}  legacyPath=${s.legacyPath ?? "null"}  lastReviewedAt=${s.lastReviewedAt?.toISOString() ?? "null"}`);
    console.log(`  editorialChecklist=${JSON.stringify(s.editorialChecklist)}`);
    const roT = s.translations.find((t) => t.locale === "RO");
    console.log(`  translations (${s.translations.length}): ${s.translations.map((t) => `${t.locale}[bodyLen=${(t.detailBody ?? "").replace(/<[^>]*>/g, "").trim().length}]`).join(", ") || "none"}`);
    if (!roT) console.log(`    ^^ NO RO ServiceTranslation row`);
    console.log(`  assignedDoctors: ${s.assignedDoctors.length} total, ${activeDoctors.length} active+bookable — ${s.assignedDoctors.map((ad) => `${ad.doctor.slug}[joinActive=${ad.isActive},status=${ad.status},docActive=${ad.doctor.active}]`).join(", ") || "none"}`);
    if (activeDoctors.length === 0) console.log(`    ^^ ZERO bookable doctors — flag for product/ops gate`);
  }

  // Romania-scoped blog posts (countryId match OR BlogPostCountry join)
  const blogDirect = await prisma.blogPost.findMany({
    where: { countryId: country.id },
    select: {
      id: true,
      slug: true,
      title: true,
      locale: true,
      status: true,
      isActive: true,
      publishedAt: true,
      translations: { select: { locale: true, slug: true, title: true } },
    },
    orderBy: { slug: "asc" },
  });
  const blogLinked = await prisma.blogPostCountry.findMany({
    where: { countryId: country.id },
    select: {
      post: {
        select: { id: true, slug: true, title: true, locale: true, status: true, isActive: true, publishedAt: true, countryId: true },
      },
    },
  });

  console.log(`\n${"=".repeat(70)}\nROMANIA BLOG POSTS (countryId direct): ${blogDirect.length}\n${"=".repeat(70)}`);
  for (const b of blogDirect) {
    console.log(`  ${b.slug} (${b.locale}) status=${b.status} active=${b.isActive} publishedAt=${b.publishedAt?.toISOString() ?? "null"}`);
    console.log(`    translations: ${b.translations.map((t) => `${t.locale}:${t.slug}`).join(", ") || "none"}`);
  }
  console.log(`\nROMANIA BLOG POSTS (via BlogPostCountry join, excluding already-listed direct): ${blogLinked.length}`);
  for (const bl of blogLinked) {
    if (bl.post.countryId === country.id) continue; // already listed above
    console.log(`  ${bl.post.slug} (${bl.post.locale}) status=${bl.post.status} active=${bl.post.isActive} primaryCountryId=${bl.post.countryId}`);
  }

  console.log(`\n${"=".repeat(70)}\nTotals: ${doctors.length} primary-market doctors, ${linked.length} linked doctors, ${services.length} services, ${blogDirect.length} direct blog posts, ${blogLinked.length} linked blog posts\n${"=".repeat(70)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
