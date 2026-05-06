import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./ui";

export const metadata: Metadata = {
  title: "Log In",
  description: "Patient and admin login for this website.",
};

export default function Page() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <article className="gh-card bg-[var(--color-background-soft)] p-6 sm:p-8">
          <p className="gh-kicker">Global Health</p>
          <h1 className="gh-h2 mt-5 text-[var(--color-text-primary)]">Welcome back</h1>
          <p className="gh-body mt-3 text-[var(--color-text-muted)]">
            Sign in to continue with your patient account or approved admin workspace.
          </p>
          <div className="mt-6 space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>Manage booking requests and account details with a secure session.</p>
            <p>Doctors are public profiles only. Doctor portal access is separate.</p>
            <p>Payments are not enabled yet in this website workflow.</p>
          </div>
        </article>

        <article className="gh-card p-6 sm:p-8">
          <h2 className="gh-h3 text-[var(--color-text-primary)]">Sign in</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Use your registered email and password.
          </p>
          <LoginForm />
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            New here? <Link href="/register" className="gh-link">Create an account</Link>
          </p>
        </article>
      </div>
    </section>
  );
}
