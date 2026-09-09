"use client";

import { useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { readConsent } from "@/components/compliance/cookie-consent";
import { gtagCall } from "@/lib/analytics/gtag";
import { performanceRoute } from "@/lib/analytics/performance-route";

/** Mounted only by the consent-gated GA integration. No new vendor or endpoint. */
export function WebVitals() {
  const pathname = usePathname();
  // CWV describe the document lifecycle, not each client navigation.
  const initialRoute = useRef(performanceRoute(pathname));
  useReportWebVitals(useCallback((metric) => {
    const route = initialRoute.current;
    if (!route || readConsent()?.analytics !== true) return;
    gtagCall("event", "web_vital", {
      metric_name: metric.name,
      value: metric.value,
      metric_rating: metric.rating,
      route_template: route,
      page_path: route,
      page_location: `${window.location.origin}${route}`,
      page_title: "Public page performance",
      non_interaction: true,
    });
  }, []));
  return null;
}
