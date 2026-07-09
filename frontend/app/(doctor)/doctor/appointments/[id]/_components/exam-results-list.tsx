"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardPlus, ExternalLink, FlaskConical, Trash2 } from "lucide-react";

type ExamItem = {
  id: string;
  testName: string;
  status: "REQUESTED" | "COMPLETED";
  performedAt: string | null;
  notes: string | null;
  externalUrl: string | null;
  createdAt: string;
};

export type ExamResultsListCopy = {
  title: string;
  description: string;
  testNameLabel: string;
  testNamePlaceholder: string;
  stateLabel: string;
  requestedOption: string;
  completedOption: string;
  performedOnLabel: string;
  externalLinkLabel: string;
  externalLinkPlaceholder: string;
  notesLabel: string;
  notesPlaceholderRequested: string;
  notesPlaceholderCompleted: string;
  testNameRequired: string;
  couldNotSave: string;
  couldNotUpdate: string;
  couldNotDelete: string;
  deleteConfirm: string;
  saving: string;
  requestExam: string;
  logResult: string;
  noExamsTitle: string;
  noExamsDescription: string;
  pendingBadge: string;
  completedBadge: string;
  noDate: string;
  loggedPrefix: string;
  markComplete: string;
  deleteAria: string;
  openLabReport: string;
};

export function ExamResultsList({
  appointmentId,
  initialItems,
  copy,
}: {
  appointmentId: string;
  initialItems: ExamItem[];
  copy: ExamResultsListCopy;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ExamItem[]>(initialItems);
  const [pending, startTransition] = useTransition();
  const [testName, setTestName] = useState("");
  const [createStatus, setCreateStatus] = useState<"REQUESTED" | "COMPLETED">(
    "COMPLETED",
  );
  const [performedAt, setPerformedAt] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (testName.trim() === "") {
      setError(copy.testNameRequired);
      return;
    }
    startTransition(async () => {
      const payload = {
        testName: testName.trim(),
        status: createStatus,
        performedAt: performedAt
          ? new Date(`${performedAt}T12:00:00Z`).toISOString()
          : null,
        notes: notes.trim() || null,
        externalUrl: externalUrl.trim() || null,
      };
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/exams`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { exam?: ExamItem };
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? copy.couldNotSave);
        return;
      }
      if (json.data?.exam) {
        setItems((prev) => [json.data!.exam!, ...prev]);
      }
      setTestName("");
      setPerformedAt("");
      setExternalUrl("");
      setNotes("");
      router.refresh();
    });
  }

  function markComplete(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/doctor/exams/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          performedAt: new Date().toISOString(),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { exam?: ExamItem };
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? copy.couldNotUpdate);
        return;
      }
      if (json.data?.exam) {
        setItems((prev) =>
          prev.map((r) => (r.id === id ? json.data!.exam! : r)),
        );
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm(copy.deleteConfirm)) return;
    startTransition(async () => {
      const res = await fetch(`/api/doctor/exams/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? copy.couldNotDelete);
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="mt-4 grid gap-4">
      <form onSubmit={add} className="grid gap-3 rounded-lg border border-[var(--portal-line)] bg-white/75 p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--portal-well)] text-[var(--portal-primary)]">
            <ClipboardPlus className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--portal-text)]">
              {copy.title}
            </p>
            <p className="mt-1 text-[12px] text-[var(--portal-muted)]">
              {copy.description}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{copy.testNameLabel}</span>
            <input
              className="gh-input"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              maxLength={200}
              placeholder={copy.testNamePlaceholder}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{copy.stateLabel}</span>
            <select
              className="gh-select"
              value={createStatus}
              onChange={(e) =>
                setCreateStatus(e.target.value as "REQUESTED" | "COMPLETED")
              }
            >
              <option value="REQUESTED">{copy.requestedOption}</option>
              <option value="COMPLETED">{copy.completedOption}</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{copy.performedOnLabel}</span>
            <input
              type="date"
              className="gh-input"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{copy.externalLinkLabel}</span>
            <input
              type="url"
              className="gh-input"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder={copy.externalLinkPlaceholder}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{copy.notesLabel}</span>
          <textarea
            className="gh-input min-h-[6rem] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={8000}
            placeholder={
              createStatus === "REQUESTED"
                ? copy.notesPlaceholderRequested
                : copy.notesPlaceholderCompleted
            }
          />
        </label>
        {error ? (
          <p className="gh-status-warning rounded-md border px-4 py-2 text-sm">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="gh-btn gh-btn-primary">
            {pending
              ? copy.saving
              : createStatus === "REQUESTED"
                ? copy.requestExam
                : copy.logResult}
          </button>
        </div>
      </form>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--portal-line)] bg-[var(--portal-well)] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--portal-text)]">
            <FlaskConical className="size-4 text-[var(--portal-primary)]" aria-hidden />
            {copy.noExamsTitle}
          </p>
          <p className="mt-1 text-[12px] text-[var(--portal-muted)]">
            {copy.noExamsDescription}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="gh-admin-card rounded-md border border-[var(--portal-line)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--portal-text)]">
                    {r.testName}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                        r.status === "REQUESTED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {r.status === "REQUESTED" ? copy.pendingBadge : copy.completedBadge}
                    </span>
                  </p>
                  <p className="text-[12px] text-[var(--portal-muted)]">
                    {r.performedAt
                      ? new Date(r.performedAt).toLocaleDateString()
                      : copy.noDate}{" "}
                    · {copy.loggedPrefix} {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2">
                  {r.status === "REQUESTED" ? (
                    <button
                      type="button"
                      onClick={() => markComplete(r.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2 py-1 text-[12px] font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
                    >
                      <Check className="size-3.5" /> {copy.markComplete}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-danger)]"
                    aria-label={copy.deleteAria}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {r.notes ? (
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--portal-text)]">
                  {r.notes}
                </p>
              ) : null}
              {r.externalUrl ? (
                <a
                  href={r.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--portal-primary)] hover:underline"
                >
                  {copy.openLabReport} <ExternalLink className="size-3" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
