/**
 * One-off recovery for ORD-000182 (cmrv6fwrk0l4q01qx7hd43nuh).
 *
 * The pre-payment cancel sweep fired 1.4s before the Stripe webhook landed:
 * the held slot was released back to the base grid, so the paid-order
 * fulfilment path found no HELD/OPEN slot to claim and skipped minting the
 * Appointment ("Slot already claimed by someone else"). The order is PAID, the
 * invoice is issued, the doctor has since performed the consultation — but no
 * Appointment row exists, so it is invisible in the appointments section.
 *
 * This mirrors the appointment-minting block of
 * fulfillPaidOrderFromCheckoutSession (complete-order-payment.service.ts) field
 * for field, using the replacement base-grid slot that occupies the original
 * reservation's exact start/end. DB writes only — no automation sends.
 *
 * Usage:
 *   node --import tsx scripts/recover-order-182-appointment.mjs          # dry run
 *   node --import tsx scripts/recover-order-182-appointment.mjs --apply  # write
 */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
config({ path: join(root, "..", ".env") });

const APPLY = process.argv.includes("--apply");
const ORDER_ID = "cmrv6fwrk0l4q01qx7hd43nuh";
const SLOT_ID = "cmrv6gba40l4v01qx0u3q3oj4";

const { prisma, disconnectDb } = await import("../src/db/prisma.js");

const order = await prisma.order.findUnique({
  where: { id: ORDER_ID },
  include: { items: true },
});
if (!order) throw new Error(`Order ${ORDER_ID} not found`);
if (order.paymentStatus !== "PAID") throw new Error("Order is not PAID — abort");

const item = order.items.find(
  (i) => i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION",
);
if (!item) throw new Error("No consultation line on the order");
if (item.appointmentId) throw new Error(`Line already linked to ${item.appointmentId} — nothing to do`);
if (!item.doctorId || !item.serviceId) throw new Error("Line missing doctorId/serviceId");

const slot = await prisma.doctorTimeSlot.findUnique({ where: { id: SLOT_ID } });
if (!slot) throw new Error(`Slot ${SLOT_ID} not found`);
if (slot.doctorId !== item.doctorId) throw new Error("Slot belongs to a different doctor");
if (slot.status !== "OPEN") throw new Error(`Slot is ${slot.status}, expected OPEN — abort`);

const existingOnSlot = await prisma.appointment.findUnique({ where: { timeSlotId: SLOT_ID } });
if (existingOnSlot) throw new Error(`Slot already carries appointment ${existingOnSlot.id}`);

const plan = {
  orderNumber: order.orderNumber,
  slotId: SLOT_ID,
  startAt: slot.startAt.toISOString(),
  endAt: slot.endAt.toISOString(),
  doctorId: item.doctorId,
  serviceId: item.serviceId,
  patient: item.patientFullName ?? order.fullName,
  email: item.patientEmail ?? order.email,
  amountCents: item.unitPriceCents,
  status: "REQUEST_RECEIVED",
};
console.log("PLAN", JSON.stringify(plan, null, 2));

if (!APPLY) {
  console.log("\nDRY RUN — re-run with --apply to write.");
  await disconnectDb();
  process.exit(0);
}

const appointmentId = await prisma.$transaction(
  async (tx) => {
    const claim = await tx.doctorTimeSlot.updateMany({
      where: { id: SLOT_ID, status: "OPEN" },
      data: { status: "BOOKED" },
    });
    if (claim.count === 0) throw new Error("Slot was claimed by someone else mid-transaction");

    const apt = await tx.appointment.create({
      data: {
        userId: order.userId,
        countryCode: order.countryCode,
        consultationType:
          item.kind === "SPECIALIST_CONSULTATION" ? "specialist" : "general",
        consultationLanguageCode: null,
        assignmentReason: null,
        fullName: item.patientFullName ?? order.fullName,
        email: item.patientEmail ?? order.email,
        phone: item.patientPhone ?? order.phone,
        dateOfBirth: item.patientDateOfBirth ?? null,
        notes: item.patientNotes ?? null,
        consentAccepted: true,
        status: "REQUEST_RECEIVED",
        serviceId: item.serviceId,
        doctorId: item.doctorId,
        timeSlotId: SLOT_ID,
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

    await tx.orderItem.update({
      where: { id: item.id },
      data: { appointmentId: apt.id },
    });
    await tx.order.update({
      where: { id: ORDER_ID },
      data: { appointmentIds: [apt.id] },
    });
    await tx.orderAppointment.createMany({
      data: [{ orderId: ORDER_ID, appointmentId: apt.id }],
      skipDuplicates: true,
    });

    await tx.automationRun.create({
      data: {
        automationKey: "manual_recovery_missing_appointment",
        orderId: ORDER_ID,
        appointmentId: apt.id,
        status: "SUCCESS",
        summary:
          "Appointment re-minted by hand — cancel sweep released the slot 1.4s before the Stripe webhook, so paid-order fulfilment skipped the mint.",
        executedAt: new Date(),
      },
    });

    return apt.id;
  },
  { maxWait: 10_000, timeout: 30_000 },
);

console.log("CREATED APPOINTMENT", appointmentId);

const verify = await prisma.order.findUnique({
  where: { id: ORDER_ID },
  include: {
    items: { select: { id: true, appointmentId: true } },
    orderAppointments: {
      include: {
        appointment: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            doctorId: true,
            timeSlotId: true,
            paymentStatus: true,
          },
        },
      },
    },
  },
});
console.log(
  "VERIFY",
  JSON.stringify(
    {
      appointmentIds: verify.appointmentIds,
      items: verify.items,
      orderAppointments: verify.orderAppointments.map((oa) => oa.appointment),
    },
    null,
    2,
  ),
);

await disconnectDb();
