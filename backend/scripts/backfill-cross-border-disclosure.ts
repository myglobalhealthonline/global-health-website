/**
 * Backfill the disclosed record onto cross-jurisdiction prescription
 * appointments that were minted before the disclosure copy existed.
 *
 * Requests created before this fix minted an async appointment for the
 * prescribing doctor carrying nothing but a name, an email and a phone number:
 * no date of birth, no booking reason, no address, and none of the referring
 * consultation's attachments. The prescriber's patient chart is scoped to
 * `doctorId = self`, so none of it was reachable any other way.
 *
 * Both copy steps are fill-blanks-only and label-deduplicated, so this is safe
 * to re-run and safe on requests that already went through the fixed path.
 *
 * Usage (from backend/):
 *   node --env-file=.env --import tsx scripts/backfill-cross-border-disclosure.ts --dry-run
 *   node --env-file=.env --import tsx scripts/backfill-cross-border-disclosure.ts
 *   node --env-file=.env --import tsx scripts/backfill-cross-border-disclosure.ts --request <id>
 *
 * Read-only until you drop --dry-run. Sends no email, WhatsApp or webhook.
 */
import { prisma } from "../src/db/prisma.js";
import {
  copyDisclosedDocuments,
  copyDisclosedPatientContext,
} from "../src/modules/cross-border-rx/cross-border-rx-disclosure.service.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const requestIdArg = (() => {
  const i = args.indexOf("--request");
  return i >= 0 ? args[i + 1] : null;
})();

const log = {
  warn: (obj: unknown, msg?: string) => console.warn(msg ?? "", obj),
};

async function main() {
  const requests = await prisma.crossBorderPrescriptionRequest.findMany({
    where: {
      ...(requestIdArg ? { id: requestIdArg } : {}),
      asyncAppointmentId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      patientFullName: true,
      sourceAppointmentId: true,
      sourceDoctorId: true,
      targetDoctorId: true,
      asyncAppointmentId: true,
    },
  });

  console.log(
    `${requests.length} cross-border request(s) with an async appointment${dryRun ? " (dry run)" : ""}`,
  );

  for (const request of requests) {
    const asyncAppointmentId = request.asyncAppointmentId!;
    const [target, sourceDocs, sourceGenerated, targetDocs] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: asyncAppointmentId },
        select: { dateOfBirth: true, notes: true, addressLine1: true },
      }),
      prisma.appointmentDocument.count({ where: { appointmentId: request.sourceAppointmentId } }),
      prisma.generatedDocument.count({ where: { appointmentId: request.sourceAppointmentId } }),
      prisma.appointmentDocument.count({ where: { appointmentId: asyncAppointmentId } }),
    ]);

    console.log(
      `\n· ${request.patientFullName} — request ${request.id} (${request.status})\n` +
        `  async appointment ${asyncAppointmentId}\n` +
        `  context now: dob=${target?.dateOfBirth ? "yes" : "no"} notes=${target?.notes ? "yes" : "no"} address=${target?.addressLine1 ? "yes" : "no"}\n` +
        `  documents: source ${sourceDocs} upload(s) + ${sourceGenerated} generated → target has ${targetDocs}`,
    );

    if (dryRun) continue;

    await copyDisclosedPatientContext({
      sourceAppointmentId: request.sourceAppointmentId,
      targetAppointmentId: asyncAppointmentId,
      log,
    });
    const docs = await copyDisclosedDocuments({
      sourceAppointmentId: request.sourceAppointmentId,
      targetAppointmentId: asyncAppointmentId,
      targetDoctorId: request.targetDoctorId,
      sourceDoctorId: request.sourceDoctorId,
      log,
    });
    console.log(
      `  → documents copied=${docs.copied} skipped=${docs.skipped} failed=${docs.failed}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
