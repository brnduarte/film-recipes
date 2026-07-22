import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ColorHarmony, ManualAdjustments, OverlayBlendMode } from "@film-recipes/core-types";
import type { Prediction } from "@film-recipes/adaptive";
import { useEditorStore } from "../store";
import { ColorWheel, stopsForHarmony } from "./ColorWheel";

/** Number-valued manual fields the sliders can bind to (excludes color_grade). */
type NumericManualField = {
  [K in keyof ManualAdjustments]: ManualAdjustments[K] extends number ? K : never;
}[keyof ManualAdjustments];

interface SliderSpec {
  id: string;
  label: string;
  field: NumericManualField;
  min: number;
  max: number;
  step: number;
  /** How to render the numeric value next to the label. */
  format: (v: number) => string;
}

/** Blend modes offered for the overlay self-blend — restricted to
 *  `OverlayBlendMode`'s set, which excludes Lighten/Hue/Saturation/Color/
 *  Luminosity because self-blending an identical layer with any of them is
 *  always a no-op (see that type's doc comment). */
const OVERLAY_MODES: { id: OverlayBlendMode; label: string }[] = [
  { id: "Multiply", label: "Multiply" },
  { id: "ColorBurn", label: "Color Burn" },
  { id: "Overlay", label: "Overlay" },
  { id: "SoftLight", label: "Soft Light" },
  { id: "HardLight", label: "Hard Light" },
  { id: "HardMix", label: "Hard Mix" },
  { id: "Difference", label: "Difference" },
  { id: "Exclusion", label: "Exclusion" },
];

const HARMONIES: { id: ColorHarmony; label: string }[] = [
  { id: "Monochromatic", label: "Monochromatic" },
  { id: "Analogous", label: "Analogous" },
  { id: "Complementary", label: "Complementary" },
  { id: "SplitComplementary", label: "Split Comp." },
  { id: "Triad", label: "Triad" },
  { id: "Square", label: "Square" },
];

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

/** Human-readable one-liner of what the adaptive analysis saw, for transparency. */
function formatContext(prediction: Prediction): string {
  const c = prediction.analysis_context;
  const humanize = (s: string) => s.replace(/_/g, " ");
  const parts = [humanize(c.scene), humanize(c.exposure_bias_detected)];
  if (c.skin_detected) parts.push("skin protected");
  return parts.join(" · ");
}

/** Value's position within [min, max] as a 0–100 percentage, for the slider's
 *  filled-track width (`--pct`). */
function pct(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
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
  /** Mobile: open centered on screen instead of docked near the top-right. */
  initialCenter?: boolean;
  /** Applied intensity (0–100) of the current adaptive prediction. */
  strength: number;
  onStrengthChange: (strength: number) => void;
  /** The last prediction, if any — drives the strength slider + context line. */
  prediction: Prediction | null;
}

type Tab = "adjust" | "grade";

