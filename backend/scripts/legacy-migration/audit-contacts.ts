/**
 * Read-only analysis of contacts.csv: how many already exist as PatientProfile
 * (by email), how many are new, and the country split derived from the PHONE
 * dial prefix. Writes nothing.
 *
 *   CONTACTS_CSV="c:/Users/nauma/Downloads/contacts.csv" node --import tsx scripts/legacy-migration/audit-contacts.ts
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { readCsvRecords, mapContact } from "./lib/contacts-csv.js";

async function main() {
  const file = process.env.CONTACTS_CSV;
  if (!file) throw new Error("CONTACTS_CSV is required");
  const recs = readCsvRecords(file);
  const contacts = recs.map(mapContact);
  console.log(`contacts in CSV: ${contacts.length}`);

  const withEmail = contacts.filter((c) => c.email);
  const noEmail = contacts.length - withEmail.length;
  const emails = [...new Set(withEmail.map((c) => c.email!))];
  console.log(`  with email: ${withEmail.length}  (distinct: ${emails.length})   no email: ${noEmail}`);
  console.log(`  with phone: ${contacts.filter((c) => c.phone).length}`);

  // country split from PHONE
  const byPhone = new Map<string, number>();
  for (const c of contacts) byPhone.set(c.countryFromPhone ?? "(unknown)", (byPhone.get(c.countryFromPhone ?? "(unknown)") ?? 0) + 1);
  console.log("\ncountry from PHONE prefix:");
  for (const [k, v] of [...byPhone.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(10)} ${v}`);

  // where phone gives nothing, what does the address say?
  const unknownPhone = contacts.filter((c) => !c.countryFromPhone);
  const fallback = new Map<string, number>();
  for (const c of unknownPhone) fallback.set(c.countryFromAddress ?? "(none)", (fallback.get(c.countryFromAddress ?? "(none)") ?? 0) + 1);
  console.log(`\nfor the ${unknownPhone.length} without a recognised phone prefix, address country says:`);
  for (const [k, v] of [...fallback.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(10)} ${v}`);
  console.log("   sample unrecognised phones:", unknownPhone.filter((c) => c.phone).slice(0, 6).map((c) => c.phone).join(", "));

  // existing vs new (by email)
  let exists = 0;
  const newOnes: string[] = [];
  for (let i = 0; i < emails.length; i += 300) {
    const chunk = emails.slice(i, i + 300);
    const found = await prisma.patientProfile.findMany({ where: { email: { in: chunk } }, select: { email: true } });
    const have = new Set(found.map((f) => f.email.toLowerCase()));
    for (const e of chunk) { if (have.has(e)) exists += 1; else newOnes.push(e); }
  }
  console.log(`\nvs existing PatientProfiles (matched by email):`);
  console.log(`   already exist: ${exists}`);
  console.log(`   NEW to add:    ${newOnes.length}`);
  console.log(`   sample new:`, newOnes.slice(0, 6).join(", "));

  // how many existing patients currently lack a country
  const noCountry = await prisma.patientProfile.count({ where: { countryFolderCode: null } });
  const total = await prisma.patientProfile.count();
  console.log(`\nexisting PatientProfiles: ${total}  |  without countryFolderCode: ${noCountry}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
