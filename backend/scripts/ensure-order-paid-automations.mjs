import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
config({ path: join(root, "..", ".env") });

const orderSuffix = (process.argv[2] ?? "c6jcryvy").toLowerCase();
const resendWhatsApp = process.argv.includes("--resend-whatsapp");
const { prisma } = await import("../src/db/prisma.js");
const { ensureOrderPaidAutomations } = await import(
  "../src/modules/orders/complete-order-payment.service.js"
);
const { post_resendMeetingLinkWhatsApp } = await import(
  "../src/modules/automation/post-payment-flow.service.js"
);

const order = await prisma.order.findFirst({
  where: { id: { endsWith: orderSuffix } },
  select: {
    id: true,
    paymentStatus: true,
    status: true,
    postPaymentStage: true,
    meetingUrl: true,
    email: true,
  },
});

if (!order) {
  console.error(`Order ending in "${orderSuffix}" not found.`);
  process.exit(1);
}

console.log("Before:", order);
if (resendWhatsApp) {
  console.log("Re-sending meeting-link WhatsApp messages…");
  await post_resendMeetingLinkWhatsApp(order.id);
} else {
  await ensureOrderPaidAutomations(order.id, {
    info: (o, m) => console.log("INFO", m ?? "", o),
    warn: (o, m) => console.warn("WARN", m ?? "", o),
    error: (o, m) => console.error("ERROR", m ?? "", o),
  });
}

const after = await prisma.order.findUnique({
  where: { id: order.id },
  select: { paymentStatus: true, status: true, postPaymentStage: true, meetingUrl: true },
});
console.log("After:", after);

const runs = await prisma.automationRun.findMany({
  where: { orderId: order.id },
  orderBy: { createdAt: "desc" },
  take: 8,
  select: { createdAt: true, automationKey: true, channel: true, status: true, summary: true },
});
console.log("Recent automation runs:", runs);
await prisma.$disconnect();
