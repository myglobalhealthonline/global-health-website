/**
 * Fix doctor duplication from the migration:
 *   1. Delete the migration-created doctor login Users (+ their reset tokens).
 *      Doctors get NO logins now — admin invites them later.
 *   2. Merge each migration-created Doctor into the EXISTING native profile,
 *      matched by name (exact, else unambiguous token-subset). The legacy
 *      reference (legacyMongoId) is moved onto the existing profile and the
 *      duplicate is deleted — so appointments / notes / documents resolve to
 *      the REAL doctor. Genuinely-new doctors (no name match) are kept as
 *      profiles (still no login). Ambiguous matches are left for manual review.
 *
 *   DRY_RUN=false node --import tsx scripts/legacy-migration/merge-doctors.ts
 *
 * Safe to run before appointments/notes/documents are loaded (no dependent
 * MedicalNote/GeneratedDocument rows reference these doctors yet).
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { DRY_RUN } from "./lib/config.js";

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
const tokens = (n: string) => normName(n).split(" ").filter(Boolean);
function subset(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  return a.every((t) => sb.has(t)) || b.every((t) => sa.has(t));
}

async function main() {
  const migration = await prisma.doctor.findMany({
    where: { legacyMongoId: { not: null } },
    select: { id: true, fullName: true, legacyMongoId: true, loginUser: { select: { id: true } } },
  });
  const natives = await prisma.doctor.findMany({
    where: { legacyMongoId: null },
    select: { id: true, fullName: true, legacyMongoId: true },
  });

  // 1. delete migration doctor logins (mustChangePassword only — never a real one)
  const loginIds = migration.map((d) => d.loginUser?.id).filter((x): x is string => !!x);
  const toDelete = loginIds.length
    ? await prisma.user.findMany({
        where: { id: { in: loginIds }, mustChangePassword: true },
        select: { id: true },
      })
    : [];
  console.log(`${DRY_RUN ? "[dry] " : ""}deleting ${toDelete.length} migration doctor logins`);
  if (!DRY_RUN && toDelete.length) {
    const ids = toDelete.map((u) => u.id);
    // Deleting a User SetNulls AuditLog.actorUserId, but the append-only audit
    // trigger blocks that UPDATE. The documented override permits it inside a
    // reviewed transaction (audit rows + actorRole snapshot are kept; only the
    // deleted user's id is nulled). This is a deliberate, reviewed cleanup.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL app.allow_log_delete = 'on'");
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
  }

  // 2. merge / keep
  let merged = 0;
  let kept = 0;
  let ambiguous = 0;
  const keptNames: string[] = [];
  const ambiguousNames: string[] = [];

  for (const m of migration) {
    const mTok = tokens(m.fullName);
    const exact = natives.filter((n) => normName(n.fullName) === normName(m.fullName));
    let target = exact.length === 1 ? exact[0] : null;
    if (!target && exact.length === 0) {
      const subs = natives.filter((n) => subset(mTok, tokens(n.fullName)));
      if (subs.length === 1) target = subs[0];
      else if (subs.length > 1) {
        ambiguous += 1;
        ambiguousNames.push(`${m.fullName}  ~  [${subs.map((s) => s.fullName).join(", ")}]`);
      }
    }

    if (!target) {
      kept += 1;
      keptNames.push(m.fullName);
      continue; // keep migration profile as-is (login already removed)
    }

    // native already carries a legacyMongoId?
    if (target.legacyMongoId && target.legacyMongoId !== m.legacyMongoId) {
      ambiguous += 1;
      ambiguousNames.push(`${m.fullName} -> native ${target.fullName} already has another legacy id`);
      kept += 1;
      keptNames.push(m.fullName);
      continue;
    }

    if (!DRY_RUN) {
      // delete duplicate first (frees the unique legacyMongoId), then stamp native
      await prisma.doctor.delete({ where: { id: m.id } });
      await prisma.doctor.update({
        where: { id: target.id },
        data: { legacyMongoId: m.legacyMongoId },
      });
      target.legacyMongoId = m.legacyMongoId; // keep local state consistent
    }
    merged += 1;
  }

  console.log(
    `\nmerged into existing profile: ${merged}\n` +
      `kept as new profile (no match, no login): ${kept}\n` +
      `ambiguous (left for manual review): ${ambiguous}`,
  );
  if (keptNames.length) console.log(`\nkept new doctors:\n  - ${keptNames.join("\n  - ")}`);
  if (ambiguousNames.length) console.log(`\nambiguous:\n  - ${ambiguousNames.join("\n  - ")}`);
}

main()
  .catch((e) => {
    console.error("merge-doctors failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
