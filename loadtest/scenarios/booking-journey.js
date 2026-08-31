import http from "k6/http";
import { sleep } from "k6";
import { Rate } from "k6/metrics";
import {
  BACKEND_BASE,
  backendParams,
  authHeaders,
  REQUEST_TIMEOUT,
  checkStatus,
  think,
} from "../lib/helpers.js";
const targets = JSON.parse(open("../config/targets.json"));

// Tracks whether gp-assign actually won a slot (200) vs lost the race to a
// concurrent VU (409 NO_DOCTOR). In the 2026-08-14 run this was 0% in every
// profile because no doctor availability existed in the load-test DB, so the
// cart-write / pricing / checkout path below was never exercised despite the
// run reporting a clean pass. Has a hard threshold — see THRESHOLDS in
// lib/profile-builder.js — and depends on the doctor-availability seeding
// step in docs/testing/load-test-run-sheet.md actually having been run.
export const gpAssignSuccess = new Rate("booking_gp_assign_success");

// Tracks the cart -> Stripe-checkout-session step (POST /api/cart/checkout,
// backend/src/routes/orders.route.ts). Informational only (no threshold) —
// unlike gp-assign this also depends on a Stripe TEST-mode key being
// configured in the load-test environment; an unconfigured key makes every
// call here fail without that being this scenario's fault.
export const checkoutSessionCreated = new Rate("booking_checkout_session_created");

/**
 * Write-path journey exercising the same-day GP auto-assign flow, which is
 * the real mechanism the public booking form uses (see
 * frontend/app/[country]/[lang]/consult/[serviceSlug]/_components/
 * consultation-booking-form.tsx): availability read -> gp-assign (reserves a
 * slot + picks a doctor server-side) -> add to cart -> Stripe checkout
 * session.
 *
 * Deliberately stops at the checkout-session URL rather than visiting it —
 * this exercises the pricing engine, order creation and the Stripe API call
 * without ever completing a real payment. NOTE: the cart flow's checkout is
 * POST /api/cart/checkout (orders.route.ts) — a different, independent
 * booking path from POST /api/appointments (the standalone direct-booking
 * form, which has its own /api/payments/checkout-session pairing). Do not
 * conflate the two if extending this further.
 */
export function bookingJourney() {
  const country = targets.primaryCountry;
  const serviceSlug = targets.sampleServiceSlug;

  const availRes = http.get(
    `${BACKEND_BASE}/api/services/${country}/${serviceSlug}/aggregated-availability`,
    backendParams("booking:availability")
  );
  if (!checkStatus(availRes, 200, "booking availability")) return;

  let slots = [];
  try {
    slots = JSON.parse(availRes.body).data.slots || [];
  } catch (e) {
    return;
  }
  if (slots.length === 0) {
    sleep(think(1, 2));
    return;
  }
  const slot = slots[Math.floor(Math.random() * Math.min(slots.length, 10))];

  const assignRes = http.post(
    `${BACKEND_BASE}/api/public/gp-assign`,
    JSON.stringify({ country, language: "EN", startAt: slot.startAt }),
    backendParams(
      "booking:gp-assign",
      {
        // NO_DOCTOR (a clean 409 business rejection — confirmed live, not
        // the 400 a REST purist would expect) is normal under concurrent
        // load as VUs race for the same slots. Declaring it expected here
        // keeps k6's http_req_failed metric meaningful — without this every
        // race loss inflates the "failed" rate even though the API behaved
        // correctly.
        responseCallback: http.expectedStatuses(200, 409),
      },
      { "Content-Type": "application/json" }
    )
  );
  if (!checkStatus(assignRes, [200, 409], "booking gp-assign")) return;
  gpAssignSuccess.add(assignRes.status === 200);
  if (assignRes.status !== 200) {
    sleep(think(1, 2));
    return;
  }
  let assign;
  try {
    assign = JSON.parse(assignRes.body).data;
  } catch (e) {
    return;
  }
  if (!assign || !assign.timeSlotId || !assign.doctorId) return;

  const vu = __VU || 1;
  const iter = __ITER || 0;
  const patient = {
    fullName: `Load Test VU${vu}`,
    email: `loadtest+vu${vu}-${iter}@myglobalhealth.online`,
    consentAccepted: true,
  };

  const addRes = http.post(
    `${BACKEND_BASE}/api/cart/items`,
    JSON.stringify({
      kind: "GENERAL_CONSULTATION",
      serviceId: assign.serviceId,
      doctorId: assign.doctorId,
      timeSlotId: assign.timeSlotId,
      patient,
    }),
    {
      headers: authHeaders("PATIENT", { "Content-Type": "application/json" }),
      tags: { name: "booking:cart-add" },
      timeout: REQUEST_TIMEOUT,
    }
  );
  checkStatus(addRes, [200, 201, 409], "booking cart add");
  sleep(think(1, 3));

  const cartRes = http.get(`${BACKEND_BASE}/api/cart`, {
    headers: authHeaders("PATIENT"),
    tags: { name: "booking:cart-read" },
    timeout: REQUEST_TIMEOUT,
  });
  checkStatus(cartRes, 200, "booking cart read");
  sleep(think(1, 2));

  // Cart -> Stripe checkout session. Stops here deliberately: the response
  // `url` (a Stripe-hosted checkout page) is never visited, so no real
  // payment is ever attempted.
  const checkoutRes = http.post(
    `${BACKEND_BASE}/api/cart/checkout`,
    JSON.stringify({ email: patient.email, fullName: patient.fullName }),
    {
      headers: authHeaders("PATIENT", { "Content-Type": "application/json" }),
      tags: { name: "booking:checkout" },
      timeout: REQUEST_TIMEOUT,
    }
  );
  checkStatus(checkoutRes, 200, "booking checkout session");
  checkoutSessionCreated.add(checkoutRes.status === 200);
}
