import { useCallback, useEffect, useRef, useState } from "react";

interface SplitSliderProps {
  /** The preview canvas the divider is laid over. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Current divider position in [0,1] (0 = all recipe, 1 = all original). */
  splitX: number;
  onChange: (splitX: number) => void;
  /** Re-measure when these change (image swap / zoom). */
  deps: unknown[];
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Draggable before/after divider drawn on top of the preview canvas: a
 * full-height vertical line with a handle at the top. The left side of the
 * line shows the untouched original, the right side the applied recipe (the
 * actual pixel split happens in the recipe shader via `u_splitX`). The line
 * and handle stay wherever the user releases them.
 */
export function SplitSlider({ canvasRef, splitX, onChange, deps }: SplitSliderProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  const draggingRef = useRef(false);

  // Track the canvas's on-screen box so the overlay lines up exactly with the
  // displayed (fitted/scaled) image, not the canvas's intrinsic pixel size.
  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
  }, [canvasRef]);

  useEffect(() => {
    measure();
    // Re-measure after the stage's layout transition (~500ms) settles so the
    // overlay lands on the canvas's final position, not its mid-animation one.
    const settle = window.setTimeout(measure, 550);
    window.addEventListener("resize", measure);
    const canvas = canvasRef.current;
    const ro = new ResizeObserver(measure);
    if (canvas) ro.observe(canvas);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      if (!rect || rect.width === 0) return;
      const ratio = (clientX - rect.left) / rect.width;
      onChange(Math.min(1, Math.max(0, ratio)));
    },
    [rect, onChange],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      updateFromClientX(e.clientX);
    }
    function onUp() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateFromClientX]);

  if (!rect) return null;

  const x = rect.left + splitX * rect.width;

  return (
    <div
      className="pointer-events-none fixed z-30"
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    >
      {/* Vertical divider line spanning the full image height. */}
      <div
        className="absolute top-0 h-full w-px bg-white/90 shadow-[0_0_6px_rgba(0,0,0,0.6)]"
        style={{ left: x - rect.left }}
      />

      {/* Before/after labels flanking the divider. */}
      <span className="absolute left-3 top-2 rounded bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
        Original
      </span>
      <span className="absolute right-3 top-2 rounded bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
        Recipe
      </span>

      {/* Draggable handle at the top of the divider. */}
      <button
        type="button"
        aria-label="Before/after divider"
        onPointerDown={(e) => {
          e.preventDefault();
          draggingRef.current = true;
          updateFromClientX(e.clientX);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") onChange(Math.max(0, splitX - 0.02));
          if (e.key === "ArrowRight") onChange(Math.min(1, splitX + 0.02));
        }}
        className="pointer-events-auto absolute flex size-8 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-full border border-white/70 bg-white/95 text-neutral-800 shadow-lg transition-transform hover:scale-110 active:scale-105"
        style={{ left: x - rect.left, top: 8 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 6L4 12l5 6M15 6l5 6-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
