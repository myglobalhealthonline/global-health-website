import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, XCircle, Loader2, Stethoscope } from "lucide-react";

export function GH2SectionHeader({
  index,
  eyebrow,
  headline,
  accent,
  body,
  dark = false,
}: {
  index: string;
  eyebrow: string;
  headline: string;
  accent: string;
  body?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-3">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)" }}
        >
          {eyebrow}
        </span>
      </p>
      <h2
        className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
        style={{
          fontSize: "clamp(2.1rem, 4vw + 0.5rem, 3.6rem)",
          color: dark ? "rgba(255,255,255,0.95)" : "var(--color-text-primary)",
          maxWidth: "17ch",
        }}
      >
        {headline}{" "}
        <span style={{ color: dark ? "var(--color-brand-accent)" : "#8FB021" }}>{accent}</span>
      </h2>
      {body ? (
        <p
          className="mt-5 leading-relaxed"
          style={{
            fontSize: "var(--text-body-lg)",
            color: dark ? "rgba(255,255,255,0.55)" : "var(--color-text-muted)",
            maxWidth: "42ch",
          }}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

export function GH2CompactHero({
  eyebrow,
  title,
  accent,
  body,
  watermark,
  meta,
  backHref,
  backLabel,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  body?: ReactNode;
  watermark?: string;
  meta?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section
      className="gh2-hero relative isolate overflow-hidden"
      style={{
        padding: "clamp(56px,7vw,96px) 0 clamp(40px,5vw,64px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {watermark ? (
        <div
          aria-hidden
          className="gh2-watermark pointer-events-none absolute -right-[0.08em] bottom-[-0.18em] select-none"
          style={{ fontSize: "clamp(4.5rem,14vw,13rem)" }}
        >
          {watermark}
        </div>
      ) : null}
      <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="mb-8 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45 transition-colors hover:text-[var(--color-brand-accent)]"
          >
            {backLabel}
          </Link>
        ) : null}
        <p className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
            {eyebrow}
          </span>
        </p>
        <h1
          className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
          style={{ fontSize: "clamp(2.2rem,5vw,4.2rem)", color: "rgba(255,255,255,0.95)", maxWidth: "18ch" }}
        >
          {title}
          {accent ? <> <span style={{ color: "var(--color-brand-accent)" }}>{accent}</span></> : null}
        </h1>
        {body ? (
          <p
            className="mt-5 max-w-[44ch] text-[length:var(--text-body-lg)] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.58)" }}
          >
            {body}
          </p>
        ) : null}
        {meta ? (
          <div
            className="mt-6 border-t pt-4"
            style={{ borderColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }}
          >
            {meta}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function GH2FlowHeader({
  title,
  subtitle,
  activeStep = 1,
  steps = ["Service", "Doctor", "Time", "Details"],
}: {
  title: string;
  subtitle?: ReactNode;
  activeStep?: number;
  steps?: string[];
}) {
  return (
    <section
      className="relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark"
      style={{
        background: "linear-gradient(172deg, #1D4B36 0%, #15382A 100%)",
        padding: "28px 0 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.55fr)_1fr] lg:items-end">
          <div>
            <h1
              className="font-extrabold tracking-[-0.03em]"
              style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", lineHeight: 1, color: "rgba(255,255,255,0.95)" }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <ol className="flex flex-wrap items-center gap-2 lg:justify-end">
            {steps.map((step, index) => {
              const n = index + 1;
              const done = n < activeStep;
              const active = n === activeStep;
              return (
                <li key={step} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden className="h-px w-5 bg-white/15" /> : null}
                  <span
                    className="gh2-index"
                    style={{ color: active ? "var(--color-brand-accent)" : done ? "rgba(255,255,255,0.60)" : "rgba(255,255,255,0.30)" }}
                  >
                    {String(n).padStart(2, "0")}
                  </span>
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: active ? "var(--color-brand-accent)" : done ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.34)" }}
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function GH2StatusPage({
  status,
  title,
  body,
  reference,
  children,
}: {
  status: "success" | "cancelled" | "loading" | "error";
  title: string;
  body: ReactNode;
  reference?: ReactNode;
  children?: ReactNode;
}) {
  const Icon = status === "success" ? CheckCircle2 : status === "loading" ? Loader2 : XCircle;
  const isSuccess = status === "success";
  return (
    <section className="flex min-h-[calc(100dvh-var(--header-height))] items-center bg-[var(--color-background-soft)] px-5 py-16">
      <div className="mx-auto w-full max-w-[560px] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-7 text-center shadow-[var(--shadow-card)] sm:p-10">
        <span
          className="relative mx-auto inline-flex size-16 items-center justify-center rounded-full"
          style={{ background: isSuccess ? "var(--color-brand-accent)" : "var(--color-background-panel)", color: isSuccess ? "#0a1f14" : "var(--color-brand-primary)" }}
        >
          {isSuccess ? <span aria-hidden className="gh2-live-dot absolute -right-0.5 -top-0.5" /> : null}
          <Icon className={`size-9 ${status === "loading" ? "animate-spin" : ""}`} aria-hidden />
        </span>
        <h1 className="mt-6 text-[clamp(1.8rem,4vw,2.7rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-[var(--color-text-primary)]">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-[42ch] text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          {body}
        </p>
        {reference ? (
          <div className="mt-6 border-y border-[var(--color-border)] py-4 text-left gh2-index text-[var(--color-brand-primary)]">
            {reference}
          </div>
        ) : null}
        {children ? <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

export function GH2AuthShell({
  eyebrow,
  title,
  accent,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  body: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1fr_1fr]">
      <aside className="gh2-hero relative hidden overflow-hidden px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="gh2-watermark pointer-events-none absolute -left-8 bottom-10 text-[clamp(5rem,10vw,10rem)]">
          Global Health
        </div>
        <Link href="/" className="relative z-10 inline-flex items-center gap-2 text-white">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-[#0a1f14]">
            <Stethoscope className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-extrabold tracking-[-0.02em]">Global Health</span>
        </Link>
        <div className="relative z-10 max-w-[520px]">
          <p className="gh2-index text-[var(--color-brand-accent)]">{eyebrow}</p>
          <h1 className="mt-5 text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-white/95">
            {title} <span className="text-[var(--color-brand-accent)]">{accent}</span>
          </h1>
          <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-white/55">{body}</p>
          <div className="mt-10 grid grid-cols-3 border-t border-white/10 pt-6">
            {["GDPR", "JWT", "24h"].map((item, index) => (
              <div key={item} className={index > 0 ? "border-l border-white/10 pl-5" : ""}>
                <p className="gh2-index text-[var(--color-brand-accent)]">{item}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">
                  {index === 0 ? "Privacy" : index === 1 ? "Secure session" : "Response"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <main className="flex min-h-screen items-center px-5 py-10">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-white">
              <Stethoscope className="size-4" aria-hidden />
            </span>
            <span className="font-extrabold text-[var(--color-text-primary)]">Global Health</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function GH2PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="gh2-btn-lime">
      {children}
      <ArrowUpRight className="size-4" aria-hidden />
    </Link>
  );
}
