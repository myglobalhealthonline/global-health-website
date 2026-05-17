"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteOwnAccount } from "@/lib/api/auth-api";

const DELETE_COPY =
  "This permanently deletes your account. Your booking history is preserved for regulatory reasons but stripped of identifying details. This cannot be undone.";

/**
 * Inline confirmation for account deletion (replaces window.confirm — ISS-011).
 */
export function DeleteAccountButton() {
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
        className="inline-flex items-center gap-2 rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
      >
        <Trash2 className="size-4" aria-hidden />
        {deleting ? "Deleting…" : "Delete my account"}
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
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirming: boolean;
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
        className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="delete-account-title" className="text-base font-bold text-slate-900">
          Delete your account?
        </h2>
        <p id="delete-account-desc" className="mt-2 text-sm text-slate-600">
          {DELETE_COPY}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
          >
            {confirming ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </>
  );
}
