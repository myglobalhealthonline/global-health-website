"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, HelpCircle } from "lucide-react";

const FOREST = "#1D4B36";

function Shell({ children }: { children: ReactNode }) {
  return (
    <section
      className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:py-16"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, rgba(176,241,34,0.10) 0%, var(--color-background-soft) 45%)",
      }}
    >
      <div className="w-full max-w-lg">{children}</div>
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface,#fff)] shadow-[0_18px_50px_rgba(4,32,24,0.12)]">
      <div
        aria-hidden
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${FOREST} 0%, #8FB021 55%, #B0F122 100%)` }}
      />
      <div className="p-6 text-center sm:p-9">{children}</div>
    </div>
  );
}

function StatusBody() {
  const state = useSearchParams().get("state");

  if (state === "paid") {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="size-12 text-[var(--color-brand-mint,#8FB021)]" aria-hidden />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Payment received</h1>
            <p className="max-w-sm text-[15px] leading-relaxed text-[var(--color-text-body)]">
              Thank you — your payment has been received and your request has been sent to the
              prescribing doctor. We&rsquo;ll keep you updated by email.
            </p>
          </div>
        </Card>
      </Shell>
    );
  }

  if (state === "expired") {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-3">
            <Clock className="size-12 text-[var(--color-text-muted)]" aria-hidden />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              This link has expired
            </h1>
            <p className="max-w-sm text-[15px] leading-relaxed text-[var(--color-text-body)]">
              This request was cancelled because the payment wasn&rsquo;t completed in time. You can
              book a consultation to get started again.
            </p>
            <Link
              href="/"
              className="gh2-btn-lime mt-2 inline-flex items-center justify-center gap-2"
            >
              Book a consultation
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  // Unknown / indeterminate — never falsely claim paid or expired.
  return (
    <Shell>
      <Card>
        <div className="flex flex-col items-center gap-3">
          <HelpCircle className="size-12 text-[var(--color-text-muted)]" aria-hidden />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            We couldn&rsquo;t confirm this link
          </h1>
          <p className="max-w-sm text-[15px] leading-relaxed text-[var(--color-text-body)]">
            Please try again in a moment. If it keeps happening, contact us or ask your doctor to
            send you a new link.
          </p>
        </div>
      </Card>
    </Shell>
  );
}

export function PayStatusPageClient() {
  return (
    <Suspense
      fallback={
        <Shell>
          <Card>
            <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
          </Card>
        </Shell>
      }
    >
      <StatusBody />
    </Suspense>
  );
}
