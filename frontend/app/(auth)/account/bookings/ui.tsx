"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/api/auth-api";

export function BookingsShell() {
  const [message, setMessage] = useState<string>("Loading...");

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const me = await fetchCurrentUser();
      if (!mounted) return;
      if (!me.ok) {
        setMessage("Log in to view account-linked booking history. Guest booking remains available on /book-online.");
        return;
      }
      setMessage(
        "Booking history integration is coming soon. Current guest booking flow remains unchanged and available.",
      );
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return <p className="mt-4 text-sm text-[var(--color-text-muted)]">{message}</p>;
}
