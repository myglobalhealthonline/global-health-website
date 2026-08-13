/**
 * Booking-consent promotion sweep (guest AND logged-in).
 *
 * Root cause #1 (guest): booking captures medical-access consent onto the
 * Appointment row (consentAccepted / crossBorderConsentAccepted /
 * medicalAccessConsentScope) but `promoteAppointmentConsents()` only ever ran
 * for logged-in bookings, so guest bookings never got a PatientConsent row.
 *
 * Root cause #2 (logged-in, found 2026-08-11 investigating GH-2026-001436 /
 * ORD-000298): the post-payment promotion hook
 * (complete-order-payment.service.ts) reads `Order.email`, which is not
 * always lowercased, and passed it into `resolveOrCreatePatientProfile`,
 * whose lookup was case-sensitive — a case mismatch against the already-
 * lowercase PatientProfile.email meant the "existing" check missed, the
 * fallback create() hit the unique constraint on PatientProfile.userId, and
 * the whole promotion threw — silently, into a bare `.catch(() => {})`. Both
 * the lookup (now case-insensitive, in consents.route.ts) and the swallowed
 * catch (now logs + alerts) are fixed at the source; this sweep repairs any
 * appointment — guest or logged-in — that fell through either gap, and
 * covers any future silent miss.
 *
 * For every Appointment with (medicalAccessConsentScope not null OR
 * crossBorderConsentAccepted true) whose patient (by userId when set, else
 * by email) has no `source="BOOKING_FORM"` PatientConsent row yet, call
 * `promoteAppointmentConsents(userId, email)`. That function is idempotent
 * (skips consent types already present with source="BOOKING_FORM"), so
 * re-running this script is always safe.
 *
 * Dry-run by default (prints counts only, writes nothing). Pass --apply to write.
 *
 *   pnpm --filter backend exec tsx scripts/promote-guest-consents.ts            # dry-run
 *   pnpm --filter backend exec tsx scripts/promote-guest-consents.ts --apply    # writes
 *
 * Run with --env-file=.env (P1000 gotcha — Prisma needs DATABASE_URL loaded
 * explicitly outside a few entrypoints). Run on Dev DB first, verify counts,
 * then owner runs on Production.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { promoteAppointmentConsents } from "../src/modules/consents/promote-appointment-consents.js";

const BATCH_SIZE = 200;

const APPLY = process.argv.includes("--apply");

async function main() {
  const consentedAppointments = await prisma.appointment.findMany({
    where: {
      OR: [
        { medicalAccessConsentScope: { not: null } },
        { crossBorderConsentAccepted: true },
      ],
    },
    distinct: ["userId", "email"],
    select: { userId: true, email: true },
  });

  // One target per distinct (userId ?? email) identity — a logged-in patient
  // may have booked several appointments under the same userId.
  const targets = new Map<string, { userId: string | null; email: string }>();
  for (const { userId, email } of consentedAppointments) {
    const key = userId ?? `email:${email.toLowerCase()}`;
    if (!targets.has(key)) targets.set(key, { userId, email });
  }

  const totalTargets = targets.size;
  let withProfile = 0;
  let alreadyPromoted = 0; // has a PatientProfile with a BOOKING_FORM consent row already
  let wouldPromote = 0; // has a PatientProfile, no BOOKING_FORM row yet — sweep will insert
  let promoted = 0;
  let failed = 0;

  const entries = [...targets.values()];
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    for (const { userId, email } of batch) {
      const profile = userId
        ? await prisma.patientProfile.findFirst({ where: { userId }, select: { id: true } })
        : await prisma.patientProfile.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true },
          });
      if (!profile) continue;
      withProfile += 1;

      const existing = await prisma.patientConsent.findFirst({
        where: { patientProfileId: profile.id, source: "BOOKING_FORM" },
        select: { id: true },
      });
      if (existing) {
        alreadyPromoted += 1;
        continue;
      }
      wouldPromote += 1;

      if (APPLY) {
        try {
          await promoteAppointmentConsents(userId, email);
          promoted += 1;
        } catch (err) {
          failed += 1;
          console.error(`[promote-guest-consents] failed for userId=${userId} email=${email}:`, err);
        }
      }
    }
  }

  console.log(
    [
      `[promote-guest-consents] mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
      `distinct patients (guest + logged-in) with consent on an appointment=${totalTargets}`,
      `of those, with a PatientProfile=${withProfile}`,
      `already have a BOOKING_FORM consent row=${alreadyPromoted}`,
      `would get new rows=${wouldPromote}`,
      APPLY ? `promoted=${promoted}, failed=${failed}` : `(pass --apply to write)`,
    ].join("\n  "),
  );
}

main()
  .catch((err) => {
    console.error("[promote-guest-consents] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
