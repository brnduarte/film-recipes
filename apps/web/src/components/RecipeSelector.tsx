import * as RadioGroup from "@radix-ui/react-radio-group";
import { NAMED_RECIPES } from "@fuji-recipes/recipes-catalog";

interface RecipeSelectorProps {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
}

export function RecipeSelector({ value, onValueChange, disabled }: RecipeSelectorProps) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      orientation="horizontal"
      className="flex gap-2 overflow-x-auto pb-1"
      aria-label="Recipe"
    >
      {NAMED_RECIPES.map((entry) => (
        <RadioGroup.Item
          key={entry.id}
          id={`recipe-${entry.id.toLowerCase()}`}
          value={entry.id}
          title={entry.description}
          className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors data-[state=checked]:bg-neutral-100 data-[state=checked]:text-neutral-900 data-[state=checked]:shadow-lg ${
            value === entry.id ? "" : "glass glass-hover text-neutral-200"
          } ${disabled ? "opacity-50" : ""}`}
        >
          {entry.name}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
