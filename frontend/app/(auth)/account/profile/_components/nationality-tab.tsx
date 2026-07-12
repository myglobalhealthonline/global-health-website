"use client";

import { useEffect, useState, useTransition } from "react";
import { Globe, Trash2, Upload, Save } from "lucide-react";
import {
  fetchNationality,
  upsertNationality,
  deleteNationality,
  uploadNationalityDocument,
  type NationalityDoc,
  type VerificationStatus,
} from "@/lib/api/account-profile-api";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

type NationalityI18n = {
  title: string;
  subtitle: string;
  slotTitle: string;
  country: string;
  countryPlaceholder: string;
  documentType: string;
  documentNumber: string;
  storedEncrypted: string;
  expiryDate: string;
  save: string;
  saveSlot: string;
  saving: string;
  saved: string;
  remove: string;
  removing: string;
  saveFirst: string;
  uploadPhotos: string;
  uploadHint: string;
  uploadFront: string;
  replaceFront: string;
  uploadBack: string;
  replaceBack: string;
  uploading: string;
  uploaded: string;
  enableSecond: string;
  maxReached: string;
  loadingRecords: string;
  badgeNotVerified: string;
  badgePending: string;
  badgeVerified: string;
  badgeRejected: string;
  docPassport: string;
  docIdCard: string;
  docResidenceCard: string;
  docNicop: string;
  docCnic: string;
  docOther: string;
};

const DEFAULT_I18N: NationalityI18n = {
  title: "Dual nationality",
  subtitle: "Register up to two nationalities. Document numbers are stored encrypted.",
  slotTitle: "Nationality {n}",
  country: "Country",
  countryPlaceholder: "e.g. Ireland, Pakistan",
  documentType: "Document type",
  documentNumber: "Document number",
  storedEncrypted: "Stored encrypted",
  expiryDate: "Expiry date",
  save: "Save",
  saveSlot: "Save Nationality {n}",
  saving: "Saving…",
  saved: "Nationality saved",
  remove: "Remove",
  removing: "Removing…",
  saveFirst: "Save the nationality record first before uploading documents.",
  uploadPhotos: "Upload document photos",
  uploadHint: "PDF, JPG, PNG — max 10 MB.",
  uploadFront: "Upload front",
  replaceFront: "Replace front",
  uploadBack: "Upload back",
  replaceBack: "Replace back",
  uploading: "Uploading…",
  uploaded: "Document uploaded",
  enableSecond: "Save Nationality 1 first to enable a second nationality.",
  maxReached: "Maximum of two nationality documents reached.",
  loadingRecords: "Loading nationality records",
  badgeNotVerified: "Not verified",
  badgePending: "Pending review",
  badgeVerified: "Verified",
  badgeRejected: "Rejected",
  docPassport: "Passport",
  docIdCard: "National ID card",
  docResidenceCard: "Residence card",
  docNicop: "NICOP",
  docCnic: "CNIC",
  docOther: "Other",
};

type SlotFormState = {
  nationalityCountry: string;
  documentType: string;
  documentNumber: string;
  expiryDate: string;
};

const EMPTY_FORM: SlotFormState = {
  nationalityCountry: "",
  documentType: "passport",
  documentNumber: "",
  expiryDate: "",
};

function docToForm(doc: NationalityDoc): SlotFormState {
  return {
    nationalityCountry: doc.nationalityCountry,
    documentType: doc.documentType,
    documentNumber: doc.documentNumber ?? "",
    expiryDate: doc.expiryDate ? doc.expiryDate.slice(0, 10) : "",
  };
}

