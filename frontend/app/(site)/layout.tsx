import type { ReactNode } from "react";
import { PublicAuthProvider } from "@/components/layout/PublicAuthContext";
import { CartProvider } from "@/components/cart/CartContext";
import { MetaPixel } from "@/components/compliance/MetaPixel";
import { GoogleAnalytics } from "@/components/compliance/GoogleAnalytics";

/**
 * Pass-through shell shared by both `(global)` (no country/lang URL
 * segment) and `[country]/[lang]` (P-001). Zero headers()/cookies(), zero
 * fetches — the header/footer chrome and the country/locale resolution
 * they need live in each sibling's own layout, which is what lets
 * `[country]/[lang]/*` pages become statically generated.
 *
 * MetaPixel/GoogleAnalytics must never load on (auth)/(admin)/(doctor) portal
 * routes and must be consent-gated (S-027) — this layout is scoped to (site) only,
 * same as before the split. CartProvider stays here rather than the true
 * root: CartIcon in SiteHeader needs it on every public page, but zero
 * portal pages render cart UI, so hoisting further would ship a client
 * fetch nothing there uses.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <PublicAuthProvider>
      <CartProvider>
        <MetaPixel />
        <GoogleAnalytics />
        {children}
      </CartProvider>
    </PublicAuthProvider>
  );
}
