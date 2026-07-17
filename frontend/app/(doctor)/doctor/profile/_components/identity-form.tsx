"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Crop, Lock } from "lucide-react";
import { PhoneField } from "@/components/forms/phone-field";
import { dialCodeForCountry } from "@/lib/phone/dial-codes";
import { LanguagePicker, canonicalizeLanguages } from "@/components/forms/LanguagePicker";
import { FormSection } from "@/components/FormSection";
import { PortalDialog } from "@/components/PortalDialog";
import { Pill } from "@/components/portal-atoms";
import { FocalPointEditor, type FocalValue } from "@/components/media/focal-point-editor";
import { focalStyle } from "@/components/media/doctor-photo";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import type { DoctorProfileChangeRequest } from "@/lib/api/doctor-api";
import {
  ApprovalNotice,
  MessageBanner,
  isPending,
  requestFor,
  resolvePhotoSrc,
  submitChangeRequests,
  type Msg,
} from "./form-helpers";
import type { ProfileStrings } from "./profile-sections";

/**
 * Identity & contact — the global fields shared by every market a doctor
 * practices in. Lives on the "Identity" tab of the combined `/doctor/profile`
 * page, and splits into two halves by who owns the field:
 *
 *  - Name, qualifications and photo are admin-approved. Editing them raises a
 *    DoctorProfileChangeRequest; the live profile is untouched until an admin
 *    signs it off, so while one is pending the input is locked to the live
 *    value and the proposal shows beneath it.
 *  - Languages and WhatsApp are the doctor's own and save immediately.
 */
