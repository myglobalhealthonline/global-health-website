import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Access denied",
};

/**
 * Shared 403 landing page for role-mismatched portal access (e.g. a
 * logged-in patient hitting /admin). Replaces the previous silent
 * redirect-to-/account with an explicit explanation.
 */
export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <ShieldAlert className="size-10 text-[var(--color-status-error-text,#b3261e)]" aria-hidden />
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="max-w-md text-sm text-[var(--color-text-muted,#666)]">
        You don&apos;t have permission to view this page.
      </p>
      <Link href="/account" className="gh-btn gh-btn-primary mt-2">
        Back to my account
      </Link>
    </main>
  );
}
