-- SF5 (code review 2026-07-05): patient-upload magic links were a stateless
-- 100-year HMAC-signed token with no server-side record — no expiry that
-- mattered, no revocation. This table backs the link with a short TTL and
-- a revoke flag; only the token's hash is stored.
CREATE TABLE "PatientUploadLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "documentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientUploadLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientUploadLink_tokenHash_key" ON "PatientUploadLink"("tokenHash");

CREATE INDEX "PatientUploadLink_email_appointmentId_idx" ON "PatientUploadLink"("email", "appointmentId");
