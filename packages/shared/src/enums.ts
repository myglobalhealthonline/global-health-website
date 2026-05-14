/**
 * Enum string-unions mirroring the Prisma schema.
 * Kept here so frontend and (future) mobile clients can import without dragging Prisma in.
 */

export const USER_ROLES = ["PATIENT", "ADMIN", "SUPER_ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CATEGORY_TYPES = ["GENERAL", "SPECIALIST"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const SERVICE_TYPES = ["GENERAL", "SPECIALIST", "PRESCRIPTION", "HEALTH_TEST"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const PUBLISH_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const APPOINTMENT_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
