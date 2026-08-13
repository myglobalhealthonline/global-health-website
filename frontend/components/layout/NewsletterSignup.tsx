"use client";

import { useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api/client";

type NewsletterI18n = {
  stayInformed: string;
  newsletterDesc: string;
  subscribe: string;
  newsletterSuccess: string;
  newsletterPrivacy: string;
  emailLabel: string;
  invalidEmail: string;
};

type Props = {
  countryCode?: string | null;
  locale?: string | null;
  i18n?: NewsletterI18n;
};

/**
 * Newsletter panel for the footer. Hits the public /api/newsletter endpoint
 * (rate-limited to 10/hour/IP) and shows an inline success/error message. We
 * pass the user's current country + locale so the admin export shows where
 * each signup came from.
 *
 * Layout is a two-part card: illustration + pitch on the left, form on the
 * right, stacking to a single column below 768px (input above a full-width
 * button).
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
      setMessage(i18n?.invalidEmail ?? "Enter a valid email address.");
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
    <section className="gh-newsletter-panel">
      <div className="gh-newsletter-pitch">
        <span aria-hidden className="gh-newsletter-illustration">
          <span className="gh-newsletter-illustrationGlow" />
          <svg viewBox="0 0 64 64" fill="none" aria-hidden focusable="false">
            <rect
              x="8"
              y="18"
              width="48"
              height="34"
              rx="6"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M8.5 23 30.2 38.4a3 3 0 0 0 3.6 0L55.5 23"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M32 33.5c-1.4-2.6-5.6-3-7.2-.5-1.2 1.9-.4 4.2 1.2 5.7l6 5.6 6-5.6c1.6-1.5 2.4-3.8 1.2-5.7-1.6-2.5-5.8-2.1-7.2.5Z"
              fill="currentColor"
              fillOpacity="0.16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M14 11.5v5M11.5 14h5M50 8.5v4M48 10.5h4M53 44.5v4M51 46.5h4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>
        </span>
        <div>
          <p className="gh-newsletter-heading">
            {i18n?.stayInformed ?? "Stay informed. Stay healthy."}
          </p>
          <p className="gh-newsletter-desc">
            {i18n?.newsletterDesc ??
              "Monthly health updates, tips and resources delivered to your inbox. No spam, ever."}
          </p>
        </div>
      </div>

      <div className="gh-newsletter-formCol">
        {/* Force-masked for Microsoft Clarity: this is the one free-text input
            on the otherwise-public footer, and it takes an email address.
            Belt-and-braces on top of the project's dashboard masking level,
            which this codebase cannot enforce. */}
        <form onSubmit={onSubmit} className="gh-newsletter-form" data-clarity-mask="true">
          <label className="gh-newsletter-label">
            <span className="sr-only">{i18n?.emailLabel ?? "Email address"}</span>
            <span className="gh-newsletter-inputWrap">
              <Mail className="gh-newsletter-inputIcon" aria-hidden />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                maxLength={254}
                autoComplete="email"
                disabled={status === "loading"}
                aria-invalid={status === "error" || undefined}
                aria-describedby={message ? "gh-newsletter-status" : undefined}
                className="gh-newsletter-input"
              />
            </span>
          </label>
          <button
            type="submit"
            disabled={status === "loading"}
            aria-busy={status === "loading"}
            className="gh-newsletter-submit gh-focus-on-dark"
          >
            {status === "loading" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              (i18n?.subscribe ?? "Subscribe")
            )}
          </button>
        </form>
        <p className="gh-newsletter-privacy">
          <ShieldCheck className="gh-newsletter-privacyIcon" aria-hidden />
          {i18n?.newsletterPrivacy ?? "We respect your privacy. Unsubscribe anytime."}
        </p>
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
    </section>
  );
}
