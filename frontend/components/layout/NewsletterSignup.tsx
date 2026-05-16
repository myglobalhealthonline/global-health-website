"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { apiRequest } from "@/lib/api/client";

type Props = {
  countryCode?: string | null;
  locale?: string | null;
};

/**
 * Compact newsletter form for the footer. Hits the public
 * /api/newsletter endpoint (rate-limited to 10/hour/IP) and shows an
 * inline success/error message. We pass the user's current country +
 * locale so the admin export shows where each signup came from.
 */
export function NewsletterSignup({ countryCode, locale }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const res = await apiRequest<{ subscribed: true }>("/api/newsletter", {
      method: "POST",
      body: {
        email: trimmed,
        countryCode: countryCode ?? undefined,
        locale: locale ?? undefined,
        source: "footer",
      },
    });
    if (res.ok) {
      setStatus("ok");
      setMessage("Thanks — you're on the list.");
      setEmail("");
    } else {
      setStatus("error");
      setMessage(res.message || "Could not subscribe. Try again later.");
    }
  }

  return (
    <div>
      <p
        className="m-0 uppercase text-white"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.18em",
          marginBottom: 14,
        }}
      >
        Stay informed
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 280 }}>
        Quarterly updates on new countries, doctors, and health topics. No spam.
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Email</span>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              maxLength={254}
              disabled={status === "loading"}
              className="w-full rounded-md border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder-white/40 focus:border-white/40 focus:outline-none focus:ring-0"
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-background-dark)] transition disabled:opacity-60"
          style={{ background: "var(--color-accent)" }}
        >
          {status === "loading" ? "…" : "Subscribe"}
        </button>
      </form>
      {message ? (
        <p
          className="mt-2"
          style={{
            fontSize: 12,
            color: status === "ok" ? "var(--color-accent)" : "rgba(255,180,180,0.9)",
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
