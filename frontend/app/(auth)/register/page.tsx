import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Stethoscope, ShieldCheck, Clock } from "lucide-react";
import { RegisterForm, RegisterFormFallback } from "./ui";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a patient account for Global Health.",
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
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-stretch">
          {/* Form card */}
          <div className="flex flex-col justify-center">
            <div className="gh-card p-7 sm:p-10">
              <h1 className="gh-h2 text-[var(--color-text-primary)]">Create your account</h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Register to book consultations and track your requests securely.
              </p>
              <Suspense fallback={<RegisterFormFallback />}>
                <RegisterForm />
              </Suspense>
              <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
                Already have an account?{" "}
                <Link href="/login" className="gh-link">Sign in</Link>
              </p>
            </div>
          </div>

          {/* Trust panel */}
          <div className="flex flex-col justify-between rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-8 text-white sm:p-10">
            <div>
              <p className="gh-heading-eyebrow text-white/80">Patient Access</p>
              <h2 className="mt-6 text-[var(--text-h2)] font-extrabold leading-[1.15] tracking-tight">
                Healthcare made simple
              </h2>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85">
                Join thousands of patients accessing licensed clinicians online across Ireland, Portugal, Spain, Czechia, and Romania.
              </p>
            </div>

            <div className="mt-10 space-y-5">
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <ShieldCheck className="size-5 text-white" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">Private & secure</p>
                  <p className="text-sm text-white/70">End-to-end encrypted consultations.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Clock className="size-5 text-white" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">Fast response</p>
                  <p className="text-sm text-white/70">Our team follows up on every request.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
