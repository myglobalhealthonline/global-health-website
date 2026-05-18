import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Stethoscope,
  Calendar,
  Users,
  UserCog,
  BarChart3,
  FileText,
  Bell,
  Receipt,
} from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { fetchDoctorNotifications } from "@/lib/api/doctor-api";
import { DoctorHeaderLogout } from "./_components/doctor-header-logout";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME?.trim() || "gh_auth";

/**
 * Doctor portal layout. Mirrors the admin shell minus the
 * country-scoped section and the global ops links — doctors only see
 * their own surface.
 *
 * Auth gating is double-layered: this layout re-checks role server-side
 * AND the edge proxy at `frontend/proxy.ts` rejects /doctor/* for
 * non-doctor sessions before SSR runs. Belt + braces because the
 * patient portal already lives at /account and we never want a
 * misrouted patient to see another patient's data.
 */
export default async function DoctorLayout({ children }: { children: ReactNode }) {
  const user = await getServerAuthUser();
  if (!user) redirect("/login?next=/doctor");
  // Only DOCTOR + ADMIN sessions may proceed. Patients land on /account.
  // ADMIN is allowed for support — they can shoulder-surf doctor screens
  // without having to swap accounts.
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
    redirect("/account");
  }

  async function logoutAction() {
    "use server";
    const jar = await cookies();
    jar.delete(AUTH_COOKIE_NAME);
    redirect("/login?next=/doctor");
  }

  // Best-effort unread-count fetch for the bell badge. Failures fall
  // through to "0" so the nav never blocks the layout render.
  let unreadCount = 0;
  if (user.role === "DOCTOR") {
    const notif = await fetchDoctorNotifications(true);
    if (notif.ok) unreadCount = notif.data.unreadCount;
  }

  const sections = [
    { href: "/doctor", label: "Overview", icon: Stethoscope, badge: 0 },
    { href: "/doctor/appointments", label: "Appointments", icon: Calendar, badge: 0 },
    { href: "/doctor/patients", label: "Patients", icon: Users, badge: 0 },
    { href: "/doctor/forms", label: "Forms", icon: FileText, badge: 0 },
    { href: "/doctor/invoices", label: "Invoices", icon: Receipt, badge: 0 },
    { href: "/doctor/reports", label: "Reports", icon: BarChart3, badge: 0 },
    {
      href: "/doctor/notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadCount,
    },
    { href: "/doctor/profile", label: "Profile", icon: UserCog, badge: 0 },
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
            <Link href="/doctor" className="inline-flex items-center gap-2.5">
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
              Doctor portal
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pt-2">
            <div className="grid gap-0.5">
              {sections.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center justify-between gap-2.5 transition-colors duration-150"
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <s.icon className="size-4" aria-hidden />
                    {s.label}
                  </span>
                  {s.badge > 0 ? (
                    <span
                      className="inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                      style={{
                        background: "var(--color-accent)",
                        color: "var(--color-background-dark)",
                      }}
                    >
                      {s.badge > 99 ? "99+" : s.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
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
              Doctor portal
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-muted)]">
                {user.fullName || user.email}
              </span>
              <DoctorHeaderLogout />
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
