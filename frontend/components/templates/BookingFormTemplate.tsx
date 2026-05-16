"use client";
/* eslint-disable react/no-unescaped-entities */

import { useState } from "react";
import {
  ArrowRight,
  Check,
  CalendarClock,
  Languages,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { createCheckoutSession, submitBookingRequest } from "@/lib/api/booking-api";
import { hasPublicApiBaseUrl } from "@/lib/api/client";

type BookingOption = { value: string; label: string };

type BookingFormTemplateProps = {
  hero: {
    title: string;
    description: string;
    primaryCtaLabel: string;
  };
  form: {
    title: string;
    description: string;
    fields: {
      country: { label: string; placeholder: string };
      consultationType: { label: string; placeholder: string };
      fullName: { label: string; placeholder: string };
      email: { label: string; placeholder: string };
      phone: { label: string; placeholder: string };
      notes: { label: string; placeholder: string };
      consent: string;
    };
    submitLabel: string;
    helperMessage: string;
    countryOptions: BookingOption[];
    consultationTypeOptions: BookingOption[];
    nextSteps?: { title: string; items: string[] };
  };
  signedInPatient?: {
    fullName: string;
    email: string;
    phone: string | null;
  } | null;
};

type FieldErrors = Partial<
  Record<"country" | "consultationType" | "fullName" | "email" | "consentAccepted", string>
>;

export function BookingFormTemplate({ hero, form, signedInPatient }: BookingFormTemplateProps) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [backendEnabled] = useState(() => hasPublicApiBaseUrl());

  const ids = {
    country: "booking-country",
    consultation: "booking-consultation-type",
    fullName: "booking-full-name",
    email: "booking-email",
    phone: "booking-phone",
    notes: "booking-notes",
    consent: "booking-consent",
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setStatusType(null);

    const formData = new FormData(event.currentTarget);
    // ?service=<slug> on the URL hands the form the catalogue link so the
    // backend can stamp price + currency for Stripe. Free-form bookings
    // (no slug) skip payment.
    const serviceSlug =
      typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("service") ?? undefined)
        : undefined;
    const payload = {
      country: String(formData.get("country") ?? "").trim(),
      consultationType: String(formData.get("consultationType") ?? "").trim(),
      fullName: String(formData.get("fullName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
      consentAccepted: formData.get("consentAccepted") === "on",
      serviceSlug: serviceSlug?.trim() || undefined,
    };

    const nextErrors: FieldErrors = {};
    if (!payload.country) nextErrors.country = "Select your country.";
    if (!payload.consultationType) nextErrors.consultationType = "Select a consultation type.";
    if (payload.fullName.length < 2) nextErrors.fullName = "Enter the patient full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
      nextErrors.email = "Enter a valid email address.";
    if (!payload.consentAccepted) nextErrors.consentAccepted = "Consent is required.";

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatusType("error");
      setStatusMessage("Please review the highlighted fields.");
      return;
    }

    if (!backendEnabled) {
      setStatusType("error");
      setStatusMessage("Booking service is not configured. Your request was not sent.");
      return;
    }

    setLoading(true);
    const result = await submitBookingRequest(payload);
    setLoading(false);

    if (!result.ok) {
      setStatusType("error");
      const unavailable =
        result.message === "Backend is unavailable" ||
        result.message === "Appointments are temporarily unavailable";
      setStatusMessage(
        unavailable
          ? "Booking is temporarily unavailable. Please try again later."
          : result.message,
      );
      return;
    }

    // Stripe handoff: if the backend says payment is required (Stripe
    // configured + appointment has a price), create a Checkout session
    // and redirect. The booking is already saved at this point — if
    // Stripe fails, the appointment still exists; admin can resend the
    // payment link manually.
    if (result.data.paymentRequired) {
      setStatusType("success");
      setStatusMessage("Request received. Redirecting to secure payment…");
      const returnTo = typeof window !== "undefined" ? window.location.pathname : "/";
      const checkout = await createCheckoutSession({
        appointmentId: result.data.appointmentId,
        returnTo,
      });
      if (checkout.ok && checkout.data.url) {
        window.location.assign(checkout.data.url);
        return;
      }
      // Checkout failed — fall through to the regular success state. Admin
      // can pick up the payment side manually.
      setStatusMessage(
        signedInPatient
          ? "Request received. Track it in your account booking history. (Payment link will follow by email.)"
          : "Request received. Our team will follow up shortly with a payment link.",
      );
      event.currentTarget.reset();
      setErrors({});
      return;
    }

    event.currentTarget.reset();
    setErrors({});
    setStatusType("success");
    setStatusMessage(
      signedInPatient
        ? "Request received. Track it in your account booking history."
        : (result.message ?? "Request received. Our team will follow up shortly."),
    );
  }

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[var(--color-background-soft)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 480px at 90% -10%, rgba(176, 241, 34, 0.18), transparent 60%), radial-gradient(800px 460px at -10% 110%, rgba(27, 77, 62, 0.08), transparent 60%)",
          }}
        />
        <div className="mx-auto w-full max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20">
          <span className="gh-heading-eyebrow inline-flex items-center gap-2">
            <Stethoscope className="h-3.5 w-3.5" />
            Book online
          </span>
          <h1
            className="mt-5 max-w-3xl text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {hero.title}
          </h1>
          {hero.description ? (
            <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-[var(--color-text-muted)]">
              {hero.description}
            </p>
          ) : null}
          <a href="#booking-form" className="gh-btn gh-btn-primary mt-8">
            {hero.primaryCtaLabel}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* FORM + SIDEBAR */}
      <section id="booking-form" className="bg-white">
        <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-6 py-16 lg:grid-cols-[1.6fr_1fr] lg:px-10 lg:py-20">
          {/* Form card */}
          <div className="rounded-3xl border border-[var(--color-border)] bg-white p-7 shadow-[0_30px_70px_-30px_rgba(15,46,37,0.18)] md:p-10">
            <span className="gh-heading-eyebrow">Patient details</span>
            <h2
              className="mt-3 text-[clamp(1.5rem,2.5vw,2rem)] leading-tight tracking-tight text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {form.title}
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-text-muted)]">
              {form.description}
            </p>

            {signedInPatient ? (
              <div className="mt-5 rounded-2xl border border-[var(--color-brand-primary)]/20 bg-[var(--color-background-soft)] px-4 py-3 text-[13px] text-[var(--color-text-muted)]">
                Signed in as{" "}
                <span className="font-semibold text-[var(--color-brand-primary)]">
                  {signedInPatient.fullName}
                </span>{" "}
                — details pre-filled.
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
              action="#"
              method="post"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id={ids.country}
                  label={form.fields.country.label}
                  required
                  error={errors.country}
                >
                  <select
                    id={ids.country}
                    name="country"
                    defaultValue=""
                    className="gh-select"
                  >
                    <option value="">{form.fields.country.placeholder}</option>
                    {form.countryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  id={ids.consultation}
                  label={form.fields.consultationType.label}
                  required
                  error={errors.consultationType}
                >
                  <select
                    id={ids.consultation}
                    name="consultationType"
                    defaultValue=""
                    className="gh-select"
                  >
                    <option value="">{form.fields.consultationType.placeholder}</option>
                    {form.consultationTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field
                id={ids.fullName}
                label={form.fields.fullName.label}
                required
                error={errors.fullName}
              >
                <input
                  id={ids.fullName}
                  name="fullName"
                  type="text"
                  placeholder={form.fields.fullName.placeholder}
                  defaultValue={signedInPatient?.fullName ?? ""}
                  className="gh-input"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id={ids.email}
                  label={form.fields.email.label}
                  required
                  error={errors.email}
                >
                  <input
                    id={ids.email}
                    name="email"
                    type="email"
                    placeholder={form.fields.email.placeholder}
                    defaultValue={signedInPatient?.email ?? ""}
                    className="gh-input"
                  />
                </Field>
                <Field id={ids.phone} label={form.fields.phone.label}>
                  <input
                    id={ids.phone}
                    name="phone"
                    type="tel"
                    placeholder={form.fields.phone.placeholder}
                    defaultValue={signedInPatient?.phone ?? ""}
                    className="gh-input"
                  />
                </Field>
              </div>

              <Field id={ids.notes} label={form.fields.notes.label}>
                <textarea
                  id={ids.notes}
                  name="notes"
                  rows={4}
                  placeholder={form.fields.notes.placeholder}
                  className="gh-textarea"
                />
              </Field>

              <label
                htmlFor={ids.consent}
                className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--color-text-muted)]"
              >
                <input
                  id={ids.consent}
                  name="consentAccepted"
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--color-brand-primary)]"
                />
                <span>{form.fields.consent}</span>
              </label>
              {errors.consentAccepted ? (
                <p className="-mt-3 text-[13px] text-[var(--color-status-error)]">
                  {errors.consentAccepted}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  className="gh-btn gh-btn-primary min-w-[220px]"
                  disabled={loading}
                >
                  {loading ? "Submitting…" : form.submitLabel}
                  {loading ? null : <ArrowRight className="h-4 w-4" />}
                </button>
                <p className="text-[12.5px] text-[var(--color-text-muted)]">
                  {form.helperMessage}
                </p>
              </div>

              {statusMessage ? (
                <p
                  role="status"
                  className={`rounded-2xl border px-4 py-3 text-[14px] ${
                    statusType === "success"
                      ? "gh-status-success"
                      : "gh-status-warning"
                  }`}
                >
                  {statusMessage}
                </p>
              ) : null}
            </form>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-[var(--color-brand-primary)] p-7 text-white">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-accent)]">
                What happens next
              </span>
              <h3
                className="mt-3 text-[1.5rem] leading-tight tracking-tight"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                A clear, calm booking.
              </h3>
              <ol className="mt-5 space-y-4 text-[14px] leading-relaxed text-white/85">
                {(form.nextSteps?.items ?? DEFAULT_NEXT_STEPS).map((item, i) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-[12px] font-bold text-[var(--color-brand-primary)]">
                      {i + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <ul className="grid grid-cols-1 gap-3">
              <SidebarChip
                icon={ShieldCheck}
                title="Private & encrypted"
                detail="GDPR · ISO 27001 aligned"
              />
              <SidebarChip
                icon={CalendarClock}
                title="Same-day response"
                detail="Most requests answered in 60 min"
              />
              <SidebarChip
                icon={Languages}
                title="In your language"
                detail="EN · PT · ES · CS · RO"
              />
              <SidebarChip
                icon={Check}
                title="Credentialed clinicians"
                detail="Licensed in 5 countries"
              />
            </ul>

            <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] p-5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              Not sure what to book? Pick &ldquo;GP consultation&rdquo; —
              our team will route you to the right clinician.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

const DEFAULT_NEXT_STEPS = [
  "Submit your request — we confirm receipt instantly.",
  "Our team matches you to a clinician and proposes a slot.",
  "Attend the secure video consultation and receive your file.",
];

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="gh-field-label">
        {label}
        {required ? (
          <span className="ml-1 text-[var(--color-brand-primary)]">*</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <span className="text-[12.5px] text-[var(--color-status-error)]">{error}</span>
      ) : null}
    </div>
  );
}

function SidebarChip({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof ShieldCheck;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-background-soft)]">
        <Icon className="h-4 w-4 text-[var(--color-brand-primary)]" />
      </span>
      <span>
        <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
          {title}
        </p>
        <p className="text-[12px] text-[var(--color-text-muted)]">{detail}</p>
      </span>
    </li>
  );
}
