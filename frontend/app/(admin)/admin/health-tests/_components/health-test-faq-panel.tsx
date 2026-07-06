"use client";

import { useState, useTransition } from "react";
import {
  type AdminHealthTestFaqDto,
  type AdminHealthTestFaqTranslation,
  createAdminHealthTestFaq,
  updateAdminHealthTestFaq,
  deleteAdminHealthTestFaq,
  reorderAdminHealthTestFaqs,
} from "@/lib/api/admin-health-test-faq-api";
import { PortalTabs } from "@/components/PortalTabs";

type LocaleTab = { code: string; isDefault: boolean };

type Props = {
  healthTestId: string;
  initialFaqs: AdminHealthTestFaqDto[];
  locales: LocaleTab[];
  defaultLocale: string;
};

type LocaleTexts = Record<string, { question: string; answer: string }>;

type FormState = {
  texts: LocaleTexts;
  isVisible: boolean;
};

function localeLabel(code: string): string {
  const names: Record<string, string> = {
    EN: "English",
    PT: "Portuguese",
    ES: "Spanish",
    CS: "Czech",
    RO: "Romanian",
    DE: "German",
  };
  return names[code] ?? code;
}

function emptyForm(locales: LocaleTab[]): FormState {
  const texts: LocaleTexts = {};
  for (const locale of locales) texts[locale.code] = { question: "", answer: "" };
  return { texts, isVisible: true };
}

function formToBody(form: FormState, locales: LocaleTab[], defaultLocale: string) {
  const upperDefault = defaultLocale.toUpperCase();
  const base = form.texts[upperDefault] ?? { question: "", answer: "" };
  const translations: AdminHealthTestFaqTranslation[] = locales
    .map((locale) => ({ locale: locale.code, ...form.texts[locale.code] }))
    .filter((entry) => entry.question.trim() !== "" && entry.answer.trim() !== "");
  return {
    question: base.question,
    answer: base.answer,
    isVisible: form.isVisible,
    translations,
  };
}

function findHalfFilledLocales(form: FormState, locales: LocaleTab[], defaultLocale: string): string[] {
  const upperDefault = defaultLocale.toUpperCase();
  return locales
    .filter((locale) => locale.code !== upperDefault)
    .filter((locale) => {
      const text = form.texts[locale.code] ?? { question: "", answer: "" };
      const hasQuestion = text.question.trim() !== "";
      const hasAnswer = text.answer.trim() !== "";
      return hasQuestion !== hasAnswer;
    })
    .map((locale) => locale.code);
}

function formFromFaq(faq: AdminHealthTestFaqDto, locales: LocaleTab[], defaultLocale: string): FormState {
  const upperDefault = defaultLocale.toUpperCase();
  const texts: LocaleTexts = {};
  for (const locale of locales) {
    const tr = faq.translations?.find((entry) => entry.locale.toUpperCase() === locale.code);
    if (tr) {
      texts[locale.code] = { question: tr.question, answer: tr.answer };
    } else if (locale.code === upperDefault) {
      texts[locale.code] = { question: faq.question, answer: faq.answer };
    } else {
      texts[locale.code] = { question: "", answer: "" };
    }
  }
  return { texts, isVisible: faq.isVisible };
}

