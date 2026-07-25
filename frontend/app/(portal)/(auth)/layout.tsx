import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart/CartContext";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
