-- Historical rows remain version 0 and never enter automation.
ALTER TABLE "ReviewInvite" ADD COLUMN "campaignVersion" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "countryCode" TEXT, ADD COLUMN "recipientKey" TEXT, ADD COLUMN "completedAt" TIMESTAMP(3),
 ADD COLUMN "nextSendAt" TIMESTAMP(3), ADD COLUMN "stoppedAt" TIMESTAMP(3), ADD COLUMN "stopReason" TEXT,
 ADD COLUMN "selectedProvider" TEXT, ADD COLUMN "patientReviewedAt" TIMESTAMP(3), ADD COLUMN "maxFollowups" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "followupIntervalDays" INTEGER NOT NULL DEFAULT 7;
CREATE UNIQUE INDEX "ReviewInvite_new_appointment_key" ON "ReviewInvite"("appointmentId") WHERE "campaignVersion" = 1;
CREATE INDEX "ReviewInvite_campaignVersion_stoppedAt_nextSendAt_idx" ON "ReviewInvite"("campaignVersion","stoppedAt","nextSendAt");
CREATE INDEX "ReviewInvite_recipientKey_completedAt_idx" ON "ReviewInvite"("recipientKey","completedAt");
CREATE TABLE "ReviewDelivery" ("id" TEXT PRIMARY KEY,"inviteId" TEXT NOT NULL REFERENCES "ReviewInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE,"stage" INTEGER NOT NULL,"status" TEXT NOT NULL DEFAULT 'PENDING',"attempts" INTEGER NOT NULL DEFAULT 0,"attemptedAt" TIMESTAMP(3),"sentAt" TIMESTAMP(3),"providerMessageId" TEXT,"error" TEXT);
CREATE UNIQUE INDEX "ReviewDelivery_inviteId_stage_key" ON "ReviewDelivery"("inviteId","stage");
CREATE INDEX "ReviewDelivery_status_attemptedAt_idx" ON "ReviewDelivery"("status","attemptedAt");
CREATE TABLE "ReviewInviteToken" ("tokenHash" TEXT PRIMARY KEY,"inviteId" TEXT NOT NULL REFERENCES "ReviewInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "ReviewSuppression" ("recipientKey" TEXT PRIMARY KEY,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
