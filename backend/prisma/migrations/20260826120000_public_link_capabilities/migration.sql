ALTER TABLE "Order"
ADD COLUMN "payAccessNonce" TEXT;

ALTER TABLE "invoices"
ADD COLUMN "publicAccessNonce" TEXT;
