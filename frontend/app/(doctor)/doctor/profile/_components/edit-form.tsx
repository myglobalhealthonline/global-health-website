"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Globe2, Landmark, Upload, Trash2 } from "lucide-react";
import { RichTextHtmlField } from "@/app/(admin)/admin/_components/rich-text-html-field";
import { PhoneField } from "@/components/forms/phone-field";
import {
  LanguagePicker,
  canonicalizeLanguages,
} from "@/components/forms/LanguagePicker";
import { PortalTabs } from "@/components/PortalTabs";
import { FormSection } from "@/components/FormSection";

/**
 * Doctor self-edit profile form. Split into two independent forms so that
 * bank-field validation can never block a public-profile save:
 *
 *  1. Profile form  — fullName, bio, qualifications, languages, whatsapp
 *  2. Payout form   — bankAccountHolder, bankBic, bankIban
 *
 * Each form sends only its own fields to PATCH /api/doctor/profile, so
 * a bad BIC in the payout section can't prevent a name change from saving.
 */

type Initial = {
  fullName: string;
  bio: string;
  defaultLocale: string;
  supportedLocales: Array<{ code: string; isDefault: boolean }>;
  translations: Array<{ locale: string; bio: string | null }>;
  qualifications: string[];
  languages: string[];
  whatsappNumber: string;
  profileImagePath: string | null;
  bankAccountHolder: string;
  bankBic: string;
  /** Masked IBAN ("•••• 1234") when one is on file, else null. */
  bankIbanMasked: string | null;
  bankIbanSet: boolean;
  markets: Array<{
    id: string;
    countryId: string;
    country: { id: string; code: string; name: string; slug: string; defaultLocale: string };
    supportedLocales: Array<{ code: string; isDefault: boolean }>;
    chamberEntity: string | null;
    registrationNumber: string | null;
    division: string | null;
    isVerified: boolean;
    verifiedAt: string | null;
    translations: Array<{ locale: string; bio: string | null }>;
    bank: {
      accountHolder: string | null;
      bic: string | null;
      ibanMasked: string | null;
      ibanSet: boolean;
    };
  }>;
};

type Msg = { kind: "success" | "error"; text: string };

function resolvePhotoSrc(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api/media/")) {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
    return base ? `${base}${path}` : path;
  }
  return path;
}

function normalizeBioPayload(html: string): string | null {
  const trimmed = html.trim();
  if (!trimmed) return null;
  const root = document.createElement("div");
  root.innerHTML = trimmed;
  const text = (root.textContent ?? "").replace(/\u00a0/g, " ").trim();
  const hasMeaningfulMedia = root.querySelector("img") !== null;
  return text || hasMeaningfulMedia ? trimmed : null;
}

function MessageBanner({ msg }: { msg: Msg }) {
  return (
    <p
      className={`${
        msg.kind === "success" ? "gh-status-success" : "gh-status-warning"
      } mt-4 rounded-md border px-4 py-3 text-sm`}
    >
      {msg.text}
    </p>
  );
}

function localeLabel(code: string): string {
  const labels: Record<string, string> = {
    EN: "English",
    PT: "Portuguese",
    ES: "Spanish",
    CS: "Czech",
    RO: "Romanian",
    DE: "German",
  };
  return labels[code.toUpperCase()] ?? code.toUpperCase();
}

/** BIC: 6 letters + 2 alphanumeric + optional 3 alphanumeric (8 or 11 chars). */
const BIC_RE = /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/;

function bicError(raw: string): string | null {
  const v = raw.trim().replace(/\s/g, "");
  if (!v) return null;
  return BIC_RE.test(v) ? null : "Must be 8 or 11 characters, e.g. AIBKIE2D";
}

function ibanError(raw: string): string | null {
  const v = raw.trim().replace(/\s/g, "");
  if (!v) return null;
  if (v.length < 15 || v.length > 34) return "IBAN must be 15–34 characters";
  if (!/^[A-Za-z]{2}\d{2}[A-Za-z0-9]+$/.test(v))
    return "Must start with 2-letter country code then digits";
  return null;
}

