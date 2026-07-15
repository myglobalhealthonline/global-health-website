import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";

function normName(n: string): string {
  return n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(dr|dra|drª|mudr|prof|mr|mrs|ms|miss)\.?\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function main() {
  const docs = await prisma.doctor.findMany({
    select: { id: true, fullName: true, legacyMongoId: true },
  });
  const migration = docs.filter((d) => d.legacyMongoId != null);
  const native = docs.filter((d) => d.legacyMongoId == null);
  const nativeByName = new Map<string, string[]>();
  for (const d of native) {
    const k = normName(d.fullName);
    nativeByName.set(k, [...(nativeByName.get(k) ?? []), d.fullName]);
  }

  console.log(`total doctors: ${docs.length}`);
  console.log(`  native (no legacyMongoId): ${native.length}`);
  console.log(`  migration (legacyMongoId): ${migration.length}`);

  let matched = 0;
  const unmatched: string[] = [];
  for (const d of migration) {
    if (nativeByName.has(normName(d.fullName))) matched += 1;
    else unmatched.push(d.fullName);
  }
  console.log(`\nmigration doctors matching a NATIVE doctor by name: ${matched}/${migration.length}`);
  console.log(`unmatched (no native profile by name): ${unmatched.length}`);
  for (const n of unmatched) console.log(`   - ${n}`);

  const migUsers = await prisma.user.count({
    where: { role: "DOCTOR", mustChangePassword: true, doctorId: { not: null } },
  });
  console.log(`\ndoctor login Users created by migration (mustChangePassword): ${migUsers}`);

  const patProfiles = await prisma.patientProfile.count({ where: { legacyMongoIds: { isEmpty: false } } });
  const patUsers = await prisma.user.count({ where: { role: "PATIENT", mustChangePassword: true } });
  console.log(`\npatient profiles migrated so far: ${patProfiles}`);
  console.log(`patient login Users created so far: ${patUsers}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
