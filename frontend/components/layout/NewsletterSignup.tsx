"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api/client";

type NewsletterI18n = {
  stayInformed: string;
  newsletterDesc: string;
  subscribe: string;
  newsletterSuccess: string;
};

type Props = {
  countryCode?: string | null;
  locale?: string | null;
  i18n?: NewsletterI18n;
};

/**
 * Compact newsletter form for the footer. Hits the public
 * /api/newsletter endpoint (rate-limited to 10/hour/IP) and shows an
 * inline success/error message. We pass the user's current country +
 * locale so the admin export shows where each signup came from.
 */
export function NewsletterSignup({ countryCode, locale, i18n }: Props) {
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
      setMessage(i18n?.newsletterSuccess ?? "Thanks — you're on the list.");
      setEmail("");
    } else {
      setStatus("error");
      setMessage(res.message || "Could not subscribe. Try again later.");
    }
  }

  return (
    <div>
      <p className="gh-footer-groupHeading m-0 inline-flex items-center gap-2 uppercase text-white">
        <span aria-hidden className="gh-footer-groupAccent gh-newsletter-accentBar" />
        {i18n?.stayInformed ?? "Stay informed"}
      </p>
      <p className="gh-newsletter-desc">
        {i18n?.newsletterDesc ?? "Quarterly updates on new countries, doctors, and health topics. No spam."}
      </p>
      <form onSubmit={onSubmit} className="gh-newsletter-form">
        <label className="gh-newsletter-label">
          <span className="sr-only">Email</span>
          <div className="gh-newsletter-inputWrap">
            <Mail className="gh-newsletter-inputIcon" aria-hidden />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              maxLength={254}
              disabled={status === "loading"}
              aria-invalid={status === "error" || undefined}
              aria-describedby={message ? "gh-newsletter-status" : undefined}
              className="gh-newsletter-input"
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          aria-busy={status === "loading"}
          className="gh-newsletter-submit"
        >
          {status === "loading" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            (i18n?.subscribe ?? "Subscribe")
          )}
        </button>
      </form>
      <div aria-live="polite" role={status === "error" ? "alert" : undefined}>
        {message && status === "ok" ? (
          <p id="gh-newsletter-status" className="gh-newsletter-status gh-newsletter-statusOk">
            {message}
          </p>
        ) : null}
        {message && status === "error" ? (
          <p id="gh-newsletter-status" className="gh-newsletter-status gh-newsletter-statusError">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
