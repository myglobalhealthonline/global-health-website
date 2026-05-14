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
    <div className="min-h-screen bg-[var(--color-background-soft,#F4F8F4)]">
      <header className="border-b border-[#D8E0D8] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-[#1B4D3E]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B4D3E] text-white">
              <Stethoscope className="size-4" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight">Global Health</span>
            <span className="hidden text-sm font-medium text-[#5A6B64] sm:inline">
              · Admin
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#0F2E25]">
                {user.name ?? user.email}
              </p>
              <p className="text-xs text-[#5A6B64]">
                {user.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
              </p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#D8E0D8] bg-white px-4 text-sm font-semibold text-[#0F2E25] transition hover:-translate-y-px hover:shadow-sm"
              >
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
              <Link
                key={section.href}
                href={section.href}
                className="rounded-md px-3 py-2 text-sm font-semibold text-[#2D3B36] transition hover:bg-white"
              >
                {section.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
