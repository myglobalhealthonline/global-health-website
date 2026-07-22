/**
 * READ-ONLY diagnostic: paid order with no visible appointment.
 * Usage: node --import tsx scripts/diag-missing-appointment.mjs "Coimbra"
 */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
config({ path: join(root, "..", ".env") });

const needle = process.argv[2] ?? "Coimbra";
const { prisma, disconnectDb } = await import("../src/db/prisma.js");

const orders = await prisma.order.findMany({
  where: {
    OR: [
      { fullName: { contains: needle, mode: "insensitive" } },
      { items: { some: { patientFullName: { contains: needle, mode: "insensitive" } } } },
    ],
  },
  orderBy: { createdAt: "desc" },
  take: 5,
  include: {
    items: true,
    orderAppointments: { include: { appointment: true } },
  },
});

for (const o of orders) {
  console.log("=".repeat(70));
  console.log({
    id: o.id,
    orderNumber: o.orderNumber,
    fullName: o.fullName,
    email: o.email,
    status: o.status,
    paymentStatus: o.paymentStatus,
    countryCode: o.countryCode,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    appointmentIds: o.appointmentIds,
    stripeSessionId: o.stripeSessionId,
    invoiceExpressId: o.invoiceExpressId,
  });
  for (const i of o.items) {
    console.log(" ITEM", {
      id: i.id,
      kind: i.kind,
      name: i.name,
      timeSlotId: i.timeSlotId,
      doctorId: i.doctorId,
      appointmentId: i.appointmentId,
      patient: i.patientFullName,
      serviceId: i.serviceId,
    });
    if (i.timeSlotId) {
      const slot = await prisma.doctorTimeSlot.findUnique({
        where: { id: i.timeSlotId },
        include: { appointment: { select: { id: true, status: true } } },
      });
      console.log("  SLOT", slot && {
        id: slot.id,
        doctorId: slot.doctorId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: slot.status,
        updatedAt: slot.updatedAt,
        appointment: slot.appointment,
      });
      if (slot) {
        const twins = await prisma.doctorTimeSlot.findMany({
          where: { doctorId: slot.doctorId, startAt: slot.startAt },
          include: { appointment: { select: { id: true, status: true } } },
        });
        console.log("  SLOTS AT SAME START", twins.map((t) => ({
          id: t.id, status: t.status, apt: t.appointment?.id ?? null, createdAt: t.createdAt,
        })));
      }
    }
  }
  console.log(" ORDER_APPOINTMENTS", o.orderAppointments.map((oa) => ({
    id: oa.appointment?.id,
    status: oa.appointment?.status,
    scheduledAt: oa.appointment?.scheduledAt,
    doctorId: oa.appointment?.doctorId,
    timeSlotId: oa.appointment?.timeSlotId,
    paymentStatus: oa.appointment?.paymentStatus,
    deletedAt: oa.appointment?.deletedAt ?? undefined,
  })));

  const runs = await prisma.automationRun.findMany({
    where: { orderId: o.id },
    orderBy: { createdAt: "asc" },
    select: {
      automationKey: true, status: true, channel: true, recipient: true,
      summary: true, error: true, scheduledFor: true, executedAt: true, createdAt: true,
    },
  });
  console.log(" AUTOMATION RUNS");
  for (const r of runs) console.log("  ", JSON.stringify(r));
}

// Any appointment matching the name directly (in case it exists but is detached)
const apts = await prisma.appointment.findMany({
  where: { fullName: { contains: needle, mode: "insensitive" } },
  orderBy: { createdAt: "desc" },
  take: 5,
  select: {
    id: true, status: true, scheduledAt: true, doctorId: true, timeSlotId: true,
    paymentStatus: true, createdAt: true, countryCode: true, serviceId: true,
  },
});
console.log("APPOINTMENTS BY NAME", JSON.stringify(apts, null, 2));

await disconnectDb();
