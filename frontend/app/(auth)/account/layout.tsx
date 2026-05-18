import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CreditCard,
  PillBottle,
  ShieldCheck,
  UserRound,
  Stethoscope,
} from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { AccountHeaderLogout } from "./_components/account-header-logout";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME?.trim() || "gh_auth";

/**
 * Patient portal layout. Mirrors the doctor + admin shells so the three
 * portals share one visual language: dark sidebar + light header + main
 * content area.
 *
 * Auth gating: server-side role check; only PATIENT users may proceed.
 * ADMIN / DOCTOR sessions are redirected to their respective portals so
 * the patient surface stays scoped to a single user's own data.
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getServerAuthUser();
  if (!user) redirect("/login?next=/account");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "DOCTOR") redirect("/doctor");

  async function logoutAction() {
    "use server";
    const jar = await cookies();
    jar.delete(AUTH_COOKIE_NAME);
    redirect("/login?next=/account");
  }

  const sections = [
    { href: "/account", label: "Overview", icon: LayoutDashboard },
    { href: "/account/bookings", label: "My bookings", icon: CalendarDays },
    { href: "/account/prescriptions", label: "Prescriptions", icon: PillBottle },
    { href: "/account/payments", label: "Payments", icon: CreditCard },
    { href: "/account/profile", label: "Profile", icon: UserRound },
    { href: "/account/security", label: "Security", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)]">
      <div className="flex min-h-screen">
        <aside
          className="hidden w-[260px] flex-col text-white shadow-2xl lg:flex"
          style={{
            background: "var(--color-background-dark)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="px-5 pb-[18px] pt-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Link href="/account" className="inline-flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/global-health-official.png"
                alt="Global Health"
                style={{ height: 36, width: "auto", filter: "brightness(0) invert(1)" }}
              />
            </Link>
            <p
              className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--color-accent)" }}
            >
              Patient portal
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pt-2">
            <div className="grid gap-0.5">
              {sections.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center gap-2.5 transition-colors duration-150"
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  <s.icon className="size-4" aria-hidden />
                  {s.label}
                </Link>
              ))}
            </div>

            <div
              className="mt-4 pt-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Link
                href="/"
                className="flex items-center gap-2.5 transition-colors duration-150"
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  color: "var(--color-accent)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Stethoscope className="size-4" aria-hidden />
                Book a consultation
              </Link>
            </div>
          </nav>

          <div
            className="px-5 py-4 text-[11px]"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <p>{user.fullName || user.email}</p>
            <form action={logoutAction} className="mt-2">
              <button
                type="submit"
                className="text-[11px] font-semibold hover:text-white"
              >
                Sign out →
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="flex h-16 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-background-page)] px-4 sm:px-7"
          >
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Patient portal
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-muted)]">
                {user.fullName || user.email}
              </span>
              <AccountHeaderLogout />
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
