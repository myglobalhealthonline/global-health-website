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
    <div className="mt-4 space-y-2">
      <p className="text-sm text-[var(--color-text-muted)]">Name: {user.fullName}</p>
      <p className="text-sm text-[var(--color-text-muted)]">Email: {user.email}</p>
      <p className="text-sm text-[var(--color-text-muted)]">Role: {user.role}</p>
      <button type="button" className="gh-btn mt-2" onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}