export function DoctorProfileEditForm({
  initial,
  activeCountryId,
}: {
  initial: Initial;
  /** Country whose profile this page edits. Resolved from the route. */
  activeCountryId: string | null;
}) {
  const router = useRouter();
  const initialQualificationsText = initial.qualifications.join("\n");
  const initialLanguagesKey = initial.languages.join("\u0000");
  const initialLanguages = useMemo(
    () => canonicalizeLanguages(initial.languages),
    [initialLanguagesKey],
  );
  const marketOptions = initial.markets.length > 0 ? initial.markets : [];
  const activeMarket =
    marketOptions.find((market) => market.countryId === activeCountryId) ??
    marketOptions[0] ??
    null;
  const activeCountryName = activeMarket?.country.name ?? null;
  const activeMarketBank = activeMarket?.bank ?? null;
  const activeMarketHasIban = activeMarketBank?.ibanSet ?? initial.bankIbanSet;
  const activeMarketIbanMasked =
    activeMarketBank?.ibanMasked ?? initial.bankIbanMasked ?? "•••• ••••";
  const defaultLocale = (
    activeMarket?.country.defaultLocale ?? initial.defaultLocale
  ).toUpperCase();
  const supportedLocaleSource =
    activeMarket?.supportedLocales ?? initial.supportedLocales;
  const localeTabsKey = supportedLocaleSource
    .map((locale) => `${locale.code}:${locale.isDefault ? "1" : "0"}`)
    .join("|");
  const localeTabs = useMemo(() => {
    const seen = new Set<string>();
    const tabs = supportedLocaleSource
      .map((locale) => ({
        code: locale.code.toUpperCase(),
        isDefault: locale.isDefault || locale.code.toUpperCase() === defaultLocale,
      }))
      .filter((locale) => {
        if (seen.has(locale.code)) return false;
        seen.add(locale.code);
        return true;
      });
    if (!seen.has(defaultLocale)) {
      tabs.unshift({ code: defaultLocale, isDefault: true });
    }
    return tabs.length > 0 ? tabs : [{ code: "EN", isDefault: true }];
  }, [defaultLocale, supportedLocaleSource, localeTabsKey]);

  /* ── Profile form ─────────────────────────────────── */
  const [profilePending, startProfileTransition] = useTransition();
  const [profileMsg, setProfileMsg] = useState<Msg | null>(null);
  const [activeBioLocale, setActiveBioLocale] = useState(
    localeTabs.find((locale) => locale.isDefault)?.code ?? localeTabs[0].code,
  );
  const [fullName, setFullName] = useState(initial.fullName);
  const [qualifications, setQualifications] = useState(initialQualificationsText);
  const [languages, setLanguages] = useState<string[]>(initialLanguages);
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber);
  const [chamberEntity, setChamberEntity] = useState(
    activeMarket?.chamberEntity ?? "",
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    activeMarket?.registrationNumber ?? "",
  );
  const [registrationDivision, setRegistrationDivision] = useState(
    activeMarket?.division ?? "",
  );

  /* ── Payout form ──────────────────────────────────── */
  const [payoutPending, startPayoutTransition] = useTransition();
  const [payoutMsg, setPayoutMsg] = useState<Msg | null>(null);
  const [bankAccountHolder, setBankAccountHolder] = useState(
    activeMarket?.bank.accountHolder ?? initial.bankAccountHolder,
  );
  const [bankBic, setBankBic] = useState(activeMarket?.bank.bic ?? initial.bankBic);
  const [bankIban, setBankIban] = useState("");
  const [bicFieldError, setBicFieldError] = useState<string | null>(null);
  const [ibanFieldError, setIbanFieldError] = useState<string | null>(null);

  /* ── Photo ────────────────────────────────────────── */
  const [photoPending, startPhotoTransition] = useTransition();
  const [photoPath, setPhotoPath] = useState<string | null>(
    initial.profileImagePath,
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verifiedMarketCount = initial.markets.filter((market) => market.isVerified).length;

  useEffect(() => {
    setFullName(initial.fullName);
    setQualifications(initialQualificationsText);
    setLanguages(initialLanguages);
    setWhatsappNumber(initial.whatsappNumber);
    setChamberEntity(activeMarket?.chamberEntity ?? "");
    setRegistrationNumber(activeMarket?.registrationNumber ?? "");
    setRegistrationDivision(activeMarket?.division ?? "");
    setBankAccountHolder(activeMarket?.bank.accountHolder ?? initial.bankAccountHolder);
    setBankBic(activeMarket?.bank.bic ?? initial.bankBic);
    setBankIban("");
    setPhotoPath(initial.profileImagePath);
    setActiveBioLocale(
      localeTabs.find((locale) => locale.isDefault)?.code ?? localeTabs[0].code,
    );
  }, [
    initial.fullName,
    initialQualificationsText,
    initialLanguages,
    initialLanguagesKey,
    initial.whatsappNumber,
    initial.bankAccountHolder,
    initial.bankBic,
    initial.profileImagePath,
    activeMarket?.countryId,
    activeMarket?.chamberEntity,
    activeMarket?.registrationNumber,
    activeMarket?.division,
    activeMarket?.bank.accountHolder,
    activeMarket?.bank.bic,
    localeTabs,
    localeTabsKey,
  ]);

  function initialBioForLocale(locale: string): string {
    const normalized = locale.toUpperCase();
    const sourceTranslations = activeMarket?.translations ?? initial.translations;
    const translated = sourceTranslations.find(
      (entry) => entry.locale.toUpperCase() === normalized,
    );
    return translated?.bio ?? (normalized === defaultLocale ? initial.bio : "");
  }

  /* ── Photo handlers ──────────────────────────────── */
  function uploadPhoto(file: File) {
    setPhotoError(null);
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("File too large (max 5MB).");
      return;
    }
    startPhotoTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/doctor/profile/photo", {
          method: "POST",
          body: fd,
        });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          data?: { path?: string };
        };
        if (!res.ok || !json.ok) {
          setPhotoError(json.message ?? "Upload failed");
          return;
        }
        if (json.data?.path) setPhotoPath(json.data.path);
        router.refresh();
      } catch {
        setPhotoError("Network error");
      }
    });
  }

  function removePhoto() {
    setPhotoError(null);
    if (!confirm("Remove your profile photo?")) return;
    startPhotoTransition(async () => {
      const res = await fetch("/api/doctor/profile/photo", {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setPhotoError(json.message ?? "Could not remove");
        return;
      }
      setPhotoPath(null);
      router.refresh();
    });
  }

  /* ── Profile submit ──────────────────────────────── */
  function onSubmitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMsg(null);
    const formData = new FormData(event.currentTarget);
    const translations = localeTabs.map((locale) => {
      const bio = normalizeBioPayload(
        String(formData.get(`bio_${locale.code}`) ?? ""),
      );
      return { locale: locale.code, bio };
    });
    const payload = {
      fullName: fullName.trim(),
      qualifications: qualifications
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      languages: languages.map((l) => l.trim()).filter(Boolean),
      whatsappNumber: whatsappNumber.trim() || null,
    };
    const marketPayload = activeMarket
      ? {
          translations,
          chamberEntity: chamberEntity.trim() || null,
          registrationNumber: registrationNumber.trim() || null,
          division: registrationDivision.trim() || null,
        }
      : null;
    startProfileTransition(async () => {
      try {
        const res = await fetch("/api/doctor/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setProfileMsg({
            kind: "error",
            text: json.message ?? "Could not save profile",
          });
          return;
        }
        if (activeMarket && marketPayload) {
          const marketRes = await fetch(
            `/api/doctor/profile/markets/${encodeURIComponent(activeMarket.countryId)}`,
            {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(marketPayload),
            },
          );
          const marketJson = (await marketRes.json()) as {
            ok?: boolean;
            message?: string;
          };
          if (!marketRes.ok || !marketJson.ok) {
            setProfileMsg({
              kind: "error",
              text: marketJson.message ?? "Could not save country profile",
            });
            return;
          }
        }
        setProfileMsg({
          kind: "success",
          text: activeMarket
            ? `Profile and ${activeCountryName ?? "country"} details updated`
            : json.message ?? "Profile updated",
        });
        router.refresh();
      } catch {
        setProfileMsg({ kind: "error", text: "Network error — try again" });
      }
    });
  }

  /* ── Payout submit ───────────────────────────────── */
  function onSubmitPayout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPayoutMsg(null);
    if (!activeMarket) {
      setPayoutMsg({ kind: "error", text: "No active country is available" });
      return;
    }

    // Client-side validation before hitting the backend
    const bErr = bicError(bankBic);
    const iErr = ibanError(bankIban);
    setBicFieldError(bErr);
    setIbanFieldError(iErr);
    if (bErr || iErr) return;

    const payload: Record<string, string | null> = {
      bankAccountHolder: bankAccountHolder.trim() || null,
      bankBic: bankBic.trim() || null,
    };
    // Only send IBAN when the doctor typed a new one — blank = keep current
    if (bankIban.trim()) payload.bankIban = bankIban.trim();

    startPayoutTransition(async () => {
      try {
        const res = await fetch(
          `/api/doctor/profile/markets/${encodeURIComponent(activeMarket.countryId)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ bank: payload }),
          },
        );
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setPayoutMsg({
            kind: "error",
            text: json.message ?? "Could not save payout details",
          });
          return;
        }
        setPayoutMsg({ kind: "success", text: "Payout details saved" });
        setBankIban("");
        router.refresh();
      } catch {
        setPayoutMsg({ kind: "error", text: "Network error — try again" });
      }
    });
  }

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="gh-doctor-detail-grid gh-doctor-profile-edit-layout grid gap-4">
      <div className="grid gap-4">
        <section className="gh-card p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <ProfileInsight
              icon={<Globe2 className="size-4" aria-hidden />}
              label="Markets"
              value={String(initial.markets.length)}
              helper={activeCountryName ? `Editing ${activeCountryName}` : "Default doctor profile"}
            />
            <ProfileInsight
              icon={<BadgeCheck className="size-4" aria-hidden />}
              label="Verified"
              value={`${verifiedMarketCount}/${initial.markets.length || 1}`}
              helper="Country registration status"
            />
            <ProfileInsight
              icon={<Landmark className="size-4" aria-hidden />}
              label="Payout"
              value={activeMarketHasIban ? "On file" : "Missing"}
              helper={activeCountryName ?? "Bank details"}
            />
          </div>
        </section>
        {/* ── Public profile form ─────────────────── */}
        <form onSubmit={onSubmitProfile}>
          <FormSection
            title="Public profile"
            description={
              activeCountryName
                ? `Patients see this on your ${activeCountryName} doctor card and profile page. Bio, registration, and payout details are saved per country.`
                : "Patients see this on your doctor card and profile page."
            }
          >
            <label className="flex flex-col gap-2">
              <span className="gh-field-label">Full name</span>
              <input
                className="gh-input min-w-0"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={200}
                required
              />
            </label>

            <div className="gh-form-section__span-2 flex flex-col gap-3">
              <div>
                <span className="gh-field-label">Bio by language</span>
                <p className="mt-1 text-xs text-[var(--portal-muted)]">
                  The public website reads these localized bios first. Blank
                  non-default languages fall back to the default language.
                </p>
              </div>
              <PortalTabs
                ariaLabel="Bio languages"
                value={activeBioLocale}
                onChange={setActiveBioLocale}
                items={localeTabs.map((locale) => ({
                  value: locale.code,
                  label: `${localeLabel(locale.code)}${locale.isDefault ? " - default" : ""}`,
                }))}
              />
              {localeTabs.map((locale) => (
                <div
                  key={locale.code}
                  role="tabpanel"
                  hidden={locale.code !== activeBioLocale}
                >
                  <RichTextHtmlField
                    name={`bio_${locale.code}`}
                    label={`${localeLabel(locale.code)} bio`}
                    initialValue={initialBioForLocale(locale.code)}
                    helperText={
                      locale.isDefault
                        ? "Default bio used when a translated bio is blank."
                        : "Leave blank to use the default language bio."
                    }
                  />
                </div>
              ))}
            </div>

            <label className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">Qualifications</span>
              <textarea
                className="gh-input min-h-[8rem] min-w-0 resize-y"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder={"MB BCh BAO\nMRCPI\nFellowship in Cardiology"}
              />
              <span className="text-xs text-[var(--portal-muted)]">
                One per line. Shown as a bullet list on your public profile.
              </span>
            </label>

            <div className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">Languages</span>
              <LanguagePicker selected={languages} onChange={setLanguages} />
              <span className="text-xs text-[var(--portal-muted)]">
                Pick from the list so languages stay consistent on your
                public profile + doctor cards.
              </span>
            </div>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">WhatsApp number</span>
              <PhoneField
                key={initial.whatsappNumber}
                defaultValue={initial.whatsappNumber}
                onChange={setWhatsappNumber}
                className="flex min-w-0 gap-2"
              />
              <span className="text-xs text-[var(--portal-muted)]">
                Optional. Patients can message you directly when set.
              </span>
            </label>

            {activeMarket ? (
              <div className="gh-form-section__span-2 gh-doctor-registration-card rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="gh-field-label">
                      {activeMarket.country.name} registration
                    </span>
                    <p className="mt-1 text-xs text-[var(--portal-muted)]">
                      Edits are sent for admin re-verification before being
                      treated as verified.
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      activeMarket.isVerified
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-[var(--portal-line)] bg-[var(--portal-bg)] text-[var(--portal-muted)]"
                    }`}
                  >
                    {activeMarket.isVerified ? "Verified" : "Needs verification"}
                  </span>
                </div>
                <div className="gh-doctor-field-grid mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-2">
                    <span className="gh-field-label">Registration body</span>
                    <input
                      className="gh-input min-w-0"
                      value={chamberEntity}
                      onChange={(e) => setChamberEntity(e.target.value)}
                      maxLength={64}
                      placeholder="IMC, OM, OMC"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="gh-field-label">Registration number</span>
                    <input
                      className="gh-input min-w-0"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      maxLength={64}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="gh-field-label">Division</span>
                    <input
                      className="gh-input min-w-0"
                      value={registrationDivision}
                      onChange={(e) => setRegistrationDivision(e.target.value)}
                      maxLength={120}
                      placeholder="General Division"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {profileMsg ? (
              <div className="gh-form-section__span-2">
                <MessageBanner msg={profileMsg} />
              </div>
            ) : null}

            <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
              <button
                type="submit"
                disabled={profilePending}
                className="gh-btn gh-btn-primary"
              >
                {profilePending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </FormSection>
        </form>

        {/* ── Payout / bank details form ───────────── */}
        <form onSubmit={onSubmitPayout}>
          <FormSection
            title="Payout details"
            description={
              <>
                {activeCountryName
                  ? `Your bank details for receiving payments in ${activeCountryName}.`
                  : "Your bank details for receiving payments."}{" "}
                Private — never shown on your public profile. Your IBAN is
                stored encrypted.
              </>
            }
          >
            <label className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">Account holder name</span>
              <input
                className="gh-input min-w-0"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                maxLength={160}
                placeholder="Name as it appears on the account"
              />
            </label>

            <label className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">IBAN</span>
              <input
                className="gh-input min-w-0 font-mono"
                value={bankIban}
                onChange={(e) => {
                  setBankIban(e.target.value);
                  setIbanFieldError(null);
                }}
                maxLength={42}
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                placeholder={
                  activeMarketHasIban
                    ? `On file: ${activeMarketIbanMasked} — leave blank to keep`
                    : "IE29 AIBK 9311 5212 3456 78"
                }
              />
              {ibanFieldError ? (
                <span className="text-xs text-red-600">{ibanFieldError}</span>
              ) : (
                <span className="text-xs text-[var(--portal-muted)]">
                  {activeMarketHasIban
                    ? "An IBAN is on file. Type a new one only to replace it."
                    : "Enter your full IBAN. It is stored encrypted and shown masked afterwards."}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">BIC / SWIFT (optional)</span>
              <input
                className="gh-input min-w-0 font-mono"
                value={bankBic}
                onChange={(e) => {
                  setBankBic(e.target.value);
                  setBicFieldError(null);
                }}
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
                placeholder="AIBKIE2D"
              />
              {bicFieldError ? (
                <span className="text-xs text-red-600">{bicFieldError}</span>
              ) : null}
            </label>

            {payoutMsg ? (
              <div className="gh-form-section__span-2">
                <MessageBanner msg={payoutMsg} />
              </div>
            ) : null}

            <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
              <button
                type="submit"
                disabled={payoutPending}
                className="gh-btn gh-btn-primary"
              >
                {payoutPending ? "Saving…" : "Save payout details"}
              </button>
            </div>
          </FormSection>
        </form>
      </div>

      {/* ── Sidebar: photo + admin-managed ───────── */}
      <aside className="gh-doctor-side-stack grid gap-4 self-start">
        <section className="gh-card gh-doctor-profile-photo-card p-6">
          <h3
            className="m-0 text-[var(--portal-text)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Profile photo
          </h3>
          <p className="mt-1 text-[13px] text-[var(--portal-muted)]">
            JPEG / PNG / WebP / AVIF, up to 5MB.
          </p>
          <div className="gh-doctor-profile-photo mt-3 flex flex-col items-center gap-3">
            <div
              className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
              style={{
                background: "var(--portal-well)",
                border: "1px solid var(--portal-line)",
              }}
            >
              {photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvePhotoSrc(photoPath) ?? photoPath}
                  alt="Profile"
                  style={{ height: "100%", width: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  className="text-[28px] font-bold"
                  style={{
                    color: "var(--portal-primary)",
                  }}
                >
                  {fullName
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .join("") || "?"}
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
                e.target.value = "";
              }}
            />
            <div className="gh-doctor-profile-photo-actions flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoPending}
                className="gh-btn gh-btn-primary w-full"
              >
                <Upload className="size-3.5" />
                {photoPending
                  ? "Uploading…"
                  : photoPath
                    ? "Replace photo"
                    : "Upload photo"}
              </button>
              {photoPath ? (
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={photoPending}
                  className="gh-btn gh-btn-soft w-full"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              ) : null}
            </div>
            {photoError ? (
              <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">
                {photoError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="gh-card gh-doctor-admin-note-card p-6">
          <h3
            className="m-0 text-[var(--portal-text)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Admin-managed
          </h3>
          <p className="mt-1 text-[13px] text-[var(--portal-muted)]">
            SEO fields, FAQ sections, country approvals, URL slug, and eligible
            specialties stay admin-managed to keep verification and routing
            consistent. Registration edits are reviewed by admin.
          </p>
        </section>
      </aside>
    </div>
  );
}

function ProfileInsight({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
        <span className="text-[var(--portal-primary)]">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-lg font-extrabold text-[var(--portal-text)]">
        {value}
      </p>
      <p className="mt-1 text-[12px] text-[var(--portal-muted)]">
        {helper}
      </p>
    </div>
  );
}
