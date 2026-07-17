// Landing-page hero: a fullscreen, self-authored (royalty-free, zero-network)
// SVG sunrise landscape shown twice — an untouched "original" underneath and a
// recipe-graded copy on top, clipped to a band that sweeps across so the page
// continuously demos a before/after comparison. The graded copy cycles through
// a few named-recipe looks (approximated with CSS filters) with a floating
// label, so visitors see the kind of transformation the editor produces.

import { useEffect, useState } from "react";

/** Recipe looks approximated as CSS filter stacks for the hero demo only —
 *  the real editor renders these through the WASM/WebGL pipeline, not filters. */
const RECIPE_LOOKS: { name: string; filter: string }[] = [
  { name: "Kodak Portra 400", filter: "saturate(1.12) contrast(0.96) sepia(0.16) brightness(1.03)" },
  { name: "Classic Chrome", filter: "saturate(0.72) contrast(1.12) brightness(0.98)" },
  { name: "Velvia", filter: "saturate(1.55) contrast(1.12) brightness(1.02)" },
  { name: "CineStill 800T", filter: "saturate(1.18) hue-rotate(-10deg) contrast(1.06)" },
  { name: "Acros", filter: "grayscale(1) contrast(1.16) brightness(1.03)" },
];

/** The inspiring scene, drawn once and reused for both sides. `preserveAspect
 *  ='slice'` makes it cover any viewport like a photo would. */
function Landscape() {
  return (
    <svg
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b2a4a" />
          <stop offset="38%" stopColor="#7b4b7a" />
          <stop offset="66%" stopColor="#e08a5a" />
          <stop offset="100%" stopColor="#f6c98f" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff4d6" />
          <stop offset="45%" stopColor="#ffd98a" />
          <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3c088" />
          <stop offset="100%" stopColor="#8a5a6f" />
        </linearGradient>
      </defs>

      {/* Sky + sun */}
      <rect width="1200" height="800" fill="url(#sky)" />
      <circle cx="600" cy="470" r="260" fill="url(#sun)" />
      <circle cx="600" cy="470" r="82" fill="#fff1cf" opacity="0.95" />

      {/* Distant mountain ranges, back to front. */}
      <path d="M0 470 L180 360 L340 440 L520 330 L700 430 L880 340 L1080 440 L1200 380 L1200 800 L0 800 Z" fill="#6b4a72" opacity="0.55" />
      <path d="M0 520 L160 430 L320 500 L470 410 L650 500 L820 420 L1000 510 L1200 440 L1200 800 L0 800 Z" fill="#553a5f" opacity="0.7" />
      <path d="M0 560 L220 480 L420 555 L620 470 L820 560 L1030 485 L1200 555 L1200 800 L0 800 Z" fill="#3d2a49" />

      {/* Reflective foreground water. */}
      <rect y="560" width="1200" height="240" fill="url(#water)" />
      <ellipse cx="600" cy="600" rx="150" ry="14" fill="#fff1cf" opacity="0.5" />
      <g fill="#ffffff" opacity="0.25">
        <rect x="360" y="620" width="480" height="3" rx="1.5" />
        <rect x="420" y="650" width="360" height="3" rx="1.5" />
        <rect x="470" y="682" width="260" height="3" rx="1.5" />
      </g>
    </svg>
  );
}

export function HeroScene() {
  const [look, setLook] = useState(0);

  useEffect(() => {
    // Advance the graded look roughly once per wipe pass.
    const id = window.setInterval(() => setLook((l) => (l + 1) % RECIPE_LOOKS.length), 4500);
    return () => window.clearInterval(id);
  }, []);

  const current = RECIPE_LOOKS[look];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Original (before) */}
      <div className="absolute inset-0">
        <Landscape />
      </div>

      {/* Graded (after) — clipped to the sweeping band, filter cross-fades. */}
      <div
        className="animate-hero-wipe absolute inset-0 transition-[filter] duration-1000 ease-in-out"
        style={{ filter: current.filter }}
      >
        <Landscape />
      </div>

      {/* Sweeping divider line + recipe label. */}
      <div className="animate-hero-divider absolute inset-y-0 w-px bg-white/70 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
        <span className="absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-sm">
          {current.name}
        </span>
      </div>

      {/* Corner tags so the comparison reads as before/after at a glance. */}
      <span className="absolute bottom-6 left-6 rounded-md bg-black/40 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
        Original
      </span>
      <span className="absolute bottom-6 right-6 rounded-md bg-black/40 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
        With recipe
      </span>

      {/* Left-edge scrim so the CTA copy stays legible over the image. */}
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/85 via-neutral-950/45 to-transparent" />
    </div>
  );
}
