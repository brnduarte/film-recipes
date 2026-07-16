import { useState } from "react";
import { clearAllData } from "@fuji-recipes/storage";

interface ClearDataButtonProps {
  onCleared: () => void;
}

/**
 * Settings control backing the plan's "clear all app data" requirement
 * (section 7): wipes every saved preset from IndexedDB. Irreversible, so it
 * confirms with the user first via the browser's native `confirm()` dialog
 * before calling through to `@fuji-recipes/storage`.
 */
export function ClearDataButton({ onCleared }: ClearDataButtonProps) {
  const [isClearing, setIsClearing] = useState(false);

  async function handleClick() {
    const confirmed = window.confirm(
      "Clear all app data? This permanently deletes every saved preset from this device and cannot be undone.",
    );
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await clearAllData();
      onCleared();
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <button
      id="clear-all-data"
      type="button"
      onClick={handleClick}
      disabled={isClearing}
      className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
    >
      {isClearing ? "Clearing…" : "Clear all app data"}
    </button>
  );
}
