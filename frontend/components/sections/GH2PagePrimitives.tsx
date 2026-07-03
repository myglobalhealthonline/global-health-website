import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, XCircle, Loader2, Stethoscope, ShieldCheck, BadgeCheck, Clock, Lock } from "lucide-react";

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
            color: dark ? "rgba(255,255,255,0.72)" : "var(--color-text-muted)",
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
            className="gh-focus-on-dark mb-8 inline-flex min-h-11 items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-[var(--color-brand-accent)]"
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
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            {body}
          </p>
        ) : null}
        {meta ? (
          <div
            className="mt-6 border-t pt-4"
            style={{ borderColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.70)" }}
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
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
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
  body,
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
  const TRUST = [
    { v: "GDPR", l: "Privacy protected", icon: <ShieldCheck className="size-[15px]" aria-hidden /> },
    { v: "JWT",  l: "Secure session",    icon: <Lock className="size-[15px]" aria-hidden /> },
    { v: "24h",  l: "Response support",  icon: <Clock className="size-[15px]" aria-hidden /> },
  ];

  return (
    // min-height (not fixed height + overflow:hidden) so short viewports and
    // zoomed text can scroll instead of trapping content off-screen. The left
    // brand panel stays sticky-height via lg:min-h and its own layout.
    <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "100svh" }}>
      {/* Skip link — mirrors the public SiteChrome accessibility contract. */}
      <a href="#main-content" className="gh-skip-link">
        Skip to main content
      </a>

      {/* ── LEFT — brand panel (desktop only) ──────────────────────── */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:flex-col"
        style={{ background: "linear-gradient(155deg, #0C4A35 0%, #073526 38%, #062E22 65%, #041A12 100%)" }}
      >
        {/* Lime radial bloom — upper */}
        <div aria-hidden className="pointer-events-none absolute" style={{ left: "18%", top: "14%", width: 520, height: 520, background: "radial-gradient(circle, rgba(166,242,15,0.11) 0%, transparent 65%)", filter: "blur(24px)" }} />
        {/* Lime bloom — lower right */}
        <div aria-hidden className="pointer-events-none absolute" style={{ right: "6%", bottom: "22%", width: 260, height: 260, background: "radial-gradient(circle, rgba(166,242,15,0.07) 0%, transparent 65%)", filter: "blur(20px)" }} />
        {/* Medical cross grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0.04,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "28px",
          }}
        />

        <div className="relative z-10 flex flex-1 flex-col" style={{ padding: "clamp(40px,5vw,60px) clamp(36px,4.5vw,56px)" }}>
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3" style={{ textDecoration: "none" }}>
            <span style={{ display: "inline-flex", width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--color-brand-accent)", flexShrink: 0 }}>
              <Stethoscope style={{ width: 20, height: 20, color: "#062E22" }} aria-hidden />
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>Global Health</span>
          </Link>

          {/* Headline — flex-grows to center */}
          <div className="my-auto" style={{ paddingTop: "clamp(44px,6vw,72px)", paddingBottom: "clamp(44px,6vw,72px)" }}>
            {/* Eyebrow pill */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, marginBottom: "1.5rem", background: "rgba(166,242,15,0.09)", border: "1px solid rgba(166,242,15,0.22)" }}>
              <ShieldCheck style={{ width: 12, height: 12, color: "var(--color-brand-accent)" }} aria-hidden />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-brand-accent)" }}>
                {eyebrow}
              </span>
            </div>

            <h2 style={{ fontSize: "clamp(2.8rem,4.5vw,4.2rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.95, color: "rgba(255,255,255,0.94)", maxWidth: "15ch" }}>
              {title}
              <br />
              <span style={{ color: "var(--color-brand-accent)" }}>{accent}</span>
            </h2>

            {body ? (
              <p style={{ marginTop: "1.25rem", fontSize: 17, lineHeight: 1.65, color: "rgba(255,255,255,0.50)", maxWidth: "34ch" }}>
                {body}
              </p>
            ) : null}
          </div>

          {/* Trust cards — glassmorphism row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {TRUST.map((card) => (
              <div
                key={card.v}
                style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(8px)" }}
              >
                <div style={{ color: "var(--color-brand-accent)", marginBottom: 8 }}>{card.icon}</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.90)", lineHeight: 1 }}>{card.v}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 4, lineHeight: 1.3 }}>{card.l}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── RIGHT — form panel ────────────────────────────────────── */}
      <main
        id="main-content"
        className="relative flex flex-col items-center justify-center px-5 py-8 sm:py-10"
        style={{ background: "#F5F8F5" }}
      >
        <div className="w-full" style={{ maxWidth: 500 }}>
          {/* Mobile brand strip */}
          <div
            className="mb-6 flex items-center gap-3 rounded-2xl lg:hidden"
            style={{ background: "linear-gradient(135deg, #0C4A35, #062E22)", padding: "16px 20px" }}
          >
            <span style={{ display: "inline-flex", width: 36, height: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--color-brand-accent)" }}>
              <Stethoscope style={{ width: 17, height: 17, color: "#062E22" }} aria-hidden />
            </span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1 }}>Global Health</p>
              <p style={{ fontSize: 11, color: "rgba(166,242,15,0.78)", marginTop: 2 }}>{eyebrow}</p>
            </div>
          </div>

          {/* Card */}
          <div
            style={{ background: "#fff", border: "1px solid #E6EDE7", borderRadius: 28, boxShadow: "0 24px 80px rgba(5,45,30,0.10), 0 2px 8px rgba(5,45,30,0.05)", padding: "clamp(36px,5vw,52px) clamp(28px,4vw,48px)" }}
          >
            {/* Badge */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#EBF9D4", border: "1.5px solid rgba(166,242,15,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(5,45,30,0.08)" }}>
                <Stethoscope style={{ width: 26, height: 26, color: "#0E4A35" }} aria-hidden />
              </div>
            </div>

            {/* Tab switcher */}
            {activeTab ? (
              <div
                className="mb-7 flex gap-6"
                style={{ borderBottom: "1px solid #E8EDEA" }}
                role="tablist"
                aria-label="Authentication"
              >
                {(["login", "register"] as const).map((tab) => (
                  <Link
                    key={tab}
                    href={tab === "login" ? "/login" : "/register"}
                    role="tab"
                    aria-selected={activeTab === tab}
                    className="transition-colors duration-150"
                    style={{ display: "inline-flex", alignItems: "flex-end", minHeight: 44, paddingBottom: 12, fontSize: 14, fontWeight: 700, marginBottom: -1, textDecoration: "none", color: activeTab === tab ? "#0E4A35" : "#6E8B79", borderBottom: activeTab === tab ? "2px solid #0E4A35" : "2px solid transparent" }}
                  >
                    {tab === "login" ? "Sign in" : "Create account"}
                  </Link>
                ))}
              </div>
            ) : null}

            {children}

            {/* Security note */}
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <ShieldCheck style={{ width: 13, height: 13, color: "#8AA88D" }} aria-hidden />
                <span style={{ fontSize: 12, color: "#7A9A83", fontWeight: 500 }}>Your data is encrypted and protected</span>
              </div>
              <p style={{ fontSize: 11, color: "#9BB8A0", marginTop: 3 }}>
                We use industry-standard security to keep your information safe.
              </p>
            </div>
          </div>
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
