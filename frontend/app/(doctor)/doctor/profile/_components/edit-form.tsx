"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";
import { RichTextHtmlField } from "@/app/(admin)/admin/_components/rich-text-html-field";
import { PhoneField } from "@/components/forms/phone-field";
import {
  LanguagePicker,
  canonicalizeLanguages,
} from "@/components/forms/LanguagePicker";

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

export function DoctorProfileEditForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const initialQualificationsText = initial.qualifications.join("\n");
  const initialLanguagesKey = initial.languages.join("\u0000");
  const initialLanguages = useMemo(
    () => canonicalizeLanguages(initial.languages),
    [initialLanguagesKey],
  );
  const defaultLocale = initial.defaultLocale.toUpperCase();
  const localeTabsKey = initial.supportedLocales
    .map((locale) => `${locale.code}:${locale.isDefault ? "1" : "0"}`)
    .join("|");
  const localeTabs = useMemo(() => {
    const seen = new Set<string>();
    const tabs = initial.supportedLocales
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
  }, [defaultLocale, initial.supportedLocales, localeTabsKey]);

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

  /* ── Payout form ──────────────────────────────────── */
  const [payoutPending, startPayoutTransition] = useTransition();
  const [payoutMsg, setPayoutMsg] = useState<Msg | null>(null);
  const [bankAccountHolder, setBankAccountHolder] = useState(
    initial.bankAccountHolder,
  );
  const [bankBic, setBankBic] = useState(initial.bankBic);
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

  useEffect(() => {
    setFullName(initial.fullName);
    setQualifications(initialQualificationsText);
    setLanguages(initialLanguages);
    setWhatsappNumber(initial.whatsappNumber);
    setBankAccountHolder(initial.bankAccountHolder);
    setBankBic(initial.bankBic);
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
    localeTabs,
    localeTabsKey,
  ]);

  function initialBioForLocale(locale: string): string {
    const normalized = locale.toUpperCase();
    const translated = initial.translations.find(
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
      const bio = String(formData.get(`bio_${locale.code}`) ?? "").trim();
      return { locale: locale.code, bio: bio || null };
    });
    const defaultBio =
      translations.find((entry) => entry.locale === defaultLocale)?.bio ?? null;
    const payload = {
      fullName: fullName.trim(),
      bio: defaultBio,
      translations,
      qualifications: qualifications
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      languages: languages.map((l) => l.trim()).filter(Boolean),
      whatsappNumber: whatsappNumber.trim() || null,
    };
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
        setProfileMsg({
          kind: "success",
          text: json.message ?? "Profile updated",
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
        const res = await fetch("/api/doctor/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
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
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
    >
      <div className="grid gap-4">
        {/* ── Public profile form ─────────────────── */}
        <form onSubmit={onSubmitProfile}>
          <section className="gh-card p-6">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Public profile
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Patients see this on your doctor card and profile page.
            </p>

            <div className="mt-4 flex flex-col gap-4">
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

              <DoctorBioRichTextField initialValue={initial.bio} />

              <label className="flex flex-col gap-2">
                <span className="gh-field-label">Qualifications</span>
                <textarea
                  className="gh-input min-h-[8rem] min-w-0 resize-y"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder={"MB BCh BAO\nMRCPI\nFellowship in Cardiology"}
                />
                <span className="text-xs text-[var(--color-text-muted)]">
                  One per line. Shown as a bullet list on your public profile.
                </span>
              </label>

              <div className="flex flex-col gap-2">
                <span className="gh-field-label">Languages</span>
                <LanguagePicker selected={languages} onChange={setLanguages} />
                <span className="text-xs text-[var(--color-text-muted)]">
                  Pick from the list so languages stay consistent on your
                  public profile + doctor cards.
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="gh-field-label">WhatsApp number</span>
                  <PhoneField
                    key={initial.whatsappNumber}
                    defaultValue={initial.whatsappNumber}
                    onChange={setWhatsappNumber}
                    className="flex min-w-0 gap-2"
                  />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Optional. Patients can message you directly when set.
                  </span>
                </label>
              </div>
            </div>

            {profileMsg ? <MessageBanner msg={profileMsg} /> : null}

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={profilePending}
                className="gh-btn gh-btn-primary"
              >
                {profilePending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </section>
        </form>

        {/* ── Payout / bank details form ───────────── */}
        <form onSubmit={onSubmitPayout}>
          <section className="gh-card p-6">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              Payout details
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              Your bank details for receiving payments. Private — never shown
              on your public profile. Your IBAN is stored encrypted.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="gh-field-label">Account holder name</span>
                <input
                  className="gh-input min-w-0"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  maxLength={160}
                  placeholder="Name as it appears on the account"
                />
              </label>

              <label className="flex flex-col gap-2">
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
                    initial.bankIbanSet
                      ? `On file: ${initial.bankIbanMasked ?? "•••• ••••"} — leave blank to keep`
                      : "IE29 AIBK 9311 5212 3456 78"
                  }
                />
                {ibanFieldError ? (
                  <span className="text-xs text-red-600">{ibanFieldError}</span>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {initial.bankIbanSet
                      ? "An IBAN is on file. Type a new one only to replace it."
                      : "Enter your full IBAN. It is stored encrypted and shown masked afterwards."}
                  </span>
                )}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            </div>

            {payoutMsg ? <MessageBanner msg={payoutMsg} /> : null}

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={payoutPending}
                className="gh-btn gh-btn-primary"
              >
                {payoutPending ? "Saving…" : "Save payout details"}
              </button>
            </div>
          </section>
        </form>
      </div>

      {/* ── Sidebar: photo + admin-managed ───────── */}
      <aside className="grid gap-4 self-start">
        <section className="gh-card p-6">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Profile photo
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            JPEG / PNG / WebP / AVIF, up to 5MB.
          </p>
          <div className="mt-3 flex flex-col items-center gap-3">
            <div
              className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
              style={{
                background: "var(--color-background-soft)",
                border: "1px solid var(--color-border)",
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
                    background:
                      "linear-gradient(135deg, #1d4b36 0%, #b0f122 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
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
            <div className="flex w-full flex-col gap-2">
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

        <section className="gh-card p-6">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Admin-managed
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Country, URL slug, IMC registration, and your eligible specialties
            stay admin-managed to keep verification + routing consistent. Ping
            support if any of those need to change.
          </p>
        </section>
      </aside>
    </div>
  );
}
