import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { LoginForm } from "./ui";

export const metadata: Metadata = {
  title: "Sign in · Global Health admin",
  description: "Admin sign-in for the Global Health super-admin portal.",
};

// Faint repeating "+" medical pattern, 28×28 tile at 5% opacity.
// Sourced verbatim from ui_kits/admin/Screens1.jsx LoginScreen.
const MEDICAL_PATTERN_URL =
  "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E\")";

export default async function Page() {
  const user = await getServerAuthUser();
  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/account");
  }

  return (
    <div
      className="min-h-screen"
      style={{
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
      }}
    >
      {/* ── LEFT — dark brand panel ─────────────────────────── */}
      <aside
        className="relative overflow-hidden text-white"
        style={{
          background: "var(--color-background-dark)",
          padding: "48px 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            opacity: 0.05,
            backgroundImage: MEDICAL_PATTERN_URL,
            backgroundSize: "28px",
          }}
        />

        {/* Top — logo */}
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-extrabold tracking-[-0.02em]"
              style={{
                background: "var(--color-accent)",
                color: "var(--color-brand-primary)",
              }}
            >
              GH
            </span>
            <span className="text-[17px] font-bold leading-tight tracking-[-0.01em] text-white">
              Global Health
            </span>
          </div>
        </div>

        {/* Middle — headline */}
        <div className="relative">
          <p
            className="text-[11px] font-bold uppercase"
            style={{ letterSpacing: "0.22em", color: "var(--color-accent)" }}
          >
            Super admin portal
          </p>
          <h1
            className="mt-4 max-w-[480px] text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Manage every country, doctor, and service from one place.
          </h1>
          <p className="mt-4 max-w-[440px] text-[17px] leading-[1.6] text-white/75">
            Sign in to add countries, publish services, and review patient bookings across the network.
          </p>
        </div>

        {/* Footer */}
        <p className="relative m-0 text-[12px] text-white/45">
          v1.0 · Medicine without borders
        </p>
      </aside>

      {/* ── RIGHT — sign-in form ────────────────────────────── */}
      <main
        className="bg-[var(--color-background-page)]"
        style={{
          display: "grid",
          placeItems: "center",
          padding: 32,
        }}
      >
        <div className="w-full max-w-[400px]">
          <h2
            className="m-0 text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.015em",
            }}
          >
            Welcome back
          </h2>
          <p className="m-0 mt-1.5 text-[14px] text-[var(--color-text-muted)]">
            Sign in to the Global Health admin portal.
          </p>

          <div className="mt-7">
            <LoginForm />
          </div>

          <p className="mt-4 text-center text-[12px] text-[var(--color-text-muted)]">
            Sessions are JWT, secured with httpOnly cookies. All actions are logged.
          </p>
        </div>
      </main>
    </div>
  );
}
