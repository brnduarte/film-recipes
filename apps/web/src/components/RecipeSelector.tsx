import * as RadioGroup from "@radix-ui/react-radio-group";
import { NAMED_RECIPES } from "@film-recipes/recipes-catalog";

interface RecipeSelectorProps {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  /** Per-recipe preview thumbnails (data URLs) keyed by catalog id. */
  thumbnails: Record<string, string>;
}

export function RecipeSelector({ value, onValueChange, disabled, thumbnails }: RecipeSelectorProps) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      orientation="vertical"
      className="flex flex-col gap-0.5"
      aria-label="Recipe"
    >
      {NAMED_RECIPES.map((entry) => {
        const thumb = thumbnails[entry.id];
        const selected = value === entry.id;
        return (
          <RadioGroup.Item
            key={entry.id}
            id={`recipe-${entry.id.toLowerCase()}`}
            value={entry.id}
            title={entry.description}
            className={`group flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-all duration-200 ease-out ${
              selected ? "bg-white/12" : "hover:bg-white/6"
            } ${disabled ? "opacity-50" : ""}`}
          >
            {/* 50x50 preview swatch — pre-rendered from the current photo. */}
            <span
              className={`relative size-[50px] shrink-0 overflow-hidden rounded-md ring-1 transition-all duration-200 ${
                selected ? "ring-2 ring-white/80" : "ring-white/15 group-hover:ring-white/30"
              }`}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="size-full object-cover animate-fade-in"
                  draggable={false}
                />
              ) : (
                <span className="flex size-full items-center justify-center bg-white/5">
                  <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                </span>
              )}
            </span>
            <span
              className={`truncate text-sm font-medium ${
                selected ? "text-white" : "text-neutral-300 group-hover:text-neutral-100"
              }`}
            >
              {entry.name}
            </span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
