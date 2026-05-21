"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FileText, Send, Trash2 } from "lucide-react";

type GeneratedDoc = {
  id: string;
  documentType: string;
  fileName: string;
  sentToPatient: boolean;
  createdAt: string;
};

const DOC_TYPES = [
  { value: "ABSENCE_CERTIFICATE", label: "Absence certificate" },
  { value: "EXAMS_PRESCRIPTION", label: "Examinations prescription" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "OTHER", label: "Other (custom)" },
] as const;

export function GeneratedDocumentsPanel({ appointmentId }: { appointmentId: string }) {
  const [items, setItems] = useState<GeneratedDoc[]>([]);
  const [docType, setDocType] = useState<string>("ABSENCE_CERTIFICATE");
  const [body, setBody] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/doctor/appointments/${appointmentId}/documents/generated`,
    );
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { items?: GeneratedDoc[] };
    };
    if (json.ok && json.data?.items) setItems(json.data.items);
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  function generate() {
    setError(null);
    if (docType === "OTHER" && !customLabel.trim()) {
      setError("Enter a label for the document.");
      return;
    }
    const fields: Record<string, string> = {};
    if (body.trim()) fields.body = body.trim();
    if (docType === "OTHER" && customLabel.trim()) {
      fields.customLabel = customLabel.trim();
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents/generate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: docType,
            fields: Object.keys(fields).length > 0 ? fields : undefined,
          }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Generate failed");
        return;
      }
      setBody("");
      setCustomLabel("");
      await load();
    });
  }

  function sendSelected() {
    const ids = [...selected].filter((id) => {
      const row = items.find((i) => i.id === id);
      return row && !row.sentToPatient;
    });
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
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Send failed");
        return;
      }
      setSelected(new Set());
      await load();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch(`/api/doctor/documents/generated/${id}`, { method: "DELETE" });
      await load();
    });
  }

  const queue = items.filter((i) => !i.sentToPatient);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="gh-select"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={generate}
          className="gh-btn gh-btn-soft text-sm"
        >
          <FileText className="size-3.5" aria-hidden /> Generate PDF
        </button>
      </div>
      {docType === "OTHER" ? (
        <input
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Custom title (e.g. Lab requisition)"
          maxLength={80}
          className="gh-input w-full"
        />
      ) : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Optional certificate text…"
        rows={3}
        className="gh-input w-full"
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
            Review &amp; send queue
          </h4>
          {queue.length > 0 ? (
            <button
              type="button"
              disabled={pending || selected.size === 0}
              onClick={sendSelected}
              className="gh-btn gh-btn-primary text-xs"
            >
              <Send className="size-3" aria-hidden /> Send selected
            </button>
          ) : null}
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No generated documents yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
            {items.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <label className="flex flex-1 items-center gap-2">
                  {!row.sentToPatient ? (
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
                  ) : null}
                  <span>
                    {row.documentType.replace(/_/g, " ").toLowerCase()} · {row.fileName}
                    {row.sentToPatient ? (
                      <span className="ml-2 text-xs text-emerald-700">sent</span>
                    ) : null}
                  </span>
                </label>
                {!row.sentToPatient ? (
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    className="text-[var(--color-text-muted)] hover:text-red-700"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
