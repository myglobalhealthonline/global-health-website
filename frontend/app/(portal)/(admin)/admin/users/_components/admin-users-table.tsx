"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { AdminUserDto } from "@/lib/admin/admin-api";
import { Btn, Pill } from "../../_components/atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import {
  RecordDetailsDrawer,
  RecordDetailsSection,
  RecordDetailsField,
} from "@/components/RecordDetailsDrawer";

function RoleBadge({ role }: { role: AdminUserDto["role"] }) {
  return <Pill tone={role === "ADMIN" ? "published" : "neutral"}>{role}</Pill>;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return <Pill tone={isActive ? "active" : "inactive"}>{isActive ? "Active" : "Suspended"}</Pill>;
}

function userFields(): ColumnPriorityField<AdminUserDto>[] {
  return [
    {
      key: "email",
      label: "Email",
      priority: 1,
      render: (u) => <span className="font-semibold text-[var(--color-text-primary)]">{u.email}</span>,
    },
    {
      key: "name",
      label: "Name",
      priority: 1,
      render: (u) => u.fullName || "—",
    },
    {
      key: "role",
      label: "Role",
      priority: 1,
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (u) => <StatusBadge isActive={u.isActive} />,
    },
    {
      key: "verified",
      label: "Verified",
      priority: 3,
      render: (u) => (
        <span className="text-[var(--color-text-muted)]">
          {u.emailVerifiedAt ? new Date(u.emailVerifiedAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "created",
      label: "Created",
      priority: 3,
      render: (u) => (
        <span className="text-[var(--color-text-muted)]">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "open",
      label: "",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: (u) => (
        <Link
          href={`/admin/users/${u.id}`}
          onClick={(e) => e.stopPropagation()}
          className="gh-link text-sm font-medium"
        >
          Open →
        </Link>
      ),
    },
  ];
}

export function AdminUsersTable({ items }: { items: AdminUserDto[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [quickViewId, setQuickViewId] = useState<string | null>(() => searchParams.get("user"));

  // URL param is the internal id, never email.
  const quickViewUser = quickViewId ? items.find((u) => u.id === quickViewId) ?? null : null;

  function openQuickView(u: AdminUserDto) {
    setQuickViewId(u.id);
    const next = new URLSearchParams(searchParams.toString());
    next.set("user", u.id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <>
      <ColumnPriorityTable<AdminUserDto>
        fields={userFields()}
        rows={items}
        getRowKey={(u) => u.id}
        onRowClick={openQuickView}
        cardActions={(u) => (
          <Link href={`/admin/users/${u.id}`} className="gh-btn gh-btn-secondary text-sm">
            Open user
          </Link>
        )}
      />

      <RecordDetailsDrawer
        open={quickViewUser !== null}
        onOpenChange={(next) => {
          if (!next) setQuickViewId(null);
        }}
        paramKey="user"
        paramValue={quickViewUser?.id ?? undefined}
        title={quickViewUser ? quickViewUser.fullName || quickViewUser.email : ""}
        eyebrow={quickViewUser?.email}
        summary={
          quickViewUser ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <RoleBadge role={quickViewUser.role} />
              <StatusBadge isActive={quickViewUser.isActive} />
            </div>
          ) : null
        }
        footer={
          quickViewUser ? (
            <>
              <Btn variant="ghost" onClick={() => setQuickViewId(null)}>
                Close
              </Btn>
              <Link href={`/admin/users/${quickViewUser.id}`}>
                <Btn variant="primary">Open full profile</Btn>
              </Link>
            </>
          ) : null
        }
      >
        {quickViewUser ? (
          <RecordDetailsSection title="Account">
            <RecordDetailsField label="Email" value={quickViewUser.email} />
            <RecordDetailsField
              label="Verified"
              value={
                quickViewUser.emailVerifiedAt
                  ? new Date(quickViewUser.emailVerifiedAt).toLocaleDateString()
                  : "Not verified"
              }
            />
            <RecordDetailsField
              label="Created"
              value={new Date(quickViewUser.createdAt).toLocaleDateString()}
            />
            {quickViewUser.phone ? (
              <RecordDetailsField label="Phone" value={quickViewUser.phone} />
            ) : null}
          </RecordDetailsSection>
        ) : null}
      </RecordDetailsDrawer>
    </>
  );
}
