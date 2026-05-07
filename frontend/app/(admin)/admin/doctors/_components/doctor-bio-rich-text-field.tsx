"use client";

import { useEffect, useRef, useState } from "react";
import {
  Type,
  Eraser,
} from "lucide-react";

type Props = {
  initialValue?: string | null;
};

const COLORS = ["#111827", "#1f2937", "#2563eb", "#065f46", "#b45309", "#b91c1c", "#7c3aed"];
const FONT_FAMILIES = ["Georgia", "Times New Roman", "Arial", "Tahoma", "Verdana"];
const FONT_SIZES = [
  { label: "10", value: "2" },
  { label: "12", value: "3" },
  { label: "14", value: "4" },
  { label: "16", value: "5" },
  { label: "18", value: "6" },
];

export function DoctorBioRichTextField({ initialValue }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [block, setBlock] = useState("p");
  const [font, setFont] = useState(FONT_FAMILIES[0]);
  const [size, setSize] = useState(FONT_SIZES[1].value);

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

  function exec(command: string, value?: string) {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    syncToHidden();
  }

  const keepEditorSelection = (e: React.MouseEvent) => {
    // Prevent toolbar click from blurring contentEditable and losing caret selection.
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

  return (
    <label className="flex flex-col gap-2">
      <span className="gh-field-label">Bio</span>
      <div className="overflow-hidden rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-background-soft)] p-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-2 py-1">
            <select
              className="min-w-[9rem] bg-transparent text-xs text-[var(--color-text-primary)] outline-none"
              value={font}
              onChange={(e) => applyFont(e.target.value)}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-2 py-1">
            <select
              className="min-w-[4rem] bg-transparent text-xs text-[var(--color-text-primary)] outline-none"
              value={size}
              onChange={(e) => applySize(e.target.value)}
            >
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--color-text-muted)]">pt</span>
          </div>

          <div className="h-6 w-px bg-[var(--color-border)]" />

          <div className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-2 py-1">
            <Type className="size-4 text-[var(--color-text-muted)]" />
            <select
              className="bg-transparent text-xs text-[var(--color-text-primary)] outline-none"
              value={block}
              onChange={(e) => applyBlock(e.target.value)}
            >
              <option value="p">Paragraph</option>
              <option value="h2">Heading</option>
              <option value="h3">Subheading</option>
            </select>
          </div>

          <div className="h-6 w-px bg-[var(--color-border)]" />

          <div className="inline-flex items-center gap-1">
            <button type="button" className="gh-btn gh-btn-soft h-8 px-2 text-xs" onMouseDown={keepEditorSelection} onClick={() => exec("bold")} title="Bold">
              Bold
            </button>
            <button type="button" className="gh-btn gh-btn-soft h-8 px-2 text-xs" onMouseDown={keepEditorSelection} onClick={() => exec("italic")} title="Italic">
              Italic
            </button>
            <button type="button" className="gh-btn gh-btn-soft h-8 px-2 text-xs" onMouseDown={keepEditorSelection} onClick={() => exec("underline")} title="Underline">
              Underline
            </button>
          </div>

          <div className="h-6 w-px bg-[var(--color-border)]" />

          <div className="inline-flex items-center gap-1">
            <button type="button" className="gh-btn gh-btn-soft h-8 px-2 text-xs" onMouseDown={keepEditorSelection} onClick={() => exec("insertUnorderedList")} title="Bullet list">
              Bullets
            </button>
            <button type="button" className="gh-btn gh-btn-soft h-8 px-2 text-xs" onMouseDown={keepEditorSelection} onClick={() => exec("insertOrderedList")} title="Numbered list">
              Numbered
            </button>
          </div>

          <div className="h-6 w-px bg-[var(--color-border)]" />

          <div className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-white px-2 py-1">
            <span className="mr-1 text-xs text-[var(--color-text-muted)]">Color</span>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`h-5 w-5 rounded border ${color === c ? "border-[var(--color-text-primary)]" : "border-[var(--color-border)]"}`}
                style={{ backgroundColor: c }}
                title={c}
                onMouseDown={keepEditorSelection}
                onClick={() => {
                  setColor(c);
                  exec("foreColor", c);
                }}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-[var(--color-border)]" />

          <div className="inline-flex items-center gap-1">
            <button type="button" className="gh-btn gh-btn-soft h-8 px-2 text-xs" onMouseDown={keepEditorSelection} onClick={() => exec("undo")} title="Undo">
              Undo
            </button>
            <button type="button" className="gh-btn gh-btn-soft h-8 px-2 text-xs" onMouseDown={keepEditorSelection} onClick={() => exec("redo")} title="Redo">
              Redo
            </button>
            <button type="button" className="gh-btn gh-btn-soft h-8 px-2 text-xs" onMouseDown={keepEditorSelection} onClick={() => exec("removeFormat")} title="Clear formatting">
              <Eraser className="mr-1 size-4" /> Clear
            </button>
          </div>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="gh-input min-h-[12rem] min-w-0 resize-y overflow-auto rounded-none border-0 bg-white p-4 leading-7 outline-none"
          onInput={syncToHidden}
        />
      </div>
      <input ref={hiddenRef} type="hidden" name="bio" defaultValue={initialValue ?? ""} />
      <span className="text-xs text-[var(--color-text-muted)]">
        Select text then apply format. Supports heading, bold, italic, underline, color, bullet and numbered lists.
      </span>
    </label>
  );
}
