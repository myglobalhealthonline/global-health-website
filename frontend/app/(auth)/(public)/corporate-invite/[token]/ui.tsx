"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export type InviteInfo = {
  type: "EMPLOYEE" | "BENEFICIARY";
  companyName: string;
  firstName: string;
  lastName: string;
  maskedEmail: string;
  existingAccount: boolean;
  prefill: {
    phone: string | null;
    addressLine1: string | null;
    city: string | null;
    postalCode: string | null;
    hasDateOfBirth: boolean;
  };
  expiresAt: string;
};

export type InviteFormI18n = {
  existingPassword: string;
  createPassword: string;
  existingNote: string;
  showPassword: string;
  hidePassword: string;
  completeProfile: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  consents: string;
  acceptTermsPrefix: string;
  termsLink: string;
  acceptPrivacyPrefix: string;
  privacyLink: string;
  healthConsent: string;
  consentError: string;
  activateError: string;
  backendError: string;
  activating: string;
  activate: string;
};

/**
 * Invite accept form. POSTs to the same-origin proxy so the auth cookie
 * lands on the site host (backend auto-logs the member in on success).
 */
export function CorporateInviteForm({
  token,
  invite,
  i18n,
}: {
  token: string;
  invite: InviteInfo;
  i18n: InviteFormI18n;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = (key: string) => String(formData.get(key) ?? "").trim();
    if (!formData.get("terms") || !formData.get("privacy") || !formData.get("dataProcessing")) {
      setMessage(i18n.consentError);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/corporate/invites/${encodeURIComponent(token)}/accept`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: value("password"),
            profile: {
              ...(value("phone") ? { phone: value("phone") } : {}),
              ...(value("dateOfBirth") ? { dateOfBirth: value("dateOfBirth") } : {}),
              ...(value("addressLine1") ? { addressLine1: value("addressLine1") } : {}),
              ...(value("city") ? { city: value("city") } : {}),
              ...(value("postalCode") ? { postalCode: value("postalCode") } : {}),
            },
            consents: { terms: true, privacy: true, dataProcessing: true },
          }),
        },
      );
      const json = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !json.ok) {
        setMessage(json.message ?? i18n.activateError);
        setLoading(false);
        return;
      }
      router.replace("/account/corporate?welcome=1");
      router.refresh();
    } catch {
      setMessage(i18n.backendError);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {/* Password */}
      <div className="grid gap-2">
        <label htmlFor="invite-password" className="gh-field-label" data-required>
          {invite.existingAccount ? i18n.existingPassword : i18n.createPassword}
        </label>
        {invite.existingAccount ? (
          <p className="text-xs leading-relaxed" style={{ color: "#7A9A83" }}>
            {i18n.existingNote}
          </p>
        ) : null}
        <div className="relative">
          <input
            id="invite-password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="gh-input pr-12"
            minLength={invite.existingAccount ? 1 : 8}
            required
            aria-required="true"
            autoComplete={invite.existingAccount ? "current-password" : "new-password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
            aria-label={showPassword ? i18n.hidePassword : i18n.showPassword}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      {/* Profile completion */}
      <fieldset className="grid gap-4 border-0 p-0">
        <legend className="gh-field-label mb-1">{i18n.completeProfile}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!invite.prefill.hasDateOfBirth ? (
            <div className="grid gap-2">
              <label htmlFor="invite-dob" className="gh-field-label" data-required>
                {i18n.dateOfBirth}
              </label>
              <input
                id="invite-dob"
                name="dateOfBirth"
                type="date"
                className="gh-input"
                required
                aria-required="true"
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <label htmlFor="invite-phone" className="gh-field-label">
              {i18n.phone}
            </label>
            <input
              id="invite-phone"
              name="phone"
              type="tel"
              defaultValue={invite.prefill.phone ?? ""}
              className="gh-input"
              autoComplete="tel"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <label htmlFor="invite-address" className="gh-field-label">
              {i18n.address}
            </label>
            <input
              id="invite-address"
              name="addressLine1"
              defaultValue={invite.prefill.addressLine1 ?? ""}
              className="gh-input"
              autoComplete="address-line1"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="invite-city" className="gh-field-label">
              {i18n.city}
            </label>
            <input
              id="invite-city"
              name="city"
              defaultValue={invite.prefill.city ?? ""}
              className="gh-input"
              autoComplete="address-level2"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="invite-postal" className="gh-field-label">
              {i18n.postalCode}
            </label>
            <input
              id="invite-postal"
              name="postalCode"
              defaultValue={invite.prefill.postalCode ?? ""}
              className="gh-input"
              autoComplete="postal-code"
            />
          </div>
        </div>
      </fieldset>

      {/* Consents — all three required */}
      <fieldset className="grid gap-2.5 border-0 p-0">
        <legend className="gh-field-label mb-1" data-required>
          {i18n.consents}
        </legend>
        <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-relaxed text-[var(--color-text-body)]">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4" />
          <span>
            {i18n.acceptTermsPrefix}{" "}
            <Link href="/terms" target="_blank" className="font-semibold underline underline-offset-2">
              {i18n.termsLink}
            </Link>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-relaxed text-[var(--color-text-body)]">
          <input type="checkbox" name="privacy" required className="mt-0.5 size-4" />
          <span>
            {i18n.acceptPrivacyPrefix}{" "}
            <Link href="/privacy" target="_blank" className="font-semibold underline underline-offset-2">
              {i18n.privacyLink}
            </Link>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-relaxed text-[var(--color-text-body)]">
          <input type="checkbox" name="dataProcessing" required className="mt-0.5 size-4" />
          <span>{i18n.healthConsent}</span>
        </label>
      </fieldset>

      <button
        type="submit"
        className="gh2-btn-lime mt-1 w-full justify-center disabled:opacity-60"
        disabled={loading}
        style={{ width: "100%" }}
      >
        {loading ? i18n.activating : i18n.activate}
        {!loading && <ArrowRight className="ml-1.5 size-4 shrink-0" aria-hidden />}
      </button>

      {message ? (
        <p role="alert" className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}
    </form>
  );
}
