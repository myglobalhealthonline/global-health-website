-- CreateEnum
CREATE TYPE "ServiceVisibility" AS ENUM ('PUBLIC', 'CORPORATE_ONLY', 'CORPORATE_REQUEST_ONLY', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "CorporateCompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CorporateEmployeeStatus" AS ENUM ('DRAFT', 'INVITED', 'INVITE_SENT', 'INVITE_FAILED', 'REGISTERED', 'PROFILE_INCOMPLETE', 'PROFILE_COMPLETE', 'PREASSESSMENT_PENDING', 'PREASSESSMENT_BOOKED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "CorporateBeneficiaryStatus" AS ENUM ('INVITED', 'INVITE_SENT', 'INVITE_FAILED', 'REGISTERED', 'PROFILE_INCOMPLETE', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "CorporateInviteType" AS ENUM ('EMPLOYEE', 'BENEFICIARY');

-- CreateEnum
CREATE TYPE "CorporateMemberType" AS ENUM ('EMPLOYEE', 'BENEFICIARY');

-- CreateEnum
CREATE TYPE "CorporateCardStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CorporateRequestType" AS ENUM ('ILLNESS_BENEFIT', 'FIT_FOR_WORK');

-- CreateEnum
CREATE TYPE "CorporateRequestStatus" AS ENUM ('REQUESTED', 'EMPLOYEE_NOTIFIED', 'BOOKED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CORPORATE_REQUEST_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'CORPORATE_MEMBERSHIP';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CORPORATE_ADMIN';

-- NOTE: prisma migrate diff suggested dropping the raw-SQL composite FKs
-- PlanConsultationRule_plan_country_fkey / _service_country_fkey (§36.10);
-- they are intentional and NOT dropped here.

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "corporateCompanyId" TEXT,
ADD COLUMN     "corporateDiscountCents" INTEGER;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "visibility" "ServiceVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "CorporatePlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "annualPricePerEmployeeCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'EUR',
    "maxBeneficiariesPerEmployee" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateBenefitRule" (
    "id" TEXT NOT NULL,
    "corporatePlanId" TEXT NOT NULL,
    "serviceKind" "ServiceKind",
    "serviceId" TEXT,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "appliesToBeneficiaries" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateBenefitRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "CorporateCompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "planId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "preAssessmentDoctorId" TEXT,
    "contractStartAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateEmployee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "employeeCode" TEXT,
    "department" TEXT,
    "jobTitle" TEXT,
    "status" "CorporateEmployeeStatus" NOT NULL DEFAULT 'DRAFT',
    "preAssessmentAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateBeneficiary" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "relationship" TEXT NOT NULL,
    "addressLine1" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "notes" TEXT,
    "status" "CorporateBeneficiaryStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateBeneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateInvite" (
    "id" TEXT NOT NULL,
    "type" "CorporateInviteType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "employeeId" TEXT,
    "beneficiaryId" TEXT,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "whatsappSentAt" TIMESTAMP(3),
    "lastSendError" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateBenefitCard" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "memberType" "CorporateMemberType" NOT NULL,
    "employeeId" TEXT,
    "beneficiaryId" TEXT,
    "status" "CorporateCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateBenefitCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateServiceRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "CorporateRequestType" NOT NULL,
    "serviceId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "CorporateRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "appointmentId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporatePlan_slug_key" ON "CorporatePlan"("slug");

-- CreateIndex
CREATE INDEX "CorporateBenefitRule_corporatePlanId_isActive_idx" ON "CorporateBenefitRule"("corporatePlanId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateCompany_adminUserId_key" ON "CorporateCompany"("adminUserId");

-- CreateIndex
CREATE INDEX "CorporateCompany_countryCode_status_idx" ON "CorporateCompany"("countryCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateEmployee_preAssessmentAppointmentId_key" ON "CorporateEmployee"("preAssessmentAppointmentId");

-- CreateIndex
CREATE INDEX "CorporateEmployee_userId_idx" ON "CorporateEmployee"("userId");

-- CreateIndex
CREATE INDEX "CorporateEmployee_companyId_status_idx" ON "CorporateEmployee"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateEmployee_companyId_email_key" ON "CorporateEmployee"("companyId", "email");

-- CreateIndex
CREATE INDEX "CorporateBeneficiary_userId_idx" ON "CorporateBeneficiary"("userId");

-- CreateIndex
CREATE INDEX "CorporateBeneficiary_companyId_status_idx" ON "CorporateBeneficiary"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateBeneficiary_employeeId_email_key" ON "CorporateBeneficiary"("employeeId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateInvite_tokenHash_key" ON "CorporateInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "CorporateInvite_employeeId_idx" ON "CorporateInvite"("employeeId");

-- CreateIndex
CREATE INDEX "CorporateInvite_beneficiaryId_idx" ON "CorporateInvite"("beneficiaryId");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateBenefitCard_cardNumber_key" ON "CorporateBenefitCard"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateBenefitCard_employeeId_key" ON "CorporateBenefitCard"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateBenefitCard_beneficiaryId_key" ON "CorporateBenefitCard"("beneficiaryId");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateServiceRequest_appointmentId_key" ON "CorporateServiceRequest"("appointmentId");

-- CreateIndex
CREATE INDEX "CorporateServiceRequest_companyId_status_idx" ON "CorporateServiceRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "CorporateServiceRequest_employeeId_status_idx" ON "CorporateServiceRequest"("employeeId", "status");

-- AddForeignKey
ALTER TABLE "CorporateBenefitRule" ADD CONSTRAINT "CorporateBenefitRule_corporatePlanId_fkey" FOREIGN KEY ("corporatePlanId") REFERENCES "CorporatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateBenefitRule" ADD CONSTRAINT "CorporateBenefitRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateCompany" ADD CONSTRAINT "CorporateCompany_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CorporatePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateCompany" ADD CONSTRAINT "CorporateCompany_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateCompany" ADD CONSTRAINT "CorporateCompany_preAssessmentDoctorId_fkey" FOREIGN KEY ("preAssessmentDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateEmployee" ADD CONSTRAINT "CorporateEmployee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CorporateCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateEmployee" ADD CONSTRAINT "CorporateEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateEmployee" ADD CONSTRAINT "CorporateEmployee_preAssessmentAppointmentId_fkey" FOREIGN KEY ("preAssessmentAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateBeneficiary" ADD CONSTRAINT "CorporateBeneficiary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CorporateEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateBeneficiary" ADD CONSTRAINT "CorporateBeneficiary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CorporateCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateBeneficiary" ADD CONSTRAINT "CorporateBeneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateInvite" ADD CONSTRAINT "CorporateInvite_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CorporateEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateInvite" ADD CONSTRAINT "CorporateInvite_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "CorporateBeneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateBenefitCard" ADD CONSTRAINT "CorporateBenefitCard_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CorporateEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateBenefitCard" ADD CONSTRAINT "CorporateBenefitCard_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "CorporateBeneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateServiceRequest" ADD CONSTRAINT "CorporateServiceRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CorporateCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateServiceRequest" ADD CONSTRAINT "CorporateServiceRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CorporateEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateServiceRequest" ADD CONSTRAINT "CorporateServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateServiceRequest" ADD CONSTRAINT "CorporateServiceRequest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

