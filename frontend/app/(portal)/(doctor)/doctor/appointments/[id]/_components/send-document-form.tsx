"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Paperclip, Send } from "lucide-react";
import type { DoctorDocumentDto } from "@/lib/api/doctor-api";
import { doctorApiErrorMessage, parseDoctorApiJson } from "@/lib/doctor-api-client";

export type SendDocumentFormCopy = {
  title: string;
  description: string;
  nameField: string;
  namePlaceholder: string;
  nameRequired: string;
  fileField: string;
  chooseFile: string;
  changeFile: string;
  acceptedTypes: string;
  fileRequired: string;
  fileTooLarge: string;
  subjectPreview: string;
  send: string;
  sending: string;
  sendFailed: string;
  sentTo: string;
};

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Name a document, attach a file, email it to the patient — one action.
 *
 * The name is required, not optional as on the plain upload form: it becomes
 * the patient's email subject (`<name> by <doctor>`), so it is shown back as a
 * live preview before sending. The file is stored on the appointment as well
 * as sent, so the clinical record always holds what the patient received.
 */
export function SendDocumentForm({
  appointmentId,
  doctorName,
  onSent,
  copy,
}: {
  appointmentId: string;
  doctorName: string;
  onSent: (doc: DoctorDocumentDto) => void;
  copy: SendDocumentFormCopy;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmedName = name.trim();
  const canSend = Boolean(trimmedName) && Boolean(file) && !pending;

  function send() {
    setError(null);
    setSentTo(null);
    if (!trimmedName) {
      setError(copy.nameRequired);
      return;
    }
    if (!file) {
      setError(copy.fileRequired);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(copy.fileTooLarge);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", trimmedName);
      fd.append("file", file);
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents-send-to-patient`,
        { method: "POST", body: fd },
      );
      const json = await parseDoctorApiJson<{
        ok?: boolean;
        message?: string;
        data?: { document?: DoctorDocumentDto; sentTo?: string };
      }>(res);
      if (!json?.ok || !json.data?.document) {
        setError(doctorApiErrorMessage(res, json, copy.sendFailed));
        return;
      }
      onSent(json.data.document);
      setSentTo(json.data.sentTo ?? null);
      setName("");
      setFile(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-[var(--portal-line)] bg-white/75 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--portal-well)] text-[var(--portal-primary)]">
          <Send className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--portal-text)]">{copy.title}</p>
          <p className="mt-1 text-portal-meta text-[var(--portal-muted)]">{copy.description}</p>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="gh-field-label">{copy.nameField}</span>
        <input
          className="gh-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          placeholder={copy.namePlaceholder}
        />
      </label>

      {/* The patient sees exactly this in their inbox — show it before sending
          rather than after, when it can still be changed. */}
      <p className="text-portal-meta text-[var(--portal-muted)]">
        {copy.subjectPreview}:{" "}
        <span className="font-semibold text-[var(--portal-text)]">
          {trimmedName || copy.namePlaceholder} {`by ${doctorName}`}
        </span>
      </p>

      <div className="flex flex-col gap-1">
        <span className="gh-field-label">{copy.fileField}</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="gh-btn gh-btn-soft text-sm"
          >
            <Paperclip className="size-3.5" aria-hidden />
            {file ? copy.changeFile : copy.chooseFile}
          </button>
          {file ? (
            <span className="text-portal-compact text-[var(--portal-text)]">{file.name}</span>
          ) : (
            <span className="text-portal-thead text-[var(--portal-muted)]">
              {copy.acceptedTypes}
            </span>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setError(null);
          e.target.value = "";
        }}
      />

      <div>
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className="gh-btn gh-btn-primary w-full sm:w-auto"
        >
          <Send className="size-3.5" aria-hidden />
          {pending ? copy.sending : copy.send}
        </button>
      </div>

      {sentTo ? (
        <p className="gh-status-success flex items-center gap-1.5 rounded-md border px-3 py-2 text-portal-label">
          <Check className="size-3.5" aria-hidden /> {copy.sentTo} {sentTo}
        </p>
      ) : null}
      {error ? (
        <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">{error}</p>
      ) : null}
    </div>
  );
}
