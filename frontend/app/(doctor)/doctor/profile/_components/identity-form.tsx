"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";
import { PhoneField } from "@/components/forms/phone-field";
import { dialCodeForCountry } from "@/lib/phone/dial-codes";
import { LanguagePicker, canonicalizeLanguages } from "@/components/forms/LanguagePicker";
import { FormSection } from "@/components/FormSection";
import { PortalDialog } from "@/components/PortalDialog";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { MessageBanner, resolvePhotoSrc, type Msg } from "./form-helpers";
import type { ProfileStrings } from "./profile-sections";

/**
 * Identity & contact — the one global form shared by every market a doctor
 * practices in (name, qualifications, languages, WhatsApp, photo). Lives on
 * the "Identity" tab of the combined `/doctor/profile` page.
 */
export function DoctorIdentityForm({
  initial,
  strings,
}: {
  initial: {
    fullName: string;
    qualifications: string[];
    languages: string[];
    whatsappNumber: string;
    profileImagePath: string | null;
    primaryCountryCode: string;
  };
  strings: ProfileStrings;
}) {
  const router = useRouter();
  const initialQualificationsText = initial.qualifications.join("\n");
  const initialLanguagesKey = initial.languages.join(",");
  // initialLanguagesKey is a content-stable proxy for initial.languages (whose
  // array identity churns every render) — deliberately excluded to avoid
  // recomputing (and re-running the reset effect below) on identity-only
  // changes.
  const initialLanguages = useMemo(
    () => canonicalizeLanguages(initial.languages),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialLanguagesKey],
  );

  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [fullName, setFullName] = useState(initial.fullName);
  const [qualifications, setQualifications] = useState(initialQualificationsText);
  const [languages, setLanguages] = useState<string[]>(initialLanguages);
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber);

  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    JSON.stringify({
      fullName: initial.fullName,
      qualifications: initialQualificationsText,
      languages: initialLanguages,
      whatsappNumber: initial.whatsappNumber,
    }),
  );
  const isDirty =
    JSON.stringify({ fullName, qualifications, languages, whatsappNumber }) !== initialSnapshot;
  useUnsavedChanges(isDirty);

  /* ── Photo ────────────────────────────────────────── */
  const [photoPending, startPhotoTransition] = useTransition();
  const [photoPath, setPhotoPath] = useState<string | null>(initial.profileImagePath);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [removePhotoDialogOpen, setRemovePhotoDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Resets local edit state when a fresh `initial` snapshot arrives (server
    // refetch after save via router.refresh()) — intentional sync, mirrors
    // the reset the single edit form used to do for all its fields.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(initial.fullName);
    setQualifications(initialQualificationsText);
    setLanguages(initialLanguages);
    setWhatsappNumber(initial.whatsappNumber);
    setPhotoPath(initial.profileImagePath);
    setInitialSnapshot(
      JSON.stringify({
        fullName: initial.fullName,
        qualifications: initialQualificationsText,
        languages: initialLanguages,
        whatsappNumber: initial.whatsappNumber,
      }),
    );
  }, [initial.fullName, initialQualificationsText, initialLanguages, initial.whatsappNumber, initial.profileImagePath]);

  function uploadPhoto(file: File) {
    setPhotoError(null);
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(strings.photoTooLarge);
      return;
    }
    startPhotoTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/doctor/profile/photo", { method: "POST", body: fd });
        const json = (await res.json()) as { ok?: boolean; message?: string; data?: { path?: string } };
        if (!res.ok || !json.ok) {
          setPhotoError(json.message ?? strings.uploadFailed);
          return;
        }
        if (json.data?.path) setPhotoPath(json.data.path);
        router.refresh();
      } catch {
        setPhotoError(strings.networkError);
      }
    });
  }

  function confirmRemovePhoto() {
    setPhotoError(null);
    setRemovePhotoDialogOpen(false);
    startPhotoTransition(async () => {
      const res = await fetch("/api/doctor/profile/photo", { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setPhotoError(json.message ?? strings.removeFailed);
        return;
      }
      setPhotoPath(null);
      router.refresh();
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg(null);
    const payload = {
      fullName: fullName.trim(),
      qualifications: qualifications.split("\n").map((l) => l.trim()).filter(Boolean),
      languages: languages.map((l) => l.trim()).filter(Boolean),
      whatsappNumber: whatsappNumber.trim() || null,
    };
    startTransition(async () => {
      try {
        const res = await fetch("/api/doctor/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setMsg({ kind: "error", text: json.message ?? strings.saveProfileFailed });
          return;
        }
        setMsg({ kind: "success", text: json.message ?? strings.profileUpdated });
        router.refresh();
      } catch {
        setMsg({ kind: "error", text: strings.networkErrorRetry });
      }
    });
  }

  return (
    <div className="gh-doctor-detail-grid gh-doctor-profile-edit-layout grid gap-4">
      <div className="grid gap-4">
        <form onSubmit={onSubmit}>
          <FormSection title={strings.identitySection} description={strings.identitySectionDesc} titleAs="h2">
            <label className="flex flex-col gap-2">
              <span className="gh-field-label">{strings.fullName}</span>
              <input
                className="gh-input min-w-0"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">{strings.qualifications}</span>
              <textarea
                className="gh-input min-h-[8rem] min-w-0 resize-y"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder={strings.qualificationsPlaceholder}
              />
              <span className="text-xs text-[var(--portal-muted)]">{strings.qualificationsHint}</span>
            </label>

            <div className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label">{strings.languagesLabel}</span>
              <LanguagePicker selected={languages} onChange={setLanguages} />
              <span className="text-xs text-[var(--portal-muted)]">{strings.languagesHint}</span>
            </div>

            <label className="flex flex-col gap-2">
              <span className="gh-field-label">{strings.whatsappNumber}</span>
              <PhoneField
                key={initial.whatsappNumber}
                defaultValue={initial.whatsappNumber}
                defaultDial={dialCodeForCountry(initial.primaryCountryCode)}
                onChange={setWhatsappNumber}
                className="flex min-w-0 gap-2"
              />
              <span className="text-xs text-[var(--portal-muted)]">{strings.whatsappHint}</span>
            </label>

            {msg ? (
              <div className="gh-form-section__span-2">
                <MessageBanner msg={msg} />
              </div>
            ) : null}

            <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
              <button type="submit" disabled={pending} className="gh-btn gh-btn-primary">
                {pending ? strings.saving : strings.saveIdentity}
              </button>
            </div>
          </FormSection>
        </form>
      </div>

      <aside className="gh-doctor-side-stack grid gap-4 self-start">
        <section className="gh-card gh-doctor-profile-photo-card p-6">
          <h2
            className="m-0 text-[var(--portal-text)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            {strings.profilePhotoTitle}
          </h2>
          <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">{strings.profilePhotoHint}</p>
          <div className="gh-doctor-profile-photo mt-3 flex flex-col items-center gap-3">
            <div
              className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
              style={{ background: "var(--portal-well)", border: "1px solid var(--portal-line)" }}
            >
              {photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvePhotoSrc(photoPath) ?? photoPath}
                  alt="Profile"
                  style={{ height: "100%", width: "100%", objectFit: "cover" }}
                />
              ) : (
                <span className="text-[28px] font-bold" style={{ color: "var(--portal-primary)" }}>
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
                {photoPending ? strings.uploading : photoPath ? strings.replacePhoto : strings.uploadPhoto}
              </button>
              {photoPath ? (
                <button
                  type="button"
                  onClick={() => setRemovePhotoDialogOpen(true)}
                  disabled={photoPending}
                  className="gh-btn gh-btn-soft w-full"
                >
                  <Trash2 className="size-3.5" /> {strings.removePhoto}
                </button>
              ) : null}
            </div>
            {photoError ? (
              <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">{photoError}</p>
            ) : null}
          </div>
        </section>

        <section className="gh-card gh-doctor-admin-note-card p-6">
          <h2
            className="m-0 text-[var(--portal-text)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            {strings.adminManagedTitle}
          </h2>
          <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">{strings.adminManagedDesc}</p>
        </section>
      </aside>

      <PortalDialog
        open={removePhotoDialogOpen}
        onClose={() => setRemovePhotoDialogOpen(false)}
        title={strings.removePhotoConfirm}
        danger
        width="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setRemovePhotoDialogOpen(false)}
              disabled={photoPending}
              className="gh-btn gh-btn-soft"
            >
              {strings.cancel}
            </button>
            <button
              type="button"
              onClick={confirmRemovePhoto}
              disabled={photoPending}
              className="gh-btn gh-btn-primary"
            >
              {photoPending ? strings.uploading : strings.removePhoto}
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--portal-muted)]">{strings.removePhotoBody}</p>
      </PortalDialog>
    </div>
  );
}
