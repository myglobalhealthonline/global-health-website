"use client";

import { useRef, useState } from "react";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";

type Props = {
  name: string;
  initialValue?: string | null;
};

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Blog body editor: a raw-HTML textarea that can be filled by uploading
 * an .html file (or pasting markup), plus an "Upload image" button that
 * uploads a file and inserts an <img> tag at the cursor. The server
 * sanitizes the HTML on save (sanitizeRichHtml), so unsafe tags/attributes
 * are dropped regardless of what is pasted/uploaded here.
 */
export function HtmlBodyField({ name, initialValue }: Props) {
  const [value, setValue] = useState(initialValue ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleHtmlFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setValue(text);
    setFileName(file.name);
    e.target.value = "";
  }

  function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  function insertAtCursor(snippet: string) {
    const el = textareaRef.current;
    if (!el) {
      setValue((v) => `${v}\n${snippet}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    setValue(next);
    // Restore caret just after the inserted snippet.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + snippet.length;
      el.setSelectionRange(caret, caret);
    });
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      setMsg("Unsupported image type. Use JPEG, PNG, WebP, GIF or AVIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg("Image too large. Max 5 MB.");
      return;
    }
    setImgBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { key?: string; publicUrl?: string };
        message?: string;
      };
      const key = json.data?.key;
      const src = key
        ? `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`
        : json.data?.publicUrl;
      if (!res.ok || !json.ok || !src) {
        throw new Error(json.message ?? "Upload failed");
      }
      const dims = await readImageDimensions(file);
      const dimAttrs = dims ? ` width="${dims.width}" height="${dims.height}"` : "";
      // Alt text is content, not markup — the admin authoring it knows
      // whether the image is decorative (blank alt) or needs a description,
      // so ask rather than always shipping an empty alt attribute.
      const alt = (window.prompt("Alt text for this image (leave blank if purely decorative):", "") ?? "").replace(/"/g, "&quot;");
      insertAtCursor(`\n<img src="${src}" alt="${alt}"${dimAttrs} />\n`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setImgBusy(false);
    }
  }

  return (
    <div className="gh-admin-html-editor">
      <div className="gh-admin-html-editor-toolbar">
        <button
          type="button"
          onClick={() => htmlInputRef.current?.click()}
          className="gh-btn gh-btn-soft text-portal-compact"
        >
          Upload .html file
        </button>
        <input
          ref={htmlInputRef}
          type="file"
          accept=".html,.htm,text/html"
          className="hidden"
          onChange={handleHtmlFile}
        />
        <button
          type="button"
          disabled={imgBusy}
          onClick={() => imageInputRef.current?.click()}
          className="gh-btn gh-btn-soft text-portal-compact disabled:opacity-60"
        >
          {imgBusy ? "Uploading…" : "Upload image"}
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={handleImageFile}
        />
        {fileName ? (
          <span className="text-portal-meta text-[var(--color-text-muted)]">Loaded: {fileName}</span>
        ) : null}
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="gh-btn gh-btn-soft gh-admin-html-editor-preview-toggle text-portal-compact"
        >
          {showPreview ? "Hide preview" : "Preview"}
        </button>
      </div>

      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={18}
        spellCheck={false}
        placeholder="Paste your article HTML here, upload a .html file, or use 'Upload image' to insert pictures. Allowed: headings, paragraphs, lists, links, images, tables, blockquotes."
        className="gh-admin-html-editor-textarea w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 font-mono text-portal-compact leading-relaxed text-[var(--color-text-primary)]"
      />
      {msg ? (
        <p className="text-portal-meta text-[var(--color-status-warning-text)]">{msg}</p>
      ) : null}
      <p className="text-portal-meta text-[var(--color-text-muted)]">
        HTML is sanitized on save — scripts, iframes and event handlers are
        removed automatically.
      </p>

      {showPreview ? (
        <div className="gh-admin-html-editor-preview rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] p-4">
          {/* Matches how the public article will render. */}
          <div
            className="gh-article-body"
            // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- scopeBlogHtml() runs sanitize-html with a controlled allowlist (frontend/lib/content/scope-blog-html.ts) before this renders; mirrors the backend's own sanitizeBlogHtml allowlist.
            dangerouslySetInnerHTML={{ __html: scopeBlogHtml(value) }}
          />
        </div>
      ) : null}
    </div>
  );
}
