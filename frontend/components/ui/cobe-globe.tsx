"use client";

import { memo, useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import createGlobe from "cobe";

// P-003: hoisted module-level so every call that omits these props shares
// one stable array reference. A default parameter (`markerColor = [...]`)
// creates a NEW array literal on every render the caller omits the prop,
// which fed the init effect's dependency array below and destroyed +
// recreated the whole WebGL scene on every parent re-render (e.g. every
// keystroke in a search box above the globe).
const DEFAULT_MARKER_COLOR: [number, number, number] = [0.69, 0.95, 0.13];
const DEFAULT_BASE_COLOR: [number, number, number] = [0.08, 0.23, 0.18];
const DEFAULT_ARC_COLOR: [number, number, number] = [0.69, 0.95, 0.13];
const DEFAULT_GLOW_COLOR: [number, number, number] = [0.08, 0.22, 0.17];
const DEFAULT_MARKERS: GlobeMarker[] = [];
const DEFAULT_ARCS: GlobeArc[] = [];

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

function GlobeImpl({
  markers = DEFAULT_MARKERS,
  arcs = DEFAULT_ARCS,
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
  const isPausedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  // P-003: the globe kept calling globe.update() (a full WebGL redraw) every
  // animation frame even when hidden behind another tab or scrolled
  // offscreen, and even when reduced-motion had already stopped rotation —
  // wasting GPU/battery for a scene nothing was watching. isIntersectingRef
  // + document.hidden gate the draw call itself in render() below; the rAF
  // loop keeps running (a bare callback is effectively free) so resuming
  // needs no separate wake-up wiring.
  const isIntersectingRef = useRef(true);

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
    isPausedRef.current = true;
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
    isPausedRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
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
    let resizeObserver: ResizeObserver | null = null;
    let phi = initialPhi;

    function render() {
      if (!globe) return;
      if (!isPausedRef.current && !reducedMotionRef.current) {
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

      // Skip the actual WebGL draw (not the rAF loop itself, which stays
      // primed so resuming needs no extra wiring) when: the tab is hidden,
      // the globe is scrolled offscreen, or reduced-motion is on and
      // nothing is being dragged — there is nothing new to show.
      const shouldDraw =
        !document.hidden &&
        isIntersectingRef.current &&
        (!reducedMotionRef.current || pointerInteracting.current !== null);
      if (shouldDraw) {
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
      }
      animationId = window.requestAnimationFrame(render);
    }

    function init() {
      if (globe || !canvasRef.current) return;
      const width = canvasRef.current.offsetWidth;
      if (width === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width,
        height: width,
        phi: initialPhi,
        theta,
        dark,
        diffuse,
        mapSamples,
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
      render();
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

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isIntersectingRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    return () => {
      intersectionObserver.disconnect();
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(animationId);
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

// P-003: memoized so a parent re-render (e.g. every keystroke in a search
// box above the globe) that passes referentially-stable props doesn't even
// re-run this component's body — the cheapest way to stop the init effect's
// dependency array from churning.
export const Globe = memo(GlobeImpl);
