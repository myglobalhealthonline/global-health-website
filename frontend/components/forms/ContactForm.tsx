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

export function ContactForm() {
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
        setErrorMessage(json.message ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setErrorMessage("Could not reach the server. Please try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="gh-status-success flex flex-col items-center gap-4 rounded-[var(--radius-card)] px-6 py-10 text-center">
        <CheckCircle className="size-10" style={{ color: "var(--color-status-success-text)" }} aria-hidden />
        <h2 className="text-xl font-bold">Message sent!</h2>
        <p className="max-w-sm text-sm">
          Thank you for reaching out. Our team will get back to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {state === "error" && (
        <div className="gh-status-error flex items-start gap-3 rounded-[var(--radius-card-sm)] px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          error={fieldErrors.name?.[0]}
          required
        />
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          error={fieldErrors.email?.[0]}
          required
        />
      </div>

      <Field
        label="Subject"
        name="subject"
        type="text"
        placeholder="How can we help?"
        error={fieldErrors.subject?.[0]}
        required
      />

      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--color-text-body)" }}
        >
          Message <span style={{ color: "var(--color-status-error)" }}>*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          placeholder="Tell us what you need..."
          aria-invalid={Boolean(fieldErrors.message)}
          className="gh-textarea resize-y"
        />
        {fieldErrors.message && (
          <p className="mt-1 text-xs" style={{ color: "var(--color-status-error-text)" }}>
            {fieldErrors.message[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={state === "loading"}
        className="gh-btn gh-btn-primary disabled:opacity-60"
      >
        {state === "loading" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {state === "loading" ? "Sending…" : "Send message"}
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
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium"
        style={{ color: "var(--color-text-body)" }}
      >
        {label} {required && <span style={{ color: "var(--color-status-error)" }}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        className="gh-input"
      />
      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-status-error-text)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
