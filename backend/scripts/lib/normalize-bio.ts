/**
 * Doctor-bio normalizer.
 *
 * Two jobs, both deterministic:
 *
 *  1. STRUCTURE — turn whatever is in the DB (plain text with blank lines and
 *     "•" bullets, or paste-damaged HTML) into the small HTML vocabulary the
 *     public profile renders: <p>, <h3>, <ul>/<li>, <strong>, <em>, <br>.
 *  2. PUNCTUATION — remove em/en dashes, which read as machine-written copy.
 *     " — " becomes ". ", ", " or ": " depending on what follows.
 *
 * Idempotent: running it on already-normalized HTML returns the same string.
 * `scripts/lib/normalize-bio.test.ts` is the self-check.
 */

const BULLET = /^[•·▪‣*]\s+/;
/** Marks a line that came from a real <h2>/<h3>, which has no trailing colon. */
const HEADING_MARK = "";
/** Words that cannot end a sentence, so a following dash is not a full stop. */
const NON_TERMINAL = new Set([
  "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "from", "by",
  "including", "such", "as", "the", "a", "an", "e", "y", "o", "de", "da", "do",
  "em", "com", "para", "que", "a", "no", "na", "und", "oder", "mit", "von",
  "und", "che", "si", "la", "el", "los", "las", "des", "der", "die", "das",
]);

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function wordCount(s: string): number {
  return stripTags(s).trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Replace em/en dashes with ordinary punctuation.
 *
 * - `1990–1995` (digits both sides)            -> hyphen
 * - paired dashes wrapping a short aside       -> commas
 * - dash followed by a capitalised new clause  -> full stop
 * - anything else                              -> comma
 */
export function fixDashes(line: string): string {
  let out = line
    // numeric ranges keep a hyphen
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1-$2")
    // compound names ("Cavan–Monaghan", "lékař–pacient") keep a hyphen
    .replace(/(\p{L})[—–](\p{L})/gu, "$1-$2")
    // a dash opening a line is decoration
    .replace(/^\s*[—–]\s*/, "")
    // everything left is a clause separator; give it the canonical spacing so
    // the pass below sees every one of them
    .replace(/\s*[—–]\s*/g, " — ");

  const DASH = /\s*[—–]\s+/g;
  const positions: Array<{ start: number; end: number }> = [];
  for (const m of out.matchAll(DASH)) {
    positions.push({ start: m.index!, end: m.index! + m[0].length });
  }
  if (positions.length === 0) return tidyPunctuation(out);

  // Paired dashes close together wrap a parenthetical aside: both become commas.
  const paired = new Set<number>();
  for (let i = 0; i + 1 < positions.length; i += 1) {
    const gap = positions[i + 1].start - positions[i].end;
    if (gap > 0 && gap < 90) {
      paired.add(i);
      paired.add(i + 1);
    }
  }

  let result = "";
  let cursor = 0;
  positions.forEach((pos, index) => {
    const before = out.slice(cursor, pos.start);
    const after = out.slice(pos.end);
    result += before;

    const lastWord = (stripTags(before).trim().split(/\s+/).pop() ?? "").toLowerCase().replace(/[^\p{L}]/gu, "");
    const nextChar = stripTags(after).trimStart().charAt(0);
    const nextClause = stripTags(after).split(/[.;:!?]|\s[—–]\s/)[0] ?? "";

    let replacement: string;
    if (paired.has(index)) {
      replacement = ", ";
    } else if (
      /\p{Lu}/u.test(nextChar) &&
      !NON_TERMINAL.has(lastWord) &&
      wordCount(nextClause) >= 4 &&
      wordCount(before) >= 4
    ) {
      replacement = ". ";
    } else {
      replacement = ", ";
    }

    // Never stack punctuation: "care, — one" / "care: — one".
    if (/[,;:.]\s*$/.test(before)) replacement = " ";
    result += replacement;
    cursor = pos.end;
  });
  result += out.slice(cursor);

  // Any dash left (no trailing space, e.g. "word—word") becomes a comma.
  result = result.replace(/\s*[—–]\s*/g, ", ");
  return tidyPunctuation(result);
}

function tidyPunctuation(s: string): string {
  return s
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
    .replace(/:\s*,/g, ":")
    .replace(/[ \t]{2,}/g, " ")
    .trimEnd();
}

/** "Acute illness — fever, flu" -> "<strong>Acute illness:</strong> fever, flu" */
function bulletToHtml(text: string): string {
  const m = text.match(/^([^—–:]{3,70})\s*[—–:]\s+(.*)$/s);
  if (m && wordCount(m[1]) <= 9) {
    const label = fixDashes(m[1].trim().replace(/[:.]$/, ""));
    const rest = fixDashes(m[2].trim());
    return `<li><strong>${label}:</strong> ${rest}</li>`;
  }
  return `<li>${fixDashes(text)}</li>`;
}

function isHeading(text: string): boolean {
  if (text.startsWith(HEADING_MARK)) return true;
  const plain = stripTags(text).trim();
  return plain.length > 0 && plain.length < 90 && plain.endsWith(":") && wordCount(plain) <= 12;
}

/** Build HTML from lines that carry only inline markup. */
function linesToHtml(lines: string[]): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(`<ul>${list.join("")}</ul>`);
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || stripTags(line).trim() === "") continue;

    if (BULLET.test(stripTags(line))) {
      list.push(bulletToHtml(line.replace(/^(<[^>]+>)*\s*[•·▪‣*]\s+/, "$1")));
      continue;
    }
    flush();

    if (isHeading(line)) {
      const heading = fixDashes(
        stripTags(line.replace(HEADING_MARK, "")).trim().replace(/:$/, ""),
      );
      out.push(`<h3>${heading}</h3>`);
      continue;
    }
    out.push(`<p>${fixDashes(line)}</p>`);
  }
  flush();
  return out.join("");
}

