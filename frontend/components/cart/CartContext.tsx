"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  return (
    <CartContext.Provider value={{ cart, loading, refresh, add, update, patchItem, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside <CartProvider>");
  return ctx;
}
