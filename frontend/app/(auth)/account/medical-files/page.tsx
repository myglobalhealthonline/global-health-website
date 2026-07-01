"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { Download, FileText, FlaskConical, Stethoscope, Upload } from "lucide-react";

type Tab = "uploaded" | "results" | "exam-requests" | "prescriptions" | "consult-summaries";

type MedicalDoc = {
  id: string;
  documentType: string;
  title: string;
  description: string | null;
  fileName: string;
  mimetype: string;
  byteSize: number;
  uploadedByRole: string;
  visibleToPatient: boolean;
  relatedAppointmentId: string | null;
  relatedConsultationId: string | null;
  createdAt: string;
};

const TABS: { id: Tab; label: string; icon: React.ReactNode; docTypes: string[] }[] = [
  {
    id: "uploaded",
    label: "My Reports",
    icon: <Upload className="size-4" aria-hidden />,
    docTypes: ["REPORT", "OTHER"],
  },
  {
    id: "results",
    label: "Doctor Results",
    icon: <Stethoscope className="size-4" aria-hidden />,
    docTypes: ["EXAM_RESULT"],
  },
  {
    id: "exam-requests",
    label: "Exam Requests",
    icon: <FlaskConical className="size-4" aria-hidden />,
    docTypes: ["EXAM_REQUEST"],
  },
  {
    id: "prescriptions",
    label: "Prescriptions",
    icon: <FileText className="size-4" aria-hidden />,
    docTypes: ["PRESCRIPTION"],
  },
  {
    id: "consult-summaries",
    label: "Consult Summaries",
    icon: <FileText className="size-4" aria-hidden />,
    docTypes: ["CONSULT_SUMMARY"],
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocCard({ doc }: { doc: MedicalDoc }) {
  const [downloading, startDownload] = useTransition();

  function onDownload() {
    startDownload(async () => {
      const res = await fetch(`/api/account/medical-documents/${doc.id}/download`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="gh-patient-doc-card gh-card flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[var(--color-text-primary)]">{doc.title}</p>
        {doc.description && (
          <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">
            {doc.description}
          </p>
        )}
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {doc.fileName} · {formatBytes(doc.byteSize)} ·{" "}
          {new Date(doc.createdAt).toLocaleDateString()}
          {doc.uploadedByRole !== "PATIENT" && (
            <span className="ml-1 capitalize">· from {doc.uploadedByRole.toLowerCase()}</span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)] disabled:opacity-60"
      >
        <Download aria-hidden className="size-4" />
        {downloading ? "Downloading…" : "Download"}
      </button>
    </div>
  );
}

function UploadForm({ onUploaded }: { onUploaded: (doc: MedicalDoc) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("REPORT");
  const [pending, startUpload] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setMsg(null);
    startUpload(async () => {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim());
      if (description.trim()) form.append("description", description.trim());
      form.append("documentType", documentType);

      const res = await fetch("/api/account/medical-documents", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: { document?: MedicalDoc };
        message?: string;
      };
      if (json.ok && json.data?.document) {
        onUploaded(json.data.document);
        setFile(null);
        setTitle("");
        setDescription("");
        setMsg({ kind: "ok", text: "Document uploaded successfully" });
      } else {
        setMsg({ kind: "err", text: json.message ?? "Upload failed" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="gh-patient-form-card gh-card space-y-3 p-5">
      <h4 className="font-semibold text-[var(--color-text-primary)]">Upload a report</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="gh-field-label">Title <span aria-hidden>*</span></span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="gh-input mt-1 min-w-0"
          />
        </label>
        <label className="block">
          <span className="gh-field-label">Type</span>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="gh-input mt-1"
          >
            <option value="REPORT">Report</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="gh-field-label">Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="gh-input mt-1 min-w-0"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="gh-field-label">File <span aria-hidden>*</span></span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="gh-input mt-1 min-w-0"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">PDF, JPG, PNG, WebP — max 10 MB</p>
        </label>
      </div>
      {msg && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !file || !title.trim()}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
      >
        <Upload aria-hidden className="size-4" />
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}

export default function MedicalFilesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("uploaded");
  const [allDocs, setAllDocs] = useState<MedicalDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetch("/api/account/medical-documents", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { documents?: MedicalDoc[] } }) => {
        if (json.ok && json.data?.documents) {
          setAllDocs(json.data.documents);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const currentTabConfig = TABS.find((t) => t.id === activeTab);
  const filteredDocs = allDocs.filter((d) =>
    currentTabConfig?.docTypes.includes(d.documentType),
  );

  function onUploaded(doc: MedicalDoc) {
    setAllDocs((prev) => [doc, ...prev]);
  }

  return (
    <div className="gh-patient-page gh-patient-medical-files-page">
      <header className="gh-patient-page-header mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Patient portal
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <FileText className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          Medical files
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Your uploaded reports and documents from doctors.
        </p>
      </header>

      <nav
        className="gh-patient-tabs mb-6 flex gap-1 overflow-x-auto rounded-lg bg-[var(--color-background-soft)] p-1"
        aria-label="Medical file categories"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex min-w-max items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "uploaded" && (
        <div className="mb-6">
          <UploadForm onUploaded={onUploaded} />
        </div>
      )}

      {!loaded ? (
        <div className="gh-patient-empty-state gh-card p-6 text-sm text-[var(--color-text-muted)]">Loading…</div>
      ) : filteredDocs.length === 0 ? (
        <div className="gh-patient-empty-state gh-patient-medical-empty gh-card p-6">
          <Image
            src="/images/portal/generated/patient-record-empty-state.png"
            alt=""
            aria-hidden
            width={224}
            height={224}
            className="gh-patient-medical-empty__image"
          />
          <div className="min-w-0">
            <p className="font-semibold text-[var(--color-text-primary)]">
              No {currentTabConfig?.label.toLowerCase() ?? "documents"} yet
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Uploaded reports, prescriptions, requests, and summaries will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="gh-patient-doc-list space-y-3">
          {filteredDocs.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