/** Paste junk removal: colours, empty paragraphs, <b>/<i>, &nbsp;, bare spans. */
function cleanInlineHtml(html: string): string {
  return html
    .replace(/<\/?(?:font|o:p)[^>]*>/gi, "")
    .replace(/\s(?:style|class|id|lang|dir|data-[\w-]+)\s*=\s*"[^"]*"/gi, "")
    .replace(/\s(?:style|class|id|lang|dir|data-[\w-]+)\s*=\s*'[^']*'/gi, "")
    .replace(/<span\s*>/gi, "")
    .replace(/<\/span>/gi, "")
    .replace(/<(\/?)b>/gi, "<$1strong>")
    .replace(/<(\/?)i>/gi, "<$1em>")
    .replace(/&nbsp;/gi, " ")
    .replace(/<p>(?:\s|<br\s*\/?>)*<\/p>/gi, "");
}

/**
 * Normalize one bio value. Returns HTML built from <p>, <h3>, <ul>/<li> and
 * whatever inline <strong>/<em>/<a> the original carried.
 */
export function normalizeBio(input: string): string {
  if (!input || !input.trim()) return "";

  let html = input;
  const hasTags = /<[a-z][^>]*>/i.test(html);

  if (hasTags) {
    html = cleanInlineHtml(html);
    // Block boundaries become newlines so the line walker sees one line per
    // paragraph / list item / heading.
    html = html
      .replace(/<\/(?:p|h[1-6]|div|li)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<(?:p|div)[^>]*>/gi, "\n")
      // A real heading tag keeps its identity through a sentinel, so a bio that
      // has already been normalized round-trips unchanged.
      .replace(/<h[1-6][^>]*>/gi, `\n${HEADING_MARK}`)
      .replace(/<\/?(?:ul|ol)[^>]*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n");
  }

  const lines = html
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim() !== "");

  return linesToHtml(lines);
}
