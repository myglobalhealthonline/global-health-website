"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Undo, Redo, Eraser, ChevronDown } from "lucide-react";

type Props = {
  name: string;
  label: string;
  helperText?: string;
  initialValue?: string | null;
};

const COLORS = [
  { label: "Dark", value: "#1b4d3e" },
  { label: "Body", value: "#333333" },
  { label: "Muted", value: "#666666" },
  { label: "Accent", value: "#c8e6a0" },
  { label: "Blue", value: "#075985" },
  { label: "Red", value: "#dc2626" },
];

const FONT_FAMILIES = ["Georgia", "Times New Roman", "Arial", "Tahoma", "Verdana"];
const FONT_SIZES = [
  { label: "10", value: "2" },
  { label: "12", value: "3" },
  { label: "14", value: "4" },
  { label: "16", value: "5" },
  { label: "18", value: "6" },
  { label: "24", value: "7" },
];

const REMOVABLE_TAGS = new Set(["SCRIPT", "STYLE", "META", "LINK", "OBJECT", "EMBED"]);

const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "text-decoration",
  "text-align",
]);

function filterInlineStyle(styleText: string) {
  const allowed = new Map<string, string>();
  for (const chunk of styleText.split(";")) {
    const [rawProperty, ...rawValueParts] = chunk.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const value = rawValueParts.join(":").trim();
    if (!property || !value) continue;
    if (ALLOWED_STYLE_PROPS.has(property)) {
      allowed.set(property, value);
    }
  }
  return Array.from(allowed.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}

// `<font size="N">` uses HTML4 1–7 sizes. Map to CSS pixel values close to
// the dropdown's labelled sizes so the saved markup renders identically
// outside the editor.
const FONT_SIZE_ATTR_TO_PX: Record<string, string> = {
  "1": "10px",
  "2": "12px",
  "3": "14px",
  "4": "16px",
  "5": "18px",
  "6": "24px",
  "7": "32px",
};

function unwrapElement(element: HTMLElement) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function sanitizeEditorHtml(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;

  const elements = Array.from(root.querySelectorAll("*"));
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    const tag = element.tagName.toUpperCase();

    if (REMOVABLE_TAGS.has(tag)) {
      element.remove();
      continue;
    }

    if (tag === "FONT") {
      // Browsers emit `<font face|color|size>` from execCommand. Convert each
      // to inline CSS so the markup survives the strict sanitizer below.
      const face = element.getAttribute("face")?.trim();
      const color = element.getAttribute("color")?.trim();
      const sizeAttr = element.getAttribute("size")?.trim();
      const fontSizeCss = sizeAttr ? FONT_SIZE_ATTR_TO_PX[sizeAttr] : undefined;
      const existingStyle = element.getAttribute("style") ?? "";
      const nextStyle = filterInlineStyle(
        [
          existingStyle,
          face ? `font-family: ${face}` : "",
          color ? `color: ${color}` : "",
          fontSizeCss ? `font-size: ${fontSizeCss}` : "",
        ]
          .filter(Boolean)
          .join("; "),
      );
      if (nextStyle) {
        element.setAttribute("style", nextStyle);
      } else {
        element.removeAttribute("style");
      }
      element.removeAttribute("face");
      element.removeAttribute("color");
      element.removeAttribute("size");
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === "href" && tag === "A") continue;
      if (attribute.name === "style") {
        const nextStyle = filterInlineStyle(attribute.value);
        if (nextStyle) {
          element.setAttribute("style", nextStyle);
        } else {
          element.removeAttribute("style");
        }
        continue;
      }
      element.removeAttribute(attribute.name);
    }

    if (tag === "SPAN" && element.attributes.length === 0) {
      unwrapElement(element);
    }
  }

  return root.innerHTML.trim();
}

