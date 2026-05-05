import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Log In",
  description: "TODO: Implement authentication login form and validation.",
};

export default function Page() {
  return (
    <PageShell
      title="Log In"
      message="TODO: Implement authentication login form and validation."
      ctaHref="/book-online"
      ctaLabel="Book Online"
    />
  );
}

