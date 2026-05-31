"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  Pencil,
  Pill,
  Send,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import {
  DocumentContextBanner,
  type DocumentContext,
} from "./document-context-banner";

type GeneratedDoc = {
  id: string;
  documentType: string;
  fileName: string;
  sentToPatient: boolean;
  createdAt: string;
  metadata?: Record<string, string> | null;
};

export type ConsultationDocTabId =
  | "overview"
  | "medical-notes"
  | "exams"
  | "medicine"
  | "absence"
  | "review";

const TABS: { id: ConsultationDocTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "medical-notes", label: "Medical notes" },
  { id: "exams", label: "Exams" },
  { id: "medicine", label: "Prescription" },
  { id: "absence", label: "Absence" },
  { id: "review", label: "Review & send" },
];

export function ConsultationDocumentsModal({
  appointmentId,
  open,
  onClose,
  initialTab,
}: {
  appointmentId: string;
  open: boolean;
  onClose: () => void;
  initialTab?: ConsultationDocTabId;
}) {
  const [tab, setTab] = useState<ConsultationDocTabId>(initialTab ?? "overview");
  const [context, setContext] = useState<DocumentContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [queue, setQueue] = useState<GeneratedDoc[]>([]);
  const [history, setHistory] = useState<GeneratedDoc[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [exams, setExams] = useState("");
  const [examsNotes, setExamsNotes] = useState("");
  const [meds, setMeds] = useState<string[]>([""]);
  const [pharmacy, setPharmacy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");

  const loadContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents/context`,
      );
      const json = (await res.json()) as { ok?: boolean; data?: DocumentContext };
      if (json.ok && json.data) {
        setContext(json.data);
        setPharmacy((prev) => prev || json.data!.patient.pharmacy || "");
      }
    } finally {
      setContextLoading(false);
    }
  }, [appointmentId]);

  const loadDocs = useCallback(async () => {
    const res = await fetch(
      `/api/doctor/appointments/${appointmentId}/documents/generated`,
    );
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { queue?: GeneratedDoc[]; history?: GeneratedDoc[] };
    };
    if (json.ok && json.data) {
      setQueue(json.data.queue ?? []);
      setHistory(json.data.history ?? []);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (open) {
      void loadDocs();
      void loadContext();
      if (initialTab) setTab(initialTab);
    }
  }, [open, loadDocs, loadContext, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const visibleTabs = TABS.filter((t) => t.id !== "review" || queue.length > 0);

  function buildFields(
    type: string,
    fields: Record<string, string>,
  ): { type: string; fields: Record<string, string>; editDocumentId?: string } {
    const payload: {
      type: string;
      fields: Record<string, string>;
      editDocumentId?: string;
    } = { type, fields };
    if (editingDocId) payload.editDocumentId = editingDocId;
    return payload;
  }

  async function saveNote() {
    setError(null);
    setSuccess(null);
    if (!noteText.trim()) {
      setError("Enter a medical note.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/medical-notes`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note: noteText.trim() }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Could not save note");
        return;
      }
      setNoteText("");
      setSuccess("Medical note saved.");
    });
  }

  async function generate(type: string, fields: Record<string, string>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents/generate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildFields(type, fields)),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: {
          pdfUrl?: string;
          healthPortalUrl?: string | null;
          healthPortalLabel?: string | null;
        };
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Generate failed");
        return;
      }
      setEditingDocId(null);
      await loadDocs();
      if (type === "PRESCRIPTION" && json.data?.pdfUrl) {
        window.open(json.data.pdfUrl, "_blank", "noopener,noreferrer");
        if (json.data.healthPortalUrl) {
          setSuccess(
            `PDF opened. Submit via ${json.data.healthPortalLabel ?? "national portal"}.`,
          );
        } else {
          setSuccess("PDF generated and opened.");
        }
      } else if (type === "EXAMS_PRESCRIPTION" || type === "ABSENCE_CERTIFICATE") {
        setTab("review");
        setSuccess("Document generated — review and send when ready.");
      } else {
        setSuccess("Document generated.");
      }
    });
  }

  function generateExams() {
    if (!exams.trim()) {
      setError("Enter at least one examination.");
      return;
    }
    void generate("EXAMS_PRESCRIPTION", {
      exams: exams.trim(),
      ...(examsNotes.trim() ? { notes: examsNotes.trim() } : {}),
    });
  }

  function generateMedicine() {
    const fields: Record<string, string> = {};
    meds.forEach((m, i) => {
      const v = m.trim();
      if (v) fields[`medication${i + 1}`] = v;
    });
    if (!fields.medication1) {
      setError("Enter at least one medication.");
      return;
    }
    if (pharmacy.trim()) fields.pharmacy = pharmacy.trim();
    void generate("PRESCRIPTION", fields);
  }

  function generateAbsence() {
    if (!endDate.trim()) {
      setError("End date is required.");
      return;
    }
    void generate("ABSENCE_CERTIFICATE", {
      ...(startDate.trim() ? { startDate: startDate.trim() } : {}),
      endDate: endDate.trim(),
      ...(absenceReason.trim() ? { reason: absenceReason.trim() } : {}),
    });
  }

  function sendSelected() {
    const ids = [...selected].filter((id) => queue.some((q) => q.id === id));
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents/send`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ documentIds: ids }),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { sentCount?: number };
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Send failed");
        return;
      }
      setSelected(new Set());
      setSuccess(`Sent ${json.data?.sentCount ?? 0} document(s) to patient.`);
      await loadDocs();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch(`/api/doctor/documents/generated/${id}`, { method: "DELETE" });
      await loadDocs();
    });
  }

  function applyMetadata(meta: Record<string, string> | null | undefined, docType: string) {
    if (!meta) return;
    if (docType === "EXAMS_PRESCRIPTION") {
      setExams(meta.exams ?? "");
      setExamsNotes(meta.notes ?? "");
    } else if (docType === "PRESCRIPTION") {
      const next: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const v = meta[`medication${i}`]?.trim();
        if (v) next.push(v);
      }
      setMeds(next.length > 0 ? next : [""]);
      setPharmacy(meta.pharmacy ?? context?.patient.pharmacy ?? "");
    } else if (docType === "ABSENCE_CERTIFICATE") {
      setStartDate(meta.startDate ?? "");
      setEndDate(meta.endDate ?? "");
      setAbsenceReason(meta.reason ?? "");
    }
  }

  function startEdit(row: GeneratedDoc) {
    setEditingDocId(row.id);
    applyMetadata(row.metadata, row.documentType);
    if (row.documentType === "EXAMS_PRESCRIPTION") setTab("exams");
    else if (row.documentType === "ABSENCE_CERTIFICATE") setTab("absence");
    else if (row.documentType === "PRESCRIPTION") setTab("medicine");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consultation-docs-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <h2
              id="consultation-docs-title"
              className="text-lg font-bold text-[var(--color-text-primary)]"
            >
              Consultation documents
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Patient &amp; prescriber details are filled from records — enter clinical
              content only.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-background-soft)]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] px-3 py-2">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === t.id
                  ? "bg-[var(--color-brand-primary)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-background-soft)]"
              }`}
            >
              {t.label}
              {t.id === "review" && queue.length > 0 ? ` (${queue.length})` : ""}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mb-3 text-sm text-emerald-700">{success}</p> : null}
          {editingDocId ? (
            <p className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Editing a draft — generate again to replace the PDF.
            </p>
          ) : null}

          {contextLoading ? (
            <p className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading patient &amp; profile…
            </p>
          ) : context ? (
            <div className="mb-4">
              <DocumentContextBanner context={context} />
            </div>
          ) : null}

          {tab === "overview" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                Choose a document type. Only the fields below need your input; name,
                address, dates, and registration are applied automatically.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <OverviewCard
                  icon={ClipboardList}
                  title="Exams prescription"
                  description="List tests or imaging — email to patient after review."
                  onClick={() => setTab("exams")}
                />
                <OverviewCard
                  icon={Pill}
                  title="Medicine prescription"
                  description="Up to 7 lines — opens PDF for national portal."
                  onClick={() => setTab("medicine")}
                />
                <OverviewCard
                  icon={Stethoscope}
                  title="Absence certificate"
                  description="Unfit for work dates — email to patient after review."
                  onClick={() => setTab("absence")}
                />
                <OverviewCard
                  icon={FileText}
                  title="Medical notes"
                  description="Internal note only — not sent as PDF."
                  onClick={() => setTab("medical-notes")}
                />
              </div>
              {queue.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setTab("review")}
                  className="text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
                >
                  {queue.length} document(s) waiting to send → Review &amp; send
                </button>
              ) : null}
            </div>
          ) : null}

          {tab === "medical-notes" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                Free-text note — saved immediately, not emailed.
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={6}
                className="gh-input w-full"
                placeholder="Clinical notes for this session…"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => void saveNote()}
                className="gh-btn gh-btn-primary text-sm"
              >
                Save note
              </button>
            </div>
          ) : null}

          {tab === "exams" ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold">
                Examinations requested <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-[var(--color-text-muted)]">One test per line</p>
              <textarea
                value={exams}
                onChange={(e) => setExams(e.target.value)}
                rows={5}
                className="gh-input w-full"
                placeholder={"Full blood count\nChest X-Ray"}
              />
              <label className="block text-sm font-semibold">Additional notes (optional)</label>
              <textarea
                value={examsNotes}
                onChange={(e) => setExamsNotes(e.target.value)}
                rows={2}
                className="gh-input w-full"
                placeholder="e.g. Fasting from midnight"
              />
              <button
                type="button"
                disabled={pending}
                onClick={generateExams}
                className="gh-btn gh-btn-primary text-sm"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <FileText className="size-3.5" aria-hidden />
                )}
                Generate PDF
              </button>
            </div>
          ) : null}

          {tab === "medicine" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                PDF for reference — submit via your national health portal (not emailed to
                patient).
              </p>
              {meds.map((m, i) => (
                <input
                  key={i}
                  type="text"
                  value={m}
                  onChange={(e) => {
                    const next = [...meds];
                    next[i] = e.target.value;
                    setMeds(next);
                  }}
                  placeholder={i === 0 ? "Medication 1 (required)" : `Medication ${i + 1}`}
                  className="gh-input w-full"
                />
              ))}
              {meds.length < 7 ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--color-brand-primary)]"
                  onClick={() => setMeds([...meds, ""])}
                >
                  + Add medication
                </button>
              ) : null}
              <label className="block text-sm font-semibold">Pharmacy (optional)</label>
              <input
                type="text"
                value={pharmacy}
                onChange={(e) => setPharmacy(e.target.value)}
                placeholder={
                  context?.patient.pharmacy
                    ? `From booking: ${context.patient.pharmacy}`
                    : "Pharmacy name and location"
                }
                className="gh-input w-full"
              />
              <button
                type="button"
                disabled={pending}
                onClick={generateMedicine}
                className="gh-btn gh-btn-primary text-sm"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <FileText className="size-3.5" aria-hidden />
                )}
                Generate &amp; open PDF
              </button>
            </div>
          ) : null}

          {tab === "absence" ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="gh-input mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">
                    End date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="gh-input mt-1 w-full"
                    required
                  />
                </div>
              </div>
              <label className="block text-sm font-semibold">Reason (optional)</label>
              <input
                type="text"
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="Defaults to medical confidentiality if blank"
                className="gh-input w-full"
              />
              <button
                type="button"
                disabled={pending}
                onClick={generateAbsence}
                className="gh-btn gh-btn-primary text-sm"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <FileText className="size-3.5" aria-hidden />
                )}
                Generate PDF
              </button>
            </div>
          ) : null}

          {tab === "review" ? (
            <div className="space-y-3">
              {queue.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Nothing pending.</p>
              ) : (
                <>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Preview each PDF, then send selected documents to the patient by email.
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={pending || selected.size === 0}
                      onClick={sendSelected}
                      className="gh-btn gh-btn-primary text-xs"
                    >
                      <Send className="size-3" aria-hidden /> Send selected
                    </button>
                  </div>
                  <ul className="divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
                    {queue.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <label className="flex flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(row.id);
                              else next.delete(row.id);
                              setSelected(next);
                            }}
                          />
                          <span>
                            {formatDocType(row.documentType)} · {row.fileName}
                          </span>
                        </label>
                        <div className="flex items-center gap-1">
                          <a
                            href={`/api/doctor/documents/generated/${row.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gh-btn gh-btn-soft px-2 py-1 text-[11px]"
                          >
                            Preview
                          </a>
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="gh-btn gh-btn-soft px-2 py-1 text-[11px]"
                          >
                            <Pencil className="size-3" aria-hidden /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(row.id)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-red-700"
                            aria-label="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {history.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-sm font-bold">Sent on this appointment</h4>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
                    {history.map((row) => (
                      <li key={row.id}>
                        <a
                          href={`/api/doctor/documents/generated/${row.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[var(--color-brand-primary)] hover:underline"
                        >
                          {row.fileName}
                        </a>
                        {row.sentToPatient ? " · sent" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start justify-between gap-2 rounded-lg border border-[var(--color-border)] p-3 text-left hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-background-soft)]"
    >
      <div>
        <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-primary)]">
          <Icon className="size-4 text-[var(--color-brand-primary)]" aria-hidden />
          {title}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
      </div>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
    </button>
  );
}

function formatDocType(type: string): string {
  return type.replace(/_/g, " ").toLowerCase();
}
