import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ManualAdjustments } from "@fuji-recipes/core-types";
import { useEditorStore } from "../store";

interface SliderSpec {
  id: string;
  label: string;
  field: keyof ManualAdjustments;
  min: number;
  max: number;
  step: number;
  /** How to render the numeric value next to the label. */
  format: (v: number) => string;
}

const SLIDERS: SliderSpec[] = [
  { id: "exposure", label: "Exposure", field: "exposure", min: -2, max: 2, step: 0.01, format: (v) => `${v.toFixed(2)} EV` },
  { id: "white-balance", label: "White balance", field: "white_balance", min: -1, max: 1, step: 0.01, format: signed },
  { id: "contrast", label: "Contrast", field: "contrast", min: -1, max: 1, step: 0.01, format: signed },
  { id: "highlights", label: "Highlights", field: "highlights", min: -1, max: 1, step: 0.01, format: signed },
  { id: "shadows", label: "Shadows", field: "shadows", min: -1, max: 1, step: 0.01, format: signed },
  { id: "saturation", label: "Saturation", field: "saturation", min: -1, max: 1, step: 0.01, format: signed },
  { id: "levels-black", label: "Levels · black", field: "black_level", min: 0, max: 0.9, step: 0.01, format: (v) => v.toFixed(2) },
  { id: "levels-white", label: "Levels · white", field: "white_level", min: 0.1, max: 1, step: 0.01, format: (v) => v.toFixed(2) },
];

function signed(v: number): string {
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

const PANEL_WIDTH = 288;

function clampPosition(x: number, y: number) {
  const maxX = Math.max(0, window.innerWidth - PANEL_WIDTH);
  const maxY = Math.max(0, window.innerHeight - 80);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}

interface AdjustmentsPanelProps {
  disabled?: boolean;
}

export function AdjustmentsPanel({ disabled }: AdjustmentsPanelProps) {
  const manual = useEditorStore((s) => s.manual);
  const setManual = useEditorStore((s) => s.setManual);
  const resetManual = useEditorStore((s) => s.resetManual);

  const [pos, setPos] = useState(() =>
    clampPosition(typeof window === "undefined" ? 0 : window.innerWidth - PANEL_WIDTH - 24, 88),
  );
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);

  function handleDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffset.current = { dx: event.clientX - pos.x, dy: event.clientY - pos.y };
  }

  function handleDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragOffset.current) return;
    setPos(clampPosition(event.clientX - dragOffset.current.dx, event.clientY - dragOffset.current.dy));
  }

  function handleDragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    dragOffset.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section
      aria-label="Adjustments"
      style={{ left: pos.x, top: pos.y, width: PANEL_WIDTH }}
      className="glass glass-dark fixed z-30 flex flex-col rounded-xl"
    >
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        className="flex cursor-grab items-center justify-between gap-2 rounded-t-xl border-b border-white/10 px-3 py-2 active:cursor-grabbing"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-neutral-500">⠿</span>
          <h2 className="text-sm font-medium text-neutral-200">Adjustments</h2>
        </span>
        <button
          id="reset-adjustments"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={resetManual}
          disabled={disabled}
          className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-100 hover:underline disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {SLIDERS.map((slider) => (
          <label key={slider.id} className="flex flex-col gap-1 text-sm text-neutral-300">
            <span className="flex justify-between">
              <span>{slider.label}</span>
              <span className="tabular-nums text-neutral-400">{slider.format(manual[slider.field])}</span>
            </span>
            <input
              id={slider.id}
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={manual[slider.field]}
              disabled={disabled}
              onChange={(event) => setManual({ [slider.field]: Number(event.target.value) })}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
