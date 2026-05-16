import { apiRequest } from "./client";

export type BookingPayload = {
  country: string;
  consultationType: string;
  fullName: string;
  email: string;
  phone?: string;
  notes?: string;
  consentAccepted: boolean;
  /** When set, links the appointment to a catalogue Service so price +
   *  currency get copied onto the row, enabling Stripe Checkout. */
  serviceSlug?: string;
};

export type BookingApiSuccess = {
  status: "request_received";
  appointmentId: string;
  paymentRequired: boolean;
};

export async function submitBookingRequest(payload: BookingPayload) {
  return apiRequest<BookingApiSuccess>("/api/appointments", {
    method: "POST",
    credentials: "include",
    body: payload,
    sameOrigin: true,
  });
}

export type CheckoutSessionSuccess = {
  url: string;
  sessionId: string;
};

/** Create a Stripe Checkout Session for a booking. The frontend then sets
 *  `window.location = url` to hand the user off to Stripe. */
export async function createCheckoutSession(input: {
  appointmentId: string;
  returnTo?: string;
}) {
  return apiRequest<CheckoutSessionSuccess>("/api/payments/checkout-session", {
    method: "POST",
    credentials: "include",
    body: input,
    sameOrigin: true,
  });
}
