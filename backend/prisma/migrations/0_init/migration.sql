-- Baseline migration (B2, code review 2026-07-05). Replaces the 61-file
-- migration history that could not rebuild a database from scratch — 30+
-- tables (CartItem, Order, Payment, Setting, ...) were only ever created via
-- out-of-band drift on the live DB, never via a CREATE TABLE migration, so
-- `prisma migrate dev`'s shadow-DB replay failed at the first ALTER TABLE
-- referencing a table nothing before it had created.
--
-- This single file is the full current schema, generated with:
--   prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
--
-- It was marked applied (not executed) against the live DB with
-- `prisma migrate resolve --applied 0_init`, since the live DB already has
-- this schema. The old migration files are preserved for history at
-- prisma/migrations-archive-2026-07-05/ (not read by Prisma).
--
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LocaleCode" AS ENUM ('EN', 'PT', 'ES', 'CS', 'RO', 'DE');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('IMAGE', 'ICON', 'LOGO', 'BADGE', 'SOCIAL');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('GENERAL', 'SPECIALIST', 'PRESCRIPTION', 'HEALTH_TEST', 'HOME_DELIVERY');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'ADMIN', 'DOCTOR', 'LOCAL_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PageKey" AS ENUM ('HOME', 'GENERAL_CONSULTATION', 'SPECIALIST_CONSULTATION', 'DOCTORS_INDEX', 'PRESCRIPTIONS', 'HEALTH_TESTS');

