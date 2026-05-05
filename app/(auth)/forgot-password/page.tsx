import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "TODO: Implement password reset request and confirmation flow.",
};

export default function Page() {
  return (
    <PageShell
      title="Forgot Password"
      message="TODO: Implement password reset request and confirmation flow."
      ctaHref="/login"
      ctaLabel="Book Online"
    />
  );
}

