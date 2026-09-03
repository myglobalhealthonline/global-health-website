import { CartItemKind, ServiceKind } from "@prisma/client";

/**
 * The cart/order line kind a consultation service produces.
 *
 * Shared rather than duplicated: the manual booking writes it onto the
 * OrderItem, and the coupon scope check needs the same answer to decide
 * whether a GP-only or specialist-only code covers the booking. Two copies of
 * this mapping would eventually disagree, and the disagreement would be a
 * discount applied to the wrong kind of consultation.
 */
export function consultationCartKind(serviceKind: ServiceKind): CartItemKind {
  return serviceKind === ServiceKind.SPECIALIST
    ? CartItemKind.SPECIALIST_CONSULTATION
    : CartItemKind.GENERAL_CONSULTATION;
}
