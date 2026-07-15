"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { Download, FileText, FlaskConical, Stethoscope, Upload } from "lucide-react";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { DocumentRow } from "@/components/DocumentRow";
import { PortalTabs, PortalTabPanel, type PortalTabItem } from "@/components/PortalTabs";

type Tab = "uploaded" | "exam-prescriptions" | "certificates" | "doctor-documents";

type DocCategory =
  | "MY_UPLOAD"
  | "EXAM_PRESCRIPTION"
  | "EXAM_RESULT"
  | "CERTIFICATE"
  | "DOCTOR_DOCUMENT";

type DocSource = "MEDICAL_DOC" | "GENERATED" | "APPOINTMENT";

type MedicalDoc = {
  id: string;
  source: DocSource;
  category: DocCategory;
  title: string;
  description: string | null;
  fileName: string;
  mimetype: string;
  byteSize: number;
  createdAt: string;
  sourceGeneratedDocumentId: string | null;
  prescriptionNumber: number | null;
};

const TABS: {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  categories: DocCategory[];
  emptyTitle: string;
  emptyDescription: string;
}[] = [
  {
    id: "uploaded",
    label: "My Uploads",
    icon: <Upload className="size-4" aria-hidden />,
    categories: ["MY_UPLOAD"],
    emptyTitle: "No documents uploaded yet",
    emptyDescription: "Documents you upload for your doctor to review will appear here and sync to your doctor's portal.",
  },
  {
    id: "exam-prescriptions",
    label: "Exam Prescriptions",
    icon: <FlaskConical className="size-4" aria-hidden />,
    categories: ["EXAM_PRESCRIPTION", "EXAM_RESULT"],
    emptyTitle: "No exam prescriptions yet",
    emptyDescription: "Exam prescriptions your doctor issues — and the results you upload against them — appear here.",
  },
  {
    id: "certificates",
    label: "Certificates",
    icon: <FileText className="size-4" aria-hidden />,
    categories: ["CERTIFICATE"],
    emptyTitle: "No certificates yet",
    emptyDescription: "Absence and custom certificates your doctor issues will appear here once sent.",
  },
  {
    id: "doctor-documents",
    label: "Doctor Documents",
    icon: <Stethoscope className="size-4" aria-hidden />,
    categories: ["DOCTOR_DOCUMENT"],
    emptyTitle: "No doctor documents yet",
    emptyDescription: "Files and results your doctor shares with you will appear here.",
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadDoc(doc: MedicalDoc) {
  const res = await fetch(
    `/api/account/medical-documents/${doc.id}/download?source=${doc.source}`,
    { credentials: "include" },
  );
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function DocCard({ doc }: { doc: MedicalDoc }) {
  const [downloading, startDownload] = useTransition();

  function onDownload() {
    startDownload(async () => {
      await downloadDoc(doc);
    });
  }

  return (
    <div className="gh-patient-doc-card gh-card px-4 sm:px-5">
      <DocumentRow
        density="consumer"
        icon={<FileText className="size-4" aria-hidden />}
        title={
          <>
            {doc.title}
            {doc.category === "EXAM_PRESCRIPTION" && doc.prescriptionNumber != null
              ? ` #${doc.prescriptionNumber}`
              : ""}
            {doc.description ? (
              <span className="block truncate text-portal-meta font-normal text-[var(--portal-muted)]" title={doc.description}>
                {doc.description}
              </span>
            ) : null}
          </>
        }
        meta={
          <>
            {doc.fileName}
            {doc.byteSize > 0 ? ` · ${formatBytes(doc.byteSize)}` : ""} ·{" "}
            {new Date(doc.createdAt).toLocaleDateString()}
            {doc.category === "EXAM_RESULT" && (
              <span>· exam result</span>
            )}
          </>
        }
        actions={
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-[var(--portal-line)] px-3 py-1.5 text-sm font-medium text-[var(--portal-text)] hover:bg-[var(--portal-well)] disabled:opacity-60"
          >
            <Download aria-hidden className="size-4" />
            {downloading ? "Downloading…" : "Download"}
          </button>
        }
      />
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
        data?: {
          document?: {
            id: string;
            title: string;
            description: string | null;
            fileName: string;
            mimetype: string;
            byteSize: number;
            createdAt: string;
          };
        };
        message?: string;
      };
      if (json.ok && json.data?.document) {
        const d = json.data.document;
        // Normalize the create response (legacy MedicalDocument shape) into
        // the unified row shape the list renders.
        onUploaded({
          id: d.id,
          source: "MEDICAL_DOC",
          category: "MY_UPLOAD",
          title: d.title,
          description: d.description ?? null,
          fileName: d.fileName,
          mimetype: d.mimetype,
          byteSize: d.byteSize,
          createdAt: d.createdAt,
          sourceGeneratedDocumentId: null,
          prescriptionNumber: null,
        });
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
    <form onSubmit={onSubmit} method="post" className="gh-patient-form-card gh-card space-y-3 p-5">
      <h2 className="font-semibold text-[var(--portal-text)]">Upload a report</h2>
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
          <p className="mt-1 text-xs text-[var(--portal-muted)]">PDF, JPG, PNG, WebP — max 10 MB</p>
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
      <div className="flex justify-end">
      <button
        type="submit"
        disabled={pending || !file || !title.trim()}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
      >
        <Upload aria-hidden className="size-4" />
        {pending ? "Uploading…" : "Upload"}
      </button>
      </div>
    </form>
  );
}

interface MedicalFilesClientProps {
  eyebrow: string;
  title: string;
  description: string;
  downloadAllLabel: string;
  downloadingAllLabel: string;
}

export function MedicalFilesClient({
  eyebrow,
  title,
  description,
  downloadAllLabel,
  downloadingAllLabel,
}: MedicalFilesClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("uploaded");
  const [allDocs, setAllDocs] = useState<MedicalDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [downloadingAll, startDownloadAll] = useTransition();

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
    currentTabConfig?.categories.includes(d.category),
  );
  const countFor = (tab: Tab) => {
    const config = TABS.find((item) => item.id === tab);
    return allDocs.filter((doc) => config?.categories.includes(doc.category)).length;
  };

  function onUploaded(doc: MedicalDoc) {
    setAllDocs((prev) => [doc, ...prev]);
  }

  // ponytail: no zip lib in backend/package.json and this is a low-priority
  // bulk-export feature — sequential client-side downloads reuse the existing
  // single-file auth/ownership-checked route instead of adding archiver +
  // a new streaming endpoint. Small delay between clicks so browsers don't
  // block the burst of downloads as a popup flood.
  function onDownloadAll() {
    startDownloadAll(async () => {
      for (const doc of filteredDocs) {
        await downloadDoc(doc);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    });
  }

  const tabItems: PortalTabItem[] = TABS.map((tab) => ({
    value: tab.id,
    label: (
      <span className="inline-flex items-center gap-1.5">
        {tab.icon}
        {tab.label}
      </span>
    ),
  }));

  return (
    <div className="gh-patient-page gh-patient-medical-files-page">
      <PageHeader
        eyebrow={eyebrow}
        title={
          <span className="inline-flex items-center gap-2">
            <FileText className="size-6 text-[var(--portal-primary)]" aria-hidden />
            {title}
          </span>
        }
        description={description}
      />

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: "Uploaded", value: String(countFor("uploaded")), hint: "Documents you added", icon: <Upload aria-hidden /> },
          { label: "Exam Prescriptions", value: String(countFor("exam-prescriptions")), hint: "Prescriptions & results", icon: <FlaskConical aria-hidden /> },
          { label: "Certificates", value: String(countFor("certificates")), hint: "Absence & custom certificates", icon: <FileText aria-hidden /> },
          { label: "Doctor Documents", value: String(countFor("doctor-documents")), hint: "Shared by your doctor", icon: <Stethoscope aria-hidden /> },
        ]}
      />

      <PortalTabs
        className="gh-patient-tabs mb-6"
        ariaLabel="Medical file categories"
        items={tabItems}
        value={activeTab}
        onChange={(value) => setActiveTab(value as Tab)}
      />

      {/* Every tab gets a real, always-mounted PortalTabPanel (kept-mounted
          pattern, mirrors profile-client.tsx) so aria-controls always
          resolves to an existing tabpanel — not just the active one. */}
      {TABS.map((tab) => {
        const docsForTab = allDocs.filter((d) => tab.categories.includes(d.category));
        return (
          <PortalTabPanel key={tab.id} value={tab.id} activeValue={activeTab}>
            {tab.id === "uploaded" && (
              <div className="mb-6">
                <UploadForm onUploaded={onUploaded} />
              </div>
            )}

            {!loaded ? (
              <div className="gh-patient-empty-state gh-card p-6">
                <div className="h-4 w-36 rounded bg-[var(--portal-well)]" />
                <div className="mt-4 grid gap-3">
                  <div className="h-20 rounded-lg bg-[var(--portal-well)]" />
                  <div className="h-20 rounded-lg bg-[var(--portal-well)]" />
                </div>
              </div>
            ) : docsForTab.length === 0 ? (
              <div className="gh-patient-empty-state gh-patient-medical-empty gh-card p-6">
                <Image
                  src="/images/portal/obsidian/empty-records.svg"
                  alt=""
                  aria-hidden
                  width={224}
                  height={224}
                  className="gh-patient-medical-empty__image"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--portal-text)]">
                    {tab.emptyTitle}
                  </p>
                  <p className="mt-1 text-sm text-[var(--portal-muted)]">
                    {tab.emptyDescription}
                  </p>
                </div>
              </div>
            ) : (
              <div className="gh-patient-doc-list space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onDownloadAll}
                    disabled={downloadingAll}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-[var(--portal-line)] px-3 py-1.5 text-sm font-medium text-[var(--portal-text)] hover:bg-[var(--portal-well)] disabled:opacity-60"
                  >
                    <Download aria-hidden className="size-4" />
                    {downloadingAll ? downloadingAllLabel : downloadAllLabel}
                  </button>
                </div>
                {docsForTab.map((doc) => (
                  <DocCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </PortalTabPanel>
        );
      })}
    </div>
  );
}
