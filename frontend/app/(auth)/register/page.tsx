import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./ui";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a patient account for this website.",
};

export default function Page() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <article className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Create account</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Patient account registration. Doctor login is handled in a separate portal.
        </p>
        <RegisterForm />
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Already have an account? <Link href="/login" className="gh-link">Log in</Link>
        </p>
      </article>
    </section>
  );
}
