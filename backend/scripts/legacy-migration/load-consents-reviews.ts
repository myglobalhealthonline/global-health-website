/**
 * Phase 2 — load reviewinvites -> ReviewInvite and brazil_consent_submissions
 * -> BrazilConsentSubmission. Run after load-appointments.
 *
 *   DUMP_DIR=... node --import tsx scripts/legacy-migration/load-consents-reviews.ts             # dry
 *   DUMP_DIR=... DRY_RUN=false node --import tsx scripts/legacy-migration/load-consents-reviews.ts
 *
 *   - ReviewInvite stores only the SHA-256 tokenHash (never the raw token);
 *     the appointment is resolved via the legacy orderNumber (kept in
 *     Appointment.legacyExtra). Unmatched -> appointmentId null + logged.
 *   - BrazilConsentSubmission needs an appointment (required FK); an
 *     unresolvable one is logged + skipped.
 *   - Idempotent: both upsert on legacyMongoId.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { prisma } from "../../src/db/prisma.js";
import { requireDumpDir, DRY_RUN, banner } from "./lib/config.js";
import { readCollection, hasCollection } from "./lib/source.js";
import { mapReviewInvite, mapBrazilConsent } from "./lib/mapping.js";
import { Counter, logUnresolved } from "./lib/report.js";

const STAGE = "consents-reviews";

function sha256(v: string): string {
  return createHash("sha256").update(v, "utf8").digest("hex");
}

/** Already-hashed values pass through; raw tokens are hashed. */
function tokenHashFor(raw: string | null, legacyId: string): string {
  if (raw && /^[a-f0-9]{64}$/i.test(raw)) return raw.toLowerCase();
  return sha256(raw ?? `legacy-invite:${legacyId}`);
}

async function loadReviewInvites(c: Counter) {
  const SOURCE = "reviewinvites";
  if (!hasCollection(SOURCE)) return;

  for await (const doc of readCollection(SOURCE)) {
    c.bump("review-read");
    const m = mapReviewInvite(doc);
    if (!m.legacyMongoId) {
      await logUnresolved({ stage: STAGE, sourceColl: SOURCE, reason: "no _id" });
      continue;
    }

    let appointmentId: string | null = null;
    if (m.orderNumber) {
      const appt = await prisma.appointment.findFirst({
        where: { legacyExtra: { path: ["orderNumber"], equals: m.orderNumber } },
        select: { id: true },
      });
      appointmentId = appt?.id ?? null;
      if (!appointmentId) {
        await logUnresolved({
          stage: STAGE,
          sourceColl: SOURCE,
          legacyId: m.legacyMongoId,
          columnName: "appointmentId",
          legacyValue: m.orderNumber,
          reason: "orderNumber matched no appointment — appointmentId left null",
        });
      }
    }

    const tokenHash = tokenHashFor(m.rawToken, m.legacyMongoId);
    const expiresAt = m.expiresAt ?? m.submittedAt ?? new Date();

    if (DRY_RUN) {
      console.log(
        `  [dry] review ${m.legacyMongoId} order=${m.orderNumber ?? "-"} ` +
          `appt=${appointmentId ?? "-"} submitted=${!!m.submittedAt}`,
      );
      c.bump("review-would-write");
      continue;
    }

    await prisma.reviewInvite.upsert({
      where: { legacyMongoId: m.legacyMongoId },
      update: { appointmentId, submittedAt: m.submittedAt, ...m.ratings },
      create: {
        legacyMongoId: m.legacyMongoId,
        tokenHash,
        appointmentId,
        orderNumber: m.orderNumber,
        customerName: m.customerName,
        serviceName: m.serviceName,
        doctorName: m.doctorName,
        contactEmail: m.contactEmail,
        contactPhone: m.contactPhone,
        localeCode: m.localeCode,
        expiresAt,
        submittedAt: m.submittedAt,
        ...m.ratings,
      },
    });
    c.bump("review-written");
  }
}

async function loadBrazilConsents(c: Counter) {
  const SOURCE = "brazil_consent_submissions";
  if (!hasCollection(SOURCE)) return;

  for await (const doc of readCollection(SOURCE)) {
    c.bump("consent-read");
    const m = mapBrazilConsent(doc);
    if (!m.legacyMongoId) {
      await logUnresolved({ stage: STAGE, sourceColl: SOURCE, reason: "no _id" });
      continue;
    }

    // appointmentId is a REQUIRED FK — resolve or skip.
    const appt = m.legacyAppointmentId
      ? await prisma.appointment.findUnique({
          where: { legacyMongoId: m.legacyAppointmentId },
          select: { id: true },
        })
      : null;
    if (!appt) {
      await logUnresolved({
        stage: STAGE,
        sourceColl: SOURCE,
        legacyId: m.legacyMongoId,
        columnName: "appointmentId",
        legacyValue: m.legacyAppointmentId,
        reason: "consent's appointment did not resolve — skipped (FK required)",
      });
      c.bump("consent-skipped");
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [dry] consent ${m.legacyMongoId} appt=${appt.id} pay=${m.paymentStatus}`);
      c.bump("consent-would-write");
      continue;
    }

    await prisma.brazilConsentSubmission.upsert({
      where: { legacyMongoId: m.legacyMongoId },
      update: { paymentStatus: m.paymentStatus, paidAt: m.paidAt },
      create: {
        legacyMongoId: m.legacyMongoId,
        appointmentId: appt.id,
        fullName: m.fullName,
        dob: m.dob,
        address: m.address,
        email: m.email,
        phone: m.phone,
        pharmacy: m.pharmacy,
        message: m.message,
        gdprConsent: m.gdprConsent,
        stripeSessionId: m.stripeSessionId,
        paymentStatus: m.paymentStatus,
        paidAt: m.paidAt,
      },
    });
    c.bump("consent-written");
  }
}

async function main() {
  requireDumpDir();
  banner(STAGE);
  const c = new Counter();
  await loadReviewInvites(c);
  await loadBrazilConsents(c);
  console.log(`\n${STAGE} done: ${c.summary()}`);
}

main()
  .catch((err) => {
    console.error(`${STAGE} failed:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
