import type { ReactNode } from "react";

/**
 * Markdown-lite renderer for clinical note bodies.
 *
 * Consultation notes are authored (and AI-scribed) as light Markdown —
 * `## Motivo da Consulta:`, `- Realizada Meta 1`, `**bold**` — but they
 * were being rendered as raw text in a `white-space: pre-wrap` block, so
 * readers saw the literal `##` and `-` markers.
 *
 * This is deliberately NOT a full Markdown engine: the note is untrusted
 * clinician input rendered on a public share URL, so everything here
 * produces React text nodes (never `dangerouslySetInnerHTML`), and any
 * syntax it doesn't recognise falls through as plain text rather than
 * being dropped. Supported: ATX headings, unordered/ordered lists,
 * blockquotes, horizontal rules, and inline bold / italic / code.
 *
 * Class names are plain strings so the caller owns all styling — the
 * share and print sheets are standalone documents that don't load
 * portal.css.
 */

type Props = {
  body: string | null | undefined;
  /** Prefix for the emitted class names, e.g. "vk" -> `.vk-note-h2`. */
  prefix?: string;
};

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "rule" }
  | { kind: "para"; lines: string[] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;

/** Group raw lines into blocks. Blank lines close the current block. */
function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let open: Block | null = null;
  const close = () => {
    if (open) blocks.push(open);
    open = null;
  };

  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      close();
      continue;
    }
    // A rule looks like a bullet (`- - -`), so it has to be tested first.
    if (RULE.test(line)) {
      close();
      blocks.push({ kind: "rule" });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      close();
      // Trailing `##` of a closed ATX heading is decoration, not content.
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        text: heading[2].replace(/\s*#+\s*$/, "").trim(),
      });
      continue;
    }
    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    if (bullet || ordered) {
      const isOrdered = !bullet;
      const item = (bullet ? bullet[1] : ordered![1]).trim();
      if (open?.kind === "list" && open.ordered === isOrdered) {
        open.items.push(item);
      } else {
        close();
        open = { kind: "list", ordered: isOrdered, items: [item] };
      }
      continue;
    }
    const quote = QUOTE.exec(line);
    if (quote) {
      if (open?.kind === "quote") open.lines.push(quote[1]);
      else {
        close();
        open = { kind: "quote", lines: [quote[1]] };
      }
      continue;
    }
    if (open?.kind === "para") open.lines.push(line);
    else {
      close();
      open = { kind: "para", lines: [line] };
    }
  }
  close();
  return blocks;
}

/**
 * Emphasis spans must open and close tight against their text. Clinical
 * notes are full of loose asterisks ("70 * 2", "dose ** revisar"), and a
 * lazy `\*[^*]+\*` swallowed the text between two unrelated ones.
 */
const INLINE =
  /(\*\*(?![\s*])[^*\n]+?(?<![\s*])\*\*|__(?![\s_])[^_\n]+?(?<![\s_])__|\*(?![\s*])[^*\n]+?(?<![\s*])\*|`[^`\n]+`)/g;

/** Inline bold / italic / code. Unmatched markers stay as literal text. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let index = 0;
  for (const part of text.split(INLINE)) {
    if (part === "") continue;
    const key = `${keyBase}-${index++}`;
    if (
      (part.startsWith("**") && part.endsWith("**") && part.length > 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length > 4)
    ) {
      out.push(<strong key={key}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      out.push(<code key={key}>{part.slice(1, -1)}</code>);
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      out.push(<em key={key}>{part.slice(1, -1)}</em>);
    } else {
      // Plain segment: a bare string, so the markup carries no wrapper
      // element (React does not need a key for a string child).
      out.push(part);
    }
  }
  return out;
}

/** Soft line breaks inside a paragraph/quote are meaningful in a note. */
function renderLines(lines: string[], keyBase: string): ReactNode[] {
  return lines.flatMap((line, i) => {
    const nodes = renderInline(line, `${keyBase}-${i}`);
    return i === 0 ? nodes : [<br key={`${keyBase}-br-${i}`} />, ...nodes];
  });
}

export function ClinicalNoteBody({ body, prefix = "note" }: Props) {
  if (!body || body.trim() === "") return null;
  const blocks = parseBlocks(body);

  return (
    <div className={`${prefix}-body`}>
      {blocks.map((block, i) => {
        const key = `b-${i}`;
        switch (block.kind) {
          case "heading": {
            // Note headings sit under the section's own <h2>, so they start
            // at h3 and never outrank the sheet's document outline.
            const level = Math.min(block.level + 2, 6);
            const Tag = `h${level}` as "h3" | "h4" | "h5" | "h6";
            return (
              <Tag key={key} className={`${prefix}-h${Math.min(block.level, 3)}`}>
                {renderInline(block.text, key)}
              </Tag>
            );
          }
          case "list": {
            const items = block.items.map((item, j) => (
              <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
            ));
            return block.ordered ? (
              <ol key={key} className={`${prefix}-ol`}>
                {items}
              </ol>
            ) : (
              <ul key={key} className={`${prefix}-ul`}>
                {items}
              </ul>
            );
          }
          case "quote":
            return (
              <blockquote key={key} className={`${prefix}-quote`}>
                {renderLines(block.lines, key)}
              </blockquote>
            );
          case "rule":
            return <hr key={key} className={`${prefix}-rule`} />;
          case "para":
            return (
              <p key={key} className={`${prefix}-p`}>
                {renderLines(block.lines, key)}
              </p>
            );
        }
      })}
    </div>
  );
}
