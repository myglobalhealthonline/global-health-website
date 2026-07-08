"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

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
    void refresh(doctorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="py-2 pr-4 font-semibold">Doctor</th>
                <th className="py-2 pr-4 font-semibold">Period</th>
                <th className="py-2 pr-4 font-semibold">File</th>
                <th className="py-2 pr-4 font-semibold">Size</th>
                <th className="py-2 pr-4 font-semibold">Uploaded</th>
                <th className="py-2 font-semibold text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((it) => (
                <tr key={it.key}>
                  <td className="py-2 pr-4">{it.doctorName}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{it.period}</td>
                  <td className="py-2 pr-4">
                    <span className="block max-w-[220px] truncate">{it.filename}</span>
                  </td>
                  <td className="py-2 pr-4 text-xs">{fmtSize(it.size)}</td>
                  <td className="py-2 pr-4 text-xs">
                    {it.uploadedAt ? new Date(it.uploadedAt).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <a
                      href={`/api/admin/payout-invoices/download?key=${encodeURIComponent(it.key)}`}
                      className="gh-btn gh-btn-soft text-xs"
                    >
                      <Download className="size-3.5" /> Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
