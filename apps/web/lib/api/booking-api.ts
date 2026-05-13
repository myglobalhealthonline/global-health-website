import { apiRequest } from "./client";

export type BookingPayload = {
  country: string;
  consultationType: string;
  fullName: string;
  email: string;
  phone?: string;
  notes?: string;
  consentAccepted: boolean;
};

export type BookingApiSuccess = {
  status: "request_received";
};

export async function submitBookingRequest(payload: BookingPayload) {
  return apiRequest<BookingApiSuccess>("/api/appointments", {
    method: "POST",
    credentials: "include",
    body: payload,
    sameOrigin: true,
  });
}
