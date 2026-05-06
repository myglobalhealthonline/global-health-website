import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthUser } from "@/lib/api/server-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

async function logoutAdminAction() {
  "use server";
  const cookieHeader = (await cookies())
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
  } finally {
    redirect("/login?next=/admin");
  }
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Admin area
            </p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Manage website content</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {user.fullName} ({user.email})
            </p>
          </div>
          <form action={logoutAdminAction}>
            <button type="submit" className="gh-btn">
              Log out
            </button>
          </form>
        </div>
      </header>
      <p className="mb-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        Doctors are public profiles only. Doctor portal is separate. Payments are not enabled yet.
      </p>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="gh-card h-fit p-4">
          <nav className="grid gap-2">
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

