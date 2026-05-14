import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { getAdminUser } from "@/lib/auth/server-session";
import { signOutAction } from "./login/actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getAdminUser();
  if (!user) {
    redirect("/admin/login?next=/admin");
  }

  const sections = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/appointments", label: "Appointments" },
    { href: "/admin/countries", label: "Countries" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/doctors", label: "Doctors" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/pricing", label: "Pricing" },
    { href: "/admin/assets", label: "Assets" },
    ...(user.role === "SUPER_ADMIN"
      ? [
          { href: "/admin/users", label: "Admin users" },
          { href: "/admin/audit", label: "Audit log" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-background-page)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-[var(--color-brand-primary)]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] text-white">
              <Stethoscope className="size-4" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight">Global Health</span>
            <span className="hidden text-sm font-medium text-[var(--color-text-muted)] sm:inline">
              · Admin
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {user.name ?? user.email}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {user.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
              </p>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="gh-btn gh-btn-soft text-sm">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:self-start">
          <nav className="sticky top-6 grid gap-1.5">
            {sections.map((section) => (
              <Link key={section.href} href={section.href} className="gh-admin-nav-link">
                {section.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="gh-admin-main min-w-0">{children}</main>
      </div>
    </div>
  );
}
