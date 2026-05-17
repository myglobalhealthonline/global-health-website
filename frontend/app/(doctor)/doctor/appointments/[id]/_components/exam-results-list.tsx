"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Trash2 } from "lucide-react";

type ExamItem = {
  id: string;
  testName: string;
  status: "REQUESTED" | "COMPLETED";
  performedAt: string | null;
  notes: string | null;
  externalUrl: string | null;
  createdAt: string;
};

export function ExamResultsList({
  appointmentId,
  initialItems,
}: {
  appointmentId: string;
  initialItems: ExamItem[];
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
      setError("Test name is required.");
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
        setError(json.message ?? "Could not save result.");
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
        setError(json.message ?? "Could not update.");
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
    if (!confirm("Delete this exam entry?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/doctor/exams/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Could not delete.");
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="mt-4 grid gap-4">
      <form onSubmit={add} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Test name</span>
            <input
              className="gh-input"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              maxLength={200}
              placeholder="CBC, MRI shoulder, etc."
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">State</span>
            <select
              className="gh-select"
              value={createStatus}
              onChange={(e) =>
                setCreateStatus(e.target.value as "REQUESTED" | "COMPLETED")
              }
            >
              <option value="REQUESTED">Requested — result not in</option>
              <option value="COMPLETED">Completed — logging result</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Performed on</span>
            <input
              type="date"
              className="gh-input"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">External link (lab portal)</span>
            <input
              type="url"
              className="gh-input"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://lab.example.com/report/123"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Interpretation / notes</span>
          <textarea
            className="gh-input min-h-[6rem] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={8000}
            placeholder={
              createStatus === "REQUESTED"
                ? "Instructions for the lab / patient, if any."
                : "Findings, interpretation, follow-up needed."
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
              ? "Saving…"
              : createStatus === "REQUESTED"
                ? "Request exam"
                : "Log result"}
          </button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          No exams logged yet.
        </p>
      ) : (
        <ul className="grid gap-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-md border border-[var(--color-border)] bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {r.testName}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                        r.status === "REQUESTED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {r.status === "REQUESTED" ? "Pending" : "Completed"}
                    </span>
                  </p>
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    {r.performedAt
                      ? new Date(r.performedAt).toLocaleDateString()
                      : "No date"}{" "}
                    · logged {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2">
                  {r.status === "REQUESTED" ? (
                    <button
                      type="button"
                      onClick={() => markComplete(r.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                    >
                      <Check className="size-3.5" /> Mark complete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-status-error)]"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {r.notes ? (
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--color-text-primary)]">
                  {r.notes}
                </p>
              ) : null}
              {r.externalUrl ? (
                <a
                  href={r.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                >
                  Open lab report <ExternalLink className="size-3" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