export function AdjustmentsPanel({
  disabled,
  initialCenter,
  strength,
  onStrengthChange,
  prediction,
}: AdjustmentsPanelProps) {
  const manual = useEditorStore((s) => s.manual);
  const setManual = useEditorStore((s) => s.setManual);
  const setColorGrade = useEditorStore((s) => s.setColorGrade);
  const setOverlay = useEditorStore((s) => s.setOverlay);
  const resetManual = useEditorStore((s) => s.resetManual);
  const grade = manual.color_grade;
  const overlay = manual.overlay;

  const [tab, setTab] = useState<Tab>("adjust");

  function selectHarmony(harmony: ColorHarmony) {
    setColorGrade({ harmony, enabled: true, stops: stopsForHarmony(harmony) });
  }

  function selectOverlayMode(mode: OverlayBlendMode) {
    setOverlay({ mode, enabled: true });
  }

  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return clampPosition(0, 88);
    // Mobile opens centered; desktop docks near the top-right.
    const x = initialCenter ? (window.innerWidth - PANEL_WIDTH) / 2 : window.innerWidth - PANEL_WIDTH - 24;
    const y = initialCenter ? Math.max(88, window.innerHeight * 0.5 - 220) : 88;
    return clampPosition(x, y);
  });
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

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/10 px-2 pt-2">
        {([["adjust", "Adjustments"], ["grade", "Color Grade"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === id ? "bg-white/10 text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "adjust" ? (
        <div className="flex flex-col gap-3 p-3">
          {/* On-device adaptive calibration ("AI"): the recipe is auto-tuned to
              the photo on load / recipe change. This shows what it detected and
              lets you dial the overall strength. Everything below stays
              hand-editable. */}
          {prediction && (
            <div className="animate-fade-in flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
              <span className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-fuchsia-300/90">
                <svg viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.6 4.1L18 8.7l-4.1 1.6L12 14.4l-1.6-4.1L6.3 8.7l4.1-1.6z" />
                  <path d="M18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
                </svg>
                Adapted to photo
              </span>
              <p className="px-0.5 text-[11px] leading-snug text-neutral-400">
                {formatContext(prediction)}
              </p>
              <label className="flex flex-col gap-1 text-sm text-neutral-300">
                <span className="flex justify-between">
                  <span>Strength</span>
                  <span className="tabular-nums text-neutral-400">{Math.round(strength)}%</span>
                </span>
                <input
                  id="adapt-strength"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={strength}
                  disabled={disabled}
                  onChange={(event) => onStrengthChange(Number(event.target.value))}
                  style={{ "--pct": `${pct(strength, 0, 100)}%` } as React.CSSProperties}
                />
              </label>

              {/* Photoshop-style blend-mode overlay: self-blends the finished
                  grade at a chosen mode + opacity — Photoshop's own "duplicate
                  layer, set a blend mode, dial opacity" punch trick. Can only
                  enhance the grade, never erase it back to the original. */}
              <label className="flex flex-col gap-1 text-sm text-neutral-300">
                <span>Overlay</span>
                <select
                  id="overlay-mode"
                  value={overlay.enabled ? overlay.mode : ""}
                  disabled={disabled}
                  onChange={(event) => selectOverlayMode(event.target.value as OverlayBlendMode)}
                  className="rounded-md border border-white/10 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-white/30 disabled:opacity-50"
                >
                  <option value="" disabled>
                    Choose an overlay mode…
                  </option>
                  {OVERLAY_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              {overlay.enabled && (
                <>
                  <label className="flex flex-col gap-1 text-sm text-neutral-300">
                    <span className="flex justify-between">
                      <span>Opacity</span>
                      <span className="tabular-nums text-neutral-400">{Math.round(overlay.opacity * 100)}%</span>
                    </span>
                    <input
                      id="overlay-opacity"
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={overlay.opacity}
                      disabled={disabled}
                      onChange={(event) => setOverlay({ opacity: Number(event.target.value) })}
                      style={{ "--pct": `${pct(overlay.opacity, 0, 1)}%` } as React.CSSProperties}
                    />
                  </label>

                  <button
                    id="overlay-disable"
                    type="button"
                    onClick={() => setOverlay({ enabled: false })}
                    disabled={disabled}
                    className="self-start text-xs text-neutral-400 underline-offset-2 hover:text-neutral-100 hover:underline disabled:opacity-50"
                  >
                    Turn off overlay
                  </button>
                </>
              )}
            </div>
          )}

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
                style={{ "--pct": `${pct(manual[slider.field], slider.min, slider.max)}%` } as React.CSSProperties}
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3">
          {/* Harmony preset — single-selection dropdown */}
          <label className="flex flex-col gap-1 text-sm text-neutral-300">
            <span>Harmony</span>
            <select
              id="grade-harmony"
              value={grade.enabled ? grade.harmony : ""}
              disabled={disabled}
              onChange={(event) => selectHarmony(event.target.value as ColorHarmony)}
              className="rounded-md border border-white/10 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-white/30 disabled:opacity-50"
            >
              <option value="" disabled>
                Choose a harmony…
              </option>
              {HARMONIES.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </label>

          {grade.enabled && grade.stops.length > 0 ? (
            <>
              <ColorWheel stops={grade.stops} onChange={(stops) => setColorGrade({ stops })} />

              <label className="flex flex-col gap-1 text-sm text-neutral-300">
                <span className="flex justify-between">
                  <span>Intensity</span>
                  <span className="tabular-nums text-neutral-400">{grade.intensity.toFixed(2)}</span>
                </span>
                <input
                  id="grade-intensity"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={grade.intensity}
                  disabled={disabled}
                  onChange={(event) => setColorGrade({ intensity: Number(event.target.value) })}
                  style={{ "--pct": `${pct(grade.intensity, 0, 1)}%` } as React.CSSProperties}
                />
              </label>

              <button
                id="grade-disable"
                type="button"
                onClick={() => setColorGrade({ enabled: false })}
                disabled={disabled}
                className="self-start text-xs text-neutral-400 underline-offset-2 hover:text-neutral-100 hover:underline disabled:opacity-50"
              >
                Turn off color grade
              </button>
            </>
          ) : (
            <p className="px-1 text-xs text-neutral-400">
              Pick a harmony above to start grading. Drag the primary (white-ringed) handle to
              rotate the palette; drag the others to fine-tune.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
