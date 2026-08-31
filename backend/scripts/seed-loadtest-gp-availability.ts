/**
 * One-off fix for a load-test finding: POST /api/public/gp-assign returned
 * NO_DOCTOR on every attempt in every profile of the 2026-08-14 run (see
 * docs/audits/perf/load-test-report-2026-08-14.md), so the booking journey's
 * cart-write / pricing / checkout path was never actually exercised despite
 * the run reporting a clean pass.
 *
 * gp-assign's eligibility check (listEligibleGpDoctors in
 * modules/gp-booking/gp-assignment.service.ts) requires a doctor that is:
 *   - active: true, in an active country
 *   - assigned (ServiceDoctor, isActive+status="active") to the service
 *     resolveGpSameDayService() resolves for that country — which is a
 *     SEPARATE resolution (Setting "gp_same_day_service:<country>", or the
 *     country's first active GENERAL service) from the serviceSlug the k6
 *     scenario reads availability from (loadtest/config/targets.json
 *     sampleServiceSlug). If they're different services, a doctor assigned
 *     only to one is invisible to the other.
 *   - speaking a language matching (case-insensitive, exact) what
 *     loadtest/scenarios/booking-journey.js sends — hardcoded "EN". Doctor
 *     .languages is free text ("en" vs "English" both occur in this DB), so
 *     this is a plausible independent cause of NO_DOCTOR even with every
 *     other condition satisfied.
 *   - a DoctorTimeSlot row with status OPEN at the exact requested startAt —
 *     materialized from DoctorAvailability via ensureSlotsForRange.
 *
 * This script makes all of those true for one doctor, preferring an
 * already-active doctor in the target country (minimal blast radius on a
 * snapshot DB) over the seed-test-accounts.ts DOCTOR_EMAIL account, which is
 * deliberately created with active:false to stay off the public roster —
 * only used here as a last resort, with a loud warning, since flipping it
 * active makes it publicly bookable in whatever environment this runs against.
 *
 * Idempotent. Refuses to run against a production-looking database (same
 * guard as seed-test-accounts.ts).
 *
 *   pnpm --filter backend exec tsx scripts/seed-loadtest-gp-availability.ts [--dry]
 *   LOADTEST_SEED_COUNTRY=ie LOADTEST_SEED_SERVICE_SLUG=acute-medical-consultation \
 *     pnpm --filter backend exec tsx scripts/seed-loadtest-gp-availability.ts
 */
import "dotenv/config";
import { prisma, disconnectDb } from "../src/db/prisma.js";
import { resolveGpSameDayService } from "../src/modules/gp-booking/gp-config.service.js";
import { ensureSlotsForRange } from "../src/modules/doctor-availability/doctor-availability.service.js";

const PROD_DB_HOST_PATTERNS = [/rlwy\.net/i, /railway\.internal/i, /\.proxy\./i];

function assertNotProductionDatabase(): void {
  if (process.env.FORCE_SEED === "true") return;
  const url = process.env.DATABASE_URL ?? "";
  if (PROD_DB_HOST_PATTERNS.some((pattern) => pattern.test(url))) {
    throw new Error(
      "seed-loadtest-gp-availability refuses to run: DATABASE_URL points at a production-looking " +
        "host. Set FORCE_SEED=true only if you are certain this is the load-test database.",
    );
  }
}

