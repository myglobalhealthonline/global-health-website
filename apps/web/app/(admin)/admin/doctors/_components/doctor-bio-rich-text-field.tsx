"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo,
  Redo,
  Eraser,
  ChevronDown,
} from "lucide-react";

type Props = {
  initialValue?: string | null;
};

/* Theme palette colours */
const COLORS = [
  { label: "Dark", value: "#1b4d3e" },      // brand primary
  { label: "Body", value: "#333333" },      // text body
  { label: "Muted", value: "#666666" },     // text muted
  { label: "Accent", value: "#c8e6a0" },    // brand accent
  { label: "Error", value: "#dc2626" },     // status error
  { label: "Info", value: "#075985" },      // status info
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

export function DoctorBioRichTextField({ initialValue }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [color, setColor] = useState(COLORS[0].value);
  const [block, setBlock] = useState("p");
  const [font, setFont] = useState(FONT_FAMILIES[0]);
  const [size, setSize] = useState(FONT_SIZES[2].value);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  useEffect(() => {
    const value = initialValue?.trim();
    if (!editorRef.current) return;
    if (!value) {
      editorRef.current.innerHTML = "<p><br/></p>";
      return;
    }
    editorRef.current.innerHTML = value;
  }, [initialValue]);

  function syncToHidden() {
    if (!editorRef.current || !hiddenRef.current) return;
    hiddenRef.current.value = editorRef.current.innerHTML.trim();
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
    document.execCommand(command, false, value);
    syncToHidden();
    updateActiveFormats();
  }

  const keepEditorSelection = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  function applyBlock(next: string) {
    setBlock(next);
    exec("formatBlock", next.toUpperCase());
  }

  function applyFont(next: string) {
    setFont(next);
    exec("fontName", next);
  }

  function applySize(next: string) {
    setSize(next);
    exec("fontSize", next);
  }

  const toolbarBtn = (active: boolean) =>
    `inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-medium transition-colors ${
      active
        ? "bg-[var(--color-brand-primary)] text-white"
        : "bg-white text-[var(--color-text-body)] hover:bg-[var(--color-background-soft)]"
    } border border-[var(--color-border)]`;

  const iconBtn = (active: boolean) =>
    `inline-flex h-8 w-8 items-center justify-center rounded text-xs transition-colors ${
      active
        ? "bg-[var(--color-brand-primary)] text-white"
        : "bg-white text-[var(--color-text-body)] hover:bg-[var(--color-background-soft)]"
    } border border-[var(--color-border)]`;

  return (
    <label className="flex flex-col gap-2">
      <span className="gh-field-label">Bio</span>
      <div className="overflow-hidden rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2">
          {/* Font family */}
          <div className="relative">
            <select
              className="h-8 appearance-none rounded border border-[var(--color-border)] bg-white pl-2.5 pr-7 text-xs text-[var(--color-text-primary)] outline-none"
              value={font}
              onChange={(e) => applyFont(e.target.value)}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>

          {/* Font size */}
          <div className="relative">
            <select
              className="h-8 appearance-none rounded border border-[var(--color-border)] bg-white pl-2.5 pr-7 text-xs text-[var(--color-text-primary)] outline-none"
              value={size}
              onChange={(e) => applySize(e.target.value)}
            >
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <span className="pointer-events-none absolute -right-5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)]">pt</span>
          </div>

          <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

          {/* Block type */}
          <div className="relative">
            <select
              className="h-8 appearance-none rounded border border-[var(--color-border)] bg-white pl-2.5 pr-7 text-xs text-[var(--color-text-primary)] outline-none"
              value={block}
              onChange={(e) => applyBlock(e.target.value)}
            >
              <option value="p">Paragraph</option>
              <option value="h2">Heading</option>
              <option value="h3">Subheading</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>

          <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

          {/* Formatting */}
          <button type="button" className={iconBtn(activeFormats.has("bold"))} onMouseDown={keepEditorSelection} onClick={() => exec("bold")} title="Bold">
            <Bold className="size-3.5" />
          </button>
          <button type="button" className={iconBtn(activeFormats.has("italic"))} onMouseDown={keepEditorSelection} onClick={() => exec("italic")} title="Italic">
            <Italic className="size-3.5" />
          </button>
          <button type="button" className={iconBtn(activeFormats.has("underline"))} onMouseDown={keepEditorSelection} onClick={() => exec("underline")} title="Underline">
            <Underline className="size-3.5" />
          </button>

          <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

          {/* Lists */}
          <button type="button" className={iconBtn(activeFormats.has("insertUnorderedList"))} onMouseDown={keepEditorSelection} onClick={() => exec("insertUnorderedList")} title="Bullet list">
            <List className="size-3.5" />
          </button>
          <button type="button" className={iconBtn(activeFormats.has("insertOrderedList"))} onMouseDown={keepEditorSelection} onClick={() => exec("insertOrderedList")} title="Numbered list">
            <ListOrdered className="size-3.5" />
          </button>

          <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

          {/* Color */}
          <div className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white px-2 py-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Color</span>
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`h-4 w-4 rounded-sm border-2 transition-all ${
                  color === c.value
                    ? "border-[var(--color-brand-primary)] scale-110"
                    : "border-transparent hover:scale-105"
                }`}
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

          <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

          {/* Undo / Redo / Clear */}
          <button type="button" className={iconBtn(false)} onMouseDown={keepEditorSelection} onClick={() => exec("undo")} title="Undo">
            <Undo className="size-3.5" />
          </button>
          <button type="button" className={iconBtn(false)} onMouseDown={keepEditorSelection} onClick={() => exec("redo")} title="Redo">
            <Redo className="size-3.5" />
          </button>
          <button type="button" className={toolbarBtn(false)} onMouseDown={keepEditorSelection} onClick={() => exec("removeFormat")} title="Clear formatting">
            <Eraser className="size-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="gh-input min-h-[12rem] min-w-0 resize-y overflow-auto rounded-none border-0 bg-white p-4 leading-7 outline-none"
          style={{
            /* Ensure lists render properly inside contentEditable */
            listStylePosition: "inside",
          }}
          onInput={syncToHidden}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
        />
      </div>
      <input ref={hiddenRef} type="hidden" name="bio" defaultValue={initialValue ?? ""} />
      <span className="text-xs text-[var(--color-text-muted)]">
        Select text then apply format. Supports heading, bold, italic, underline, color, bullet and numbered lists.
      </span>
    </label>
  );
}
