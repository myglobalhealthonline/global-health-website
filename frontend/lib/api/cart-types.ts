export type CartItemKind =
  | "HEALTH_TEST"
  | "PRESCRIPTION_SERVICE"
  | "GENERAL_CONSULTATION"
  | "SPECIALIST_CONSULTATION";

/** Per-consultation-line subscription benefit choice (§ appointment-claim). */
export type BenefitSelection = "PAY_NORMAL" | "USE_PLAN_CREDIT" | "USE_PLAN_DISCOUNT";

export type CartItem = {
  id: string;
  kind: CartItemKind;
  healthTestId: string | null;
  serviceId: string | null;
  name: string;
  unitPriceCents: number;
  /** Shipping fee charged per unit at checkout. 0 = no shipping line
   *  for this item (the default for online consultations). The cart +
   *  checkout pages sum `shippingCents * quantity` across the cart. */
  shippingCents: number;
  quantity: number;
  lineTotalCents: number;
  timeSlotId: string | null;
  doctorId: string | null;
  /** Display-only doctor name resolved by the backend at serialize
   *  time. Null for product items or when the doctor row was deleted. */
  doctorName: string | null;
  /** Display-only slot start ISO. Null for product items. */
  slotStartAt: string | null;
  /** ISO timestamp when this consultation slot reservation lapses.
   *  Null for product items. UI polls this and shows a countdown. */
  heldUntil: string | null;
  /** Consultation patient intake snapshot — captured on the consult
   *  page before add-to-cart. Null for product items. */
  patient: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    notes: string | null;
    consentAcceptedAt: string | null;
    bookingForOther: boolean;
  } | null;
  /** Per-line subscription benefit choice (consultation lines). */
  benefitSelection: BenefitSelection;
  /** Approved dependent this line is booked for, or null for self. */
  familyMemberId: string | null;
  /** Display name of the dependent resolved by the backend. Null = self. */
  familyMemberName: string | null;
};

/** Patient intake payload sent on POST /api/cart/items for
 *  consultation kinds. Required by the backend; ignored for products. */
export type CartItemPatientInput = {
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  notes?: string;
  consentAccepted: true;
  bookingForOther?: boolean;
  /** Country-specific national ID (NIF/PPS/CPF/CNP/DNI/...). Required
   *  by the backend when BookingSetting.requireNationalId is on. */
  nationalIdNumber?: string;
  /** IANA tz captured client-side via Intl.DateTimeFormat. Stored on
   *  Appointment.patientTimezone for downstream rendering. */
  patientTimezone?: string;
  /** Structured address snapshot. Required when BookingSetting.requireAddress
   *  is on. Snapshotted onto the appointment so later profile edits don't
   *  retroactively rewrite the booking record. */
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressPostalCode?: string;
  addressCountryCode?: string;
  /** Dual GDPR consent — both required for new bookings. Stored
   *  independently so withdrawal of platform consent doesn't invalidate
   *  the clinical record. */
  gdprConsentClinic: true;
  gdprConsentPlatform: true;
};

export type Cart = {
  id: string;
  countryCode: string;
  currencyCode: string;
  items: CartItem[];
  subtotalCents: number;
  itemCount: number;
  /** Number of expired consultation reservations swept on the most
   *  recent server read. UI flashes a "slot expired" toast when > 0. */
  expiredHolds?: number;
};

/** Max units per non-consultation cart item. Matched in
 *  backend/src/routes/cart.route.ts — keep in sync. */
export const CART_ITEM_MAX_QTY = 5;

/** Reservation TTL for consultation slots. Backend uses this when
 *  setting heldUntil; UI uses it to show the countdown. */
export const HOLD_TTL_MS = 10 * 60 * 1000;

export type OrderListItem = {
  id: string;
  orderNumber?: string | null;
  status: string;
  paymentStatus: string;
  countryCode: string;
  currencyCode: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  itemCount: number;
  paidAt: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  kind: CartItemKind;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type OrderDetail = {
  id: string;
  orderNumber?: string | null;
  status: string;
  paymentStatus: string;
  countryCode: string;
  currencyCode: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  email: string;
  fullName: string;
  phone: string | null;
  ship: {
    name: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    postalCode: string | null;
    countryCode: string | null;
  };
  items: OrderItem[];
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};
