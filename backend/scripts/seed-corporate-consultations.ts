/**
 * Seed: the corporate consultations each plan includes, mirroring the ones
 * already configured on Corporate Standard.
 *
 *   node --env-file=.env.dev --import tsx scripts/seed-corporate-consultations.ts          # dry run
 *   node --env-file=.env.dev --import tsx scripts/seed-corporate-consultations.ts --apply
 *
 * Dry run by default — it prints exactly what it would create and writes
 * nothing. Idempotent: a plan that already has a consultation in a given role
 * is left alone, so re-running never duplicates and never overwrites a name,
 * doctor or duration an admin has tuned.
 *
 * WHICH PLAN GETS WHAT comes from the plan matrix:
 *   Pre-assessment  — every plan
 *   Fit-for-work    — Standard and up (Basic and Basic + are marked ✕)
 *   Illness benefit — Standard and up (Basic and Basic + are marked ✕)
 *
 * The matrix also marks "Online Consult (Occup./Prof.)" on all seven, but
 * Corporate Standard has no such row and CorporatePlanServiceRole has no slot
 * for it (it would be a plain INCLUDED consultation). Deliberately not invented
 * here — add it from /admin/corporate once someone decides what it is.
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const TEMPLATE_SLUG = "corporate-standard";
/** Substring identifying the delivering doctor. Must match exactly one active
 *  doctor, or the script stops rather than guessing. */
const DOCTOR_MATCH = "Tiago";

type Role = "PRE_ASSESSMENT" | "FIT_FOR_WORK" | "ILLNESS_BENEFIT";

const CONSULTATIONS: { role: Role; name: string; sortOrder: number }[] = [
  { role: "PRE_ASSESSMENT", name: "Pre-assessment Consultation", sortOrder: 0 },
  { role: "FIT_FOR_WORK", name: "Fit-for-Work Consultation", sortOrder: 1 },
  { role: "ILLNESS_BENEFIT", name: "Illness Benefit Consultation", sortOrder: 2 },
];

/** Slug → the roles that plan includes. */
const PLAN_ROLES: Record<string, Role[]> = {
  "corporate-basic": ["PRE_ASSESSMENT"],
  "corporate-basic-plus": ["PRE_ASSESSMENT"],
  "corporate-standard": ["PRE_ASSESSMENT", "FIT_FOR_WORK", "ILLNESS_BENEFIT"],
  "corporate-standard-plus": ["PRE_ASSESSMENT", "FIT_FOR_WORK", "ILLNESS_BENEFIT"],
  "corporate-premium": ["PRE_ASSESSMENT", "FIT_FOR_WORK", "ILLNESS_BENEFIT"],
  "corporate-premium-plus": ["PRE_ASSESSMENT", "FIT_FOR_WORK", "ILLNESS_BENEFIT"],
  "corporate-premium-plus-plus": ["PRE_ASSESSMENT", "FIT_FOR_WORK", "ILLNESS_BENEFIT"],
};

async function main() {
  const doctors = await prisma.doctor.findMany({
    where: { active: true, fullName: { contains: DOCTOR_MATCH, mode: "insensitive" } },
    select: { id: true, fullName: true },
  });
  if (doctors.length !== 1) {
    console.error(
      `Expected exactly one active doctor matching "${DOCTOR_MATCH}", found ${doctors.length}` +
        (doctors.length ? `: ${doctors.map((d) => d.fullName).join(", ")}` : ""),
    );
    process.exit(1);
  }
  const doctor = doctors[0]!;

  // Corporate Standard's rows are the template: whatever name and duration an
  // admin settled on there is what the other plans should say too.
  const template = await prisma.corporatePlanService.findMany({
    where: { corporatePlan: { slug: TEMPLATE_SLUG } },
    select: { role: true, name: true, description: true, durationMinutes: true, countryCode: true },
  });
  const byRole = new Map(template.map((row) => [row.role as string, row]));
  console.log(
    `doctor: ${doctor.fullName}\ntemplate (${TEMPLATE_SLUG}): ` +
      (template.length ? template.map((t) => `${t.role}="${t.name}"`).join(", ") : "none — using defaults"),
  );

  const plans = await prisma.corporatePlan.findMany({
    where: { slug: { in: Object.keys(PLAN_ROLES) } },
    orderBy: { sortOrder: "asc" },
    include: { includedServices: { select: { role: true, name: true } } },
  });

  let created = 0;
  for (const plan of plans) {
    const wanted = PLAN_ROLES[plan.slug] ?? [];
    for (const spec of CONSULTATIONS) {
      if (!wanted.includes(spec.role)) continue;
      const existing = plan.includedServices.find((s) => s.role === spec.role);
      if (existing) {
        console.log(`  = ${plan.name}: ${spec.role} already set ("${existing.name}") — untouched`);
        continue;
      }
      const source = byRole.get(spec.role);
      const data = {
        corporatePlanId: plan.id,
        name: source?.name ?? spec.name,
        description: source?.description ?? null,
        countryCode: source?.countryCode ?? null,
        durationMinutes: source?.durationMinutes ?? 30,
        doctorId: doctor.id,
        role: spec.role,
        isActive: true,
        sortOrder: spec.sortOrder,
      };
      console.log(
        `  ${APPLY ? "+" : "~"} ${plan.name}: ${spec.role} "${data.name}" · ${doctor.fullName} · ` +
          `${data.countryCode ?? "all countries"} · ${data.durationMinutes} min`,
      );
      if (APPLY) await prisma.corporatePlanService.create({ data });
      created += 1;
    }
  }

  console.log(
    APPLY
      ? `\napplied — ${created} consultations created`
      : `\ndry run — ${created} would be created. Re-run with --apply to write.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