export function HealthTestFaqPanel({
  healthTestId,
  initialFaqs,
  locales,
  defaultLocale,
}: Props) {
  const [faqs, setFaqs] = useState<AdminHealthTestFaqDto[]>(initialFaqs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(locales));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(faq: AdminHealthTestFaqDto) {
    setEditingId(faq.id);
    setForm(formFromFaq(faq, locales, defaultLocale));
    setShowAdd(false);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(locales));
    setShowAdd(false);
    setError(null);
  }

  function handleAdd() {
    startTransition(async () => {
      setError(null);
      const res = await createAdminHealthTestFaq(
        healthTestId,
        formToBody(form, locales, defaultLocale),
      );
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs((prev) => [...prev, res.data.faq]);
      setForm(emptyForm(locales));
      setShowAdd(false);
    });
  }

  function handleSaveEdit() {
    if (!editingId) return;
    startTransition(async () => {
      setError(null);
      const res = await updateAdminHealthTestFaq(
        healthTestId,
        editingId,
        formToBody(form, locales, defaultLocale),
      );
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs((prev) => prev.map((faq) => (faq.id === editingId ? res.data.faq : faq)));
      setEditingId(null);
      setForm(emptyForm(locales));
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
      setFaqs((prev) => prev.map((item) => (item.id === faq.id ? res.data.faq : item)));
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
      setFaqs((prev) => prev.filter((faq) => faq.id !== faqId));
    });
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const next = [...faqs];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    const orderedIds = next.map((faq) => faq.id);
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
    const orderedIds = next.map((faq) => faq.id);
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
              setForm(emptyForm(locales));
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
          locales={locales}
          defaultLocale={defaultLocale}
        />
      ) : null}

      {faqs.length === 0 && !showAdd ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          No FAQs yet. Click &ldquo;+ Add FAQ&rdquo; to create one.
        </p>
      ) : null}

      <ul className="gh-admin-health-faq__list mt-3 space-y-3">
        {faqs.map((faq, idx) => (
          <li key={faq.id} className="gh-admin-health-faq__item">
            {editingId === faq.id ? (
              <FaqForm
                form={form}
                onChange={setForm}
                onSave={handleSaveEdit}
                onCancel={cancelEdit}
                isPending={isPending}
                saveLabel="Save"
                locales={locales}
                defaultLocale={defaultLocale}
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
                {faq.translations && faq.translations.length > 0 ? (
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                    Translated: {faq.translations.map((entry) => localeLabel(entry.locale.toUpperCase())).join(", ")}
                  </p>
                ) : null}
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
  locales,
  defaultLocale,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  saveLabel: string;
  locales: LocaleTab[];
  defaultLocale: string;
}) {
  const upperDefault = defaultLocale.toUpperCase();
  const [active, setActive] = useState(
    locales.find((locale) => locale.code === upperDefault)?.code ?? locales[0]?.code ?? upperDefault,
  );
  const activeTexts = form.texts[active] ?? { question: "", answer: "" };
  const isDefaultTab = active === upperDefault;

  function setActiveTexts(next: { question: string; answer: string }) {
    onChange({ ...form, texts: { ...form.texts, [active]: next } });
  }

  const halfFilledLocales = findHalfFilledLocales(form, locales, defaultLocale);
  const canSave =
    (form.texts[upperDefault]?.question.trim() ?? "") !== "" &&
    (form.texts[upperDefault]?.answer.trim() ?? "") !== "" &&
    halfFilledLocales.length === 0;

  return (
    <div className="gh-admin-health-faq-form">
      {locales.length > 1 ? (
        <PortalTabs
          ariaLabel="FAQ translations"
          value={active}
          onChange={setActive}
          items={locales.map((locale) => ({
            value: locale.code,
            label: `${localeLabel(locale.code)}${locale.isDefault ? " · default" : ""}`,
          }))}
        />
      ) : null}

      <div>
        <label
          className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
          htmlFor="faq-question"
        >
          Question{isDefaultTab ? " *" : ""}
        </label>
        <input
          id="faq-question"
          type="text"
          value={activeTexts.question}
          onChange={(e) => setActiveTexts({ ...activeTexts, question: e.target.value })}
          maxLength={500}
          className="gh-input w-full"
          placeholder={isDefaultTab ? "What is included in this test?" : "Leave blank to use the default language"}
        />
      </div>
      <div>
        <label
          className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
          htmlFor="faq-answer"
        >
          Answer{isDefaultTab ? " *" : ""}
        </label>
        <textarea
          id="faq-answer"
          value={activeTexts.answer}
          onChange={(e) => setActiveTexts({ ...activeTexts, answer: e.target.value })}
          maxLength={5000}
          rows={4}
          className="gh-input w-full resize-y"
          placeholder={isDefaultTab ? "This test includes..." : "Leave blank to use the default language"}
        />
      </div>
      {halfFilledLocales.length > 0 ? (
        <p className="text-[11px] text-[var(--color-status-warning-text)]">
          {halfFilledLocales.map((code) => localeLabel(code)).join(", ")}{" "}
          {halfFilledLocales.length > 1 ? "have" : "has"} only a question or answer filled in. Fill in both or clear both before saving.
        </p>
      ) : null}
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
          disabled={isPending || !canSave}
          className="gh-btn gh-btn-primary text-sm disabled:opacity-50"
        >
          {isPending ? "Saving..." : saveLabel}
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
