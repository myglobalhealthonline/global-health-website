"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteOwnAccount } from "@/lib/api/auth-api";
import { PortalDialog } from "@/components/PortalDialog";

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
    "This schedules your account for deletion in 30 days. You can keep using your account and cancel the request anytime before then from this page.",
  deleting: "Scheduling…",
  deleteMyAccount: "Delete my account",
  deleteAccountTitle: "Delete your account?",
  cancel: "Cancel",
  deleteAccount: "Schedule deletion",
};

/**
 * Inline confirmation for account deletion (replaces window.confirm — ISS-011).
 * Grace-period deletion (30 days) — the account stays functional, so this no
 * longer redirects away. `onScheduled` lets the parent page show the
 * deletion banner immediately without a full reload.
 */
export function DeleteAccountButton({
  i18n = DEFAULT_I18N,
  onScheduled,
}: {
  i18n?: DeleteI18n;
  onScheduled?: (deletionScheduledAt: string) => void;
}) {
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
      onScheduled?.(res.data.deletionScheduledAt);
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
    <PortalDialog
      open
      onClose={onCancel}
      title={i18n.deleteAccountTitle}
      danger
      width="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
      }
    >
      <p className="text-sm text-[var(--portal-muted)]">{i18n.deleteWarning}</p>
    </PortalDialog>
  );
}
