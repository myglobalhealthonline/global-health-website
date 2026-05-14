"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeUserRoleAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
} from "../actions";

export function UserRowActions({
  userId,
  role,
  active,
}: {
  userId: string;
  role: "PATIENT" | "ADMIN" | "SUPER_ADMIN";
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<string | null>(null);

  function changeRole(next: "ADMIN" | "SUPER_ADMIN") {
    const form = new FormData();
    form.set("id", userId);
    form.set("role", next);
    startTransition(async () => {
      await changeUserRoleAction(form);
      router.refresh();
    });
  }

  function toggleActive() {
    const form = new FormData();
    form.set("id", userId);
    form.set("active", String(!active));
    startTransition(async () => {
      await toggleUserActiveAction(form);
      router.refresh();
    });
  }

  function resetPassword() {
    const form = new FormData();
    form.set("id", userId);
    startTransition(async () => {
      const result = await resetUserPasswordAction(form);
      if (result.ok) setRevealed(result.data.password);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        value={role === "PATIENT" ? "ADMIN" : role}
        onChange={(e) => changeRole(e.target.value as "ADMIN" | "SUPER_ADMIN")}
        disabled={isPending}
        className="gh-select h-8 text-xs"
      >
        <option value="ADMIN">ADMIN</option>
        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
      </select>
      <button
        type="button"
        onClick={toggleActive}
        disabled={isPending}
        className={`gh-btn ${active ? "gh-btn-soft" : "gh-btn-primary"} text-xs`}
      >
        {active ? "Deactivate" : "Activate"}
      </button>
      <button
        type="button"
        onClick={resetPassword}
        disabled={isPending}
        className="gh-btn gh-btn-soft text-xs"
      >
        Reset password
      </button>
      {revealed ? (
        <div className="basis-full">
          <p className="gh-status-warning rounded-md px-3 py-2 text-xs">
            One-time password (copy + share manually, will not be shown again):
            <code className="ml-2 select-all rounded bg-white/70 px-1.5 py-0.5">{revealed}</code>
          </p>
        </div>
      ) : null}
    </div>
  );
}
