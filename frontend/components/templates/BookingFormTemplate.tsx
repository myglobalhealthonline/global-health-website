"use client";

import { useState } from "react";
import { Check, Clock, ShieldCheck, Stethoscope } from "lucide-react";
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
        showMedia={false}
      />
      <Section id="booking-form" variant="soft" pattern="soft">
        <Container>
          <div className="mx-auto max-w-3xl">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-elevated)] sm:p-10">
              <div className="flex items-center gap-3">
                <span className="gh-icon-circle bg-[var(--color-brand-primary)] text-white">
                  <Stethoscope className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 className="gh-h2 text-[var(--color-text-primary)]">{form.title}</h2>
                  <p className="text-sm text-[var(--color-text-muted)]">{form.description}</p>
                </div>
              </div>

              {signedInPatient ? (
                <div className="mt-5 rounded-[var(--radius-card-sm)] border border-[var(--color-brand-primary)]/20 bg-[var(--color-background-soft)] px-4 py-3">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Signed in as{" "}
                    <span className="font-semibold text-[var(--color-brand-primary)]">{signedInPatient.fullName}</span>.
                    Your details are pre-filled.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3">
                <p className="gh-body-sm text-[var(--color-text-muted)]">
                  Fields marked <span className="font-semibold text-[var(--color-brand-primary)]">*</span> are required.{" "}
                  {backendEnabled
                    ? "Submitting sends a booking request only. This is not a confirmed medical appointment."
                    : "Backend booking is not configured yet, so this form remains in frontend-safe preview mode."}
                </p>
              </div>

              <form className="mt-6 space-y-5" action="#" method="post" onSubmit={handleSubmit} noValidate>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-2">
                    <label htmlFor={countryId} className="gh-field-label">
                      {form.fields.country.label}{" "}
                      <span className="text-[var(--color-brand-primary)]">*</span>
                    </label>
                    <select
                      id={countryId}
                      name="country"
                      className="gh-select"
                      defaultValue=""
                      aria-invalid={errors.country ? "true" : undefined}
                      aria-describedby={errors.country ? "booking-country-error" : undefined}
                    >
                      <option value="">{form.fields.country.placeholder}</option>
                      {form.countryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.country ? (
                      <span id="booking-country-error" className="text-sm text-[var(--color-status-error)]">
                        {errors.country}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <label htmlFor={consultationId} className="gh-field-label">
                      {form.fields.consultationType.label}{" "}
                      <span className="text-[var(--color-brand-primary)]">*</span>
                    </label>
                    <select
                      id={consultationId}
                      name="consultationType"
                      className="gh-select"
                      defaultValue=""
                      aria-invalid={errors.consultationType ? "true" : undefined}
                      aria-describedby={errors.consultationType ? "booking-consultation-error" : undefined}
                    >
                      <option value="">{form.fields.consultationType.placeholder}</option>
                      {form.consultationTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.consultationType ? (
                      <span id="booking-consultation-error" className="text-sm text-[var(--color-status-error)]">
                        {errors.consultationType}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <label htmlFor={fullNameId} className="gh-field-label">
                    {form.fields.fullName.label} <span className="text-[var(--color-brand-primary)]">*</span>
                  </label>
                  <input
                    id={fullNameId}
                    name="fullName"
                    type="text"
                    placeholder={form.fields.fullName.placeholder}
                    className="gh-input"
                    defaultValue={signedInPatient?.fullName ?? ""}
                    aria-invalid={errors.fullName ? "true" : undefined}
                    aria-describedby={errors.fullName ? "booking-fullname-error" : undefined}
                  />
                  {errors.fullName ? (
                    <span id="booking-fullname-error" className="text-sm text-[var(--color-status-error)]">
                      {errors.fullName}
                    </span>
                  ) : null}
                </div>

                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-2">
                    <label htmlFor={emailId} className="gh-field-label">
                      {form.fields.email.label} <span className="text-[var(--color-brand-primary)]">*</span>
                    </label>
                    <input
                      id={emailId}
                      name="email"
                      type="email"
                      placeholder={form.fields.email.placeholder}
                      className="gh-input"
                      defaultValue={signedInPatient?.email ?? ""}
                      aria-invalid={errors.email ? "true" : undefined}
                      aria-describedby={errors.email ? "booking-email-error" : undefined}
                    />
                    {errors.email ? (
                      <span id="booking-email-error" className="text-sm text-[var(--color-status-error)]">
                        {errors.email}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <label htmlFor={phoneId} className="gh-field-label">
                      {form.fields.phone.label}
                    </label>
                    <input
                      id={phoneId}
                      name="phone"
                      type="tel"
                      placeholder={form.fields.phone.placeholder}
                      className="gh-input"
                      defaultValue={signedInPatient?.phone ?? ""}
                    />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <label htmlFor={notesId} className="gh-field-label">
                    {form.fields.notes.label}
                  </label>
                  <textarea
                    id={notesId}
                    name="notes"
                    rows={4}
                    placeholder={form.fields.notes.placeholder}
                    className="gh-textarea"
                  />
                </div>

                <div className="rounded-[var(--radius-card-sm)] border border-[var(--color-brand-primary)]/15 bg-[var(--color-background-soft)] p-4">
                  <div className="flex items-start gap-3">
                    <input
                      id={consentId}
                      name="consentAccepted"
                      type="checkbox"
                      className="mt-1 size-4 accent-[var(--color-brand-primary)]"
                      aria-invalid={errors.consentAccepted ? "true" : undefined}
                      aria-describedby={errors.consentAccepted ? "booking-consent-error" : undefined}
                    />
                    <div>
                      <label htmlFor={consentId} className="gh-body-sm text-[var(--color-text-muted)]">
                        {form.fields.consent}
                      </label>
                      {errors.consentAccepted ? (
                        <span id="booking-consent-error" className="mt-2 block text-sm text-[var(--color-status-error)]">
                          {errors.consentAccepted}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="submit" className="gh-btn gh-btn-primary min-w-[200px] text-base" disabled={loading}>
                    {loading ? "Submitting request..." : form.submitLabel}
                  </button>
                  <p className="gh-body-sm text-[var(--color-text-muted)]">{form.helperMessage}</p>
                </div>

                {statusMessage ? (
                  <p
                    className={`rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm ${
                      statusType === "success" ? "gh-status-success" : "gh-status-warning"
                    }`}
                    role="status"
                  >
                    {statusMessage}
                  </p>
                ) : null}
              </form>

              {form.nextSteps ? (
                <section className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-brand-primary)]/10 bg-white p-5 shadow-[var(--shadow-card)]">
                  <h3 className="gh-h3 text-[var(--color-text-primary)]">{form.nextSteps.title}</h3>
                  <ul className="mt-3 space-y-3">
                    {form.nextSteps.items.map((item, i) => (
                      <li key={item} className="flex items-start gap-3 gh-body-sm text-[var(--color-text-muted)]">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-[11px] font-bold text-white">
                          {i + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            {/* Trust sidebar */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-background-soft)]">
                  <ShieldCheck className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Private & confidential</p>
                  <p className="text-xs text-[var(--color-text-muted)]">GDPR protected</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-background-soft)]">
                  <Clock className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Fast team response</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Usually within 24h</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)]">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-background-soft)]">
                  <Check className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Credential-checked clinicians</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Verified credentials</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>
      <BookingCTA
        variant="support"
        eyebrow="Booking support"
        title="Need urgent support?"
        description="If you are unsure which consultation to choose, start here and our team will guide you."
        ctaLabel={hero.primaryCtaLabel}
        ctaHref="#booking-form"
      />
    </>
  );
}
