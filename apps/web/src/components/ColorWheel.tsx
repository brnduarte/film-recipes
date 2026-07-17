// HSV color-wheel grade control. Hue is the wheel angle, saturation the radial
// distance from center (which also drives handle brightness, matching the
// spec's "moving in or outwards changes values and saturation"). Handles are
// the ColorGrade stops, ordered shadows→highlights and spread across the tonal
// range by the luminance color-map in pipeline.rs::apply_color_grade.
//
// A harmony preset lays the handles out at fixed relative hue offsets; dragging
// the primary (first) handle rotates the whole set to preserve the harmony,
// while dragging any other handle fine-tunes just that stop.

import { useCallback, useEffect, useRef } from "react";
import type { ColorGradeStop, ColorHarmony } from "@film-recipes/core-types";

const SIZE = 220; // canvas px (square)
const RADIUS = SIZE / 2;

/** Relative hue offsets (degrees) per harmony, applied around a base hue. */
const HARMONY_OFFSETS: Record<ColorHarmony, number[]> = {
  Monochromatic: [0, 0], // same hue, two radii → duotone shadows/highlights
  Analogous: [-30, 0, 30],
  Complementary: [0, 180],
  SplitComplementary: [0, 150, 210],
  Triad: [0, 120, 240],
  Square: [0, 90, 180, 270],
};

/** Per-stop radii for harmonies that need distinct radii (Monochromatic). */
function radiiForHarmony(harmony: ColorHarmony, count: number): number[] {
  if (harmony === "Monochromatic") return [0.4, 0.85];
  return Array.from({ length: count }, () => 0.7);
}

/** Build the default stop layout for a harmony around a base hue. */
export function stopsForHarmony(harmony: ColorHarmony, baseHue = 30): ColorGradeStop[] {
  const offsets = HARMONY_OFFSETS[harmony];
  const radii = radiiForHarmony(harmony, offsets.length);
  return offsets.map((off, i) => radiusToStop(((baseHue + off) % 360 + 360) % 360, radii[i]));
}

/** Radius (0..1) maps to both saturation and value, per the spec. */
function radiusToStop(hue: number, radius: number): ColorGradeStop {
  const r = Math.min(Math.max(radius, 0), 1);
  return { hue, saturation: r, value: 0.4 + 0.55 * r };
}

interface ColorWheelProps {
  stops: ColorGradeStop[];
  onChange: (stops: ColorGradeStop[]) => void;
}

export function ColorWheel({ stops, onChange }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragIndex = useRef<number | null>(null);

  // Paint the HSV wheel once (it never changes — handles are DOM overlays).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - RADIUS;
        const dy = y - RADIUS;
        const dist = Math.sqrt(dx * dx + dy * dy) / RADIUS;
        const idx = (y * SIZE + x) * 4;
        if (dist > 1) {
          img.data[idx + 3] = 0;
          continue;
        }
        let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
        hue = (hue + 360) % 360;
        const [r, g, b] = hsvToRgb(hue, dist, 1);
        img.data[idx] = Math.round(r * 255);
        img.data[idx + 1] = Math.round(g * 255);
        img.data[idx + 2] = Math.round(b * 255);
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  const stopToXY = useCallback((s: ColorGradeStop) => {
    const angle = (s.hue * Math.PI) / 180;
    const r = s.saturation * RADIUS;
    return { x: RADIUS + Math.cos(angle) * r, y: RADIUS + Math.sin(angle) * r };
  }, []);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const root = rootRef.current;
      const i = dragIndex.current;
      if (!root || i == null) return;
      const rect = root.getBoundingClientRect();
      const dx = clientX - rect.left - RADIUS;
      const dy = clientY - rect.top - RADIUS;
      let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
      hue = (hue + 360) % 360;
      const radius = Math.min(Math.sqrt(dx * dx + dy * dy) / RADIUS, 1);

      const next = stops.map((s) => ({ ...s }));
      if (i === 0) {
        // Rotate the whole harmony to follow the primary handle; primary also
        // takes the new radius, others keep their own.
        const prevHue = stops[0].hue;
        const delta = hue - prevHue;
        next.forEach((s, j) => {
          s.hue = ((s.hue + delta) % 360 + 360) % 360;
          if (j === 0) {
            const updated = radiusToStop(hue, radius);
            s.hue = updated.hue;
            s.saturation = updated.saturation;
            s.value = updated.value;
          }
        });
      } else {
        const updated = radiusToStop(hue, radius);
        next[i] = updated;
      }
      onChange(next);
    },
    [stops, onChange],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (dragIndex.current == null) return;
      updateFromPointer(e.clientX, e.clientY);
    }
    function onUp() {
      dragIndex.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateFromPointer]);

  return (
    <div
      ref={rootRef}
      className="relative mx-auto select-none"
      style={{ width: SIZE, height: SIZE }}
    >
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="rounded-full ring-1 ring-white/15"
        style={{ width: SIZE, height: SIZE }}
      />
      {/* Radial spokes between successive stops to show the harmony shape. */}
      <svg className="pointer-events-none absolute inset-0" width={SIZE} height={SIZE}>
        {stops.map((s, i) => {
          const p = stopToXY(s);
          return <line key={i} x1={RADIUS} y1={RADIUS} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />;
        })}
      </svg>
      {stops.map((s, i) => {
        const p = stopToXY(s);
        const [r, g, b] = hsvToRgb(s.hue, s.saturation, s.value);
        const fill = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Color stop ${i + 1}${i === 0 ? " (primary)" : ""}`}
            onPointerDown={(e) => {
              e.preventDefault();
              dragIndex.current = i;
              updateFromPointer(e.clientX, e.clientY);
            }}
            className="absolute size-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 shadow-md active:cursor-grabbing"
            style={{
              left: p.x,
              top: p.y,
              backgroundColor: fill,
              borderColor: i === 0 ? "#fff" : "rgba(255,255,255,0.7)",
            }}
          />
        );
      })}
    </div>
  );
}

// Mirrors pipeline.rs::grade_hsv_to_rgb (hue in degrees). Used only for display.
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hPrime = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  const sextant = Math.floor(hPrime);
  if (sextant === 0) [r1, g1, b1] = [c, x, 0];
  else if (sextant === 1) [r1, g1, b1] = [x, c, 0];
  else if (sextant === 2) [r1, g1, b1] = [0, c, x];
  else if (sextant === 3) [r1, g1, b1] = [0, x, c];
  else if (sextant === 4) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = v - c;
  return [r1 + m, g1 + m, b1 + m];
}