const DRY_RUN = process.argv.includes("--dry");
const COUNTRY_CODE = (process.env.LOADTEST_SEED_COUNTRY ?? "ie").trim().toLowerCase();
const SAMPLE_SERVICE_SLUG = process.env.LOADTEST_SEED_SERVICE_SLUG ?? "acute-medical-consultation";
// Matches the hardcoded `language: "EN"` in loadtest/scenarios/booking-journey.js.
const REQUIRED_LANGUAGE = "EN";
const FALLBACK_DOCTOR_EMAIL = "doctor@globalhealthonline.com";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "seed-loadtest-gp-availability refuses to run with NODE_ENV=production.",
    );
  }
  assertNotProductionDatabase();

  const country = await prisma.country.findUnique({ where: { code: COUNTRY_CODE } });
  if (!country) {
    throw new Error(
      `Country "${COUNTRY_CODE}" does not exist in this database — run scripts/seed-test-accounts.ts ` +
        "first (it creates a base country on a fresh DB), or set LOADTEST_SEED_COUNTRY.",
    );
  }
  if (!country.isActive) {
    throw new Error(`Country "${COUNTRY_CODE}" exists but isActive=false — gp-assign requires it active.`);
  }

  const gpService = await resolveGpSameDayService(COUNTRY_CODE);
  if (!gpService) {
    throw new Error(
      `resolveGpSameDayService("${COUNTRY_CODE}") returned null — no active GENERAL service exists for ` +
        "this country at all, so gp-assign can never succeed regardless of doctor setup. Create one first.",
    );
  }

  const sampleService = await prisma.service.findFirst({
    where: { slug: SAMPLE_SERVICE_SLUG, country: { code: COUNTRY_CODE } },
    select: { id: true, name: true },
  });
  const serviceIds = [gpService.id];
  if (sampleService && sampleService.id !== gpService.id) {
    console.warn(
      `[seed] gp-assign resolves "${gpService.name}" (${gpService.id}), but the load-test scenario reads ` +
        `availability from "${SAMPLE_SERVICE_SLUG}" (${sampleService.id}) — different services. Assigning ` +
        "the doctor to both so the scenario works regardless of which one gp-assign actually uses.",
    );
    serviceIds.push(sampleService.id);
  } else if (!sampleService) {
    console.warn(
      `[seed] No service with slug "${SAMPLE_SERVICE_SLUG}" found for ${COUNTRY_CODE} — the load-test ` +
        "scenario's availability read will fail independently of gp-assign. Check targets.json.",
    );
  }

  let doctor = await prisma.doctor.findFirst({
    where: { active: true, country: { code: COUNTRY_CODE, isActive: true } },
    select: { id: true, fullName: true, languages: true },
  });
  let usedFallback = false;

  if (!doctor) {
    const fallback = await prisma.doctor.findFirst({
      where: { user: { email: FALLBACK_DOCTOR_EMAIL } },
      select: { id: true, fullName: true, languages: true, active: true },
    });
    if (!fallback) {
      throw new Error(
        `No active doctor exists for "${COUNTRY_CODE}", and the fallback account (${FALLBACK_DOCTOR_EMAIL}) ` +
          "doesn't exist either — run scripts/seed-test-accounts.ts first.",
      );
    }
    doctor = fallback;
    usedFallback = true;
    console.warn(
      `[seed] No active doctor found for "${COUNTRY_CODE}" — falling back to ${FALLBACK_DOCTOR_EMAIL} ` +
        `(currently active=${fallback.active}). This WILL make that doctor publicly bookable in this ` +
        "environment. Only intended for a disposable load-test database.",
    );
  }

  console.log(
    `[seed] Target doctor: ${doctor.fullName} (${doctor.id})${usedFallback ? " [fallback account]" : ""}`,
  );

  const languages = new Set(doctor.languages.map((l) => l.trim()));
  const needsLanguage = !languages.has(REQUIRED_LANGUAGE);
  languages.add(REQUIRED_LANGUAGE);

  const existingAssignments = await prisma.serviceDoctor.findMany({
    where: { doctorId: doctor.id, serviceId: { in: serviceIds } },
    select: { serviceId: true, isActive: true, status: true },
  });
  const missingAssignments = serviceIds.filter(
    (id) => !existingAssignments.some((a) => a.serviceId === id && a.isActive && a.status === "active"),
  );

  const existingAvailability = await prisma.doctorAvailability.count({
    where: { doctorId: doctor.id, isActive: true },
  });

  console.log(
    `[seed] Plan: active=true${needsLanguage ? `, add language "${REQUIRED_LANGUAGE}"` : ""}, ` +
      `${missingAssignments.length} service assignment(s) to add, ` +
      `${existingAvailability > 0 ? "availability already exists" : "add 7-day wide-open availability"}, ` +
      "then materialize the next 7 days of slots.",
  );

  if (DRY_RUN) {
    console.log("[seed] --dry: no changes made.");
    return;
  }

  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { active: true, languages: Array.from(languages) },
  });

  for (const serviceId of missingAssignments) {
    await prisma.serviceDoctor.upsert({
      where: { serviceId_doctorId: { serviceId, doctorId: doctor.id } },
      update: { isActive: true, status: "active" },
      create: { serviceId, doctorId: doctor.id, isActive: true, status: "active" },
    });
  }

  if (existingAvailability === 0) {
    // Wide-open recurring window every day — a load test needs slots to
    // exist, not realistic doctor hours.
    await prisma.doctorAvailability.createMany({
      data: Array.from({ length: 7 }, (_, weekday) => ({
        doctorId: doctor.id,
        weekday,
        startMinute: 0,
        endMinute: 24 * 60 - 30,
        slotDurationMinutes: 30,
        isActive: true,
      })),
    });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const result = await ensureSlotsForRange(doctor.id, now, horizon);

  console.log(
    `[seed] Done. Doctor ${doctor.id} is now eligible for gp-assign in ${COUNTRY_CODE} ` +
      `(services: ${serviceIds.join(", ")}). Materialized ${result.created} new slot(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
