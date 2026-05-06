"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    return <p className="mt-4 text-sm text-[var(--color-text-muted)]">Loading account...</p>;
  }

  if (!user) {
    return (
      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        {message ?? "You are not logged in yet. Log in to view full account details."}
      </p>
    );
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4 sm:grid-cols-2">
        <p className="text-sm text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text-primary)]">Full name:</span> {user.fullName}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text-primary)]">Email:</span> {user.email}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text-primary)]">Phone:</span> {user.phone ?? "Not set"}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text-primary)]">Role:</span> {user.role}
        </p>
      </div>
      <div>
        <button type="button" className="gh-btn" onClick={handleLogout}>
          Log out
        </button>
      </div>
      {message ? (
        <p className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
