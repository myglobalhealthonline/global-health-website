"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import type { CorporateEmployeeInput } from "@/lib/corporate/corporate-api";
import { AdminCard, Btn } from "@/components/portal-atoms";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";

type BulkUploadLocale = ReturnType<typeof loadLocaleBundle>["corporate"]["employees"]["bulkUpload"];

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

type RowErrorCode = "missingName" | "invalidEmail" | "invalidDob";
type ParsedRow = { row: CorporateEmployeeInput; line: number; error?: RowErrorCode };

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
    let error: RowErrorCode | undefined;
    if (!row.firstName || !row.lastName) error = "missingName";
    else if (!EMAIL_RE.test(row.email)) error = "invalidEmail";
    else if (row.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(row.dateOfBirth)) {
      error = "invalidDob";
    }
    return { row, line: index + offset, error };
  });
}

export function BulkUploadForm({ action, t }: { action: BulkAction; t: BulkUploadLocale }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const valid = (parsed ?? []).filter((p) => !p.error);
  const invalid = (parsed ?? []).filter((p) => p.error);
  const rowErrorMessage = (code: RowErrorCode) =>
    code === "missingName" ? t.errorMissingName : code === "invalidEmail" ? t.errorInvalidEmail : t.errorInvalidDob;

  function onPreview() {
    setResults(null);
    setError(null);
    const rows = parseRows(text);
    if (rows.length === 0) {
      setError(t.errorEmptyRows);
      setParsed(null);
      return;
    }
    if (rows.length > 500) {
      setError(t.errorTooManyRows);
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
          {t.summary}
        </summary>
        <div className="border-t border-[var(--color-border)] px-5 py-4">
          <p className="mb-2 text-sm text-[var(--color-text-muted)]">
            {(() => {
              const [before, after] = t.description.split("{columns}");
              return (
                <>
                  {before}
                  <code className="font-mono text-xs">{HEADER.join(", ")}</code>
                  {after}
                </>
              );
            })()}
          </p>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            className="gh-input w-full font-mono text-xs"
            placeholder={t.textareaPlaceholder}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Btn type="button" variant="secondary" size="sm" onClick={onPreview}>
              {t.preview}
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
                  ? t.uploading
                  : (valid.length === 1 ? t.uploadButton : t.uploadButtonPlural).replace(
                      "{count}",
                      String(valid.length),
                    )}
              </Btn>
            ) : null}
          </div>

          {error ? (
            <p className="gh-status-warning mt-3 rounded-md border px-4 py-3 text-sm">{error}</p>
          ) : null}

          {parsed ? (
            <div className="mt-4 overflow-x-auto gh-hscroll-fade">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-2 py-1.5">{t.tableLine}</th>
                    <th className="px-2 py-1.5">{t.tableName}</th>
                    <th className="px-2 py-1.5">{t.tableEmail}</th>
                    <th className="px-2 py-1.5">{t.tablePhone}</th>
                    <th className="px-2 py-1.5">{t.tableCheck}</th>
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
                            {rowErrorMessage(p.error)} {t.rowSkipped}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700">{t.rowReady}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invalid.length > 0 ? (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  {invalid.length}{" "}
                  {invalid.length === 1 ? t.invalidRowsNotice : t.invalidRowsNoticePlural}
                </p>
              ) : null}
            </div>
          ) : null}

          {results ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t.resultsSummary
                  .replace("{added}", String(results.filter((r) => r.ok).length))
                  .replace("{failed}", String(results.filter((r) => !r.ok).length))}
              </p>
              {results.some((r) => !r.ok) ? (
                <ul className="mt-1.5 list-none space-y-1 p-0 text-xs text-[var(--color-text-muted)]">
                  {results
                    .filter((r) => !r.ok)
                    .map((r) => (
                      <li key={r.email}>
                        <span className="font-mono">{r.email}</span> — {r.message ?? t.resultFailedFallback}
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
