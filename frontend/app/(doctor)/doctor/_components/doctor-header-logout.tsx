"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/api/auth-api";

export function DoctorHeaderLogout() {
  const router = useRouter();

  async function handleLogout() {
    await logoutUser();
    router.replace("/login?next=/doctor");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
    >
      Sign out
    </button>
  );
}
