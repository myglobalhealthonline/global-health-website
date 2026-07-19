import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export const metadata: Metadata = buildPublicMetadata({
  path: "/login",
  title: "Secure account access",
  description: "Sign in or create an account securely with Global Health.",
  kind: "page",
  noindex: true,
});

export default function PublicAuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