-- CreateEnum
CREATE TYPE "DoctorSlotStatus" AS ENUM ('OPEN', 'HELD', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('DRAFT', 'SIGNED');

-- CreateEnum
CREATE TYPE "InternalMessageAuthorRole" AS ENUM ('DOCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_ASSIGNED', 'APPOINTMENT_STATUS_CHANGED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_FOLLOWUP_BOOKED', 'APPOINTMENT_REMINDER', 'INTERNAL_MESSAGE', 'CONSULT_SIGNED', 'EXAM_LOGGED', 'EXAM_REQUESTED', 'FORM_SUBMITTED', 'DOCUMENT_UPLOADED', 'SUBSCRIPTION_CONFIRMED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_RENEWAL_REMINDER', 'SUBSCRIPTION_PERK_UNLOCKED', 'WELLNESS_CREDITS_EARNED', 'KIT_REDEMPTION_CONFIRMED', 'PATIENT_MESSAGE', 'MESSAGE_REPLY');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('REQUESTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ShareLinkScope" AS ENUM ('CONSULTATION', 'PATIENT_UPLOAD');

-- CreateEnum
CREATE TYPE "GeneratedDocumentType" AS ENUM ('ABSENCE_CERTIFICATE', 'EXAMS_PRESCRIPTION', 'PRESCRIPTION', 'OTHER', 'CUSTOM_CERTIFICATE');

-- CreateEnum
CREATE TYPE "BrazilConsentPaymentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "ConsultationMode" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CONSULT_SAVED', 'CONSULT_SIGNED', 'EXAM_LOGGED', 'EXAM_DELETED', 'INTERNAL_MESSAGE_POSTED', 'SHARE_LINK_CREATED', 'SHARE_LINK_REVOKED', 'FORM_SUBMITTED', 'CONSULT_SERVICE_ADDED', 'CONSULT_SERVICE_REMOVED', 'APPOINTMENT_STATUS_CHANGED', 'APPOINTMENT_RESCHEDULED', 'FOLLOW_UP_CREATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED', 'DOCTOR_INVITED', 'DOCTOR_CREATED', 'DOCTOR_UPDATED', 'DOCTOR_DEACTIVATED', 'DOCTOR_PURGED', 'DOCTOR_PHOTO_UPDATED', 'DOCTOR_PHOTO_REMOVED', 'DOCTOR_BANK_VIEWED', 'APPOINTMENT_CREATED', 'APPOINTMENT_PAYMENT_UPDATED', 'TIMESLOT_RELEASED', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PATIENT_ALERT_UPDATED', 'MEET_LINK_GENERATED', 'COUNTRY_FOOTER_UPDATED', 'GP_SETTINGS_UPDATED', 'USER_UPDATED', 'USER_ROLE_CHANGED', 'USER_PASSWORD_RESET', 'PATIENT_PROFILE_UPDATED', 'ENTITY_PURGED', 'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED', 'TWO_FACTOR_VERIFIED', 'TWO_FACTOR_FAILED', 'ACCOUNT_LOCKED', 'CONSENT_UPDATED', 'MEDICAL_ACCESS_CONSENT_CHANGED', 'ID_VERIFICATION_SUBMITTED', 'ID_VERIFICATION_UPDATED', 'MEDICAL_ACCESS_REQUEST_CREATED', 'MEDICAL_ACCESS_REQUEST_APPROVED', 'MEDICAL_ACCESS_REQUEST_DENIED', 'MEDICAL_ACCESS_GRANT_EXPIRED', 'CONFIDENTIALITY_AGREEMENT_ACCEPTED', 'SECURITY_ALERT_CREATED', 'SECURITY_ALERT_RESOLVED', 'DATA_DELETION_REQUESTED', 'DATA_DELETION_REVIEWED', 'PATIENT_MERGED', 'PATIENT_ANONYMIZED', 'CONTACT_CHANGE_REQUESTED', 'CONTACT_CHANGE_CONFIRMED', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_REFUNDED', 'PLAN_CREATED', 'PLAN_UPDATED', 'PLAN_DEACTIVATED', 'PLAN_REORDERED', 'PLAN_CONSULTATION_RULE_SET', 'PERK_RULE_SET', 'PERK_UNLOCKED', 'PERK_MANUALLY_APPROVED', 'CONSULTATION_CREDIT_GRANTED', 'CONSULTATION_CREDIT_CONSUMED', 'CONSULTATION_CREDIT_CLAWED_BACK', 'WELLNESS_CREDIT_EARNED', 'WELLNESS_CREDIT_REDEEMED', 'WELLNESS_CREDIT_CLAWED_BACK', 'HEALTH_TEST_REDEEMED');

-- CreateEnum
CREATE TYPE "CountryAccessModel" AS ENUM ('CLINIC', 'PLATFORM');

-- CreateEnum
CREATE TYPE "AdminScope" AS ENUM ('LOCAL', 'GLOBAL', 'SUPER');

-- CreateEnum
CREATE TYPE "MedicalAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SecurityAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SecurityAlertStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "DataDeletionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'PARTIALLY_COMPLETED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ServiceLinkType" AS ENUM ('UPGRADE', 'ENTRY', 'REFERRAL', 'COMPLEMENTARY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_VERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUEST_RECEIVED', 'UNDER_REVIEW', 'CONTACTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MessageAuthorRole" AS ENUM ('PATIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ChatAuthorRole" AS ENUM ('PATIENT', 'DOCTOR');

-- CreateEnum
CREATE TYPE "CartItemKind" AS ENUM ('HEALTH_TEST', 'PRESCRIPTION_SERVICE', 'GENERAL_CONSULTATION', 'SPECIALIST_CONSULTATION');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PrePaymentFlow" AS ENUM ('WITHIN_48H', 'OUTSIDE_48H');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BenefitSelection" AS ENUM ('PAY_NORMAL', 'USE_PLAN_CREDIT', 'USE_PLAN_DISCOUNT');

-- CreateEnum
CREATE TYPE "ReviewProvider" AS ENUM ('TRUSTPILOT', 'GOOGLE', 'DOCTIFY', 'INTERNAL');

-- CreateEnum
CREATE TYPE "AuthorityCategory" AS ENUM ('MEDICAL_REGULATOR', 'DOCTOR_REGISTRY', 'HEALTH_AUTHORITY', 'DATA_PROTECTION', 'MEDICINES', 'PROFESSIONAL_BODY', 'CONSUMER_PROTECTION', 'MENTAL_HEALTH', 'COMPLAINTS', 'EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'COOKIE_POLICY', 'GDPR_NOTICE', 'DATA_PROCESSING_AGREEMENT', 'REFUND_POLICY', 'MEDICAL_DISCLAIMER', 'ACCESSIBILITY_STATEMENT');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('ESSENTIAL', 'COMPREHENSIVE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "VatMode" AS ENUM ('EXEMPT', 'STANDARD');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED');

-- CreateEnum
CREATE TYPE "CreditKind" AS ENUM ('CONSULTATION', 'WELLNESS');

-- CreateEnum
CREATE TYPE "PlanDiscountMode" AS ENUM ('NONE', 'PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "ConsultationLedgerReason" AS ENUM ('MONTHLY_GRANT', 'RESET_EXPIRE', 'RESERVED', 'CONSUMED', 'RELEASED', 'ADJUSTMENT', 'CLAWBACK');

-- CreateEnum
CREATE TYPE "WellnessLedgerReason" AS ENUM ('MONTHLY_EARN', 'RESERVED', 'REDEEMED', 'RELEASED', 'ADJUSTMENT', 'CLAWBACK');

-- CreateEnum
CREATE TYPE "PerkKey" AS ENUM ('SPECIALIST_DISCOUNT', 'FAMILY_USAGE', 'WELLNESS_REDEMPTION', 'TEST_KIT_REDEMPTION', 'HIGHER_DISCOUNT_TIER');

-- CreateEnum
CREATE TYPE "PerkUnlockMode" AS ENUM ('MONTH_1', 'AFTER_PAID_MONTHS', 'MANUAL_APPROVAL', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "PerkGrantStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'AUTO');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'FULFILLED', 'CANCELED');

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legacyHomePath" TEXT NOT NULL,
    "teamPath" TEXT NOT NULL,
    "generalConsultationPath" TEXT NOT NULL,
    "specialistConsultationPath" TEXT NOT NULL,
    "defaultLocale" "LocaleCode" NOT NULL DEFAULT 'EN',
    "currencyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enabledFeatures" TEXT[] DEFAULT ARRAY['country-home', 'country-content', 'pages', 'footer', 'services', 'general-consultations', 'specialist-consultations', 'online-prescriptions', 'health-tests', 'appointments']::TEXT[],
    "accessModel" "CountryAccessModel" NOT NULL DEFAULT 'PLATFORM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryLocale" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CountryLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryDomain" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CountryDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "medicalRegistrationUrl" TEXT,
    "qualifications" TEXT[],
    "whatsappNumber" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "languages" TEXT[],
    "editorialChecklist" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canCreateManualAppointments" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorBankAccount" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "accountHolder" TEXT,
    "ibanEncrypted" TEXT,
    "ibanLast4" TEXT,
    "bic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorCredential" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "countryCode" TEXT,
    "label" TEXT NOT NULL,
    "bodyName" TEXT NOT NULL,
    "bodyUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorTranslation" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorMarketTranslation" (
    "id" TEXT NOT NULL,
    "doctorCountryId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorMarketTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorFaq" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorMarketBankAccount" (
    "id" TEXT NOT NULL,
    "doctorCountryId" TEXT NOT NULL,
    "accountHolder" TEXT,
    "ibanEncrypted" TEXT,
    "ibanLast4" TEXT,
    "bic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorMarketBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorAvailability" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorTimeSlot" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "DoctorSlotStatus" NOT NULL DEFAULT 'OPEN',
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorCountry" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "chamberEntity" TEXT,
    "registrationNumber" TEXT,
    "division" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cardSummary" TEXT,
    "cardThemeColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialtyTranslation" (
    "id" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "cardSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialtyTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorSpecialty" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,

    CONSTRAINT "DoctorSpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "kind" "ServiceKind" NOT NULL DEFAULT 'GENERAL',
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "heroTitle" TEXT,
    "heroDescription" TEXT,
    "detailBody" TEXT,
    "ctaLabel" TEXT,
    "legacyPath" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER,
    "basePriceCents" INTEGER,
    "currencyCode" TEXT,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "editorialChecklist" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "galleryImagePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consultationSetting" JSONB,
    "bookingSetting" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLink" (
    "id" TEXT NOT NULL,
    "sourceServiceId" TEXT NOT NULL,
    "targetServiceId" TEXT,
    "targetHref" TEXT,
    "type" "ServiceLinkType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "anchorSlot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLinkTranslation" (
    "id" TEXT NOT NULL,
    "serviceLinkId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT,
    "ctaLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceLinkTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoLandingPage" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoLandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoLandingPageTranslation" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "bodyHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoLandingPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePeakPricing" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "peakStartMinute" INTEGER,
    "peakEndMinute" INTEGER,
    "peakPriceCents" INTEGER NOT NULL,
    "offPeakPriceCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePeakPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePeakWindow" (
    "id" TEXT NOT NULL,
    "pricingId" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePeakWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTranslation" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "heroTitle" TEXT,
    "heroDescription" TEXT,
    "detailBody" TEXT,
    "ctaLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDoctor" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "selectedBy" TEXT NOT NULL DEFAULT 'admin',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDoctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL DEFAULT 'COMPREHENSIVE',
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "monthlyPriceCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "badgeLabel" TEXT,
    "notesTerms" TEXT,
    "monthlyConsultationCredits" INTEGER NOT NULL DEFAULT 0,
    "wellnessCreditsPerMonth" INTEGER NOT NULL DEFAULT 0,
    "familyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "benefitsUnlockAfterPaidMonths" INTEGER NOT NULL DEFAULT 2,
    "vatMode" "VatMode" NOT NULL DEFAULT 'EXEMPT',
    "vatRatePct" DOUBLE PRECISION,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthTest" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "priceCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL,
    "productImagePath" TEXT NOT NULL,
    "galleryImagePaths" TEXT[],
    "sampleType" TEXT,
    "resultsTimeline" TEXT,
    "heroButtonLabel" TEXT,
    "detailIntro" TEXT,
    "whatThisTestCovers" TEXT[],
    "whyGetTested" TEXT[],
    "extraSections" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "legacyPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthTestTranslation" (
    "id" TEXT NOT NULL,
    "healthTestId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "sampleType" TEXT,
    "resultsTimeline" TEXT,
    "heroButtonLabel" TEXT,
    "detailIntro" TEXT,
    "whatThisTestCovers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whyGetTested" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extraSections" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthTestTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "countryId" TEXT,
    "doctorId" TEXT,
    "specialtyId" TEXT,
    "serviceId" TEXT,
    "kind" "AssetKind" NOT NULL,
    "key" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "altText" TEXT,
    "title" TEXT,
    "caption" TEXT,
    "description" TEXT,
    "usageNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "assetId" TEXT,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "assetId" TEXT,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "type" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationSetting" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "enableGeneral" BOOLEAN NOT NULL DEFAULT true,
    "enableSpecialist" BOOLEAN NOT NULL DEFAULT true,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 20,
    "leadTimeMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryFooter" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "tagline" TEXT,
    "contactAddress" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactHours" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "twitterUrl" TEXT,
    "youtubeUrl" TEXT,
    "customColumns" JSONB NOT NULL DEFAULT '[]',
    "copyrightLine" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryFooter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSetting" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requirePhone" BOOLEAN NOT NULL DEFAULT true,
    "requireDateOfBirth" BOOLEAN NOT NULL DEFAULT true,
    "requireNationalId" BOOLEAN NOT NULL DEFAULT false,
    "requireAddress" BOOLEAN NOT NULL DEFAULT true,
    "doctorServiceSelfSelectApproval" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "countryCode" TEXT NOT NULL,
    "consultationType" TEXT NOT NULL,
    "consultationLanguageCode" TEXT,
    "assignmentReason" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "notes" TEXT,
    "consentAccepted" BOOLEAN NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUEST_RECEIVED',
    "serviceId" TEXT,
    "healthTestId" TEXT,
    "doctorId" TEXT,
    "timeSlotId" TEXT,
    "followUpFromAppointmentId" TEXT,
    "consultationMode" "ConsultationMode" NOT NULL DEFAULT 'ONLINE',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "amountCents" INTEGER,
    "currencyCode" TEXT,
    "paidAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "meetingUrl" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "doctorReminderSentAt" TIMESTAMP(3),
    "consultationCompletedAt" TIMESTAMP(3),
    "chatReopenedByDoctor" BOOLEAN NOT NULL DEFAULT false,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "notesUploaded" BOOLEAN NOT NULL DEFAULT false,
    "filesUploaded" BOOLEAN NOT NULL DEFAULT false,
    "manualEntry" BOOLEAN NOT NULL DEFAULT false,
    "pharmacy" TEXT,
    "symptoms" TEXT,
    "formResponses" JSONB,
    "clinicId" TEXT,
    "locationAddress" TEXT,
    "patientTimezone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressCity" TEXT,
    "addressPostalCode" TEXT,
    "addressCountryCode" TEXT,
    "gdprConsentClinic" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentPlatform" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "weightKg" DOUBLE PRECISION,
    "heightM" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bloodType" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chronicDiseases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "familyHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialHabits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "surgeries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalNotes" JSONB NOT NULL DEFAULT '[]',
    "nationalIdNumber" TEXT,
    "taxIdNumber" TEXT,
    "passportNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressCity" TEXT,
    "addressPostalCode" TEXT,
    "addressCountryCode" TEXT,
    "preferredPharmacy" TEXT,
    "statusAlert" TEXT,
    "clinicAlert" TEXT,
    "pricingPlanId" TEXT,
    "globalHealthNumber" TEXT,
    "insuranceProviderName" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceDocumentKey" TEXT,
    "insuranceDocumentStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "insuranceAdminNotes" TEXT,
    "idVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "idDocumentKey" TEXT,
    "idDocumentBackKey" TEXT,
    "idDocumentType" TEXT,
    "idDocumentNumber" TEXT,
    "idDocumentIssuingCountry" TEXT,
    "idDocumentExpiryDate" TIMESTAMP(3),
    "idVerificationAdminNotes" TEXT,
    "idVerificationReviewedBy" TEXT,
    "idVerificationReviewedAt" TIMESTAMP(3),
    "phoneVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "phoneVerifiedAt" TIMESTAMP(3),
    "emailVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "emailVerifiedAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "originCountryCode" TEXT,
    "countryFolderCode" TEXT,
    "currentCountryCode" TEXT,
    "medicalAccessConsentLevel" TEXT,
    "emailHash" TEXT,
    "phoneHash" TEXT,
    "nameDobHash" TEXT,
    "idVerificationProvider" TEXT,
    "idVerificationProviderRef" TEXT,
    "idVerificationConfidence" DOUBLE PRECISION,
    "idVerificationRawResult" JSONB,
    "idVerificationWebhookAt" TIMESTAMP(3),
    "isMerged" BOOLEAN NOT NULL DEFAULT false,
    "mergedIntoPatientId" TEXT,
    "mergedAt" TIMESTAMP(3),
    "mergedByAdminId" TEXT,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "documentType" "GeneratedDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sentToPatient" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "prescriptionNumber" INTEGER,
    "uploadToken" TEXT,
    "uploadTokenExpiresAt" TIMESTAMP(3),
    "certificateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalNote" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "consultationType" TEXT,
    "createdByDoctorId" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrazilConsentSubmission" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fullName" TEXT,
    "dob" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "pharmacy" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "gdprConsent" BOOLEAN NOT NULL DEFAULT true,
    "stripeSessionId" TEXT,
    "paymentStatus" "BrazilConsentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrazilConsentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "appointmentId" TEXT,
    "orderNumber" TEXT,
    "customerName" TEXT,
    "serviceName" TEXT,
    "doctorName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "localeCode" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "overallSatisfaction" INTEGER,
    "doctorProfessionalism" INTEGER,
    "communicationClarity" INTEGER,
    "timelinessOfService" INTEGER,
    "valueForMoney" INTEGER,
    "likeliness" INTEGER,
    "bookingExperience" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "countryCode" TEXT,
    "locale" TEXT,
    "source" TEXT,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "authorRole" "MessageAuthorRole" NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "readByPatient" BOOLEAN NOT NULL DEFAULT false,
    "readByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "cookieToken" TEXT,
    "countryCode" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "abandonedEmailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "kind" "CartItemKind" NOT NULL,
    "healthTestId" TEXT,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "timeSlotId" TEXT,
    "doctorId" TEXT,
    "heldUntil" TIMESTAMP(3),
    "patientFullName" TEXT,
    "patientEmail" TEXT,
    "patientPhone" TEXT,
    "patientDateOfBirth" TIMESTAMP(3),
    "patientNotes" TEXT,
    "patientConsentAcceptedAt" TIMESTAMP(3),
    "bookingForOther" BOOLEAN NOT NULL DEFAULT false,
    "benefitSelection" "BenefitSelection" NOT NULL DEFAULT 'PAY_NORMAL',
    "familyMemberId" TEXT,
    "patientNationalIdNumber" TEXT,
    "patientTimezone" TEXT,
    "patientAddressLine1" TEXT,
    "patientAddressLine2" TEXT,
    "patientAddressCity" TEXT,
    "patientAddressPostalCode" TEXT,
    "patientAddressCountryCode" TEXT,
    "patientGdprConsentClinic" BOOLEAN NOT NULL DEFAULT false,
    "patientGdprConsentPlatform" BOOLEAN NOT NULL DEFAULT false,
    "patientGdprConsentedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "countryCode" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeInvoiceId" TEXT,
    "paidAt" TIMESTAMP(3),
    "shipName" TEXT,
    "shipLine1" TEXT,
    "shipLine2" TEXT,
    "shipCity" TEXT,
    "shipPostalCode" TEXT,
    "shipCountryCode" TEXT,
    "appointmentIds" TEXT[],
    "meetingUrl" TEXT,
    "paymentDueAt" TIMESTAMP(3),
    "prePaymentFlow" "PrePaymentFlow",
    "prePaymentReminderStage" INTEGER NOT NULL DEFAULT 0,
    "prePaymentFlowStartedAt" TIMESTAMP(3),
    "postPaymentStage" INTEGER NOT NULL DEFAULT 0,
    "postPaymentFlowStartedAt" TIMESTAMP(3),
    "patientPortalSetPasswordUrl" TEXT,
    "patientPortalTempPassword" TEXT,
    "patientPortalTempPasswordSent" BOOLEAN NOT NULL DEFAULT false,
    "stripeCheckoutUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "automationKey" TEXT NOT NULL,
    "orderId" TEXT,
    "appointmentId" TEXT,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT,
    "recipient" TEXT,
    "summary" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "CartItemKind" NOT NULL,
    "healthTestId" TEXT,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "timeSlotId" TEXT,
    "doctorId" TEXT,
    "appointmentId" TEXT,
    "patientFullName" TEXT,
    "patientEmail" TEXT,
    "patientPhone" TEXT,
    "patientDateOfBirth" TIMESTAMP(3),
    "patientNotes" TEXT,
    "patientConsentAcceptedAt" TIMESTAMP(3),
    "bookingForOther" BOOLEAN NOT NULL DEFAULT false,
    "benefitSelection" "BenefitSelection" NOT NULL DEFAULT 'PAY_NORMAL',
    "familyMemberId" TEXT,
    "patientNationalIdNumber" TEXT,
    "patientTimezone" TEXT,
    "patientAddressLine1" TEXT,
    "patientAddressLine2" TEXT,
    "patientAddressCity" TEXT,
    "patientAddressPostalCode" TEXT,
    "patientAddressCountryCode" TEXT,
    "patientGdprConsentClinic" BOOLEAN NOT NULL DEFAULT false,
    "patientGdprConsentPlatform" BOOLEAN NOT NULL DEFAULT false,
    "patientGdprConsentedAt" TIMESTAMP(3),

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "rawEventType" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "emailVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "doctorId" TEXT,
    "adminScope" "AdminScope",
    "allowedCountryFolders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "twoFactorBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "twoFactorVerifiedAt" TIMESTAMP(3),
    "twoFactorEnabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "isInvite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "countryId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "locale" "LocaleCode" NOT NULL,
    "category" TEXT,
    "authorDisplayName" TEXT,
    "reviewerDisplayName" TEXT,
    "authorDoctorId" TEXT,
    "reviewerDoctorId" TEXT,
    "coverAssetId" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "editorialChecklist" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogTranslation" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "seoTitle" TEXT,
    "seoDesc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPostCountry" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPostCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "countryId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "category" TEXT,
    "placementKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPage" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "pageKey" "PageKey" NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroImageAssetId" TEXT,
    "heroImagePath" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "ogImageAssetId" TEXT,
    "ogImagePath" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "editorialChecklist" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "countryId" TEXT,
    "provider" "ReviewProvider" NOT NULL,
    "externalId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "authorName" TEXT,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "GpAssignmentLog" (
    "id" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpAssignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "durationDays" INTEGER,
    "instructions" TEXT,
    "refills" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'COMPLETED',
    "performedAt" TIMESTAMP(3),
    "notes" TEXT,
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalMessage" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorRole" "InternalMessageAuthorRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationService" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "serviceId" TEXT,
    "customLabel" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER,
    "currencyCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientUserId" TEXT,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "scope" "ShareLinkScope" NOT NULL,
    "consultationId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "countryDetected" TEXT,
    "loginSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentDocument" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sourceGeneratedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationMessage" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "authorRole" "ChatAuthorRole" NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT,
    "storageKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "readByPatient" BOOLEAN NOT NULL DEFAULT false,
    "readByDoctor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceFaq" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthTestFaq" (
    "id" TEXT NOT NULL,
    "healthTestId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthTestFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientNationalityDocument" (
    "id" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "globalHealthNumber" TEXT,
    "slotNumber" INTEGER NOT NULL,
    "nationalityCountry" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT,
    "frontFileKey" TEXT,
    "backFileKey" TEXT,
    "expiryDate" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "adminNotes" TEXT,
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientNationalityDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDocument" (
    "id" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "globalHealthNumber" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedByRole" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "relatedAppointmentId" TEXT,
    "relatedConsultationId" TEXT,
    "visibleToPatient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientConsent" (
    "id" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "globalHealthNumber" TEXT,
    "consentType" TEXT NOT NULL,
    "consentValue" BOOLEAN NOT NULL,
    "consentVersion" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PATIENT_PORTAL',
    "changedByUserId" TEXT,
    "changedByRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalAccessLog" (
    "id" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "globalHealthNumber" TEXT,
    "accessedByUserId" TEXT,
    "accessedByRole" TEXT NOT NULL,
    "accessedByName" TEXT,
    "accessedResourceType" TEXT NOT NULL,
    "accessedResourceId" TEXT,
    "accessAction" TEXT NOT NULL,
    "accessReason" TEXT,
    "relatedAppointmentId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "patientCountryFolder" TEXT,
    "actorCountry" TEXT,
    "consentLevelUsed" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "abnormalReason" TEXT,
    "loginSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentDocument" (
    "id" TEXT NOT NULL,
    "consentKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'EN',
    "bodyText" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorConfidentialityAgreement" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "agreementVersion" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorConfidentialityAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalAccessRequest" (
    "id" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "globalHealthNumber" TEXT,
    "requestingDoctorId" TEXT,
    "requestingUserId" TEXT,
    "requestingDoctorCountry" TEXT,
    "patientOriginCountry" TEXT,
    "requestedAccessScope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "MedicalAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "deniedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "patientResponseIp" TEXT,
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalAccessGrant" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "grantedToUserId" TEXT NOT NULL,
    "grantedToRole" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAlert" (
    "id" TEXT NOT NULL,
    "severity" "SecurityAlertSeverity" NOT NULL,
    "alertType" TEXT NOT NULL,
    "patientId" TEXT,
    "globalHealthNumber" TEXT,
    "actorId" TEXT,
    "actorRole" TEXT,
    "countryFolder" TEXT,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "dedupeKey" TEXT,
    "status" "SecurityAlertStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" TEXT,
    "relatedAccessLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientContactChangeLog" (
    "id" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "globalHealthNumber" TEXT,
    "changedById" TEXT,
    "changedByRole" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientContactChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMergeLog" (
    "id" TEXT NOT NULL,
    "primaryPatientId" TEXT NOT NULL,
    "duplicatePatientId" TEXT NOT NULL,
    "globalHealthNumberPrimary" TEXT,
    "globalHealthNumberDuplicate" TEXT,
    "mergedByAdminId" TEXT,
    "reason" TEXT,
    "primarySnapshot" JSONB,
    "duplicateSnapshot" JSONB,
    "patientInformed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientMergeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryDataPolicy" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "retentionYears" INTEGER NOT NULL DEFAULT 10,
    "storageRegion" TEXT NOT NULL DEFAULT 'EU',
    "requiresLocalStorage" BOOLEAN NOT NULL DEFAULT false,
    "legalNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryDataPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryLegalProfile" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "legalCompanyName" TEXT,
    "legalAddress" TEXT,
    "publicPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publicEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportEmail" TEXT,
    "billingEmail" TEXT,
    "companyRegistrationNumber" TEXT,
    "taxVatNumber" TEXT,
    "medicalRegistrationNumber" TEXT,
    "healthcareLicenseDetails" TEXT,
    "regulatorName" TEXT,
    "regulatorWebsite" TEXT,
    "providerRegistrationLabel" TEXT,
    "providerRegistrationNumber" TEXT,
    "providerRegistrationUrl" TEXT,
    "emergencyNumber" TEXT DEFAULT '112',
    "emergencyNotice" TEXT,
    "nonEmergencyHealthLine" TEXT,
    "companyRegistryUrl" TEXT,
    "medicalRegulatorUrl" TEXT,
    "healthcareAuthorityUrl" TEXT,
    "dataProtectionAuthorityUrl" TEXT,
    "disputeResolutionUrl" TEXT,
    "consumerProtectionUrl" TEXT,
    "dataProtectionLawName" TEXT DEFAULT 'GDPR',
    "dataProtectionPolicyTitle" TEXT,
    "dpoName" TEXT,
    "dpoEmail" TEXT,
    "disputeBodyName" TEXT,
    "disputeEmail" TEXT,
    "disputePhone" TEXT,
    "disputeProcessText" TEXT,
    "legalJurisdictionText" TEXT,
    "consumerRightsText" TEXT,
    "shortDisclaimer" TEXT,
    "fullDisclaimer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryLegalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryDisclaimerTranslation" (
    "id" TEXT NOT NULL,
    "legalProfileId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "shortDisclaimer" TEXT,
    "fullDisclaimer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryDisclaimerTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryAuthorityLink" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "url" TEXT NOT NULL,
    "category" "AuthorityCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "showInFooter" BOOLEAN NOT NULL DEFAULT false,
    "showInSchema" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryAuthorityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryLegalDocument" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "pdfPath" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'en',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryLegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "globalHealthNumber" TEXT,
    "requestStatus" "DataDeletionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "legalReasonForRetention" TEXT,
    "completedAt" TIMESTAMP(3),
    "patientNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ghn_counter" (
    "year" TEXT NOT NULL,
    "last_seq" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "ghn_counter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "order_counter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_counter" (
    "countryCode" TEXT NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_counter_pkey" PRIMARY KEY ("countryCode")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSentAt" TIMESTAMP(3),
    "emailSentTo" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EnsureSchemaPatches" (
    "name" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "_EnsureSchemaPatches_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "PlanTranslation" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "notesTerms" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "PlanTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanConsultationRule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "isIncluded" BOOLEAN NOT NULL DEFAULT false,
    "usesCredits" BOOLEAN NOT NULL DEFAULT false,
    "creditsPerUse" INTEGER NOT NULL DEFAULT 1,
    "discountMode" "PlanDiscountMode" NOT NULL DEFAULT 'NONE',
    "discountPercent" DOUBLE PRECISION,
    "fixedPriceCents" INTEGER,
    "unlockAfterPaidMonths" INTEGER NOT NULL DEFAULT 0,
    "familyUsable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConsultationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPerkRule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "perkKey" "PerkKey" NOT NULL,
    "unlockMode" "PerkUnlockMode" NOT NULL DEFAULT 'MONTH_1',
    "unlockAfterPaidMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPerkRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthTestKitRedemptionRule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "healthTestId" TEXT NOT NULL,
    "requiredWellnessCredits" INTEGER NOT NULL,
    "unlockAfterPaidMonths" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthTestKitRedemptionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientProfileId" TEXT,
    "planId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "paidMonthsCount" INTEGER NOT NULL DEFAULT 0,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pendingPlanId" TEXT,
    "pendingStripePriceId" TEXT,
    "pendingChangeEffectiveAt" TIMESTAMP(3),
    "stripeSubscriptionScheduleId" TEXT,
    "planSnapshot" JSONB,
    "snapshotVersion" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionCreditBalance" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "kind" "CreditKind" NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionCreditBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationCreditLedger" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deltaCredits" INTEGER NOT NULL,
    "reason" "ConsultationLedgerReason" NOT NULL,
    "balanceAfterHint" INTEGER,
    "reservationId" TEXT,
    "orderItemId" TEXT,
    "serviceId" TEXT,
    "appointmentId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "billingPeriodStart" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellnessCreditLedger" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deltaCredits" INTEGER NOT NULL,
    "reason" "WellnessLedgerReason" NOT NULL,
    "balanceAfterHint" INTEGER,
    "reservationId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "healthTestId" TEXT,
    "redemptionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellnessCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPerkGrant" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "perkKey" "PerkKey" NOT NULL,
    "status" "PerkGrantStatus" NOT NULL DEFAULT 'PENDING',
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPerkGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthTestRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "healthTestId" TEXT NOT NULL,
    "orderId" TEXT,
    "wellnessCreditsSpent" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthTestRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "number" TEXT,
    "amountPaidCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3),
    "hostedInvoiceUrl" TEXT,
    "pdfUrl" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanStripePrice" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PlanStripePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "primaryUserId" TEXT NOT NULL,
    "patientProfileId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "relationship" TEXT,
    "canUseCredits" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Country_legacyHomePath_key" ON "Country"("legacyHomePath");

-- CreateIndex
CREATE UNIQUE INDEX "Country_teamPath_key" ON "Country"("teamPath");

-- CreateIndex
CREATE UNIQUE INDEX "Country_generalConsultationPath_key" ON "Country"("generalConsultationPath");

-- CreateIndex
CREATE UNIQUE INDEX "Country_specialistConsultationPath_key" ON "Country"("specialistConsultationPath");

-- CreateIndex
CREATE UNIQUE INDEX "CountryLocale_countryId_locale_key" ON "CountryLocale"("countryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "CountryDomain_domain_key" ON "CountryDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_countryId_slug_key" ON "Clinic"("countryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_countryId_slug_key" ON "Doctor"("countryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorBankAccount_doctorId_key" ON "DoctorBankAccount"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorCredential_doctorId_idx" ON "DoctorCredential"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorTranslation_doctorId_idx" ON "DoctorTranslation"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorTranslation_doctorId_locale_key" ON "DoctorTranslation"("doctorId", "locale");

-- CreateIndex
CREATE INDEX "DoctorMarketTranslation_doctorCountryId_idx" ON "DoctorMarketTranslation"("doctorCountryId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorMarketTranslation_doctorCountryId_locale_key" ON "DoctorMarketTranslation"("doctorCountryId", "locale");

-- CreateIndex
CREATE INDEX "DoctorFaq_doctorId_locale_isActive_idx" ON "DoctorFaq"("doctorId", "locale", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorMarketBankAccount_doctorCountryId_key" ON "DoctorMarketBankAccount"("doctorCountryId");

-- CreateIndex
CREATE INDEX "DoctorAvailability_doctorId_weekday_idx" ON "DoctorAvailability"("doctorId", "weekday");

-- CreateIndex
CREATE INDEX "DoctorTimeSlot_doctorId_startAt_status_idx" ON "DoctorTimeSlot"("doctorId", "startAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorTimeSlot_doctorId_startAt_key" ON "DoctorTimeSlot"("doctorId", "startAt");

-- CreateIndex
CREATE INDEX "DoctorCountry_countryId_active_idx" ON "DoctorCountry"("countryId", "active");

-- CreateIndex
CREATE INDEX "DoctorCountry_countryId_isVerified_idx" ON "DoctorCountry"("countryId", "isVerified");

-- CreateIndex
CREATE INDEX "DoctorCountry_doctorId_idx" ON "DoctorCountry"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorCountry_doctorId_countryId_key" ON "DoctorCountry"("doctorId", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_countryId_slug_key" ON "Specialty"("countryId", "slug");

-- CreateIndex
CREATE INDEX "SpecialtyTranslation_specialtyId_idx" ON "SpecialtyTranslation"("specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialtyTranslation_specialtyId_locale_key" ON "SpecialtyTranslation"("specialtyId", "locale");

-- CreateIndex
CREATE INDEX "DoctorSpecialty_specialtyId_idx" ON "DoctorSpecialty"("specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorSpecialty_doctorId_specialtyId_key" ON "DoctorSpecialty"("doctorId", "specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_countryId_slug_key" ON "Service"("countryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Service_id_countryId_key" ON "Service"("id", "countryId");

-- CreateIndex
CREATE INDEX "ServiceLink_sourceServiceId_isActive_priority_idx" ON "ServiceLink"("sourceServiceId", "isActive", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceLinkTranslation_serviceLinkId_locale_key" ON "ServiceLinkTranslation"("serviceLinkId", "locale");

-- CreateIndex
CREATE INDEX "SeoLandingPage_countryId_isPublished_idx" ON "SeoLandingPage"("countryId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "SeoLandingPage_countryId_slug_key" ON "SeoLandingPage"("countryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SeoLandingPageTranslation_landingPageId_locale_key" ON "SeoLandingPageTranslation"("landingPageId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePeakPricing_serviceId_key" ON "ServicePeakPricing"("serviceId");

-- CreateIndex
CREATE INDEX "ServicePeakWindow_pricingId_idx" ON "ServicePeakWindow"("pricingId");

-- CreateIndex
CREATE INDEX "ServiceTranslation_serviceId_idx" ON "ServiceTranslation"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTranslation_serviceId_locale_key" ON "ServiceTranslation"("serviceId", "locale");

-- CreateIndex
CREATE INDEX "ServiceDoctor_doctorId_isActive_idx" ON "ServiceDoctor"("doctorId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceDoctor_serviceId_isActive_sortOrder_idx" ON "ServiceDoctor"("serviceId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceDoctor_doctorId_status_idx" ON "ServiceDoctor"("doctorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDoctor_serviceId_doctorId_key" ON "ServiceDoctor"("serviceId", "doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlan_countryId_slug_key" ON "PricingPlan"("countryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlan_id_countryId_key" ON "PricingPlan"("id", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthTest_countryId_slug_key" ON "HealthTest"("countryId", "slug");

-- CreateIndex
CREATE INDEX "HealthTestTranslation_healthTestId_idx" ON "HealthTestTranslation"("healthTestId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthTestTranslation_healthTestId_locale_key" ON "HealthTestTranslation"("healthTestId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_kind_key_key" ON "Asset"("kind", "key");

-- CreateIndex
CREATE INDEX "Partner_countryId_active_idx" ON "Partner"("countryId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationSetting_countryId_key" ON "ConsultationSetting"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryFooter_countryId_key" ON "CountryFooter"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSetting_countryId_key" ON "BookingSetting"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_timeSlotId_key" ON "Appointment"("timeSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_stripeSessionId_key" ON "Appointment"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_stripePaymentIntentId_key" ON "Appointment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_idx" ON "Appointment"("clinicId");

-- CreateIndex
CREATE INDEX "Appointment_userId_idx" ON "Appointment"("userId");

-- CreateIndex
CREATE INDEX "Appointment_email_idx" ON "Appointment"("email");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx" ON "Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_status_createdAt_idx" ON "Appointment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_email_key" ON "PatientProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_userId_key" ON "PatientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_globalHealthNumber_key" ON "PatientProfile"("globalHealthNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_stripeCustomerId_key" ON "PatientProfile"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "PatientProfile_pricingPlanId_idx" ON "PatientProfile"("pricingPlanId");

-- CreateIndex
CREATE INDEX "PatientProfile_globalHealthNumber_idx" ON "PatientProfile"("globalHealthNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_certificateId_key" ON "GeneratedDocument"("certificateId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_appointmentId_documentType_idx" ON "GeneratedDocument"("appointmentId", "documentType");

-- CreateIndex
CREATE INDEX "GeneratedDocument_appointmentId_sentToPatient_idx" ON "GeneratedDocument"("appointmentId", "sentToPatient");

-- CreateIndex
CREATE INDEX "MedicalNote_patientEmail_createdAt_idx" ON "MedicalNote"("patientEmail", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalNote_appointmentId_idx" ON "MedicalNote"("appointmentId");

-- CreateIndex
CREATE INDEX "BrazilConsentSubmission_appointmentId_idx" ON "BrazilConsentSubmission"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewInvite_token_key" ON "ReviewInvite"("token");

-- CreateIndex
CREATE INDEX "ReviewInvite_appointmentId_idx" ON "ReviewInvite"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");

-- CreateIndex
CREATE INDEX "Message_appointmentId_createdAt_idx" ON "Message"("appointmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_cookieToken_key" ON "Cart"("cookieToken");

-- CreateIndex
CREATE INDEX "Cart_updatedAt_abandonedEmailSentAt_idx" ON "Cart"("updatedAt", "abandonedEmailSentAt");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_timeSlotId_key" ON "CartItem"("timeSlotId");

-- CreateIndex
CREATE INDEX "CartItem_heldUntil_idx" ON "CartItem"("heldUntil");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeInvoiceId_key" ON "Order"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentDueAt_prePaymentFlow_prePaymentReminderStage_idx" ON "Order"("paymentDueAt", "prePaymentFlow", "prePaymentReminderStage");

-- CreateIndex
CREATE INDEX "Order_postPaymentStage_paymentStatus_idx" ON "Order"("postPaymentStage", "paymentStatus");

-- CreateIndex
CREATE INDEX "Order_appointmentIds_gin_idx" ON "Order" USING GIN ("appointmentIds");

-- CreateIndex
CREATE INDEX "AutomationRun_createdAt_idx" ON "AutomationRun"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AutomationRun_automationKey_createdAt_idx" ON "AutomationRun"("automationKey", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AutomationRun_orderId_createdAt_idx" ON "AutomationRun"("orderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeEventId_key" ON "Payment"("stripeEventId");

-- CreateIndex
CREATE INDEX "Payment_appointmentId_idx" ON "Payment"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhookEvent_stripeEventId_key" ON "ProcessedWebhookEvent"("stripeEventId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_doctorId_key" ON "User"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "BlogPost_countryId_status_locale_idx" ON "BlogPost"("countryId", "status", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_locale_countryId_key" ON "BlogPost"("slug", "locale", "countryId");

-- CreateIndex
CREATE INDEX "BlogTranslation_postId_idx" ON "BlogTranslation"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTranslation_postId_locale_key" ON "BlogTranslation"("postId", "locale");

-- CreateIndex
CREATE INDEX "BlogPostCountry_postId_idx" ON "BlogPostCountry"("postId");

-- CreateIndex
CREATE INDEX "BlogPostCountry_countryId_idx" ON "BlogPostCountry"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostCountry_postId_countryId_key" ON "BlogPostCountry"("postId", "countryId");

-- CreateIndex
CREATE INDEX "Faq_countryId_locale_isActive_idx" ON "Faq"("countryId", "locale", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPage_countryId_pageKey_locale_key" ON "ContentPage"("countryId", "pageKey", "locale");

-- CreateIndex
CREATE INDEX "Review_countryId_provider_idx" ON "Review"("countryId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Review_provider_externalId_key" ON "Review"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientUploadLink_tokenHash_key" ON "PatientUploadLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PatientUploadLink_email_appointmentId_idx" ON "PatientUploadLink"("email", "appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "GpAssignmentLog_timeSlotId_key" ON "GpAssignmentLog"("timeSlotId");

-- CreateIndex
CREATE INDEX "GpAssignmentLog_countryCode_createdAt_idx" ON "GpAssignmentLog"("countryCode", "createdAt");

-- CreateIndex
CREATE INDEX "GpAssignmentLog_doctorId_createdAt_idx" ON "GpAssignmentLog"("doctorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_appointmentId_key" ON "Consultation"("appointmentId");

-- CreateIndex
CREATE INDEX "Consultation_doctorId_status_idx" ON "Consultation"("doctorId", "status");

-- CreateIndex
CREATE INDEX "Prescription_consultationId_createdAt_idx" ON "Prescription"("consultationId", "createdAt");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_createdAt_idx" ON "Prescription"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "ExamResult_appointmentId_createdAt_idx" ON "ExamResult"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "ExamResult_doctorId_createdAt_idx" ON "ExamResult"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "ExamResult_appointmentId_status_idx" ON "ExamResult"("appointmentId", "status");

-- CreateIndex
CREATE INDEX "InternalMessage_appointmentId_createdAt_idx" ON "InternalMessage"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationService_consultationId_idx" ON "ConsultationService"("consultationId");

-- CreateIndex
CREATE INDEX "FormTemplate_doctorId_isActive_idx" ON "FormTemplate"("doctorId", "isActive");

-- CreateIndex
CREATE INDEX "FormSubmission_appointmentId_submittedAt_idx" ON "FormSubmission"("appointmentId", "submittedAt");

-- CreateIndex
CREATE INDEX "FormSubmission_templateId_submittedAt_idx" ON "FormSubmission"("templateId", "submittedAt");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_readAt_idx" ON "Notification"("recipientUserId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_createdAt_idx" ON "Notification"("recipientUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ShareLink_consultationId_idx" ON "ShareLink"("consultationId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentDocument_appointmentId_createdAt_idx" ON "AppointmentDocument"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentDocument_doctorId_createdAt_idx" ON "AppointmentDocument"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationMessage_appointmentId_createdAt_idx" ON "ConsultationMessage"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceFaq_serviceId_isVisible_sortOrder_idx" ON "ServiceFaq"("serviceId", "isVisible", "sortOrder");

-- CreateIndex
CREATE INDEX "HealthTestFaq_healthTestId_isVisible_sortOrder_idx" ON "HealthTestFaq"("healthTestId", "isVisible", "sortOrder");

-- CreateIndex
CREATE INDEX "PatientNationalityDocument_patientProfileId_idx" ON "PatientNationalityDocument"("patientProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientNationalityDocument_patientProfileId_slotNumber_key" ON "PatientNationalityDocument"("patientProfileId", "slotNumber");

-- CreateIndex
CREATE INDEX "MedicalDocument_patientProfileId_documentType_idx" ON "MedicalDocument"("patientProfileId", "documentType");

-- CreateIndex
CREATE INDEX "MedicalDocument_patientProfileId_visibleToPatient_idx" ON "MedicalDocument"("patientProfileId", "visibleToPatient");

-- CreateIndex
CREATE INDEX "MedicalDocument_relatedAppointmentId_idx" ON "MedicalDocument"("relatedAppointmentId");

-- CreateIndex
CREATE INDEX "PatientConsent_patientProfileId_consentType_createdAt_idx" ON "PatientConsent"("patientProfileId", "consentType", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalAccessLog_patientProfileId_createdAt_idx" ON "MedicalAccessLog"("patientProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalAccessLog_patientProfileId_accessedByRole_idx" ON "MedicalAccessLog"("patientProfileId", "accessedByRole");

-- CreateIndex
CREATE INDEX "ConsentDocument_consentKey_isActive_idx" ON "ConsentDocument"("consentKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentDocument_consentKey_version_locale_key" ON "ConsentDocument"("consentKey", "version", "locale");

-- CreateIndex
CREATE INDEX "DoctorConfidentialityAgreement_doctorId_accepted_idx" ON "DoctorConfidentialityAgreement"("doctorId", "accepted");

-- CreateIndex
CREATE INDEX "MedicalAccessRequest_patientProfileId_status_idx" ON "MedicalAccessRequest"("patientProfileId", "status");

-- CreateIndex
CREATE INDEX "MedicalAccessRequest_requestingDoctorId_status_idx" ON "MedicalAccessRequest"("requestingDoctorId", "status");

-- CreateIndex
CREATE INDEX "MedicalAccessGrant_patientProfileId_grantedToUserId_expires_idx" ON "MedicalAccessGrant"("patientProfileId", "grantedToUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "MedicalAccessGrant_grantedToUserId_expiresAt_idx" ON "MedicalAccessGrant"("grantedToUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "SecurityAlert_status_severity_createdAt_idx" ON "SecurityAlert"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAlert_patientId_createdAt_idx" ON "SecurityAlert"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAlert_actorId_createdAt_idx" ON "SecurityAlert"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAlert_dedupeKey_idx" ON "SecurityAlert"("dedupeKey");

-- CreateIndex
CREATE INDEX "PatientContactChangeLog_patientProfileId_createdAt_idx" ON "PatientContactChangeLog"("patientProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientMergeLog_primaryPatientId_idx" ON "PatientMergeLog"("primaryPatientId");

-- CreateIndex
CREATE INDEX "PatientMergeLog_duplicatePatientId_idx" ON "PatientMergeLog"("duplicatePatientId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryDataPolicy_countryId_key" ON "CountryDataPolicy"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryDataPolicy_countryCode_key" ON "CountryDataPolicy"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "CountryLegalProfile_countryId_key" ON "CountryLegalProfile"("countryId");

-- CreateIndex
CREATE INDEX "CountryDisclaimerTranslation_legalProfileId_idx" ON "CountryDisclaimerTranslation"("legalProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryDisclaimerTranslation_legalProfileId_locale_key" ON "CountryDisclaimerTranslation"("legalProfileId", "locale");

-- CreateIndex
CREATE INDEX "CountryAuthorityLink_countryId_isActive_idx" ON "CountryAuthorityLink"("countryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CountryLegalDocument_countryId_type_locale_key" ON "CountryLegalDocument"("countryId", "type", "locale");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_patientProfileId_requestStatus_idx" ON "DataDeletionRequest"("patientProfileId", "requestStatus");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_requestStatus_createdAt_idx" ON "DataDeletionRequest"("requestStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE INDEX "invoices_countryCode_generatedAt_idx" ON "invoices"("countryCode", "generatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PlanTranslation_planId_locale_key" ON "PlanTranslation"("planId", "locale");

-- CreateIndex
CREATE INDEX "PlanConsultationRule_countryId_idx" ON "PlanConsultationRule"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanConsultationRule_planId_serviceId_key" ON "PlanConsultationRule"("planId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPerkRule_planId_perkKey_key" ON "PlanPerkRule"("planId", "perkKey");

-- CreateIndex
CREATE UNIQUE INDEX "HealthTestKitRedemptionRule_planId_healthTestId_key" ON "HealthTestKitRedemptionRule"("planId", "healthTestId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_stripeSubscriptionId_key" ON "UserSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");

-- CreateIndex
CREATE INDEX "UserSubscription_planId_idx" ON "UserSubscription"("planId");

-- CreateIndex
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionCreditBalance_userSubscriptionId_kind_key" ON "SubscriptionCreditBalance"("userSubscriptionId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationCreditLedger_idempotencyKey_key" ON "ConsultationCreditLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ConsultationCreditLedger_userSubscriptionId_reason_idx" ON "ConsultationCreditLedger"("userSubscriptionId", "reason");

-- CreateIndex
CREATE INDEX "ConsultationCreditLedger_reservationId_idx" ON "ConsultationCreditLedger"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "WellnessCreditLedger_idempotencyKey_key" ON "WellnessCreditLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WellnessCreditLedger_userSubscriptionId_reason_idx" ON "WellnessCreditLedger"("userSubscriptionId", "reason");

-- CreateIndex
CREATE INDEX "WellnessCreditLedger_reservationId_idx" ON "WellnessCreditLedger"("reservationId");

-- CreateIndex
CREATE INDEX "SubscriptionPerkGrant_status_idx" ON "SubscriptionPerkGrant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPerkGrant_userSubscriptionId_perkKey_key" ON "SubscriptionPerkGrant"("userSubscriptionId", "perkKey");

-- CreateIndex
CREATE UNIQUE INDEX "HealthTestRedemption_orderId_key" ON "HealthTestRedemption"("orderId");

-- CreateIndex
CREATE INDEX "HealthTestRedemption_userId_idx" ON "HealthTestRedemption"("userId");

-- CreateIndex
CREATE INDEX "HealthTestRedemption_status_idx" ON "HealthTestRedemption"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_stripeInvoiceId_key" ON "SubscriptionInvoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_userSubscriptionId_idx" ON "SubscriptionInvoice"("userSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanStripePrice_stripePriceId_key" ON "PlanStripePrice"("stripePriceId");

-- CreateIndex
CREATE INDEX "PlanStripePrice_planId_idx" ON "PlanStripePrice"("planId");

-- CreateIndex
CREATE INDEX "FamilyMember_primaryUserId_idx" ON "FamilyMember"("primaryUserId");

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryLocale" ADD CONSTRAINT "CountryLocale_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryDomain" ADD CONSTRAINT "CountryDomain_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorBankAccount" ADD CONSTRAINT "DoctorBankAccount_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorCredential" ADD CONSTRAINT "DoctorCredential_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorTranslation" ADD CONSTRAINT "DoctorTranslation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorMarketTranslation" ADD CONSTRAINT "DoctorMarketTranslation_doctorCountryId_fkey" FOREIGN KEY ("doctorCountryId") REFERENCES "DoctorCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorFaq" ADD CONSTRAINT "DoctorFaq_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorMarketBankAccount" ADD CONSTRAINT "DoctorMarketBankAccount_doctorCountryId_fkey" FOREIGN KEY ("doctorCountryId") REFERENCES "DoctorCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAvailability" ADD CONSTRAINT "DoctorAvailability_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorTimeSlot" ADD CONSTRAINT "DoctorTimeSlot_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorCountry" ADD CONSTRAINT "DoctorCountry_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorCountry" ADD CONSTRAINT "DoctorCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialtyTranslation" ADD CONSTRAINT "SpecialtyTranslation_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSpecialty" ADD CONSTRAINT "DoctorSpecialty_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSpecialty" ADD CONSTRAINT "DoctorSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLink" ADD CONSTRAINT "ServiceLink_sourceServiceId_fkey" FOREIGN KEY ("sourceServiceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLink" ADD CONSTRAINT "ServiceLink_targetServiceId_fkey" FOREIGN KEY ("targetServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLinkTranslation" ADD CONSTRAINT "ServiceLinkTranslation_serviceLinkId_fkey" FOREIGN KEY ("serviceLinkId") REFERENCES "ServiceLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoLandingPage" ADD CONSTRAINT "SeoLandingPage_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoLandingPageTranslation" ADD CONSTRAINT "SeoLandingPageTranslation_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "SeoLandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePeakPricing" ADD CONSTRAINT "ServicePeakPricing_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePeakWindow" ADD CONSTRAINT "ServicePeakWindow_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "ServicePeakPricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTranslation" ADD CONSTRAINT "ServiceTranslation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDoctor" ADD CONSTRAINT "ServiceDoctor_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDoctor" ADD CONSTRAINT "ServiceDoctor_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTest" ADD CONSTRAINT "HealthTest_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTestTranslation" ADD CONSTRAINT "HealthTestTranslation_healthTestId_fkey" FOREIGN KEY ("healthTestId") REFERENCES "HealthTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationSetting" ADD CONSTRAINT "ConsultationSetting_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryFooter" ADD CONSTRAINT "CountryFooter_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSetting" ADD CONSTRAINT "BookingSetting_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_healthTestId_fkey" FOREIGN KEY ("healthTestId") REFERENCES "HealthTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "DoctorTimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_followUpFromAppointmentId_fkey" FOREIGN KEY ("followUpFromAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "PricingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalNote" ADD CONSTRAINT "MedicalNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalNote" ADD CONSTRAINT "MedicalNote_createdByDoctorId_fkey" FOREIGN KEY ("createdByDoctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrazilConsentSubmission" ADD CONSTRAINT "BrazilConsentSubmission_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewInvite" ADD CONSTRAINT "ReviewInvite_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorDoctorId_fkey" FOREIGN KEY ("authorDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_reviewerDoctorId_fkey" FOREIGN KEY ("reviewerDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogTranslation" ADD CONSTRAINT "BlogTranslation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostCountry" ADD CONSTRAINT "BlogPostCountry_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostCountry" ADD CONSTRAINT "BlogPostCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPage" ADD CONSTRAINT "ContentPage_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPage" ADD CONSTRAINT "ContentPage_heroImageAssetId_fkey" FOREIGN KEY ("heroImageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPage" ADD CONSTRAINT "ContentPage_ogImageAssetId_fkey" FOREIGN KEY ("ogImageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalMessage" ADD CONSTRAINT "InternalMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalMessage" ADD CONSTRAINT "InternalMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationService" ADD CONSTRAINT "ConsultationService_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationService" ADD CONSTRAINT "ConsultationService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentDocument" ADD CONSTRAINT "AppointmentDocument_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentDocument" ADD CONSTRAINT "AppointmentDocument_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceFaq" ADD CONSTRAINT "ServiceFaq_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTestFaq" ADD CONSTRAINT "HealthTestFaq_healthTestId_fkey" FOREIGN KEY ("healthTestId") REFERENCES "HealthTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientNationalityDocument" ADD CONSTRAINT "PatientNationalityDocument_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAccessLog" ADD CONSTRAINT "MedicalAccessLog_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorConfidentialityAgreement" ADD CONSTRAINT "DoctorConfidentialityAgreement_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAccessRequest" ADD CONSTRAINT "MedicalAccessRequest_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAccessRequest" ADD CONSTRAINT "MedicalAccessRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAccessGrant" ADD CONSTRAINT "MedicalAccessGrant_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "MedicalAccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientContactChangeLog" ADD CONSTRAINT "PatientContactChangeLog_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMergeLog" ADD CONSTRAINT "PatientMergeLog_primaryPatientId_fkey" FOREIGN KEY ("primaryPatientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryDataPolicy" ADD CONSTRAINT "CountryDataPolicy_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryLegalProfile" ADD CONSTRAINT "CountryLegalProfile_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryDisclaimerTranslation" ADD CONSTRAINT "CountryDisclaimerTranslation_legalProfileId_fkey" FOREIGN KEY ("legalProfileId") REFERENCES "CountryLegalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryAuthorityLink" ADD CONSTRAINT "CountryAuthorityLink_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryLegalDocument" ADD CONSTRAINT "CountryLegalDocument_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDeletionRequest" ADD CONSTRAINT "DataDeletionRequest_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTranslation" ADD CONSTRAINT "PlanTranslation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanConsultationRule" ADD CONSTRAINT "PlanConsultationRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanConsultationRule" ADD CONSTRAINT "PlanConsultationRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPerkRule" ADD CONSTRAINT "PlanPerkRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTestKitRedemptionRule" ADD CONSTRAINT "HealthTestKitRedemptionRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTestKitRedemptionRule" ADD CONSTRAINT "HealthTestKitRedemptionRule_healthTestId_fkey" FOREIGN KEY ("healthTestId") REFERENCES "HealthTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCreditBalance" ADD CONSTRAINT "SubscriptionCreditBalance_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationCreditLedger" ADD CONSTRAINT "ConsultationCreditLedger_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellnessCreditLedger" ADD CONSTRAINT "WellnessCreditLedger_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPerkGrant" ADD CONSTRAINT "SubscriptionPerkGrant_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTestRedemption" ADD CONSTRAINT "HealthTestRedemption_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTestRedemption" ADD CONSTRAINT "HealthTestRedemption_healthTestId_fkey" FOREIGN KEY ("healthTestId") REFERENCES "HealthTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTestRedemption" ADD CONSTRAINT "HealthTestRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanStripePrice" ADD CONSTRAINT "PlanStripePrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

