"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";

/**
 * Admin list of doctor-uploaded payout invoices. Read-only — the doctor owns
 * the upload; admin downloads it and processes the payment off-platform.
 */

type Item = {
  key: string;
  doctorId: string;
  doctorName: string;
  period: string;
  filename: string;
  size: number;
  uploadedAt: string | null;
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const uploadedInvoiceFields: ColumnPriorityField<Item>[] = [
  { key: "doctorName", label: "Doctor", priority: 1, render: (it) => it.doctorName },
  {
    key: "period",
    label: "Period",
    priority: 1,
    render: (it) => <span className="font-mono text-xs">{it.period}</span>,
  },
  {
    key: "filename",
    label: "File",
    priority: 2,
    render: (it) => <span className="block max-w-[220px] truncate">{it.filename}</span>,
  },
  { key: "size", label: "Size", priority: 3, render: (it) => fmtSize(it.size) },
  {
    key: "uploadedAt",
    label: "Uploaded",
    priority: 3,
    render: (it) => (it.uploadedAt ? new Date(it.uploadedAt).toLocaleDateString("en-GB") : "—"),
  },
  {
    key: "download",
    label: "Download",
    priority: 1,
    align: "right",
    render: (it) => (
      <a
        href={`/api/admin/payout-invoices/download?key=${encodeURIComponent(it.key)}`}
        className="gh-btn gh-btn-soft text-xs"
      >
        <Download className="size-3.5" /> Download
      </a>
    ),
  },
];

export function AdminUploadedInvoices({
  doctors,
}: {
  doctors: { id: string; name: string }[];
}) {
  const [doctorId, setDoctorId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh(filterDoctorId: string) {
    setLoading(true);
    try {
      const qs = filterDoctorId ? `?doctorId=${encodeURIComponent(filterDoctorId)}` : "";
      const res = await fetch(`/api/admin/payout-invoices${qs}`, { cache: "no-store" });
      const json = await res.json();
      setItems(res.ok && json.ok ? (json.data.items as Item[]) : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch-on-mount/param-change: setLoading inside refresh is the
    // standard async-fetch pattern, not a cascading-render risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(doctorId);
  }, [doctorId]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Doctor</span>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="gh-select"
          >
            <option value="">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => refresh(doctorId)}
          className="gh-btn gh-btn-outline text-sm"
        >
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No uploaded invoices yet.</p>
      ) : (
        <ColumnPriorityTable<Item>
          fields={uploadedInvoiceFields}
          rows={items}
          getRowKey={(it) => it.key}
        />
      )}
    </div>
  );
}
