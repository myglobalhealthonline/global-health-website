export type CartItemKind =
  | "HEALTH_TEST"
  | "PRESCRIPTION_SERVICE"
  | "GENERAL_CONSULTATION"
  | "SPECIALIST_CONSULTATION";

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
  /** ISO timestamp when this consultation slot reservation lapses.
   *  Null for product items. UI polls this and shows a countdown. */
  heldUntil: string | null;
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
