"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";

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
  const paid = state === "paid";

  return (
    <Shell>
      <Card>
        <div className="flex flex-col items-center gap-3">
          {paid ? (
            <CheckCircle2 className="size-12 text-[var(--color-brand-mint,#8FB021)]" aria-hidden />
          ) : (
            <Clock className="size-12 text-[var(--color-text-muted)]" aria-hidden />
          )}
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {paid ? "Payment received" : "This link has expired"}
          </h1>
          <p className="max-w-sm text-[15px] leading-relaxed text-[var(--color-text-body)]">
            {paid
              ? "Thank you — your payment has been received and your request has been sent to the prescribing doctor. We'll keep you updated by email."
              : "This request was cancelled because the payment wasn't completed in time. Please ask your doctor to send you a new link to try again."}
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
