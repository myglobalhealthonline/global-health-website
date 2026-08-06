"use client";

/**
 * Footer link groups — one DOM tree that renders as columns on desktop and
 * as accordions below 768px.
 *
 * Why a client component: the accordion needs state. Everything else in the
 * footer stays server-rendered; only this subtree hydrates, and it receives
 * plain serialisable data (icons are looked up from a `kind` string, never
 * passed as components).
 *
 * Why NOT two markup trees (desktop table + mobile cards, the pattern used in
 * the portal): the links here are the crawlable path into every service,
 * country and calculator page. Duplicating them would double the footer's
 * link graph on every page. So the group heading exists twice (a static
 * <span> and a <button>, one `display:none` at each breakpoint) but each link
 * exists exactly once.
 */

import Link from "next/link";
import { useId, useState } from "react";
import {
  Activity,
  Briefcase,
  ChevronDown,
  CircleUser,
  Globe,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";

export type FooterLink = { label: string; href: string; external?: boolean };

/** Which line icon a group's heading gets. Admin-authored columns use `custom`. */
export type FooterGroupKind =
  | "care"
  | "clinics"
  | "account"
  | "tools"
  | "company"
  | "custom";

export type FooterGroup = {
  kind: FooterGroupKind;
  title: string;
  links: FooterLink[];
};

const GROUP_ICON: Record<FooterGroupKind, LucideIcon> = {
  care: HeartPulse,
  clinics: Globe,
  account: CircleUser,
  tools: Activity,
  company: Briefcase,
  custom: Briefcase,
};

function FooterGroupLinks({ links }: { links: FooterLink[] }) {
  return (
    <>
      {links.map((item) => {
        // Admin custom links may set `external: true` for offsite URLs,
        // mailto:, or tel:. Use a plain <a> there so Next doesn't prefetch.
        const isExternal =
          item.external === true || /^(https?:|mailto:|tel:)/i.test(item.href);
        const newTab = item.external === true;
        const cls = "gh-footer-navLink gh-focus-on-dark";
        return (
          <li key={item.label + item.href}>
            {isExternal ? (
              <a
                href={item.href}
                target={newTab ? "_blank" : undefined}
                rel={newTab ? "noopener noreferrer" : undefined}
                className={cls}
              >
                {item.label}
              </a>
            ) : (
              <Link href={item.href} className={cls}>
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </>
  );
}

export function FooterNav({ groups }: { groups: FooterGroup[] }) {
  const baseId = useId();
  // All groups start collapsed on mobile — a footer that opens 30 links on
  // load is the page-length problem the accordion exists to solve. Multiple
  // groups may be open at once; nothing here is exclusive.
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="gh-footer-navGrid">
      {groups.map((group, i) => {
        const Icon = GROUP_ICON[group.kind];
        const panelId = `${baseId}-fg${i}`;
        const isOpen = open[panelId] === true;
        return (
          <div className="gh-footer-group" key={group.title + i}>
            {/* <p>, not a heading: adding five h2/h3 to every page in the site
                would change each page's heading outline. The accordion's
                accessible name comes from the button itself. */}
            <p className="gh-footer-groupHeading">
              <span className="gh-footer-groupStatic">
                <Icon className="gh-footer-groupIcon" aria-hidden />
                {group.title}
              </span>
              <button
                type="button"
                className="gh-footer-groupTrigger gh-focus-on-dark"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setOpen((prev) => ({ ...prev, [panelId]: !prev[panelId] }))
                }
              >
                <Icon className="gh-footer-groupIcon" aria-hidden />
                <span className="gh-footer-groupTriggerText">{group.title}</span>
                <ChevronDown className="gh-footer-chevron" aria-hidden />
              </button>
            </p>
            <div className="gh-footer-groupPanel" data-open={isOpen}>
              <ul id={panelId} className="gh-footer-groupList">
                <FooterGroupLinks links={group.links} />
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
