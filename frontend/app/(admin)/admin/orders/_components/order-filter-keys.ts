// Shared between the server page and the client filter form. Deliberately NOT
// a "use client" module: the server component iterates ORDER_FILTER_KEYS, and
// non-component exports of a client module are client references in the prod
// build — not a real array — which crashed /admin/orders with
// "ORDER_FILTER_KEYS is not iterable".

export type OrderFilterValues = {
  q?: string;
  status?: string;
  paymentStatus?: string;
  doctorName?: string;
  createdFrom?: string;
  createdTo?: string;
  consultFrom?: string;
  consultTo?: string;
};

/** Every key the filter form writes back to the URL. */
export const ORDER_FILTER_KEYS = [
  "q",
  "status",
  "paymentStatus",
  "doctorName",
  "createdFrom",
  "createdTo",
  "consultFrom",
  "consultTo",
] as const;
