import type { FastifyRequest } from "fastify";
import { prisma } from "../../db/prisma.js";
import { resolveOptionalAuthUser } from "../../utils/request-auth.js";

/**
 * Which cart this request is acting on.
 *
 * A signed-in patient's cart is keyed by `userId`; a guest's by the `gh_cart`
 * cookie holding `Cart.cookieToken`. Extracted from the checkout route so the
 * public coupon check resolves the SAME cart the checkout will price — a coupon
 * validated against a different cart than the one being paid for is worse than
 * no validation at all.
 */
export const CART_COOKIE = "gh_cart";

export async function resolveActiveCart(
  request: FastifyRequest,
): Promise<{ cartId: string | null; userId: string | null }> {
  let userId: string | null = null;
  try {
    const user = await resolveOptionalAuthUser(request);
    if (user && user.role === "PATIENT") userId = user.id;
  } catch {
    // An auth failure here is not a coupon/checkout failure — fall through to
    // the guest cookie.
  }

  if (userId) {
    const userCart = await prisma.cart.findUnique({ where: { userId } });
    return { cartId: userCart?.id ?? null, userId };
  }

  const cookieToken = (request.cookies as Record<string, string | undefined>)[CART_COOKIE];
  if (!cookieToken) return { cartId: null, userId: null };
  const guestCart = await prisma.cart.findUnique({ where: { cookieToken } });
  return { cartId: guestCart?.id ?? null, userId: null };
}
