"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";

export type CatalogueExam = { id: string; code: string | null; name: string };

export type ExamCataloguePickerCopy = {
  examCatalogueLabel: string;
  examCataloguePlaceholder: string;
  examCatalogueHint: string;
  examCatalogueEmpty: string;
};

/**
 * Type-ahead over the exam catalogue for the exams-prescription tab.
 *
 * Picking an exam appends its name to the prescription textarea AND records its
 * catalogue id. The id is what lets the admin lab queue price the exam against
 * a collection centre and match a result back to it — a free-typed line still
 * works everywhere, it just arrives unpriced.
 *
 * The catalogue holds thousands of rows, so this never lists everything: it
 * queries on what the doctor types and the backend caps the result set.
 */
export function ExamCataloguePicker({
  copy,
  onPick,
}: {
  copy: ExamCataloguePickerCopy;
  onPick: (exam: CatalogueExam) => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CatalogueExam[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // Aborts the in-flight request on every new keystroke, so a slow early
  // response can never land after a faster later one and show stale results.
  const abortRef = useRef<AbortController | null>(null);

  // Clearing on a too-short query happens in the change handler below, not
  // here: this effect only ever starts work, so it never sets state
  // synchronously during a render pass.
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return;

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      fetch(`/api/doctor/exam-types?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json: { ok?: boolean; data?: { examTypes?: CatalogueExam[] } } | null) => {
          setResults(json?.ok ? (json.data?.examTypes ?? []) : []);
          setSearched(true);
        })
        .catch(() => {
          // Abort or network failure — the doctor can always type the exam
          // by hand, so this stays silent rather than throwing an error banner
          // over a prescription they are in the middle of writing.
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [term]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold" htmlFor="exam-catalogue-search">
        {copy.examCatalogueLabel}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--portal-muted)]"
          aria-hidden
        />
        <input
          id="exam-catalogue-search"
          type="search"
          value={term}
          onChange={(e) => {
            const next = e.target.value;
            setTerm(next);
            if (next.trim().length < 2) {
              abortRef.current?.abort();
              setResults([]);
              setSearched(false);
              setLoading(false);
            }
          }}
          className="gh-input w-full pl-8"
          placeholder={copy.examCataloguePlaceholder}
          autoComplete="off"
        />
        {loading ? (
          <Loader2
            className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-[var(--portal-muted)]"
            aria-hidden
          />
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul className="max-h-40 overflow-y-auto rounded-md border border-[var(--portal-border)]">
          {results.map((exam) => (
            <li key={exam.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(exam);
                  setTerm("");
                }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-[var(--portal-hover)]"
              >
                <Plus className="size-3.5 shrink-0 text-[var(--portal-muted)]" aria-hidden />
                <span className="truncate">{exam.name}</span>
                {exam.code ? (
                  <span className="ml-auto shrink-0 text-xs text-[var(--portal-muted)]">
                    {exam.code}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {searched && !loading && results.length === 0 ? (
        <p className="text-xs text-[var(--portal-muted)]">{copy.examCatalogueEmpty}</p>
      ) : null}

      <p className="text-xs text-[var(--portal-muted)]">{copy.examCatalogueHint}</p>
    </div>
  );
}
