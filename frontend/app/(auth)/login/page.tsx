import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Stethoscope, Clock } from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { LoginForm } from "./ui";

export const metadata: Metadata = {
  title: "Log In",
  description: "Patient and admin login for Global Health.",
};

export default async function Page() {
  const user = await getServerAuthUser();
  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/account");
  }

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
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-stretch">
          {/* Trust panel */}
          <div className="flex flex-col justify-between rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-8 text-white sm:p-10">
            <div>
              <p className="gh-heading-eyebrow text-white/80">Global Health Platform</p>
              <h1 className="mt-6 text-[var(--text-h1)] font-extrabold leading-[1.08] tracking-tight">
                Welcome back
              </h1>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85">
                Sign in to manage your consultations, track booking requests, and access your patient records securely.
              </p>
            </div>

            <div className="mt-10 space-y-5">
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <ShieldCheck className="size-5 text-white" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">Secure & confidential</p>
                  <p className="text-sm text-white/70">Your data is protected and never shared.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Stethoscope className="size-5 text-white" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">Credential-checked clinicians</p>
                  <p className="text-sm text-white/70">Connect with qualified medical professionals.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Clock className="size-5 text-white" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">Practical follow-up</p>
                  <p className="text-sm text-white/70">We follow up on every booking request promptly.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="flex flex-col justify-center">
            <div className="gh-card p-7 sm:p-10">
              <h2 className="gh-h3 text-[var(--color-text-primary)]">Sign in to your account</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Enter your email and password to continue.
              </p>
              <LoginForm />
              <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
                New patient?{" "}
                <Link href="/register" className="gh-link">Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
