import "dotenv/config";
import fs from "node:fs";
import { join } from "node:path";
import { prisma } from "../../src/db/prisma.js";
import { DUMP_DIR } from "./lib/config.js";
import { readCollection, hasCollection } from "./lib/source.js";

function cell(v: string | null | undefined){ const s=v??""; return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }

async function main(){
  // source emails from the legacy export (doctor logins were removed, so the
  // DB no longer holds these addresses for migrated doctors)
  const norm = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
    .replace(/\b(dr|dra|mudr|prof|mr|mrs|ms)\.?\b/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");

  const srcEmail = new Map<string,string>();      // by legacyMongoId
  const srcEmailByName = new Map<string,string>(); // by normalised name (covers
  // doctors that were never migrated — unreferenced ones have no legacyMongoId)
  if (hasCollection("GlobalDoctors")) {
    for await (const d of readCollection("GlobalDoctors")) {
      const id = String(d._id ?? "");
      const e = String(d.Email ?? d.email ?? "").trim();
      const nm = String(d["Doctor Name"] ?? d.name ?? "").trim();
      if (id && e) srcEmail.set(id, e);
      if (nm && e) srcEmailByName.set(norm(nm), e);
    }
  }

  const docs = await prisma.doctor.findMany({
    select: {
      id: true, fullName: true, title: true, legacyMongoId: true, active: true,
      country: { select: { code: true, name: true } },
      loginUser: { select: { email: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const rows = docs.map((d) => {
    const byId = d.legacyMongoId ? srcEmail.get(d.legacyMongoId) : undefined;
    const byName = srcEmailByName.get(norm(d.fullName));
    const email = d.loginUser?.email ?? byId ?? byName ?? "";
    return {
      name: d.fullName,
      email,
      country: d.country?.name ?? "",
      countryCode: d.country?.code ?? "",
      hasLogin: d.loginUser ? "yes" : "no",
      source: d.legacyMongoId ? "migrated" : "native",
      active: d.active ? "yes" : "no",
      emailSource: d.loginUser?.email ? "login account" : byId ? "legacy export (id)" : byName ? "legacy export (name)" : "none",
    };
  });

  const header = "name,email,country,country_code,has_login,source,active,email_source\n";
  const body = rows.map(r => [r.name,r.email,r.country,r.countryCode,r.hasLogin,r.source,r.active,r.emailSource].map(cell).join(",")).join("\n");
  const out = join(DUMP_DIR || ".", "doctors.csv");
  fs.writeFileSync(out, header + body + "\n", "utf8");
  console.log(`wrote ${rows.length} doctors -> ${out}`);
  console.log(`  with email: ${rows.filter(r=>r.email).length}   without: ${rows.filter(r=>!r.email).length}`);
  console.log("\nname | email | country");
  for (const r of rows) console.log(`${r.name} | ${r.email || "(no email)"} | ${r.country}`);
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());
