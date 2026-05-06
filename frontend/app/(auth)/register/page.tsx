import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./ui";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a patient account for this website.",
};

export default function Page() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <article className="gh-card p-6 sm:p-8">
        <p className="gh-kicker">Patient Access</p>
        <h1 className="gh-h2 mt-5 text-[var(--color-text-primary)]">Create your account</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Register to track your booking requests and manage your consultation details.
          Doctor portal signup is not part of this website.
        </p>
        <RegisterForm />
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Already have an account? <Link href="/login" className="gh-link">Log in</Link>
        </p>
      </article>
    </section>
  );
}
