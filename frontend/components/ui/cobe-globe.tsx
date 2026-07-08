"use client";

import { memo, useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import createGlobe from "cobe";

// Module-level so the default color arrays keep a stable identity across
// renders. Declared inline as default params they were re-allocated every
// render, changing the init effect's deps and destroying+recreating the
// WebGL globe on every parent re-render (e.g. each keystroke in the
// entry-gate country search).
const DEFAULT_MARKER_COLOR: [number, number, number] = [0.69, 0.95, 0.13];
const DEFAULT_BASE_COLOR: [number, number, number] = [0.08, 0.23, 0.18];
const DEFAULT_ARC_COLOR: [number, number, number] = [0.69, 0.95, 0.13];
const DEFAULT_GLOW_COLOR: [number, number, number] = [0.08, 0.22, 0.17];

export type GlobeMarker = {
  id: string;
  location: [number, number];
  label: string;
  flagCode?: string;
};

export type GlobeArc = {
  id: string;
  from: [number, number];
  to: [number, number];
};

type GlobeProps = {
  markers?: GlobeMarker[];
  arcs?: GlobeArc[];
  className?: string;
  markerColor?: [number, number, number];
  baseColor?: [number, number, number];
  arcColor?: [number, number, number];
  glowColor?: [number, number, number];
  dark?: number;
  mapBrightness?: number;
  markerSize?: number;
  markerElevation?: number;
  arcWidth?: number;
  arcHeight?: number;
  speed?: number;
  initialPhi?: number;
  theta?: number;
  diffuse?: number;
  mapSamples?: number;
  scale?: number;
};

type AnchorStyle = CSSProperties & {
  positionAnchor?: string;
};

function GlobeBase({
  markers = [],
  arcs = [],
  className = "",
  markerColor = DEFAULT_MARKER_COLOR,
  baseColor = DEFAULT_BASE_COLOR,
  arcColor = DEFAULT_ARC_COLOR,
  glowColor = DEFAULT_GLOW_COLOR,
  dark = 0.92,
  mapBrightness = 5.8,
  markerSize = 0.045,
  markerElevation = 0.035,
  arcWidth = 0.55,
  arcHeight = 0.32,
  speed = 0.003,
  initialPhi = 0,
  theta = 0.25,
  diffuse = 1.5,
  mapSamples = 16000,
  scale = 1,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const velocity = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  // Independent pause reasons — dragging, off-screen, and tab-hidden can
  // overlap (e.g. drag ends while the tab is still hidden), so a single
  // boolean would let one reason's "resume" incorrectly cancel another's
  // still-active pause.
  const pauseFlags = useRef({ drag: false, offscreen: false, hidden: false });
  const isPaused = useCallback(
    () => pauseFlags.current.drag || pauseFlags.current.offscreen || pauseFlags.current.hidden,
    [],
  );
  const reducedMotionRef = useRef(false);
  const lowPowerRef = useRef(false);
  // Set by the render loop so init() can restart it (e.g. resuming from
  // reduced-motion's single static frame) without a second effect dependency.
  const requestRenderRef = useRef<(() => void) | null>(null);
  // mapSamples can only be set at cobe instance creation, not per-frame — so
  // dropping resolution while dragging means destroying + recreating the
  // instance at the same phi/theta (no visual jump), not a per-frame tweak.
  const setQualityRef = useRef<((low: boolean) => void) | null>(null);
  const restoreQualityTimeout = useRef<number | undefined>(undefined);

  const cobeMarkers = useMemo(
    () =>
      markers.map((m) => ({
        id: m.id,
        location: m.location,
        size: markerSize,
      })),
    [markerSize, markers],
  );

  const cobeArcs = useMemo(
    () =>
      arcs.map((a) => ({
        id: a.id,
        from: a.from,
        to: a.to,
      })),
    [arcs],
  );

  const handlePointerDown = useCallback((e: PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    pauseFlags.current.drag = true;
    // Cancel any pending restore-to-full-quality from a previous drag so
    // back-to-back drags don't fight a mid-drag quality swap.
    if (restoreQualityTimeout.current !== undefined) {
      window.clearTimeout(restoreQualityTimeout.current);
      restoreQualityTimeout.current = undefined;
    }
    setQualityRef.current?.(true);
    // Reduced-motion normally stops the rAF loop entirely between
    // interactions (see the render loop below) — restart it so dragging
    // still tracks the pointer smoothly. No-op once the loop is running.
    requestRenderRef.current?.();
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!pointerInteracting.current) return;
    const deltaX = e.clientX - pointerInteracting.current.x;
    const deltaY = e.clientY - pointerInteracting.current.y;
    dragOffset.current = { phi: deltaX / 300, theta: deltaY / 1000 };

    const now = Date.now();
    if (lastPointer.current) {
      const dt = Math.max(now - lastPointer.current.t, 1);
      const maxVelocity = 0.15;
      velocity.current = {
        phi: Math.max(-maxVelocity, Math.min(maxVelocity, ((e.clientX - lastPointer.current.x) / dt) * 0.3)),
        theta: Math.max(-maxVelocity, Math.min(maxVelocity, ((e.clientY - lastPointer.current.y) / dt) * 0.08)),
      };
    }
    lastPointer.current = { x: e.clientX, y: e.clientY, t: now };
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
      lastPointer.current = null;
    }
    pointerInteracting.current = null;
    pauseFlags.current.drag = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    // Debounced restore — a quick re-grab (common when someone nudges the
    // globe a few times) cancels this via handlePointerDown instead of
    // rebuilding at full res just to tear it down again a moment later.
    restoreQualityTimeout.current = window.setTimeout(() => {
      restoreQualityTimeout.current = undefined;
      setQualityRef.current?.(false);
    }, 350);
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Low-power signal: few CPU cores, or the browser's own data-saver mode.
    // Any one of these drops the globe's map resolution (mapSamples) — the
    // single most expensive setting cobe exposes — without touching its
    // visual appearance on capable/desktop hardware.
    const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4;
    const saveData = Boolean((navigator as { connection?: { saveData?: boolean } }).connection?.saveData);
    lowPowerRef.current = lowCores || saveData || reducedMotionRef.current;
  }, []);

  // Pause the rAF loop when the globe scrolls off-screen or the tab is
  // backgrounded — cobe has no built-in visibility awareness, so left alone
  // it burns GPU/battery indefinitely on a hidden tab or a globe scrolled
  // far out of view.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        pauseFlags.current.offscreen = !entries[0]?.isIntersecting;
        if (!pauseFlags.current.offscreen) requestRenderRef.current?.();
      },
      { threshold: 0.01 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      pauseFlags.current.hidden = document.hidden;
      if (!document.hidden) requestRenderRef.current?.();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cobe reparents the canvas into its own wrapper. React must not own the
    // canvas node or unmount throws removeChild NotFoundError.
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.cursor = "grab";
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 1.2s ease";
    canvas.style.borderRadius = "50%";
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", handlePointerDown);
    container.prepend(canvas);
    canvasRef.current = canvas;

    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId = 0;
    let loopRunning = false;
    let resizeObserver: ResizeObserver | null = null;
    let phi = initialPhi;
    let width = 0;
    let dpr = 1;
    let fullMapSamples = mapSamples;
    let isLowQuality = false;

    function render() {
      if (!globe) return;
      const paused = isPaused();
      if (!paused && !reducedMotionRef.current) {
        phi += speed;
        if (Math.abs(velocity.current.phi) > 0.0001 || Math.abs(velocity.current.theta) > 0.0001) {
          phiOffsetRef.current += velocity.current.phi;
          thetaOffsetRef.current += velocity.current.theta;
          velocity.current.phi *= 0.95;
          velocity.current.theta *= 0.95;
        }
      }

      const thetaMin = -0.4;
      const thetaMax = 0.4;
      if (thetaOffsetRef.current < thetaMin) {
        thetaOffsetRef.current += (thetaMin - thetaOffsetRef.current) * 0.1;
      } else if (thetaOffsetRef.current > thetaMax) {
        thetaOffsetRef.current += (thetaMax - thetaOffsetRef.current) * 0.1;
      }

      globe.update({
        phi: phi + phiOffsetRef.current + dragOffset.current.phi,
        theta: theta + thetaOffsetRef.current + dragOffset.current.theta,
        dark,
        mapBrightness,
        markerColor,
        baseColor,
        arcColor,
        glowColor,
        markers: cobeMarkers,
        arcs: cobeArcs,
      });

      // Reduced-motion renders one static frame per resume (pointer drag,
      // tab refocus, scroll back into view) instead of spinning forever —
      // the pause-flag checks above already zeroed the rotation for this
      // frame, so stopping here just stops repainting an unchanging globe.
      // Fully paused (off-screen / hidden / mid-drag with nothing moving)
      // also stops the loop; the pause/visibility/drag handlers above call
      // requestRenderRef to wake it back up.
      if (reducedMotionRef.current || paused) {
        loopRunning = false;
        return;
      }
      animationId = window.requestAnimationFrame(render);
    }

    function requestRender() {
      if (loopRunning || !globe) return;
      loopRunning = true;
      animationId = window.requestAnimationFrame(render);
    }
    requestRenderRef.current = requestRender;

    function createInstance(samples: number, atPhi: number, atTheta: number) {
      return createGlobe(canvas, {
        devicePixelRatio: dpr,
        width,
        height: width,
        phi: atPhi,
        theta: atTheta,
        dark,
        diffuse,
        mapSamples: samples,
        mapBrightness,
        baseColor,
        markerColor,
        glowColor,
        markerElevation,
        markers: cobeMarkers,
        arcs: cobeArcs,
        arcColor,
        arcWidth,
        arcHeight,
        scale,
      });
    }

    // Rebuilds the cobe instance at a lower mapSamples while dragging (the
    // single most expensive cobe setting, and the only one it won't let you
    // change post-init) — same phi/theta so there's no visual jump — then
    // rebuilds back at full quality once the drag settles. No-op if already
    // at the target quality (e.g. low-power devices where both tiers match).
    function setQuality(low: boolean) {
      if (!globe || isLowQuality === low) return;
      const dragMapSamples = Math.min(fullMapSamples, 3000);
      // Already-low-power devices may have fullMapSamples at or below the
      // drag tier — nothing to gain from a rebuild in that case.
      if (dragMapSamples === fullMapSamples) return;
      const target = low ? dragMapSamples : fullMapSamples;
      const currentPhi = phi + phiOffsetRef.current + dragOffset.current.phi;
      const currentTheta = theta + thetaOffsetRef.current + dragOffset.current.theta;
      globe.destroy();
      globe = createInstance(target, currentPhi, currentTheta);
      isLowQuality = low;
      requestRender();
    }
    setQualityRef.current = setQuality;

    function init() {
      if (globe || !canvasRef.current) return;
      width = canvasRef.current.offsetWidth;
      if (width === 0) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Map resolution is the single most expensive cobe setting — cut it
      // to ~a third on low-power hardware / save-data / reduced-motion,
      // full detail everywhere else. Everything else (colors, markers,
      // arcs, scale) is untouched so the globe looks the same either way.
      fullMapSamples = lowPowerRef.current ? Math.min(mapSamples, 6000) : mapSamples;
      globe = createInstance(fullMapSamples, initialPhi, theta);
      requestRender();
      window.setTimeout(() => {
        canvas.style.opacity = "1";
      }, 120);
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width) {
          resizeObserver?.disconnect();
          init();
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(animationId);
      if (restoreQualityTimeout.current !== undefined) {
        window.clearTimeout(restoreQualityTimeout.current);
        restoreQualityTimeout.current = undefined;
      }
      setQualityRef.current = null;
      globe?.destroy();
      globe = null;
      canvas.removeEventListener("pointerdown", handlePointerDown);
      if (canvas.isConnected) {
        canvas.remove();
      }
      canvasRef.current = null;
    };
  }, [
    arcColor,
    arcHeight,
    arcWidth,
    baseColor,
    cobeArcs,
    cobeMarkers,
    dark,
    diffuse,
    glowColor,
    initialPhi,
    isPaused,
    mapBrightness,
    mapSamples,
    markerColor,
    markerElevation,
    scale,
    speed,
    theta,
    handlePointerDown,
  ]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <div ref={containerRef} className="absolute inset-0" aria-hidden />
      {markers.map((m) => (
        <div
          key={m.id}
          style={
            {
              position: "absolute",
              positionAnchor: `--cobe-${m.id}`,
              bottom: "anchor(top)",
              left: "anchor(center)",
              translate: "-50% 0",
              marginBottom: 6,
              pointerEvents: "none",
              opacity: `var(--cobe-visible-${m.id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
              transition: "opacity 0.8s, filter 0.8s",
            } satisfies AnchorStyle
          }
        >
          {m.flagCode ? (
            <span
              aria-hidden
              className={`fi fi-${m.flagCode}`}
              style={{
                display: "inline-block",
                width: 20,
                height: 15,
                borderRadius: 2,
                boxShadow: "0 1px 5px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.3)",
                overflow: "hidden",
              }}
            />
          ) : (
            <span
              style={{
                display: "block",
                padding: "3px 7px",
                borderRadius: 999,
                background: "rgba(8, 33, 27, 0.86)",
                border: "1px solid rgba(176, 241, 34, 0.35)",
                color: "#ffffff",
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                lineHeight: 1,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {m.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Memoized so typing in a parent (e.g. the entry-gate country search) doesn't
// re-render the globe. All props from callers are stable (module-const colors,
// memoized markers/arcs, numeric literals), so the default shallow compare holds.
export const Globe = memo(GlobeBase);
