import { prisma } from "../src/db/prisma.js";

const CC = ["ie", "cz", "pt", "es", "ro", "br"];

async function main() {
  const countries = await prisma.country.findMany({ select: { id: true, code: true, name: true } });
  console.log("COUNTRIES:", JSON.stringify(countries));

  for (const c of countries.filter((x) => CC.includes(x.code))) {
    const svcs = await prisma.service.findMany({
      where: { countryId: c.id },
      select: { id: true, slug: true, name: true, kind: true, visibility: true, isActive: true },
      orderBy: { slug: "asc" },
    });
    console.log(`\n### ${c.code} services (${svcs.length}):`);
    for (const s of svcs) console.log(`  ${s.slug} | ${s.kind}/${s.visibility}/${s.isActive} | ${s.id} | ${s.name}`);

    const docs = await prisma.doctor.findMany({
      where: { countryId: c.id, active: true },
      select: {
        id: true,
        fullName: true,
        slug: true,
        title: true,
        medicalRegistrationUrl: true,
        isCountryDirector: true,
        specialties: { select: { specialty: { select: { name: true } } } },
        credentials: { select: { label: true, bodyName: true, bodyUrl: true } },
      },
      take: 40,
    });
    console.log(`### ${c.code} doctors (${docs.length}):`);
    for (const d of docs)
      console.log(
        `  ${d.fullName} | ${d.title} | dir=${d.isCountryDirector} | ${d.specialties.map((s) => s.specialty.name).join(",")} | ${d.credentials.map((x) => `${x.label}@${x.bodyName}`).join(" ; ")} | ${d.medicalRegistrationUrl ?? ""} | ${d.id}`,
      );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
