import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { getServerAuthUser } from "@/lib/api/server-auth";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME?.trim() || "gh_auth";

async function logoutAdminAction() {
  "use server";
  const jar = await cookies();
  jar.delete(AUTH_COOKIE_NAME);
  redirect("/login?next=/admin");
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerAuthUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (user.role !== "ADMIN") {
    redirect("/account");
  }

  const sections = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/appointments", label: "Appointments" },
    { href: "/admin/countries", label: "Countries" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/doctors", label: "Doctors" },
    { href: "/admin/pricing", label: "Pricing" },
    { href: "/admin/assets", label: "Assets" },
    { href: "/admin/blog-posts", label: "Blog Posts" },
    { href: "/admin/faqs", label: "FAQs" },
    { href: "/admin/content-pages", label: "Content Pages" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)]">
      {/* Top header */}
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/admin" className="inline-flex items-center gap-2 text-[var(--color-brand-primary)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] text-white">
              <Stethoscope className="size-4" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight">Global Health</span>
            <span className="hidden text-sm font-medium text-[var(--color-text-muted)] sm:inline">· Admin</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{user.fullName}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
            </div>
            <form action={logoutAdminAction}>
              <button type="submit" className="gh-btn gh-btn-soft text-sm">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="lg:self-start">
          <nav className="sticky top-6 grid gap-1.5">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="gh-admin-nav-link"
              >
                {section.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="gh-admin-main min-w-0">{children}</main>
      </div>
    </div>
  );
}
