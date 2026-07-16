import * as RadioGroup from "@radix-ui/react-radio-group";
import { BUILT_IN_RECIPES, NAMED_RECIPES, type RecipeCatalogEntry } from "@fuji-recipes/recipes-catalog";

interface RecipeSelectorProps {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
}

function RecipeOption({ entry, selected }: { entry: RecipeCatalogEntry; selected: boolean }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
        selected ? "border-neutral-100 bg-neutral-800" : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
      }`}
    >
      <RadioGroup.Item
        id={`recipe-${entry.id.toLowerCase()}`}
        value={entry.id}
        className="mt-0.5 size-4 shrink-0 rounded-full border border-neutral-500 data-[state=checked]:border-neutral-100"
      >
        <RadioGroup.Indicator className="relative flex size-full items-center justify-center after:block after:size-2 after:rounded-full after:bg-neutral-100" />
      </RadioGroup.Item>
      <span>
        <span className="block text-sm font-medium text-neutral-100">{entry.name}</span>
        <span className="block text-xs text-neutral-400">{entry.description}</span>
      </span>
    </label>
  );
}

export function RecipeSelector({ value, onValueChange, disabled }: RecipeSelectorProps) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      className="flex flex-col gap-4"
      aria-label="Film simulation recipe"
    >
      <div className={`flex flex-col gap-2 ${disabled ? "opacity-50" : ""}`}>
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Film simulations</span>
        {BUILT_IN_RECIPES.map((entry) => (
          <RecipeOption key={entry.id} entry={entry} selected={value === entry.id} />
        ))}
      </div>
      <div className={`flex flex-col gap-2 ${disabled ? "opacity-50" : ""}`}>
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Named recipes</span>
        {NAMED_RECIPES.map((entry) => (
          <RecipeOption key={entry.id} entry={entry} selected={value === entry.id} />
        ))}
      </div>
    </RadioGroup.Root>
  );
}
