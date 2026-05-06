import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./ui";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset for your account.",
};

export default function Page() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <article className="gh-card p-6 sm:p-8">
        <p className="gh-kicker">Account recovery</p>
        <h1 className="gh-h2 mt-5 text-[var(--color-text-primary)]">Forgot password</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Enter your email and we will accept the reset request. If the account exists,
          reset instructions may be sent when email delivery is enabled.
        </p>
        <ForgotPasswordForm />
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Back to <Link href="/login" className="gh-link">login</Link>
        </p>
      </article>
    </section>
  );
}
