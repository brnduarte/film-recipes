import * as Switch from "@radix-ui/react-switch";

interface BeforeAfterToggleProps {
  showOriginal: boolean;
  onShowOriginalChange: (showOriginal: boolean) => void;
  disabled?: boolean;
}

export function BeforeAfterToggle({ showOriginal, onShowOriginalChange, disabled }: BeforeAfterToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm ${!showOriginal ? "text-neutral-500" : "text-neutral-100"}`}>Before</span>
      <Switch.Root
        id="before-after-toggle"
        checked={!showOriginal}
        onCheckedChange={(checked) => onShowOriginalChange(!checked)}
        disabled={disabled}
        className="relative h-5 w-9 rounded-full border border-white/20 bg-white/15 outline-none backdrop-blur data-[state=checked]:bg-neutral-100 disabled:opacity-50"
        aria-label="Toggle before/after preview"
      >
        <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-neutral-100 transition-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-neutral-900" />
      </Switch.Root>
      <span className={`text-sm ${showOriginal ? "text-neutral-500" : "text-neutral-100"}`}>After</span>
    </div>
  );
}
