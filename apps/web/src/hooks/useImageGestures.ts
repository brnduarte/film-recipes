import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface Transform {
  scale: number;
  x: number;
  y: number;
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

const MIN_SCALE = 1;
const MAX_SCALE = 6;
/** Finger travel (px) that turns a touch into a pan and cancels press-to-peek. */
const MOVE_THRESHOLD = 8;
/** How long a still finger must rest before the original is revealed. */
const HOLD_MS = 280;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

interface Options {
  /** Only handle gestures on the mobile stage; desktop uses its own controls. */
  enabled: boolean;
  /** Called when press-and-hold begins/ends so the caller can reveal the
   *  untouched original (drive the shader split) while held. */
  onPeekChange: (peeking: boolean) => void;
}

/**
 * Touch gestures for the full-bleed mobile image stage:
 *  - one finger dragging → pan the (zoomed) image,
 *  - two fingers → pinch to zoom, panning by the pinch midpoint,
 *  - one finger held still → temporarily reveal the original for a before/after
 *    comparison (via `onPeekChange`); moving cancels it.
 * Zoom snaps back to a fitted 1× (and recenters) when all fingers lift.
 */
export function useImageGestures({ enabled, onPeekChange }: Options) {
  const [transform, setTransformState] = useState<Transform>(IDENTITY);
  // Mirror of `transform` for synchronous reads inside pointer handlers, which
  // must not depend on a re-render to see the latest value.
  const transformRef = useRef<Transform>(IDENTITY);
  const setTransform = useCallback((next: Transform) => {
    transformRef.current = next;
    setTransformState(next);
  }, []);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  // Gesture anchor captured when a finger goes down or the finger count changes.
  const start = useRef<{ dist: number; scale: number; midX: number; midY: number; x: number; y: number } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const moved = useRef(false);
  const peeking = useRef(false);

  const clearHold = useCallback(() => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const endPeek = useCallback(() => {
    if (peeking.current) {
      peeking.current = false;
      onPeekChange(false);
    }
  }, [onPeekChange]);

  const anchorFrom = useCallback((midX: number, midY: number, dist: number) => {
    const t = transformRef.current;
    start.current = { dist, scale: t.scale, midX, midY, x: t.x, y: t.y };
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.current.size === 1) {
        moved.current = false;
        clearHold();
        holdTimer.current = window.setTimeout(() => {
          if (!moved.current && pointers.current.size === 1) {
            peeking.current = true;
            onPeekChange(true);
          }
        }, HOLD_MS);
        anchorFrom(event.clientX, event.clientY, 0);
      } else if (pointers.current.size === 2) {
        // Second finger down starts a pinch; a peek can't coexist with it.
        clearHold();
        endPeek();
        const [a, b] = [...pointers.current.values()];
        anchorFrom((a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(a.x - b.x, a.y - b.y));
      }
    },
    [enabled, anchorFrom, clearHold, endPeek, onPeekChange],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || !pointers.current.has(event.pointerId) || !start.current) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const anchor = start.current;

      if (pointers.current.size === 1) {
        const dx = event.clientX - anchor.midX;
        const dy = event.clientY - anchor.midY;
        if (!moved.current && Math.hypot(dx, dy) > MOVE_THRESHOLD) {
          moved.current = true;
          clearHold();
        }
        if (peeking.current) return; // holding to compare — don't pan
        setTransform({ scale: anchor.scale, x: anchor.x + dx, y: anchor.y + dy });
      } else if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const ratio = anchor.dist > 0 ? dist / anchor.dist : 1;
        setTransform({
          scale: clamp(anchor.scale * ratio, MIN_SCALE, MAX_SCALE),
          x: anchor.x + (midX - anchor.midX),
          y: anchor.y + (midY - anchor.midY),
        });
      }
    },
    [enabled, clearHold, setTransform],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      pointers.current.delete(event.pointerId);
      clearHold();
      endPeek();

      if (pointers.current.size === 1) {
        // Dropped from pinch to a single finger — re-anchor for panning.
        const [p] = [...pointers.current.values()];
        anchorFrom(p.x, p.y, 0);
      } else if (pointers.current.size === 0) {
        start.current = null;
        // Fitted zoom-out snaps back to a centered 1×.
        if (transformRef.current.scale <= MIN_SCALE) setTransform(IDENTITY);
      }
    },
    [enabled, anchorFrom, clearHold, endPeek, setTransform],
  );

  // Leaving mobile (or unmount) resets everything so the desktop view is clean.
  useEffect(() => {
    if (!enabled) {
      pointers.current.clear();
      start.current = null;
      clearHold();
      endPeek();
      setTransform(IDENTITY);
    }
  }, [enabled, clearHold, endPeek, setTransform]);

  return {
    transform,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
