import type { Metadata } from "next";
import type { ReactNode } from "react";

// Auth + account pages must not be indexed by search engines — they are
// per-user, behind login, or transient (verify-email, reset-password).
// Without this they fall back to the root metadata ("Online medical
// consultations…") and can surface in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