export function DoctorIdentityForm({
  initial,
  changeRequests,
  strings,
}: {
  initial: {
    fullName: string;
    qualifications: string[];
    languages: string[];
    whatsappNumber: string;
    profileImagePath: string | null;
    profileImageFocalX?: number;
    profileImageFocalY?: number;
    profileImageZoom?: number;
    primaryCountryCode: string;
  };
  changeRequests: DoctorProfileChangeRequest[];
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

  const fullNameRequest = requestFor(changeRequests, "fullName", null);
  const qualificationsRequest = requestFor(changeRequests, "qualifications", null);
  const photoRequest = requestFor(changeRequests, "photo", null);
  const fullNameLocked = isPending(fullNameRequest);
  const qualificationsLocked = isPending(qualificationsRequest);
  const photoLocked = isPending(photoRequest);
  const pendingPhoto =
    photoLocked && photoRequest && "removed" in photoRequest.proposedValue
      ? photoRequest.proposedValue
      : null;
  const pendingPhotoPath =
    pendingPhoto && pendingPhoto.removed === false ? pendingPhoto.path : null;

  /* ── Admin-approved fields ────────────────────────── */
  const [approvalPending, startApprovalTransition] = useTransition();
  const [approvalMsg, setApprovalMsg] = useState<Msg | null>(null);
  const [fullName, setFullName] = useState(initial.fullName);
  const [qualifications, setQualifications] = useState(initialQualificationsText);

  /* ── Contact fields (no approval needed) ──────────── */
  const [contactPending, startContactTransition] = useTransition();
  const [contactMsg, setContactMsg] = useState<Msg | null>(null);
  const [languages, setLanguages] = useState<string[]>(initialLanguages);
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber);

  const [withdrawing, startWithdrawTransition] = useTransition();

  const [approvalSnapshot, setApprovalSnapshot] = useState(() =>
    JSON.stringify({ fullName: initial.fullName, qualifications: initialQualificationsText }),
  );
  const [contactSnapshot, setContactSnapshot] = useState(() =>
    JSON.stringify({ languages: initialLanguages, whatsappNumber: initial.whatsappNumber }),
  );
  const approvalDirty = JSON.stringify({ fullName, qualifications }) !== approvalSnapshot;
  const contactDirty = JSON.stringify({ languages, whatsappNumber }) !== contactSnapshot;
  useUnsavedChanges(approvalDirty || contactDirty);

  /* ── Photo ────────────────────────────────────────── */
  const [photoPending, startPhotoTransition] = useTransition();
  const [photoPath, setPhotoPath] = useState<string | null>(initial.profileImagePath);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [removePhotoDialogOpen, setRemovePhotoDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Focal point / zoom ──────────────────────────── */
  // Crops the photo the doctor is *proposing* when one is pending, otherwise
  // the live one — same rule the backend applies when it folds a crop into the
  // open photo request.
  const editableFocal: FocalValue =
    pendingPhoto && pendingPhoto.removed === false
      ? { focalX: pendingPhoto.focalX, focalY: pendingPhoto.focalY, zoom: pendingPhoto.zoom }
      : {
          focalX: initial.profileImageFocalX ?? 50,
          focalY: initial.profileImageFocalY ?? 50,
          zoom: initial.profileImageZoom ?? 1,
        };
  const [focal, setFocal] = useState<FocalValue>(editableFocal);
  const [focalDraft, setFocalDraft] = useState<FocalValue>(editableFocal);
  const [focalEditorOpen, setFocalEditorOpen] = useState(false);
  const [focalSaving, setFocalSaving] = useState(false);
  const focalKey = `${editableFocal.focalX}:${editableFocal.focalY}:${editableFocal.zoom}`;

  const cropSrc = pendingPhotoPath ?? photoPath;

  function openFocalEditor() {
    setFocalDraft(focal);
    setFocalEditorOpen(true);
  }

  function saveFocal() {
    setFocalSaving(true);
    startPhotoTransition(async () => {
      try {
        const res = await fetch("/api/doctor/profile/photo/position", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(focalDraft),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setPhotoError(json.message ?? strings.saveProfileFailed);
          return;
        }
        setFocal(focalDraft);
        setFocalEditorOpen(false);
        setPhotoMsg(strings.changesSubmitted);
        router.refresh();
      } catch {
        setPhotoError(strings.networkError);
      } finally {
        setFocalSaving(false);
      }
    });
  }

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
    setFocal(editableFocal);
    setApprovalSnapshot(
      JSON.stringify({ fullName: initial.fullName, qualifications: initialQualificationsText }),
    );
    setContactSnapshot(
      JSON.stringify({ languages: initialLanguages, whatsappNumber: initial.whatsappNumber }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initial.fullName,
    initialQualificationsText,
    initialLanguages,
    initial.whatsappNumber,
    initial.profileImagePath,
    focalKey,
  ]);

  function uploadPhoto(file: File) {
    setPhotoError(null);
    setPhotoMsg(null);
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(strings.photoTooLarge);
      return;
    }
    startPhotoTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/doctor/profile/photo", { method: "POST", body: fd });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setPhotoError(json.message ?? strings.uploadFailed);
          return;
        }
        // The upload is only a proposal, so the live photo above is unchanged.
        // Reset the crop and open the editor so the doctor frames the photo
        // they're asking for before an admin sees it.
        const defaultFocal = { focalX: 50, focalY: 50, zoom: 1 };
        setFocal(defaultFocal);
        setFocalDraft(defaultFocal);
        setPhotoMsg(strings.photoSubmitted);
        setFocalEditorOpen(true);
        router.refresh();
      } catch {
        setPhotoError(strings.networkError);
      }
    });
  }

  function confirmRemovePhoto() {
    setPhotoError(null);
    setPhotoMsg(null);
    setRemovePhotoDialogOpen(false);
    startPhotoTransition(async () => {
      const res = await fetch("/api/doctor/profile/photo", { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setPhotoError(json.message ?? strings.removeFailed);
        return;
      }
      setPhotoMsg(strings.changesSubmitted);
      router.refresh();
    });
  }

  function withdraw(requestId: string) {
    startWithdrawTransition(async () => {
      try {
        const res = await fetch(`/api/doctor/profile/change-requests/${requestId}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setApprovalMsg({ kind: "error", text: json.message ?? strings.withdrawFailed });
          return;
        }
        setApprovalMsg({ kind: "success", text: strings.changeWithdrawn });
        router.refresh();
      } catch {
        setApprovalMsg({ kind: "error", text: strings.networkErrorRetry });
      }
    });
  }

  function onSubmitApproval(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApprovalMsg(null);

    const parsedQualifications = qualifications
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const jobs: Array<Record<string, unknown>> = [];
    if (!fullNameLocked && fullName.trim() !== initial.fullName) {
      jobs.push({ field: "fullName", value: fullName.trim() });
    }
    if (
      !qualificationsLocked &&
      JSON.stringify(parsedQualifications) !== JSON.stringify(initial.qualifications)
    ) {
      jobs.push({ field: "qualifications", value: parsedQualifications });
    }
    if (jobs.length === 0) {
      setApprovalMsg({ kind: "error", text: strings.noChangesToSubmit });
      return;
    }

    startApprovalTransition(async () => {
      const errors = await submitChangeRequests(jobs, strings.submitApprovalFailed);
      setApprovalMsg(
        errors.length === 0
          ? { kind: "success", text: strings.changesSubmitted }
          : { kind: "error", text: errors.join(" ") },
      );
      router.refresh();
    });
  }

  function onSubmitContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactMsg(null);
    const payload = {
      languages: languages.map((l) => l.trim()).filter(Boolean),
      whatsappNumber: whatsappNumber.trim() || null,
    };
    startContactTransition(async () => {
      try {
        const res = await fetch("/api/doctor/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setContactMsg({ kind: "error", text: json.message ?? strings.saveProfileFailed });
          return;
        }
        setContactMsg({ kind: "success", text: json.message ?? strings.profileUpdated });
        router.refresh();
      } catch {
        setContactMsg({ kind: "error", text: strings.networkErrorRetry });
      }
    });
  }

  const initials =
    initial.fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div className="gh-doctor-detail-grid gh-doctor-profile-edit-layout grid gap-4">
      <div className="grid gap-4">
        {/* ── Admin-approved: name + qualifications ── */}
        <form onSubmit={onSubmitApproval}>
          <FormSection
            title={strings.approvedDetailsSection}
            description={strings.approvedDetailsSectionDesc}
            titleAs="h2"
          >
            <label className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label inline-flex items-center gap-1.5">
                {strings.fullName}
                <Lock className="size-3" aria-label={strings.lockedBadge} />
              </span>
              <input
                className="gh-input min-w-0"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={200}
                disabled={fullNameLocked}
                required
              />
              <ApprovalNotice
                request={fullNameRequest}
                strings={strings}
                busy={withdrawing}
                onWithdraw={withdraw}
                renderValue={(r) =>
                  "value" in r.proposedValue && typeof r.proposedValue.value === "string"
                    ? r.proposedValue.value
                    : null
                }
              />
            </label>

            <label className="gh-form-section__span-2 flex flex-col gap-2">
              <span className="gh-field-label inline-flex items-center gap-1.5">
                {strings.qualifications}
                <Lock className="size-3" aria-label={strings.lockedBadge} />
              </span>
              <textarea
                className="gh-input min-h-[8rem] min-w-0 resize-y"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder={strings.qualificationsPlaceholder}
                disabled={qualificationsLocked}
              />
              <span className="text-xs text-[var(--portal-muted)]">{strings.qualificationsHint}</span>
              <ApprovalNotice
                request={qualificationsRequest}
                strings={strings}
                busy={withdrawing}
                onWithdraw={withdraw}
                renderValue={(r) =>
                  "value" in r.proposedValue && Array.isArray(r.proposedValue.value)
                    ? r.proposedValue.value.join(", ")
                    : null
                }
              />
            </label>

            {approvalMsg ? (
              <div className="gh-form-section__span-2">
                <MessageBanner msg={approvalMsg} />
              </div>
            ) : null}

            <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
              <button
                type="submit"
                disabled={approvalPending || (fullNameLocked && qualificationsLocked)}
                className="gh-btn gh-btn-primary"
              >
                {approvalPending ? strings.submitting : strings.submitForApproval}
              </button>
            </div>
          </FormSection>
        </form>

        {/* ── Doctor-owned: languages + WhatsApp ── */}
        <form onSubmit={onSubmitContact}>
          <FormSection
            title={strings.contactSection}
            description={strings.contactSectionDesc}
            titleAs="h2"
          >
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

            {contactMsg ? (
              <div className="gh-form-section__span-2">
                <MessageBanner msg={contactMsg} />
              </div>
            ) : null}

            <div className="gh-form-section__span-2 gh-doctor-form-actions flex justify-end">
              <button type="submit" disabled={contactPending} className="gh-btn gh-btn-primary">
                {contactPending ? strings.saving : strings.saveContact}
              </button>
            </div>
          </FormSection>
        </form>
      </div>

      <aside className="gh-doctor-side-stack grid gap-4 self-start">
        <section className="gh-card gh-doctor-profile-photo-card p-6">
          <h2
            className="m-0 inline-flex items-center gap-1.5 text-[var(--portal-text)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            {strings.profilePhotoTitle}
            <Lock className="size-3" aria-label={strings.lockedBadge} />
          </h2>
          <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">{strings.profilePhotoHint}</p>
          <div className="gh-doctor-profile-photo mt-3 flex flex-col items-center gap-3">
            {/* While a photo change is pending the doctor sees both: what
                patients get today, and what they've asked for. */}
            <div className="flex flex-wrap items-start justify-center gap-4">
              <figure className="m-0 flex flex-col items-center gap-1.5">
                <div
                  className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
                  style={{ background: "var(--portal-well)", border: "1px solid var(--portal-line)" }}
                >
                  {photoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvePhotoSrc(photoPath) ?? photoPath}
                      alt="Profile"
                      style={{
                        height: "100%",
                        width: "100%",
                        ...focalStyle(
                          initial.profileImageFocalX ?? 50,
                          initial.profileImageFocalY ?? 50,
                          initial.profileImageZoom ?? 1,
                        ),
                      }}
                    />
                  ) : (
                    <span className="text-[28px] font-bold" style={{ color: "var(--portal-primary)" }}>
                      {initials}
                    </span>
                  )}
                </div>
                {photoLocked ? (
                  <figcaption className="text-portal-meta text-[var(--portal-muted)]">
                    {strings.photoCurrentLabel}
                  </figcaption>
                ) : null}
              </figure>

              {pendingPhotoPath ? (
                <figure className="m-0 flex flex-col items-center gap-1.5">
                  <div
                    className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full"
                    style={{
                      background: "var(--portal-well)",
                      border: "1px solid var(--portal-warning)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvePhotoSrc(pendingPhotoPath) ?? pendingPhotoPath}
                      alt={strings.photoPendingPreviewLabel}
                      style={{
                        height: "100%",
                        width: "100%",
                        ...focalStyle(focal.focalX, focal.focalY, focal.zoom),
                      }}
                    />
                  </div>
                  <figcaption>
                    <Pill tone="pending">{strings.photoPendingPreviewLabel}</Pill>
                  </figcaption>
                </figure>
              ) : null}
            </div>

            {photoLocked && photoRequest ? (
              <p className="gh-status-warning w-full rounded-md border px-3 py-2 text-portal-label">
                {pendingPhoto?.removed
                  ? strings.photoRemovalPendingNote
                  : strings.photoPendingNote}
              </p>
            ) : null}
            {photoRequest?.status === "rejected" ? (
              <div className="gh-status-warning w-full rounded-md border px-3 py-2 text-portal-label">
                <p className="m-0">{strings.photoRejectedNote}</p>
                {photoRequest.reviewNote ? (
                  <p className="m-0 mt-1 text-xs">
                    <span className="font-semibold">{strings.adminNoteLabel}:</span>{" "}
                    {photoRequest.reviewNote}
                  </p>
                ) : null}
              </div>
            ) : null}

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
              {cropSrc ? (
                <button
                  type="button"
                  onClick={openFocalEditor}
                  disabled={photoPending}
                  className="gh-btn gh-btn-soft w-full"
                >
                  <Crop className="size-3.5" /> {strings.adjustImage}
                </button>
              ) : null}
              {photoPath && !photoLocked ? (
                <button
                  type="button"
                  onClick={() => setRemovePhotoDialogOpen(true)}
                  disabled={photoPending}
                  className="gh-btn gh-btn-soft w-full"
                >
                  <Trash2 className="size-3.5" /> {strings.removePhoto}
                </button>
              ) : null}
              {photoLocked && photoRequest ? (
                <button
                  type="button"
                  onClick={() => withdraw(photoRequest.id)}
                  disabled={withdrawing}
                  className="gh-btn gh-btn-soft w-full"
                >
                  {withdrawing ? strings.withdrawing : strings.withdrawRequest}
                </button>
              ) : null}
            </div>
            {photoMsg ? (
              <p
                role="status"
                aria-live="polite"
                className="gh-status-success w-full rounded-md border px-3 py-2 text-portal-label"
              >
                {photoMsg}
              </p>
            ) : null}
            {photoError ? (
              <p className="gh-status-warning w-full rounded-md border px-3 py-2 text-portal-label">
                {photoError}
              </p>
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
              {photoPending ? strings.submitting : strings.submitForApproval}
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--portal-muted)]">{strings.removePhotoBody}</p>
      </PortalDialog>

      {cropSrc ? (
        <PortalDialog
          open={focalEditorOpen}
          onClose={() => setFocalEditorOpen(false)}
          title={strings.adjustPhoto}
          width="lg"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFocalEditorOpen(false)}
                disabled={focalSaving}
                className="gh-btn gh-btn-soft"
              >
                {strings.cancel}
              </button>
              <button type="button" onClick={saveFocal} disabled={focalSaving} className="gh-btn gh-btn-primary">
                {focalSaving ? strings.submitting : strings.submitForApproval}
              </button>
            </div>
          }
        >
          <FocalPointEditor
            src={resolvePhotoSrc(cropSrc) ?? cropSrc}
            focalX={focalDraft.focalX}
            focalY={focalDraft.focalY}
            zoom={focalDraft.zoom}
            onChange={setFocalDraft}
            labels={{
              dragAria: strings.focalDragAria,
              zoom: strings.focalZoom,
              moveUp: strings.focalMoveUp,
              moveLeft: strings.focalMoveLeft,
              moveDown: strings.focalMoveDown,
              moveRight: strings.focalMoveRight,
              reset: strings.focalReset,
              previewCard: strings.focalPreviewCard,
              previewProfile: strings.focalPreviewProfile,
              previewAvatar: strings.focalPreviewAvatar,
            }}
          />
        </PortalDialog>
      ) : null}
    </div>
  );
}
