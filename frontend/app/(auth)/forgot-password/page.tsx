import type { Metadata } from "next";
import Link from "next/link";
import { Stethoscope, ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "./ui";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset for your Global Health account.",
};

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background-soft)]">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-brand-primary)]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] text-white">
            <Stethoscope className="size-4" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">Global Health</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="gh-card p-7 sm:p-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to login
            </Link>

            <h1 className="gh-h2 mt-5 text-[var(--color-text-primary)]">Reset your password</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Enter your email and we will accept the reset request. If the account exists, instructions will be sent when email delivery is enabled.
            </p>

            <ForgotPasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
