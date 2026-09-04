import { cache } from "react";
import { adminRequest } from "./core";

export type CouponKind = "PERSONAL" | "GENERAL";
/** Which bookings a code covers. ANY is the pre-scoping default. */
export type CouponScope =
  | "ANY"
  | "GENERAL_CONSULTATION"
  | "SPECIALIST_CONSULTATION"
  | "CONSULTATIONS";

export const COUPON_SCOPE_LABELS: Record<CouponScope, string> = {
  ANY: "Any booking",
  GENERAL_CONSULTATION: "GP consultations only",
  SPECIALIST_CONSULTATION: "Specialist consultations only",
  CONSULTATIONS: "GP and specialist consultations",
};
export type CouponStatus = "active" | "scheduled" | "expired" | "exhausted" | "disabled";
export type CouponLocale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";

export type AdminCouponListItem = {
  id: string;
  code: string;
  kind: CouponKind;
  scope: CouponScope;
  discountPercent: number;
  personalEmail: string | null;
  personalName: string | null;
  validFrom: string;
  validUntil: string;
  maxRedemptions: number;
  redeemedCount: number;
  active: boolean;
  internalNote: string | null;
  createdAt: string;
  status: CouponStatus;
  _count: { recipients: number };
};

export type AdminCouponRecipient = {
  id: string;
  email: string;
  fullName: string | null;
  locale: CouponLocale | null;
  patientProfileId: string | null;
  status: "PENDING" | "SENT" | "FAILED";
  error: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type AdminCouponRedemption = {
  id: string;
  email: string;
  status: "RESERVED" | "CONSUMED" | "RELEASED";
  discountPercent: number;
  discountCents: number;
  currencyCode: string;
  createdAt: string;
  consumedAt: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  order: {
    id: string;
    orderNumber: string | null;
    totalCents: number;
    currencyCode: string;
  } | null;
};

export type AdminCouponDetail = AdminCouponListItem & {
  recipients: AdminCouponRecipient[];
  redemptions: AdminCouponRedemption[];
};

export type AdminCouponRecipientInput = {
  email: string;
  fullName?: string | null;
  locale?: CouponLocale | null;
  patientProfileId?: string | null;
};

export type CreateCouponBody = {
  code?: string;
  kind: CouponKind;
  scope: CouponScope;
  discountPercent: number;
  validFrom: string;
  validUntil: string;
  maxRedemptions: number;
  personalEmail?: string;
  personalName?: string;
  internalNote?: string;
  recipients?: AdminCouponRecipientInput[];
  sendNow: boolean;
};

export async function fetchAdminCoupons(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return adminRequest<{
    items: AdminCouponListItem[];
    total: number;
    page: number;
    pageSize: number;
    /** Catalogue-wide, not page-scoped. Computed server-side because a React
     *  server component may not read the clock during render. */
    summary: { active: number; expiring: number; redemptions: number };
  }>(`/api/admin/coupons${qs ? `?${qs}` : ""}`);
}

export const fetchAdminCouponById = cache(async (id: string) =>
  adminRequest<AdminCouponDetail>(`/api/admin/coupons/${encodeURIComponent(id)}`),
);

export async function postAdminCoupon(body: CreateCouponBody) {
  return adminRequest<{ id: string; code: string; email: { sent: number; failed: number } | null }>(
    "/api/admin/coupons",
    { method: "POST", body },
  );
}

export async function patchAdminCoupon(
  id: string,
  body: {
    active?: boolean;
    validFrom?: string;
    validUntil?: string;
    maxRedemptions?: number;
    internalNote?: string;
  },
) {
  return adminRequest<{ id: string }>(`/api/admin/coupons/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export async function postAdminCouponSend(
  id: string,
  body: { recipients?: AdminCouponRecipientInput[]; recipientIds?: string[] },
) {
  return adminRequest<{ queued: boolean; sent?: number; failed?: number }>(
    `/api/admin/coupons/${encodeURIComponent(id)}/send`,
    { method: "POST", body },
  );
}