function SlotCard({
  slot,
  doc,
  onSaved,
  onDeleted,
  onDirtyChange,
  i18n,
}: {
  slot: 1 | 2;
  doc: NationalityDoc | undefined;
  onSaved: (doc: NationalityDoc) => void;
  onDeleted: (slot: 1 | 2) => void;
  onDirtyChange?: (slot: 1 | 2, dirty: boolean) => void;
  i18n: NationalityI18n;
}) {
  const BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
    NOT_VERIFIED: { label: i18n.badgeNotVerified, cls: "bg-gray-100 text-gray-700" },
    PENDING: { label: i18n.badgePending, cls: "bg-amber-100 text-amber-800" },
    VERIFIED: { label: i18n.badgeVerified, cls: "bg-emerald-100 text-emerald-800" },
    REJECTED: { label: i18n.badgeRejected, cls: "bg-rose-100 text-rose-800" },
  };
  const DOC_TYPES = [
    { value: "passport", label: i18n.docPassport },
    { value: "id_card", label: i18n.docIdCard },
    { value: "residence_card", label: i18n.docResidenceCard },
    { value: "nicop", label: i18n.docNicop },
    { value: "cnic", label: i18n.docCnic },
    { value: "other", label: i18n.docOther },
  ];
  const [form, setForm] = useState<SlotFormState>(doc ? docToForm(doc) : EMPTY_FORM);
  const [savePending, startSave] = useTransition();
  const [delPending, startDel] = useTransition();
  const [uploadPending, startUpload] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    // Reset local edit state when a fresh `doc` snapshot arrives from the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(doc ? docToForm(doc) : EMPTY_FORM);
  }, [doc]);

  function update(key: keyof SlotFormState, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const baseline = doc ? docToForm(doc) : EMPTY_FORM;
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  useUnsavedChanges(dirty);
  useEffect(() => {
    onDirtyChange?.(slot, dirty);
  }, [slot, dirty, onDirtyChange]);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nationalityCountry.trim()) return;
    setMsg(null);
    startSave(async () => {
      const res = await upsertNationality(slot, {
        nationalityCountry: form.nationalityCountry.trim(),
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim() || null,
        expiryDate: form.expiryDate || null,
      });
      if (res.ok) {
        onSaved(res.data.nationalityDocument);
        setMsg({ kind: "ok", text: i18n.saved });
      } else {
        setMsg({ kind: "err", text: res.message });
      }
    });
  }

  function onDelete() {
    setMsg(null);
    startDel(async () => {
      const res = await deleteNationality(slot);
      if (res.ok) {
        onDeleted(slot);
      } else {
        setMsg({ kind: "err", text: res.message });
      }
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!doc) {
      setMsg({ kind: "err", text: i18n.saveFirst });
      return;
    }
    setMsg(null);
    startUpload(async () => {
      const res = await uploadNationalityDocument(slot, file, side);
      if (res.ok) {
        setMsg({ kind: "ok", text: i18n.uploaded });
      } else {
        setMsg({ kind: "err", text: res.message });
      }
    });
  }

  const badge = doc ? BADGE[doc.verificationStatus] : null;

  return (
    <div className="gh-patient-form-card gh-card p-5">
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <h4 className="font-semibold text-[var(--portal-text)]">{i18n.slotTitle.replace("{n}", String(slot))}</h4>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {badge && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          )}
          {doc && (
            <button
              type="button"
              onClick={onDelete}
              disabled={delPending}
              className="inline-flex items-center gap-1 rounded border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50"
            >
              <Trash2 aria-hidden className="size-3.5" />
              {delPending ? i18n.removing : i18n.remove}
            </button>
          )}
        </div>
      </div>

      {doc?.adminNotes && (
        <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {doc.adminNotes}
        </p>
      )}

      <form onSubmit={onSave} method="post" className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="gh-field-label">{i18n.country}</span>
            <input
              type="text"
              value={form.nationalityCountry}
              onChange={(e) => update("nationalityCountry", e.target.value)}
              maxLength={100}
              required
              placeholder={i18n.countryPlaceholder}
              className="gh-input mt-1 min-w-0"
            />
          </label>
          <label className="block">
            <span className="gh-field-label">{i18n.documentType}</span>
            <select
              value={form.documentType}
              onChange={(e) => update("documentType", e.target.value)}
              className="gh-input mt-1"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="gh-field-label">{i18n.documentNumber}</span>
            <input
              type="text"
              value={form.documentNumber}
              onChange={(e) => update("documentNumber", e.target.value)}
              maxLength={64}
              placeholder={i18n.storedEncrypted}
              className="gh-input mt-1 min-w-0"
            />
          </label>
          <label className="block">
            <span className="gh-field-label">{i18n.expiryDate}</span>
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => update("expiryDate", e.target.value)}
              className="gh-input mt-1 min-w-0"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={savePending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
        >
          <Save aria-hidden className="size-4" />
          {savePending ? i18n.saving : i18n.saveSlot.replace("{n}", String(slot))}
        </button>
      </form>

      {doc && (
        <div className="mt-4 border-t border-[var(--portal-line)] pt-4">
          <p className="gh-field-label mb-2">{i18n.uploadPhotos}</p>
          <p className="mb-2 text-xs text-[var(--portal-muted)]">{i18n.uploadHint}</p>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--portal-line)] px-4 py-2 text-sm font-medium text-[var(--portal-text)] hover:bg-[var(--portal-well)]">
              <Upload aria-hidden className="size-4" />
              {uploadPending ? i18n.uploading : doc.frontFileKey ? i18n.replaceFront : i18n.uploadFront}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => onFileChange(e, "front")}
                disabled={uploadPending}
                className="sr-only"
              />
            </label>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--portal-line)] px-4 py-2 text-sm font-medium text-[var(--portal-text)] hover:bg-[var(--portal-well)]">
              <Upload aria-hidden className="size-4" />
              {uploadPending ? i18n.uploading : doc.backFileKey ? i18n.replaceBack : i18n.uploadBack}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => onFileChange(e, "back")}
                disabled={uploadPending}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      )}

      {msg ? (
        <p
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}

export function NationalityTab({
  i18n = DEFAULT_I18N,
  onDirtyChange,
}: {
  i18n?: NationalityI18n;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [docs, setDocs] = useState<NationalityDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [slotDirty, setSlotDirty] = useState<{ 1: boolean; 2: boolean }>({ 1: false, 2: false });

  function handleSlotDirty(slot: 1 | 2, dirty: boolean) {
    setSlotDirty((prev) => (prev[slot] === dirty ? prev : { ...prev, [slot]: dirty }));
  }

  useEffect(() => {
    onDirtyChange?.(slotDirty[1] || slotDirty[2]);
  }, [slotDirty, onDirtyChange]);

  useEffect(() => {
    void fetchNationality().then((res) => {
      if (res.ok) setDocs(res.data.nationalityDocuments);
      setLoaded(true);
    });
  }, []);

  const slot1 = docs.find((d) => d.slotNumber === 1);
  const slot2 = docs.find((d) => d.slotNumber === 2);

  function handleSaved(doc: NationalityDoc) {
    setDocs((prev) => {
      const without = prev.filter((d) => d.slotNumber !== doc.slotNumber);
      return [...without, doc].sort((a, b) => a.slotNumber - b.slotNumber);
    });
  }

  function handleDeleted(slot: 1 | 2) {
    setDocs((prev) => prev.filter((d) => d.slotNumber !== slot));
  }

  if (!loaded) {
    return (
      <div className="gh-card grid gap-4 p-6">
        <div className="h-5 w-44 animate-pulse rounded-full bg-[var(--portal-well)]" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-[14px] bg-[var(--portal-well)]" />
          <div className="h-28 animate-pulse rounded-[14px] bg-[var(--portal-well)]" />
        </div>
        <span className="sr-only">{i18n.loadingRecords}</span>
      </div>
    );
  }

  return (
    <section className="gh-patient-profile-tab space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="size-5 text-[var(--portal-primary)]" aria-hidden />
        <h3 className="text-lg font-semibold text-[var(--portal-text)]">{i18n.title}</h3>
      </div>
      <p className="text-sm text-[var(--portal-muted)]">
        {i18n.subtitle}
      </p>

      <SlotCard
        slot={1}
        doc={slot1}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        onDirtyChange={handleSlotDirty}
        i18n={i18n}
      />

      {slot1 ? (
        <SlotCard
          slot={2}
          doc={slot2}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onDirtyChange={handleSlotDirty}
          i18n={i18n}
        />
      ) : (
        <p className="text-xs text-[var(--portal-muted)]">
          {i18n.enableSecond}
        </p>
      )}

      {slot1 && slot2 && (
        <p className="text-xs text-[var(--portal-muted)]">
          {i18n.maxReached}
        </p>
      )}
    </section>
  );
}
