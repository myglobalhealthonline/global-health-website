import type { ReactNode } from "react";
import { LinkCallout, type LinkCalloutVariant } from "./LinkCallout";

export type ResolvedServiceLink = {
  id: string;
  type: LinkCalloutVariant;
  anchorSlot: string | null;
  heading: string;
  body: string | null;
  ctaLabel: string;
  href: string;
};

/**
 * Renders the admin-authored service body and weaves contextual link callouts
 * in at `{{link:<slot>}}` markers (Rule 1–3 — boxes appear where they are
 * clinically relevant, not in a generic bottom widget). Any active link whose
 * slot is absent from the body falls back to a compact strip after the body.
 *
 * The body HTML is already sanitized + scoped upstream; tokens are authored as
 * plain text between block elements, so splitting on them keeps each fragment
 * well-formed.
 */
export function ServiceLinkedBody({
  bodyHtml,
  links,
}: {
  bodyHtml: string;
  links: ResolvedServiceLink[];
}) {
  const bySlot = new Map(
    links.filter((l) => l.anchorSlot).map((l) => [l.anchorSlot as string, l]),
  );
  const used = new Set<string>();

  // Split keeps capture groups: [text, slot, text, slot, …]
  const parts = bodyHtml.split(/\{\{\s*link:\s*([a-zA-Z0-9_-]+)\s*\}\}/);
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      if (part.trim()) {
        nodes.push(
          <div
            key={`frag-${i}`}
            className="gh-article-body"
            // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- part is a split fragment of bodyHtml, which callers already sanitize via scopeBlogHtml() before passing in (see this file's module docstring).
            dangerouslySetInnerHTML={{ __html: part }}
          />,
        );
      }
      return;
    }
    const link = bySlot.get(part);
    if (link && !used.has(part)) {
      used.add(part);
      nodes.push(
        <LinkCallout
          key={link.id}
          variant={link.type}
          heading={link.heading}
          body={link.body}
          ctaLabel={link.ctaLabel}
          href={link.href}
        />,
      );
    }
  });

  const leftovers = links.filter((l) => !l.anchorSlot || !used.has(l.anchorSlot));

  return (
    <div className="max-w-[76ch]">
      {nodes}
      {leftovers.length > 0 ? (
        <div className="mt-2">
          {leftovers.map((l) => (
            <LinkCallout
              key={l.id}
              variant={l.type}
              heading={l.heading}
              body={l.body}
              ctaLabel={l.ctaLabel}
              href={l.href}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
