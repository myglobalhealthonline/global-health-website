import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./ui";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset for your account.",
};

export default function Page() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <article className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Forgot password</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Placeholder-safe flow: no email delivery yet, but requests are accepted without account enumeration.
        </p>
        <ForgotPasswordForm />
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Back to <Link href="/login" className="gh-link">login</Link>
        </p>
      </article>
    </section>
  );
}
