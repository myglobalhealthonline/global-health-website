import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
config({ path: join(root, "..", ".env") });

const orderId = process.argv[2] ?? "cmqdwnkty0004b0w8eo6lsnmq";
const { syncOrderPaymentFromStripe } = await import(
  "../src/modules/orders/complete-order-payment.service.js"
);

const result = await syncOrderPaymentFromStripe(orderId, {
  info: (o, m) => console.log("INFO", m ?? "", o),
  warn: (o, m) => console.warn("WARN", m ?? "", o),
  error: (o, m) => console.error("ERROR", m ?? "", o),
});
console.log("SYNC RESULT:", result);

const { prisma } = await import("../src/db/prisma.js");
const order = await prisma.order.findUnique({ where: { id: orderId } });
console.log("ORDER STATUS:", order?.paymentStatus, order?.postPaymentStage);
await prisma.$disconnect();
