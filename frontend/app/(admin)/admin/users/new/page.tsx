import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { InviteForm } from "./_form";

export const dynamic = "force-dynamic";

export default async function InviteUserPage() {
  await requireSuperAdmin();
  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to admin users
      </Link>
      <header>
        <p className="gh-eyebrow">Invite admin</p>
        <h1 className="gh-h2 mt-2">Add a new admin user</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          You set the initial password and share it with them. They can change it after first sign-in (v1.1).
        </p>
      </header>
      <InviteForm />
    </div>
  );
}
