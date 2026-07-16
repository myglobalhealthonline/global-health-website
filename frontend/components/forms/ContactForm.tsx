"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type FormState = "idle" | "loading" | "success" | "error";

type FieldErrors = {
  name?: string[];
  email?: string[];
  subject?: string[];
  message?: string[];
};

export type ContactFormI18n = {
  successTitle: string;
  successBody: string;
  fullName: string;
  fullNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  subject: string;
  subjectPlaceholder: string;
  message: string;
  messagePlaceholder: string;
  sending: string;
  send: string;
  genericError: string;
  networkError: string;
};

const DEFAULT_I18N: ContactFormI18n = {
  successTitle: "Message sent!",
  successBody: "Thank you for reaching out. Our team will get back to you within 24 hours.",
  fullName: "Full name",
  fullNamePlaceholder: "Jane Smith",
  email: "Email address",
  emailPlaceholder: "jane@example.com",
  subject: "Subject",
  subjectPlaceholder: "How can we help?",
  message: "Message",
  messagePlaceholder: "Tell us what you need...",
  sending: "Sending…",
  send: "Send message",
  genericError: "Something went wrong. Please try again.",
  networkError: "Could not reach the server. Please try again.",
};

export function ContactForm({ i18n = DEFAULT_I18N }: { i18n?: ContactFormI18n }) {
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setFieldErrors({});
    setErrorMessage("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      subject: (form.elements.namedItem("subject") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.status === 400 && json.fieldErrors) {
        setFieldErrors(json.fieldErrors as FieldErrors);
        setState("idle");
        return;
      }

      if (!res.ok) {
        setErrorMessage(json.message ?? i18n.genericError);
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setErrorMessage(i18n.networkError);
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div
        role="status"
        className="gh-status-success gh2-glass-forest flex flex-col items-center gap-4 rounded-[var(--radius-card)] px-6 py-10 text-center"
        style={{ border: "1px solid rgba(255,255,255,0.14)" }}
      >
        <CheckCircle className="size-10" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
        <h2 className="text-xl font-bold text-white">{i18n.successTitle}</h2>
        <p className="max-w-sm text-sm text-white/70">
          {i18n.successBody}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="gh2-glass-forest space-y-5 p-6 sm:p-8" style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: "var(--radius-card)" }}>
      {state === "error" && (
        <div
          role="alert"
          className="gh-status-error flex items-start gap-3 rounded-[var(--radius-card-sm)] px-4 py-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={i18n.fullName}
          name="name"
          type="text"
          autoComplete="name"
          placeholder={i18n.fullNamePlaceholder}
          error={fieldErrors.name?.[0]}
          required
        />
        <Field
          label={i18n.email}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={i18n.emailPlaceholder}
          error={fieldErrors.email?.[0]}
          required
        />
      </div>

      <Field
        label={i18n.subject}
        name="subject"
        type="text"
        placeholder={i18n.subjectPlaceholder}
        error={fieldErrors.subject?.[0]}
        required
      />

      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          {i18n.message} <span style={{ color: "var(--color-brand-accent)" }}>*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          placeholder={i18n.messagePlaceholder}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? "message-error" : undefined}
          className="gh-textarea resize-y"
          style={{ 
            background: "rgba(255,255,255,0.05)", 
            border: "1px solid rgba(255,255,255,0.15)", 
            color: "rgba(255,255,255,0.92)",
            borderRadius: "var(--radius-card-sm)"
          }}
        />
        {fieldErrors.message && (
          <p id="message-error" className="mt-1 text-xs" style={{ color: "var(--color-brand-accent)" }}>
            {fieldErrors.message[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={state === "loading"}
        className="gh2-btn-lime disabled:opacity-60"
      >
        {state === "loading" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {state === "loading" ? i18n.sending : i18n.send}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  placeholder,
  error,
  required,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium"
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        {label} {required && <span style={{ color: "var(--color-brand-accent)" }}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="gh-input"
        style={{ 
          background: "rgba(255,255,255,0.05)", 
          border: "1px solid rgba(255,255,255,0.15)", 
          color: "rgba(255,255,255,0.92)",
          borderRadius: "var(--radius-card-sm)"
        }}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs" style={{ color: "var(--color-brand-accent)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
