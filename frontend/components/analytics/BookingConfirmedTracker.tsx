"use client";

import { useEffect, useRef } from "react";
import { useConsent } from "@/components/compliance/use-consent";
import { bookingCategory, trackBookingEvent } from "@/lib/analytics/booking";

export function BookingConfirmedTracker({ orderId, bookings }: {
  orderId: string;
  bookings: { market: string; serviceKind: string }[];
}) {
  const { consent } = useConsent();
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (consent?.analytics !== true || bookings.length === 0) return;
    const send = () => {
      // Wait for bootstrap so declined/blocked attempts don't consume dedup.
      if (!window.gtag || sent.current === orderId) return;
      const key = `gh_booking_confirmed:${orderId}`;
      try { if (sessionStorage.getItem(key)) return; } catch { /* Storage unavailable. */ }
      const categories = new Set(bookings.map(b => bookingCategory(b.serviceKind)));
      const category = categories.size === 1 ? bookingCategory(bookings[0].serviceKind) : "healthcare";
      if (trackBookingEvent("booking_confirmed", bookings[0].market, category)) {
        sent.current = orderId;
        try { sessionStorage.setItem(key, "1"); } catch { /* Storage unavailable. */ }
      }
    };
    send();
    window.addEventListener("gh-ga-ready", send);
    return () => window.removeEventListener("gh-ga-ready", send);
  }, [consent?.analytics, orderId, bookings]);
  return null;
}
