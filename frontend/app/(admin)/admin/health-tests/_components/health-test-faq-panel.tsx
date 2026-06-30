"use client";

import { useState, useTransition } from "react";
import {
  type AdminHealthTestFaqDto,
  createAdminHealthTestFaq,
  updateAdminHealthTestFaq,
  deleteAdminHealthTestFaq,
  reorderAdminHealthTestFaqs,
} from "@/lib/api/admin-health-test-faq-api";

type Props = {
  healthTestId: string;
  initialFaqs: AdminHealthTestFaqDto[];
};

type FormState = {
  question: string;
  answer: string;
  isVisible: boolean;
};

const emptyForm: FormState = { question: "", answer: "", isVisible: true };

export function HealthTestFaqPanel({ healthTestId, initialFaqs }: Props) {
  const [faqs, setFaqs] = useState<AdminHealthTestFaqDto[]>(initialFaqs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(faq: AdminHealthTestFaqDto) {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, isVisible: faq.isVisible });
    setShowAdd(false);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setShowAdd(false);
    setError(null);
  }

  function handleAdd() {
    startTransition(async () => {
      setError(null);
      const res = await createAdminHealthTestFaq(healthTestId, form);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs((prev) => [...prev, res.data.faq]);
      setForm(emptyForm);
      setShowAdd(false);
    });
  }

  function handleSaveEdit() {
    if (!editingId) return;
    startTransition(async () => {
      setError(null);
      const res = await updateAdminHealthTestFaq(healthTestId, editingId, form);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs((prev) => prev.map((f) => (f.id === editingId ? res.data.faq : f)));
      setEditingId(null);
      setForm(emptyForm);
    });
  }

  function handleToggleVisible(faq: AdminHealthTestFaqDto) {
    startTransition(async () => {
      setError(null);
      const res = await updateAdminHealthTestFaq(healthTestId, faq.id, {
        isVisible: !faq.isVisible,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs((prev) => prev.map((f) => (f.id === faq.id ? res.data.faq : f)));
    });
  }

  function handleDelete(faqId: string) {
    if (!confirm("Delete this FAQ? This cannot be undone.")) return;
    startTransition(async () => {
      setError(null);
      const res = await deleteAdminHealthTestFaq(healthTestId, faqId);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs((prev) => prev.filter((f) => f.id !== faqId));
    });
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const next = [...faqs];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    const orderedIds = next.map((f) => f.id);
    startTransition(async () => {
      setError(null);
      const res = await reorderAdminHealthTestFaqs(healthTestId, orderedIds);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs(res.data.faqs);
    });
  }

  function handleMoveDown(index: number) {
    if (index === faqs.length - 1) return;
    const next = [...faqs];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    const orderedIds = next.map((f) => f.id);
    startTransition(async () => {
      setError(null);
      const res = await reorderAdminHealthTestFaqs(healthTestId, orderedIds);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs(res.data.faqs);
    });
  }

  return (
    <div className="gh-admin-health-faq">
      <div className="gh-admin-health-faq__header mb-3 flex items-center justify-between">
        <h3 className="gh-admin-card-title">
          FAQs{" "}
          <span className="ml-1.5 text-[13px] font-normal text-[var(--color-text-muted)]">
            ({faqs.length})
          </span>
        </h3>
        {!showAdd && !editingId ? (
          <button
            type="button"
            onClick={() => {
              setShowAdd(true);
              setForm(emptyForm);
              setError(null);
            }}
            className="gh-btn gh-btn-primary text-xs"
            disabled={isPending}
          >
            + Add FAQ
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="gh-status-warning mb-3 rounded-[var(--radius-card-sm)] border px-3 py-2 text-xs">
          {error}
        </p>
      ) : null}

      {showAdd ? (
        <FaqForm
          form={form}
          onChange={setForm}
          onSave={handleAdd}
          onCancel={cancelEdit}
          isPending={isPending}
          saveLabel="Add FAQ"
        />
      ) : null}

      {faqs.length === 0 && !showAdd ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          No FAQs yet. Click &ldquo;+ Add FAQ&rdquo; to create one.
        </p>
      ) : null}

      <ul className="gh-admin-health-faq__list mt-3 space-y-3">
        {faqs.map((faq, idx) => (
          <li
            key={faq.id}
            className="gh-admin-health-faq__item"
          >
            {editingId === faq.id ? (
              <FaqForm
                form={form}
                onChange={setForm}
                onSave={handleSaveEdit}
                onCancel={cancelEdit}
                isPending={isPending}
                saveLabel="Save"
              />
            ) : (
              <div>
                <div className="gh-admin-health-faq__row">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {faq.question}
                  </p>
                  <div className="gh-admin-health-faq__actions">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0 || isPending}
                      className="gh-btn gh-btn-ghost px-2 py-1 text-xs disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === faqs.length - 1 || isPending}
                      className="gh-btn gh-btn-ghost px-2 py-1 text-xs disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVisible(faq)}
                      disabled={isPending}
                      className={`gh-btn px-2 py-1 text-xs ${faq.isVisible ? "gh-btn-ghost" : "gh-btn-warning"}`}
                      title={faq.isVisible ? "Hide from public" : "Show publicly"}
                    >
                      {faq.isVisible ? "Visible" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(faq)}
                      disabled={isPending}
                      className="gh-btn gh-btn-ghost px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(faq.id)}
                      disabled={isPending}
                      className="gh-btn gh-btn-danger px-2 py-1 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--color-text-body)]">
                  {faq.answer}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqForm({
  form,
  onChange,
  onSave,
  onCancel,
  isPending,
  saveLabel,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  saveLabel: string;
}) {
  return (
    <div className="gh-admin-health-faq-form">
      <div>
        <label
          className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
          htmlFor="faq-question"
        >
          Question
        </label>
        <input
          id="faq-question"
          type="text"
          value={form.question}
          onChange={(e) => onChange({ ...form, question: e.target.value })}
          maxLength={500}
          className="gh-input w-full"
          placeholder="What is included in this test?"
        />
      </div>
      <div>
        <label
          className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
          htmlFor="faq-answer"
        >
          Answer
        </label>
        <textarea
          id="faq-answer"
          value={form.answer}
          onChange={(e) => onChange({ ...form, answer: e.target.value })}
          maxLength={5000}
          rows={4}
          className="gh-input w-full resize-y"
          placeholder="This test includes..."
        />
      </div>
      <div className="gh-admin-health-active-row">
        <input
          id="faq-visible"
          type="checkbox"
          checked={form.isVisible}
          onChange={(e) => onChange({ ...form, isVisible: e.target.checked })}
          className="size-4 rounded"
        />
        <label htmlFor="faq-visible" className="text-[13px] text-[var(--color-text-body)]">
          Visible on public test page
        </label>
      </div>
      <div className="gh-admin-health-actions">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending || !form.question.trim() || !form.answer.trim()}
          className="gh-btn gh-btn-primary text-sm disabled:opacity-50"
        >
          {isPending ? "Saving…" : saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="gh-btn gh-btn-ghost text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
