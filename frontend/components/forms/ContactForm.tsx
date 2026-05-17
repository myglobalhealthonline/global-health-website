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
      <div className="flex flex-col items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <CheckCircle className="size-10 text-emerald-600" aria-hidden />
        <h2 className="text-xl font-bold text-emerald-900">Message sent!</h2>
        <p className="max-w-sm text-sm text-emerald-700">
          Thank you for reaching out. Our team will get back to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {state === "error" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          placeholder="Tell us what you need..."
          className={`w-full resize-y rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
            fieldErrors.message ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
          }`}
        />
        {fieldErrors.message && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.message[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
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
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
          error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
