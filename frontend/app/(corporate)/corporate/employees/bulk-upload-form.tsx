"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import type { CorporateEmployeeInput } from "@/lib/corporate/corporate-api";
import { AdminCard, Btn } from "@/components/portal-atoms";

type BulkResult = { email: string; ok: boolean; status?: string; message?: string };

type BulkAction = (
  employees: CorporateEmployeeInput[],
) => Promise<{ ok: true; results: BulkResult[] } | { ok: false; message: string }>;

const HEADER = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address",
  "dateOfBirth",
  "employeeCode",
  "department",
  "jobTitle",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ParsedRow = { row: CorporateEmployeeInput; line: number; error?: string };

/** Parse CSV/TSV pasted text. First line may be a header row (detected by
 *  "firstName"/"first name" in the first cell) — otherwise column order is
 *  assumed to match the template above. */
function parseRows(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const splitLine = (line: string) => line.split(/\t|,|;/).map((c) => c.trim());
  const first = splitLine(lines[0]).map((c) => c.toLowerCase().replace(/[\s_-]/g, ""));
  const hasHeader = first[0] === "firstname";
  const body = hasHeader ? lines.slice(1) : lines;
  const offset = hasHeader ? 2 : 1;

  return body.map((line, index) => {
    const cells = splitLine(line);
    const [firstName, lastName, email, phone, address, dateOfBirth, employeeCode, department, jobTitle] =
      cells;
    const row: CorporateEmployeeInput = {
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      email: (email ?? "").toLowerCase(),
      ...(phone ? { phone } : {}),
      ...(address ? { addressLine1: address } : {}),
      ...(dateOfBirth ? { dateOfBirth } : {}),
      ...(employeeCode ? { employeeCode } : {}),
      ...(department ? { department } : {}),
      ...(jobTitle ? { jobTitle } : {}),
    };
    let error: string | undefined;
    if (!row.firstName || !row.lastName) error = "Missing name";
    else if (!EMAIL_RE.test(row.email)) error = "Invalid email";
    else if (row.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(row.dateOfBirth)) {
      error = "Date of birth must be YYYY-MM-DD";
    }
    return { row, line: index + offset, error };
  });
}

export function BulkUploadForm({ action }: { action: BulkAction }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const valid = (parsed ?? []).filter((p) => !p.error);
  const invalid = (parsed ?? []).filter((p) => p.error);

  function onPreview() {
    setResults(null);
    setError(null);
    const rows = parseRows(text);
    if (rows.length === 0) {
      setError("Paste at least one row");
      setParsed(null);
      return;
    }
    if (rows.length > 500) {
      setError("Maximum 500 employees per upload");
      setParsed(null);
      return;
    }
    setParsed(rows);
  }

  function onSubmit() {
    startTransition(async () => {
      const outcome = await action(valid.map((p) => p.row));
      if (!outcome.ok) {
        setError(outcome.message);
        return;
      }
      setResults(outcome.results);
      setParsed(null);
      setText("");
      router.refresh();
    });
  }

  return (
    <AdminCard padding={0} className="mb-4 overflow-hidden">
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-bold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
          <UploadCloud className="size-4" aria-hidden />
          Bulk upload
        </summary>
        <div className="border-t border-[var(--color-border)] px-5 py-4">
          <p className="mb-2 text-sm text-[var(--color-text-muted)]">
            Paste rows from a spreadsheet (CSV, semicolon or tab separated). Column order:{" "}
            <code className="font-mono text-xs">{HEADER.join(", ")}</code> — a header row is
            optional. Only name + email are required. Invites are sent automatically on upload.
          </p>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            className="gh-input w-full font-mono text-xs"
            placeholder={"firstName,lastName,email,phone\nMary,Byrne,mary.byrne@acme.ie,+353871234567"}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Btn type="button" variant="secondary" size="sm" onClick={onPreview}>
              Preview
            </Btn>
            {parsed ? (
              <Btn
                type="button"
                variant="primary"
                size="sm"
                onClick={onSubmit}
                disabled={isPending || valid.length === 0}
              >
                {isPending
                  ? "Uploading…"
                  : `Upload ${valid.length} employee${valid.length === 1 ? "" : "s"} + send invites`}
              </Btn>
            ) : null}
          </div>

          {error ? (
            <p className="gh-status-warning mt-3 rounded-md border px-4 py-3 text-sm">{error}</p>
          ) : null}

          {parsed ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-2 py-1.5">Line</th>
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Email</th>
                    <th className="px-2 py-1.5">Phone</th>
                    <th className="px-2 py-1.5">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {parsed.map((p) => (
                    <tr key={p.line}>
                      <td className="px-2 py-1.5 font-mono text-xs">{p.line}</td>
                      <td className="px-2 py-1.5">
                        {p.row.firstName} {p.row.lastName}
                      </td>
                      <td className="px-2 py-1.5">{p.row.email}</td>
                      <td className="px-2 py-1.5">{p.row.phone ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        {p.error ? (
                          <span className="text-xs font-semibold text-rose-700">
                            {p.error} — skipped
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invalid.length > 0 ? (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  {invalid.length} row{invalid.length === 1 ? "" : "s"} with problems will be
                  skipped.
                </p>
              ) : null}
            </div>
          ) : null}

          {results ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {results.filter((r) => r.ok).length} added ·{" "}
                {results.filter((r) => !r.ok).length} failed
              </p>
              {results.some((r) => !r.ok) ? (
                <ul className="mt-1.5 list-none space-y-1 p-0 text-xs text-[var(--color-text-muted)]">
                  {results
                    .filter((r) => !r.ok)
                    .map((r) => (
                      <li key={r.email}>
                        <span className="font-mono">{r.email}</span> — {r.message ?? "Failed"}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    </AdminCard>
  );
}
