"use client";

import { useState, useTransition } from "react";
import {
  type AdminServiceFaqDto,
  type AdminServiceFaqTranslation,
  createAdminServiceFaq,
  updateAdminServiceFaq,
  deleteAdminServiceFaq,
  reorderAdminServiceFaqs,
} from "@/lib/api/admin-service-faq-api";
import { PortalTabs } from "@/components/PortalTabs";

type LocaleTab = { code: string; isDefault: boolean };

type Props = {
  serviceId: string;
  initialFaqs: AdminServiceFaqDto[];
  locales: LocaleTab[];
  defaultLocale: string;
};

/** One locale's question/answer, keyed by uppercase locale code. */
type LocaleTexts = Record<string, { question: string; answer: string }>;

type FormState = {
  texts: LocaleTexts;
  isVisible: boolean;
};

function localeLabel(code: string): string {
  const names: Record<string, string> = {
    EN: "English",
    PT: "Português",
    ES: "Español",
    CS: "Čeština",
    RO: "Română",
    DE: "Deutsch",
  };
  return names[code] ?? code;
}

function emptyForm(locales: LocaleTab[]): FormState {
  const texts: LocaleTexts = {};
  for (const l of locales) texts[l.code] = { question: "", answer: "" };
  return { texts, isVisible: true };
}

/** Base question/answer = default locale; translations[] = every locale
 *  (including default) with non-empty text — mirrors parseTranslations()
 *  in service-form-parse.ts. Backend now deletes any locale missing from
 *  this array, so a half-filled tab (see findHalfFilledLocales) must be
 *  blocked before this ever runs. */
function formToBody(form: FormState, locales: LocaleTab[], defaultLocale: string) {
  const upperDefault = defaultLocale.toUpperCase();
  const base = form.texts[upperDefault] ?? { question: "", answer: "" };
  const translations: AdminServiceFaqTranslation[] = locales
    .map((l) => ({ locale: l.code, ...form.texts[l.code] }))
    .filter((t) => t.question.trim() !== "" && t.answer.trim() !== "");
  return {
    question: base.question,
    answer: base.answer,
    isVisible: form.isVisible,
    translations,
  };
}

/** Non-default locale tabs where exactly one of question/answer is filled —
 *  saving as-is would silently drop that text (backend now deletes any
 *  locale missing from the translations array). */
function findHalfFilledLocales(form: FormState, locales: LocaleTab[], defaultLocale: string): string[] {
  const upperDefault = defaultLocale.toUpperCase();
  return locales
    .filter((l) => l.code !== upperDefault)
    .filter((l) => {
      const t = form.texts[l.code] ?? { question: "", answer: "" };
      const hasQuestion = t.question.trim() !== "";
      const hasAnswer = t.answer.trim() !== "";
      return hasQuestion !== hasAnswer;
    })
    .map((l) => l.code);
}

function formFromFaq(faq: AdminServiceFaqDto, locales: LocaleTab[], defaultLocale: string): FormState {
  const upperDefault = defaultLocale.toUpperCase();
  const texts: LocaleTexts = {};
  for (const l of locales) {
    const tr = faq.translations?.find((t) => t.locale.toUpperCase() === l.code);
    if (tr) {
      texts[l.code] = { question: tr.question, answer: tr.answer };
    } else if (l.code === upperDefault) {
      texts[l.code] = { question: faq.question, answer: faq.answer };
    } else {
      texts[l.code] = { question: "", answer: "" };
    }
  }
  return { texts, isVisible: faq.isVisible };
}

export function ServiceFaqPanel({ serviceId, initialFaqs, locales, defaultLocale }: Props) {
  const [faqs, setFaqs] = useState<AdminServiceFaqDto[]>(initialFaqs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(locales));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(faq: AdminServiceFaqDto) {
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
      const res = await createAdminServiceFaq(serviceId, formToBody(form, locales, defaultLocale));
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
      const res = await updateAdminServiceFaq(
        serviceId,
        editingId,
        formToBody(form, locales, defaultLocale),
      );
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs((prev) => prev.map((f) => (f.id === editingId ? res.data.faq : f)));
      setEditingId(null);
      setForm(emptyForm(locales));
    });
  }

  function handleToggleVisible(faq: AdminServiceFaqDto) {
    startTransition(async () => {
      setError(null);
      const res = await updateAdminServiceFaq(serviceId, faq.id, {
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
      const res = await deleteAdminServiceFaq(serviceId, faqId);
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
      const res = await reorderAdminServiceFaqs(serviceId, orderedIds);
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
      const res = await reorderAdminServiceFaqs(serviceId, orderedIds);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setFaqs(res.data.faqs);
    });
  }

  return (
    <div className="gh-admin-service-faq">
      <div className="gh-admin-service-faq__header mb-3 flex items-center justify-between">
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

      {/* Add form */}
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

      <ul className="gh-admin-service-faq__list mt-3 space-y-3">
        {faqs.map((faq, idx) => (
          <li
            key={faq.id}
            className="gh-admin-service-faq__item"
          >
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
                <div className="gh-admin-service-faq__row">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {faq.question}
                  </p>
                  <div className="gh-admin-service-faq__actions">
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
                    Translated: {faq.translations.map((t) => localeLabel(t.locale.toUpperCase())).join(", ")}
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
    locales.find((l) => l.code === upperDefault)?.code ?? locales[0]?.code ?? upperDefault,
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
    <div className="gh-admin-service-faq-form">
      {locales.length > 1 ? (
        <PortalTabs
          ariaLabel="FAQ translations"
          value={active}
          onChange={setActive}
          items={locales.map((l) => ({
            value: l.code,
            label: `${localeLabel(l.code)}${l.isDefault ? " · default" : ""}`,
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
          placeholder={
            isDefaultTab ? "What is included in the consultation?" : "Leave blank to use the default language"
          }
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
          placeholder={isDefaultTab ? "The consultation includes..." : "Leave blank to use the default language"}
        />
      </div>
      {halfFilledLocales.length > 0 ? (
        <p className="text-[11px] text-[var(--color-status-warning-text)]">
          {halfFilledLocales.map((c) => localeLabel(c)).join(", ")} {halfFilledLocales.length > 1 ? "have" : "has"}{" "}
          only a question or answer filled in — fill in both or clear both before saving.
        </p>
      ) : null}
      <div className="gh-admin-service-active-row">
        <input
          id="faq-visible"
          type="checkbox"
          checked={form.isVisible}
          onChange={(e) => onChange({ ...form, isVisible: e.target.checked })}
          className="size-4 rounded"
        />
        <label htmlFor="faq-visible" className="text-[13px] text-[var(--color-text-body)]">
          Visible on public service page
        </label>
      </div>
      <div className="gh-admin-service-actions">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending || !canSave}
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
