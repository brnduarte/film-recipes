// Bottom horizontal recipe carousel for mobile. Shows each recipe as an
// image-only swatch (the per-photo preview thumbnail, no name); tapping one
// selects it. Scrolls horizontally with snap and keeps the active swatch in
// view.

import { useEffect, useRef } from "react";
import { NAMED_RECIPES } from "@film-recipes/recipes-catalog";

interface RecipeCarouselProps {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  /** Per-recipe preview thumbnails (data URLs) keyed by catalog id. */
  thumbnails: Record<string, string>;
}

export function RecipeCarousel({ value, onValueChange, disabled, thumbnails }: RecipeCarouselProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the selected swatch scrolled into view (e.g. when selection changes
  // via anything other than a tap).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [value]);

  return (
    <div
      role="radiogroup"
      aria-label="Recipe"
      className="glass glass-dark fixed inset-x-0 bottom-0 z-20 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 py-3"
    >
      {NAMED_RECIPES.map((entry) => {
        const thumb = thumbnails[entry.id];
        const selected = value === entry.id;
        return (
          <button
            key={entry.id}
            ref={selected ? activeRef : undefined}
            id={`recipe-${entry.id.toLowerCase()}`}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={entry.name}
            title={entry.name}
            disabled={disabled}
            onClick={() => onValueChange(entry.id)}
            className={`relative size-16 shrink-0 snap-center overflow-hidden rounded-xl ring-2 transition-all duration-200 ${
              selected ? "ring-white scale-105" : "ring-white/20"
            } ${disabled ? "opacity-50" : ""}`}
          >
            {thumb ? (
              <img src={thumb} alt="" className="animate-fade-in size-full object-cover" draggable={false} />
            ) : (
              <span className="flex size-full items-center justify-center bg-white/5">
                <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
