"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AppMenu, AppMenuItem, AppMenuSeparator } from "@/components/AppMenu";
import { Btn, Pill } from "@/components/portal-atoms";

type SignOutAction = () => Promise<void> | void;

function initials(name: string, email: string): string {
  if (name.trim()) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function PortalUserMenu({
  user,
  signOutAction,
  accountHref,
  rootHref,
  labels,
}: {
  user: { fullName: string; email: string; role: string };
  signOutAction: SignOutAction;
  accountHref?: string;
  rootHref?: string;
  labels: { account?: string; mainSite: string; signOut: string };
}) {
  return (
    <AppMenu
      contentClassName="gh-portal-menu-content min-w-[224px] p-3"
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-[var(--portal-chrome-text-active)] transition hover:bg-white/5"
        >
          <span className="gh-portal-avatar inline-flex size-7 items-center justify-center rounded-[9px] text-[11px] font-extrabold text-white">
            {initials(user.fullName, user.email)}
          </span>
          <span className="hidden max-w-[140px] truncate md:inline">{user.fullName || user.email.split("@")[0]}</span>
          <ChevronDown className="size-3 opacity-70" aria-hidden />
        </button>
      }
    >
      <div className="flex items-center gap-2.5 pb-3">
        <span className="gh-portal-avatar inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-extrabold text-white">
          {initials(user.fullName, user.email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--portal-text)]">{user.fullName || user.email}</p>
          <p className="truncate text-xs text-[var(--portal-muted)]">{user.email}</p>
        </div>
      </div>
      <AppMenuSeparator className="block h-px bg-[var(--portal-line)]" />
      <div className="mt-2"><Pill tone="neutral">{user.role}</Pill></div>
      <div className="mt-2 flex flex-col gap-0.5">
        {labels.account && accountHref ? (
          <AppMenuItem asChild>
            <Link href={accountHref} className="gh-portal-menu-item">{labels.account}</Link>
          </AppMenuItem>
        ) : null}
        <AppMenuItem asChild>
          <Link href={rootHref ?? "/"} className="gh-portal-menu-item">{labels.mainSite}</Link>
        </AppMenuItem>
      </div>
      <AppMenuSeparator className="mt-2 block h-px bg-[var(--portal-line)]" />
      <form action={signOutAction} className="mt-2">
        <Btn type="submit" variant="danger" size="sm" className="w-full justify-center">{labels.signOut}</Btn>
      </form>
    </AppMenu>
  );
}
