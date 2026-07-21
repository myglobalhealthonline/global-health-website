/**
 * Recover a PAID order whose consultation line never got an Appointment.
 *
 * Cause (insurance orders): checkout commits the reserved slot HELD→BOOKED so
 * it survives the manual card-verification window; the paid-order fulfilment
 * path then only claimed slots in {HELD, OPEN}, so `claim.count === 0` and the
 * mint was skipped. Fixed in complete-order-payment.service.ts — this script
 * repairs the rows written before the fix.
 *
 * Mirrors the appointment-minting block of fulfillPaidOrderFromCheckoutSession
 * field for field. DB writes only — sends no email/WhatsApp/portal automations.
 *
 * Usage:
 *   node --import tsx scripts/recover-missing-appointment.mjs ORD-000177
 *   node --import tsx scripts/recover-missing-appointment.mjs ORD-000177 --apply
 */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
config({ path: join(root, "..", ".env") });

const APPLY = process.argv.includes("--apply");
const ref = process.argv.find((a) => !a.startsWith("--") && a !== process.argv[0] && a !== process.argv[1]);
if (!ref) throw new Error("Pass an order number (ORD-000177) or order id");

const { prisma, disconnectDb } = await import("../src/db/prisma.js");

const order = await prisma.order.findFirst({
  where: ref.startsWith("ORD-") ? { orderNumber: ref } : { id: ref },
  include: { items: true },
});
if (!order) throw new Error(`Order ${ref} not found`);
if (order.paymentStatus !== "PAID") throw new Error(`Order is ${order.paymentStatus}, not PAID — abort`);

const item = order.items.find(
  (i) => i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION",
);
if (!item) throw new Error("No consultation line on the order");
if (item.appointmentId) throw new Error(`Line already linked to ${item.appointmentId} — nothing to do`);
if (!item.timeSlotId || !item.doctorId || !item.serviceId)
  throw new Error("Line missing timeSlotId/doctorId/serviceId");

const slot = await prisma.doctorTimeSlot.findUnique({ where: { id: item.timeSlotId } });
if (!slot) throw new Error(`Slot ${item.timeSlotId} no longer exists — this is the cancel-sweep race, not the insurance bug`);
if (slot.doctorId !== item.doctorId) throw new Error("Slot belongs to a different doctor");
if (!["BOOKED", "HELD", "OPEN"].includes(slot.status)) throw new Error(`Slot is ${slot.status} — abort`);

const existingOnSlot = await prisma.appointment.findUnique({ where: { timeSlotId: slot.id } });
if (existingOnSlot) throw new Error(`Slot already carries appointment ${existingOnSlot.id}`);

console.log(
  "PLAN",
  JSON.stringify(
    {
      orderNumber: order.orderNumber,
      slotId: slot.id,
      slotStatus: slot.status,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      doctorId: item.doctorId,
      serviceId: item.serviceId,
      patient: item.patientFullName ?? order.fullName,
      email: item.patientEmail ?? order.email,
      amountCents: item.unitPriceCents,
      insuranceCompanyId: item.insuranceCompanyId,
      status: "REQUEST_RECEIVED",
    },
    null,
    2,
  ),
);

if (!APPLY) {
  console.log("\nDRY RUN — re-run with --apply to write.");
  await disconnectDb();
  process.exit(0);
}

const gpAssignment = await prisma.gpAssignmentLog.findUnique({
  where: { timeSlotId: slot.id },
  select: { languageCode: true, reason: true },
});

const appointmentId = await prisma.$transaction(
  async (tx) => {
    const claim = await tx.doctorTimeSlot.updateMany({
      where: { id: slot.id, status: { in: ["BOOKED", "HELD", "OPEN"] } },
      data: { status: "BOOKED" },
    });
    if (claim.count === 0) throw new Error("Slot changed state mid-transaction");

    const apt = await tx.appointment.create({
      data: {
        userId: order.userId,
        countryCode: order.countryCode,
        consultationType:
          item.kind === "SPECIALIST_CONSULTATION" ? "specialist" : "general",
        consultationLanguageCode: gpAssignment?.languageCode ?? null,
        assignmentReason: gpAssignment?.reason ?? null,
        fullName: item.patientFullName ?? order.fullName,
        email: item.patientEmail ?? order.email,
        phone: item.patientPhone ?? order.phone,
        dateOfBirth: item.patientDateOfBirth ?? null,
        notes: item.patientNotes ?? null,
        consentAccepted: true,
        status: "REQUEST_RECEIVED",
        serviceId: item.serviceId,
        doctorId: item.doctorId,
        timeSlotId: slot.id,
        scheduledAt: slot.startAt,
        amountCents: item.unitPriceCents,
        currencyCode: order.currencyCode,
        paymentStatus: "PAID",
        // The real payment moment, not the recovery moment.
        paidAt: order.paidAt,
        consultationMode: "ONLINE",
        patientTimezone: item.patientTimezone,
        addressLine1: item.patientAddressLine1,
        addressLine2: item.patientAddressLine2,
        addressCity: item.patientAddressCity,
        addressPostalCode: item.patientAddressPostalCode,
        addressCountryCode: item.patientAddressCountryCode,
        gdprConsentClinic: item.patientGdprConsentClinic,
        gdprConsentPlatform: item.patientGdprConsentPlatform,
        gdprConsentedAt: item.patientGdprConsentedAt,
        whatsappConsent: item.patientWhatsappConsent,
        crossBorderConsentAccepted: item.patientCrossBorderConsentAccepted,
        medicalAccessConsentScope: item.patientMedicalAccessConsentScope ?? "DIRECT",
        insuranceCompanyId: item.insuranceCompanyId,
        insurancePolicyNumber: item.insurancePolicyNumber,
      },
    });

    await tx.orderItem.update({ where: { id: item.id }, data: { appointmentId: apt.id } });
    await tx.order.update({
      where: { id: order.id },
      data: { appointmentIds: [...order.appointmentIds, apt.id] },
    });
    await tx.orderAppointment.createMany({
      data: [{ orderId: order.id, appointmentId: apt.id }],
      skipDuplicates: true,
    });
    await tx.automationRun.create({
      data: {
        automationKey: "manual_recovery_missing_appointment",
        orderId: order.id,
        appointmentId: apt.id,
        status: "SUCCESS",
        summary:
          "Appointment re-minted by hand — insurance checkout had already committed the slot to BOOKED, so paid-order fulfilment (HELD/OPEN only) skipped the mint.",
        executedAt: new Date(),
      },
    });

    return apt.id;
  },
  { maxWait: 10_000, timeout: 30_000 },
);

console.log("CREATED APPOINTMENT", appointmentId);
await disconnectDb();
