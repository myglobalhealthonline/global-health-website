import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Register",
  description: "TODO: Implement account registration flow and verification.",
};

export default function Page() {
  return (
    <PageShell
      title="Register"
      message="TODO: Implement account registration flow and verification."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

