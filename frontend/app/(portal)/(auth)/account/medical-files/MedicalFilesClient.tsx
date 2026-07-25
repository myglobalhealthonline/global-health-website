"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { Download, FileText, FlaskConical, Stethoscope, Upload } from "lucide-react";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { DocumentRow } from "@/components/DocumentRow";
import { PortalTabs, PortalTabPanel, type PortalTabItem } from "@/components/PortalTabs";

type Tab = "uploaded" | "exam-prescriptions" | "certificates" | "doctor-documents";

export interface MedicalFilesLabels {
  tabMyUploads: string;
  tabExamPrescriptions: string;
  tabCertificates: string;
  tabDoctorDocuments: string;
  tabsAria: string;
  sumUploaded: string;
  sumUploadedHint: string;
  sumExamPrescriptions: string;
  sumExamPrescriptionsHint: string;
  sumCertificates: string;
  sumCertificatesHint: string;
  sumDoctorDocuments: string;
  sumDoctorDocumentsHint: string;
  download: string;
  downloading: string;
  emptyUploadedTitle: string;
  emptyUploadedBody: string;
  emptyExamTitle: string;
  emptyExamBody: string;
  emptyCertificatesTitle: string;
  emptyCertificatesBody: string;
  emptyDoctorDocsTitle: string;
  emptyDoctorDocsBody: string;
  examResultTag: string;
  uploadTitle: string;
  fieldTitle: string;
  fieldType: string;
  typeReport: string;
  typeOther: string;
  fieldDescription: string;
  fieldFile: string;
  fileHint: string;
  uploadSuccess: string;
  uploadFailed: string;
  upload: string;
  uploading: string;
}

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

function buildTabs(labels: MedicalFilesLabels): {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  categories: DocCategory[];
  emptyTitle: string;
  emptyDescription: string;
}[] {
  return [
    {
      id: "uploaded",
      label: labels.tabMyUploads,
      icon: <Upload className="size-4" aria-hidden />,
      categories: ["MY_UPLOAD"],
      emptyTitle: labels.emptyUploadedTitle,
      emptyDescription: labels.emptyUploadedBody,
    },
    {
      id: "exam-prescriptions",
      label: labels.tabExamPrescriptions,
      icon: <FlaskConical className="size-4" aria-hidden />,
      categories: ["EXAM_PRESCRIPTION", "EXAM_RESULT"],
      emptyTitle: labels.emptyExamTitle,
      emptyDescription: labels.emptyExamBody,
    },
    {
      id: "certificates",
      label: labels.tabCertificates,
      icon: <FileText className="size-4" aria-hidden />,
      categories: ["CERTIFICATE"],
      emptyTitle: labels.emptyCertificatesTitle,
      emptyDescription: labels.emptyCertificatesBody,
    },
    {
      id: "doctor-documents",
      label: labels.tabDoctorDocuments,
      icon: <Stethoscope className="size-4" aria-hidden />,
      categories: ["DOCTOR_DOCUMENT"],
      emptyTitle: labels.emptyDoctorDocsTitle,
      emptyDescription: labels.emptyDoctorDocsBody,
    },
  ];
}

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

function DocCard({ doc, labels }: { doc: MedicalDoc; labels: MedicalFilesLabels }) {
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
              <span>· {labels.examResultTag}</span>
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
            {downloading ? labels.downloading : labels.download}
          </button>
        }
      />
    </div>
  );
}

function UploadForm({
  onUploaded,
  labels,
}: {
  onUploaded: (doc: MedicalDoc) => void;
  labels: MedicalFilesLabels;
}) {
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
        setMsg({ kind: "ok", text: labels.uploadSuccess });
      } else {
        setMsg({ kind: "err", text: json.message ?? labels.uploadFailed });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} method="post" className="gh-patient-form-card gh-card space-y-3 p-5">
      <h2 className="font-semibold text-[var(--portal-text)]">{labels.uploadTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="gh-field-label">{labels.fieldTitle} <span aria-hidden>*</span></span>
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
          <span className="gh-field-label">{labels.fieldType}</span>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="gh-input mt-1"
          >
            <option value="REPORT">{labels.typeReport}</option>
            <option value="OTHER">{labels.typeOther}</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="gh-field-label">{labels.fieldDescription}</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="gh-input mt-1 min-w-0"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="gh-field-label">{labels.fieldFile} <span aria-hidden>*</span></span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="gh-input mt-1 min-w-0"
          />
          <p className="mt-1 text-xs text-[var(--portal-muted)]">{labels.fileHint}</p>
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
        {pending ? labels.uploading : labels.upload}
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
  labels: MedicalFilesLabels;
}

export function MedicalFilesClient({
  eyebrow,
  title,
  description,
  downloadAllLabel,
  downloadingAllLabel,
  labels,
}: MedicalFilesClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("uploaded");
  const [allDocs, setAllDocs] = useState<MedicalDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [downloadingAll, startDownloadAll] = useTransition();
  const TABS = buildTabs(labels);

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
          { label: labels.sumUploaded, value: String(countFor("uploaded")), hint: labels.sumUploadedHint, icon: <Upload aria-hidden /> },
          { label: labels.sumExamPrescriptions, value: String(countFor("exam-prescriptions")), hint: labels.sumExamPrescriptionsHint, icon: <FlaskConical aria-hidden /> },
          { label: labels.sumCertificates, value: String(countFor("certificates")), hint: labels.sumCertificatesHint, icon: <FileText aria-hidden /> },
          { label: labels.sumDoctorDocuments, value: String(countFor("doctor-documents")), hint: labels.sumDoctorDocumentsHint, icon: <Stethoscope aria-hidden /> },
        ]}
      />

      <PortalTabs
        className="gh-patient-tabs mb-6"
        ariaLabel={labels.tabsAria}
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
                <UploadForm onUploaded={onUploaded} labels={labels} />
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
                  <DocCard key={doc.id} doc={doc} labels={labels} />
                ))}
              </div>
            )}
          </PortalTabPanel>
        );
      })}
    </div>
  );
}