export function RichTextHtmlField({ name, label, helperText, initialValue }: Props) {
  const editorId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [color, setColor] = useState(COLORS[0].value);
  const [block, setBlock] = useState("p");
  const [font, setFont] = useState(FONT_FAMILIES[0]);
  const [size, setSize] = useState(FONT_SIZES[2].value);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!editorRef.current) return;
    const value = initialValue?.trim();
    editorRef.current.innerHTML = value ? value : "<p><br/></p>";
    syncToHidden({ rewriteEditor: true });
    // Enable inline-style mode so fontName/foreColor/etc. emit
    // `<span style="font-family: …">` rather than legacy `<font face>` tags.
    // The sanitizer still tolerates both, but inline styles render reliably
    // across every browser and survive the sanitization round-trip.
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      // Older browsers / browsers with execCommand stubs will ignore this.
    }
  }, [initialValue]);

  function syncToHidden(options?: { rewriteEditor?: boolean }) {
    if (!editorRef.current || !hiddenRef.current) return;
    const sanitized = sanitizeEditorHtml(editorRef.current.innerHTML);
    if (options?.rewriteEditor) {
      editorRef.current.innerHTML = sanitized || "<p><br/></p>";
    }
    hiddenRef.current.value = sanitized;
  }

  function rememberSelection() {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;
    selectionRef.current = range.cloneRange();
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }

  function updateActiveFormats() {
    const formats = new Set<string>();
    if (document.queryCommandState("bold")) formats.add("bold");
    if (document.queryCommandState("italic")) formats.add("italic");
    if (document.queryCommandState("underline")) formats.add("underline");
    if (document.queryCommandState("insertUnorderedList")) formats.add("insertUnorderedList");
    if (document.queryCommandState("insertOrderedList")) formats.add("insertOrderedList");
    setActiveFormats(formats);
  }

  function exec(command: string, value?: string) {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    // Only sync the hidden input. Calling `rewriteEditor: true` here would
    // replace the editor's innerHTML mid-edit and wipe the formatting the
    // browser just applied (plus collapse the cursor). The sanitizer runs
    // on blur and on save, which is when it actually matters.
    syncToHidden();
    updateActiveFormats();
    rememberSelection();
  }

  function keepEditorSelection(e: React.MouseEvent) {
    e.preventDefault();
    rememberSelection();
  }

  const iconBtn = (active: boolean) =>
    `inline-flex h-8 w-8 items-center justify-center rounded text-xs transition-colors ${
      active
        ? "bg-[var(--color-brand-primary)] text-white"
        : "bg-white text-[var(--color-text-body)] hover:bg-[var(--color-background-soft)]"
    } border border-[var(--color-border)]`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={editorId} className="gh-field-label">{label}</label>
      <div className="overflow-hidden rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2">
          <div className="relative">
            <select
              className="h-8 appearance-none rounded border border-[var(--color-border)] bg-white pl-2.5 pr-7 text-xs text-[var(--color-text-primary)] outline-none"
              value={font}
              onMouseDown={rememberSelection}
              onChange={(e) => {
                setFont(e.target.value);
                exec("fontName", e.target.value);
              }}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>
          <div className="relative">
            <select
              className="h-8 appearance-none rounded border border-[var(--color-border)] bg-white pl-2.5 pr-7 text-xs text-[var(--color-text-primary)] outline-none"
              value={size}
              onMouseDown={rememberSelection}
              onChange={(e) => {
                setSize(e.target.value);
                exec("fontSize", e.target.value);
              }}
            >
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>
          <div className="relative">
            <select
              className="h-8 appearance-none rounded border border-[var(--color-border)] bg-white pl-2.5 pr-7 text-xs text-[var(--color-text-primary)] outline-none"
              value={block}
              onMouseDown={rememberSelection}
              onChange={(e) => {
                setBlock(e.target.value);
                exec("formatBlock", e.target.value.toUpperCase());
              }}
            >
              <option value="p">Paragraph</option>
              <option value="h2">Heading</option>
              <option value="h3">Subheading</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>
          <button type="button" className={iconBtn(activeFormats.has("bold"))} onMouseDown={keepEditorSelection} onClick={() => exec("bold")} title="Bold">
            <Bold className="size-3.5" />
          </button>
          <button type="button" className={iconBtn(activeFormats.has("italic"))} onMouseDown={keepEditorSelection} onClick={() => exec("italic")} title="Italic">
            <Italic className="size-3.5" />
          </button>
          <button type="button" className={iconBtn(activeFormats.has("underline"))} onMouseDown={keepEditorSelection} onClick={() => exec("underline")} title="Underline">
            <Underline className="size-3.5" />
          </button>
          <button type="button" className={iconBtn(activeFormats.has("insertUnorderedList"))} onMouseDown={keepEditorSelection} onClick={() => exec("insertUnorderedList")} title="Bullets">
            <List className="size-3.5" />
          </button>
          <button type="button" className={iconBtn(activeFormats.has("insertOrderedList"))} onMouseDown={keepEditorSelection} onClick={() => exec("insertOrderedList")} title="Numbered">
            <ListOrdered className="size-3.5" />
          </button>
          <div className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white px-2 py-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`h-4 w-4 rounded-sm border-2 ${color === c.value ? "border-[var(--color-brand-primary)]" : "border-transparent"}`}
                style={{ backgroundColor: c.value }}
                title={c.label}
                onMouseDown={keepEditorSelection}
                onClick={() => {
                  setColor(c.value);
                  exec("foreColor", c.value);
                }}
              />
            ))}
          </div>
          <button type="button" className={iconBtn(false)} onMouseDown={keepEditorSelection} onClick={() => exec("undo")} title="Undo">
            <Undo className="size-3.5" />
          </button>
          <button type="button" className={iconBtn(false)} onMouseDown={keepEditorSelection} onClick={() => exec("redo")} title="Redo">
            <Redo className="size-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded border border-[var(--color-border)] bg-white px-2.5 text-xs font-medium text-[var(--color-text-body)] hover:bg-[var(--color-background-soft)]"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("removeFormat")}
            title="Clear formatting"
          >
            <Eraser className="mr-1 size-3.5" />
            Clear
          </button>
        </div>
        <div
          id={editorId}
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="gh-input min-h-[14rem] min-w-0 resize-y overflow-auto rounded-none border-0 bg-white p-4 leading-7 outline-none"
          style={{ listStylePosition: "inside" }}
          onInput={() => {
            syncToHidden();
            rememberSelection();
          }}
          onBlur={() => {
            syncToHidden({ rewriteEditor: true });
            rememberSelection();
          }}
          onPaste={() => {
            requestAnimationFrame(() => {
              syncToHidden({ rewriteEditor: true });
              updateActiveFormats();
              rememberSelection();
            });
          }}
          onKeyUp={() => {
            updateActiveFormats();
            rememberSelection();
          }}
          onMouseUp={() => {
            updateActiveFormats();
            rememberSelection();
          }}
        />
      </div>
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={initialValue ?? ""} />
      {helperText ? <span className="text-xs text-[var(--color-text-muted)]">{helperText}</span> : null}
    </div>
  );
}
