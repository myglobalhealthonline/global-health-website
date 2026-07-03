"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteOwnAccount } from "@/lib/api/auth-api";

type DeleteI18n = {
  deleteWarning: string;
  deleting: string;
  deleteMyAccount: string;
  deleteAccountTitle: string;
  cancel: string;
  deleteAccount: string;
};

const DEFAULT_I18N: DeleteI18n = {
  deleteWarning:
    "This permanently deletes your account. Your booking history is preserved for regulatory reasons but stripped of identifying details. This cannot be undone.",
  deleting: "Deleting…",
  deleteMyAccount: "Delete my account",
  deleteAccountTitle: "Delete your account?",
  cancel: "Cancel",
  deleteAccount: "Delete account",
};

/**
 * Inline confirmation for account deletion (replaces window.confirm — ISS-011).
 */
export function DeleteAccountButton({ i18n = DEFAULT_I18N }: { i18n?: DeleteI18n }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function onConfirmDelete() {
    setDeleteMsg(null);
    setDeleting(true);
    const res = await deleteOwnAccount();
    setDeleting(false);
    if (res.ok) {
      setOpen(false);
      router.replace("/");
      router.refresh();
    } else {
      setDeleteMsg({ kind: "err", text: res.message });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDeleteMsg(null);
          setOpen(true);
        }}
        disabled={deleting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 sm:w-auto"
      >
        <Trash2 className="size-4" aria-hidden />
        {deleting ? i18n.deleting : i18n.deleteMyAccount}
      </button>

      {deleteMsg ? (
        <p
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            deleteMsg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          {deleteMsg.text}
        </p>
      ) : null}

      {open ? (
        <DeleteAccountModal
          i18n={i18n}
          confirming={deleting}
          onCancel={() => {
            if (!deleting) setOpen(false);
          }}
          onConfirm={() => void onConfirmDelete()}
        />
      ) : null}
    </>
  );
}

function DeleteAccountModal({
  onCancel,
  onConfirm,
  confirming,
  i18n,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirming: boolean;
  i18n: DeleteI18n;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-desc"
          className="gh-patient-delete-modal fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[min(calc(100%-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[var(--portal-line)] bg-white p-6 shadow-xl"
      >
        <h2 id="delete-account-title" className="text-base font-bold text-[var(--portal-text)]">
          {i18n.deleteAccountTitle}
        </h2>
        <p id="delete-account-desc" className="mt-2 text-sm text-[var(--portal-muted)]">
          {i18n.deleteWarning}
        </p>
          <div className="gh-patient-form-actions mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-md border border-[var(--portal-line-strong)] px-4 py-2 text-sm font-semibold text-[var(--portal-text-2)] hover:bg-[var(--portal-well)] disabled:opacity-60"
          >
            {i18n.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
          >
            {confirming ? i18n.deleting : i18n.deleteAccount}
          </button>
        </div>
      </div>
    </>
  );
}
