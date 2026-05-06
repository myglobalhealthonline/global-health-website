import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./ui";

export const metadata: Metadata = {
  title: "Log In",
  description: "Patient and admin login for this website.",
};

export default function Page() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <article className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Log in</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Access your patient account. Doctors do not log in on this website.
        </p>
        <LoginForm />
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          New here? <Link href="/register" className="gh-link">Create an account</Link>
        </p>
      </article>
    </section>
  );
}
