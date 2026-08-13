/**
 * CZ-SEO-006 read-only investigation: business/public-supply status,
 * first-party bio-source availability, and roster-inclusion reasoning for
 * Felici, Nytra, Kharlamova. Also checks Hlavatý/Cyplinská/Lavrov for any
 * new positive disposition evidence (AuditLog, legacyMongoId).
 *
 * Run: node --env-file=.env --import tsx scripts/investigate-cz-doctor-supply.ts
 * READ-ONLY — no writes.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const NAMES = ["Felici", "Nytra", "Kharlamova"];
const WATCH_NAMES = [...NAMES, "Hlavat", "Cyplinsk", "Lavrov"];

async function main() {
  const doctors = await prisma.doctor.findMany({
    where: { OR: WATCH_NAMES.map((n) => ({ fullName: { contains: n } })) },
    select: {
      id: true,
      legacyMongoId: true,
      slug: true,
      fullName: true,
      title: true,
      bio: true,
      active: true,
      editorialChecklist: true,
      createdAt: true,
      updatedAt: true,
      country: { select: { code: true } },
      additionalCountries: {
        select: {
          active: true,
          isVerified: true,
          registrationNumber: true,
          chamberEntity: true,
          country: { select: { code: true } },
          translations: { select: { locale: true, bio: true, title: true } },
        },
      },
      translations: { select: { locale: true, bio: true, title: true } },
      assignedServices: {
        select: { service: { select: { slug: true, isActive: true } }, isActive: true, status: true },
      },
      availabilities: { select: { weekday: true, isActive: true, effectiveFrom: true, effectiveUntil: true } },
      timeSlots: {
        where: { startAt: { gte: new Date(0) } },
        select: { status: true, startAt: true },
        orderBy: { startAt: "desc" },
        take: 5,
      },
      appointments: {
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  for (const d of doctors) {
    console.log(`\n${"=".repeat(70)}\n${d.fullName}  (${d.slug})  id=${d.id}`);
    console.log(`legacyMongoId: ${d.legacyMongoId ?? "null (native record, not a legacy import)"}`);
    console.log(`active=${d.active}  createdAt=${d.createdAt.toISOString()}  updatedAt=${d.updatedAt.toISOString()}`);
    console.log(`primary country: ${d.country.code}  base title="${d.title}"  base bio length=${(d.bio ?? "").length}`);
    console.log(`editorialChecklist: ${JSON.stringify(d.editorialChecklist)}`);

    console.log(`translations (${d.translations.length}):`);
    for (const t of d.translations) {
      console.log(`  ${t.locale}: title="${t.title}" bioLen=${(t.bio ?? "").length}`);
    }

    console.log(`additionalCountries (${d.additionalCountries.length}):`);
    for (const ac of d.additionalCountries) {
      console.log(
        `  ${ac.country.code}: active=${ac.active} verified=${ac.isVerified} chamber=${ac.chamberEntity} reg=${ac.registrationNumber}`
      );
      for (const t of ac.translations) {
        console.log(`    market-translation ${t.locale}: title="${t.title}" bioLen=${(t.bio ?? "").length}`);
      }
    }

    console.log(`assignedServices (${d.assignedServices.length}):`);
    for (const s of d.assignedServices) {
      console.log(`  ${s.service.slug} (serviceActive=${s.service.isActive}, joinActive=${s.isActive}, status=${s.status})`);
    }

    console.log(`availabilities (${d.availabilities.length}):`);
    for (const a of d.availabilities) {
      console.log(
        `  weekday=${a.weekday} active=${a.isActive} from=${a.effectiveFrom?.toISOString() ?? "-"} until=${a.effectiveUntil?.toISOString() ?? "-"}`
      );
    }

    console.log(`recent timeSlots (up to 5, any status): ${d.timeSlots.length}`);
    for (const s of d.timeSlots) {
      console.log(`  ${s.startAt.toISOString()} status=${s.status}`);
    }

    console.log(`recent appointments (up to 3): ${d.appointments.length}`);
    for (const a of d.appointments) {
      console.log(`  ${a.createdAt.toISOString()} status=${a.status}`);
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "Doctor", entityId: d.id },
      select: { action: true, createdAt: true, actorRole: true, metadata: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    console.log(`AuditLog rows for entityType=Doctor entityId=${d.id}: ${auditLogs.length}`);
    for (const log of auditLogs) {
      console.log(`  ${log.createdAt.toISOString()} ${log.action} actorRole=${log.actorRole} metadata=${JSON.stringify(log.metadata)}`);
    }
  }

  console.log(`\n${"=".repeat(70)}\nTotal matched doctors: ${doctors.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
