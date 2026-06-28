import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, XCircle, Loader2, Stethoscope, ShieldCheck, BadgeCheck, Clock } from "lucide-react";

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
      className="gh2-hero gh-medical-pattern gh-medical-pattern-dark relative isolate overflow-hidden"
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
          {/* Compact step indicator for narrow screens — the full stepper
              wraps and compresses below ~640px, so collapse it to a single
              legible "Step n / total · Label" line on mobile. */}
          <p className="flex items-center gap-2 text-[13px] font-semibold sm:hidden">
            <span className="gh2-index" style={{ color: "var(--color-brand-accent)" }}>
              {String(activeStep).padStart(2, "0")}
            </span>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>/ {String(steps.length).padStart(2, "0")}</span>
            <span style={{ color: "var(--color-brand-accent)" }}>{steps[activeStep - 1]}</span>
          </p>
          <ol className="hidden flex-wrap items-center gap-2 sm:flex lg:justify-end">
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
  children,
  activeTab,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  body?: ReactNode;
  children: ReactNode;
  activeTab?: "login" | "register";
}) {
  const STATS = [
    { value: "24/7", label: "Always on" },
    { value: "47k+", label: "Patients" },
    { value: "4", label: "Countries" },
  ];

  return (
    <div className="gh2-auth-shell lg:grid lg:grid-cols-[52%_48%]" style={{ minHeight: "calc(100svh - var(--header-height))" }}>
      {/* LEFT — editorial dark panel, desktop only */}
      <aside
        className="gh2-auth-shell-left gh2-hero gh-medical-pattern gh-medical-pattern-dark relative hidden overflow-hidden lg:flex lg:flex-col"
      >
        {/* Dot grid — masked radial fade */}
        <div
          aria-hidden
          className="gh-dot-grid pointer-events-none absolute inset-0"
          style={{ opacity: 0.38, maskImage: "radial-gradient(640px 500px at 22% 32%, #000 0%, transparent 70%)" }}
        />
        {/* Primary lime bloom */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: "20%", top: "12%", width: 560, height: 560, background: "radial-gradient(circle, rgba(176,241,34,0.12), transparent 60%)", filter: "blur(12px)" }}
        />
        {/* Secondary bloom — lower right for depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{ right: "8%", bottom: "18%", width: 300, height: 300, background: "radial-gradient(circle, rgba(176,241,34,0.07), transparent 65%)", filter: "blur(20px)" }}
        />
        {/* Giant "Health" watermark */}
        <div
          aria-hidden
          className="gh2-watermark pointer-events-none absolute select-none"
          style={{ right: "-0.05em", bottom: "-0.13em", fontSize: "clamp(6rem,15vw,14rem)", WebkitTextStroke: "1.5px rgba(255,255,255,0.06)" }}
        >
          Health
        </div>

        <div
          className="relative z-[1] flex flex-1 flex-col"
          style={{ padding: "clamp(36px,4.5vw,56px) clamp(30px,4vw,52px)" }}
        >
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 text-white">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-[#0a1f14]">
              <Stethoscope className="size-5" aria-hidden />
            </span>
            <span className="text-[15px] font-extrabold tracking-[-0.02em]">Global Health</span>
          </Link>

          {/* Headline block — grows to fill space */}
          <div className="my-auto" style={{ maxWidth: "30ch", paddingTop: "clamp(40px,5vw,64px)", paddingBottom: "clamp(40px,5vw,64px)" }}>
            <p
              className="gh2-index"
              style={{ color: "var(--color-brand-accent)", marginBottom: "1rem" }}
            >
              {eyebrow}
            </p>
            <h2
              className="font-extrabold tracking-[-0.045em]"
              style={{ fontSize: "clamp(2.8rem,5vw,4.4rem)", lineHeight: 0.93, color: "rgba(255,255,255,0.95)" }}
            >
              {title}
              <br />
              <span className="gh-accent-glow">{accent}</span>
            </h2>

            {/* Live pill */}
            <div
              className="mt-7 inline-flex items-center gap-2.5 rounded-full px-4 py-2"
              style={{ background: "rgba(176,241,34,0.08)", border: "1px solid rgba(176,241,34,0.20)" }}
            >
              <span className="gh2-live-dot" style={{ width: 8, height: 8 }} />
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.72)", fontWeight: 600 }}>
                Doctors available now
              </span>
            </div>

            {/* Editorial stat strip — replaces generic 3-card list */}
            <dl
              className="mt-8 grid grid-cols-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.09)", paddingTop: "1.5rem", gap: 0 }}
            >
              {STATS.map((s, i) => (
                <div
                  key={s.value}
                  style={i > 0 ? { borderLeft: "1px solid rgba(255,255,255,0.09)", paddingLeft: "1.25rem" } : {}}
                >
                  <dt
                    className="font-extrabold tracking-[-0.03em]"
                    style={{ fontSize: "clamp(1.5rem,2.2vw,2rem)", color: "var(--color-brand-accent)", lineHeight: 1 }}
                  >
                    {s.value}
                  </dt>
                  <dd
                    style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.36)", fontWeight: 600,
                      letterSpacing: "0.10em", textTransform: "uppercase", marginTop: "0.4rem" }}
                  >
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Testimonial — glass card, human identity */}
          <div className="gh-glass-emerald rounded-2xl p-5">
            <p style={{ fontSize: "13.5px", lineHeight: 1.65, color: "rgba(255,255,255,0.58)", fontStyle: "italic" }}>
              &ldquo;Saw a specialist within the hour. No waiting room, no travel — completely changed how I think about healthcare.&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <span
                className="inline-flex size-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "rgba(176,241,34,0.14)", color: "var(--color-brand-accent)" }}
              >
                FM
              </span>
              <p style={{ fontSize: "10.5px", letterSpacing: "0.09em", color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>
                FIONNUALA M · PATIENT · DUBLIN
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT — form column */}
      <main
        className="gh2-auth-shell-right flex flex-col items-center justify-center px-5 py-12 lg:px-12"
        style={{ background: "#fff", minHeight: "calc(100svh - var(--header-height))" }}
      >
        <div className="w-full" style={{ maxWidth: "400px" }}>
          {/* Mobile: slim branded strip */}
          <div className="gh2-hero gh-medical-pattern gh-medical-pattern-dark -mx-5 mb-9 flex items-center justify-between px-5 py-3.5 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-[#0a1f14]">
                <Stethoscope className="size-3.5" aria-hidden />
              </span>
              <div>
                <p className="text-[12px] font-extrabold leading-none text-white">Global Health</p>
                <p className="mt-0.5" style={{ fontSize: "10.5px", color: "rgba(176,241,34,0.80)" }}>
                  {title} {accent}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="gh2-live-dot" style={{ width: 7, height: 7 }} />
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.50)" }}>Live</span>
            </div>
          </div>

          {/* Underline tab switcher — editorial, not generic pill */}
          {activeTab ? (
            <div
              className="mb-8 flex gap-6"
              style={{ borderBottom: "1px solid var(--color-border)" }}
              role="tablist"
              aria-label="Authentication"
            >
              <Link
                href="/login"
                role="tab"
                aria-selected={activeTab === "login"}
                className="pb-3 text-[14px] font-bold transition-colors duration-200"
                style={{
                  marginBottom: "-1px",
                  color: activeTab === "login" ? "var(--color-text-primary)" : "var(--color-text-muted)",
                  borderBottom: activeTab === "login" ? "2px solid var(--color-brand-primary)" : "2px solid transparent",
                }}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                role="tab"
                aria-selected={activeTab === "register"}
                className="pb-3 text-[14px] font-bold transition-colors duration-200"
                style={{
                  marginBottom: "-1px",
                  color: activeTab === "register" ? "var(--color-text-primary)" : "var(--color-text-muted)",
                  borderBottom: activeTab === "register" ? "2px solid var(--color-brand-primary)" : "2px solid transparent",
                }}
              >
                Create account
              </Link>
            </div>
          ) : null}

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
