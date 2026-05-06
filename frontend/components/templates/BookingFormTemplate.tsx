"use client";

import { useState } from "react";
import { submitBookingRequest } from "@/lib/api/booking-api";
import { hasPublicApiBaseUrl } from "@/lib/api/client";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { HeroSection } from "@/components/sections/HeroSection";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

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

type FieldErrors = Partial<Record<"country" | "consultationType" | "fullName" | "email" | "consentAccepted", string>>;

export function BookingFormTemplate({ hero, form, signedInPatient }: BookingFormTemplateProps) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const countryId = "booking-country";
  const consultationId = "booking-consultation-type";
  const fullNameId = "booking-full-name";
  const emailId = "booking-email";
  const phoneId = "booking-phone";
  const notesId = "booking-notes";
  const consentId = "booking-consent";

  const [backendEnabled] = useState(() => hasPublicApiBaseUrl());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setStatusType(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      country: String(formData.get("country") ?? "").trim(),
      consultationType: String(formData.get("consultationType") ?? "").trim(),
      fullName: String(formData.get("fullName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
      consentAccepted: formData.get("consentAccepted") === "on",
    };

    const nextErrors: FieldErrors = {};

    if (!payload.country) nextErrors.country = "Select your country.";
    if (!payload.consultationType) nextErrors.consultationType = "Select a consultation type.";
    if (payload.fullName.length < 2) nextErrors.fullName = "Enter the patient full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) nextErrors.email = "Enter a valid email address.";
    if (!payload.consentAccepted) nextErrors.consentAccepted = "Consent is required before submitting.";

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatusType("error");
      setStatusMessage("Please review the highlighted fields before submitting.");
      return;
    }

    if (!backendEnabled) {
      setStatusType("error");
      setStatusMessage(
        "Backend booking is not configured yet. Your request was not sent. The public form preview remains available while backend integration is completed.",
      );
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
          ? "Booking service is temporarily unavailable. Please try again later or contact the clinic team directly."
          : result.message,
      );
      return;
    }

    event.currentTarget.reset();
    setErrors({});
    setStatusType("success");
    setStatusMessage(
      signedInPatient
        ? "Request received. Our team will follow up. You can track this request in your account booking history."
        : (result.message ?? "Request received. Our team will follow up."),
    );
  }

  return (
    <>
      <HeroSection
        eyebrow="Book online"
        title={hero.title}
        description={hero.description}
        primaryCta={{ href: "#booking-form", label: hero.primaryCtaLabel }}
        trustBadges={["Secure intake", "Private consultation", "Clear next steps"]}
      />
      <Section id="booking-form" className="bg-[var(--color-brand-secondary)]">
        <Container>
          <article className="gh-card mx-auto max-w-3xl overflow-x-hidden p-6 sm:p-8">
            <h2 className="gh-h2 text-[var(--color-text-primary)]">{form.title}</h2>
            <p className="gh-body mt-3 text-[var(--color-text-muted)]">{form.description}</p>
            <div className="mt-5 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3">
              <p className="gh-body-sm text-[var(--color-text-muted)]">
                Fields marked <span className="font-semibold text-[var(--color-brand-primary)]">*</span> are required.
                {" "}
                {backendEnabled
                  ? "Submitting sends a booking request only. This is not a confirmed medical appointment."
                  : "Backend booking is not configured yet, so this form remains in frontend-safe preview mode."}
              </p>
            </div>
            <form className="mt-6 space-y-4" action="#" method="post" onSubmit={handleSubmit} noValidate>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-2">
                  <span className="gh-field-label">
                    {form.fields.country.label} <span className="text-[var(--color-brand-primary)]">*</span>
                  </span>
                  <select id={countryId} name="country" className="gh-select" defaultValue="">
                    <option value="">{form.fields.country.placeholder}</option>
                    {form.countryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.country ? <span className="text-sm text-red-700">{errors.country}</span> : null}
                </label>
                <label className="flex min-w-0 flex-col gap-2">
                  <span className="gh-field-label">
                    {form.fields.consultationType.label} <span className="text-[var(--color-brand-primary)]">*</span>
                  </span>
                  <select id={consultationId} name="consultationType" className="gh-select" defaultValue="">
                    <option value="">{form.fields.consultationType.placeholder}</option>
                    {form.consultationTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.consultationType ? (
                    <span className="text-sm text-red-700">{errors.consultationType}</span>
                  ) : null}
                </label>
              </div>
              <label className="flex min-w-0 flex-col gap-2">
                <span className="gh-field-label">
                  {form.fields.fullName.label} <span className="text-[var(--color-brand-primary)]">*</span>
                </span>
                <input
                  id={fullNameId}
                  name="fullName"
                  type="text"
                  placeholder={form.fields.fullName.placeholder}
                  className="gh-input"
                  defaultValue={signedInPatient?.fullName ?? ""}
                />
                {errors.fullName ? <span className="text-sm text-red-700">{errors.fullName}</span> : null}
              </label>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-2">
                  <span className="gh-field-label">
                    {form.fields.email.label} <span className="text-[var(--color-brand-primary)]">*</span>
                  </span>
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    placeholder={form.fields.email.placeholder}
                    className="gh-input"
                    defaultValue={signedInPatient?.email ?? ""}
                  />
                  {errors.email ? <span className="text-sm text-red-700">{errors.email}</span> : null}
                </label>
                <label className="flex min-w-0 flex-col gap-2">
                  <span className="gh-field-label">{form.fields.phone.label}</span>
                  <input
                    id={phoneId}
                    name="phone"
                    type="tel"
                    placeholder={form.fields.phone.placeholder}
                    className="gh-input"
                    defaultValue={signedInPatient?.phone ?? ""}
                  />
                </label>
              </div>
              <label className="flex min-w-0 flex-col gap-2">
                <span className="gh-field-label">{form.fields.notes.label}</span>
                <textarea id={notesId} name="notes" rows={4} placeholder={form.fields.notes.placeholder} className="gh-textarea" />
              </label>
              <label htmlFor={consentId} className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
                <div className="flex items-start gap-3">
                  <input
                    id={consentId}
                    name="consentAccepted"
                    type="checkbox"
                    className="mt-1 size-4 accent-[var(--color-brand-primary)]"
                  />
                  <div>
                    <p className="gh-body-sm text-[var(--color-text-muted)]">{form.fields.consent}</p>
                    {errors.consentAccepted ? (
                      <span className="mt-2 block text-sm text-red-700">{errors.consentAccepted}</span>
                    ) : null}
                  </div>
                </div>
              </label>
              <button type="submit" className="gh-btn gh-btn-primary min-w-[180px]" disabled={loading}>
                {loading ? "Submitting request..." : form.submitLabel}
              </button>
              <p className="gh-body-sm text-[var(--color-text-muted)]">{form.helperMessage}</p>
              {statusMessage ? (
                <p
                  className={`rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm ${
                    statusType === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                  role="status"
                >
                  {statusMessage}
                </p>
              ) : null}
            </form>
            {form.nextSteps ? (
              <section className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
                <h3 className="gh-h3 text-[var(--color-text-primary)]">{form.nextSteps.title}</h3>
                <ul className="mt-3 space-y-2">
                  {form.nextSteps.items.map((item) => (
                    <li key={item} className="gh-body-sm text-[var(--color-text-muted)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>
        </Container>
      </Section>
      <BookingCTA
        title="Need urgent support?"
        description="If you are unsure which consultation to choose, start here and our team will guide you."
        ctaLabel={hero.primaryCtaLabel}
        ctaHref="#booking-form"
      />
    </>
  );
}
