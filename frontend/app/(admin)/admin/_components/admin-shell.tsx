"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, Stethoscope, X } from "lucide-react";
import { Toaster } from "sonner";
import { CountryPicker } from "./country-picker";
import { signOutAction } from "@/app/admin/login/actions";
import type { CountryOption } from "@/lib/admin/country-scope";
import type { AdminUser } from "@/lib/auth/server-session";

type Section = { href: string; label: string };

export function AdminShell({
  user,
  countries,
  activeCountry,
  sections,
  countrySections,
  children,
}: {
  user: AdminUser;
  countries: CountryOption[];
  activeCountry: CountryOption | null;
  sections: Section[];
  countrySections: Section[];
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-background-page)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-label={navOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={navOpen}
              className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-primary)] lg:hidden"
            >
              {navOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
            </button>
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
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <CountryPicker countries={countries} current={activeCountry} />
            </div>
            <div className="hidden text-right md:block">
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
        <div className="block border-t border-[var(--color-border)] px-4 py-3 sm:hidden">
          <CountryPicker countries={countries} current={activeCountry} />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar — drawer on small screens, sticky column on lg+ */}
        {navOpen ? (
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-30 bg-[var(--color-background-dark)]/40 backdrop-blur-sm lg:hidden"
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-[var(--color-border)] bg-[var(--color-background-page)] px-4 py-6 transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:border-none lg:bg-transparent lg:p-0 lg:self-start ${
            navOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="grid gap-1.5 lg:sticky lg:top-6">
            <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Global
            </p>
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                onClick={() => setNavOpen(false)}
                className="gh-admin-nav-link"
              >
                {section.label}
              </Link>
            ))}

            {activeCountry ? (
              <>
                <p className="mt-4 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  {activeCountry.code} — {activeCountry.name}
                </p>
                {countrySections.map((section) => (
                  <Link
                    key={section.href}
                    href={section.href}
                    onClick={() => setNavOpen(false)}
                    className="gh-admin-nav-link"
                  >
                    {section.label}
                  </Link>
                ))}
              </>
            ) : null}
          </nav>
        </aside>

        <main className="gh-admin-main min-w-0">{children}</main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm shadow-md",
            title: "font-semibold text-[var(--color-text-primary)]",
            description: "text-[var(--color-text-muted)]",
          },
        }}
      />
    </div>
  );
}
