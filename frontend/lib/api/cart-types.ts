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
  quantity: number;
  lineTotalCents: number;
  timeSlotId: string | null;
  doctorId: string | null;
};

export type Cart = {
  id: string;
  countryCode: string;
  currencyCode: string;
  items: CartItem[];
  subtotalCents: number;
  itemCount: number;
};

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
