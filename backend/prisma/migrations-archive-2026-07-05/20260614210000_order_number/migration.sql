-- Sequential human-facing order numbers (ORD-000001, ORD-000002, …)

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");

CREATE TABLE IF NOT EXISTS "order_counter" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "last_seq" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "order_counter_pkey" PRIMARY KEY ("id")
);

INSERT INTO "order_counter" ("id", "last_seq")
VALUES (1, 0)
ON CONFLICT ("id") DO NOTHING;
