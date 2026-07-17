// Landing-page hero: a fullscreen royalty-free photo shown twice — an untouched
// "original" underneath and a recipe-graded copy on top, clipped to a band that
// sweeps across so the page continuously demos a before/after comparison. The
// background photo is picked at random on load and crossfades to a new random
// photo every 15s. Images are bundled locally (served from 'self'), so the page
// still makes zero external network requests — nothing leaves the device.

import { useEffect, useState } from "react";

/** Bundled hero photos (public/hero/*), covering people, landscape, and
 *  objects. Local paths only — served from 'self', CSP-compliant. Prefixed
 *  with Vite's BASE_URL so they resolve under a subpath deploy (e.g. GitHub
 *  project pages at /<repo>/) as well as at the domain root. */
const HERO_IMAGES = [
  "hero/portrait.jpg",
  "hero/landscape.jpg",
  "hero/coast.jpg",
  "hero/street.jpg",
  "hero/object.jpg",
].map((path) => `${import.meta.env.BASE_URL}${path}`);

/** How long each background photo stays before crossfading to the next. */
const IMAGE_INTERVAL_MS = 15000;

/** The "before" side is knocked back ~25% in saturation so the recipe-graded
 *  "after" side stands out more by comparison. */
const ORIGINAL_FILTER = "saturate(0.75)";

/** Recipe looks approximated as CSS filter stacks for the hero demo only —
 *  the real editor renders these through the WASM/WebGL pipeline, not filters. */
const RECIPE_LOOKS: { name: string; filter: string }[] = [
  { name: "Kodak Portra 400", filter: "saturate(1.12) contrast(0.96) sepia(0.16) brightness(1.03)" },
  { name: "Classic Chrome", filter: "saturate(0.72) contrast(1.12) brightness(0.98)" },
  { name: "Velvia", filter: "saturate(1.55) contrast(1.12) brightness(1.02)" },
  { name: "CineStill 800T", filter: "saturate(1.18) hue-rotate(-10deg) contrast(1.06)" },
  { name: "Acros", filter: "grayscale(1) contrast(1.16) brightness(1.03)" },
];

/** Pick a random index in [0, len), excluding `not` so a rotation always lands
 *  on a different photo than the one currently shown. */
function randomIndex(len: number, not?: number): number {
  if (len <= 1) return 0;
  let next = Math.floor(Math.random() * len);
  while (next === not) next = Math.floor(Math.random() * len);
  return next;
}

export function HeroScene() {
  const [look, setLook] = useState(0);
  // Random photo on first load; `prev` sits underneath so each change
  // crossfades in over the last photo with no dark flash.
  const [index, setIndex] = useState(() => randomIndex(HERO_IMAGES.length));
  const [prev, setPrev] = useState(index);

  useEffect(() => {
    // Auto-rotate the background photo — but honor reduced-motion preferences
    // by leaving it on the initial random photo (which is still varied per load).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((cur) => {
        setPrev(cur);
        return randomIndex(HERO_IMAGES.length, cur);
      });
    }, IMAGE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const current = RECIPE_LOOKS[look];
  const src = HERO_IMAGES[index];

  return (
    <div
      className="animate-hero-sweep absolute inset-0 overflow-hidden"
      // One sweep pass = one recipe. Advancing on the animation boundary (when
      // the divider is parked at the far right, so the recipe is barely
      // visible) means the look never changes mid-reveal.
      onAnimationIteration={(e) => {
        if (e.animationName.startsWith("hero-sweep")) {
          setLook((l) => (l + 1) % RECIPE_LOOKS.length);
        }
      }}
    >
      {/* Previous photo as a static underlay so the new one crossfades over it. */}
      <img
        src={HERO_IMAGES[prev]}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: ORIGINAL_FILTER }}
      />

      {/* Current photo + before/after demo, fades in over the previous. Keyed so
          the crossfade restarts cleanly on each new photo. */}
      <div key={index} className="animate-fade-in absolute inset-0">
        {/* Original (before) — fills the whole frame; shows to the LEFT of the split.
            Slightly desaturated so the graded "after" side reads as more vivid. */}
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: ORIGINAL_FILTER }}
        />

        {/* Graded (after) — same photo, clipped to everything RIGHT of the split
            so it reads as a true before/after; filter cross-fades between looks.
            `--hero-split` is shared with the divider, keeping them locked. */}
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-1000 ease-in-out"
          style={{ filter: current.filter, clipPath: "inset(0 0 0 var(--hero-split))" }}
        />
      </div>

      {/* Divider line at the split — same `--hero-split` as the graded clip. */}
      <div
        className="absolute inset-y-0 w-px -translate-x-1/2 bg-white/80 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ left: "var(--hero-split)" }}
      >
        <span className="absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-sm">
          {current.name}
        </span>
        {/* App-style handle riding at the divider's vertical center (decorative). */}
        <span className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-neutral-800 shadow-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6L4 12l5 6M15 6l5 6-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
