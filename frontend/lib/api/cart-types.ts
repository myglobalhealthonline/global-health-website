export type CartItemKind =
  | "HEALTH_TEST"
  | "PRESCRIPTION_SERVICE"
  | "GENERAL_CONSULTATION"
  | "SPECIALIST_CONSULTATION";

/** Per-consultation-line subscription benefit choice (§ appointment-claim). */
export type BenefitSelection = "PAY_NORMAL" | "USE_PLAN_CREDIT" | "USE_PLAN_DISCOUNT";

/**
 * Cart-level benefit choice (§11.4) — exactly one source per cart, so checkout
 * runs exactly one pricing engine. `UNSET` is not settable by a client: it means
 * "never asked", and restoring it would re-open §6.4's checkout reject.
 *
 * `refId` is the enrollment id for MEMBERSHIP and `credit` / `discount` for
 * PUBLIC_PLAN. CORPORATE needs none; for INSURANCE it is display state only,
 * since the per-line `insuranceCompanyId` stays authoritative.
 */
export type CartBenefitSource =
  | "NONE"
  | "MEMBERSHIP"
  | "CORPORATE"
  | "PUBLIC_PLAN"
  | "INSURANCE";

export type CartBenefitInput = { source: CartBenefitSource; refId?: string };

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
  /** Número de Utente (Portuguese SNS health number). Collected only where
   *  BookingSetting.collectUtenteNumber is on, and never required — patients
   *  without an SNS number must still be able to book. */
  utenteNumber?: string;
  /** IANA tz captured client-side via Intl.DateTimeFormat. Stored on
   *  Appointment.patientTimezone for downstream rendering. */
  patientTimezone?: string;
  /** Structured address snapshot. Required when BookingSetting.requireAddress
   *  is on. Snapshotted onto the appointment so later profile edits don't
   *  retroactively rewrite the booking record. */
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  /** State / province / federative unit — Brazil's UF. Absent elsewhere. */
  addressState?: string;
  addressPostalCode?: string;
  addressCountryCode?: string;
  /** Dual GDPR consent — both required for new bookings. Stored
   *  independently so withdrawal of platform consent doesn't invalidate
   *  the clinical record. */
  gdprConsentClinic: true;
  gdprConsentPlatform: true;
  /** Optional opt-in to appointment updates + reminders via WhatsApp.
   *  Never required — patient WhatsApp sends are skipped when absent. */
  whatsappConsent?: boolean;
  /** GDPR: patient confirmed they understand cross-border access to their
   *  medical file if they travel/receive care in another country. Required
   *  true for every booking, mirrors `consentAccepted`. */
  crossBorderConsentAccepted: true;
  /** Who may access the patient's medical file. Defaults to DIRECT
   *  (treating doctor only) when omitted. */
  medicalAccessConsentScope?: "DIRECT" | "COUNTRY_CLINIC" | "GLOBAL_NETWORK";
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
  /** Name + doctor of each item the sweep just removed. Same length as
   *  `expiredHolds`. Lets the UI name the specific slot instead of a
   *  bare count. */
  expiredItems?: { name: string; doctorName: string | null }[];
};

/** Max units per non-consultation cart item. Matched in
 *  backend/src/routes/cart.route.ts — keep in sync. */
export const CART_ITEM_MAX_QTY = 5;

/** Reservation TTL for consultation slots. Backend uses this when
 *  setting heldUntil; UI uses it to show the countdown. */
export const HOLD_TTL_MS = 10 * 60 * 1000;

/** A consultation appointment attached to an order — the assigned doctor and
 *  the scheduled call time. Empty for pure commerce orders. */
export type OrderConsultation = {
  appointmentId: string;
  /** Assigned doctor's full name; null until a doctor is assigned. */
  doctorName: string | null;
  /** ISO instant of the scheduled call; null when not yet scheduled. */
  scheduledAt: string | null;
  consultationType: string;
};

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
  consultations?: OrderConsultation[];
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
  /** Product identity for re-adding this line to the cart ("Reorder").
   *  Null for consultation lines (kind GENERAL/SPECIALIST_CONSULTATION),
   *  which can't be reordered — a new appointment slot must be booked. */
  healthTestId: string | null;
  serviceId: string | null;
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
  consultations?: OrderConsultation[];
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};
