const EM_DASH = /\s*—\s*/g;
const PAIRED_PROSE_ASIDE = /\s+—\s+([^—.!?]{1,180}?)\s+—\s+/g;

// Words that normally continue the same sentence after an aside. This covers
// the six Ireland locales and keeps phrases such as “the next steps, including
// referrals” from being split into sentence fragments.
const CONTINUATION = /^(?:and|but|or|so|yet|because|while|where|when|which|who|what|that|including|such as|especially|with|without|from|e|mas|ou|porque|enquanto|onde|quando|que|o que|incluindo|como|especialmente|com|sem|y|pero|o|mientras|donde|cuando|lo que|incluyendo|con|sin|și|dar|sau|pentru că|în timp ce|unde|când|care|ce|inclusiv|cum|cu|fără|a|ale|nebo|protože|zatímco|kde|když|který|co|včetně|jako|s|se|bez|und|aber|oder|weil|während|wo|wenn|die|der|das|was|einschließlich|wie|mit|ohne)\b/iu;
const LABEL_CONTINUATION = /^(?:and|but|or|yet|e|mas|ou|y|pero|o|și|dar|sau|a|ale|nebo|und|aber|oder)\b/iu;
const HEADING_CONTINUATION = /^(?:and|or|e|ou|y|o|și|sau|a|ale|nebo|und|oder)\b/iu;
const HUMANIZATION_ARTIFACT = /\.\s+(?:Making\b|Tornando(?:-se|-a|-o)?\b|Three of\b|One of\b|Tři z\b|Drei der\b|PSI registration number\b|IMC (?:registration )?number\b|Registration number\b|Número de registo\b|Número de registro\b|Registrační číslo\b|Numărul de înregistrare\b)/iu;

type NullableText = string | null;

function replacePairedAsides(value: string): string {
  return value.replace(PAIRED_PROSE_ASIDE, ", $1, ");
}

function normalizeDashes(value: string): string {
  return value.replaceAll("&mdash;", "—");
}

export function hasIrelandHumanizationArtifact(value: unknown): boolean {
  return typeof value === "string" && HUMANIZATION_ARTIFACT.test(value);
}

function lowerCaseFirst(value: string): string {
  return value.replace(/\p{L}/u, (letter) => letter.toLocaleLowerCase());
}

function repairHumanizationArtifacts(value: string): string {
  return value.replace(
    /\.\s+(Making\b|Tornando(?:-se|-a|-o)?\b|Three of\b|One of\b|Tři z\b|Drei der\b|PSI registration number\b|IMC (?:registration )?number\b|Registration number\b|Número de registo\b|Número de registro\b|Registrační číslo\b|Numărul de înregistrare\b)/giu,
    (_match, lead: string) => {
      const gerund = /^(?:Making|Tornando)/iu.test(lead);
      const repairedLead = /^(?:PSI|IMC)\b/u.test(lead) ? lead : lowerCaseFirst(lead);
      return `${gerund ? "," : ":"} ${repairedLead}`;
    },
  );
}

function splitDashParts(value: string): string[] {
  return normalizeDashes(value).split(EM_DASH).map((part) => part.trim());
}

function replaceRemainingDashes(value: string, mode: "prose" | "label"): string {
  const parts = value.split(EM_DASH);
  return parts.slice(1).reduce((result, part) => {
    const right = part.trimStart();
    if (!right) return result;
    const continuation = mode === "label" ? LABEL_CONTINUATION : CONTINUATION;
    if (continuation.test(right)) return `${result}, ${right}`;
    return `${result}: ${right}`;
  }, parts[0]);
}

export function humanizeIrelandProse(value: NullableText): NullableText {
  if (value === null) return null;
  return repairHumanizationArtifacts(
    replaceRemainingDashes(replacePairedAsides(normalizeDashes(value)), "prose"),
  );
}

export function humanizeIrelandLabel(value: NullableText): NullableText {
  if (value === null) return null;
  return replaceRemainingDashes(normalizeDashes(value), "label");
}

export function humanizeIrelandTitle(value: NullableText): NullableText {
  if (value === null) return null;
  return normalizeDashes(value).replace(EM_DASH, " | ");
}

function humanizeIrelandHeading(value: NullableText): NullableText {
  if (value === null) return null;
  const parts = splitDashParts(value).filter(Boolean);
  if (parts.length <= 1) return normalizeDashes(value);
  if (parts.length === 2) {
    const [left, right] = parts;
    return HEADING_CONTINUATION.test(right) ? `${left} ${right}` : `${left}: ${right}`;
  }
  const [left, middle, right] = parts;
  if (CONTINUATION.test(middle)) return `${left}, ${middle}, ${right}`;
  return CONTINUATION.test(right) ? `${left}: ${middle}, ${right}` : `${left}: ${middle}: ${right}`;
}

function humanizeIrelandListItem(value: NullableText): NullableText {
  if (value === null) return null;
  const parts = splitDashParts(value).filter(Boolean);
  if (parts.length <= 1) return normalizeDashes(value);
  if (parts.length === 2) {
    const [left, right] = parts;
    return LABEL_CONTINUATION.test(right) ? `${left}, ${right}` : `${left}: ${right}`;
  }
  const [left, middle, right] = parts;
  if (CONTINUATION.test(middle)) return `${left}, ${middle}, ${right}`;
  return `${left}: ${middle}, ${right}`;
}

const HEADING_ELEMENTS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const LIST_ELEMENTS = new Set(["li", "dt", "dd"]);

/**
 * Rewrites only text nodes. Tags and attributes stay byte-for-byte intact.
 * Headings and list rows use a colon. Paragraph copy uses commas for paired
 * asides and continuations, and a colon for explanatory breaks.
 */
export function humanizeIrelandHtml(value: NullableText): NullableText {
  if (value === null) return null;

  const stack: string[] = [];
  return value
    .split(/(<[^>]+>)/g)
    .map((token) => {
      if (!token.startsWith("<")) {
        const normalized = normalizeDashes(token);
        const parent = stack.at(-1);
        if (HEADING_ELEMENTS.has(parent ?? "")) return humanizeIrelandHeading(normalized);
        if (LIST_ELEMENTS.has(parent ?? "")) return humanizeIrelandListItem(normalized);
        return humanizeIrelandProse(normalized);
      }

      const closing = token.match(/^<\s*\/\s*([a-z0-9]+)/i);
      if (closing) {
        const name = closing[1].toLowerCase();
        const index = stack.lastIndexOf(name);
        if (index >= 0) stack.splice(index, 1);
        return token;
      }

      const opening = token.match(/^<\s*([a-z0-9]+)/i);
      if (opening && !token.match(/\/\s*>$/)) stack.push(opening[1].toLowerCase());
      return token;
    })
    .join("");
}

const LABEL_JSON_KEYS = new Set([
  "title",
  "heading",
  "label",
  "question",
  "name",
]);

export function humanizeIrelandJson(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    return LABEL_JSON_KEYS.has(key ?? "")
      ? humanizeIrelandLabel(value)
      : humanizeIrelandProse(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => humanizeIrelandJson(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        humanizeIrelandJson(entryValue, entryKey),
      ]),
    );
  }
  return value;
}
