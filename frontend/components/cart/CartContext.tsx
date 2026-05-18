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

  useEffect(() => {
    void refresh();
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

  const remove = useCallback<CartContextValue["remove"]>(async (itemId) => {
    const res = await apiRemove(itemId);
    if (res.ok) setCart(res.data);
  }, []);

  const clear = useCallback<CartContextValue["clear"]>(async () => {
    const res = await apiClear();
    if (res.ok) setCart(res.data);
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, refresh, add, update, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside <CartProvider>");
  return ctx;
}
