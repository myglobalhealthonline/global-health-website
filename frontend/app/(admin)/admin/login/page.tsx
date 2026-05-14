import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { getAdminUser } from "@/lib/auth/server-session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in · Global Health",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: Promise<{ next?: string; error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const existing = await getAdminUser();
  if (existing) {
    redirect("/admin");
  }

  const params = searchParams ? await searchParams : {};
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/admin";

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#0F2E25] text-white lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative inline-flex items-center gap-2 text-white">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#B0F122] text-[#0F2E25]">
            <Stethoscope className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">Global Health</span>
          <span className="text-sm font-medium text-white/70">· Admin</span>
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B0F122]">
            Super admin portal
          </p>
          <h1 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Medicine without borders, managed in one place.
          </h1>
          <p className="mt-4 text-white/75">
            Countries, doctors, services, and appointment requests — all from a
            single signed-in dashboard.
          </p>
        </div>
        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} Global Health
        </p>
      </section>

      <section className="flex items-center justify-center bg-white p-6 text-[#0F2E25] sm:p-12">
        <div className="w-full max-w-sm">
          <header className="mb-8">
            <div className="inline-flex items-center gap-2 text-[#1B4D3E] lg:hidden">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B4D3E] text-white">
                <Stethoscope className="size-4" aria-hidden />
              </span>
              <span className="text-base font-bold tracking-tight">Global Health</span>
            </div>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-[#5A6B64]">
              Use your admin credentials.
            </p>
          </header>

          <LoginForm next={nextPath} initialError={params.error} />

          <p className="mt-8 text-xs text-[#5A6B64]">
            Trouble signing in? Contact the super admin to reset your access.
          </p>
        </div>
      </section>
    </main>
  );
}
