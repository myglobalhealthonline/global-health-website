"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addToCart as apiAdd,
  clearCart as apiClear,
  getCart,
  removeCartItem as apiRemove,
  updateCartItem as apiUpdate,
  type AddItemInput,
  type UpdateItemInput,
} from "@/lib/api/cart-client";
import type { Cart } from "@/lib/api/cart-types";
import { trackAnalyticsEvent } from "@/lib/analytics/track";

const EMPTY_CART: Cart = {
  id: "",
  countryCode: "",
  currencyCode: "",
  items: [],
  subtotalCents: 0,
  itemCount: 0,
};

type CartContextValue = {
  cart: Cart;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (input: AddItemInput) => Promise<{ ok: boolean; message?: string; conflict?: string }>;
  update: (itemId: string, qty: number) => Promise<void>;
  /** Patch a line's benefit selection / family target. Returns the error
   *  message (if any) so callers can surface ownership/validation failures. */
  patchItem: (itemId: string, patch: UpdateItemInput) => Promise<{ ok: boolean; message?: string }>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * The single funnel event wired into the app. `add` is the one choke point
 * every add path goes through — consultations, health tests, prescriptions —
 * so one call site covers the whole catalogue.
 *
 * `item_category` is the CartItemKind enum, not the item name. "Erectile
 * Dysfunction Consultation added to cart", tied to a GA client id, is a health
 * inference about a pseudonymous individual drawn from their own stated
 * intent — a different thing entirely from the published /services/[slug] page
 * path, and not something to hand to an analytics property. Category plus
 * value answers the conversion-rate and basket-size question without it.
 *
 * `trackAnalyticsEvent` no-ops unless consent, production and gtag are all
 * present, so this is safe to call unconditionally.
 */
function reportAddToCart(input: AddItemInput, cart: Cart): void {
  const line = cart.items.find(
    (item) =>
      item.kind === input.kind &&
      (input.healthTestId ? item.healthTestId === input.healthTestId : true) &&
      (input.serviceId ? item.serviceId === input.serviceId : true),
  );
  trackAnalyticsEvent("add_to_cart", {
    item_category: input.kind,
    currency: cart.currencyCode,
    ...(line ? { value: line.unitPriceCents / 100 } : {}),
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await getCart();
    setCart(res.ok ? res.data : EMPTY_CART);
    setLoading(false);
  }, []);

  // Mount-time data fetch: the cart cookie was set server-side but
  // we need to hydrate items + countdown state into client React.
  // The lint rule warns because refresh() eventually calls setCart()
  // inside the effect — that's intentional here (synchronizing
  // client state with the server response, no cascading render
  // problem). Disable the strict rule rather than restructure.
  useEffect(() => {
    void refresh(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [refresh]);

  const add = useCallback<CartContextValue["add"]>(async (input) => {
    const res = await apiAdd(input);
    if (res.ok) {
      setCart(res.data);
      reportAddToCart(input, res.data);
      return { ok: true };
    }
    return { ok: false, message: res.message, conflict: res.conflict };
  }, []);

  const update = useCallback<CartContextValue["update"]>(async (itemId, qty) => {
    const res = await apiUpdate(itemId, qty);
    if (res.ok) setCart(res.data);
  }, []);

  const patchItem = useCallback<CartContextValue["patchItem"]>(async (itemId, patch) => {
    const res = await apiUpdate(itemId, patch);
    if (res.ok) {
      setCart(res.data);
      return { ok: true };
    }
    return { ok: false, message: res.message };
  }, []);

  const remove = useCallback<CartContextValue["remove"]>(async (itemId) => {
    const res = await apiRemove(itemId);
    if (res.ok) setCart(res.data);
  }, []);

  const clear = useCallback<CartContextValue["clear"]>(async () => {
    const res = await apiClear();
    if (res.ok) setCart(res.data);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({ cart, loading, refresh, add, update, patchItem, remove, clear }),
    [cart, loading, refresh, add, update, patchItem, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside <CartProvider>");
  return ctx;
}
