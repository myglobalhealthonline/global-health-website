"use client";

import { useCallback, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { focalStyle } from "./doctor-photo";

export type FocalValue = { focalX: number; focalY: number; zoom: number };

const DEFAULT_FOCAL: FocalValue = { focalX: 50, focalY: 50, zoom: 1 };

/**
 * Shared focal-point + zoom picker for a doctor profile photo. Renders
 * inside admin and doctor-portal dialogs — pointer-driven crop frame,
 * a zoom slider, and three live previews (card / profile / avatar ratios)
 * so the doctor can see exactly how the crop lands everywhere it's used.
 *
 * Styling reuses portal primitives (gh-btn, gh-input) plus a small
 * `.gh-focal-*` block in app/portal.css for the drag frame + slider.
 */
export function FocalPointEditor({
  src,
  focalX,
  focalY,
  zoom,
  onChange,
}: {
  src: string;
  focalX: number;
  focalY: number;
  zoom: number;
  onChange: (value: FocalValue) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      onChange({
        focalX: clamp(x),
        focalY: clamp(y),
        zoom,
      });
    },
    [onChange, zoom],
  );

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    updateFromPointer(e.clientX, e.clientY);
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function nudge(dx: number, dy: number) {
    onChange({ focalX: clamp(focalX + dx), focalY: clamp(focalY + dy), zoom });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = 2;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        nudge(-step, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        nudge(step, 0);
        break;
      case "ArrowUp":
        e.preventDefault();
        nudge(0, -step);
        break;
      case "ArrowDown":
        e.preventDefault();
        nudge(0, step);
        break;
    }
  }

  const style = focalStyle(focalX, focalY, zoom);

  return (
    <div className="gh-focal-editor flex flex-col gap-4">
      <div className="gh-focal-editor-main-wrap flex flex-col gap-3 sm:flex-row">
        {/* Draggable crop frame — card ratio, the primary editing surface. */}
        <div
          ref={frameRef}
          role="slider"
          tabIndex={0}
          aria-label="Photo focal point — drag or use arrow keys to reposition"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(focalX)}
          aria-valuetext={`${Math.round(focalX)}%, ${Math.round(focalY)}%`}
          className="gh-focal-editor-frame relative shrink-0 overflow-hidden"
          style={{ aspectRatio: "1 / 1.1", width: "100%", maxWidth: 280, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }} />
          <div className="gh-focal-editor-crosshair" aria-hidden style={{ left: `${focalX}%`, top: `${focalY}%` }} />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => onChange({ focalX, focalY, zoom: Number(e.target.value) })}
              className="gh-focal-editor-zoom w-full"
            />
          </label>

          {/* Directional nudge cluster — keyboard-free way to fine-tune on touch. */}
          <div className="gh-focal-editor-dpad grid w-fit grid-cols-3 gap-1">
            <span />
            <button type="button" className="gh-btn gh-btn-soft" aria-label="Move up" onClick={() => nudge(0, -2)}>↑</button>
            <span />
            <button type="button" className="gh-btn gh-btn-soft" aria-label="Move left" onClick={() => nudge(-2, 0)}>←</button>
            <button type="button" className="gh-btn gh-btn-soft" aria-label="Move down" onClick={() => nudge(0, 2)}>↓</button>
            <button type="button" className="gh-btn gh-btn-soft" aria-label="Move right" onClick={() => nudge(2, 0)}>→</button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="gh-btn gh-btn-ghost"
              onClick={() => onChange(DEFAULT_FOCAL)}
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Live previews — same img, three ratios that mirror the real render sites. */}
      <div className="gh-focal-editor-previews flex flex-wrap gap-4">
        <PreviewTile label="Card" ratio="1 / 1.1" src={src} style={style} />
        <PreviewTile label="Profile" ratio="2 / 3" src={src} style={style} />
        <PreviewTile label="Avatar" ratio="1 / 1" round src={src} style={style} />
      </div>
    </div>
  );
}

function PreviewTile({
  label,
  ratio,
  round = false,
  src,
  style,
}: {
  label: string;
  ratio: string;
  round?: boolean;
  src: string;
  style: React.CSSProperties;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="gh-focal-editor-preview overflow-hidden"
        style={{ aspectRatio: ratio, width: 88, borderRadius: round ? "9999px" : "10px" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" style={{ width: "100%", height: "100%", ...style }} />
      </div>
      <span className="text-portal-thead text-[var(--portal-muted)]">{label}</span>
    </div>
  );
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n));
}
