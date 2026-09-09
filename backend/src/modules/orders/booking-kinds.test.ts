import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CartItemKind } from "@prisma/client";
import {
  BOOKING_KINDS,
  CONSULTATION_KINDS,
  orderHasBookingItem,
  orderHasTestBookingItem,
  isConsultationKind,
  isTestBookingKind,
} from "./booking-kinds.js";
import { orderHasConsultationItem } from "../admin-orders/generate-order-meet-link.service.js";

/**
 * These pin the one distinction the whole test-booking feature rests on: which
 * order lines get a Google Meet link, and which get a test-centre address.
 *
 * Getting this wrong is not a cosmetic bug. A test order that reads as a
 * consultation enters the meeting-link path, finds nothing to provision, and
 * returns having advanced nothing — the order sits at POST_PAYMENT_STAGE_PAID
 * forever and the patient is charged but never told their booking is confirmed.
 */

const line = (kind: CartItemKind) => ({ kind });

describe("booking kind discriminators", () => {
  it("counts a test booking as a booking but NOT as a consultation", () => {
    const items = [line(CartItemKind.TEST_BOOKING)];
    assert.equal(orderHasBookingItem(items), true);
    assert.equal(orderHasTestBookingItem(items), true);
    // The load-bearing one: this is what gates Meet provisioning.
    assert.equal(orderHasConsultationItem(items), false);
  });

  it("counts a consultation as a consultation but NOT as a test booking", () => {
    for (const kind of CONSULTATION_KINDS) {
      const items = [line(kind)];
      assert.equal(orderHasConsultationItem(items), true, kind);
      assert.equal(orderHasTestBookingItem(items), false, kind);
      assert.equal(orderHasBookingItem(items), true, kind);
    }
  });

  it("never treats a product or a lab exam as a booking", () => {
    for (const kind of [
      CartItemKind.HEALTH_TEST,
      CartItemKind.PRESCRIPTION_SERVICE,
      CartItemKind.LAB_EXAM,
    ]) {
      const items = [line(kind)];
      assert.equal(orderHasBookingItem(items), false, kind);
      assert.equal(orderHasTestBookingItem(items), false, kind);
      assert.equal(orderHasConsultationItem(items), false, kind);
    }
  });

  it("keeps LAB_EXAM out of TEST_BOOKING", () => {
    // LAB_EXAM drives markRequisitionsReadyOnOrderPaid. If a public test
    // booking ever counted as one, paying for a test would advance a Synlab
    // requisition that does not exist.
    assert.equal(isTestBookingKind(CartItemKind.LAB_EXAM), false);
    assert.equal(BOOKING_KINDS.includes(CartItemKind.LAB_EXAM), false);
  });

  it("BOOKING_KINDS is exactly the consultation kinds plus test bookings", () => {
    assert.deepEqual(
      [...BOOKING_KINDS].sort(),
      [...CONSULTATION_KINDS, CartItemKind.TEST_BOOKING].sort(),
    );
  });

  it("classifies every kind as at most one of the two", () => {
    for (const kind of Object.values(CartItemKind)) {
      assert.equal(
        isConsultationKind(kind) && isTestBookingKind(kind),
        false,
        `${kind} claimed to be both`,
      );
    }
  });
});
