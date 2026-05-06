"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Shield, Loader2 } from "lucide-react";
import { fetchCurrentUser, logoutUser, type AuthUser } from "@/lib/api/auth-api";

export function AccountSummary() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const result = await fetchCurrentUser();
      if (!mounted) return;
      if (result.ok) {
        setUser(result.data.user);
        setMessage(null);
      } else {
        setMessage(result.message);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    const result = await logoutUser();
    setUser(null);
    setMessage(result.ok ? "Logged out. Redirecting..." : result.message);
    if (result.ok) {
      router.replace("/login?next=/account");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="gh-card flex items-center justify-center p-10">
        <Loader2 className="size-6 animate-spin text-[var(--color-brand-primary)]" aria-hidden />
        <span className="ml-3 text-sm text-[var(--color-text-muted)]">Loading account...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gh-card p-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          {message ?? "You are not logged in yet. Log in to view full account details."}
        </p>
      </div>
    );
  }

  return (
    <div className="gh-card p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
            <User className="size-7" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{user.fullName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" aria-hidden />
                {user.email}
              </span>
              {user.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" aria-hidden />
                  {user.phone}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-primary)]">
            <Shield className="size-3.5" aria-hidden />
            {user.role}
          </span>
          <button type="button" className="gh-btn gh-btn-soft text-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
